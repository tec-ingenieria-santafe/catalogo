"""Migrate public catalog copy to {es, en} without changing technical fields."""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CACHE_PATH = ROOT / "scripts" / "translation-cache.json"
CACHE = json.loads(CACHE_PATH.read_text(encoding="utf-8")) if CACHE_PATH.exists() else {}

CAREER_NAMES = {
    "mecanica": "Mechanical Engineering",
    "mecatronica": "Bachelor in Mechatronics",
    "industrial": "Bachelor in Industrial Engineering",
    "civil": "Civil Engineering",
    "desarrollo-sustentable": "Sustainable Development Engineering",
    "financial-engineering": "Bachelor in Financial Engineering",
    "ai-data-science": "Bachelor in Artificial Intelligence and Data Science Engineering",
    "computacionales": "Computer Technologies Engineering",
    "innovacion-desarrollo": "Innovation and Development Engineering",
    "transformacion-digital": "Digital Business Transformation Engineering",
    "catalyst": "CATALYST",
    "quantum": "QUANTUM",
}

EXACT_TERMS = {
    "Socios formadores": "Industry Partners",
    "Proyectos de estudiantes": "Student Projects",
    "Experiencias en el extranjero": "International Experiences",
    "Empleabilidad": "Career Outcomes",
    "Vivencia": "Student Life",
    "Comunidad motivada": "Motivated Community",
    "Actividades opcionales": "Optional Activities",
    "Testimonios de estudiantes": "Student Testimonials",
    "Mentoría": "Mentoring",
    "Vinculación": "Industry Engagement",
    "Generación": "Class Year",
    "Semestre": "Semester",
    "Contenido temporal": "Temporary content",
    "Contenido pendiente": "Content pending",
}

POST_REPLACEMENTS = {
    "training partners": "industry partners",
    "formative partners": "industry partners",
    "experiences abroad": "international experiences",
    "Tec Semester": "Tec Semester",
    "Tec Week": "Tec Week",
    "Santa Fe Campus": "Santa Fe Campus",
}

FINAL_REPLACEMENTS = {
    "Manufacture": "Manufacturing",
    "Semi-annual challenge": "Semester Challenge",
    "connection projects with the industry": "industry engagement projects",
    "connection with the industry": "industry engagement",
    "Engineering entrance": "Engineering Entry",
    "engineering entrance": "Engineering Entry",
    "university career": "university journey",
    "beginning of their career": "beginning of their program",
    "starting their career in Engineering": "starting their Engineering program",
}


def translate_line(text: str) -> str:
    stripped = text.strip()
    if not stripped:
        return ""
    if stripped in EXACT_TERMS:
        return EXACT_TERMS[stripped]
    if stripped in CACHE:
        return CACHE[stripped]
    query = urllib.parse.urlencode(
        {"client": "gtx", "sl": "es", "tl": "en", "dt": "t", "q": stripped}
    )
    request = urllib.request.Request(
        f"https://translate.googleapis.com/translate_a/single?{query}",
        headers={"User-Agent": "Mozilla/5.0 catalog-content-migration"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    translated = "".join(part[0] for part in payload[0] if part and part[0]).strip()
    for source, replacement in POST_REPLACEMENTS.items():
        translated = translated.replace(source, replacement)
    CACHE[stripped] = translated
    time.sleep(0.08)
    return translated


def translate_text(text: str) -> str:
    if not text.strip():
        return ""
    output = []
    for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        marker = ""
        content = line
        if line.startswith("- ") or line.startswith("* "):
            marker, content = line[:2], line[2:]
        translated = translate_line(content) if content.strip() else ""
        output.append(f"{marker}{translated}" if translated else "")
    return "\n".join(output)


def localized(value):
    if isinstance(value, dict) and ("es" in value or "en" in value):
        es_value = value.get("es", "")
        en_value = value.get("en", "")
        if isinstance(es_value, list):
            return {
                "es": es_value,
                "en": en_value if isinstance(en_value, list) and en_value else [translate_text(str(item)) for item in es_value],
            }
        return {"es": es_value, "en": en_value or translate_text(str(es_value))}
    if isinstance(value, list):
        return {"es": value, "en": [translate_text(str(item)) for item in value]}
    if isinstance(value, str):
        return {"es": value, "en": translate_text(value)}
    return value


def localize_fields(record: dict, fields: list[str]) -> None:
    for field in fields:
        if field in record:
            record[field] = localized(record[field])


def read(name: str):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def write(name: str, data) -> None:
    (ROOT / "data" / name).write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def refine_english(value):
    if isinstance(value, dict):
        if isinstance(value.get("en"), str):
            for source, replacement in FINAL_REPLACEMENTS.items():
                value["en"] = value["en"].replace(source, replacement)
        elif isinstance(value.get("en"), list):
            value["en"] = [refine_english_string(item) for item in value["en"]]
        for child in value.values():
            refine_english(child)
    elif isinstance(value, list):
        for child in value:
            refine_english(child)
    return value


def refine_english_string(value):
    text = str(value)
    for source, replacement in FINAL_REPLACEMENTS.items():
        text = text.replace(source, replacement)
    return text


def migrate_site() -> None:
    data = read("site.json")
    localize_fields(data, ["tituloSitio", "subtitulo", "textoBienvenida", "descripcion"])
    data["assetsVersion"] = "20260724-33"
    localize_fields(data.get("heroImage", {}), ["alt"])
    localize_fields(data.get("footer", {}), ["texto"])
    for link in data.get("redesSociales", []):
        localize_fields(link, ["nombre"])
    write("site.json", data)


def migrate_careers() -> None:
    data = read("carreras.json")
    for record in data:
        career_id = record.get("id", "")
        spanish_name = record.get("nombre", "")
        if isinstance(spanish_name, dict):
            spanish_name = spanish_name.get("es", "")
        record["nombre"] = {"es": spanish_name, "en": CAREER_NAMES.get(career_id, spanish_name)}
        localize_fields(record, ["esParaTi", "porQueSantaFe", "queEs", "tagline", "highlights", "requisitos"])
        if "subtitulo" in record:
            subtitle = record["subtitulo"]
            if not isinstance(subtitle, dict):
                record["subtitulo"] = {"es": subtitle, "en": subtitle}
            elif subtitle.get("es") and not subtitle.get("en"):
                subtitle["en"] = subtitle["es"]
        if "nombreCorto" in record:
            short = record["nombreCorto"]
            if not isinstance(short, dict):
                record["nombreCorto"] = {"es": short, "en": short}
        for item in record.get("santaFeFichas", []):
            localize_fields(item, ["titulo", "descripcion"])
    write("carreras.json", data)


def migrate_array_file(name: str, fields: list[str]) -> None:
    data = read(name)
    for record in data:
        localize_fields(record, fields)
    write(name, data)


def migrate_special_program(name: str) -> None:
    data = read(name)
    for section in data.get("secciones", []):
        localize_fields(section, ["titulo", "descripcion", "bullets"])
    for detail in data.get("detalles", []):
        localize_fields(detail, ["titulo", "descripcion", "etiquetas"])
    write(name, data)


def main() -> None:
    migrate_site()
    migrate_careers()
    migrate_array_file("proyectos.json", ["titulo", "descripcion", "tecnologias"])
    migrate_array_file("socios.json", ["descripcion", "tiposInteraccion"])
    migrate_array_file("universidades.json", ["tipoExperiencia", "descripcion", "areasRelacionadas"])
    migrate_array_file("exatecs.json", ["puestoActual", "descripcion"])
    migrate_array_file("vivencia.json", ["titulo", "descripcion", "etiquetas"])
    migrate_special_program("catalyst.json")
    migrate_special_program("quantum.json")
    for path in (ROOT / "data").glob("*.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        path.write_text(json.dumps(refine_english(data), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CACHE_PATH.write_text(json.dumps(CACHE, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Migrated bilingual content; cached translations: {len(CACHE)}")


if __name__ == "__main__":
    main()
