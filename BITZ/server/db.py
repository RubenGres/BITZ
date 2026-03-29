
"""
MongoDB database module for BITZ.

Three collections:
  - quests          : one doc per quest (metadata only, no heavy arrays)
  - observations    : one doc per image/observation within a quest
  - species         : one doc per species identification row (from CSV)

This keeps documents small, lets us query/filter/paginate at every level,
and matches how the data is actually produced and consumed.
"""

import os
import time
from typing import Optional, Dict, Any, List
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("MONGO_DATABASE", "bitz")

_client: Optional[MongoClient] = None
_db = None


def get_client():
    """Get or create MongoDB client."""
    global _client
    if _client is None:
        try:
            _client = MongoClient(MONGO_URI)
            _client.admin.command("ping")
        except ConnectionFailure as e:
            raise ConnectionError(f"Failed to connect to MongoDB: {e}")
    return _client


def get_database():
    """Get or create database instance."""
    global _db
    if _db is None:
        _db = get_client()[DATABASE_NAME]
    return _db


# ---------------------------------------------------------------------------
# Collection accessors (lazy init + indexes)
# ---------------------------------------------------------------------------
_quests_col = None
_observations_col = None
_species_col = None


def get_quests_collection():
    global _quests_col
    if _quests_col is None:
        _quests_col = get_database()["quests"]
        _quests_col.create_index("quest_id", unique=True)
        _quests_col.create_index("user_id")
        _quests_col.create_index("timestamp")
    return _quests_col


def get_observations_collection():
    global _observations_col
    if _observations_col is None:
        _observations_col = get_database()["observations"]
        _observations_col.create_index([("quest_id", ASCENDING), ("position", ASCENDING)])
        _observations_col.create_index("quest_id")
        _observations_col.create_index("timestamp")
    return _observations_col


def get_species_collection():
    global _species_col
    if _species_col is None:
        _species_col = get_database()["species"]
        _species_col.create_index("quest_id")
        _species_col.create_index("observation_image")
        _species_col.create_index("scientific_name")
        _species_col.create_index("taxonomic_group")
    return _species_col


# ===================================================================
# QUESTS
# ===================================================================

def save_quest(
    quest_id: str,
    user_id: str,
    flavor: Optional[str] = None,
    coordinates: Optional[str] = None,
    location: Optional[str] = None,
    timestamp: Optional[str] = None,
) -> bool:
    """Create or update quest metadata."""
    try:
        doc = {
            "quest_id": quest_id,
            "user_id": user_id,
            "flavor": flavor,
            "coordinates": coordinates,
            "location": location,
            "timestamp": timestamp or str(int(time.time())),
        }
        get_quests_collection().update_one(
            {"quest_id": quest_id}, {"$set": doc}, upsert=True
        )
        return True
    except Exception as e:
        print(f"Error saving quest: {e}")
        return False


def load_quest(quest_id: str) -> Optional[Dict[str, Any]]:
    """Load quest metadata."""
    try:
        doc = get_quests_collection().find_one({"quest_id": quest_id})
        if doc:
            doc.pop("_id", None)
        return doc
    except Exception as e:
        print(f"Error loading quest: {e}")
        return None


def get_all_quest_ids() -> List[str]:
    """Return sorted list of all quest IDs."""
    try:
        docs = get_quests_collection().find({}, {"quest_id": 1, "_id": 0})
        ids = [d["quest_id"] for d in docs]
        ids.sort()
        return ids
    except Exception as e:
        print(f"Error getting quest IDs: {e}")
        return []


def get_quests_paginated(
    page: int = 1,
    per_page: int = 20,
    user_id: Optional[str] = None,
    exclude_user_id: Optional[str] = None,
    sort_field: str = "timestamp",
    sort_order: int = -1,
) -> Dict[str, Any]:
    """Paginated quest listing (metadata only, lightweight)."""
    try:
        col = get_quests_collection()
        query: Dict[str, Any] = {}
        if user_id:
            query["user_id"] = user_id
        elif exclude_user_id:
            query["user_id"] = {"$ne": exclude_user_id}

        total = col.count_documents(query)
        skip = (page - 1) * per_page

        cursor = (
            col.find(query, {"_id": 0})
            .sort(sort_field, sort_order)
            .skip(skip)
            .limit(per_page)
        )
        quests = list(cursor)
        total_pages = max(1, -(-total // per_page))

        return {
            "quests": quests,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
        }
    except Exception as e:
        print(f"Error in paginated quest query: {e}")
        return {"quests": [], "total": 0, "page": page, "per_page": per_page, "total_pages": 0}


def delete_quest(quest_id: str) -> bool:
    """Delete a quest and all its observations and species."""
    try:
        get_quests_collection().delete_one({"quest_id": quest_id})
        get_observations_collection().delete_many({"quest_id": quest_id})
        get_species_collection().delete_many({"quest_id": quest_id})
        return True
    except Exception as e:
        print(f"Error deleting quest: {e}")
        return False


# ===================================================================
# OBSERVATIONS
# ===================================================================

def save_observation(
    quest_id: str,
    position: int,
    timestamp: str,
    user_message: str = "",
    assistant_response: str = "",
    image_filename: Optional[str] = None,
    image_location: Optional[Any] = None,
) -> bool:
    """Save a single observation (one image upload / chat turn)."""
    try:
        doc = {
            "quest_id": quest_id,
            "position": position,
            "timestamp": timestamp,
            "user_message": user_message,
            "assistant_response": assistant_response,
            "image_filename": image_filename,
            "image_location": image_location,
        }
        get_observations_collection().update_one(
            {"quest_id": quest_id, "position": position},
            {"$set": doc},
            upsert=True,
        )
        return True
    except Exception as e:
        print(f"Error saving observation: {e}")
        return False


def load_observations(quest_id: str) -> List[Dict[str, Any]]:
    """Load all observations for a quest, sorted by position."""
    try:
        cursor = (
            get_observations_collection()
            .find({"quest_id": quest_id}, {"_id": 0})
            .sort("position", ASCENDING)
        )
        return list(cursor)
    except Exception as e:
        print(f"Error loading observations: {e}")
        return []


def count_observations(quest_id: str) -> int:
    """Count observations in a quest."""
    try:
        return get_observations_collection().count_documents({"quest_id": quest_id})
    except Exception as e:
        print(f"Error counting observations: {e}")
        return 0


# ===================================================================
# SPECIES
# ===================================================================

def save_species(
    quest_id: str,
    image_name: str,
    taxonomic_group: str,
    scientific_name: str,
    common_name: str,
    confidence: str = "",
    notes: str = "",
    latitude: Optional[str] = None,
    longitude: Optional[str] = None,
) -> bool:
    """Save a single species identification row."""
    try:
        doc = {
            "quest_id": quest_id,
            "observation_image": image_name,
            "taxonomic_group": taxonomic_group,
            "scientific_name": scientific_name,
            "common_name": common_name,
            "confidence": confidence,
            "notes": notes,
            "latitude": latitude or "",
            "longitude": longitude or "",
        }
        # Use upsert keyed on quest + image + scientific_name to avoid duplicates
        get_species_collection().update_one(
            {
                "quest_id": quest_id,
                "observation_image": image_name,
                "scientific_name": scientific_name,
            },
            {"$set": doc},
            upsert=True,
        )
        return True
    except Exception as e:
        print(f"Error saving species: {e}")
        return False


def save_species_batch(species_list: List[Dict[str, Any]]) -> bool:
    """Save multiple species rows efficiently using bulk upserts."""
    try:
        from pymongo import UpdateOne

        col = get_species_collection()
        operations = []
        for sp in species_list:
            operations.append(
                UpdateOne(
                    {
                        "quest_id": sp["quest_id"],
                        "observation_image": sp["observation_image"],
                        "scientific_name": sp["scientific_name"],
                    },
                    {"$set": sp},
                    upsert=True,
                )
            )
        if operations:
            col.bulk_write(operations, ordered=False)
        return True
    except Exception as e:
        print(f"Error in batch species save: {e}")
        return False


def load_species(quest_id: str) -> List[Dict[str, Any]]:
    """Load all species for a quest."""
    try:
        cursor = get_species_collection().find({"quest_id": quest_id}, {"_id": 0})
        return list(cursor)
    except Exception as e:
        print(f"Error loading species: {e}")
        return []


def count_species(quest_id: str) -> int:
    """Count species identifications for a quest."""
    try:
        return get_species_collection().count_documents({"quest_id": quest_id})
    except Exception as e:
        print(f"Error counting species: {e}")
        return 0


def get_species_groups(quest_id: str) -> Dict[str, int]:
    """Get taxonomic group counts for a quest."""
    try:
        pipeline = [
            {"$match": {"quest_id": quest_id}},
            {"$group": {"_id": "$taxonomic_group", "count": {"$sum": 1}}},
        ]
        result = get_species_collection().aggregate(pipeline)
        return {doc["_id"]: doc["count"] for doc in result if doc["_id"]}
    except Exception as e:
        print(f"Error getting species groups: {e}")
        return {}


def get_species_csv_string(quest_id: str) -> str:
    """Reconstruct the CSV string from species documents."""
    try:
        species = load_species(quest_id)
        if not species:
            return ""
        header = "image_name,taxonomic_group,scientific_name,common_name,confidence,notes,latitude,longitude"
        lines = [header]
        for sp in species:
            line = ",".join([
                sp.get("observation_image", ""),
                sp.get("taxonomic_group", ""),
                sp.get("scientific_name", ""),
                sp.get("common_name", ""),
                sp.get("confidence", ""),
                sp.get("notes", ""),
                sp.get("latitude", ""),
                sp.get("longitude", ""),
            ])
            lines.append(line)
        return "\n".join(lines) + "\n"
    except Exception as e:
        print(f"Error generating CSV string: {e}")
        return ""


# ===================================================================
# BACKWARD-COMPATIBLE HELPERS
# (used by existing code that expects the old flat format)
# ===================================================================

def save_conversation(
    flavor: str,
    coordinates: str,
    location_name: str,
    conversation_id: str,
    user_id: str,
    history: List[Dict[str, Any]],
    timestamp: Optional[str] = None,
) -> bool:
    """
    Backward-compatible save that splits data across the three collections.
    Called from oaak.save_conversation().
    """
    try:
        # 1. Save quest metadata
        save_quest(
            quest_id=conversation_id,
            user_id=user_id,
            flavor=flavor,
            coordinates=coordinates,
            location=location_name,
            timestamp=timestamp,
        )

        # 2. Save each observation
        for i, entry in enumerate(history):
            save_observation(
                quest_id=conversation_id,
                position=i,
                timestamp=entry.get("timestamp", ""),
                user_message=entry.get("user", ""),
                assistant_response=entry.get("assistant", ""),
                image_filename=entry.get("image_filename"),
                image_location=entry.get("image_location"),
            )

        return True
    except Exception as e:
        print(f"Error in save_conversation: {e}")
        return False


def load_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Backward-compatible load that reconstructs the old flat format
    from the three collections.
    """
    try:
        quest = load_quest(conversation_id)
        if not quest:
            return None

        observations = load_observations(conversation_id)

        # Rebuild the history array in the old format
        history = []
        for obs in observations:
            entry: Dict[str, Any] = {
                "user": obs.get("user_message", ""),
                "timestamp": obs.get("timestamp", ""),
                "assistant": obs.get("assistant_response", ""),
            }
            if obs.get("image_filename"):
                entry["image_filename"] = obs["image_filename"]
            if obs.get("image_location"):
                entry["image_location"] = obs["image_location"]
            history.append(entry)

        return {
            "flavor": quest.get("flavor"),
            "conversation_id": quest.get("quest_id"),
            "timestamp": quest.get("timestamp"),
            "user_id": quest.get("user_id"),
            "coordinates": quest.get("coordinates"),
            "location": quest.get("location"),
            "history": history,
        }
    except Exception as e:
        print(f"Error in load_conversation: {e}")
        return None


def get_all_conversations(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Backward-compatible: return list of quest docs."""
    try:
        col = get_quests_collection()
        query = {"user_id": user_id} if user_id else {}
        quests = list(col.find(query, {"_id": 0}))
        # Map quest_id → conversation_id for backward compat
        for q in quests:
            q["conversation_id"] = q.get("quest_id")
        return quests
    except Exception as e:
        print(f"Error in get_all_conversations: {e}")
        return []


def get_conversations_paginated(
    page: int = 1,
    per_page: int = 20,
    user_id: Optional[str] = None,
    exclude_user_id: Optional[str] = None,
    sort_field: str = "timestamp",
    sort_order: int = -1,
) -> Dict[str, Any]:
    """Backward-compatible paginated listing."""
    result = get_quests_paginated(
        page=page,
        per_page=per_page,
        user_id=user_id,
        exclude_user_id=exclude_user_id,
        sort_field=sort_field,
        sort_order=sort_order,
    )
    # Map quest_id → conversation_id for backward compat
    for q in result["quests"]:
        q["conversation_id"] = q.get("quest_id")
    return result


# ===================================================================
# CONNECTION
# ===================================================================

def close_connection():
    """Close MongoDB connection."""
    global _client
    if _client:
        _client.close()
        _client = None
