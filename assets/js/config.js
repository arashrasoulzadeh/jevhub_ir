/*
 * تنظیمات سراسری سایت.
 * برای به‌روزرسانی تاریخ مستندات فقط همین فایل را ویرایش کنید؛
 * تاریخ‌ها به‌صورت خودکار به تقویم شمسی و ارقام فارسی نمایش داده می‌شوند.
 *
 * gaMeasurementId از .env (کلید GA_MEASUREMENT_ID) خوانده و اینجا نوشته
 * می‌شود — با اجرای .build-scripts/gen_config.py. مستقیم دستش نزنید.
 */
window.JEV_SITE = {
  // آخرین به‌روزرسانی ترجمه‌ی فارسی مستندات (میلادی، YYYY-MM-DD)
  docsUpdated: "2026-09-23",
  // تاریخ آخرین بازبینی مستندات رسمی انگلیسی که این ترجمه بر اساس آن است
  sourceReviewed: "2026-09-17",
  // نسخه‌ی فعلی مدل
  model: "jev-1.13.0",
  alias: "jev-latest",
  sourceUrl: "https://docs.typesafe.ai",
  // شناسه‌ی اندازه‌گیری Google Analytics — از .env (تولیدشده، دستی ویرایش نکنید)
  gaMeasurementId: "G-QV7SENV5V1",
};
