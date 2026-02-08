#!/usr/bin/env python3
"""
Migration script to migrate conversation history from JSON files to MongoDB.

This script:
1. Scans the history/data directory for all history.json files
2. Reads and validates each JSON file
3. Migrates the data to MongoDB
4. Optionally verifies the migration
5. Provides detailed progress and error reporting

Usage:
    python migrate_to_mongodb.py [--dry-run] [--verify] [--history-dir PATH]
"""

import os
import json
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Any, Tuple
import db


def find_history_json_files(history_directory: str = "./history") -> List[Tuple[str, str]]:
    """
    Find all history.json files in the history/data directory.
    
    Args:
        history_directory: Base directory containing the history data
        
    Returns:
        List of tuples: (conversation_id, file_path)
    """
    history_data_dir = os.path.join(history_directory, "data")
    
    if not os.path.isdir(history_data_dir):
        print(f"Error: History data directory not found: {history_data_dir}")
        return []
    
    json_files = []
    
    # Walk through all subdirectories
    for root, dirs, files in os.walk(history_data_dir):
        for file in files:
            if file == "history.json":
                file_path = os.path.join(root, file)
                # Extract conversation_id from path (e.g., history/data/{conversation_id}/history.json)
                relative_path = os.path.relpath(file_path, history_data_dir)
                conversation_id = os.path.dirname(relative_path)
                
                # Handle case where file is directly in data directory
                if conversation_id == ".":
                    conversation_id = os.path.basename(os.path.dirname(file_path))
                
                json_files.append((conversation_id, file_path))
    
    return json_files


def validate_conversation_data(data: Dict[str, Any], conversation_id: str) -> Tuple[bool, str]:
    """
    Validate that the conversation data has the required fields.
    
    Args:
        data: The conversation data dictionary
        conversation_id: The conversation ID for error messages
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    required_fields = ["conversation_id", "history"]
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    # Verify conversation_id matches
    if data.get("conversation_id") != conversation_id:
        return False, f"Conversation ID mismatch: expected {conversation_id}, got {data.get('conversation_id')}"
    
    # Verify history is a list
    if not isinstance(data.get("history"), list):
        return False, "History field must be a list"
    
    return True, ""


def migrate_file(conversation_id: str, file_path: str, dry_run: bool = False) -> Tuple[bool, str]:
    """
    Migrate a single history.json file to MongoDB.
    
    Args:
        conversation_id: The conversation ID
        file_path: Path to the history.json file
        dry_run: If True, only validate without saving
        
    Returns:
        Tuple of (success, message)
    """
    try:
        # Read the JSON file
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Validate the data
        is_valid, error_msg = validate_conversation_data(data, conversation_id)
        if not is_valid:
            return False, f"Validation failed: {error_msg}"
        
        if dry_run:
            return True, "Validated (dry-run mode)"
        
        # Check if conversation already exists (safety check)
        existing = db.load_conversation(conversation_id)
        if existing:
            return False, "Conversation already exists in MongoDB (use --skip-existing to skip)"
        
        # Extract fields for saving
        flavor = data.get("flavor", "")
        coordinates = data.get("coordinates", "")
        location_name = data.get("location", "")
        user_id = data.get("user_id", "")
        history = data.get("history", [])
        timestamp = data.get("timestamp")
        
        # Save to MongoDB
        success = db.save_conversation(
            flavor=flavor,
            coordinates=coordinates,
            location_name=location_name,
            conversation_id=conversation_id,
            user_id=user_id,
            history=history,
            timestamp=timestamp
        )
        
        if success:
            return True, "Migrated successfully"
        else:
            return False, "Failed to save to MongoDB"
            
    except json.JSONDecodeError as e:
        return False, f"Invalid JSON: {str(e)}"
    except Exception as e:
        return False, f"Error: {str(e)}"


def verify_migration(conversation_id: str, file_path: str) -> Tuple[bool, str]:
    """
    Verify that a migrated conversation matches the original JSON file.
    
    Args:
        conversation_id: The conversation ID
        file_path: Path to the original history.json file
        
    Returns:
        Tuple of (matches, message)
    """
    try:
        # Load from MongoDB
        mongo_data = db.load_conversation(conversation_id)
        if not mongo_data:
            return False, "Conversation not found in MongoDB"
        
        # Load from file
        with open(file_path, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
        
        # Compare key fields (excluding MongoDB _id)
        key_fields = ["conversation_id", "flavor", "timestamp", "user_id", 
                      "coordinates", "location", "history"]
        
        differences = []
        for field in key_fields:
            file_value = file_data.get(field)
            mongo_value = mongo_data.get(field)
            
            if file_value != mongo_value:
                differences.append(f"{field}: file={file_value} != mongo={mongo_value}")
        
        if differences:
            return False, f"Mismatches: {', '.join(differences)}"
        
        return True, "Verification passed"
        
    except Exception as e:
        return False, f"Verification error: {str(e)}"


def main():
    parser = argparse.ArgumentParser(
        description="Migrate conversation history from JSON files to MongoDB",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run to see what would be migrated
  python migrate_to_mongodb.py --dry-run
  
  # Perform actual migration
  python migrate_to_mongodb.py
  
  # Migrate and verify
  python migrate_to_mongodb.py --verify
  
  # Use custom history directory
  python migrate_to_mongodb.py --history-dir /path/to/history
        """
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate files without saving to MongoDB"
    )
    
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify migrated conversations match original files"
    )
    
    parser.add_argument(
        "--history-dir",
        type=str,
        default="./history",
        help="Path to history directory (default: ./history)"
    )
    
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip conversations that already exist in MongoDB"
    )
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("MongoDB Migration Script")
    print("=" * 70)
    print()
    
    if args.dry_run:
        print("DRY RUN MODE: No data will be saved to MongoDB")
        print()
    
    # Test MongoDB connection
    print("Testing MongoDB connection...")
    try:
        client = db.get_client()
        client.admin.command('ping')
        print("✓ MongoDB connection successful")
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        print("\nPlease check your MongoDB configuration in .env file")
        sys.exit(1)
    
    print()
    
    # Find all history.json files
    print(f"Scanning for history.json files in {args.history_dir}...")
    json_files = find_history_json_files(args.history_dir)
    
    if not json_files:
        print("No history.json files found.")
        sys.exit(0)
    
    print(f"Found {len(json_files)} history.json file(s)")
    print()
    
    # Statistics
    successful = 0
    failed = 0
    skipped = 0
    errors = []
    
    # Process each file
    for i, (conversation_id, file_path) in enumerate(json_files, 1):
        print(f"[{i}/{len(json_files)}] Processing {conversation_id}...", end=" ")
        
        # Check if already exists
        if not args.dry_run:
            existing = db.load_conversation(conversation_id)
            if existing:
                if args.skip_existing:
                    print("SKIPPED (already exists)")
                    skipped += 1
                    continue
                else:
                    # Warn but continue - migrate_file will handle the error
                    pass
        
        # Migrate the file
        success, message = migrate_file(conversation_id, file_path, args.dry_run)
        
        if success:
            print(f"✓ {message}")
            successful += 1
            
            # Verify if requested
            if args.verify and not args.dry_run:
                verify_success, verify_msg = verify_migration(conversation_id, file_path)
                if verify_success:
                    print(f"  ✓ Verification: {verify_msg}")
                else:
                    print(f"  ✗ Verification failed: {verify_msg}")
                    errors.append((conversation_id, f"Verification: {verify_msg}"))
        else:
            print(f"✗ {message}")
            failed += 1
            errors.append((conversation_id, message))
    
    # Print summary
    print()
    print("=" * 70)
    print("Migration Summary")
    print("=" * 70)
    print(f"Total files:     {len(json_files)}")
    print(f"Successful:      {successful}")
    print(f"Failed:          {failed}")
    print(f"Skipped:         {skipped}")
    print()
    
    if errors:
        print("Errors:")
        for conversation_id, error in errors:
            print(f"  - {conversation_id}: {error}")
        print()
    
    if args.dry_run:
        print("This was a dry run. No data was saved to MongoDB.")
        print("Run without --dry-run to perform the actual migration.")
    elif successful > 0:
        print("Migration completed successfully!")
    
    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
