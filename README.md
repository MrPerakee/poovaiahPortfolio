# Haren's Ether — Portfolio

Static site. No build step — open `index.html` through any web server.

```
index.html                  page structure (landing + three door pages)
assets/css/style.css        all styling
assets/js/main.js           animations, router (#/work · #/hire · #/visual), gallery
assets/js/visual-assets.js  generated list of Visual Direction frames — don't hand-edit
assets/img/                 site images (portrait, logos, brand shots)
resume/                     résumé PDFs
visual/manifest.json        source of truth for the Visual Direction gallery
visual/photo|video|direction/   optimised media (+ thumbs/)
tools/visuals.py            media pipeline
netlify.toml                Netlify config (caching/headers)
```

## Adding photos and videos to Visual Direction

```bash
pip install pillow            # once; ffmpeg also needed for video (brew install ffmpeg)
python3 tools/visuals.py add ~/Desktop/food-shoot --project guntur-gourmet --type photo --meta "Food · Photography"
python3 tools/visuals.py add ~/Desktop/brand-film.mov --project guntur-gourmet --type video --title "Guntur Gourmet — Brand Film"
python3 tools/visuals.py list
```

Photos → WebP, 2400px full + 900px thumb, location data stripped.
Videos → H.264 MP4 (≤1080p, streams immediately) + poster frame.
Tall/wide grid tiles are picked from each file's shape (override with `--size`).
Edit titles/order in `visual/manifest.json` (optional `"focus": "center 70%"` sets the crop), then `python3 tools/visuals.py build`.
Projects (title, client, discipline, summary, cover) live in `visual/projects.json`; every frame names its `project`.
The Visual page shows one motion card per project; each opens at `#/visual/<project-id>`. Video tiles loop their preview clip while on screen.

Keep each video under ~95 MB (GitHub's per-file limit is 100 MB).

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
