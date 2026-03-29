#!/usr/bin/env python3
"""
Migration script: JSON files + CSV → MongoDB (quests / observations / species).

This script:
1. Scans history/data/ for quest directories
2. Reads history.json → saves quest metadata + individual observations
3. Reads species_data_english.csv → saves individual species rows
4. Optionally verifies the migration
5. Provides detailed progress and error reporting

Usage:
    python migrate_to_mongodb.py [--dry-run] [--verify] [--history-dir PATH]
"""

import csv
import json
import os
import sys
import argparse
from typing import List, Dict, Any, Tuple
import db


# -----------------------------------------------------------------------
# Discovery
# -----------------------------------------------------------------------

def find_quest_dirs(history_directory: str = "./history") -> List[Tuple[str, str]]:
    """
    Find all quest directories that contain a history.json.

    Returns:
        List of (quest_id, directory_path) tuples.
    """
    data_dir = os.path.join(history_directory, "data")

    if not os.path.isdir(data_dir):
        print(f"Error: Data directory not found: {data_dir}")
        return []

    results = []
    for root, _dirs, files in os.walk(data_dir):
        if "history.json" in files:
            quest_id = os.path.basename(root)
            results.append((quest_id, root))

    return results


# -----------------------------------------------------------------------
# Validation
# -----------------------------------------------------------------------

def validate_history(data: Dict[str, Any], quest_id: str) -> Tuple[bool, str]:
    """Validate a history.json dict."""
    if "conversation_id" not in data:
        return False, "Missing field: conversation_id"
    if data["conversation_id"] != quest_id:
        return False, (
            f"ID mismatch: folder={quest_id}, "
            f"file={data['conversation_id']}"
        )
    if not isinstance(data.get("history"), list):
        return False, "history field is not a list"
    return True, ""


# -----------------------------------------------------------------------
# Migration of a single quest
# -----------------------------------------------------------------------

def migrate_quest(
    quest_id: str,
    quest_dir: str,
    dry_run: bool = False,
) -> Tuple[bool, str]:
    """
    Migrate one quest directory → MongoDB.

    Reads:
      - history.json        → quests + observations collections
      - species_data_english.csv  → species collection
    """
    history_path = os.path.join(quest_dir, "history.json")
    csv_path = os.path.join(quest_dir, "species_data_english.csv")

    # -- read & validate history.json ----------------------------------
    try:
        with open(history_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        return False, f"Invalid JSON: {e}"
    except Exception as e:
        return False, f"Cannot read history.json: {e}"

    ok, err = validate_history(data, quest_id)
    if not ok:
        return False, f"Validation failed: {err}"

    # -- read CSV (optional) -------------------------------------------
    species_rows: List[Dict[str, str]] = []
    if os.path.isfile(csv_path):
        try:
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    species_rows.append(row)
        except Exception as e:
            return False, f"Cannot read CSV: {e}"

    if dry_run:
        obs_count = len(data.get("history", []))
        sp_count = len(species_rows)
        return True, f"Validated ({obs_count} observations, {sp_count} species)"

    # -- write to MongoDB -----------------------------------------------
    try:
        # 1. Quest metadata
        db.save_quest(
            quest_id=quest_id,
            user_id=data.get("user_id", ""),
            flavor=data.get("flavor"),
            coordinates=data.get("coordinates"),
            location=data.get("location"),
            timestamp=data.get("timestamp"),
        )

        # 2. Observations (one per history entry)
        for i, entry in enumerate(data.get("history", [])):
            db.save_observation(
                quest_id=quest_id,
                position=i,
                timestamp=entry.get("timestamp", ""),
                user_message=entry.get("user", ""),
                assistant_response=entry.get("assistant", ""),
                image_filename=entry.get("image_filename"),
                image_location=entry.get("image_location"),
            )

        # 3. Species (batch insert from CSV)
        if species_rows:
            batch = []
            for row in species_rows:
                batch.append({
                    "quest_id": quest_id,
                    "observation_image": row.get("image_name", ""),
                    "taxonomic_group": row.get("taxonomic_group", ""),
                    "scientific_name": row.get("scientific_name", ""),
                    "common_name": row.get("common_name", ""),
                    "confidence": row.get("confidence", ""),
                    "notes": row.get("notes", ""),
                    "latitude": row.get("latitude", ""),
                    "longitude": row.get("longitude", ""),
                })
            db.save_species_batch(batch)

        obs_count = len(data.get("history", []))
        sp_count = len(species_rows)
        return True, f"Migrated ({obs_count} observations, {sp_count} species)"

    except Exception as e:
        return False, f"Write error: {e}"


# -----------------------------------------------------------------------
# Verification
# -----------------------------------------------------------------------

def verify_quest(quest_id: str, quest_dir: str) -> Tuple[bool, str]:
    """Verify a migrated quest against the original files."""
    issues = []

    # -- check quest metadata ------------------------------------------
    quest = db.load_quest(quest_id)
    if not quest:
        return False, "Quest not found in MongoDB"

    history_path = os.path.join(quest_dir, "history.json")
    with open(history_path, "r", encoding="utf-8") as f:
        orig = json.load(f)

    for field in ("flavor", "user_id", "coordinates", "location"):
        orig_val = orig.get(field)
        db_val = quest.get(field)
        if orig_val != db_val:
            issues.append(f"quest.{field}: {orig_val!r} != {db_val!r}")

    # -- check observation count ---------------------------------------
    orig_obs = len(orig.get("history", []))
    db_obs = db.count_observations(quest_id)
    if orig_obs != db_obs:
        issues.append(f"observation count: {orig_obs} != {db_obs}")

    # -- check species count -------------------------------------------
    csv_path = os.path.join(quest_dir, "species_data_english.csv")
    if os.path.isfile(csv_path):
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            next(reader, None)  # skip header
            orig_sp = sum(1 for _ in reader)
        db_sp = db.count_species(quest_id)
        if orig_sp != db_sp:
            issues.append(f"species count: {orig_sp} != {db_sp}")

    if issues:
        return False, "; ".join(issues)
    return True, "Verification passed"


# -----------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Migrate quest data from JSON/CSV files to MongoDB",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python migrate_to_mongodb.py --dry-run
  python migrate_to_mongodb.py
  python migrate_to_mongodb.py --verify
  python migrate_to_mongodb.py --history-dir /path/to/history
        """,
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate without writing to MongoDB")
    parser.add_argument("--verify", action="store_true",
                        help="Verify data after migration")
    parser.add_argument("--history-dir", type=str, default="./history",
                        help="Path to history directory (default: ./history)")
    parser.add_argument("--skip-existing", action="store_true",
                        help="Skip quests already present in MongoDB")

    args = parser.parse_args()

    print("=" * 70)
    print("MongoDB Migration Script")
    print("=" * 70)
    print()

    if args.dry_run:
        print("DRY RUN MODE — no data will be written\n")

    # -- test connection ------------------------------------------------
    print("Testing MongoDB connection...")
    try:
        db.get_client().admin.command("ping")
        print("✓ Connected\n")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        print("Check your MONGO_URI in .env")
        sys.exit(1)

    # -- discover quests ------------------------------------------------
    print(f"Scanning {args.history_dir} ...")
    quest_dirs = find_quest_dirs(args.history_dir)
    if not quest_dirs:
        print("No quest directories found.")
        sys.exit(0)
    print(f"Found {len(quest_dirs)} quest(s)\n")

    # -- process --------------------------------------------------------
    ok_count = 0
    fail_count = 0
    skip_count = 0
    errors: List[Tuple[str, str]] = []

    for i, (quest_id, quest_dir) in enumerate(quest_dirs, 1):
        print(f"[{i}/{len(quest_dirs)}] {quest_id} ", end="")

        # skip-existing check
        if not args.dry_run and args.skip_existing:
            if db.load_quest(quest_id):
                print("SKIPPED (exists)")
                skip_count += 1
                continue

        success, msg = migrate_quest(quest_id, quest_dir, args.dry_run)

        if success:
            print(f"✓ {msg}")
            ok_count += 1

            if args.verify and not args.dry_run:
                v_ok, v_msg = verify_quest(quest_id, quest_dir)
                if v_ok:
                    print(f"  ✓ {v_msg}")
                else:
                    print(f"  ✗ {v_msg}")
                    errors.append((quest_id, f"Verify: {v_msg}"))
        else:
            print(f"✗ {msg}")
            fail_count += 1
            errors.append((quest_id, msg))

    # -- summary --------------------------------------------------------
    print()
    print("=" * 70)
    print("Summary")
    print("=" * 70)
    print(f"Total:    {len(quest_dirs)}")
    print(f"Success:  {ok_count}")
    print(f"Failed:   {fail_count}")
    print(f"Skipped:  {skip_count}")

    if errors:
        print("\nErrors:")
        for qid, msg in errors:
            print(f"  - {qid}: {msg}")

    if args.dry_run:
        print("\nDry run — nothing was written. Re-run without --dry-run.")
    elif ok_count > 0:
        print("\nMigration complete!")

    sys.exit(1 if fail_count else 0)


if __name__ == "__main__":
    main()
