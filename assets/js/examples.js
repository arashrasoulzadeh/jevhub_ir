/* ==========================================================================
   رندر مثال‌ها (صفحه‌ی مثال‌ها + پیش‌نمایش صفحه‌ی اصلی)
   داده‌ها از assets/js/examples-data.js خوانده می‌شوند.
   تاگل فارسی/English فقط روی این صفحه (examples.html) اثر دارد؛ متن مثال‌ها
   (عنوان/خلاصه/سناریو/گام‌ها/نکته‌ها) اگر ex.en موجود باشد جایگزین می‌شود.
   ========================================================================== */
(function () {
  "use strict";

  const LEVELS = {
    fa: { 1: ["مقدماتی", "l1"], 2: ["متوسط", "l2"], 3: ["پیشرفته", "l3"] },
    en: { 1: ["Beginner", "l1"], 2: ["Intermediate", "l2"], 3: ["Advanced", "l3"] },
  };
  const PRIM = { choice: "t-choice", score: "t-score", noul: "t-noul" };

  const STR = {
    fa: {
      readTime: (n) => n + " دقیقه مطالعه",
      added: (d) => "افزوده‌شده: " + d,
      addedShort: (d) => d,
      view: "مشاهده",
      pattern: "الگو: ",
      empty: "مثالی با این مشخصات پیدا نشد.",
      addTitle: "جای مثال بعدی شما",
      addBody:
        "برای افزودن مثال، یک شیء جدید به آرایه‌ی JEV_EXAMPLES در فایل assets/js/examples-data.js اضافه کنید. الگوی کامل در ابتدای همان فایل آمده است.",
      exampleOf: (i, n) => "مثال " + i + " از " + n,
      scenario: "سناریو",
      steps: "گام‌ها",
      code: "کد",
      response: "خروجی نمونه",
      notes: "نکته‌ها",
      inspiredBy: "الهام‌گرفته از cookbook رسمی TypeSafe",
      prev: "مثال قبلی",
      next: "مثال بعدی",
      searchPlaceholder: "جست‌وجو در مثال‌ها…",
      count: (n) => n + " مثال کاربردی",
    },
    en: {
      readTime: (n) => n + " min read",
      added: (d) => "Added: " + d,
      addedShort: (d) => d,
      view: "View",
      pattern: "Pattern: ",
      empty: "No matching examples found.",
      addTitle: "Your next example goes here",
      addBody:
        "To add an example, add a new object to the JEV_EXAMPLES array in assets/js/examples-data.js. The full template is at the top of that file.",
      exampleOf: (i, n) => "Example " + i + " of " + n,
      scenario: "Scenario",
      steps: "Steps",
      code: "Code",
      response: "Sample response",
      notes: "Notes",
      inspiredBy: "Inspired by TypeSafe's official cookbook",
      prev: "Previous example",
      next: "Next example",
      searchPlaceholder: "Search examples…",
      count: (n) => n + " practical examples",
    },
  };

  const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function enDate(iso) {
    const d = new Date(iso + "T12:00:00");
    if (isNaN(d)) return iso;
    return EN_MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }

  function getLang() {
    try { return localStorage.getItem("jev-examples-lang") === "en" ? "en" : "fa"; } catch (e) { return "fa"; }
  }
  function setLang(l) {
    try { localStorage.setItem("jev-examples-lang", l); } catch (e) { /* ignore */ }
  }

  // مقدار انگلیسی اگر ex.en[field] وجود داشته باشد، وگرنه fallback فارسی
  function tf(ex, field, lang) {
    if (lang === "en" && ex.en && ex.en[field] !== undefined) return ex.en[field];
    return ex[field];
  }

  function num(n, lang) { return lang === "en" ? String(n) : window.JevUI.fa(n); }
  function dt(iso, lang) { return lang === "en" ? enDate(iso) : window.JevUI.faDate(iso); }

  function card(ex, i, ui, lang) {
    const s = STR[lang];
    const [lvl, lcls] = LEVELS[lang][ex.level] || LEVELS[lang][1];
    const title = tf(ex, "title", lang), summary = tf(ex, "summary", lang), tags = tf(ex, "tags", lang) || [];
    const el = document.createElement("a");
    el.className = "card ex-card";
    el.href = "examples.html#" + ex.id;
    el.style.setProperty("--d", (i * 0.07) + "s");
    el.innerHTML = `
      <div class="top"><span class="ex-num">${String(i + 1).padStart(2, "0")}</span><span class="level ${lcls}">${lvl}</span></div>
      <h3>${ui.esc(title)}</h3>
      <p>${ui.esc(summary)}</p>
      <div class="ex-tags">${(ex.primitives || []).map((p) => `<span class="chip-type ${PRIM[p] || ""}">${p}</span>`).join("")}${tags.map((t) => `<span class="tag">${ui.esc(t)}</span>`).join("")}</div>
      <div class="foot"><span>${s.readTime(num(ex.readTime || 5, lang))} · ${dt(ex.added, lang)}</span><span class="go">${s.view} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg></span></div>`;
    return el;
  }

  function renderHome(ui, data) {
    const box = document.getElementById("home-examples");
    if (!box) return;
    data.slice(-3).forEach((ex) => box.appendChild(card(ex, data.indexOf(ex), ui, "fa")));
  }

  function renderPage(ui, data) {
    const grid = document.getElementById("ex-grid");
    if (!grid) return;
    const search = document.getElementById("ex-search");
    const chips = Array.from(document.querySelectorAll(".chips .chip"));
    const langToggle = document.getElementById("ex-lang");
    const drawer = document.getElementById("drawer"), back = document.getElementById("drawer-back");
    const body = drawer.querySelector(".drawer-body"), crumbs = drawer.querySelector(".crumbs");
    let filter = "all";
    let lang = getLang();

    function applyLangChrome() {
      const s = STR[lang];
      grid.classList.toggle("lang-en", lang === "en");
      body.classList.toggle("lang-en", lang === "en");
      if (search) { search.placeholder = s.searchPlaceholder; search.dir = lang === "en" ? "ltr" : "rtl"; }
      if (langToggle) Array.from(langToggle.querySelectorAll(".lang-btn")).forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
      const cnt = document.getElementById("ex-count");
      if (cnt) cnt.textContent = lang === "en" ? String(cnt.dataset.n || 0) : window.JevUI.fa(cnt.dataset.n || 0);
      const cntLabel = document.getElementById("ex-count-label");
      if (cntLabel) cntLabel.textContent = lang === "en" ? "practical examples" : "مثال کاربردی";
      const chipLabels = lang === "en"
        ? { all: "All", choice: "Choice", score: "Score", noul: "Noul", level1: "Beginner", level2: "Intermediate", level3: "Advanced" }
        : { all: "همه", choice: "Choice", score: "Score", noul: "Noul", level1: "مقدماتی", level2: "متوسط", level3: "پیشرفته" };
      chips.forEach((c) => { const k = c.dataset.filter; if (chipLabels[k]) c.textContent = chipLabels[k]; });
    }

    function draw() {
      const s = STR[lang];
      const q = (search.value || "").trim().toLowerCase();
      grid.innerHTML = "";
      let shown = 0;
      data.forEach((ex, i) => {
        const hay = [tf(ex, "title", lang), tf(ex, "summary", lang), tf(ex, "scenario", lang), (tf(ex, "tags", lang) || []).join(" "), ex.pattern || "", (ex.primitives || []).join(" ")].join(" ").toLowerCase();
        const byF = filter === "all" || (ex.primitives || []).includes(filter) || String(ex.level) === filter.replace("level", "");
        if (byF && (!q || hay.includes(q))) { grid.appendChild(card(ex, i, ui, lang)); shown++; }
      });
      if (!shown) grid.innerHTML = `<div class="empty">${s.empty}</div>`;
      // «افزودن مثال» card
      const add = document.createElement("div");
      add.className = "card ex-add";
      add.style.setProperty("--d", (shown * 0.07) + "s");
      add.innerHTML = `<div class="plus">+</div><h3>${s.addTitle}</h3><p>${s.addBody}</p>`;
      grid.appendChild(add);
      const cnt = document.getElementById("ex-count");
      if (cnt) { cnt.dataset.n = shown; cnt.textContent = lang === "en" ? String(shown) : window.JevUI.fa(shown); }
      applyLangChrome();
    }

    chips.forEach((c) => c.addEventListener("click", () => {
      chips.forEach((x) => x.classList.toggle("on", x === c));
      filter = c.dataset.filter; draw();
    }));
    search.addEventListener("input", draw);

    if (langToggle) {
      langToggle.addEventListener("click", (e) => {
        const btn = e.target.closest(".lang-btn");
        if (!btn || btn.dataset.lang === lang) return;
        lang = btn.dataset.lang;
        setLang(lang);
        draw();
        if (drawer.classList.contains("show")) {
          const id = decodeURIComponent(location.hash.slice(1));
          if (id) open(id);
        }
      });
    }

    draw();

    /* ---------- Drawer ---------- */
    function open(id) {
      const s = STR[lang];
      const i = data.findIndex((e) => e.id === id);
      if (i < 0) return close();
      const ex = data[i];
      const [lvl, lcls] = LEVELS[lang][ex.level] || LEVELS[lang][1];
      crumbs.textContent = s.exampleOf(num(i + 1, lang), num(data.length, lang));
      const title = tf(ex, "title", lang), summary = tf(ex, "summary", lang), tags = tf(ex, "tags", lang) || [];
      const scenario = tf(ex, "scenario", lang) || "";
      const steps = tf(ex, "steps", lang) || [];
      const notes = tf(ex, "notes", lang) || [];
      const responseNote = tf(ex, "responseNote", lang);
      body.classList.toggle("lang-en", lang === "en");
      body.innerHTML = `
        <span class="ex-num">${String(i + 1).padStart(2, "0")}</span>
        <h2>${ui.esc(title)}</h2>
        <p class="lead">${ui.esc(summary)}</p>
        <div class="ex-meta">
          <span class="level ${lcls}">${lvl}</span>
          ${ex.pattern ? `<span>${s.pattern}<b class="ltr">${ui.esc(ex.pattern)}</b></span>` : ""}
          <span>${s.readTime(num(ex.readTime || 5, lang))}</span>
          <span>${s.added(dt(ex.added, lang))}</span>
        </div>
        <div class="ex-tags">${(ex.primitives || []).map((p) => `<span class="chip-type ${PRIM[p] || ""}">${p}</span>`).join("")}${tags.map((t) => `<span class="tag">${ui.esc(t)}</span>`).join("")}</div>
        ${ex.sourceUrl ? `<p style="margin-top:-6px"><a href="${ex.sourceUrl}" target="_blank" rel="noopener" class="src-link">${s.inspiredBy} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a></p>` : ""}
        <h3>${s.scenario}</h3><p>${ui.esc(scenario)}</p>
        ${steps.length ? `<h3>${s.steps}</h3><ol class="ex-steps">${steps.map((st) => `<li><span>${ui.esc(st)}</span></li>`).join("")}</ol>` : ""}
        <h3>${s.code}</h3><div data-slot="code"></div>
        ${ex.response ? `<h3>${s.response}</h3><div data-slot="resp"></div>${responseNote ? `<div class="callout note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><p>${ui.esc(responseNote)}</p></div>` : ""}` : ""}
        ${notes.length ? `<h3>${s.notes}</h3><div class="ex-notes">${notes.map((n) => `<div class="callout tip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg><p>${ui.esc(n)}</p></div>`).join("")}</div>` : ""}
        <div class="pager">
          ${i > 0 ? `<a href="#${data[i - 1].id}"><small>${s.prev}</small>${ui.esc(tf(data[i - 1], "title", lang))}</a>` : "<span></span>"}
          ${i < data.length - 1 ? `<a href="#${data[i + 1].id}" style="text-align:left"><small>${s.next}</small>${ui.esc(tf(data[i + 1], "title", lang))}</a>` : "<span></span>"}
        </div>`;
      const codeSlot = body.querySelector('[data-slot="code"]');
      const items = ex.code || [];
      if (items.length === 1) codeSlot.appendChild(ui.codeBlock(items[0].source, items[0].lang, items[0].label));
      else if (items.length) codeSlot.appendChild(ui.codeGroup(items.map((c) => Object.assign({}, c))));
      const rs = body.querySelector('[data-slot="resp"]');
      if (rs) rs.appendChild(ui.codeBlock(ex.response, "json", "response.json"));
      drawer.classList.add("show"); back.classList.add("show");
      document.body.style.overflow = "hidden";
      drawer.scrollTop = 0;
    }
    function close() {
      drawer.classList.remove("show"); back.classList.remove("show");
      document.body.style.overflow = "";
    }
    function route() {
      const id = decodeURIComponent(location.hash.slice(1));
      if (id) open(id); else close();
    }
    const clearHash = () => history.pushState("", document.title, location.pathname + location.search);
    back.addEventListener("click", () => { clearHash(); close(); });
    drawer.querySelector(".drawer-close").addEventListener("click", () => { clearHash(); close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("show")) { clearHash(); close(); } });
    window.addEventListener("hashchange", route);
    grid.addEventListener("click", (e) => {
      const a = e.target.closest("a.ex-card");
      if (!a) return;
      e.preventDefault();
      location.hash = a.getAttribute("href").split("#")[1];
    });
    route();
  }

  document.addEventListener("jev:ready", () => {
    const ui = window.JevUI, data = window.JEV_EXAMPLES || [];
    if (!ui) return;
    renderHome(ui, data);
    renderPage(ui, data);
  });
})();
