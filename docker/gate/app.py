"""
دروازه‌ی Playground جِو هاب — بین nginx و سرویس Von می‌نشیند تا:
  ۱) نرخ درخواست هر IP را محدود کند (بدون نیاز به کلید API یا لاگین)،
  ۲) وقتی یک IP از حد رد شد، قبل از ادامه یک چالش Cloudflare Turnstile
     بخواهد (اگر TURNSTILE_SECRET_KEY تنظیم شده باشد).

این یک وب‌سرویس بدون‌احراز و عمومی است (چون Playground نیازی به لاگین
ندارد)؛ محافظت در چند لایه انجام می‌شود، نه یک لایه:
  - docker/nginx.conf: فقط Origin دقیقاً هم‌دامنه اجازه‌ی رسیدن به این
    سرویس را دارد — یعنی Postman/curl/httpie (که به‌صورت پیش‌فرض هیچ
    Origin نمی‌فرستند) و fetch از دامنه‌ی دیگر همین‌جا با ۴۰۳ رد می‌شوند.
  - این فایل: شمارش درخواست در حافظه (in-memory)، به‌ازای IP.
  - اختیاری: Cloudflare Turnstile وقتی شمارنده رد شود.
  - docker-compose.yml: نه این سرویس و نه von هیچ پورتی روی هاست/اینترنت
    باز نمی‌کنند؛ تنها راه رسیدن، nginx کانتینر jevhub است.

بدون دیتابیس/Redis: شمارنده‌ها در حافظه‌ی پردازه‌اند و با ری‌استارت
کانتینر پاک می‌شوند — برای مقیاس یک صفحه‌ی دمو کافی و عمدی است.
"""
import os
import time
from collections import defaultdict, deque

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

VON_URL = os.environ.get("VON_URL", "http://von:8000")
TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY", "").strip()

RATE_WINDOW_S = 60
RATE_LIMIT = 8            # هر IP، حداکثر ۸ درخواست در ۶۰ ثانیه، بدون کپچا
VERIFIED_BONUS_S = 600    # بعد از حل موفق کپچا، ۱۰ دقیقه شمارنده صفر می‌ماند

_hits: dict[str, deque] = defaultdict(deque)
_verified_until: dict[str, float] = {}

app = FastAPI()


def client_ip(req: Request) -> str:
    # nginx مقدار X-Real-IP را از $remote_addr پر می‌کند (docker/nginx.conf)
    return req.headers.get("x-real-ip") or (req.client.host if req.client else "unknown")


def is_verified(ip: str) -> bool:
    return _verified_until.get(ip, 0) > time.time()


def hit_and_check(ip: str) -> bool:
    """اگر مجاز به ادامه است True برمی‌گرداند و یک درخواست ثبت می‌کند."""
    if is_verified(ip):
        return True
    now = time.time()
    q = _hits[ip]
    while q and now - q[0] > RATE_WINDOW_S:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        return False
    q.append(now)
    return True


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/systemone")
async def systemone(req: Request):
    ip = client_ip(req)
    if not hit_and_check(ip):
        return JSONResponse(
            status_code=429,
            content={
                "error": "rate_limited",
                "message": "تعداد درخواست‌های شما از حد مجاز گذشت.",
                "captcha_required": bool(TURNSTILE_SECRET_KEY),
            },
        )
    body = await req.body()
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                f"{VON_URL}/v1/systemone",
                content=body,
                headers={"content-type": "application/json"},
            )
    except httpx.HTTPError:
        return JSONResponse(status_code=502, content={"error": "von_unreachable"})
    try:
        payload = r.json()
    except ValueError:
        payload = {"error": "von_bad_response"}
    return JSONResponse(status_code=r.status_code, content=payload)


@app.post("/verify-captcha")
async def verify_captcha(req: Request):
    ip = client_ip(req)
    if not TURNSTILE_SECRET_KEY:
        return JSONResponse(status_code=400, content={"ok": False, "error": "captcha_not_configured"})
    try:
        data = await req.json()
    except ValueError:
        data = {}
    token = (data or {}).get("token", "")
    if not token:
        return JSONResponse(status_code=400, content={"ok": False, "error": "missing_token"})

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": TURNSTILE_SECRET_KEY, "response": token, "remoteip": ip},
        )
    ok = bool(r.json().get("success"))
    if ok:
        _verified_until[ip] = time.time() + VERIFIED_BONUS_S
        _hits[ip].clear()
    return JSONResponse(status_code=200 if ok else 400, content={"ok": ok})
