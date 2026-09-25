#!/usr/bin/env python3
"""Regenerates sitemap.xml and robots.txt from .env's SITE_URL, and patches
the canonical/og:url URLs *and* the literal Google Analytics tag baked into
index.html, examples.html and the docs.html redirect (those three files
aren't otherwise generated). GA is inlined here, not injected at runtime,
because Google's own tag-detector reads raw HTML and never executes JS —
it must see the literal <script> immediately after <head>."""
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from env import SITE_URL, GA_MEASUREMENT_ID

GA_SNIPPET = f'''  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id={GA_MEASUREMENT_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());

    gtag('config', '{GA_MEASUREMENT_ID}');
  </script>''' if GA_MEASUREMENT_ID else ""

ROOT = Path("/Users/arashrasoulzadeh/Documents/projects/jevhub_ir")

# ---- sitemap.xml ------------------------------------------------------
pages = ["index.html", "examples.html", "playground.html", "articles.html"]
for f in sorted(os.listdir(ROOT / "docs")):
    if f.endswith(".html"):
        pages.append("docs/" + f)
for f in sorted(os.listdir(ROOT / "articles")):
    if f.endswith(".html"):
        pages.append("articles/" + f)

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
# The GA block has TWO <script> tags (the async loader, then the inline
# dataLayer/gtag calls). A naive non-greedy `.*?</script>` stops at the
# FIRST </script> (end of the loader tag alone), leaving the second script
# unmatched — so re-running this ended up duplicating the block instead of
# replacing it. Anchor on the literal last line (`gtag('config', ...)`) so
# the match always spans both script tags. (First attempt used a nested
# `(?:.*\n)*?` quantifier here — with DOTALL that's catastrophic
# backtracking, a single `.*?` already matches newlines and doesn't blow up.)
GA_BLOCK_RE = re.compile(
    r"  <!-- Google tag \(gtag\.js\) -->\n"
    r'  <script async src="[^"]*"></script>\n'
    r"  <script>.*?gtag\('config', '[^']*'\);\n  </script>\n",
    re.S,
)

def patch(path: Path, own_page: str, with_ga: bool = False):
    html = path.read_text(encoding="utf-8")
    new_url = f"{SITE_URL}/{own_page}"
    new = html
    new = re.sub(r'(<link rel="canonical" href=")[^"]*(")', rf"\g<1>{new_url}\g<2>", new)
    new = re.sub(r'(<meta property="og:url" content=")[^"]*(")', rf"\g<1>{new_url}\g<2>", new)
    # JSON-LD WebSite "url" field (only index.html has this one)
    new = re.sub(r'("url":\s*")https://[^"]*/' + re.escape(own_page) + r'(")', rf"\g<1>{new_url}\g<2>", new)

    if with_ga and GA_SNIPPET:
        if GA_BLOCK_RE.search(new):
            new = GA_BLOCK_RE.sub(GA_SNIPPET + "\n", new)
        else:
            # not present yet — insert immediately after <head>, as Google requires
            new = new.replace("<head>\n", "<head>\n" + GA_SNIPPET + "\n", 1)

    if new != html:
        path.write_text(new, encoding="utf-8")
        print("patched", path.relative_to(ROOT))
    else:
        print("no change needed:", path.relative_to(ROOT))

patch(ROOT / "index.html", "index.html", with_ga=True)
patch(ROOT / "examples.html", "examples.html", with_ga=True)
patch(ROOT / "playground.html", "playground.html", with_ga=True)
patch(ROOT / "articles.html", "articles.html", with_ga=True)
for f in sorted(os.listdir(ROOT / "articles")):
    if f.endswith(".html"):
        patch(ROOT / "articles" / f, f"articles/{f}", with_ga=True)
patch(ROOT / "docs.html", "docs/index.html")

# ---- cache-bust every page's assets/css|js references --------------------
# Runs last, every time, so any earlier script in the chain (this one or
# rebuild_docs.py) that rewrote a <link>/<script> tag back to its plain,
# unversioned form still ends up with a fresh ?v=<hash> before deploy.
import cache_bust  # noqa: E402  (local sibling script)
cache_bust.main()
