from __future__ import annotations

import csv
import json
from collections import Counter
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPERIENCES_PATH = ROOT / "data" / "universidades.json"
CAREERS_PATH = ROOT / "data" / "carreras.json"
REPORT_PATH = ROOT / "reports" / "experiencias-sin-foto.md"
CSV_PATH = ROOT / "reports" / "experiencias-sin-foto.csv"


def localized(value: object, language: str = "es") -> str:
    if isinstance(value, dict):
        return str(value.get(language) or value.get("es") or "").strip()
    return str(value or "").strip()


def markdown_cell(value: object) -> str:
    return str(value or "").replace("|", "\\|").replace("\n", " ").strip()


def main() -> None:
    experiences = json.loads(EXPERIENCES_PATH.read_text(encoding="utf-8"))
    careers = json.loads(CAREERS_PATH.read_text(encoding="utf-8"))
    career_names = {
        career["id"]: localized(career.get("nombre")) or career["id"]
        for career in careers
    }

    missing = [
        experience
        for experience in experiences
        if not str(experience.get("imagen") or "").strip()
    ]
    missing.sort(
        key=lambda item: (
            career_names.get(item.get("carreraId", ""), item.get("carreraId", "")).casefold(),
            -int(item.get("año") or 0),
            str(item.get("nombre") or "").casefold(),
            str(item.get("id") or ""),
        )
    )

    fieldnames = [
        "carrera",
        "carrera_id",
        "año",
        "institución",
        "país",
        "ciudad",
        "tipo_experiencia",
        "campus",
        "alumno",
        "id",
    ]
    rows = []
    for experience in missing:
        career_id = str(experience.get("carreraId") or "")
        rows.append(
            {
                "carrera": career_names.get(career_id, career_id),
                "carrera_id": career_id,
                "año": experience.get("año") or "",
                "institución": experience.get("nombre") or "",
                "país": localized(experience.get("pais")),
                "ciudad": localized(experience.get("ciudad")),
                "tipo_experiencia": localized(experience.get("tipoExperiencia")),
                "campus": localized(experience.get("campus")),
                "alumno": localized(experience.get("alumno")),
                "id": experience.get("id") or "",
            }
        )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    csv_path = CSV_PATH
    try:
        output = csv_path.open("w", encoding="utf-8-sig", newline="")
    except PermissionError:
        csv_path = CSV_PATH.with_name("experiencias-sin-foto-actualizado.csv")
        output = csv_path.open("w", encoding="utf-8-sig", newline="")
    with output:
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    counts = Counter(row["carrera_id"] for row in rows)
    institutions = sorted(
        {str(row["institución"]).strip() for row in rows if str(row["institución"]).strip()},
        key=str.casefold,
    )
    with_photo = len(experiences) - len(missing)
    coverage = (with_photo / len(experiences) * 100) if experiences else 0

    lines = [
        "# Experiencias en el extranjero sin fotografía",
        "",
        f"Fecha del reporte: {date.today().isoformat()}",
        "",
        "## Resumen",
        "",
        f"- Experiencias totales en el catálogo: **{len(experiences)}**",
        f"- Experiencias sin fotografía: **{len(missing)}**",
        f"- Experiencias con fotografía: **{with_photo}**",
        f"- Cobertura fotográfica actual: **{coverage:.1f}%**",
        f"- Instituciones únicas presentes en experiencias sin fotografía: **{len(institutions)}**",
        "",
        "## Totales por carrera",
        "",
        "| Carrera | Carrera ID | Sin fotografía |",
        "|---|---|---:|",
    ]
    for career_id, count in sorted(
        counts.items(), key=lambda pair: career_names.get(pair[0], pair[0]).casefold()
    ):
        lines.append(
            f"| {markdown_cell(career_names.get(career_id, career_id))} | "
            f"{markdown_cell(career_id)} | {count} |"
        )

    lines.extend(
        [
            "",
            "## Detalle de experiencias",
            "",
            "Los campos que no existen en el catálogo se mantienen vacíos.",
            "",
            "| Carrera | Año | Institución | País | Ciudad | Tipo de experiencia | Campus | ID |",
            "|---|---:|---|---|---|---|---|---|",
        ]
    )
    for row in rows:
        lines.append(
            "| "
            + " | ".join(
                markdown_cell(row[field])
                for field in (
                    "carrera",
                    "año",
                    "institución",
                    "país",
                    "ciudad",
                    "tipo_experiencia",
                    "campus",
                    "id",
                )
            )
            + " |"
        )

    lines.extend(["", "## Instituciones únicas sin fotografía", ""])
    lines.extend(f"- {institution}" for institution in institutions)
    lines.append("")
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")

    print(f"total={len(experiences)}")
    print(f"missing={len(missing)}")
    print(f"with_photo={with_photo}")
    print(f"coverage={coverage:.1f}%")
    print(f"unique_institutions={len(institutions)}")
    print(f"markdown={REPORT_PATH}")
    print(f"csv={csv_path}")


if __name__ == "__main__":
    main()
