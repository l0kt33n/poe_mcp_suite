---
name: pob-safe-sim
description: Run what-if experiments on the user's open PoB build (swap gems, equip candidate items/jewels, set customMods) with a snapshot-and-restore harness, whole-hit-pool reporting, and the known modelling traps (Awakened caps, Inspiration, unmodelled items).
when_to_use: Use when comparing upgrades by simulation — "simulate X", "which jewel/helmet/flask swap is best", "what would this do to my damage and life" — on a live PoB build, especially sweeps with many combinations. Skip for pure trade lookups (trade-shopping) and for deciding what to test (build-optimization-sim).
---

This task uses the **Safe PoB simulation** playbook. The playbooks in `playbooks/` are the single source of truth — read them rather than working from memory, so you always get the current version.

1. Read `playbooks/README.md` first — the shared meta-framework (cursory-vs-detailed gate, context/pre-flight protocol, league reference, trust hierarchy, narration norms).
2. Then read `playbooks/pob-safe-sim.md` and follow it; use `scripts/pob_sim_harness.mjs` so every run restores the build from a snapshot.

Do not summarize or duplicate the playbook content here. Read the build state before writing, restore from your own snapshot, and finish by confirming the stats match and nothing was saved.
