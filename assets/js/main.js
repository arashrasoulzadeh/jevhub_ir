/* ==========================================================================
   JevHub — اسکریپت اصلی (تم، انیمیشن‌ها، بلوک‌های کد، ویجت‌های تعاملی)
   ========================================================================== */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Persian helpers ---------- */
  const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
  const fa = (v) => String(v).replace(/\d/g, (d) => FA_DIGITS[d]).replace(/\./g, "٫");
  const faDate = (iso) => {
    try {
      return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" })
        .format(new Date(iso + "T12:00:00"));
    } catch (e) { return iso; }
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };

  /* ---------- Theme ---------- */
  const saved = store.get("jev-theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  else document.documentElement.setAttribute("data-theme",
    window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

  function initTheme() {
    $$(".theme-toggle").forEach((b) => b.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      store.set("jev-theme", next);
    }));
  }

  /* ---------- Header / nav ---------- */
  function initNav() {
    const btn = $(".menu-btn"), nav = $(".nav");
    if (btn && nav) btn.addEventListener("click", () => nav.classList.toggle("open"));
    const page = document.body.dataset.page;
    $$(".nav a").forEach((a) => { if (a.dataset.page === page) a.classList.add("active"); });
  }

  /* ---------- Dates ---------- */
  function initDates() {
    const cfg = window.JEV_SITE || {};
    $$("[data-date]").forEach((el) => {
      const key = el.dataset.date;
      const iso = cfg[key] || key;
      el.textContent = faDate(iso);
      el.setAttribute("title", iso);
    });
    $$("[data-cfg]").forEach((el) => { if (cfg[el.dataset.cfg]) el.textContent = cfg[el.dataset.cfg]; });
    $$("[data-year]").forEach((el) => { el.textContent = fa(new Intl.DateTimeFormat("en-u-ca-persian", { year: "numeric" }).format(new Date()).replace(/\D/g, "")); });
  }

  /* ---------- Scroll progress ---------- */
  function initProgress() {
    const bar = $(".progress");
    if (!bar) return;
    const on = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      bar.style.transform = `scaleX(${p})`;
    };
    window.addEventListener("scroll", on, { passive: true });
    on();
  }

  /* ---------- Reveal on scroll ---------- */
  let revealObs;
  function initReveal(root = document) {
    const els = $$(".reveal, .reveal-scale", root);
    if (!("IntersectionObserver" in window) || reduceMotion) { els.forEach((e) => e.classList.add("in")); return; }
    revealObs = revealObs || new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revealObs.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((e) => revealObs.observe(e));
  }

  /* ---------- Card cursor glow ---------- */
  function initCardGlow() {
    document.addEventListener("pointermove", (e) => {
      const card = e.target.closest && e.target.closest(".card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* ---------- Counters ---------- */
  function initCounters() {
    const els = $$("[data-count]");
    if (!els.length) return;
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const dec = (el.dataset.count.split(".")[1] || "").length;
      const pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
      const dur = 1600, t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        el.textContent = pre + fa((target * e).toFixed(dec)) + suf;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window) || reduceMotion) { els.forEach(run); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } }), { threshold: .5 });
    els.forEach((e) => io.observe(e));
  }

  /* ==========================================================================
     Syntax highlighting (lightweight, dependency-free)
     ========================================================================== */
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const RULES = {
    python: [
      ["com", /#[^\n]*/],
      ["str", /[fFrRbB]?(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/],
      ["kw", /\b(?:from|import|as|def|return|if|elif|else|for|in|while|with|class|None|True|False|and|or|not|is|lambda|try|except|finally|raise|async|await|pass|yield)\b/],
      ["cls", /\b[A-Z][A-Za-z0-9_]*\b/],
      ["fn", /\b[a-z_][A-Za-z0-9_]*(?=\()/],
      ["num", /\b\d+(?:\.\d+)?\b/],
    ],
    ts: [
      ["com", /\/\/[^\n]*|\/\*[\s\S]*?\*\//],
      ["str", /`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/],
      ["kw", /\b(?:import|from|export|const|let|var|function|return|if|else|for|of|in|await|async|new|type|interface|null|true|false|undefined|try|catch|throw|as|switch|case|break|default)\b/],
      ["cls", /\b[A-Z][A-Za-z0-9_]*\b/],
      ["fn", /\b[a-z_$][A-Za-z0-9_$]*(?=\()/],
      ["num", /\b\d+(?:\.\d+)?\b/],
    ],
    json: [
      ["key", /"(?:\\.|[^"\\])*"(?=\s*:)/],
      ["str", /"(?:\\.|[^"\\])*"/],
      ["kw", /\b(?:true|false|null)\b/],
      ["num", /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/],
    ],
    bash: [
      ["com", /(?:^|(?<=\s))#[^\n]*/],
      ["str", /"(?:\\.|[^"\\])*"|'[^']*'/],
      ["var", /\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/],
      ["op", /(?<=\s)--?[A-Za-z][\w-]*/],
      ["fn", /(?:^|(?<=\n))\s*(?:curl|npm|pip|uv|npx|claude|export|python|node)\b/],
      ["kw", /<<'?EOF'?|\bEOF\b/],
    ],
    http: [
      ["kw", /\b(?:POST|GET|PUT|DELETE)\b/],
      ["key", /^[A-Za-z-]+(?=:)/m],
      ["str", /https?:\/\/[^\s]+/],
    ],
  };
  RULES.javascript = RULES.ts; RULES.typescript = RULES.ts; RULES.js = RULES.ts; RULES.sh = RULES.bash;
  const COMPILED = {};
  function highlight(code, lang) {
    const rules = RULES[lang];
    if (!rules) return esc(code);
    if (!COMPILED[lang]) COMPILED[lang] = new RegExp(rules.map((r) => "(" + r[1].source + ")").join("|"), "gm");
    const re = COMPILED[lang];
    re.lastIndex = 0;
    let out = "", last = 0, m;
    while ((m = re.exec(code))) {
      if (m[0] === "") { re.lastIndex++; continue; }
      out += esc(code.slice(last, m.index));
      let idx = 1;
      while (idx < m.length && m[idx] === undefined) idx++;
      const kind = rules[idx - 1] ? rules[idx - 1][0] : "";
      out += `<span class="tok-${kind}">${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    return out + esc(code.slice(last));
  }

  function dedent(src) {
    const lines = src.replace(/\t/g, "    ").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    return lines.map((l) => l.slice(isFinite(ind) ? ind : 0)).join("\n");
  }

  const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  function copyButton(getText) {
    const b = document.createElement("button");
    b.className = "copy-btn"; b.type = "button";
    b.innerHTML = ICON_COPY + "<span>کپی</span>";
    b.addEventListener("click", async () => {
      const text = getText();
      try { await navigator.clipboard.writeText(text); }
      catch (e) {
        const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e2) { /* ignore */ } ta.remove();
      }
      b.classList.add("done"); b.innerHTML = ICON_OK + "<span>کپی شد</span>";
      setTimeout(() => { b.classList.remove("done"); b.innerHTML = ICON_COPY + "<span>کپی</span>"; }, 1600);
    });
    return b;
  }

  const LANG_LABEL = { python: "Python", ts: "TypeScript", typescript: "TypeScript", javascript: "JavaScript", js: "JavaScript", json: "JSON", bash: "Shell", sh: "Shell", http: "HTTP", text: "Text" };

  /** Build a single code block. */
  function codeBlock(source, lang, title) {
    const fig = document.createElement("figure");
    fig.className = "codeblock";
    const code = dedent(source);
    const head = document.createElement("div");
    head.className = "code-head";
    head.innerHTML = `<span class="code-title">${esc(title || "")}</span><span class="code-lang">${LANG_LABEL[lang] || lang}</span>`;
    head.appendChild(copyButton(() => code));
    const pre = document.createElement("pre");
    pre.innerHTML = `<code>${highlight(code, lang)}</code>`;
    fig.append(head, pre);
    return fig;
  }

  /** Build a tabbed code group from [{label, lang, source}] */
  function codeGroup(items) {
    const fig = document.createElement("figure");
    fig.className = "codeblock";
    const head = document.createElement("div");
    head.className = "code-head";
    const tabs = document.createElement("div");
    tabs.className = "code-tabs";
    head.appendChild(tabs);
    const panels = [];
    let current = 0;
    items.forEach((it, i) => {
      const code = dedent(it.source);
      it._code = code;
      const t = document.createElement("button");
      t.type = "button"; t.className = "code-tab" + (i === 0 ? " on" : ""); t.textContent = it.label || LANG_LABEL[it.lang] || it.lang;
      const p = document.createElement("div");
      p.className = "code-panel" + (i === 0 ? " on" : "");
      p.innerHTML = `<pre><code>${highlight(code, it.lang)}</code></pre>`;
      t.addEventListener("click", () => {
        current = i;
        tabs.querySelectorAll(".code-tab").forEach((x, j) => x.classList.toggle("on", j === i));
        panels.forEach((x, j) => x.classList.toggle("on", j === i));
      });
      tabs.appendChild(t); panels.push(p);
    });
    head.appendChild(copyButton(() => items[current]._code));
    fig.appendChild(head);
    panels.forEach((p) => fig.appendChild(p));
    return fig;
  }

  function initCode(root = document) {
    $$(".code-group", root).forEach((g) => {
      const items = $$("textarea.code", g).map((t) => ({ label: t.dataset.label, lang: t.dataset.lang, source: t.value }));
      g.replaceWith(codeGroup(items));
    });
    $$("textarea.code", root).forEach((t) => t.replaceWith(codeBlock(t.value, t.dataset.lang, t.dataset.title)));
  }

  /* ---------- Prose tabs ---------- */
  function initTabs(root = document) {
    $$(".tabs", root).forEach((tabs) => {
      const btns = $$(".tabs-nav button", tabs), panels = $$(".tab-panel", tabs);
      btns.forEach((b, i) => b.addEventListener("click", () => {
        btns.forEach((x, j) => x.classList.toggle("on", i === j));
        panels.forEach((x, j) => x.classList.toggle("on", i === j));
      }));
    });
  }

  /* ==========================================================================
     Docs: scroll spy, TOC, sidebar search, mobile drawer
     ========================================================================== */
  function initDocs() {
    const sidebar = $(".sidebar");
    if (!sidebar) return;
    const links = $$(".side-group a", sidebar);
    // Multi-page docs (docs/<slug>.html): each sidebar link points at another
    // page via data-slug, and the active one is already marked server-side.
    // Single-page fallback: links are #fragments on one long page.
    const multiPage = links.some((a) => a.hasAttribute("data-slug"));
    const toc = $(".toc-list");

    function buildToc(root) {
      if (!toc) return;
      toc.innerHTML = "";
      $$("h3[id]", root).forEach((h) => {
        const a = document.createElement("a");
        a.href = "#" + h.id; a.textContent = h.textContent.replace("#", "").trim();
        toc.appendChild(a);
      });
      if (!toc.children.length) toc.innerHTML = '<span style="color:var(--muted)">—</span>';
    }

    function tocScrollSpy() {
      if (!toc) return;
      const y = window.innerHeight * 0.3;
      const hs = $$("a", toc);
      let cur = null;
      hs.forEach((a) => { const h = document.getElementById(a.getAttribute("href").slice(1)); if (h && h.getBoundingClientRect().top <= y) cur = a; });
      hs.forEach((a) => a.classList.toggle("active", a === cur));
    }

    if (multiPage) {
      // Active link is rendered server-side; just build this page's own TOC
      // and keep the sidebar scrolled to show the active item.
      buildToc(document);
      const al = links.find((a) => a.classList.contains("active"));
      if (al && window.innerWidth > 900) {
        const r = al.getBoundingClientRect(), sr = sidebar.getBoundingClientRect();
        if (r.top < sr.top + 40 || r.bottom > sr.bottom - 40) sidebar.scrollTop = al.offsetTop - sr.height / 2;
      }
      window.addEventListener("scroll", tocScrollSpy, { passive: true });
      tocScrollSpy();
    } else {
      // Legacy single-page mode: scroll-spy across all sections at once.
      const sections = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
      let active = null;
      const setActive = (id) => {
        if (active === id) return;
        active = id;
        links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
        const al = links.find((a) => a.classList.contains("active"));
        if (al && window.innerWidth > 900) {
          const r = al.getBoundingClientRect(), sr = sidebar.getBoundingClientRect();
          if (r.top < sr.top + 40 || r.bottom > sr.bottom - 40) sidebar.scrollTo({ top: al.offsetTop - sr.height / 2, behavior: "smooth" });
        }
        buildToc(document.getElementById(id));
      };
      const onScroll = () => {
        const y = window.innerHeight * 0.3;
        let cur = sections[0];
        for (const s of sections) { if (s.getBoundingClientRect().top <= y) cur = s; }
        if (cur) setActive(cur.id);
        tocScrollSpy();
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    // search — filter by link label (multi-page) or label + section text (single-page)
    const input = $(".side-search input");
    if (input) input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      $$(".side-group", sidebar).forEach((g) => {
        let any = false;
        $$("a", g).forEach((a) => {
          const sec = multiPage ? null : document.getElementById(a.getAttribute("href").slice(1));
          const hay = (a.textContent + " " + (sec ? sec.textContent : "")).toLowerCase();
          const hit = !q || hay.includes(q);
          a.classList.toggle("hidden", !hit); if (hit) any = true;
        });
        g.style.display = any ? "" : "none";
      });
    });

    // mobile
    const tog = $(".docs-toggle"), scrim = $(".scrim");
    const close = () => { sidebar.classList.remove("open"); scrim && scrim.classList.remove("show"); };
    if (tog) tog.addEventListener("click", () => { sidebar.classList.toggle("open"); scrim && scrim.classList.toggle("show"); });
    if (scrim) scrim.addEventListener("click", close);
    links.forEach((a) => a.addEventListener("click", () => { if (window.innerWidth <= 900) close(); }));

    // heading anchors
    $$(".doc-section h3[id]").forEach((h) => {
      const a = document.createElement("a"); a.className = "anchor"; a.href = "#" + h.id; a.textContent = "#";
      h.appendChild(a);
    });
  }

  /* ==========================================================================
     Interactive widgets
     ========================================================================== */
  // A normalized-entropy confidence used for *illustration only*.
  const illusConfidence = (ps) => {
    const n = ps.length; if (n < 2) return 1;
    const h = -ps.reduce((s, p) => s + (p > 0 ? p * Math.log(p) : 0), 0);
    return Math.max(0, 1 - h / Math.log(n));
  };
  const normalize = (ws) => { const s = ws.reduce((a, b) => a + b, 0) || 1; return ws.map((w) => w / s); };
  const f2 = (x) => x.toFixed(2);

  function sliderRow(label, value, onInput, max = 100) {
    const row = document.createElement("div");
    row.className = "w-row";
    row.innerHTML = `<label title="${label}">${label}</label><input type="range" min="0" max="${max}" value="${value}"><output></output>`;
    const inp = row.querySelector("input");
    inp.addEventListener("input", onInput);
    return { row, inp, out: row.querySelector("output") };
  }

  function widgetShell(el, title, sub) {
    el.classList.add("widget");
    el.innerHTML = `<div class="widget-head"><b>${title}</b><small>${sub || ""}</small></div><div class="widget-body"></div>`;
    return el.querySelector(".widget-body");
  }

  function presetBar(presets, apply) {
    const seg = document.createElement("div");
    seg.className = "seg";
    presets.forEach((p, i) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = p.label;
      b.style.fontFamily = "Vazirmatn, sans-serif";
      b.addEventListener("click", () => { $$("button", seg).forEach((x) => x.classList.remove("on")); b.classList.add("on"); apply(p.values); });
      if (i === 0) b.classList.add("on");
      seg.appendChild(b);
    });
    return seg;
  }

  function verdict(conf) {
    if (conf >= 0.9) return ["v-ok", "اطمینان بالا ← اقدام خودکار"];
    if (conf >= 0.5) return ["v-mid", "اطمینان متوسط ← با احتیاط (تأیید کاربر یا بازبینی)"];
    return ["v-bad", "اطمینان پایین ← اقدام نکن؛ ارجاع به انسان"];
  }

  function wConfidence(el) {
    const body = widgetShell(el, "کاوشگر اطمینان (Choice)", "توزیع احتمال را تغییر دهید");
    const opts = ["technical", "billing", "sales"];
    let w = [85, 15, 0];
    const ctr = document.createElement("div"); ctr.className = "w-controls";
    const out = document.createElement("div"); out.className = "w-out";
    out.innerHTML = `<div class="dist"></div><div class="dist-labels"></div><div class="w-big"><b>0.00</b><span>confidence</span></div><div class="w-verdict"></div>`;
    const dist = $(".dist", out), dl = $(".dist-labels", out);
    opts.forEach((o) => { dist.appendChild(document.createElement("div")); const s = document.createElement("span"); s.textContent = o; dl.appendChild(s); });
    const rows = opts.map((o, i) => sliderRow(o, w[i], (e) => { w[i] = +e.target.value; render(); }));
    ctr.append(presetBar([
      { label: "نمونه‌ی شروع سریع", values: [85, 15, 0] },
      { label: "یک برنده‌ی قطعی", values: [100, 0, 0] },
      { label: "دو گزینه نزدیک", values: [61, 35, 4] },
      { label: "کاملاً یکنواخت", values: [34, 33, 33] },
    ], (v) => { w = v.slice(); rows.forEach((r, i) => (r.inp.value = w[i])); render(); }));
    rows.forEach((r) => ctr.appendChild(r.row));
    body.append(ctr, out);
    const note = document.createElement("p"); note.className = "w-note";
    note.textContent = "برای نمایش، اطمینان در این ابزار با «آنتروپی نرمال‌شده» حساب می‌شود؛ فرمول دقیق TypeSafe ممکن است متفاوت باشد. همیشه مقدار confidence برگشتی از API را مبنا قرار دهید.";
    body.appendChild(note);
    function render() {
      const p = normalize(w);
      const c = illusConfidence(p);
      const mx = Math.max(...p);
      $$("div", dist).forEach((d, i) => { d.style.height = Math.max(3, p[i] * 100) + "%"; d.innerHTML = `<span>${f2(p[i])}</span>`; d.style.opacity = p[i] === mx ? 1 : .45; });
      rows.forEach((r, i) => (r.out.textContent = f2(p[i])));
      $(".w-big b", out).textContent = f2(c);
      const [cls, txt] = verdict(c);
      const v = $(".w-verdict", out); v.className = "w-verdict " + cls; v.textContent = txt;
    }
    render();
  }

  function wScore(el) {
    const body = widgetShell(el, "کاوشگر Score", "score = Σ (شماره‌ی سطح × احتمال)");
    const levels = ["0: Cosmetic", "1: Workaround exists", "2: Blocking"];
    let w = [0, 57, 43];
    const ctr = document.createElement("div"); ctr.className = "w-controls";
    const out = document.createElement("div"); out.className = "w-out";
    out.innerHTML = `<div class="w-big"><b>0.00</b><span>score (از ۰ تا ۲)</span></div>
      <div class="mini" style="margin:0"><div class="scale-line"><div class="tick" style="left:0%"><span>0</span></div><div class="tick" style="left:50%"><span>1</span></div><div class="tick" style="left:100%"><span>2</span></div><div class="marker"></div></div></div>
      <div class="w-big" style="font-size:.9rem"><b style="font-size:1.3rem" class="cf">0.00</b><span>confidence (تقریبی)</span></div>`;
    const rows = levels.map((o, i) => sliderRow(o, w[i], (e) => { w[i] = +e.target.value; render(); }));
    ctr.append(presetBar([
      { label: "ناهمترازی دکمه", values: [100, 0, 0] },
      { label: "اسپینر بی‌پایان", values: [0, 89, 11] },
      { label: "خرابی در Safari", values: [0, 57, 43] },
      { label: "خطای ۵۰۰ ورود", values: [0, 0, 100] },
    ], (v) => { w = v.slice(); rows.forEach((r, i) => (r.inp.value = w[i])); render(); }));
    rows.forEach((r) => ctr.appendChild(r.row));
    body.append(ctr, out);
    // default preset should match initial values
    $$(".seg button", ctr).forEach((b, i) => b.classList.toggle("on", i === 2));
    const note = document.createElement("p"); note.className = "w-note";
    note.textContent = "توجه: توزیع‌های متفاوت می‌توانند score یکسانی بسازند (مثلاً همه روی سطح ۱، یا نصف روی ۰ و نصف روی ۲). همیشه probabilities و confidence را کنار score بخوانید.";
    body.appendChild(note);
    function render() {
      const p = normalize(w);
      const s = p.reduce((a, b, i) => a + b * i, 0);
      rows.forEach((r, i) => (r.out.textContent = f2(p[i])));
      $(".w-big b", out).textContent = f2(s);
      $(".marker", out).style.left = (s / 2) * 100 + "%";
      $(".cf", out).textContent = f2(illusConfidence(p));
    }
    render();
  }

  function wNoul(el) {
    const body = widgetShell(el, "آستانه‌گذاری روی Noul", "پرسش: Is the customer asking for a human agent?");
    const data = [
      ["Thanks, that fixed it!", 0.02],
      ["How do I reset my password?", 0.07],
      ["I need this sorted today, whatever it takes.", 0.26],
      ["Are you a bot?", 0.40],
      ["Is there any way to speak to someone about my invoice?", 0.84],
      ["I have asked three times now. Can I please just talk to a real person?", 0.99],
    ];
    let YES = 80, NO = 20;
    const ctr = document.createElement("div"); ctr.className = "w-controls"; ctr.style.gridColumn = "1 / -1";
    const r1 = sliderRow("YES >", YES, (e) => { YES = Math.max(+e.target.value, NO + 1); e.target.value = YES; render(); });
    const r2 = sliderRow("NO <", NO, (e) => { NO = Math.min(+e.target.value, YES - 1); e.target.value = NO; render(); });
    ctr.append(r1.row, r2.row);
    const list = document.createElement("div"); list.className = "noul-list";
    data.forEach(([t, v]) => {
      const it = document.createElement("div"); it.className = "noul-item";
      it.innerHTML = `<span class="txt">${esc(t)}</span><span class="val">${v.toFixed(2)}</span><span class="route"></span>`;
      list.appendChild(it);
    });
    body.append(ctr, list);
    function render() {
      r1.out.textContent = (YES / 100).toFixed(2); r2.out.textContent = (NO / 100).toFixed(2);
      $$(".noul-item", list).forEach((it, i) => {
        const v = data[i][1] * 100, r = $(".route", it);
        if (v > YES) { r.className = "route v-ok"; r.textContent = "اپراتور انسانی"; }
        else if (v < NO) { r.className = "route v-mid"; r.textContent = "ربات"; r.style.color = "var(--accent-2)"; r.style.background = "rgba(34,211,238,.1)"; return; }
        else { r.className = "route v-bad"; r.textContent = "بازبینی انسانی"; }
        r.style.color = ""; r.style.background = "";
      });
    }
    render();
  }

  function wRouting(el) {
    const body = widgetShell(el, "شبیه‌ساز مسیریابی با آستانه‌ی اطمینان", "بانکداری صوتی");
    let choice = "approve_transfer", conf = 72;
    const ctr = document.createElement("div"); ctr.className = "w-controls";
    const seg = document.createElement("div"); seg.className = "seg";
    ["check_balance", "approve_transfer", "support"].forEach((c) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = c; if (c === choice) b.classList.add("on");
      b.addEventListener("click", () => { choice = c; $$("button", seg).forEach((x) => x.classList.toggle("on", x === b)); render(); });
      seg.appendChild(b);
    });
    const lab = document.createElement("div"); lab.style.fontSize = ".85rem"; lab.style.color = "var(--muted)"; lab.textContent = "پاسخ مدل (choice):";
    const r = sliderRow("confidence", conf, (e) => { conf = +e.target.value; render(); });
    ctr.append(lab, seg, r.row);
    const map = document.createElement("div"); map.className = "route-map";
    const routes = [
      ["human", "ارجاع به کارشناس پشتیبانی", "confidence < 0.6 یا نیت دیگر"],
      ["balance", "نمایش موجودی", "check_balance و ≥ 0.6"],
      ["confirm", "درخواست تأیید از کاربر", "approve_transfer بین 0.6 و 0.85"],
      ["approve", "تأیید خودکار انتقال", "approve_transfer و > 0.85"],
    ];
    routes.forEach(([k, t, c]) => {
      const d = document.createElement("div"); d.className = "route-opt"; d.dataset.k = k;
      d.innerHTML = `<span>${t}</span><code>${c}</code>`; map.appendChild(d);
    });
    body.append(ctr, map);
    function render() {
      const c = conf / 100; r.out.textContent = c.toFixed(2);
      let k = "human";
      if (c >= 0.6) {
        if (choice === "check_balance") k = "balance";
        else if (choice === "approve_transfer") k = c > 0.85 ? "approve" : "confirm";
      }
      $$(".route-opt", map).forEach((d) => d.classList.toggle("on", d.dataset.k === k));
    }
    render();
  }

  function wComposite(el) {
    const body = widgetShell(el, "امتیازدهی ترکیبی — رتبه‌بندی رزومه‌ها", "داده‌ی نمایشی؛ امتیازها نرمال‌شده به ۰ تا ۱");
    const dims = [["python", "Python depth"], ["lead", "Team leadership"], ["arch", "System design"], ["gen", "Generalist"]];
    const cands = [
      { n: "نامزد الف", s: { python: 1.0, lead: 0.25, arch: 0.75, gen: 0.5 } },
      { n: "نامزد ب", s: { python: 0.5, lead: 1.0, arch: 0.5, gen: 0.75 } },
      { n: "نامزد ج", s: { python: 0.75, lead: 0.5, arch: 1.0, gen: 0.25 } },
      { n: "نامزد د", s: { python: 0.25, lead: 0.75, arch: 0.25, gen: 1.0 } },
    ];
    let w = { python: 40, lead: 10, arch: 40, gen: 10 };
    const grid = document.createElement("div"); grid.className = "composite-grid";
    const ctr = document.createElement("div"); ctr.className = "w-controls";
    const rows = dims.map(([k, l]) => { const r = sliderRow(l, w[k], (e) => { w[k] = +e.target.value; ctr.querySelectorAll(".seg button").forEach((b) => b.classList.remove("on")); render(); }); r.k = k; return r; });
    ctr.append(presetBar([
      { label: "Senior IC", values: { python: 40, lead: 10, arch: 40, gen: 10 } },
      { label: "Engineering Manager", values: { python: 15, lead: 40, arch: 20, gen: 25 } },
    ], (v) => { w = Object.assign({}, v); rows.forEach((r) => (r.inp.value = w[r.k])); render(); }));
    rows.forEach((r) => ctr.appendChild(r.row));
    const list = document.createElement("div"); list.className = "rank-list";
    const items = cands.map((c) => {
      const it = document.createElement("div"); it.className = "rank-item";
      it.innerHTML = `<span class="pos"></span><span>${c.n}</span><b></b>`;
      it._c = c; list.appendChild(it); return it;
    });
    grid.append(ctr, list); body.appendChild(grid);
    function render() {
      const tot = Object.values(w).reduce((a, b) => a + b, 0) || 1;
      rows.forEach((r) => (r.out.textContent = Math.round((w[r.k] / tot) * 100) + "%"));
      items.forEach((it) => { it._v = dims.reduce((s, [k]) => s + (w[k] / tot) * it._c.s[k], 0); $("b", it).textContent = it._v.toFixed(2); });
      const first = new Map(items.map((it) => [it, it.getBoundingClientRect().top]));
      items.slice().sort((a, b) => b._v - a._v).forEach((it, i) => { list.appendChild(it); $(".pos", it).textContent = fa(i + 1); });
      if (reduceMotion) return;
      items.forEach((it) => {
        const d = first.get(it) - it.getBoundingClientRect().top;
        if (d) { it.style.transition = "none"; it.style.transform = `translateY(${d}px)`; requestAnimationFrame(() => { it.style.transition = ""; it.style.transform = ""; }); }
      });
    }
    render();
  }

  function initWidgets() {
    const map = { confidence: wConfidence, score: wScore, noul: wNoul, routing: wRouting, composite: wComposite };
    $$("[data-widget]").forEach((el) => { const fn = map[el.dataset.widget]; if (fn) fn(el); });
  }

  /* ==========================================================================
     Hero live demo (landing) — values are recorded outputs from the official docs
     ========================================================================== */
  const SCENARIOS = [
    {
      state: "Hi, I've been trying to connect my Stripe account for 3 days and the integration keeps failing. I'm losing sales. Please help ASAP.",
      answers: [
        { type: "choice", q: "کدام تیم رسیدگی کند؟", v: 'choice: "technical"', bars: [["technical", .85], ["billing", .15], ["sales", 0]] },
        { type: "score", q: "میزان ناراحتی مشتری", v: "score: 1.0", bars: [["0 calm", 0], ["1 civil", 1], ["2 angry", 0]] },
        { type: "noul", q: "آیا پیام فوریت دارد؟", v: "noul: 1.0" },
      ],
      usage: "input_tokens: 392",
    },
    {
      state: "The export button crashes the settings page in Safari. It works in Chrome, but a few of our customers only use Safari.",
      answers: [
        { type: "score", q: "شدت باگ گزارش‌شده", v: "score: 1.43", bars: [["0 cosmetic", 0], ["1 workaround", .57], ["2 blocking", .43]] },
      ],
      usage: "input_tokens: 332",
    },
    {
      state: "My running shoes arrived in the wrong size. Can I swap them for a size 10?",
      answers: [
        { type: "choice", q: "کدام تیم رسیدگی کند؟", v: 'choice: "returns"', bars: [["returns", 1], ["shipping", 0], ["billing", 0]] },
      ],
      usage: "input_tokens: 328",
    },
    {
      state: "I have asked three times now. Can I please just talk to a real person?",
      answers: [
        { type: "noul", q: "مشتری اپراتور انسانی می‌خواهد؟", v: "noul: 0.99" },
        { type: "noul", q: "قبلاً هم تماس گرفته است؟", v: "noul: 0.93" },
      ],
      usage: "input_tokens: 360",
    },
  ];

  function initHeroDemo() {
    const demo = $("#hero-demo");
    if (!demo) return;
    const stateEl = $(".demo-state", demo), ansEl = $(".demo-answers", demo), dots = $(".demo-dots", demo), usage = $(".usage", demo);
    let idx = 0, timers = [];
    SCENARIOS.forEach((_, i) => {
      const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "سناریو " + fa(i + 1));
      b.addEventListener("click", () => play(i)); dots.appendChild(b);
    });
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    function play(i) {
      clear(); idx = i;
      $$("button", dots).forEach((b, j) => b.classList.toggle("on", j === i));
      const sc = SCENARIOS[i];
      ansEl.innerHTML = ""; usage.textContent = "…";
      sc.answers.forEach((a) => {
        const d = document.createElement("div"); d.className = "ans";
        let bars = "";
        if (a.bars) bars = `<div class="bars">${a.bars.map(([l, p]) => `<div class="bar" data-p="${p}"><span>${l}</span><div class="track"><div class="fill"></div></div><span>${p.toFixed(2)}</span></div>`).join("")}</div>`;
        d.innerHTML = `<div class="ans-head"><span class="q">${a.q}</span><span class="chip-type t-${a.type}">${a.type}</span></div><div class="ans-head" style="margin-top:4px"><span></span><span class="v">${a.v}</span></div>${bars}`;
        ansEl.appendChild(d);
      });
      // typing
      const text = sc.state; let k = 0;
      const speed = reduceMotion ? 0 : Math.max(8, 1400 / text.length);
      const type = () => {
        k = reduceMotion ? text.length : k + 1;
        stateEl.innerHTML = esc(text.slice(0, k)) + '<span class="caret"></span>';
        if (k < text.length) later(type, speed);
        else reveal();
      };
      type();
      function reveal() {
        $$(".ans", ansEl).forEach((d, j) => later(() => {
          d.classList.add("show");
          later(() => $$(".bar", d).forEach((b) => {
            const p = +b.dataset.p; $(".fill", b).style.width = p * 100 + "%";
            if (p === Math.max(...$$(".bar", d).map((x) => +x.dataset.p))) b.classList.add("win");
          }), 150);
        }, 300 + j * 380));
        later(() => (usage.textContent = sc.usage), 300 + sc.answers.length * 380);
        later(() => play((idx + 1) % SCENARIOS.length), 6200);
      }
    }
    play(0);
  }

  /* Primitive mini visuals on landing */
  function initMinis() {
    const els = $$("[data-mini]");
    if (!els.length) return;
    const go = (el) => {
      if (el.dataset.mini === "bars") $$(".bar", el).forEach((b) => ($(".fill", b).style.width = +b.dataset.p * 100 + "%"));
      if (el.dataset.mini === "gauge") { const g = $(".gauge", el); g.style.setProperty("--p", g.dataset.p); }
      if (el.dataset.mini === "scale") { const m = $(".marker", el); m.style.left = (m.dataset.s / m.dataset.max) * 100 + "%"; }
    };
    if (!("IntersectionObserver" in window)) { els.forEach(go); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { setTimeout(() => go(en.target), 300); io.unobserve(en.target); } }), { threshold: .4 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------- Google Analytics (id comes from assets/js/config.js,
     itself generated from .env — never hardcoded in page HTML) ---------- */
  function initAnalytics() {
    const id = (window.JEV_SITE || {}).gaMeasurementId;
    if (!id) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", id);
  }
  initAnalytics();

  /* ---------- Public API (used by examples page) ---------- */
  window.JevUI = { fa, faDate, codeBlock, codeGroup, highlight, initReveal, initCode, esc };

  document.addEventListener("DOMContentLoaded", () => {
    initTheme(); initNav(); initDates(); initProgress(); initCode(); initTabs(); initReveal(); initCardGlow();
    initCounters(); initDocs(); initWidgets(); initHeroDemo(); initMinis();
    document.dispatchEvent(new CustomEvent("jev:ready"));
  });
})();
