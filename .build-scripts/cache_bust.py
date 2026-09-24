#!/usr/bin/env python3
"""Appends a content-hash query string (?v=<hash8>) to every local
assets/css/*.css and assets/js/*.js reference in every HTML page.

Why: nginx caches .css/.js for an hour (docker/nginx.conf), but .html only
for 5 minutes. Right after a deploy, a browser/proxy can serve the NEW html
with the OLD cached css/js for up to an hour. Since the asset's own URL
changes whenever its content changes, the browser has no choice but to
fetch the new file — no more manual hard-refreshing after every deploy.

Idempotent: strips any existing ?v=... first, so re-running (or running
after rebuild_docs.py / gen_sitemap.py touch a file) always converges to
the current hash. Run this LAST in the build chain, after any script that
regenerates HTML.
"""
import hashlib
import re
from pathlib import Path

ROOT = Path("/Users/arashrasoulzadeh/Documents/projects/jevhub_ir")

ASSET_RE = re.compile(
    r'((?:href|src)=")((?:\.\./)*assets/(?:css|js)/[a-zA-Z0-9_-]+\.(?:css|js))(?:\?v=[a-f0-9]+)?(")'
)


def file_hash(rel_path: str) -> str:
    # rel_path may start with ../ segments; strip them to resolve from ROOT
    clean = re.sub(r"^(\.\./)+", "", rel_path)
    data = (ROOT / clean).read_bytes()
    return hashlib.md5(data).hexdigest()[:8]


def process(path: Path) -> bool:
    html = path.read_text(encoding="utf-8")

    def repl(m: re.Match) -> str:
        prefix, asset_path, suffix = m.group(1), m.group(2), m.group(3)
        return f"{prefix}{asset_path}?v={file_hash(asset_path)}{suffix}"

    new = ASSET_RE.sub(repl, html)
    if new != html:
        path.write_text(new, encoding="utf-8")
        return True
    return False


def main():
    pages = [ROOT / "index.html", ROOT / "examples.html", ROOT / "playground.html", ROOT / "docs.html"]
    pages += sorted((ROOT / "docs").glob("*.html"))
    changed = 0
    for p in pages:
        if p.exists() and process(p):
            changed += 1
    print(f"cache-busted {changed}/{len(pages)} pages")


if __name__ == "__main__":
    main()
