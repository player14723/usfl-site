#!/bin/bash
# Re-renders the site's three films from their sources and encodes them into public/videos.
# Run from the project root:  bash media-src/build_videos.sh
# Only needed if you change a generator. The finished files are already in public/videos.
set -e
# 1. Hero — Image 01 brought to life (see CINEMATIC-GUIDE.md). Needs media-src/source/orbit2x.png + city2x.png (upscale.py).
python3 media-src/plunge.py
bash media-src/encode-web.sh media-src/out/plunge_master.mp4 usfl-hero
# 2. Connected-system loop and 3. case-study journey loop (procedural, illustrative).
cd media-src
python3 system.py /tmp/system_frames
python3 work.py /tmp/work_frames
cd ..
for n in system work; do
  ffmpeg -y -loglevel error -framerate 24 -i /tmp/${n}_frames/%04d.png -c:v libx264 -crf 12 -pix_fmt yuv420p media-src/out/${n}_master.mp4
  bash media-src/encode-web.sh media-src/out/${n}_master.mp4 usfl-$n
done
