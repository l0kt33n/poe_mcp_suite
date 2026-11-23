---
name: trade-shopping
description: PoE trade-site mechanics for shopping runs — decode a pasted trade link offline, find stat ids, build/run queries and shareable links, price many base x affix combinations, check requirements and sockets, and decide buy vs craft (annul maths, bench crafts, enchants).
when_to_use: Use when the user pastes a trade link, asks to find or price items on trade (flasks, jewels, helmets, shields), wants the cheapest set across several bases, or asks whether to buy a finished item or craft it. Needs the one-time GGG trade-API acknowledgement before any request.
---

This task uses the **Trade shopping** playbook. The playbooks in `playbooks/` are the single source of truth — read them rather than working from memory, so you always get the current version.

1. Read `playbooks/README.md` first — the shared meta-framework (cursory-vs-detailed gate, context/pre-flight protocol, league reference, trust hierarchy, narration norms).
2. Then read `playbooks/trade-shopping.md` and follow it; use `scripts/trade_tools.py` for decode / link / stat / search.

Do not summarize or duplicate the playbook content here. Check memory `trade_api_tos_acknowledged` before any GGG request, and respect the user's constraints in `poe_build_constraints`.
