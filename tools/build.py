#!/usr/bin/env python3
"""
Minify CSS/JS and stamp cache-busting versions into the HTML.
Run after editing anything in assets/ or ether/:   python3 tools/build.py
Needs esbuild (npx downloads it automatically, or set ESBUILD=/path/to/esbuild).
Sources stay readable: edit style.css / main.js / ether.css / ether.js — never the .min files.
"""
import hashlib, os, re, shutil, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
ESB = os.environ.get("ESBUILD") or shutil.which("esbuild")
CMD = [ESB] if ESB else ["npx", "--yes", "esbuild@0.24"]

PAIRS = [  # source → minified
    ("assets/css/style.css", "assets/css/style.min.css"),
    ("assets/js/main.js", "assets/js/main.min.js"),
    ("ether/ether.css", "ether/ether.min.css"),
    ("ether/ether.js", "ether/ether.min.js"),
]
STAMP = {  # html file → files it references (min or plain)
    "index.html": ["assets/css/style.min.css", "assets/js/visual-assets.js", "assets/js/main.min.js"],
    "ether/index.html": ["ether/ether.min.css", "ether/ether.min.js"],
}

def h(p): return hashlib.sha1((ROOT / p).read_bytes()).hexdigest()[:10]

for src, out in PAIRS:
    loader = ["--loader=css"] if src.endswith(".css") else []
    subprocess.run(CMD + [str(ROOT / src), "--minify", "--log-level=warning", f"--outfile={ROOT / out}"]
                   + (["--target=es2017"] if src.endswith(".js") else []), check=True)
    a, b = (ROOT / src).stat().st_size, (ROOT / out).stat().st_size
    print(f"  {out:<28} {a/1024:6.1f} KB → {b/1024:6.1f} KB")

for html, refs in STAMP.items():
    p = ROOT / html; s = p.read_text(); base = Path(html).parent
    for ref in refs:
        rel = os.path.relpath(ROOT / ref, ROOT / base).replace(os.sep, "/")
        plain = re.escape(rel.replace(".min.", ".")); minr = re.escape(rel)
        pat = re.compile(r'(["\'])(?:' + minr + "|" + plain + r')(?:\?v=[0-9a-f]+)?\1')
        s, n = pat.subn(lambda m: f'{m.group(1)}{rel}?v={h(ref)}{m.group(1)}', s)
        if not n: print(f"  ! {html}: no reference to {rel}", file=sys.stderr)
    p.write_text(s)
    print(f"  stamped {html}")
