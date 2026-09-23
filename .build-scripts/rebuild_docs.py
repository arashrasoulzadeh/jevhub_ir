#!/usr/bin/env python3
"""Idempotent regenerator for docs/*.html.

Reads the CURRENT docs/<slug>.html files (source of truth for content),
extracts: sidebar groups/order, per-section title/desc/source-url/body,
then re-renders every page from a shared template. Safe to re-run any
number of times — each run's output becomes the next run's input.
"""
import re
import json
import html as htmlmod
from pathlib import Path

ROOT = Path("/Users/arashrasoulzadeh/Documents/projects/jevhub_ir")
OUT = ROOT / "docs"
SITE_URL = "https://meetarash.ir/jevhub_ir"  # پیش از دیپلوی جایگزین کنید

GA_SNIPPET = '''  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-QV7SENV5V1"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-QV7SENV5V1');
  </script>'''

DOCS_UPDATED = re.search(r'docsUpdated:\s*"([^"]+)"', (ROOT / "assets/js/config.js").read_text(encoding="utf-8")).group(1)

# ---- 1. sidebar groups from any existing page (all identical) -------------
any_page = (OUT / "score.html").read_text(encoding="utf-8")
sidebar_html = re.search(r'<aside class="sidebar".*?</aside>', any_page, re.S).group(0)
groups = []
for gm in re.finditer(r'<div class="side-group"><h6>(.*?)</h6>(.*?)</div>', sidebar_html, re.S):
    title, body = gm.group(1).strip(), gm.group(2)
    items = re.findall(r'<a href="[a-z0-9-]+\.html" data-slug="([a-z0-9-]+)"[^>]*>(.*?)</a>', body, re.S)
    groups.append((title, items))

manifest = [item for _, items in groups for item in items]
slug_group = {slug: g for g, items in groups for slug, _ in items}
order = [slug for slug, _ in manifest]

# ---- 2. per-page title/desc/source/body from each existing page -----------
sections = {}
for slug in order:
    page = (OUT / f"{slug}.html").read_text(encoding="utf-8")
    hero = re.search(
        r'<h1[^>]*>(.*?)</h1>\s*<p>(.*?)</p>\s*<div class="meta-row">.*?'
        r'<a class="src-link" href="([^"]+)"[^>]*>منبع انگلیسی',
        page, re.S,
    )
    title_html, desc_html, source_url = hero.group(1).strip(), hero.group(2).strip(), hero.group(3)
    sec = re.search(
        rf'<section class="doc-section" id="{re.escape(slug)}">\n?(.*?)</section>', page, re.S
    )
    sections[slug] = {
        "title_html": title_html,
        "desc_html": desc_html,
        "source_url": source_url,
        "body": sec.group(1).strip("\n"),
    }

def strip_tags(s: str) -> str:
    return htmlmod.unescape(re.sub(r"<[^>]+>", "", s)).strip()

def plain_title(title_html: str) -> str:
    """Title text for <title>/meta: drop the little badge span (e.g. the
    `choice` pill next to "Choice") so it isn't duplicated as "Choice choice"."""
    no_badge = re.sub(r"<span[^>]*>.*?</span>", "", title_html, flags=re.S)
    return strip_tags(no_badge)

# ---- 3. shared shell pieces -------------------------------------------------
HEAD_LINKS = '''  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/css/style.css">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23a78bfa'/%3E%3Cstop offset='1' stop-color='%2322d3ee'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='16' fill='url(%23g)'/%3E%3Ctext x='32' y='42' font-family='monospace' font-size='26' font-weight='800' text-anchor='middle' fill='white'%3EJ1%3C/text%3E%3C/svg%3E">'''

def header() -> str:
    return '''  <header class="site-header">
    <div class="container" style="width:min(1360px,100% - 32px)">
      <a class="brand" href="../index.html">
        <span class="brand-mark">J1</span>
        <span>جِو هاب<small>مستندات فارسی Jev</small></span>
      </a>
      <nav class="nav">
        <a href="../index.html" data-page="home">خانه</a>
        <a href="index.html" data-page="docs" class="active">مستندات</a>
        <a href="quickstart.html">شروع سریع</a>
        <a href="api.html">مرجع API</a>
        <a href="../examples.html" data-page="examples">مثال‌ها</a>
      </nav>
      <button class="icon-btn menu-btn" aria-label="منو"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
      <button class="icon-btn theme-toggle" aria-label="تغییر تم">
        <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
        <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button>
    </div>
  </header>'''

def sidebar(active_slug: str) -> str:
    out = ['    <aside class="sidebar" aria-label="فهرست مستندات">',
           '      <label class="side-search">',
           '        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
           '        <input type="search" placeholder="جست‌وجو در مستندات…" aria-label="جست‌وجو">',
           '      </label>']
    for title, items in groups:
        out.append(f'      <div class="side-group"><h6>{title}</h6>')
        for slug, label in items:
            cls = ' class="active"' if slug == active_slug else ''
            out.append(f'        <a href="{slug}.html" data-slug="{slug}"{cls}>{label}</a>')
        out.append('      </div>')
    out.append('    </aside>')
    return "\n".join(out)

def footer() -> str:
    return '''  <footer class="site-footer">
    <div class="container">
      <div>
        <a class="brand" href="../index.html"><span class="brand-mark">J1</span><span>جِو هاب</span></a>
        <p style="margin-top:12px">ترجمه و بازنویسی فارسی و غیررسمی مستندات Jev. محتوا بر اساس <a href="https://docs.typesafe.ai" target="_blank" rel="noopener">مستندات رسمی TypeSafe</a> تهیه شده و در صورت اختلاف، نسخه‌ی رسمی انگلیسی معتبر است.</p>
        <span class="update-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>آخرین به‌روزرسانی: <b data-date="docsUpdated"></b></span>
      </div>
      <div>
        <h5>مستندات</h5>
        <ul>
          <li><a href="intro.html">معرفی</a></li>
          <li><a href="quickstart.html">شروع سریع</a></li>
          <li><a href="primitives.html">پرسش‌ها</a></li>
          <li><a href="patterns.html">الگوها</a></li>
          <li><a href="api.html">مرجع API</a></li>
        </ul>
      </div>
      <div>
        <h5>منابع رسمی</h5>
        <ul>
          <li><a href="https://docs.typesafe.ai" target="_blank" rel="noopener">docs.typesafe.ai</a></li>
          <li><a href="https://console.typesafe.ai/playground" target="_blank" rel="noopener">Playground</a></li>
          <li><a href="../examples.html">مثال‌ها</a></li>
        </ul>
      </div>
      <div class="footer-bottom">
        <span>نسخه‌ی مدل مستندشده: <code data-cfg="model">jev-1.13.0</code></span>
        <span>بر اساس مستندات رسمی بازبینی‌شده در <b data-date="sourceReviewed"></b></span>
        <span>ساخته‌شده با Claude · به دستور <a href="https://github.com/arashrasoulzadeh" target="_blank" rel="noopener">آرش رسول‌زاده</a> · <a href="https://github.com/arashrasoulzadeh/jevhub_ir" target="_blank" rel="noopener">کد منبع در GitHub</a></span>
      </div>
    </div>
  </footer>'''

def pager(i: int) -> str:
    parts = ['  <div class="pager">']
    if i > 0:
        pslug, plabel = manifest[i - 1]
        parts.append(f'    <a href="{pslug}.html"><small>قبلی</small>{plabel}</a>')
    else:
        parts.append('    <a href="../index.html"><small>قبلی</small>صفحه‌ی اصلی</a>')
    if i < len(manifest) - 1:
        nslug, nlabel = manifest[i + 1]
        parts.append(f'    <a href="{nslug}.html" style="text-align:left"><small>بعدی</small>{nlabel}</a>')
    else:
        parts.append('    <a href="../examples.html" style="text-align:left"><small>بعدی</small>مثال‌ها</a>')
    parts.append('  </div>')
    return "\n".join(parts)

PAGE = '''<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
{ga}
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} | مستندات Jev | جِو هاب</title>
  <meta name="description" content="{desc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{url}">
  <meta name="theme-color" content="#07080f">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="جِو هاب">
  <meta property="og:locale" content="fa_IR">
  <meta property="og:title" content="{title} | مستندات Jev">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="{title} | مستندات Jev">
  <meta name="twitter:description" content="{desc}">
{head_links}
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": {title_json},
    "description": {desc_json},
    "inLanguage": "fa",
    "dateModified": "{updated}",
    "author": {{"@type": "Organization", "name": "جِو هاب"}},
    "publisher": {{"@type": "Organization", "name": "جِو هاب"}},
    "mainEntityOfPage": "{url}",
    "breadcrumb": {{
      "@type": "BreadcrumbList",
      "itemListElement": [
        {{"@type": "ListItem", "position": 1, "name": "خانه", "item": "{site}/index.html"}},
        {{"@type": "ListItem", "position": 2, "name": "مستندات", "item": "{site}/docs/index.html"}},
        {{"@type": "ListItem", "position": 3, "name": {title_json}, "item": "{url}"}}
      ]
    }}
  }}
  </script>
</head>
<body data-page="docs" data-doc-slug="{slug}">
  <div class="progress"></div>

{header}

  <div class="scrim"></div>

  <div class="docs-layout">
{sidebar}

    <main class="doc">
      <div class="doc-hero reveal">
        <span class="eyebrow"><span class="dot"></span> {group} › مستندات Jev</span>
        <h1 style="margin-top:14px">{title_html}</h1>
        <p>{desc_html}</p>
        <div class="meta-row">
          <span class="update-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>آخرین به‌روزرسانی: <b data-date="docsUpdated"></b></span>
          <span class="src-link">مدل: <code data-cfg="model">jev-1.13.0</code></span>
          <span class="src-link">منبع بازبینی‌شده در <b data-date="sourceReviewed"></b></span>
          <a class="src-link" href="{source_url}" target="_blank" rel="noopener">منبع انگلیسی <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>
        </div>
      </div>

      <section class="doc-section" id="{slug}">
{body}
      </section>

{pager}
    </main>

    <aside class="toc">
      <h6>در این صفحه</h6>
      <div class="toc-list"></div>
      <div class="update-box">
        <span style="color:var(--muted)">آخرین به‌روزرسانی</span>
        <b data-date="docsUpdated"></b>
        <span style="color:var(--muted)">منبع رسمی بازبینی‌شده در</span>
        <b data-date="sourceReviewed"></b>
      </div>
    </aside>
  </div>

  <button class="btn btn-primary docs-toggle" type="button">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h10M4 18h16"/></svg> فهرست
  </button>

{footer}

  <script src="../assets/js/config.js"></script>
  <script src="../assets/js/main.js"></script>
</body>
</html>
'''

for i, slug in enumerate(order):
    sec = sections[slug]
    title_text = plain_title(sec["title_html"])
    desc_text = strip_tags(sec["desc_html"])
    page = PAGE.format(
        title=title_text,
        desc=desc_text.replace('"', "&quot;"),
        ga=GA_SNIPPET,
        url=f"{SITE_URL}/docs/{slug}.html",
        title_json=json.dumps(title_text, ensure_ascii=False),
        desc_json=json.dumps(desc_text, ensure_ascii=False),
        updated=DOCS_UPDATED,
        site=SITE_URL,
        head_links=HEAD_LINKS,
        slug=slug,
        header=header(),
        sidebar=sidebar(slug),
        group=slug_group[slug],
        title_html=sec["title_html"],
        desc_html=sec["desc_html"],
        source_url=sec["source_url"],
        body=sec["body"],
        pager=pager(i),
        footer=footer(),
    )
    (OUT / f"{slug}.html").write_text(page, encoding="utf-8")
    print("wrote", slug)

print(f"\n{len(order)} pages rebuilt in {OUT}")
