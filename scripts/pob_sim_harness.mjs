// Safe what-if harness for the live PoB build (TCP API).
//
// Pattern: snapshot the build XML -> run your experiment (add items / swap gems / set config /
// customMods) -> ALWAYS reload the snapshot with open_build_xml(path, xml, name) -> verify the
// reloaded stats equal the baseline. Never "put things back by hand": the user edits the build
// between runs, and an interrupted run would otherwise leave test changes in their open build.
//
// Usage from your own script:
//   import { runSim } from './pob_sim_harness.mjs';
//   await runSim({
//     buildFile: 'C:/Users/<you>/Documents/Path of Building/Builds/3.30/<build>.xml',  // REQUIRED: keeps Save pointed at the real file
//     fields: ['FullDPS','Life','FireResist','ChaosMaximumHitTaken'],
//   }, async ({ call, stats, baseline, items }) => {
//     await call('set_config', { customMods: '+4% to maximum Fire Resistance' });
//     console.log(await stats());
//   });
//
// Notes learned the hard way:
//  - Compare with FullDPS (CombinedDPS is only the selected main skill). The importer can reset the
//    include-in-full-DPS flags; see playbooks/pob-sync.md.
//  - Read the state first (items, gem groups, config): do not assume it is what you left last time.
//  - open_build_xml MUST get the build's file path or the reloaded build becomes an unsaved "New Build".
//  - If a run is interrupted, re-run just the restore: node pob_sim_harness.mjs --restore <snapshot.xml> --build-file <path>
import fs from 'fs';
import { connect } from './pob_client.mjs';

export async function runSim({ buildFile, fields = ['FullDPS', 'Life', 'FireResist'], snapshotPath, buildName }, experiment) {
  if (!buildFile) throw new Error('buildFile is required');
  const pob = await connect();
  const { call } = pob;
  const snap = (await call('export_build_xml')).xml;
  const snapFile = snapshotPath || `${process.env.TEMP || '/tmp'}/pob_sim_snapshot_${Date.now()}.xml`;
  fs.writeFileSync(snapFile, snap);
  const name = buildName || (await call('get_build_info')).info.name;
  const stats = () => pob.stats(fields);
  const baseline = await stats();
  console.log('BASELINE', JSON.stringify(baseline), '| snapshot:', snapFile);
  const items = (await call('get_items')).items;
  try {
    await experiment({ call, stats, baseline, items, snapshot: snap });
  } catch (e) {
    console.log('ERROR', e && e.stack || e);
  } finally {
    await restore(pob, snap, buildFile, name, fields, baseline);
    await pob.close();
  }
}

async function restore(pob, snap, buildFile, name, fields, baseline) {
  console.log('restore:', JSON.stringify(await pob.call('open_build_xml', { path: buildFile, xml: snap, name })));
  await new Promise((r) => setTimeout(r, 4000));
  let after;
  for (let k = 0; k < 6; k++) {
    try { after = await pob.stats(fields); if (after && Object.keys(after).length) break; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log('RESTORED', JSON.stringify(after));
  console.log('matches_baseline', baseline ? JSON.stringify(after) === JSON.stringify(baseline) : '(no baseline)');
}

// CLI: restore-only after an interrupted run
if (process.argv[2] === '--restore') {
  const snapFile = process.argv[3];
  const i = process.argv.indexOf('--build-file');
  const buildFile = i > 0 ? process.argv[i + 1] : null;
  if (!snapFile || !buildFile) { console.error('usage: --restore <snapshot.xml> --build-file <path>'); process.exit(2); }
  const pob = await connect();
  const name = (await pob.call('get_build_info')).info.name;
  await restore(pob, fs.readFileSync(snapFile, 'utf8'), buildFile, name, ['FullDPS', 'Life'], null);
  await pob.close();
}
