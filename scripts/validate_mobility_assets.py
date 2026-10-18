"""Validate local image and flag assets referenced by mobility records."""

from __future__ import annotations

import json
import re
import unicodedata
import urllib.request
from urllib.parse import quote
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def normalized(value: str) -> str:
    return unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode().lower().strip()


records = json.loads((ROOT / "data" / "universidades.json").read_text(encoding="utf-8"))
images = sorted({record.get("imagen", "") for record in records if record.get("imagen")})
missing_image_files = [path for path in images if not (ROOT / path).is_file()]

app_source = (ROOT / "js" / "app.js").read_text(encoding="utf-8")
country_block = app_source.split("const countryIsoCodes = {", 1)[1].split("};", 1)[0]
pairs = re.findall(r'^\s{2}(?:"([^"]+)"|([a-z0-9_]+)):\s*"([a-z]{2})"', country_block, re.MULTILINE)
country_iso = {(quoted or bare): code for quoted, bare, code in pairs}

countries = sorted({record.get("pais", "") for record in records if record.get("pais")})
missing_country_iso = [country for country in countries if normalized(country) not in country_iso]
missing_flags = [
    (country, country_iso[normalized(country)])
    for country in countries
    if normalized(country) in country_iso
    and not (ROOT / "assets" / "flags" / "4x3" / f"{country_iso[normalized(country)]}.svg").is_file()
]

urls = [f"http://localhost:8000/{quote(path, safe='/')}" for path in images]
urls.extend(
    f"http://localhost:8000/assets/flags/4x3/{country_iso[normalized(country)]}.svg"
    for country in countries
    if normalized(country) in country_iso
)
http_failures = []
for url in urls:
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            if response.status != 200:
                http_failures.append((url, response.status))
    except Exception as error:  # Report every path problem instead of hiding it.
        http_failures.append((url, type(error).__name__))

result = {
    "records": len(records),
    "countries": len(countries),
    "image_paths": len(images),
    "missing_image_files": missing_image_files,
    "missing_country_iso": missing_country_iso,
    "missing_flags": missing_flags,
    "http_assets_checked": len(urls),
    "http_failures": http_failures,
}
print(json.dumps(result, ensure_ascii=False, indent=2))

if missing_image_files or missing_country_iso or missing_flags or http_failures:
    raise SystemExit(1)
