#!/usr/bin/env python3
"""
Fix observations whose assistant_response (or user_message) is a Python dict
literal instead of valid JSON.

Python literals use True/False/None and single quotes; this script detects
them, parses with ast.literal_eval, and re-serialises as proper JSON.

Usage:
    python fix_python_literals.py              # dry-run (default)
    python fix_python_literals.py --apply      # actually write fixes
"""

import argparse
import ast
import json
import sys
from typing import Any, Optional

import db


def is_python_literal(text: str) -> bool:
    """Heuristic: contains Python-specific tokens that aren't valid JSON."""
    if not isinstance(text, str) or len(text) < 2:
        return False
    stripped = text.strip()
    if not (stripped.startswith("{") or stripped.startswith("[")):
        return False
    return any(token in stripped for token in ("True", "False", "None", "'"))


def try_parse_python_literal(text: str) -> Optional[Any]:
    """Try ast.literal_eval; return the parsed object or None."""
    try:
        return ast.literal_eval(text.strip())
    except Exception:
        return None


def fix_observations(apply: bool = False):
    col = db.get_observations_collection()
    total = col.count_documents({})
    print(f"Scanning {total} observations …\n")

    fields_to_check = ["assistant_response", "user_message"]
    fixed = 0
    skipped = 0
    errors = []

    for doc in col.find():
        doc_id = doc["_id"]
        quest_id = doc.get("quest_id", "?")
        position = doc.get("position", "?")
        updates = {}

        for field in fields_to_check:
            value = doc.get(field)
            if not value or not isinstance(value, str):
                continue

            if not is_python_literal(value):
                continue

            parsed = try_parse_python_literal(value)
            if parsed is None:
                errors.append((quest_id, position, field, "ast.literal_eval failed"))
                continue

            try:
                clean_json = json.dumps(parsed, ensure_ascii=False)
            except (TypeError, ValueError) as e:
                errors.append((quest_id, position, field, f"json.dumps failed: {e}"))
                continue

            updates[field] = clean_json

        if not updates:
            continue

        fixed += 1
        label = ", ".join(updates.keys())
        print(f"  [{quest_id} pos={position}] fixing {label}")

        if apply:
            col.update_one({"_id": doc_id}, {"$set": updates})
        else:
            skipped += 1

    print(f"\n{'=' * 60}")
    print(f"Documents scanned : {total}")
    print(f"Documents to fix  : {fixed}")
    if not apply:
        print(f"Skipped (dry-run) : {skipped}")
    if errors:
        print(f"Errors            : {len(errors)}")
        for qid, pos, field, msg in errors:
            print(f"  - [{qid} pos={pos}] {field}: {msg}")

    if not apply and fixed:
        print("\nThis was a dry-run. Re-run with --apply to write changes.")
    elif apply and fixed:
        print("\nDone — all fixes applied.")
    else:
        print("\nNothing to fix!")


def main():
    parser = argparse.ArgumentParser(
        description="Fix Python dict literals stored as JSON in MongoDB observations",
    )
    parser.add_argument(
        "--apply", action="store_true",
        help="Actually write fixes (default is dry-run)",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Fix Python Literals → JSON")
    print("=" * 60)

    print("\nConnecting to MongoDB …")
    try:
        db.get_client().admin.command("ping")
        print("Connected.\n")
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

    fix_observations(apply=args.apply)


if __name__ == "__main__":
    main()
