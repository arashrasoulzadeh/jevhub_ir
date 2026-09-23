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
# Exact old-domain -> new-domain string swap per file, not a generic regex:
# a regex matching "<anything>/<page>.html" is too easy to get wrong when
# the path itself contains a directory (docs/index.html) — it did, once.
def patch(path: Path, own_page: str):
    html = path.read_text(encoding="utf-8")
    # domain + exactly one path segment (own_page) — won't touch a URL that
    # has extra segments before it, e.g. .../docs/index.html when patching
    # plain index.html.
    new = re.sub(
        r'https://[^/\s"\']+/' + re.escape(own_page) + r'(?=["\'\s])',
        f"{SITE_URL}/{own_page}",
        html,
    )
    if new != html:
        path.write_text(new, encoding="utf-8")
        print("patched", path.relative_to(ROOT))

patch(ROOT / "index.html", "index.html")
patch(ROOT / "examples.html", "examples.html")
patch(ROOT / "docs.html", "docs/index.html")
