# MongoDB Setup Guide

This application now uses MongoDB to store conversation data instead of JSON files.

## Configuration

The MongoDB connection is configured using environment variables.

### Docker Compose Setup

When using Docker Compose, MongoDB is automatically configured. The server connects to MongoDB using the service name `mongodb` on the internal Docker network.

**No additional configuration needed** - the connection is set up automatically:
- `MONGO_URI=mongodb://mongodb:27017/` (internal Docker network)
- `MONGO_DATABASE=bitz` (or value from `.env` if set)

### Manual Setup

For manual installation, create a `.env` file in the `server` directory with the following variables:

```env
MONGO_URI=mongodb://localhost:27017/
MONGO_DATABASE=bitz
```

### Environment Variables

- `MONGO_URI` (optional, default: `mongodb://localhost:27017/`): The MongoDB connection URI
  - **Docker Compose**: `mongodb://mongodb:27017/` (automatically set)
  - For local MongoDB: `mongodb://localhost:27017/`
  - For MongoDB Atlas (cloud): `mongodb+srv://username:password@cluster.mongodb.net/`
  - For authenticated local MongoDB: `mongodb://username:password@localhost:27017/`

- `MONGO_DATABASE` (optional, default: `bitz`): The name of the MongoDB database to use

- `MONGO_PORT` (optional, default: `27017`): Port to expose MongoDB on (Docker Compose only)

## Installation

### Docker Compose (Recommended)

MongoDB is included in the Docker Compose setup. The service is automatically configured and connected to the application.

1. **Optional**: Set MongoDB port in your `.env` file (default: 27017):
   ```env
   MONGO_PORT=27017
   MONGO_DATABASE=bitz
   ```

2. Start all services:
   ```bash
   docker compose up -d
   ```

   MongoDB will be available at `mongodb://mongodb:27017/` from within the Docker network.

3. The `bitz-server` service is automatically configured with:
   - `MONGO_URI=mongodb://mongodb:27017/`
   - `MONGO_DATABASE=bitz` (or value from `.env`)

### Manual Installation

1. Install MongoDB on your system or use MongoDB Atlas (cloud)
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Database Structure

The application uses a collection named `conversations` with the following document structure:

```json
{
  "conversation_id": "unique_conversation_id",
  "flavor": "quest_flavor",
  "timestamp": "1234567890",
  "user_id": "user_id",
  "coordinates": "lat,lon",
  "location": "location_name",
  "history": [
    {
      "user": "user_message",
      "timestamp": "1234567890",
      "assistant": "assistant_response",
      "image_filename": "optional_image.jpg",
      "image_location": "optional_location"
    }
  ]
}
```

## Migration from JSON Files

If you have existing JSON files in the `history/data/` directory, you can migrate them to MongoDB using the provided migration script.

### Running the Migration

1. **Test the migration first (dry run):**
   ```bash
   python migrate_to_mongodb.py --dry-run
   ```
   This will validate all JSON files without saving to MongoDB.

2. **Perform the actual migration:**
   ```bash
   python migrate_to_mongodb.py
   ```

3. **Migrate with verification:**
   ```bash
   python migrate_to_mongodb.py --verify
   ```
   This will verify that each migrated conversation matches the original file.

4. **Use a custom history directory:**
   ```bash
   python migrate_to_mongodb.py --history-dir /path/to/history
   ```

5. **Skip existing conversations:**
   ```bash
   python migrate_to_mongodb.py --skip-existing
   ```
   This will skip conversations that already exist in MongoDB.

### Migration Script Options

- `--dry-run`: Validate files without saving to MongoDB
- `--verify`: Verify migrated conversations match original files
- `--history-dir PATH`: Specify custom history directory (default: ./history)
- `--skip-existing`: Skip conversations that already exist in MongoDB

### What Gets Migrated

- Conversation metadata (flavor, coordinates, location, user_id, timestamp)
- Full conversation history (all messages and responses)
- Image filenames and locations (references only, images stay on filesystem)

### What Stays on Filesystem

- CSV files (species data)
- Image files
- Other supporting files

The migration script will:
- Scan for all `history.json` files in `history/data/`
- Validate each file's structure
- Save to MongoDB with error handling
- Provide detailed progress and error reporting

## Notes

- CSV files and images remain stored on the filesystem
- Only conversation history is stored in MongoDB
- The application automatically creates indexes on `conversation_id` for faster lookups
