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
import re
import sys
from typing import Any, Optional

import db


def needs_fixing(text: str) -> bool:
    """Check if a string value needs fixing (Python literal or nested literal in JSON)."""
    if not isinstance(text, str) or len(text) < 2:
        return False
    stripped = text.strip()
    if not (stripped.startswith("{") or stripped.startswith("[")):
        return False
    if any(token in stripped for token in ("True", "False", "None", "'")):
        return True
    # Valid outer JSON but with a Python literal stuffed inside a string field
    try:
        obj = json.loads(stripped)
        return _has_embedded_python_literal(obj)
    except (json.JSONDecodeError, TypeError):
        return False


def _has_embedded_python_literal(obj: Any) -> bool:
    """Recursively check if any string value looks like a Python dict/list literal."""
    if isinstance(obj, dict):
        for v in obj.values():
            if _has_embedded_python_literal(v):
                return True
    elif isinstance(obj, list):
        for v in obj:
            if _has_embedded_python_literal(v):
                return True
    elif isinstance(obj, str):
        s = obj.strip()
        if (s.startswith("{") or s.startswith("[")) and \
           any(tok in s for tok in ("'", "True", "False", "None")):
            return True
    return False


def try_parse_python_literal(text: str) -> Optional[Any]:
    """Try ast.literal_eval; return the parsed object or None."""
    try:
        return ast.literal_eval(text.strip())
    except Exception:
        return None


def textual_fixup(text: str) -> str:
    """
    Regex-based fixup for Python-ish strings that ast.literal_eval can't
    handle (e.g. embedded newlines, mixed quoting, f-string leftovers).
    """
    s = text.strip()
    s = s.replace("True", "true").replace("False", "false").replace("None", "null")
    # Single-quoted keys/values → double-quoted, being careful around apostrophes
    s = re.sub(r"(?<![a-zA-Z])'([^']*?)'(?=\s*[:,\]\}])", r'"\1"', s)
    s = re.sub(r"(?<=[:,\[\{])\s*'([^']*?)'", r' "\1"', s)
    # Trailing commas before } or ]
    s = re.sub(r",\s*([}\]])", r"\1", s)
    return s


def _fix_embedded_literals(obj: Any) -> Any:
    """
    Recursively walk a parsed JSON structure. If any string value is itself
    a Python dict/list literal, parse it and inline the result.
    """
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            out[k] = _fix_embedded_literals(v)
        # If the dict has null placeholder keys alongside an embedded literal
        # in "information", and the literal contains the *real* top-level keys,
        # promote the inner structure to replace the wrapper.
        if "species_identification" in out:
            si = out["species_identification"]
            if isinstance(si, dict) and "information" in si and isinstance(si["information"], dict):
                inner = si["information"]
                if "species_identification" in inner:
                    return inner
        return out
    elif isinstance(obj, list):
        return [_fix_embedded_literals(v) for v in obj]
    elif isinstance(obj, str):
        s = obj.strip()
        if (s.startswith("{") or s.startswith("[")) and \
           any(tok in s for tok in ("'", "True", "False", "None")):
            parsed = try_parse_python_literal(s)
            if parsed is not None:
                return _fix_embedded_literals(parsed)
            fixed_text = textual_fixup(s)
            try:
                parsed = json.loads(fixed_text)
                return _fix_embedded_literals(parsed)
            except json.JSONDecodeError:
                pass
    return obj


def try_fix(text: str) -> Optional[str]:
    """
    Try multiple strategies to convert a Python-ish string to valid JSON.
    Returns clean JSON string or None.
    """
    stripped = text.strip()

    # Strategy 1: ast.literal_eval (handles pure Python literals)
    parsed = try_parse_python_literal(stripped)
    if parsed is not None:
        try:
            return json.dumps(parsed, ensure_ascii=False)
        except (TypeError, ValueError):
            pass

    # Strategy 2: regex-based textual fixup + json.loads
    fixed = textual_fixup(stripped)
    try:
        obj = json.loads(fixed)
        return json.dumps(obj, ensure_ascii=False)
    except json.JSONDecodeError:
        pass

    # Strategy 3: valid outer JSON with Python literals embedded in string fields
    try:
        obj = json.loads(stripped)
        repaired = _fix_embedded_literals(obj)
        result = json.dumps(repaired, ensure_ascii=False)
        if result != stripped:
            return result
    except (json.JSONDecodeError, TypeError):
        pass

    # Strategy 4: strip markdown fences, extract JSON object
    inner = re.sub(r"^```(?:json)?\s*", "", stripped)
    inner = re.sub(r"\s*```$", "", inner).strip()
    match = re.search(r"(\{[\s\S]*\})", inner)
    if match:
        candidate = match.group(1)
        candidate = textual_fixup(candidate)
        try:
            obj = json.loads(candidate)
            return json.dumps(obj, ensure_ascii=False)
        except json.JSONDecodeError:
            pass

    return None


def fix_observations(apply: bool = False, diagnose: bool = False):
    col = db.get_observations_collection()
    total = col.count_documents({})
    print(f"Scanning {total} observations …\n")

    fields_to_check = ["assistant_response", "user_message"]
    fixed = 0
    skipped = 0
    errors = []
    error_samples = []

    for doc in col.find():
        doc_id = doc["_id"]
        quest_id = doc.get("quest_id", "?")
        position = doc.get("position", "?")
        updates = {}

        for field in fields_to_check:
            value = doc.get(field)
            if not value or not isinstance(value, str):
                continue

            if not needs_fixing(value):
                continue

            result = try_fix(value)
            if result is None:
                errors.append((quest_id, position, field))
                if diagnose and len(error_samples) < 5:
                    preview = value[:500] + ("…" if len(value) > 500 else "")
                    error_samples.append((quest_id, position, field, preview))
                continue

            updates[field] = result

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
        for qid, pos, field in errors[:20]:
            print(f"  - [{qid} pos={pos}] {field}")
        if len(errors) > 20:
            print(f"  … and {len(errors) - 20} more")

    if diagnose and error_samples:
        print(f"\n{'=' * 60}")
        print("SAMPLE FAILURES (first 5)")
        print("=" * 60)
        for qid, pos, field, preview in error_samples:
            print(f"\n--- [{qid} pos={pos}] {field} ---")
            print(preview)

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
    parser.add_argument(
        "--diagnose", action="store_true",
        help="Print first 5 unfixable values for debugging",
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

    fix_observations(apply=args.apply, diagnose=args.diagnose)


if __name__ == "__main__":
    main()
