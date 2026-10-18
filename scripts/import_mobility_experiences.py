"""Incrementally import CSF mobility records into data/universidades.json.

The importer intentionally leaves uncertain cities, translations, and images blank.
Run it from the project root. Use --dry-run to generate the audit without writing data.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT_ROOT / "data" / "universidades.json"
IMAGE_MAP_PATH = PROJECT_ROOT / "data" / "university-images.json"
REPORT_PATH = PROJECT_ROOT / "reports" / "import-experiencias-2023-2026.md"
NEW_PHOTO_FILES = {
    "assets/images/universidades/university-of-california-berkeley.jpg",
    "assets/images/universidades/university-of-westminster.jpg",
}

CAREER_LABELS = {
    "financial-engineering": "Bachelor in Financial Engineering",
    "ai-data-science": "Bachelor in Artificial Intelligence and Data Science Engineering",
    "computacionales": "Ingeniería en Tecnologías Computacionales",
    "transformacion-digital": "Ingeniería en Transformación Digital de Negocios",
    "mecanica": "Ingeniería Mecánica",
    "mecatronica": "Ingeniería Mecatrónica",
    "industrial": "Ingeniería Industrial y de Sistemas",
    "civil": "Ingeniería Civil",
    "desarrollo-sustentable": "Ingeniería en Desarrollo Sustentable",
    "innovacion-desarrollo": "Ingeniería en Innovación y Desarrollo",
}

DIRECT_CAREERS = {
    "IM": "mecanica",
    "IMT": "mecatronica",
    "IIS": "industrial",
    "BIE": "industrial",
    "IC": "civil",
    "IDS": "desarrollo-sustentable",
    "ITC": "computacionales",
    "IID": "innovacion-desarrollo",
    "ITD": "transformacion-digital",
    "IDM": "ai-data-science",
}

COMPUTING_ENTRY = (
    "financial-engineering",
    "ai-data-science",
    "computacionales",
    "transformacion-digital",
)

ENGINEERING_ENTRY = (
    "mecanica",
    "mecatronica",
    "industrial",
    "civil",
    "desarrollo-sustentable",
    "innovacion-desarrollo",
)

ALL_ENTRY_CAREERS = COMPUTING_ENTRY + ENGINEERING_ENTRY

TYPE_TRANSLATIONS = {
    "Semestre Tec": "Tec Semester",
    "Intercambio Internacional Tradicional": "Traditional International Exchange",
    "Concentración Internacional": "International Concentration",
    "Invierno": "Winter Program",
    "Estancia profesional": "Professional Placement",
    "Doble Título": "Double Degree",
    "Estancia de Investigación": "Research Placement",
    "Certificado de Especialidad": "Specialization Certificate",
    "Educación General": "General Education",
    "Verano": "Summer Program",
    "International Advanced Topics": "International Advanced Topics",
    "Intercambio + Prácticas Profesionales": "Exchange + Professional Internship",
    "Advanced Master Placement": "Advanced Master Placement",
}

CAMPUS_TRANSLATIONS = {
    "Cd. México": "Mexico City",
    "Edo. México": "State of Mexico",
}

# Curated only when the institution name identifies a location or a single campus
# can be established with high confidence. Multicampus institutions stay blank.
CITY_BY_INSTITUTION = {
    # Alemania
    "CBS International Business School": "Colonia",
    "Cologne Business School": "Colonia",
    "DHIK-Hochschule Aschaffenburg": "Aschaffenburg",
    "DHIK-Hochschule Esslingen": "Esslingen",
    "DHIK-Hochschule Mannheim": "Mannheim",
    "DHIK-Hochschule für Technik und Wirtschaft Berlin": "Berlín",
    "DHIK-Technische Hochschule Brandenburg": "Brandeburgo",
    "Estancia internacional - Hannover Re": "Hannover",
    "Frankfurt School of Finance and Management": "Fráncfort",
    "HSBA - Hamburg School of Business Administration": "Hamburgo",
    "Hochschule Esslingen": "Esslingen",
    "Hochschule Karlsruhe": "Karlsruhe",
    "Hochschule Reutlingen": "Reutlingen",
    "Hochschule für Angewandte Wissenschaften München": "Múnich",
    "Hochschule für Angewandte Wissenschaften Pforzheim": "Pforzheim",
    "Munich Business School": "Múnich",
    "Ruhr-Universität Bochum": "Bochum",
    "Technische Hochschule Ingolstadt": "Ingolstadt",
    "Technische Hochschule Köln - Köln International School of Design": "Colonia",
    "Technische Universität Dortmund": "Dortmund",
    "Technische Universität Dresden": "Dresde",
    "Technische Universität Hamburg-Harburg": "Hamburgo",
    "Technische Universität Ilmenau": "Ilmenau",
    "Technische Universität München": "Múnich",
    "Technischen Universität Cottbus": "Cottbus",
    "Universität Göttingen": "Gotinga",
    # Argentina
    "Universidad de Belgrano": "Buenos Aires",
    # Australia
    "Macquarie University": "Sídney",
    "Royal Melbourne Institute of Technology": "Melbourne",
    "Swinburne University of Technology": "Melbourne",
    "The University of Melbourne": "Melbourne",
    "The University of Queensland": "Brisbane",
    "The University of Sydney": "Sídney",
    "University of Technology Sydney": "Sídney",
    "University of Wollongong": "Wollongong",
    # Austria
    "MCI Management Center Innsbruck": "Innsbruck",
    "Technische Universität Graz": "Graz",
    # Canadá
    "Estancia Internacional - Canadá - Prince George": "Prince George",
    "The University of British Columbia - Campus Okanagan": "Kelowna",
    "University of Toronto": "Toronto",
    "VGC International College": "Vancouver",
    # China
    "Beijing Institute of Technology": "Pekín",
    "Shanghai University": "Shanghái",
    "The University of Nottingham - China Campus": "Ningbo",
    "Tiangong University": "Tianjin",
    # Colombia
    "Escuela Colombiana de Ingeniería Julio Garavito": "Bogotá",
    "Universidad Tecnológica de Bolívar": "Cartagena",
    "Universidad de los Andes, Colombia": "Bogotá",
    # Corea del Sur
    "INHA University": "Incheon",
    "Yeungnam University": "Gyeongsan",
    # Croacia
    "Algebra University College": "Zagreb",
    "Zagreb School of Economics and Management": "Zagreb",
    # Dinamarca
    "Aalborg Universitet - Faculty of IT and Design": "Aalborg",
    "Aalborg Universitet-Faculty of Engineering and Science": "Aalborg",
    "Copenhagen Business School": "Copenhague",
    "Danmarks Tekniske Universitet": "Kongens Lyngby",
    # España
    "Centro Universitario EDEM": "Valencia",
    "EADA Business School Barcelona": "Barcelona",
    "ESEI International Business School": "Barcelona",
    "ESIC University - Campus Madrid": "Madrid",
    "EU Business School - Campus Barcelona": "Barcelona",
    "Escuela Europea para la Comunicación y las Artes Visuales COCO": "Alicante",
    "Estancia Internacional - Absolute Internship - Barcelona": "Barcelona",
    "Estancia Internacional - Absolute Internship - Madrid": "Madrid",
    "Universidad Antonio de Nebrija": "Madrid",
    "Universidad Autónoma de Madrid": "Madrid",
    "Universidad CEU San Pablo": "Madrid",
    "Universidad Complutense de Madrid - Instituto de Estudios Bursátiles (IEB)": "Madrid",
    "Universidad Politécnica de Madrid": "Madrid",
    "Universidad Politécnica de Madrid - Escuela Técnica Superior de Ingeniería Aeronáutica y del Espacio": "Madrid",
    "Universidad Pontificia Comillas": "Madrid",
    "Universidad Pública de Navarra": "Pamplona",
    "Universidad de Almería": "Almería",
    "Universidad de Burgos": "Burgos",
    "Universidad de Cádiz": "Cádiz",
    "Universidad de Granada": "Granada",
    "Universidad de Jaén": "Jaén",
    "Universidad de Murcia": "Murcia",
    "Universidad de Oviedo": "Oviedo",
    "Universitat Autònoma de Barcelona": "Cerdanyola del Vallès",
    "Universitat Ramón Llull, La Salle": "Barcelona",
    "Universitat de Barcelona": "Barcelona",
    "Universitat de Barcelona - CETT Escola Universitària d'Hoteleria i Turisme": "Barcelona",
    # Estados Unidos
    "Boston University": "Boston",
    "Columbia University": "Nueva York",
    "Cornell University, College of Agriculture and Life Sciences": "Ithaca",
    "Estancia Internacional - Estados Unidos - Boston": "Boston",
    "Estancia Internacional - Estados Unidos - Cambridge": "Cambridge",
    "Harvard Medical School - Brighman Women Hospital": "Boston",
    "The University of Texas at Austin": "Austin",
    "The University of Texas at San Antonio": "San Antonio",
    "University of California at Berkeley": "Berkeley",
    "University of Wisconsin at Madison": "Madison",
    # Finlandia
    "Aalto University School of Business": "Helsinki",
    # Francia
    "Association Léonard de Vinci": "Courbevoie",
    "ESC Rennes School of Business": "Rennes",
    "ESSEC Business School": "Cergy",
    "Estancia Internacional - Paris Saint Germain": "París",
    "SKEMA Business School - Campus Lille": "Lille",
    "École supérieure des Sciences commerciales d'Angers": "Angers",
    # Hong Kong
    "The Chinese University of Hong Kong, Shenzhen": "Shenzhen",
    "The University of Hong Kong": "Hong Kong",
    # Indonesia
    "Universitas Indonesia": "Depok",
    # Irlanda
    "University College Dublin": "Dublín",
    # Italia
    "Istituto Lorenzo de' Medici - Campus Florencia": "Florencia",
    "Politecnico di Milano": "Milán",
    "Scuola Lorenzo de' Medici- Campus Florencia": "Florencia",
    "Scuola Superiore Sant'Anna": "Pisa",
    # Japón
    "Chiba University": "Chiba",
    "Estancia Internacional - Absolute Internship - Tokio": "Tokio",
    "Hiroshima University of Economics": "Hiroshima",
    "Sophia University": "Tokio",
    "Waseda University": "Tokio",
    # Letonia y Lituania
    "Rigas Tehniska Universitate": "Riga",
    "Kauno Technologijos Universitetas": "Kaunas",
    # Noruega
    "BI Norwegian Business School": "Oslo",
    # Países Bajos
    "Hogeschool Rotterdam - Rotterdam Business School": "Róterdam",
    "Hogeschool van Amsterdam": "Ámsterdam",
    "Universiteit Twente": "Enschede",
    "Universiteit van Amsterdam": "Ámsterdam",
    # Portugal
    "Universidade do Porto": "Oporto",
    # Reino Unido
    "University of Birmingham": "Birmingham",
    "University of Essex": "Colchester",
    "University of Hull": "Hull",
    "University of Leeds": "Leeds",
    "University of Southampton": "Southampton",
    "University of Westminster": "Londres",
    # República Checa y Singapur
    "Anglo-American University": "Praga",
    "National University of Singapore": "Singapur",
    # Suecia
    "Estancia Internacional - Absolute Internship - Estocolmo": "Estocolmo",
    "Högskolan i Borås": "Borås",
    "Jönköping School of Education and Communication": "Jönköping",
    "KTH Royal Institute of Technology": "Estocolmo",
    "Södertörns högskola": "Huddinge",
    "Uppsala Universitet": "Uppsala",
    # Suiza
    "EU Business School - Campus Geneva": "Ginebra",
    "Hochschule Luzern": "Lucerna",
    "International University of Geneva": "Ginebra",
    "École Polytéchnique Fédérale de Lausanne": "Lausana",
    # Taiwán
    "National Taiwan University": "Taipéi",
    "National Taiwan University Of Science And Technology": "Taipéi",
}

def text(value: object) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def normalized(value: object) -> str:
    value = unicodedata.normalize("NFKD", text(value)).encode("ascii", "ignore").decode("ascii")
    value = value.casefold().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


CITY_INDEX = {normalized(institution): city for institution, city in CITY_BY_INSTITUTION.items()}


def city_for(institution: object) -> str:
    return CITY_INDEX.get(normalized(institution), "")


def localized_es(value: object) -> str:
    if isinstance(value, dict):
        return text(value.get("es"))
    return text(value)


def experience_key(record: dict, include_city: bool = True) -> tuple:
    parts = [
        record.get("carreraId", ""),
        int(record.get("año") or 0),
        normalized(record.get("nombre")),
        normalized(record.get("pais")),
    ]
    if include_city:
        parts.append(normalized(record.get("ciudad")))
    parts.extend(
        [
            normalized(localized_es(record.get("tipoExperiencia"))),
            normalized(localized_es(record.get("campus"))),
        ]
    )
    return tuple(parts)


def visual_key(record: dict) -> tuple:
    return experience_key(record) + (
        normalized(record.get("alumno")),
        normalized(localized_es(record.get("descripcion"))),
        normalized(record.get("imagen")),
    )


def stable_id(record: dict, used_ids: set[str]) -> str:
    material = "|".join(map(str, experience_key(record)))
    digest = hashlib.sha1(material.encode("utf-8")).hexdigest()[:10]
    career = record["carreraId"][:20]
    candidate = f"mobility-{career}-{record['año']}-{digest}"
    suffix = 2
    while candidate in used_ids:
        candidate = f"mobility-{career}-{record['año']}-{digest}-{suffix}"
        suffix += 1
    used_ids.add(candidate)
    return candidate


def make_image_index(existing: list[dict], image_map: dict[str, str]) -> dict[str, str]:
    index = {}
    for institution, path in image_map.items():
        if text(path):
            index.setdefault(normalized(institution), text(path))
    for record in existing:
        if text(record.get("imagen")):
            index.setdefault(normalized(record.get("nombre")), text(record.get("imagen")))
    return index


def read_source(path: Path) -> list[dict]:
    frame = pd.read_excel(path, sheet_name="CSF")
    if frame.shape[1] != 6:
        raise ValueError(f"La hoja CSF debe tener 6 columnas; se encontraron {frame.shape[1]}.")
    frame.columns = ["year", "campus", "career", "institution", "country", "type"]
    rows = []
    for index, source in frame.iterrows():
        try:
            year = int(source["year"])
        except (TypeError, ValueError):
            year = 0
        rows.append(
            {
                "sourceRow": index + 2,
                "year": year,
                "campus": text(source["campus"]),
                "career": text(source["career"]).upper(),
                "institution": text(source["institution"]),
                "country": text(source["country"]),
                "type": text(source["type"]),
            }
        )
    return rows


def source_identity(row: dict) -> tuple:
    return (
        row["year"],
        normalized(row["institution"]),
        normalized(row["country"]),
        normalized(row["type"]),
        normalized(city_for(row["institution"])),
    )


def candidate_from_row(row: dict, career_id: str, image_index: dict[str, str], preserve_campus: bool) -> dict:
    institution = row["institution"]
    campus = row["campus"] if preserve_campus else ""
    candidate = {
        "id": "",
        "carreraId": career_id,
        "nombre": institution,
        "pais": row["country"],
        "ciudad": city_for(institution),
        "alumno": "",
        "tipoExperiencia": {
            "es": row["type"],
            "en": TYPE_TRANSLATIONS.get(row["type"], ""),
        },
        "año": row["year"],
        "descripcion": {"es": "", "en": ""},
        "areasRelacionadas": {"es": [], "en": []},
        "imagen": image_index.get(normalized(institution), ""),
    }
    if campus:
        candidate["campus"] = {"es": campus, "en": CAMPUS_TRANSLATIONS.get(campus, "")}
    return candidate


def merge_missing(existing: dict, candidate: dict) -> bool:
    changed = False
    for field in ("ciudad", "imagen"):
        if not text(existing.get(field)) and text(candidate.get(field)):
            existing[field] = candidate[field]
            changed = True
    if not localized_es(existing.get("campus")) and localized_es(candidate.get("campus")):
        existing["campus"] = candidate["campus"]
        changed = True
    existing_type = existing.get("tipoExperiencia")
    candidate_type = candidate.get("tipoExperiencia")
    if isinstance(existing_type, dict) and isinstance(candidate_type, dict):
        if not text(existing_type.get("en")) and text(candidate_type.get("en")):
            existing_type["en"] = candidate_type["en"]
            changed = True
    return changed


def parse_country_keys() -> set[str]:
    app_source = (PROJECT_ROOT / "js" / "app.js").read_text(encoding="utf-8")
    block = app_source.split("const countryIsoCodes = {", 1)[1].split("};", 1)[0]
    keys = re.findall(r'^\s{2}(?:"([^"]+)"|([a-z0-9_]+)):', block, re.MULTILINE)
    return {normalized((quoted or bare).replace("_", " ")) for quoted, bare in keys}


def import_records(source_path: Path, dry_run: bool) -> dict:
    existing = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    image_map = json.loads(IMAGE_MAP_PATH.read_text(encoding="utf-8"))
    rows = read_source(source_path)
    image_index = make_image_index(existing, image_map)

    errors = []
    rule_source_rows = Counter()
    raw_candidates = []

    general_rows = [row for row in rows if row["type"] == "Educación General"]
    general_unique = {}
    for row in general_rows:
        general_unique.setdefault(source_identity(row), row)
    rule_source_rows["Educación General"] = len(general_rows)
    for row in general_unique.values():
        for career_id in ALL_ENTRY_CAREERS:
            raw_candidates.append(("Educación General", row, career_id, False))

    for row in rows:
        if row["type"] == "Educación General":
            continue
        code = row["career"]
        if not row["year"] or not row["institution"] or not row["country"] or not row["type"]:
            errors.append(f"Fila {row['sourceRow']}: faltan campos obligatorios de la fuente.")
            continue
        if code == "ICT":
            rule, targets, preserve_campus = "ICT", COMPUTING_ENTRY, False
        elif code == "IRS":
            rule, targets, preserve_campus = "IRS", COMPUTING_ENTRY, False
        elif code == "IIT":
            rule, targets, preserve_campus = "IIT", ENGINEERING_ENTRY, False
        elif code == "IDM":
            rule, targets, preserve_campus = "IDM", ("ai-data-science",), True
        elif code in DIRECT_CAREERS:
            rule, targets, preserve_campus = "Directo", (DIRECT_CAREERS[code],), False
        else:
            errors.append(f"Fila {row['sourceRow']}: sigla no reconocida `{code}`.")
            continue
        rule_source_rows[rule] += 1
        for career_id in targets:
            raw_candidates.append((rule, row, career_id, preserve_campus))

    candidates = []
    seen_candidates = set()
    duplicate_source_assignments = 0
    unique_rule_assignments = Counter()
    raw_rule_assignments = Counter(rule for rule, _row, _career_id, _campus in raw_candidates)
    for rule, row, career_id, preserve_campus in raw_candidates:
        candidate = candidate_from_row(row, career_id, image_index, preserve_campus)
        key = experience_key(candidate)
        if key in seen_candidates:
            duplicate_source_assignments += 1
            continue
        seen_candidates.add(key)
        candidates.append((rule, row, candidate))
        unique_rule_assignments[rule] += 1

    existing_exact = {experience_key(record): record for record in existing}
    existing_without_city = defaultdict(list)
    for record in existing:
        existing_without_city[experience_key(record, include_city=False)].append(record)

    used_ids = {text(record.get("id")) for record in existing}
    new_records = []
    reused = 0
    enriched_existing = 0
    for _rule, _row, candidate in candidates:
        match = existing_exact.get(experience_key(candidate))
        if match is None:
            possible = existing_without_city.get(experience_key(candidate, include_city=False), [])
            if len(possible) == 1 and (not candidate["ciudad"] or not text(possible[0].get("ciudad"))):
                match = possible[0]
        if match is not None:
            reused += 1
            if merge_missing(match, candidate):
                enriched_existing += 1
            continue
        candidate["id"] = stable_id(candidate, used_ids)
        new_records.append(candidate)
        existing_exact[experience_key(candidate)] = candidate
        existing_without_city[experience_key(candidate, include_city=False)].append(candidate)

    final_records = existing + new_records
    final_counts = Counter(record.get("carreraId", "") for record in final_records)
    imported_records = [candidate for _, _, candidate in candidates]
    institutions_without_city = sorted(
        {record["nombre"] for record in imported_records if not text(record.get("ciudad"))},
        key=str.casefold,
    )
    institutions_without_photo = sorted(
        {record["nombre"] for record in imported_records if not text(record.get("imagen"))},
        key=str.casefold,
    )
    reused_photo_paths = {record["imagen"] for record in imported_records if text(record.get("imagen"))}
    assignments_with_city = sum(bool(text(record.get("ciudad"))) for record in imported_records)
    assignments_with_photo = sum(bool(text(record.get("imagen"))) for record in imported_records)

    source_countries = sorted({row["country"] for row in rows})
    supported_country_keys = parse_country_keys()
    unsupported_countries = [country for country in source_countries if normalized(country) not in supported_country_keys]
    for country in unsupported_countries:
        errors.append(f"País no reconocido por el mapa: `{country}`.")

    campus_errors = [
        record["id"]
        for record in new_records
        if localized_es(record.get("campus")) and record.get("carreraId") != "ai-data-science"
    ]
    if campus_errors:
        errors.append("Campus apareció fuera de BI/BIDM: " + ", ".join(campus_errors))

    final_duplicate_keys = Counter(visual_key(record) for record in final_records)
    visual_duplicates = sum(count - 1 for count in final_duplicate_keys.values() if count > 1)

    metrics = {
        "source_path": source_path,
        "rows_read": len(rows),
        "new_records": len(new_records),
        "reused": reused,
        "enriched_existing": enriched_existing,
        "duplicate_source_assignments": duplicate_source_assignments,
        "duplicates_avoided_total": duplicate_source_assignments + reused,
        "existing_records_before": len(existing),
        "records_after": len(final_records),
        "final_counts": final_counts,
        "rule_source_rows": rule_source_rows,
        "unique_rule_assignments": unique_rule_assignments,
        "raw_rule_assignments": raw_rule_assignments,
        "general_unique": len(general_unique),
        "raw_assignments": len(raw_candidates),
        "unique_candidates": len(candidates),
        "assignments_with_city": assignments_with_city,
        "institutions_without_city": institutions_without_city,
        "assignments_with_photo": assignments_with_photo,
        "reused_photo_paths": reused_photo_paths,
        "new_photo_paths": reused_photo_paths & NEW_PHOTO_FILES,
        "institutions_without_photo": institutions_without_photo,
        "errors": errors,
        "visual_duplicates": visual_duplicates,
        "source_countries": source_countries,
        "new_records_data": new_records,
    }

    if not dry_run:
        DATA_PATH.write_text(json.dumps(final_records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_report(metrics, dry_run)
    return metrics


def bullets(items: list[str], empty: str = "- Ninguno.") -> str:
    return "\n".join(f"- {item}" for item in items) if items else empty


def write_report(metrics: dict, dry_run: bool) -> None:
    final_counts = metrics["final_counts"]
    source_rows = metrics["rule_source_rows"]
    assignments = metrics["unique_rule_assignments"]
    raw_assignments = metrics["raw_rule_assignments"]
    career_lines = [
        f"- {CAREER_LABELS[career]} (`{career}`): {final_counts.get(career, 0)}"
        for career in ALL_ENTRY_CAREERS
    ]
    rule_lines = []
    for rule in ("ICT", "IRS", "IIT", "IDM", "Educación General", "Directo"):
        source_count = source_rows.get(rule, 0)
        unique_count = assignments.get(rule, 0)
        if rule == "Educación General":
            source_detail = f"{source_count} filas, {metrics['general_unique']} experiencias únicas"
        else:
            source_detail = f"{source_count} filas"
        rule_lines.append(
            f"- {rule}: {source_detail}; {raw_assignments.get(rule, 0)} asignaciones antes de consolidar; "
            f"{unique_count} asignaciones únicas."
        )

    warnings = list(metrics["errors"])
    if metrics["visual_duplicates"]:
        warnings.append(
            f"El conjunto final contiene {metrics['visual_duplicates']} fichas visualmente idénticas; requieren revisión manual."
        )
    warnings.append(
        "La fuente clasifica The Chinese University of Hong Kong, Shenzhen bajo Hong Kong; se conservó el país del Excel y se asignó Shenzhen como ciudad."
    )
    warnings.append(
        "Las fotografías restantes se dejaron vacías cuando no se encontró una opción representativa con licencia comprobada."
    )

    report = f"""# Auditoría de importación de experiencias 2023-2026

- Fecha: {date.today().isoformat()}
- Fuente: `{metrics['source_path']}`
- Hoja: `CSF`
- Modo: {'simulación (sin escritura del JSON)' if dry_run else 'importación aplicada'}

## Reglas utilizadas

1. `Educación General` tuvo prioridad, se deduplicó por año, institución, país, tipo y ciudad, y se distribuyó a las 10 carreras.
2. `ICT` y `IRS` se distribuyeron a las cuatro carreras de Entrada Computación.
3. `IIT` se distribuyó a las seis carreras de Entrada Ingeniería.
4. `IDM` se asignó únicamente a `ai-data-science` y conservó su campus de origen.
5. `BIE` e `IIS` se mapearon a `industrial`; las demás siglas usaron el mapeo directo documentado en el script.
6. Se consolidaron fichas visualmente idénticas dentro de la misma carrera y se conservaron registros existentes más ricos.

## A. Importación

- Filas leídas: {metrics['rows_read']}
- Registros existentes antes de importar: {metrics['existing_records_before']}
- Asignaciones producidas antes de deduplicar: {metrics['raw_assignments']}
- Asignaciones únicas del Excel: {metrics['unique_candidates']}
- Experiencias nuevas creadas: {metrics['new_records']}
- Registros existentes reutilizados: {metrics['reused']}
- Registros existentes completados con datos faltantes: {metrics['enriched_existing']}
- Duplicados del Excel evitados: {metrics['duplicate_source_assignments']}
- Duplicados evitados en total, incluyendo coincidencias existentes: {metrics['duplicates_avoided_total']}
- Registros totales después de importar: {metrics['records_after']}

## B. Distribución

### Experiencias finales por carrera

{chr(10).join(career_lines)}

### Reglas de distribución

{chr(10).join(rule_lines)}

## C. Ciudades

- Asignaciones únicas del Excel con ciudad confirmada: {metrics['assignments_with_city']} de {metrics['unique_candidates']}
- Instituciones sin ciudad confirmada: {len(metrics['institutions_without_city'])}

Instituciones sin ciudad:

{bullets(metrics['institutions_without_city'])}

## D. Fotografías

- Asignaciones únicas del Excel con fotografía local: {metrics['assignments_with_photo']}
- Archivos de fotografía existentes reutilizados: {len(metrics['reused_photo_paths'] - metrics['new_photo_paths'])}
- Fotografías nuevas descargadas: {len(metrics['new_photo_paths'])}
- Instituciones sin fotografía: {len(metrics['institutions_without_photo'])}

Instituciones sin fotografía:

{bullets(metrics['institutions_without_photo'])}

## E. Errores o casos ambiguos

{bullets(warnings)}

## Mapeo de siglas

- `IM` → `mecanica`
- `IMT` → `mecatronica`
- `IIS`, `BIE` → `industrial`
- `IC` → `civil`
- `IDS` → `desarrollo-sustentable`
- `ITC` → `computacionales`
- `IID` → `innovacion-desarrollo`
- `ITD` → `transformacion-digital`
- `IDM` → `ai-data-science`
- `ICT`, `IRS` → todas las carreras de Entrada Computación
- `IIT` → todas las carreras de Entrada Ingeniería
"""
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(report, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Ruta al archivo Movilidad EIC 2023-26 - CSF.xlsx")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    metrics = import_records(args.source, args.dry_run)
    print(json.dumps({
        "rows_read": metrics["rows_read"],
        "new_records": metrics["new_records"],
        "reused": metrics["reused"],
        "duplicates_avoided": metrics["duplicates_avoided_total"],
        "errors": metrics["errors"],
        "report": str(REPORT_PATH),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
