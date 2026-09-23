/* ==========================================================================
   رندر مثال‌ها (صفحه‌ی مثال‌ها + پیش‌نمایش صفحه‌ی اصلی)
   داده‌ها از assets/js/examples-data.js خوانده می‌شوند.
   ========================================================================== */
(function () {
  "use strict";

  const LEVELS = { 1: ["مقدماتی", "l1"], 2: ["متوسط", "l2"], 3: ["پیشرفته", "l3"] };
  const PRIM = { choice: "t-choice", score: "t-score", noul: "t-noul" };

  function card(ex, i, ui) {
    const [lvl, lcls] = LEVELS[ex.level] || LEVELS[1];
    const el = document.createElement("a");
    el.className = "card ex-card";
    el.href = "examples.html#" + ex.id;
    el.style.setProperty("--d", (i * 0.07) + "s");
    el.innerHTML = `
      <div class="top"><span class="ex-num">${String(i + 1).padStart(2, "0")}</span><span class="level ${lcls}">${lvl}</span></div>
      <h3>${ui.esc(ex.title)}</h3>
      <p>${ui.esc(ex.summary)}</p>
      <div class="ex-tags">${(ex.primitives || []).map((p) => `<span class="chip-type ${PRIM[p] || ""}">${p}</span>`).join("")}${(ex.tags || []).map((t) => `<span class="tag">${ui.esc(t)}</span>`).join("")}</div>
      <div class="foot"><span>${ui.fa(ex.readTime || 5)} دقیقه مطالعه · ${ui.faDate(ex.added)}</span><span class="go">مشاهده <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg></span></div>`;
    return el;
  }

  function renderHome(ui, data) {
    const box = document.getElementById("home-examples");
    if (!box) return;
    data.slice(-3).forEach((ex) => box.appendChild(card(ex, data.indexOf(ex), ui)));
  }

  function renderPage(ui, data) {
    const grid = document.getElementById("ex-grid");
    if (!grid) return;
    const search = document.getElementById("ex-search");
    const chips = Array.from(document.querySelectorAll(".chips .chip"));
    let filter = "all";

    function draw() {
      const q = (search.value || "").trim().toLowerCase();
      grid.innerHTML = "";
      let shown = 0;
      data.forEach((ex, i) => {
        const hay = [ex.title, ex.summary, ex.scenario, (ex.tags || []).join(" "), ex.pattern || "", (ex.primitives || []).join(" ")].join(" ").toLowerCase();
        const byF = filter === "all" || (ex.primitives || []).includes(filter) || String(ex.level) === filter.replace("level", "");
        if (byF && (!q || hay.includes(q))) { grid.appendChild(card(ex, i, ui)); shown++; }
      });
      if (!shown) grid.innerHTML = '<div class="empty">مثالی با این مشخصات پیدا نشد.</div>';
      // «افزودن مثال» card
      const add = document.createElement("div");
      add.className = "card ex-add";
      add.style.setProperty("--d", (shown * 0.07) + "s");
      add.innerHTML = `<div class="plus">+</div><h3>جای مثال بعدی شما</h3><p>برای افزودن مثال، یک شیء جدید به آرایه‌ی <code>JEV_EXAMPLES</code> در فایل <code>assets/js/examples-data.js</code> اضافه کنید. الگوی کامل در ابتدای همان فایل آمده است.</p>`;
      grid.appendChild(add);
      const cnt = document.getElementById("ex-count");
      if (cnt) cnt.textContent = ui.fa(shown);
    }
    chips.forEach((c) => c.addEventListener("click", () => {
      chips.forEach((x) => x.classList.toggle("on", x === c));
      filter = c.dataset.filter; draw();
    }));
    search.addEventListener("input", draw);
    draw();

    /* ---------- Drawer ---------- */
    const drawer = document.getElementById("drawer"), back = document.getElementById("drawer-back");
    const body = drawer.querySelector(".drawer-body"), crumbs = drawer.querySelector(".crumbs");

    function open(id) {
      const i = data.findIndex((e) => e.id === id);
      if (i < 0) return close();
      const ex = data[i];
      const [lvl, lcls] = LEVELS[ex.level] || LEVELS[1];
      crumbs.textContent = "مثال " + ui.fa(String(i + 1).padStart(2, "0")) + " از " + ui.fa(data.length);
      body.innerHTML = `
        <span class="ex-num">${String(i + 1).padStart(2, "0")}</span>
        <h2>${ui.esc(ex.title)}</h2>
        <p class="lead">${ui.esc(ex.summary)}</p>
        <div class="ex-meta">
          <span class="level ${lcls}">${lvl}</span>
          ${ex.pattern ? `<span>الگو: <b class="ltr">${ui.esc(ex.pattern)}</b></span>` : ""}
          <span>${ui.fa(ex.readTime || 5)} دقیقه مطالعه</span>
          <span>افزوده‌شده: ${ui.faDate(ex.added)}</span>
        </div>
        <div class="ex-tags">${(ex.primitives || []).map((p) => `<span class="chip-type ${PRIM[p] || ""}">${p}</span>`).join("")}${(ex.tags || []).map((t) => `<span class="tag">${ui.esc(t)}</span>`).join("")}</div>
        ${ex.sourceUrl ? `<p style="margin-top:-6px"><a href="${ex.sourceUrl}" target="_blank" rel="noopener" class="src-link">الهام‌گرفته از cookbook رسمی TypeSafe <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a></p>` : ""}
        <h3>سناریو</h3><p>${ui.esc(ex.scenario || "")}</p>
        ${ex.steps && ex.steps.length ? `<h3>گام‌ها</h3><ol class="ex-steps">${ex.steps.map((s) => `<li><span>${ui.esc(s)}</span></li>`).join("")}</ol>` : ""}
        <h3>کد</h3><div data-slot="code"></div>
        ${ex.response ? `<h3>خروجی نمونه</h3><div data-slot="resp"></div>${ex.responseNote ? `<div class="callout note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><p>${ui.esc(ex.responseNote)}</p></div>` : ""}` : ""}
        ${ex.notes && ex.notes.length ? `<h3>نکته‌ها</h3><div class="ex-notes">${ex.notes.map((n) => `<div class="callout tip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg><p>${ui.esc(n)}</p></div>`).join("")}</div>` : ""}
        <div class="pager">
          ${i > 0 ? `<a href="#${data[i - 1].id}"><small>مثال قبلی</small>${ui.esc(data[i - 1].title)}</a>` : "<span></span>"}
          ${i < data.length - 1 ? `<a href="#${data[i + 1].id}" style="text-align:left"><small>مثال بعدی</small>${ui.esc(data[i + 1].title)}</a>` : "<span></span>"}
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
