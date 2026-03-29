# Migration Guide: JSON Files to MongoDB

This guide walks you through migrating existing conversation history from JSON files in `history/data/` to MongoDB, now used by the server.

## Prerequisites

- Docker and Docker Compose installed (recommended path)
- Or a running MongoDB instance you can connect to
- Python environment capable of running the migration script

## 1) Backup First

Before changing anything, back up your current `history` directory.

```bash
cp -a history history_backup_$(date +%Y%m%d_%H%M%S)
```

If you are on a server, ensure you have sufficient disk space for the copy.

## 2) Start MongoDB (Docker Compose)

MongoDB is already included in `docker-compose.yml`.

```bash
docker compose up -d mongodb
```

Notes:
- Inside Docker, the server connects to `mongodb://mongodb:27017/`.
- You can customize `MONGO_DATABASE` (default: `bitz`) via `.env`.

## 3) Configure Server Environment (if running locally)

If you are not using Docker for the server, create `BITZ/server/.env` with:

```env
MONGO_URI=mongodb://localhost:27017/
MONGO_DATABASE=bitz
```

Then install dependencies:

```bash
pip install -r BITZ/server/requirements.txt
```

## 4) Dry-Run the Migration

Use the provided script to validate all `history.json` files without writing to MongoDB:

```bash
cd BITZ/server
python migrate_to_mongodb.py --dry-run
```

You should see a summary of files found and whether validation passed.

## 5) Run the Migration

When the dry-run looks good, perform the actual migration:

```bash
python migrate_to_mongodb.py
```

Options:
- Skip conversations that already exist:
  ```bash
  python migrate_to_mongodb.py --skip-existing
  ```
- Migrate from a custom history path:
  ```bash
  python migrate_to_mongodb.py --history-dir /absolute/path/to/history
  ```

## 6) Verify the Migration (Optional but Recommended)

Verify that MongoDB data matches the original JSON files:

```bash
python migrate_to_mongodb.py --verify
```

This will compare key fields (`conversation_id`, `flavor`, `timestamp`, `user_id`, `coordinates`, `location`, `history`) between MongoDB and the files.

## 7) Bring Up Full Stack (Docker)

If you use Docker Compose for everything:

```bash
docker compose up -d
```

The server will read conversation data from MongoDB. CSV files and images continue to be served from the filesystem (`history/data/*` for CSV, `history/images/*` for images).

## 8) Post-Migration Checks

- Test the following endpoints/workflows:
  - Image analysis (`/analyze`)
  - Loading history (`/load`)
  - `quest_info` API
  - Map and recap pages (they still serve CSV and images from `history/`)
- Confirm that `/explore/.../history.json` requests now return MongoDB-backed data.

## 9) Rollback Plan

If anything goes wrong:
- Stop the stack: `docker compose down`
- Restore your backup:
  ```bash
  rm -rf history
  mv history_backup_YYYYMMDD_HHMMSS history
  ```
- You can also clear the `conversations` collection if needed.

## Troubleshooting

- Connection errors:
  - Ensure MongoDB is healthy: `docker compose ps` and check the `mongodb` healthcheck
  - Verify `MONGO_URI` and `MONGO_DATABASE` in environment
- Missing conversation after migration:
  - Re-run with `--verify` to see mismatches
  - Inspect `history/data/<conversation_id>/history.json` for malformed content
- Permissions:
  - Ensure the app container has read access to `history/` mount for CSV/images

## What Moves vs. What Stays

- Moves to MongoDB:
  - Conversation metadata (`flavor`, `timestamp`, `user_id`, `coordinates`, `location`)
  - Entire `history` array
- Stays on filesystem:
  - CSV files (`history/data/<id>/species_data_*.csv`)
  - Images (`history/images/<id>/*`)

You’re done—your application now uses MongoDB for conversation storage with existing CSVs and images unchanged.

