#!/usr/bin/env python3
"""Patches assets/js/config.js's gaMeasurementId from .env's
GA_MEASUREMENT_ID. Everything else in config.js (docsUpdated, model, ...)
is hand-maintained and left untouched."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from env import GA_MEASUREMENT_ID

ROOT = Path("/Users/arashrasoulzadeh/Documents/projects/jevhub_ir")
path = ROOT / "assets/js/config.js"

src = path.read_text(encoding="utf-8")
new = re.sub(r'gaMeasurementId:\s*"[^"]*"', f'gaMeasurementId: "{GA_MEASUREMENT_ID}"', src)
if new != src:
    path.write_text(new, encoding="utf-8")
    print("patched assets/js/config.js — gaMeasurementId =", GA_MEASUREMENT_ID)
else:
    print("assets/js/config.js already up to date")
