#!/bin/bash
# Opens History of Music 2050 with its built-in YouTube player and Radio 2050.
# YouTube only plays inside a page served over http, so this starts a small local server.
cd "$(dirname "$0")" || exit 1
PORT=8765
if ! /usr/sbin/lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  /usr/bin/python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
  SERVER=$!
  sleep 1
fi
open "http://localhost:$PORT/index.html"
echo "History of Music 2050 is open at http://localhost:$PORT/index.html"
echo "Keep this window open while you listen; close it or press Ctrl+C to stop."
[ -n "$SERVER" ] && wait "$SERVER"
