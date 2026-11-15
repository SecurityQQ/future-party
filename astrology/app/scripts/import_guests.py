"""Import the guest list into Supabase.

Reads the English prompt data (data/guests.en.json) and, when given, the original
spreadsheet for the Russian totem and scene text, then prints SQL that upserts every
guest by a stable key. Notes, sources and social profiles from the sheet are not imported.

    set -a; source .env.local; set +a
    python3 -I scripts/import_guests.py data/guests.en.json "~/Downloads/Future_Party_Guests (1).xlsx" | psql "$DATABASE_URL"
"""

import json
import re
import sys


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def q(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        return "array[" + ",".join(q(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"


def sheet_rows(path: str) -> dict:
    """(rsvp, name) -> (totem_ru, scene_ru) from the spreadsheet."""
    import openpyxl  # only needed when a spreadsheet is given

    ws = openpyxl.load_workbook(path, data_only=True).worksheets[0]
    out = {}
    for row in ws.iter_rows(min_row=6, values_only=True):
        if not row[1]:
            continue
        out[(row[0], str(row[1]).strip().lower())] = (row[6], row[7])
    return out


def main() -> None:
    guests = json.load(open(sys.argv[1], encoding="utf-8"))
    ru = sheet_rows(sys.argv[2]) if len(sys.argv) > 2 else {}
    print("begin;")
    for g in guests:
        rsvp = g.get("rsvp")
        key = f"{rsvp if rsvp is not None else 'org'}-{slug(g['name'])}"
        totem_ru, scene_ru = ru.get((rsvp, g["name"].lower()), (None, None))
        if totem_ru is None:
            for alias in g.get("aliases", []):
                if (rsvp, alias.lower()) in ru:
                    totem_ru, scene_ru = ru[(rsvp, alias.lower())]
        cols = {
            "key": key,
            "rsvp": rsvp,
            "name": g["name"],
            "hint": g.get("hint"),
            "aliases": g.get("aliases", []),
            "role": g.get("role", "guest"),
            "character": g.get("character"),
            "subject": g.get("subject"),
            "scene": g.get("scene"),
            "tone": g.get("tone", "mid"),
            "topics": g.get("topics", []),
            "totem_ru": totem_ru,
            "scene_ru": scene_ru,
        }
        names = ", ".join(cols)
        values = ", ".join(q(v) for v in cols.values())
        updates = ", ".join(f"{k} = excluded.{k}" for k in cols if k != "key")
        print(f"insert into guests ({names}) values ({values}) on conflict (key) do update set {updates};")
    print("commit;")


if __name__ == "__main__":
    main()
