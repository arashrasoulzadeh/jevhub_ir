# دروازه‌ی نرخ‌محدودسازی/کپچا برای Playground — جلوی سرویس von می‌نشیند.
# مثل von، هیچ پورتی به هاست publish نمی‌شود (docker-compose.yml)؛ فقط
# از داخل شبکه‌ی compose، توسط nginx کانتینر jevhub صدا زده می‌شود.
FROM python:3.12-slim

RUN pip install --no-cache-dir fastapi "uvicorn[standard]" httpx

COPY app.py /app/app.py
WORKDIR /app

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
