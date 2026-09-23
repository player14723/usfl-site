#!/bin/bash
# Encode one master video into the four web files the site uses, plus posters.
#
#   bash media-src/encode-web.sh media-src/out/plunge_master.mp4 usfl-hero
#
# → public/videos/<name>.mp4 / .webm (1600 wide), <name>-mobile.mp4 / .webm (720 wide),
#   public/videos/posters/<name>.jpg (first frame) and <name>-end.jpg (last frame, used when motion is off).
# Run from the project root. Needs ffmpeg.
set -e
IN="$1"; NAME="$2"; OUT="${3:-public/videos}"
[ -f "$IN" ] && [ -n "$NAME" ] || { echo "usage: encode-web.sh <master.mp4> <name> [out-dir]"; exit 1; }
mkdir -p "$OUT/posters"
ffmpeg -y -loglevel error -i "$IN" -an -vf "scale=1600:-2:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 23 -profile:v high -movflags +faststart "$OUT/$NAME.mp4"
ffmpeg -y -loglevel error -i "$IN" -an -vf "scale=1600:-2:flags=lanczos,format=yuv420p" -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 "$OUT/$NAME.webm"
ffmpeg -y -loglevel error -i "$IN" -an -vf "scale=720:-2:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 26 -profile:v main -movflags +faststart "$OUT/$NAME-mobile.mp4"
ffmpeg -y -loglevel error -i "$IN" -an -vf "scale=720:-2:flags=lanczos,format=yuv420p" -c:v libvpx-vp9 -b:v 0 -crf 37 -row-mt 1 "$OUT/$NAME-mobile.webm"
ffmpeg -y -loglevel error -i "$IN" -vf "scale=1600:-2:flags=lanczos" -frames:v 1 -q:v 3 "$OUT/posters/$NAME.jpg"
ffmpeg -y -loglevel error -sseof -0.1 -i "$IN" -vf "scale=1600:-2:flags=lanczos" -frames:v 1 -update 1 -q:v 3 "$OUT/posters/$NAME-end.jpg"
ls -la "$OUT/$NAME"* "$OUT/posters/$NAME"*
