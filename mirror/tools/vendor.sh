#!/usr/bin/env bash
# Download MediaPipe Tasks Vision and the two models into mirror/vendor/ so the mirror tracks hands offline.
# index.html uses vendor/ when it is served over http and the files are there, and the CDN otherwise.
set -euo pipefail
cd "$(dirname "$0")/.."
V=0.10.21
CDN="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@$V"
MODELS="https://storage.googleapis.com/mediapipe-models"
mkdir -p vendor/wasm
get() { echo "  $2"; curl -fsSL --retry 2 -o "$2" "$1"; }
echo "MediaPipe tasks-vision $V -> mirror/vendor/"
get "$CDN/vision_bundle.mjs" vendor/vision_bundle.mjs
for f in vision_wasm_internal.js vision_wasm_internal.wasm vision_wasm_nosimd_internal.js vision_wasm_nosimd_internal.wasm; do
  get "$CDN/wasm/$f" "vendor/wasm/$f"
done
get "$MODELS/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" vendor/hand_landmarker.task
get "$MODELS/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite" vendor/selfie_segmenter.tflite
du -sh vendor
echo "Done. Serve the folder: python3 -m http.server 8050 -d mirror, then open http://localhost:8050"
