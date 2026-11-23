# Playbook: Safe PoB simulation (what-if on the user's open build)

Run experiments on the live PoB build (swap gems, equip candidate items, add jewels, set config / customMods)
**without leaving the user's build changed**. Complements [`build-optimization-sim.md`](build-optimization-sim.md)
(which decides *what* to test); this one is the mechanics and the traps.

Read [`README.md`](README.md) first.

## The pattern (use `scripts/pob_sim_harness.mjs`)
1. `export_build_xml` -> snapshot file. 2. Read baseline stats. 3. Experiment. 4. **Always** reload the snapshot with
`open_build_xml({path: <real build file>, xml, name})`. 5. Verify the reloaded stats equal the baseline.
```js
import { runSim } from './pob_sim_harness.mjs';
await runSim({ buildFile, fields: ['FullDPS','Life','FireResist','ChaosMaximumHitTaken'] },
  async ({ call, stats, items }) => { /* add_item_text / add_gem / set_config ... ; console.log(await stats()) */ });
```
- If a run is interrupted or the user stops it, the build may be mid-experiment: check the state first, then
  `node scripts/pob_sim_harness.mjs --restore <snapshot.xml> --build-file <path>`.
- Never restore "by hand" from remembered values. The user edits the build between runs (it happened three
  times in one session); restore from the snapshot you took at the start of *this* run.
- Long sweeps (> ~2 min) must go in the background; tool calls time out at 2-10 minutes.

## Measuring
- Compare **FullDPS**, not CombinedDPS (CombinedDPS is only the selected main skill). Set the main skill to the
  skill you are measuring (e.g. Righteous Fire) when you read radius or per-skill stats.
- Always read the **whole hit pool**: Life, LifeUnreserved, Phys / Fire / Chaos MaximumHitTaken, resists,
  spell block - not just damage. Removing one jewel (+13% chaos res) cost 35% of chaos max hit and would have
  gone unnoticed in a damage-only table.
- Respect the user's fixed items (see memory `poe_build_constraints`): exclude their sockets/slots from sweeps
  up front instead of presenting a "best" that violates them.

## Modelling traps
- **Gem levels**: Awakened supports cap at level 5; setting 20 produces nonsense. Use realistic levels.
- **Inspiration support** shows a huge gain but needs mana spent: Blood Magic builds (0 mana) never get charges.
- **Not modelled by PoB**: leech from damage taken, Bloodnotch / Immutable Force effects, real tattoos, the
  flask enchants' uptime. State this next to any number it affects; emulate with `set_config({customMods})`
  (e.g. `18% increased maximum Life` per 6 tattoos) and say that it is an emulation.
- **Jewels**: items are slot-independent unless they have a radius; sweeps over slot pairs x jewel pairs are
  symmetric, so evaluate unordered pairs only. For radius jewels (e.g. The Red Dream) compute which allocated
  nodes are in radius first (tree data `reference_data/skilltree/data.json`; Large radius = 1800 units).
- **Flask effects**: flasks are active by default in PoB; Ruby flask adds +5% max fire res, which the
  user's fire-res cap math depends on.
- **Max resistance** interacts with damage through Nebulis (`+8% elemental damage per 1% resist above 75%`):
  losing 4% max fire res cost ~9% damage, so resist-cap changes belong in the damage table too.

## Reporting
Give baseline vs each option with the same columns, say which are emulated, and finish by confirming the build was
restored (stats match) and **nothing was saved** unless the user asked.
