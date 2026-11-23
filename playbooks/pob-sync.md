# Playbook: PoB sync (live character -> open PoB build)

Bring the open Path of Building build in line with the user's live character after they change
gear, gems, flasks or tree in game, and repair the things the importer breaks. Done four times by hand
in one session; this is the procedure plus `scripts/pob_sync.mjs`.

Read [`README.md`](README.md) first. Companion: [`pob-safe-sim.md`](pob-safe-sim.md) (what-ifs on the synced build).

## When to use
"sync", "resync my character", "I finished the swap", "update PoB", or before any analysis when the user
says they changed something in game. **Skip** if they only want a one-off stat readout of the open build.

## Prerequisites
- PoB running via `pob-mcp/LaunchPoBWithAPI.bat` (TCP port 59166) with the target build open. If the port is
  closed but PoB is running, it was started from the normal shortcut: ask the user to close (save first) and
  relaunch via the .bat. Never kill their PoB.
- `pob-mcp` built; `POE_SESSION_ID` and `POE_ACCOUNT_NAME` in `.mcp.json`.
- Character name = the name after the account in the build title (`<Account> - <Character>`); confirm it if the
  import errors.

## Run
```
node scripts/pob_sync.mjs --character <NAME> --build-file "<path to the build .xml>" --stance SAND
node scripts/pob_sync.mjs ... --save      # only after the user says to save
```
The script backs up first (`../build_backups/<name>.pre-sync-<timestamp>.xml`), imports through pob-mcp's
`lua_import_character`, repairs, and prints key stats. Saving also copies the previous file to the backup dir.

## What the importer breaks (the script repairs these)
1. **Cosmetic-slot items are deleted.** The API does not report Head / Body / Arm / Leg items (Greater Justicar's
   Helm, Searing Exarch's Descry, Solar Shield, Prosthetic Leg for this user). They are restored from
   `scripts/data/pob_cosmetic_items.json`. If the user changes one of those in game, update that file; the API
   cannot tell you.
2. **The Righteous Fire gem group can lose "include in full DPS" and the main-skill selection**, which makes
   FullDPS read ~150k instead of ~660k. The script recreates the group with the flag on (there is no setter in
   the API) and selects it.
3. Config is **preserved** (bandit, pantheon, enemy, Sand Stance); the stance is only (re)set if you pass `--stance`.
   Bandit choice and quest points are not in the API: ask once, then remember.

## Things to tell the user after a sync
- The sync only exists in the open PoB window until saved; offer `--save`.
- New or changed pieces the import picked up (weapon swap sets, flasks, gem levels). Point out gems left at low
  level (e.g. a freshly socketed support at level 1/18) because they silently reduce modelled numbers.
- PoB cannot model some of the user's items (Bloodnotch, Immutable Force, leech from damage taken): their
  constraints are in memory (`poe_build_constraints`).

## Verify
- Stats vs the previous known values: Life, Armour, resists, FullDPS. A big FullDPS drop right after an import
  almost always means the full-DPS flag/main skill, not the gear.
- Equipped slots printed by the script match the live character's items (the pob-mcp report lists
  added/removed/replaced items).
- Do **not** assume the open build is what you left last time: the user edits it. Read before you write.

## Gotchas
- `open_build_xml` needs the build's file path or the build becomes an unsaved "New Build" (relevant to restores).
- The import report's EHP figure is unreliable; use max-hit stats.
- Do not run an import while a simulation is running.
