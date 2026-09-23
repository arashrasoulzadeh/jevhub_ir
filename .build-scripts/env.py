"""Tiny stdlib .env loader shared by the generator scripts — no dependency."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_env(path: Path = ROOT / ".env") -> dict:
    """Parses a simple KEY=VALUE .env file (one per line, # comments, no
    quoting/escaping support — that's all this project needs)."""
    values = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            values[key.strip()] = val.strip().strip('"').strip("'")
    return values


ENV = load_env()
SITE_URL = ENV.get("SITE_URL", "https://your-domain.example").rstrip("/")
GA_MEASUREMENT_ID = ENV.get("GA_MEASUREMENT_ID", "")
