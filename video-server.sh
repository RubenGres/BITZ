#!/usr/bin/env bash
# Simple static file server for video.bitz.tools
# Runs Python's built-in HTTP server on the specified port.
# Usage: ./video-server.sh [directory] [port]
#   directory: path to serve (default: ./video)

set -euo pipefail

SERVE_DIR="${1:-./video}"

if [ ! -d "$SERVE_DIR" ]; then
    echo "Creating directory: $SERVE_DIR"
    mkdir -p "$SERVE_DIR"
fi

echo "Serving $SERVE_DIR on port 8888 (video.bitz.tools)"
cd "$SERVE_DIR"
exec python3 -m http.server 8888 --bind 0.0.0.0
