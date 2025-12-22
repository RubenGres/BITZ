# BITZ - Biodiversity In Transition Zones

A compact web app for collecting and exploring image-based “quests” and species identifications.  
This repository contains a Next.js **frontend** (client) and a Flask **backend** (server) that work together to ingest, analyze and visualize images and metadata.

<center>
    <img src="images/bitz_logo.jpg" style="max-width:500px"/>
</center>


## Table of Contents ✅

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development](#local-development)
  - [Client (Next.js)](#client-nextjs)
  - [Server (Flask)](#server-flask)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Image ingestion and processing (resizing, caching)
- Automated species analysis via models and prompt templates
- Interactive explorer and visualizations (maps, graphs, 3D views)
- Simple history storage for quests with CSV exports

---

## Architecture 🔧

- /BITZ/client — Next.js application (UI, maps, visualizations)
- /BITZ/server — Flask API and image-processing utilities
- Docker Compose files at repository root and inside subfolders for service orchestration
- Static assets and visualization code under `/BITZ/server/static`

---

## Quick Start (Docker) 🐳

1. Copy or create a `.env` file at the repo root with required variables (see below).
2. Build and run the stack:

```bash
# from repo root
docker compose up --build
```

3. Visit http://localhost (or configured domain) to reach the frontend (Nginx reverse-proxy) which forwards API calls to the Flask server.

> The root `docker-compose.yml` defines services: `nginx`, `bitz-frontend`, `bitz-server`.

---

## Local Development

### Client (Next.js)

1. Install dependencies:

```bash
cd BITZ/client
npm install
# or pnpm install / yarn
```

2. Start development server:

```bash
npm run dev
```

3. Open http://localhost:3000

Notes: the client uses `next` and modern toolchain; see `BITZ/client/package.json` for scripts.

### Server (Flask)

1. Create a virtual environment and install requirements:

```bash
cd BITZ/server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Add a `.env` file (see Environment Variables below) and start the server:

```bash
python app.py
# or use gunicorn for production
```

The server exposes endpoints used by the client and serves static visualizations from `/static/viz`.

---

## Environment Variables ⚙️

Create a `.env` file with at least the following variables (values are examples):

```env
OPENAI_API_KEY=sk_...
DELETE_PASSWORD=changeme
API_DOMAIN=example.com
HISTORY_PATH=/absolute/path/to/history
```

- `OPENAI_API_KEY` — used by analysis modules
- `DELETE_PASSWORD` — simple safety for delete operations
- `API_DOMAIN` — used by Docker build args for production URLs
- `HISTORY_PATH` — path mounted into the server for quest history

---

## Deployment

- Use the included `docker-compose.yml` for a simple, containerized deployment behind Nginx.
- Make sure TLS certs and `default.conf.template` are configured for production.

---

## Contributing 🤝

- Fork and open a Pull Request with a clear description of changes.
- Add tests or clarify manual test steps where appropriate.
- Update this README or other docs when you add features that change behavior.

---

## License

No license file found in the repository. Add a `LICENSE` file if you want to make terms explicit.

---

If you want, I can also:
- Add a short `CONTRIBUTING.md` or `LICENSE` file
- Expand setup instructions for cloud providers or CI

---

© OAAK-GroundTruth
