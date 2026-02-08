"""
MongoDB database module for storing and retrieving conversation data.
"""
import os
from typing import Optional, Dict, Any, List
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("MONGO_DATABASE", "bitz")
COLLECTION_NAME = "conversations"

# Global client and database instances
_client = None
_db = None
_collection = None


def get_client():
    """Get or create MongoDB client instance."""
    global _client
    if _client is None:
        try:
            _client = MongoClient(MONGO_URI)
            # Test the connection
            _client.admin.command('ping')
        except ConnectionFailure as e:
            raise ConnectionError(f"Failed to connect to MongoDB: {e}")
    return _client


def get_database():
    """Get or create database instance."""
    global _db
    if _db is None:
        client = get_client()
        _db = client[DATABASE_NAME]
    return _db


def get_collection():
    """Get or create collection instance."""
    global _collection
    if _collection is None:
        db = get_database()
        _collection = db[COLLECTION_NAME]
        # Create index on conversation_id for faster lookups
        _collection.create_index("conversation_id", unique=True)
    return _collection


def save_conversation(
    flavor: str,
    coordinates: str,
    location_name: str,
    conversation_id: str,
    user_id: str,
    history: List[Dict[str, Any]],
    timestamp: Optional[str] = None
) -> bool:
    """
    Save conversation data to MongoDB.
    
    Args:
        flavor: Quest flavor/type
        coordinates: Geographic coordinates
        location_name: Name of the location
        conversation_id: Unique conversation identifier
        user_id: User identifier
        history: List of conversation history entries
        timestamp: Optional timestamp (defaults to current time)
    
    Returns:
        True if successful, False otherwise
    """
    import time
    
    try:
        collection = get_collection()
        
        conversation_data = {
            "flavor": flavor,
            "conversation_id": conversation_id,
            "timestamp": timestamp or str(int(time.time())),
            "user_id": user_id,
            "coordinates": coordinates,
            "location": location_name,
            "history": history
        }
        
        # Use upsert to update if exists, insert if not
        result = collection.update_one(
            {"conversation_id": conversation_id},
            {"$set": conversation_data},
            upsert=True
        )
        
        return result.acknowledged
    except Exception as e:
        print(f"Error saving conversation to MongoDB: {e}")
        return False


def load_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Load conversation data from MongoDB.
    
    Args:
        conversation_id: Unique conversation identifier
    
    Returns:
        Conversation data dictionary or None if not found
    """
    try:
        collection = get_collection()
        conversation = collection.find_one({"conversation_id": conversation_id})
        
        if conversation:
            # Remove MongoDB _id field for consistency with old JSON format
            conversation.pop("_id", None)
            return conversation
        
        return None
    except Exception as e:
        print(f"Error loading conversation from MongoDB: {e}")
        return None


def get_all_conversations(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get all conversations, optionally filtered by user_id.
    
    Args:
        user_id: Optional user ID to filter by
    
    Returns:
        List of conversation dictionaries
    """
    try:
        collection = get_collection()
        query = {"user_id": user_id} if user_id else {}
        
        conversations = list(collection.find(query))
        
        # Remove MongoDB _id fields
        for conv in conversations:
            conv.pop("_id", None)
        
        return conversations
    except Exception as e:
        print(f"Error loading conversations from MongoDB: {e}")
        return []


def delete_conversation(conversation_id: str) -> bool:
    """
    Delete a conversation from MongoDB.
    
    Args:
        conversation_id: Unique conversation identifier
    
    Returns:
        True if deleted, False otherwise
    """
    try:
        collection = get_collection()
        result = collection.delete_one({"conversation_id": conversation_id})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting conversation from MongoDB: {e}")
        return False


def close_connection():
    """Close MongoDB connection."""
    global _client
    if _client:
        _client.close()
        _client = None
