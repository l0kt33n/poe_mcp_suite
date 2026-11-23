// Sweep candidate jewels over pairs of the user's jewel sockets on the live PoB build (what-if, safe restore).
// See playbooks/jewel-upgrade-search.md. Uses the snapshot/restore harness, so the open build is put back.
//
//   node scripts/pob_jewel_sweep.mjs scripts/data/jewel_sweep_config.json
//
// Config (JSON):
//   buildFile    : the build's .xml path (the harness needs it to restore)
//   fields       : stats to read (include the whole hit pool, not just damage)
//   pairs        : how many jewels to replace (2 by default)
//   neverReplace : jewel socket slots that must not be touched, e.g. ["Jewel 26196","Jewel 49080"]
//   onlySlots    : optional - restrict the sweep to these slots (for quick tests)
//   gemSwap      : optional pre-step, e.g. {"slotName":"Boots","remove":"Purity of Fire","add":"Malevolence","level":18,"quality":0}
//   minFireRes   : report only configs whose FireResist >= this (the plan's cap, e.g. 90)
//   candidates   : { KEY: {name, base:"Cobalt Jewel", divine: price, mods:[ "...", ... ]} } - use the real mods of live listings
// Output: top configs by damage, top by life, and the best slot choice per candidate pair, each with the replaced
// jewels' names and the full hit pool.
import fs from 'fs';
import { runSim } from './pob_sim_harness.mjs';

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const k = cfg.pairs || 2;
const combos = (arr, n) => (n === 0 ? [[]] : arr.flatMap((x, i) => combos(arr.slice(i + 1), n - 1).map((c) => [x, ...c])));
const text = (key, i) => { const c = cfg.candidates[key]; return `Rarity: RARE\n${c.name} ${i}\n${c.base}\nItem Level: 85\nImplicits: 0\n${c.mods.join('\n')}`; };

await runSim({ buildFile: cfg.buildFile, fields: cfg.fields }, async ({ call, stats, items }) => {
  const jew = items.filter((i) => /^Jewel \d+$/.test(i.slot) && i.raw && !/Cluster/.test(i.raw));
  const raw = Object.fromEntries(jew.map((j) => [j.slot, j.raw]));
  const nm = (s) => raw[s].split(/\r?\n/).map((x) => x.trim()).filter(Boolean).find((l, i) => i > 0 && !/^(Rarity|Unique)/.test(l));
  let slots = Object.keys(raw).filter((s) => !(cfg.neverReplace || []).includes(s));
  if (cfg.onlySlots) slots = slots.filter((s) => cfg.onlySlots.includes(s));
  if (cfg.gemSwap) {
    const g = (await call('get_skills')).skills.groups.find((x) => x.slot === cfg.gemSwap.slotName);
    const idx = g.gems.findIndex((x) => x.name === cfg.gemSwap.remove) + 1;
    if (idx > 0) await call('remove_gem', { groupIndex: g.index, gemIndex: idx });
    await call('add_gem', { groupIndex: g.index, gemName: cfg.gemSwap.add, level: cfg.gemSwap.level || 20, quality: cfg.gemSwap.quality || 0 });
    console.log('after gemSwap', JSON.stringify(await stats()));
  }
  const keys = Object.keys(cfg.candidates);
  const typeSets = combos(keys, k).concat(keys.map((x) => Array(k).fill(x))).filter((v, i, a) => a.findIndex((w) => w.join() === v.join()) === i);
  const slotSets = combos(slots, k);
  const res = [];
  for (const ts of typeSets) for (const ss of slotSets) {
    for (let i = 0; i < k; i++) await call('add_item_text', { text: text(ts[i], i + 1), slotName: ss[i] });
    res.push({ ts, ss, st: await stats(), cost: ts.reduce((a, t) => a + (cfg.candidates[t].divine || 0), 0) });
    for (const s of ss) await call('add_item_text', { text: raw[s], slotName: s });
  }
  const ok = res.filter((r) => (r.st.FireResist ?? 0) >= (cfg.minFireRes || 0));
  const show = (r) => `${r.ts.map((t) => `${cfg.candidates[t].name}(${cfg.candidates[t].divine}d)`).join(' + ')} = ${r.cost} div | replace ${r.ss.map((s) => s.replace('Jewel ', '') + ' ' + nm(s)).join(' + ')} | ${JSON.stringify(r.st)}`;
  console.log('=== TOP 10 BY FullDPS ===');
  [...ok].sort((a, b) => b.st.FullDPS - a.st.FullDPS).slice(0, 10).forEach((r) => console.log(show(r)));
  console.log('=== TOP 6 BY LIFE (then FullDPS) ===');
  [...ok].sort((a, b) => b.st.Life - a.st.Life || b.st.FullDPS - a.st.FullDPS).slice(0, 6).forEach((r) => console.log(show(r)));
  console.log('=== BEST SLOT CHOICE PER CANDIDATE SET ===');
  const best = {};
  for (const r of ok) { const key = r.ts.join('+'); if (!best[key] || r.st.FullDPS > best[key].st.FullDPS) best[key] = r; }
  Object.values(best).sort((a, b) => b.st.FullDPS - a.st.FullDPS).forEach((r) => console.log(show(r)));
});
