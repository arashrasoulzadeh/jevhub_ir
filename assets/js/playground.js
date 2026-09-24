/* ==========================================================================
   Playground محلی — شبیه‌سازی سبک در مرورگر، بدون فراخوانی واقعی API.
   هدف نشان‌دادن شکل پاسخ Jev (Choice/Score/Noul + احتمال + اطمینان) روی
   متنی است که خودِ کاربر می‌نویسد؛ اعداد با یک هیوریستیک ساده بر اساس
   کلیدواژه تولید می‌شوند، نه استنتاج واقعی مدل.
   ========================================================================== */
(function () {
  "use strict";

  const PRESETS = [
    {
      label: "تیکت فنی",
      text: "سلام، سه روزه دارم تلاش می‌کنم درگاه پرداختم رو وصل کنم و هی خطا می‌ده. دارم مشتری از دست می‌دم. لطفاً فوری کمکم کنید.",
    },
    {
      label: "درخواست بازپرداخت",
      text: "دو بار بابت یک سفارش ازم پول کسر شده. لطفاً هرچه سریع‌تر مبلغ اضافه رو برگردونید، خیلی ناراحت‌کننده‌ست.",
    },
    {
      label: "پیام آرام",
      text: "می‌خواستم بپرسم امکانش هست پلن اشتراکم رو از ماهانه به سالانه تغییر بدم؟ عجله‌ای ندارم.",
    },
  ];

  const BUG_WORDS = ["خطا", "باگ", "کرش", "کار نمی‌کند", "کار نمیکنه", "مشکل فنی", "خراب", "وصل نمی‌شه", "وصل نمیشه", "اررور", "کرش می‌کنه", "لود نمیشه", "باز نمیشه"];
  const BILLING_WORDS = ["پول", "بازپرداخت", "هزینه", "فاکتور", "کارت", "پرداخت", "صورت‌حساب", "شارژ", "اشتراک", "تراکنش", "کسر شده"];
  // نکته: کلیدواژه‌های کوتاه را طوری انتخاب کنید که زیررشته‌ی کلمه‌ی نامرتبط
  // دیگری نباشند — مثلاً «الان» داخل «سالانه» هم به‌عنوان زیررشته پیدا می‌شود.
  const URGENT_WORDS = ["فوری", "هرچه سریع‌تر", "همین الان", "لطفاً فوری", "اضطراری", "asap", "immediately", "urgent"];
  const ANGRY_WORDS = ["عصبانی", "ناراحت", "افتضاح", "خیلی بده", "متاسفم نیست", "غیرقابل قبول", "شاکی", "خسته شدم", "بار سوم", "چندمین بار"];
  const CALM_WORDS = ["ممنون", "لطفاً", "عجله‌ای ندارم", "هروقت وقت کردید", "مشکلی نیست"];

  // هش ساده‌ی رشته → عدد ۰ تا ۱، فقط برای اینکه متن‌های بدون کلیدواژه هم
  // خروجی «تصادفی اما پایدار» بدهند (هربار روی همان متن، همان عدد).
  function seedRand(str, salt) {
    let h = 2166136261 ^ salt;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 1000) / 1000;
  }

  function countHits(t, words) {
    return words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function analyze(rawText) {
    const t = rawText.toLowerCase();
    const bugHits = countHits(t, BUG_WORDS);
    const billHits = countHits(t, BILLING_WORDS);
    const urgentHits = countHits(t, URGENT_WORDS);
    const angryHits = countHits(t, ANGRY_WORDS);
    const calmHits = countHits(t, CALM_WORDS);

    // --- category (Choice) ---
    let category = "other";
    if (bugHits > 0 && bugHits >= billHits) category = "bug_report";
    else if (billHits > 0) category = "billing";
    const base = seedRand(rawText, 1);
    let pBug = bugHits > 0 ? clamp(0.55 + bugHits * 0.12, 0.55, 0.97) : 0.05 + base * 0.1;
    let pBill = billHits > 0 ? clamp(0.55 + billHits * 0.12, 0.55, 0.97) : 0.05 + base * 0.08;
    let pOther = category === "other" ? clamp(0.5 + base * 0.3, 0.4, 0.9) : 0.03;
    // اگر هر دو دسته کلیدواژه داشته باشند، برنده را کمی واضح‌تر جلو می‌اندازیم
    // که نوار برنده با نوار دوم قاطی نشود (این‌جا فقط خوانایی نمودار مهم است).
    if (bugHits > 0 && billHits > 0) { if (category === "bug_report") pBug += 0.2; else pBill += 0.2; }
    const sum = pBug + pBill + pOther;
    pBug /= sum; pBill /= sum; pOther /= sum;
    const probs = { bug_report: pBug, billing: pBill, other: pOther };
    const categoryConfidence = probs[category];

    // --- urgency (Noul) ---
    let urgentNoul;
    if (urgentHits > 0) urgentNoul = clamp(0.75 + urgentHits * 0.08, 0.75, 0.99);
    else if (angryHits > 0) urgentNoul = clamp(0.5 + angryHits * 0.08, 0.5, 0.8);
    else urgentNoul = clamp(0.1 + seedRand(rawText, 2) * 0.35, 0.05, 0.45);

    // --- frustration (Score 0-2) ---
    let frustration;
    if (angryHits > 0) frustration = clamp(1.2 + angryHits * 0.25, 1.2, 2);
    else if (calmHits > 0) frustration = clamp(0.1 + seedRand(rawText, 3) * 0.3, 0, 0.5);
    else frustration = clamp(0.4 + seedRand(rawText, 4) * 0.8, 0, 1.6);
    const frustrationConfidence = clamp(0.5 + Math.abs(frustration - 1) * 0.3 + seedRand(rawText, 5) * 0.15, 0.4, 0.95);

    return {
      category, probs, categoryConfidence,
      urgentNoul,
      frustration, frustrationConfidence,
      tokens: Math.max(20, Math.round(rawText.trim().split(/\s+/).filter(Boolean).length * 1.6) + 60),
    };
  }

  const CATEGORY_LABEL = { bug_report: "گزارش باگ", billing: "مالی", other: "سایر" };
  const FRUST_LEVELS = ["۰ آرام", "۱ عادی", "۲ عصبانی"];

  function fmt(n) { return n.toFixed(2); }

  function renderBars(pairs, winKey) {
    return `<div class="bars">${pairs.map(([label, p, key]) =>
      `<div class="bar${key === winKey ? " win" : ""}" data-p="${p}"><span>${label}</span><div class="track"><div class="fill" style="width:${(p * 100).toFixed(0)}%"></div></div><span>${fmt(p)}</span></div>`
    ).join("")}</div>`;
  }

  function render(result, els) {
    const { category, probs, categoryConfidence, urgentNoul, frustration, frustrationConfidence, tokens } = result;

    els.answers.innerHTML = `
      <div class="ans show">
        <div class="ans-head"><span class="q">کدام تیم رسیدگی کند؟</span><span class="chip-type t-choice">choice</span></div>
        <div class="ans-head" style="margin-top:4px"><span style="color:var(--muted);font-size:.78rem">اطمینان: ${fmt(categoryConfidence)}</span><span class="v">choice: "${category}"</span></div>
        ${renderBars([[CATEGORY_LABEL.bug_report, probs.bug_report, "bug_report"], [CATEGORY_LABEL.billing, probs.billing, "billing"], [CATEGORY_LABEL.other, probs.other, "other"]], category)}
      </div>
      <div class="ans show">
        <div class="ans-head"><span class="q">میزان ناراحتی مشتری</span><span class="chip-type t-score">score</span></div>
        <div class="ans-head" style="margin-top:4px"><span style="color:var(--muted);font-size:.78rem">اطمینان: ${fmt(frustrationConfidence)}</span><span class="v">score: ${fmt(frustration)}</span></div>
        ${renderBars(FRUST_LEVELS.map((l, i) => [l, i === 0 ? clamp(1 - frustration, 0, 1) : i === 1 ? clamp(1 - Math.abs(frustration - 1), 0, 1) : clamp(frustration - 1, 0, 1), i]), Math.round(clamp(frustration, 0, 2)))}
      </div>
      <div class="ans show">
        <div class="ans-head"><span class="q">آیا پیام فوریت دارد؟</span><span class="chip-type t-noul">noul</span></div>
        <div class="ans-head" style="margin-top:4px"><span></span><span class="v">noul: ${fmt(urgentNoul)}</span></div>
      </div>`;
    els.usage.textContent = "input_tokens: " + tokens;
  }

  function init() {
    const box = document.getElementById("pg-demo");
    if (!box) return;
    const input = document.getElementById("pg-input");
    const runBtn = document.getElementById("pg-run");
    const answers = box.querySelector(".demo-answers");
    const usage = box.querySelector(".usage");
    const presetsEl = document.getElementById("pg-presets");

    PRESETS.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = p.label;
      b.addEventListener("click", () => { input.value = p.text; run(); });
      presetsEl.appendChild(b);
    });

    function run() {
      const text = input.value.trim();
      if (!text) { answers.innerHTML = '<div class="ans show" style="color:var(--muted)">اول یک متن بنویسید یا یکی از نمونه‌ها را انتخاب کنید.</div>'; usage.textContent = "…"; return;
      }
      usage.textContent = "…";
      runBtn.disabled = true; runBtn.textContent = "در حال اجرا…";
      answers.innerHTML = "";
      setTimeout(() => {
        render(analyze(text), { answers, usage });
        runBtn.disabled = false; runBtn.textContent = "اجرا";
      }, 420);
    }

    runBtn.addEventListener("click", run);
    input.value = PRESETS[0].text;
    run();
  }

  document.addEventListener("jev:ready", init);
})();
