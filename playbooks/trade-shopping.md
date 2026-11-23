# Playbook: Trade shopping mechanics (stat ids, links, price matrices, DIY-vs-buy)

The reusable machinery behind [`gear-shopping.md`](gear-shopping.md) and [`crafting-optimization.md`](crafting-optimization.md)
when you have to search the PoE trade site yourself: read a pasted link, find stat ids, build queries and
shareable links, price many (base x affix) combinations, and decide buy vs craft. Script: `scripts/trade_tools.py`.

Read [`README.md`](README.md) first. **Before any GGG trade request** check memory `trade_api_tos_acknowledged`;
if absent, explain the ToS risk (see `legal_considerations.md`) and get the user's acknowledgement first.

## Steps
1. **Understand what the user already has**: a pasted trade link decodes offline:
   `python scripts/trade_tools.py decode "<url>"`. Report what it filters (stat ids, price cap, missing filters
   like item class / links) and fix gaps instead of silently re-running it.
2. **Verify the mod exists before searching** (patch data beats memory): grep PoB data
   (`PathOfBuilding/src/Data/ModExplicit.lua`, `ModJewel.lua`, `TattooPassives.lua`, `Bases/*.lua`) and the text
   lake. Example miss: "30% reservation efficiency" looked impossible until the real wording
   ("Socketed Gems have 30% increased Reservation Efficiency", Shaper shield suffix) was found.
3. **Stat ids**: `python scripts/trade_tools.py stat "maximum fire resistance"`.
4. **Query** (inner query JSON; see the script docstring for the rules) -> `search` for the cheapest N, `link` for a
   shareable URL. Build links locally; they cost no request.
5. **Tiers**: the fetch result carries each mod's name/tier (`mods[0].name/tier`); `search` prints them. Flask
   immunities: T1/T2 = Iguana/Skink (bleed), Eel/Moray (shock), Penguin/Walrus (freeze+chill), Opossum/Hedgehog
   (poison); T3 = Lizard/Conger/Deer/Skunk.
6. **Many combinations**: fetch the cheapest 20 per base, then fill gaps with targeted searches; the cheapest listing
   that satisfies a filter is exact only inside the contiguous price-sorted prefix you actually fetched. Solve the
   cheapest one-suffix-per-base assignment by brute force over permutations.
7. **Requirements**: read attribute requirements from PoB base data (`Bases/*.lua` `req = {...}`); flag anything
   at 160+ Str/Dex/Int and anything above the character's attributes (accounting for attribute nodes a tattoo or
   jewel swap removes).
8. **Sockets**: any gem fits any socket colour now and a colour match adds +10% quality, so white/odd colours are
   not a reason to reject an item (verify against `reference_data/freshness_index.md`). Count *linked* groups:
   `W-WRW` is a 1 + 3 split, not four linked.

## Buy vs craft maths (flasks / magic items)
- Annulment on a 2-mod magic item removes the prefix half the time and ruins it: expected cost per success =
  **2 x (item + annulment)**. Prefer a prefix-only item or an already-crafted ("of Craft") one when it is cheaper.
- Bench crafts overwrite the item's existing crafted mod, so buying a cheap "of Craft" regen flask and re-crafting
  to leech can beat buying the leech version (verify the cost; the wiki is bot-blocked, poedb search snippets worked).
- Enchants ("Used when Charges reach full" comes from Instilling Orbs, a random pick from a pool of ~16): compare the
  listing premium against ~16 x the orb price; odds and overwrite behaviour are unverified, so state that.
- Currency prices: `https://poe.ninja/poe1/api/economy/exchange/current/overview?league=<L>&type=Currency` (the
  suite's own endpoint; `Tattoo`, `Fragment`, ... are other types). Divine can differ between poe.ninja and the
  trade site's sort; keep divine-denominated totals approximate and say so.

## Reporting
Lead with the recommendation and total, then the per-piece table, the assumptions (rates, unverified crafts), and
links. Remind the user: listings were fetched when the search ran; no seller showed online status unless the listing
says so; check each listing before paying.
