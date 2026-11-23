---
name: pob-sync
description: Sync the user's live PoE character into the open Path of Building build over the TCP API, then repair what the importer breaks (deleted cosmetic-slot items, Righteous Fire full-DPS flag) with backups and an optional save.
when_to_use: Use when the user says "sync", "resync my character", "update PoB", "I finished the swap", or changed gear/gems/flasks/tree in game and wants PoB to match. Skip for a one-off stat readout of the open build.
---

This task uses the **PoB sync** playbook. The playbooks in `playbooks/` are the single source of truth — read them rather than working from memory, so you always get the current version.

1. Read `playbooks/README.md` first — the shared meta-framework (cursory-vs-detailed gate, context/pre-flight protocol, league reference, trust hierarchy, narration norms).
2. Then read `playbooks/pob-sync.md` and follow it; the work is done by `scripts/pob_sync.mjs`.

Do not summarize or duplicate the playbook content here. Never save to disk unless the user asked; always back up first.
