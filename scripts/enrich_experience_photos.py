from __future__ import annotations

import argparse
import hashlib
import html
import io
import json
import re
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "universidades.json"
IMAGE_MAP_PATH = ROOT / "data" / "university-images.json"
CANDIDATES_PATH = ROOT / "reports" / "photo-candidates.json"
PREVIEW_DIR = ROOT / "reports" / "photo-preview"
IMAGE_DIR = ROOT / "assets" / "images" / "universidades"
SOURCES_PATH = IMAGE_DIR / "SOURCES.md"
ENRICHMENT_REPORT_PATH = ROOT / "reports" / "enriquecimiento-fotografias-2026-10-16.md"

USER_AGENT = "TecCatalogPhotoResearch/1.0 (educational catalog maintenance)"

EXCLUDED = {
    "Estancia de Investigación",
    "Estancia Internacional",
    "Estancia Internacional - Investigación  en Italia",
    "Technische Hochschule Beispiel",
    "Université Horizon",
    "Urban Tech University",
    "Pacific Computing Institute",
    "Product Design School",
    "Green Futures College",
    "Digital Business University",
}

QUERY_ALIASES = {
    "Aalborg Universitet - Faculty of IT and Design": "Aalborg University",
    "Aalto University School of Business": "Aalto University School of Business",
    "Cornell University, College of Agriculture and Life Sciences": "Cornell University",
    "Danmarks Tekniske Universitet": "Technical University of Denmark",
    "DHIK-Hochschule Aschaffenburg": "Technical University of Applied Sciences Aschaffenburg",
    "DHIK-Hochschule Esslingen": "Esslingen University of Applied Sciences",
    "DHIK-Hochschule für Technik und Wirtschaft Berlin": "Berlin University of Applied Sciences and Technology",
    "DHIK-Hochschule Mannheim": "Mannheim University of Applied Sciences",
    "DHIK-Technische Hochschule Brandenburg": "Brandenburg University of Applied Sciences",
    "Eastern Switzerland University of Applied Sciences OST": "OST Eastern Switzerland University of Applied Sciences",
    "Ecole pour l´Informatique et les Techniques Avancées (EPITA)": "EPITA",
    "ESC Rennes School of Business": "Rennes School of Business",
    "ESCP-Europe": "ESCP Business School",
    "Estancia Internacional - CEMEX": "Cemex",
    "Estancia internacional - Hannover Re": "Hannover Re",
    "Estancia Internacional - Paris Saint Germain": "Paris Saint-Germain F.C.",
    "Estancia internacional - Volvo": "Volvo",
    "Groupe IMT - IMT Nord Europe": "IMT Nord Europe",
    "Harvard Medical School - Brighman Women Hospital": "Brigham and Women's Hospital",
    "Högskolan i Borås": "University of Borås",
    "Jönköping School of Education and Communication": "Jönköping University",
    "Kauno Technologijos Universitetas": "Kaunas University of Technology",
    "Laurea-ammattikorkeakoulu": "Laurea University of Applied Sciences",
    "Linköpings Universitet": "Linköping University",
    "Mälardalens Högskola": "Mälardalen University",
    "National Taiwan University Of Science And Technology": "National Taiwan University of Science and Technology",
    "Rigas Tehniska Universitate": "Riga Technical University",
    "Scuola Lorenzo de' Medici": "Istituto Lorenzo de' Medici",
    "Scuola Lorenzo de' Medici- Campus Florencia": "Istituto Lorenzo de' Medici",
    "Södertörns högskola": "Södertörn University",
    "Technische Universität Hamburg-Harburg": "Hamburg University of Technology",
    "Technischen Universität Cottbus": "Brandenburg University of Technology",
    "The Chinese University of Hong Kong, Shenzhen": "Chinese University of Hong Kong, Shenzhen",
    "The University of British Columbia - Campus Okanagan": "University of British Columbia Okanagan",
    "The University of Nottingham - China Campus": "University of Nottingham Ningbo China",
    "Universidad Complutense de Madrid - Instituto de Estudios Bursátiles (IEB)": "Complutense University of Madrid",
    "Universidad Politécnica de Madrid - Escuela Técnica Superior de Ingeniería Aeronáutica y del Espacio": "Technical University of Madrid",
    "Universitat Autónoma de Barcelona": "Autonomous University of Barcelona",
    "Universitat Ramón Llull, La Salle": "La Salle Campus Barcelona",
    "Universitat de Barcelona - CETT Escola Universitària d'Hoteleria i Turisme": "CETT Barcelona School of Tourism Hospitality and Gastronomy",
    "Universiteit Twente": "University of Twente",
    "Universiteit van Amsterdam": "University of Amsterdam",
    "Universität Göttingen": "University of Göttingen",
    "Zürcher Hochschule für Angewandte Wissenschaften - Zurich University of Applied Sciences": "Zurich University of Applied Sciences",
    "École Polytéchnique Fédérale de Lausanne": "EPFL",
    "École supérieure des Sciences commerciales d'Angers": "ESSCA School of Management",
}

EXISTING_ALIASES = {
    "Aalborg Universitet - Faculty of IT and Design": "Aalborg Universitet – Faculty of Engineering and Science",
    "Ostfalia Hochschule für angewandte Wissenschaften": "Ostfalia Hochschule für angewandte Wissenschaften (DAAD)",
    "Istituto Lorenzo de' Medici - Campus Florencia": "Istituto Lorenzo de' Medici",
    "Scuola Lorenzo de' Medici": "Istituto Lorenzo de' Medici",
    "Scuola Lorenzo de' Medici- Campus Florencia": "Istituto Lorenzo de' Medici",
    "Universidad Politécnica de Madrid": "Universidad Politécnica de Madrid – ETSIN",
    "Universidad Politécnica de Madrid - Escuela Técnica Superior de Ingeniería Aeronáutica y del Espacio": "Universidad Politécnica de Madrid – ETSIN",
}

BAD_IMAGE_WORDS = {
    "logo",
    "seal",
    "crest",
    "coat of arms",
    "wordmark",
    "icon",
    "flag",
    "map",
    "emblem",
}

REJECTED_IMAGE_TITLES = {
    "Escudo UAL.jpg",
}

REJECTED_INSTITUTIONS = {
    "California State University",
    "Universidad de Almería",
}


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(character for character in value if not unicodedata.combining(character))
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def api_json(base_url: str, params: dict[str, object], retries: int = 3) -> dict:
    url = f"{base_url}?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(retries):
        try:
            with urlopen(request, timeout=30) as response:
                return json.load(response)
        except HTTPError as error:
            if error.code == 429 and attempt < retries - 1:
                retry_after = error.headers.get("Retry-After")
                time.sleep(float(retry_after) if retry_after else 12 * (attempt + 1))
                continue
            raise
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError("Unreachable")


def search_wikidata(query: str) -> dict | None:
    payload = api_json(
        "https://www.wikidata.org/w/api.php",
        {
            "action": "wbsearchentities",
            "search": query,
            "language": "en",
            "uselang": "en",
            "limit": 5,
            "format": "json",
        },
    )
    candidates = payload.get("search", [])
    if not candidates:
        return None
    query_norm = normalized(query)
    for candidate in candidates:
        texts = [candidate.get("label", "")]
        match = candidate.get("match") or {}
        if match.get("text"):
            texts.append(match["text"])
        candidate["match_score"] = max(
            SequenceMatcher(None, query_norm, normalized(text)).ratio() for text in texts if text
        )
    return max(candidates, key=lambda item: item["match_score"])


def load_p18(qids: list[str]) -> dict[str, str]:
    images: dict[str, str] = {}
    for offset in range(0, len(qids), 50):
        batch = qids[offset : offset + 50]
        payload = api_json(
            "https://www.wikidata.org/w/api.php",
            {
                "action": "wbgetentities",
                "ids": "|".join(batch),
                "props": "claims",
                "format": "json",
            },
        )
        for qid, entity in payload.get("entities", {}).items():
            claims = entity.get("claims", {}).get("P18", [])
            claims.sort(key=lambda claim: claim.get("rank") != "preferred")
            for claim in claims:
                try:
                    images[qid] = claim["mainsnak"]["datavalue"]["value"]
                    break
                except (KeyError, TypeError):
                    continue
    return images


def clean_html(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", value or "")).strip()


def fetch_bytes(url: str, retries: int = 4) -> bytes:
    if url.startswith("https://upload.wikimedia.org/"):
        url = url.split("?", 1)[0]
    request = Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(retries):
        try:
            with urlopen(request, timeout=60) as response:
                return response.read()
        except HTTPError as error:
            if error.code == 429 and attempt < retries - 1:
                retry_after = error.headers.get("Retry-After")
                time.sleep(float(retry_after) if retry_after else 15 * (attempt + 1))
                continue
            raise
    raise RuntimeError("Unreachable")


def slugify(value: str) -> str:
    slug = normalized(value).replace(" ", "-")[:70].strip("-") or "institution"
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:8]
    return f"{slug}-{digest}"


def load_commons_metadata(filenames: list[str]) -> dict[str, dict]:
    metadata: dict[str, dict] = {}
    for offset in range(0, len(filenames), 25):
        batch = filenames[offset : offset + 25]
        payload = api_json(
            "https://commons.wikimedia.org/w/api.php",
            {
                "action": "query",
                "titles": "|".join(f"File:{name}" for name in batch),
                "prop": "imageinfo",
                "iiprop": "url|extmetadata|mime|size",
                "iiurlwidth": 1600,
                "format": "json",
            },
        )
        for page in payload.get("query", {}).get("pages", {}).values():
            info = (page.get("imageinfo") or [{}])[0]
            ext = info.get("extmetadata") or {}
            title = page.get("title", "").removeprefix("File:")
            metadata[title] = {
                "image_title": title,
                "source_page": info.get("descriptionurl", ""),
                "download_url": info.get("thumburl") or info.get("url", ""),
                "mime": info.get("thumbmime") or info.get("mime", ""),
                "width": info.get("thumbwidth") or info.get("width"),
                "height": info.get("thumbheight") or info.get("height"),
                "license": clean_html((ext.get("LicenseShortName") or {}).get("value", "")),
                "license_url": clean_html((ext.get("LicenseUrl") or {}).get("value", "")),
                "author": clean_html((ext.get("Artist") or {}).get("value", "")),
                "description": clean_html((ext.get("ImageDescription") or {}).get("value", "")),
            }
    return metadata


def discover() -> None:
    experiences = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    image_map = json.loads(IMAGE_MAP_PATH.read_text(encoding="utf-8"))
    institutions = sorted(
        {
            item.get("nombre", "").strip()
            for item in experiences
            if not str(item.get("imagen") or "").strip() and item.get("nombre", "").strip()
        },
        key=str.casefold,
    )

    cached: dict[str, dict] = {}
    if CANDIDATES_PATH.exists():
        cached = {
            record["institution"]: record
            for record in json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))
        }

    candidates: list[dict] = []
    search_queue: list[tuple[str, str]] = []
    for institution in institutions:
        if institution in EXCLUDED:
            candidates.append({"institution": institution, "status": "excluded", "approved": False})
            continue
        existing_name = EXISTING_ALIASES.get(institution)
        if existing_name and existing_name in image_map:
            candidates.append(
                {
                    "institution": institution,
                    "status": "reuse",
                    "local_path": image_map[existing_name],
                    "approved": True,
                }
            )
            continue
        cached_record = cached.get(institution)
        if cached_record and cached_record.get("status") != "search-error":
            candidates.append(cached_record)
            continue
        query = QUERY_ALIASES.get(institution, institution)
        search_queue.append((institution, query))

    def run_search(item: tuple[str, str]) -> dict:
        institution, query = item
        time.sleep(0.6)
        try:
            match = search_wikidata(query)
        except Exception as error:
            return {"institution": institution, "query": query, "status": "search-error", "error": str(error), "approved": False}
        if not match:
            return {"institution": institution, "query": query, "status": "not-found", "approved": False}
        return {
            "institution": institution,
            "query": query,
            "status": "wikidata",
            "qid": match["id"],
            "entity_label": match.get("label", ""),
            "entity_description": match.get("description", ""),
            "match_score": round(float(match.get("match_score", 0)), 3),
            "approved": False,
        }

    completed = 0
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {executor.submit(run_search, item): item for item in search_queue}
        for future in as_completed(futures):
            candidates.append(future.result())
            completed += 1
            if completed % 20 == 0:
                print(f"searched={completed}/{len(search_queue)}", flush=True)

    candidates.sort(key=lambda record: record["institution"].casefold())
    wikidata_matches = [record for record in candidates if record["status"] == "wikidata"]

    images = load_p18(sorted({record["qid"] for record in wikidata_matches}))
    commons = load_commons_metadata(sorted(set(images.values())))
    for record in wikidata_matches:
        image_title = images.get(record["qid"])
        if not image_title:
            record["status"] = "no-p18"
            continue
        record.update(commons.get(image_title, {"image_title": image_title}))
        bad_title = any(word in normalized(image_title) for word in BAD_IMAGE_WORDS)
        record["approved"] = bool(
            record["match_score"] >= 0.82
            and record.get("download_url")
            and record.get("license")
            and not bad_title
            and image_title not in REJECTED_IMAGE_TITLES
        )
        record["status"] = "candidate" if record["approved"] else "needs-review"

    CANDIDATES_PATH.parent.mkdir(parents=True, exist_ok=True)
    CANDIDATES_PATH.write_text(
        json.dumps(candidates, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    statuses: dict[str, int] = {}
    for record in candidates:
        statuses[record["status"]] = statuses.get(record["status"], 0) + 1
    print(json.dumps(statuses, ensure_ascii=False, sort_keys=True))
    print(f"candidates={CANDIDATES_PATH}")


def preview(existing_only: bool = False) -> None:
    candidates = json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))
    selected = [record for record in candidates if record.get("approved") and record.get("download_url")]
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    def download(record: dict) -> tuple[dict, Path] | None:
        path = PREVIEW_DIR / f"{slugify(record['institution'])}.jpg"
        if existing_only and not path.exists():
            return None
        if not path.exists():
            image = Image.open(io.BytesIO(fetch_bytes(record["download_url"]))).convert("RGB")
            image.thumbnail((900, 600))
            image.save(path, "JPEG", quality=86, optimize=True)
        return record, path

    downloaded: list[tuple[dict, Path]] = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(download, record) for record in selected]
        for index, future in enumerate(as_completed(futures), start=1):
            try:
                result = future.result()
            except Exception as error:
                print(f"preview-error={error}", flush=True)
                continue
            if result:
                downloaded.append(result)
            if index % 20 == 0:
                print(f"downloaded={index}/{len(selected)}", flush=True)
    downloaded.sort(key=lambda item: item[0]["institution"].casefold())

    try:
        font = ImageFont.truetype("arial.ttf", 16)
        number_font = ImageFont.truetype("arialbd.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
        number_font = font

    columns, rows = 4, 4
    cell_width, image_height, label_height = 400, 250, 72
    sheet_size = columns * rows
    sheet_paths: list[Path] = []
    for sheet_index, offset in enumerate(range(0, len(downloaded), sheet_size), start=1):
        sheet = Image.new("RGB", (columns * cell_width, rows * (image_height + label_height)), "white")
        draw = ImageDraw.Draw(sheet)
        for local_index, (record, path) in enumerate(downloaded[offset : offset + sheet_size]):
            column = local_index % columns
            row = local_index // columns
            x = column * cell_width
            y = row * (image_height + label_height)
            image = Image.open(path).convert("RGB")
            image = ImageOps.fit(image, (cell_width, image_height), method=Image.Resampling.LANCZOS)
            sheet.paste(image, (x, y))
            global_index = offset + local_index + 1
            draw.text((x + 8, y + image_height + 6), f"{global_index:03d}", fill="black", font=number_font)
            label = record["institution"]
            words = label.split()
            lines, current = [], ""
            for word in words:
                proposed = f"{current} {word}".strip()
                if draw.textlength(proposed, font=font) <= cell_width - 58:
                    current = proposed
                else:
                    if current:
                        lines.append(current)
                    current = word
            if current:
                lines.append(current)
            draw.multiline_text(
                (x + 54, y + image_height + 7),
                "\n".join(lines[:3]),
                fill="black",
                font=font,
                spacing=2,
            )
        sheet_path = PREVIEW_DIR / f"contact-sheet-{sheet_index:02d}.jpg"
        sheet.save(sheet_path, "JPEG", quality=88, optimize=True)
        sheet_paths.append(sheet_path)

    print(f"previews={len(downloaded)}")
    print(f"sheets={len(sheet_paths)}")
    for path in sheet_paths:
        print(path)


def apply_reviewed() -> None:
    candidates = json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))
    experiences = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    image_map = json.loads(IMAGE_MAP_PATH.read_text(encoding="utf-8"))
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    reviewed = []
    for record in candidates:
        preview_path = PREVIEW_DIR / f"{slugify(record['institution'])}.jpg"
        if (
            record.get("status") == "candidate"
            and record.get("approved")
            and record["institution"] not in REJECTED_INSTITUTIONS
            and preview_path.exists()
        ):
            reviewed.append((record, preview_path))

    by_image: dict[str, list[tuple[dict, Path]]] = {}
    for record, preview_path in reviewed:
        by_image.setdefault(record["image_title"], []).append((record, preview_path))

    new_sources: list[dict] = []
    new_files: dict[str, str] = {}
    for image_title, group in sorted(by_image.items()):
        representative, preview_path = group[0]
        file_slug = normalized(representative.get("entity_label") or representative["institution"])
        file_slug = file_slug.replace(" ", "-")[:90].strip("-")
        destination = IMAGE_DIR / f"{file_slug}.webp"
        if not destination.exists():
            image = Image.open(preview_path).convert("RGB")
            image = ImageOps.fit(image, (1600, 1000), method=Image.Resampling.LANCZOS)
            image.save(destination, "WEBP", quality=86, method=6)
        relative_path = destination.relative_to(ROOT).as_posix()
        for record, _ in group:
            image_map[record["institution"]] = relative_path
            new_files[record["institution"]] = relative_path
        new_sources.append(
            {
                "title": representative.get("entity_label") or representative["institution"],
                "institutions": [record["institution"] for record, _ in group],
                "file": destination.name,
                "image_title": image_title,
                "source_page": representative.get("source_page", ""),
                "author": representative.get("author", ""),
                "license": representative.get("license", ""),
                "license_url": representative.get("license_url", ""),
            }
        )

    reused_institutions: dict[str, str] = {}
    for record in candidates:
        if record.get("status") == "reuse" and record.get("approved"):
            image_map[record["institution"]] = record["local_path"]
            reused_institutions[record["institution"]] = record["local_path"]

    before_missing = sum(not str(item.get("imagen") or "").strip() for item in experiences)
    updated_by_institution: dict[str, int] = {}
    for experience in experiences:
        if str(experience.get("imagen") or "").strip():
            continue
        institution = str(experience.get("nombre") or "").strip()
        image_path = image_map.get(institution)
        if image_path:
            experience["imagen"] = image_path
            updated_by_institution[institution] = updated_by_institution.get(institution, 0) + 1

    DATA_PATH.write_text(json.dumps(experiences, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    IMAGE_MAP_PATH.write_text(
        json.dumps(dict(sorted(image_map.items(), key=lambda item: item[0].casefold())), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    current_sources = SOURCES_PATH.read_text(encoding="utf-8") if SOURCES_PATH.exists() else "# Fuentes de imágenes de universidades\n"
    additions = []
    for source in new_sources:
        if source["source_page"] and source["source_page"] in current_sources:
            continue
        additions.extend(
            [
                "",
                f"## {source['title']}",
                "",
                f"- Instituciones del catálogo: {', '.join(source['institutions'])}",
                f"- Archivo local: `{source['file']}`",
                f"- Archivo en Commons: File:{source['image_title']}",
                f"- Fuente: {source['source_page']}",
                f"- Autor: {source['author'] or 'No indicado en los metadatos recuperados'}",
                f"- Licencia: {source['license']}",
                f"- Enlace de licencia: {source['license_url']}",
                f"- Fecha de consulta: {date.today().isoformat()}",
                "- Modificaciones: Redimensionada, recortada a proporción horizontal 1600x1000 y convertida a WebP.",
            ]
        )
    if additions:
        SOURCES_PATH.write_text(current_sources.rstrip() + "\n" + "\n".join(additions) + "\n", encoding="utf-8")

    remaining = [item for item in experiences if not str(item.get("imagen") or "").strip()]
    remaining_institutions = sorted(
        {str(item.get("nombre") or "").strip() for item in remaining if item.get("nombre")},
        key=str.casefold,
    )
    after_missing = len(remaining)
    report_lines = [
        "# Enriquecimiento de fotografías de experiencias",
        "",
        f"Fecha: {date.today().isoformat()}",
        "",
        "## Resultado",
        "",
        f"- Experiencias sin foto antes: **{before_missing}**",
        f"- Experiencias actualizadas: **{before_missing - after_missing}**",
        f"- Experiencias sin foto después: **{after_missing}**",
        f"- Instituciones con fotografía nueva: **{len(new_files)}**",
        f"- Instituciones que reutilizaron una fotografía local: **{len(reused_institutions)}**",
        f"- Archivos nuevos: **{len(new_sources)}**",
        "",
        "## Instituciones actualizadas",
        "",
    ]
    for institution, count in sorted(updated_by_institution.items(), key=lambda item: item[0].casefold()):
        report_lines.append(f"- {institution}: {count} experiencia(s)")
    report_lines.extend(["", "## Instituciones que siguen sin fotografía", ""])
    report_lines.extend(f"- {institution}" for institution in remaining_institutions)
    report_lines.append("")
    ENRICHMENT_REPORT_PATH.write_text("\n".join(report_lines), encoding="utf-8")

    print(f"experiences_updated={before_missing - after_missing}")
    print(f"missing_after={after_missing}")
    print(f"new_institutions={len(new_files)}")
    print(f"reused_institutions={len(reused_institutions)}")
    print(f"new_files={len(new_sources)}")
    print(f"report={ENRICHMENT_REPORT_PATH}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("discover", "preview", "sheets", "apply"), nargs="?", default="discover")
    args = parser.parse_args()
    if args.command == "discover":
        discover()
    elif args.command == "preview":
        preview()
    elif args.command == "sheets":
        preview(existing_only=True)
    elif args.command == "apply":
        apply_reviewed()


if __name__ == "__main__":
    main()
