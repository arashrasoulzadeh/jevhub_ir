# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static site (plain HTML/CSS/JS, no framework, no npm/build step) — an **unofficial** Persian
translation/rewrite of the docs for "Jev" (a fictional model by "TypeSafe"). Keep that framing in
any new content: this is not the official docs, and every hand-written page should make that clear
(see the "این صفحه بخشی از مستندات رسمی TypeSafe نیست" pattern in `docs/faq.html` /
`docs/similar-models.html`) and link back to the real source where relevant.

## Commands

There is no test suite, linter, or package manager — nothing to `npm install` or `pip install -r`.

```bash
# Local dev server (NOT `python3 -m http.server` — that one heuristically caches
# assets/js/*.js across reloads and has caused real confusion before)
python3 dev-server.py                      # → http://localhost:8765

# Docker (production-shaped: nginx serving prebuilt static files + the von model service)
docker compose up -d --build               # reads APP_PORT from .env

# Build pipeline (all idempotent — safe to rerun). Run in this order, gen_sitemap.py LAST:
python3 .build-scripts/rebuild_docs.py     # regenerate docs/*.html shell (nav/sidebar/footer/SEO)
python3 .build-scripts/gen_docs_index.py   # regenerate docs/index.html hub from docs/*.html
python3 .build-scripts/gen_sitemap.py      # sitemap.xml, robots.txt, GA/canonical patch, THEN cache-bust
```

`gen_sitemap.py` calls `cache_bust.py` at the end automatically — running `rebuild_docs.py` or
`gen_docs_index.py` afterwards will strip the `?v=<hash>` query strings it just added, so
`gen_sitemap.py` must be the last script run before a deploy.

## Architecture: source of truth and the generator scripts

Every `docs/<slug>.html` page is **self-contained and hand-editable** — its own
`<title>`, meta/OG/Twitter tags, JSON-LD, H1, and body content live directly in that file. There is
no template file and no CMS. `.build-scripts/rebuild_docs.py` re-derives the shared shell (sidebar,
top nav, header/footer, pager, GA snippet) from a `docs/*.html` file (`score.html`) and re-renders
every non-hand-maintained page, but it reads each page's own content/title/description straight back
out of that same page first — so editing a page's body directly is always the correct move; you only
need to run the script when you change the *shared shell* (e.g. add a top-nav link or sidebar entry).

- **Editing page content** → edit `docs/<slug>.html` directly, nothing else needed.
- **Editing the shared shell** (nav, sidebar, footer) → edit it in `.build-scripts/rebuild_docs.py`
  (and see "duplicated nav" below), then rerun the pipeline.
- **HAND_MAINTAINED set** (`rebuild_docs.py`, currently `{"similar-models", "faq"}`): pages with a
  layout too different from the standard translated-doc template (custom hero fields, accordions
  instead of a `منبع انگلیسی` link). They stay in the sidebar/pager ordering but are skipped by the
  regenerator — edit them by hand, including their own copy of the sidebar/nav.
- **Root-level pages** (`index.html`, `examples.html`, `playground.html`, `docs.html`) are *also*
  hand-maintained; no script regenerates them except `gen_sitemap.py`'s narrow canonical/OG-URL/GA
  patch pass.

## Known duplication traps

- **The top nav `<a>` list is duplicated in 7 places**: `rebuild_docs.py`'s `header()`,
  `gen_docs_index.py`'s own copy, and the hand-maintained `index.html`, `examples.html`,
  `playground.html`, `docs/similar-models.html`, `docs/faq.html`. Adding/renaming a nav link means
  editing all of these, or the site ends up with an inconsistent nav (this has already happened once
  — `docs/index.html`'s nav is currently missing the Playground/FAQ links because `gen_docs_index.py`
  wasn't updated when they were added elsewhere).
- **`Dockerfile` copies root HTML files by explicit name** (`COPY index.html examples.html
  playground.html docs.html ...`). A new root-level page must be added to that `COPY` line manually
  or it 404s in production while working fine in local dev (`dev-server.py` just serves the whole
  directory, so this class of bug is invisible until you actually deploy).
- **Two unrelated nginx configs**: `docker/nginx.conf` (baked into the app image — static file
  serving, cache headers, the `/api/von/` proxy) vs `docker/reverse-proxy.jevhub.ir.conf` (for the
  **host's own** system nginx in front of the container; not part of the Docker image at all).
- **Google Analytics tag must be literal HTML immediately after `<head>`** in every page — Google's
  tag-detector reads raw HTML and never executes JS, so it can't be runtime-injected. The
  measurement ID comes from `.env` (`GA_MEASUREMENT_ID`), but the generator scripts bake the literal
  `<script>` tag into each page at generation time; don't try to centralize it at runtime.
- **`rebuild_docs.py` is not perfectly idempotent**: each run can append one more blank line inside
  the `<section class="doc-section">` body slot of every page it touches (harmless visually, but it
  means "just rerun it to check" leaves a diff even with zero real content changes). Don't run it
  speculatively; only run it when you've actually changed the shared shell, and review the diff
  before committing.
- **Cache-busting**: `.build-scripts/cache_bust.py` appends `?v=<md5-of-file-content>` to every
  `assets/css|js` reference across all pages, because nginx caches `.css`/`.js` for an hour but
  `.html` for only 5 minutes — without this, a deploy can serve new HTML against a stale cached
  CSS/JS for up to an hour. It's idempotent and safe to rerun; `gen_sitemap.py` always runs it last.

## Docker services (`docker-compose.yml`)

- **`jevhub`** — nginx serving the prebuilt static site. Only bound to `127.0.0.1:${APP_PORT}`
  (default `8088`); the host's own system nginx is expected to reverse-proxy to it (see README for
  the `docker/reverse-proxy.jevhub.ir.conf` setup).
- **`von`** — runs `von serve` from the `von-sdk` PyPI package (Von: the open-source,
  `/v1/systemone`-compatible System One model documented in `docs/similar-models.html`), backing
  `playground.html`. **No `ports:`** — unreachable except from inside the compose network. Model
  weights (~1.5GB) are cached in the `von-hf-cache` volume and only download on first boot.
- **`gate`** (`docker/gate/`) — a small FastAPI service that sits between nginx and `von`; also
  **no `ports:`**. `jevhub`'s nginx proxies `/api/von/` → `gate:8000/` (Origin must exactly match
  `$scheme://$http_host`, no exceptions — POST fetches always carry Origin, so this alone blocks
  Postman/curl/other origins, which don't send one by default). `gate` then: (1) in-memory sliding-
  window rate-limits by IP (`RATE_LIMIT`/`RATE_WINDOW_S` constants in `app.py`, no Redis — resets on
  container restart, which is fine at this scale), (2) on `POST /systemone`, proxies through to
  `von:8000/v1/systemone` if under the limit, else returns `429` with `captcha_required` when
  `TURNSTILE_SECRET_KEY` is set, (3) `POST /verify-captcha` validates a Cloudflare Turnstile token
  server-side and, on success, exempts that IP from the counter for `VERIFIED_BONUS_S`. The Turnstile
  **site key** (public) lives in `assets/js/config.js` (`turnstileSiteKey`); the **secret key**
  (private) only ever goes in `.env`/`docker-compose.yml` → `gate`'s environment, never in a served
  file. Leaving both keys empty disables the captcha UI entirely and downgrades to a plain
  "try again later" message once rate-limited — the rate limit and Origin check still apply either
  way. `assets/js/playground.js` distinguishes a `429` (real rate limit → show captcha/wait gate) from
  a network/shape failure (→ fall back to the client-side keyword heuristic), and always visibly
  labels which of the three states (Von / rate-limited / local heuristic) produced the current answer
  — never silently pass the heuristic off as a real model response.

## Content conventions

- `assets/js/config.js` is the single source for `docsUpdated`, `sourceReviewed`, `model` (current
  Jev version string), and `similarModelsUpdated` — dates/versions are never hardcoded in a page;
  `data-date="<key>"` / `data-cfg="<key>"` attributes plus `main.js` fill them in (and convert dates
  to Persian calendar/digits).
- Internal doc-to-doc links are `href="slug.html"` or `href="slug.html#heading-id"` (each doc page is
  a separate file), never a bare `#slug` fragment.
- `assets/js/examples-data.js` examples support an optional `en: {...}` sibling object (title,
  summary, tags, scenario, steps, notes, responseNote) for the FA/English toggle on
  `examples.html`; the code samples themselves are not translated, only prose.
