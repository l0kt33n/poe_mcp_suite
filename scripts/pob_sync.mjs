// Sync the live PoE character into the open PoB build, then repair what the importer breaks.
// See playbooks/pob-sync.md for the why. Requires: PoB running via pob-mcp/LaunchPoBWithAPI.bat,
// pob-mcp built (npm run build), POE_SESSION_ID in .mcp.json.
//
//   node scripts/pob_sync.mjs --character COVENS_AFKTILNEWBUILD --build-file "<path to .xml>" \
//        [--account "name#1234"] [--stance SAND] [--save] [--backup-dir D:/backups]
//
// What it does, in order:
//  1. backup  : exports the current in-memory build to <backup-dir>/<name>.pre-sync-<timestamp>.xml
//  2. import  : calls pob-mcp's lua_import_character (replaces tree, jewels, items, gems)
//  3. repair  : re-adds the four cosmetic-slot items the API does not report (Head/Body/Arm/Leg)
//               from scripts/data/pob_cosmetic_items.json
//  4. repair  : recreates the Righteous Fire gem group with include-in-full-DPS ON if the import
//               cleared it, and selects it as the main skill
//  5. config  : optionally sets the Blood/Sand stance (e.g. --stance SAND)
//  6. report  : prints key stats; with --save copies the old file to the backup dir and saves.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { connect } from './pob_client.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const flag = (n) => process.argv.includes('--' + n);

const mcp = JSON.parse(fs.readFileSync(path.join(ROOT, '.mcp.json'), 'utf8')).mcpServers.pob;
const character = arg('character');
const account = arg('account', mcp.env.POE_ACCOUNT_NAME);
const buildFile = arg('build-file');
const backupDir = arg('backup-dir', path.join(ROOT, '..', 'build_backups'));
if (!character || !account) { console.error('need --character and an account (--account or POE_ACCOUNT_NAME in .mcp.json)'); process.exit(2); }
fs.mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const pob = await connect();
const { call } = pob;

// 1. backup
const name = (await call('get_build_info')).info.name;
const bak = path.join(backupDir, `${name}.pre-sync-${ts}.xml`);
fs.writeFileSync(bak, (await call('export_build_xml')).xml);
console.log('1. backup ->', bak);

// 2. import through pob-mcp (stdio MCP); the TCP client stays connected meanwhile
const child = spawn('node', [path.join(ROOT, 'pob-mcp', 'build', 'index.js')], { env: { ...process.env, ...mcp.env }, stdio: ['pipe', 'pipe', 'ignore'] });
child.stdout.setEncoding('utf8');
let ob = ''; const pend = new Map(); let id = 0;
child.stdout.on('data', (c) => { ob += c; let i; while ((i = ob.indexOf('\n')) >= 0) { const l = ob.slice(0, i); ob = ob.slice(i + 1); try { const d = JSON.parse(l); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } } catch {} } });
const rpc = (m, p) => new Promise((r) => { const i = ++id; pend.set(i, r); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: i, method: m, params: p }) + '\n'); });
await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'pob_sync', version: '1' } });
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
const r = await Promise.race([rpc('tools/call', { name: 'lua_import_character', arguments: { account_name: account, character_name: character } }), new Promise((res) => setTimeout(() => res({ timeout: true }), 120000))]);
const report = r.result?.content?.map((c) => c.text).join('\n') ?? JSON.stringify(r);
console.log('2. import report (trimmed):\n' + report.split('\n').filter((l) => /^(Level|##|\||~|\+|-|\*\*)/.test(l)).slice(0, 40).join('\n'));
child.kill();
if (/error|failed|not found/i.test(report.slice(0, 300)) && !/Replaced from PoE API/.test(report)) { console.error('import looks like it failed; build left as-is. Backup:', bak); await pob.close(); process.exit(1); }

// 3. cosmetic items the API never reports
const cosmetic = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'pob_cosmetic_items.json'), 'utf8'));
for (const [slot, it] of Object.entries(cosmetic)) {
  const res = await call('add_item_text', { text: it.raw, slotName: slot });
  console.log(`3. ${slot}: ${it.name} -> ${res.ok ? 'ok' : JSON.stringify(res)}`);
}

// 4. Righteous Fire group: include in full DPS + main skill
let groups = (await call('get_skills')).skills.groups;
let rf = groups.find((g) => g.gems.some((x) => x.name === 'Righteous Fire'));
if (rf && rf.includeInFullDPS !== true) {
  const gems = rf.gems.map((x) => ({ name: x.name, level: x.level, quality: x.quality }));
  await call('remove_skill', { groupIndex: rf.index });
  await call('create_socket_group', { label: rf.label || '', slot: rf.slot, enabled: true, includeInFullDPS: true });
  groups = (await call('get_skills')).skills.groups;
  const ng = groups.filter((g) => g.slot === rf.slot).pop().index;
  for (const g of gems) await call('add_gem', { groupIndex: ng, gemName: g.name, level: g.level, quality: g.quality });
  await call('set_main_selection', { mainSocketGroup: ng, mainActiveSkill: 1 });
  console.log('4. recreated the Righteous Fire group with full-DPS on (slot ' + rf.slot + ')');
} else if (rf) {
  const sk = (await call('get_skills')).skills;
  if (sk.mainSocketGroup !== rf.index) await call('set_main_selection', { mainSocketGroup: rf.index, mainActiveSkill: 1 });
  console.log('4. Righteous Fire group already counts toward full DPS');
} else console.log('4. no Righteous Fire group found (nothing to repair)');

// 5. stance
const stance = arg('stance');
if (stance) console.log('5. stance ->', JSON.stringify((await call('set_config', { bloodSandStance: stance })).applied));

// 6. report (+ optional save)
console.log('6.', JSON.stringify(await pob.stats(['FullDPS', 'Life', 'LifeUnreserved', 'Armour', 'FireResist', 'PhysicalMaximumHitTaken', 'ChaosMaximumHitTaken'])));
if (flag('save')) {
  if (!buildFile) { console.error('--save needs --build-file'); }
  else {
    if (fs.existsSync(buildFile)) fs.copyFileSync(buildFile, path.join(backupDir, `${path.basename(buildFile, '.xml')}.before-save-${ts}.xml`));
    console.log('   saved:', JSON.stringify(await call('save_build', { path: buildFile.replace(/\\/g, '/') })));
  }
} else console.log('   (not saved to disk; add --save --build-file <path> to persist)');
await pob.close();
