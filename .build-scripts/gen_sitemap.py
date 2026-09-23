#!/usr/bin/env python3
"""Regenerates sitemap.xml and robots.txt from .env's SITE_URL, and patches
the canonical/og:url URLs baked into index.html, examples.html and the
docs.html redirect (those three files aren't otherwise generated)."""
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from env import SITE_URL

ROOT = Path("/Users/arashrasoulzadeh/Documents/projects/jevhub_ir")

# ---- sitemap.xml ------------------------------------------------------
pages = ["index.html", "examples.html"]
for f in sorted(os.listdir(ROOT / "docs")):
    if f.endswith(".html"):
        pages.append("docs/" + f)

urls = "\n".join(f"  <url><loc>{SITE_URL}/{p}</loc></url>" for p in pages)
(ROOT / "sitemap.xml").write_text(
    f'<?xml version="1.0" encoding="UTF-8"?>\n'
    f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n',
    encoding="utf-8",
)
print(f"wrote sitemap.xml ({len(pages)} urls, {SITE_URL})")

# ---- robots.txt ---------------------------------------------------------
(ROOT / "robots.txt").write_text(
    f"User-agent: *\nAllow: /\nDisallow: /docs.html\n\nSitemap: {SITE_URL}/sitemap.xml\n",
    encoding="utf-8",
)
print("wrote robots.txt")

# ---- patch baked-in URLs in the three hand-authored files ----------------
# Don't try to guess the OLD url's shape (domain + however many path
# segments SITE_URL used to have) — that broke once already when SITE_URL
# itself gained/lost a path prefix. Instead target the known attributes
# structurally and replace their value outright, regardless of what was
# there before.
def patch(path: Path, own_page: str):
    html = path.read_text(encoding="utf-8")
    new_url = f"{SITE_URL}/{own_page}"
    new = html
    new = re.sub(r'(<link rel="canonical" href=")[^"]*(")', rf"\g<1>{new_url}\g<2>", new)
    new = re.sub(r'(<meta property="og:url" content=")[^"]*(")', rf"\g<1>{new_url}\g<2>", new)
    # JSON-LD WebSite "url" field (only index.html has this one)
    new = re.sub(r'("url":\s*")https://[^"]*/' + re.escape(own_page) + r'(")', rf"\g<1>{new_url}\g<2>", new)
    if new != html:
        path.write_text(new, encoding="utf-8")
        print("patched", path.relative_to(ROOT))
    else:
        print("no change needed:", path.relative_to(ROOT))

patch(ROOT / "index.html", "index.html")
patch(ROOT / "examples.html", "examples.html")
patch(ROOT / "docs.html", "docs/index.html")
