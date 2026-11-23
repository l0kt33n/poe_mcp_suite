#!/usr/bin/env python3
"""Offline-first helpers for the PoE trade site. See playbooks/trade-shopping.md.

  python scripts/trade_tools.py decode <trade url or payload>     # no network: show what a pasted link searches
  python scripts/trade_tools.py link   query.json [--league L]    # no network: build a shareable link
  python scripts/trade_tools.py stat   "maximum fire resistance"  # GGG request (stats list): find stat ids
  python scripts/trade_tools.py search query.json [--n 10]        # GGG requests: 1 search + fetch(es), cheapest first

query.json is the INNER query as it appears in a trade link (status / type / name / stats / filters).
`search` wraps it as {"query": ..., "sort": {"price": "asc"}} itself.

Rules baked in (all learned the hard way):
  * `sort` goes next to `query`, never inside it (inside = HTTP 400).
  * Use {"type": "count", "value": {"min": N}, "filters": [...]} groups for "any N of these mods".
  * pseudo stats: pseudo.pseudo_number_of_empty_suffix_mods (min 1) finds flasks/items with an OPEN
    suffix; "number_of_suffix_mods max 0" returned nothing for flasks.
  * Prices come back in mixed currencies; poe.ninja's divine rate and the trade site's own sort rate can
    differ (209c vs ~160-175c observed), so treat divine-denominated totals as approximate.
  * GGG ToS: automated trade-API use needs the user's one-time acknowledgement (memory:
    trade_api_tos_acknowledged). Keep requests few; this script rate-limits via poe_trade.py.
"""
import argparse, base64, gzip, json, os, sys, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _env():
    cfg = json.load(open(os.path.join(ROOT, ".mcp.json"), encoding="utf8"))["mcpServers"]["poe-trade-mcp"]["env"]
    os.environ.update(cfg)
    sys.path.insert(0, os.path.join(ROOT, "poe-trade-mcp"))
    return cfg


def decode(payload):
    s = payload.rstrip("/").split("/")[-1].replace("-", "+").replace("_", "/")
    s += "=" * (-len(s) % 4)
    return json.loads(gzip.decompress(base64.b64decode(s)))


def encode(query):
    raw = gzip.compress(json.dumps(query, separators=(",", ":")).encode(), mtime=0)
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def cmd_search(args):
    cfg = _env()
    import poe_trade as T
    league = args.league or cfg.get("POE_LEAGUE", "Standard")
    q = json.load(open(args.file, encoding="utf8"))
    d = T._post_json(T.TRADE_BASE + "/search/" + urllib.parse.quote(league), {"query": q, "sort": {"price": "asc"}})
    ids = d.get("result", [])[: args.n]
    print("total:", d.get("total"), "| link: https://www.pathofexile.com/trade/search/%s/%s" % (urllib.parse.quote(league), d["id"]))
    for k in range(0, len(ids), 10):
        for r in T._get_json(T.TRADE_BASE + "/fetch/" + ",".join(ids[k:k + 10]) + "?query=" + d["id"]).get("result", []):
            it, li = r["item"], r["listing"]
            p = li["price"]
            def desc(m):
                if isinstance(m, str): return m
                tag = ""
                mm = (m.get("mods") or [{}])[0]
                if mm.get("tier"): tag = " [%s %s]" % (mm.get("name", ""), mm["tier"])
                return m.get("description", "").replace("\n", " / ") + tag
            mods = [desc(m) for m in it.get("explicitMods", []) + it.get("craftedMods", [])]
            ench = [desc(m) for m in it.get("enchantMods", [])]
            print("%s %s | %s | ilvl %s | online:%s | %s%s" % (p["amount"], p["currency"], (it.get("name") or it.get("typeLine") or "").strip(), it.get("ilvl"),
                  bool((li.get("account") or {}).get("online")), " ; ".join(mods)[:240], (" | ENCH: " + ";".join(ench)) if ench else ""))


def cmd_stat(args):
    _env()
    import poe_trade as T
    needle = " ".join(args.text).lower()
    for s in T._get_stats():
        if needle in s["text"].lower():
            print(s["id"], "|", s["text"].replace("\n", " / ")[:140])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("decode"); a.add_argument("url")
    b = sub.add_parser("link"); b.add_argument("file"); b.add_argument("--league", default="Covens")
    c = sub.add_parser("stat"); c.add_argument("text", nargs="+")
    d = sub.add_parser("search"); d.add_argument("file"); d.add_argument("--n", type=int, default=10); d.add_argument("--league")
    args = ap.parse_args()
    if args.cmd == "decode": print(json.dumps(decode(args.url), indent=1))
    elif args.cmd == "link": print("https://www.pathofexile.com/trade/search/%s/%s" % (urllib.parse.quote(args.league), encode(json.load(open(args.file, encoding="utf8")))))
    elif args.cmd == "stat": cmd_stat(args)
    elif args.cmd == "search": cmd_search(args)


if __name__ == "__main__":
    main()
