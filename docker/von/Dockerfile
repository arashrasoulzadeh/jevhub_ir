# سرویس مدل Von (جایگزین متن‌باز و خودمیزبان System One، سازگار با
# /v1/systemone) برای Playground جِو هاب — نه خودِ Jev واقعی.
#
# این کانتینر هیچ پورتی به هاست publish نمی‌کند (نگاه کنید به
# docker-compose.yml)؛ تنها از شبکه‌ی داخلی docker compose، توسط سرویس
# jevhub (reverse proxy در docker/nginx.conf، مسیر /api/von/) صدا زده
# می‌شود. یعنی از بیرون هیچ آدرس مستقیمی برای این سرویس وجود ندارد.
FROM python:3.12-slim

RUN pip install --no-cache-dir von-sdk

# وزن‌های مدل (~1.5GB) اولین بار که سرور بالا می‌آید از Hugging Face
# دانلود و کش می‌شوند — docker-compose.yml یک volume روی
# /root/.cache/huggingface می‌گذارد تا این دانلود فقط یک‌بار انجام شود.

EXPOSE 8000
CMD ["von", "serve", "--host", "0.0.0.0", "--port", "8000"]
