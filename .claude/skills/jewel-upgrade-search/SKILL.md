---
name: jewel-upgrade-search
description: Re-run the saved plan to buy max-fire-res jewels (Cobalt/Viridian, +2% max fire res plus two other useful affixes) for the Malevolence-instead-of-Purity swap — refresh live trade listings and re-sweep PoB to pick which two jewels to replace without losing hit pool.
when_to_use: Use when the user is about to buy or asks to re-price the planned jewel upgrades (Honour Glisten / Cataclysm Sliver style jewels), or says "execute the jewel upgrades". Not a general jewel search; for others use gear-shopping.
---

This task uses the **Jewel upgrade search** playbook. The playbooks in `playbooks/` are the single source of truth — read them rather than working from memory, so you always get the current version.

1. Read `playbooks/README.md` first — the shared meta-framework (cursory-vs-detailed gate, context/pre-flight protocol, league reference, trust hierarchy, narration norms).
2. Then read `playbooks/jewel-upgrade-search.md` and follow it; queries live in `scripts/data/queries/`, the sweep is `scripts/pob_jewel_sweep.mjs`.

Do not summarize or duplicate the playbook content here. Respect the user's fixed jewels (Immutable Force, Bloodnotch, Hypnotic Essence) and check the trade-API acknowledgement in memory before any request.
