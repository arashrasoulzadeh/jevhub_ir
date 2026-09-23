#!/usr/bin/env python3
"""Generates docs/index.html — the hub page linking to every split doc page.
Reads groups/descriptions from the already-built docs/*.html pages (run
rebuild_docs.py first if those are stale)."""
import re
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from env import SITE_URL, GA_MEASUREMENT_ID  # از .env در ریشه‌ی پروژه خوانده می‌شود

ROOT = Path("/Users/arashrasoulzadeh/Documents/projects/jevhub_ir")
OUT = ROOT / "docs"

# Google تگ را باید literal، بلافاصله بعد از <head> پیدا کند (ابزار
# تشخیصش JS اجرا نمی‌کند) — مقدار از .env، ولی HTML خودش literal است.
GA_SNIPPET = f'''  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id={GA_MEASUREMENT_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());

    gtag('config', '{GA_MEASUREMENT_ID}');
  </script>''' if GA_MEASUREMENT_ID else ""

DOCS_UPDATED = re.search(r'docsUpdated:\s*"([^"]+)"', (ROOT / "assets/js/config.js").read_text(encoding="utf-8")).group(1)

any_page = (OUT / "score.html").read_text(encoding="utf-8")
sidebar_html = re.search(r'<aside class="sidebar".*?</aside>', any_page, re.S).group(0)
groups = []
for gm in re.finditer(r'<div class="side-group"><h6>(.*?)</h6>(.*?)</div>', sidebar_html, re.S):
    title, body = gm.group(1).strip(), gm.group(2)
    items = re.findall(r'<a href="[a-z0-9-]+\.html" data-slug="([a-z0-9-]+)"[^>]*>(.*?)</a>', body, re.S)
    groups.append((title, items))

descs = {}
for title, items in groups:
    for slug, _ in items:
        page = (OUT / f"{slug}.html").read_text(encoding="utf-8")
        m = re.search(r"<h1[^>]*>.*?</h1>\s*<p>(.*?)</p>", page, re.S)
        descs[slug] = m.group(1).strip() if m else ""

cards = []
for title, items in groups:
    cards.append(f'        <div class="section-head" style="text-align:start;margin:0 0 18px"><h2 style="font-size:1.3rem">{title}</h2></div>')
    cards.append('        <div class="mini-cards" style="margin-bottom:36px">')
    for slug, label in items:
        d = descs.get(slug, "")
        cards.append(f'          <a class="mini-card" href="{slug}.html"><h4>{label}</h4><p>{d}</p></a>')
    cards.append('        </div>')
cards_html = "\n".join(cards)

first_slug = groups[0][1][0][0]
url = f"{SITE_URL}/docs/index.html"
meta_desc = "فهرست کامل مستندات فارسی Jev: شروع سریع، مفاهیم System One و State، پرسش‌های Choice و Score و Noul، اطمینان، الگوها، مدل‌ها، مرجع API و SDKها — هر بخش در صفحه‌ی جداگانه‌ی خودش."

breadcrumb_items = ",\n        ".join(
    json.dumps({"@type": "ListItem", "position": i + 1, "name": t, "item": f"{SITE_URL}/docs/{items[0][0]}.html"}, ensure_ascii=False)
    for i, (t, items) in enumerate(groups)
)

PAGE = f'''<!doctype html>
<html lang="fa" dir="rtl">
<head>
{GA_SNIPPET}
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>مستندات Jev | جِو هاب</title>
  <meta name="description" content="{meta_desc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{url}">
  <meta name="theme-color" content="#07080f">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="جِو هاب">
  <meta property="og:locale" content="fa_IR">
  <meta property="og:title" content="مستندات Jev | جِو هاب">
  <meta property="og:description" content="{meta_desc}">
  <meta property="og:url" content="{url}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="مستندات Jev | جِو هاب">
  <meta name="twitter:description" content="{meta_desc}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/css/style.css">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23a78bfa'/%3E%3Cstop offset='1' stop-color='%2322d3ee'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='16' fill='url(%23g)'/%3E%3Ctext x='32' y='42' font-family='monospace' font-size='26' font-weight='800' text-anchor='middle' fill='white'%3EJ1%3C/text%3E%3C/svg%3E">
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "مستندات Jev",
    "description": {json.dumps(meta_desc, ensure_ascii=False)},
    "inLanguage": "fa",
    "dateModified": "{DOCS_UPDATED}",
    "url": "{url}",
    "isPartOf": {{"@type": "WebSite", "name": "جِو هاب", "url": "{SITE_URL}/index.html"}}
  }}
  </script>
</head>
<body data-page="docs">
  <div class="progress"></div>

  <header class="site-header">
    <div class="container">
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
  </header>

  <main>
    <section class="hero" style="padding:64px 0 20px">
      <div class="aurora"><span></span><span></span><span></span></div>
      <div class="grid-bg"></div>
      <div class="container" style="display:block;position:relative;z-index:1">
        <span class="eyebrow reveal"><span class="dot"></span> مستندات رسمی به زبان فارسی</span>
        <h1 class="reveal" style="margin-top:16px">فهرست <span class="grad-text">مستندات Jev</span></h1>
        <p class="lead reveal" style="max-width:640px">۲۶ صفحه، هر کدام مستقل و قابل لینک‌دهی: از شروع سریع تا مرجع کامل API و SDKها. هر صفحه تاریخ و نسخه‌ی مدل خودش را نشان می‌دهد.</p>
        <div class="hero-meta reveal" style="margin-top:22px">
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>به‌روزرسانی: <b data-date="docsUpdated"></b></span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>مدل: <code data-cfg="model">jev-1.13.0</code></span>
        </div>
        <div class="hero-actions reveal" style="margin-top:26px">
          <a class="btn btn-primary" href="{first_slug}.html">شروع از معرفی
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
          </a>
          <a class="btn" href="quickstart.html">شروع سریع</a>
          <a class="btn" href="api.html">مرجع API</a>
        </div>
      </div>
    </section>

    <section class="section container reveal" style="padding-top:20px">
{cards_html}
    </section>
  </main>

  <footer class="site-footer">
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
  </footer>

  <script src="../assets/js/config.js"></script>
  <script src="../assets/js/main.js"></script>
</body>
</html>
'''

(ROOT / "docs" / "index.html").write_text(PAGE, encoding="utf-8")
print("wrote docs/index.html")
