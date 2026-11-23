# Playbook: Jewel upgrade search (planned upgrade: Malevolence + max-fire-res jewels)

NOT a general jewel search. It is the saved recipe for one specific, user-approved plan, so it can be re-run on live
prices at the moment the user actually buys. For other jewel questions use [`gear-shopping.md`](gear-shopping.md)
and [`trade-shopping.md`](trade-shopping.md); for the sim mechanics see [`pob-safe-sim.md`](pob-safe-sim.md).

Read [`README.md`](README.md) first. Trade requests need `trade_api_tos_acknowledged` (memory).

## The plan (decided 2026-11-22, build: Chieftain Righteous Fire, Covens)
1. Replace **Purity of Fire with Malevolence** in the Boots group (Purity/Eternal Blessing/Flame Surge/CWS). Malevolence
   reserves nothing with Eternal Blessing, adds a DoT multiplier (+~12% full damage on its own).
2. Purity gave **+4% max fire res**, and max fire res also drives damage (Nebulis: +8% elemental damage per 1% resist
   above 75%). Without it the cap falls 90 -> 86 and fire max hit drops 71k -> 55k. Need **+4% max fire res** from
   jewels (Ruby flask supplies +5% when active, so 85% base -> 90%).
3. Jewels that give it must be **Cobalt or Viridian** (Crimson/Str cannot roll `of the Phoenix`) and must carry **at
   least two other useful affixes** (max life, burning/fire damage, DoT multiplier) - cheap single-affix jewels lose
   hit pool / DoT damage and were rejected by the user.
4. **Never touch** Immutable Force (socket 26196), Bloodnotch (49080) - they enable the Cast-when-Stunned build - nor
   Hypnotic Essence (61419; +13% chaos res). Eagle Glisten (26725) already supplies +2% max fire res and is kept.

## Result as of 2026-11-22 (prices drift; re-run before buying)
Baseline 659.6k FullDPS / 6,195 life; Malevolence alone 740k at 86% fire res. Replacing **Carrion Solace + Pandemonium
Cut** was the least damaging pair (the other sockets cost more life/damage):

| New jewels (price) | FullDPS | Life | Fire / Phys / Chaos max hit | Note |
|---|---|---|---|---|
| Honour Glisten (4d) + Cataclysm Sliver (5d) = 9 div | 826.6k (+25%) | 6,083 (-1.8%) | 70.1k / 18.0k / 26.5k | recommended balance |
| 2x Cataclysm Sliver = 10 div | 807.8k (+22.5%) | 6,246 (+0.8%) | 71.9k / 18.4k / 27.2k | hit pool first |
| 2x Honour Glisten (or + Oblivion Lens) = 8 div | 843.9k (+28%) | 5,919 (-4.5%) | 68.3k / 17.5k / 25.8k | most damage, loses life |
Replacing Pandemonium Cut also **drops spell block 3% -> 0** (it provides it). Carrion Solace's +12 Str is lost (Str 274 ->
262, fine). Upgrading the Eagle Glisten socket to a 3rd Honour Glisten adds ~+27k (+4%) for 4 div.
Listings that day: Honour Glisten / Oblivion Lens 4d (`+8% Fire DoT multiplier, 15% fire damage, +2% max fire res`),
Phoenix Glisten 4d (5% life, 16% burning), Cataclysm Sliver 5d (16% fire dmg, 7% life), Loath Dream 6d, Dragon Desire 6d.

Rejected earlier: 25-50c jewels with only +2% max fire res (811k but costs the replaced jewels' life/burning; cheap-tier
numbers are only valid for sockets that carry no stats). The Foulborn Red Dream + 6 Ngamahu Firewalker tattoos
(~190c + 6 x 179c) adds ~+10% life but ~+1% damage and loses Eagle Glisten's +2% - lower value, not part of this plan.

## Re-run at purchase time
1. Sync first ([`pob-sync.md`](pob-sync.md)); confirm the layout hasn't changed (Boots group, jewels, flasks).
2. Fetch live listings with the saved queries (each = 1 search + 1 fetch):
   `python scripts/trade_tools.py search scripts/data/queries/jewel_maxfire2_fire_dot_multi_cobalt.json --n 8`
   and the `_viridian`, `jewel_maxfire2_plus_any2useful_cobalt` / `_viridian` files (any 2 of life 5+, burning 15+, fire
   damage 14+, DoT multi 3+, fire DoT multi 3+). Stat ids: max fire res `explicit.stat_4095671657`.
3. Put the real mods and prices of the cheapest candidate listings into `scripts/data/jewel_sweep_config.json`
   (`candidates`), keep `neverReplace` as above, and run `node scripts/pob_jewel_sweep.mjs scripts/data/jewel_sweep_config.json`
   (run it in the background, a few minutes; **do not pipe it through `head`**: a closed pipe can kill the script before
   it restores the build; it restores from a snapshot via the harness).
4. Report per option: damage, life, fire/phys/chaos max hit, spell block, price; flag requirements and that listings
   may sell. User buys; then sync, verify 90% fire res with the Ruby flask active, and recheck.
5. Do the Malevolence swap in game when the jewels are on (Ruby flask must be active for the cap).
