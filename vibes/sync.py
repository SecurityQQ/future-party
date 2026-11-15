#!/usr/bin/env python3
"""Sync the shared vibe tokens and optimized texture into the standalone Next app.

Usage from any directory: python3 vibes/sync.py [--check]
Only the two generated files listed in FILES are touched.
"""
from pathlib import Path
import argparse
import sys

HERE = Path(__file__).resolve().parent
APP = HERE.parent / "app"
FILES = {
    HERE / "tokens.css": APP / "app" / "vibes-tokens.css",
    HERE / "assets" / "chrome-orbit.webp": APP / "public" / "app" / "vibes" / "chrome-orbit.webp",
}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Report stale copies without writing")
    args = parser.parse_args()
    stale = []
    for source, target in FILES.items():
        payload = source.read_bytes()
        if target.exists() and target.read_bytes() == payload:
            continue
        stale.append(target)
        if not args.check:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(payload)
    for target in stale:
        print(("STALE " if args.check else "Synced ") + str(target.relative_to(HERE.parent)))
    if not stale:
        print("Vibe assets are in sync.")
    return 1 if args.check and stale else 0

if __name__ == "__main__":
    sys.exit(main())
