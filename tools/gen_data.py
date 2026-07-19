#!/usr/bin/env python3
"""Regenerate ../data.js from PokéAPI.

Fetches the full species list plus the 18 type rosters and writes a compact
JS array of {id, name, types} for every Pokémon species. Run whenever a new
generation is added to PokéAPI (also extend GENERATIONS in app.js).

Usage: python3 tools/gen_data.py
"""
import json
import os
import urllib.request

API = "https://pokeapi.co/api/v2"
TYPE_COUNT = 18  # normal..fairy; ids above 18 are meta types with no roster

# Display names that the generic "split-on-hyphen and capitalize" rule gets wrong.
SPECIAL = {
    "nidoran-f": "Nidoran♀", "nidoran-m": "Nidoran♂",
    "farfetchd": "Farfetch'd", "sirfetchd": "Sirfetch'd",
    "mr-mime": "Mr. Mime", "mr-rime": "Mr. Rime", "mime-jr": "Mime Jr.",
    "type-null": "Type: Null", "ho-oh": "Ho-Oh", "porygon-z": "Porygon-Z",
    "jangmo-o": "Jangmo-o", "hakamo-o": "Hakamo-o", "kommo-o": "Kommo-o",
    "flabebe": "Flabébé", "wo-chien": "Wo-Chien", "chien-pao": "Chien-Pao",
    "ting-lu": "Ting-Lu", "chi-yu": "Chi-Yu",
}


def get(url):
    with urllib.request.urlopen(url, timeout=60) as resp:
        return json.load(resp)


def id_from_url(url):
    return int(url.rstrip("/").split("/")[-1])


def pretty(slug):
    if slug in SPECIAL:
        return SPECIAL[slug]
    return " ".join(word.capitalize() for word in slug.split("-"))


def main():
    count = get(f"{API}/pokemon-species?limit=1")["count"]
    species = get(f"{API}/pokemon-species?limit={count}")["results"]
    roster = sorted((id_from_url(s["url"]), s["name"]) for s in species)
    max_id = roster[-1][0]

    types = {}  # pokemon id -> [(slot, type name)]
    for t in range(1, TYPE_COUNT + 1):
        data = get(f"{API}/type/{t}")
        for entry in data["pokemon"]:
            pid = id_from_url(entry["pokemon"]["url"])
            if pid <= max_id:  # skip alternate forms (ids in the 10000s)
                types.setdefault(pid, []).append((entry["slot"], data["name"]))

    missing = [pid for pid, _ in roster if pid not in types]
    if missing:
        raise SystemExit(f"no type data for ids: {missing[:10]}")

    lines = []
    for pid, slug in roster:
        tlist = [name for _, name in sorted(types[pid])]
        lines.append("{id:%d,name:%s,types:%s}" % (
            pid, json.dumps(pretty(slug), ensure_ascii=True), json.dumps(tlist)))

    out_path = os.path.join(os.path.dirname(__file__), "..", "data.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(
            "// Generated from PokeAPI (https://pokeapi.co) — all %d Pokémon species.\n"
            "// Regenerate with tools/gen_data.py if new generations are released.\n"
            "const POKEMON = [\n%s\n];\n" % (len(roster), ",\n".join(lines)))
    print(f"wrote {len(roster)} Pokémon to {os.path.normpath(out_path)}")


if __name__ == "__main__":
    main()
