const app = document.querySelector("#app");
const siteFooter = document.querySelector("#site-footer");

const dataFiles = {
  site: "data/site.json",
  carreras: "data/carreras.json",
  proyectos: "data/proyectos.json",
  socios: "data/socios.json",
  universidades: "data/universidades.json",
  exatecs: "data/exatecs.json",
  catalyst: "data/catalyst.json",
  vivencia: "data/vivencia.json",
};

const sectionMeta = {
  proyectos: {
    title: "Proyectos de estudiantes",
    short: "Galería de prototipos, soluciones y retos desarrollados por estudiantes.",
  },
  socios: {
    title: "Socios formadores",
    short: "Empresas e instituciones que colaboran con retos, mentoría y experiencias.",
  },
  universidades: {
    title: "Universidades extranjeras",
    short: "Convenios internacionales y rutas de intercambio relacionadas con la carrera.",
  },
  exatecs: {
    title: "EXATECs destacados",
    short: "Perfiles de egresados que conectan la formación en Santa Fe con la industria.",
  },
  "santa-fe": {
    title: "¿Por qué estudiar esta carrera en Santa Fe?",
    short: "Laboratorios, ubicación, CATALYST, comunidad y ventajas específicas del campus.",
  },
  vivencia: {
    title: "Vivencia",
    short: "Conoce experiencias que complementan la formación de los estudiantes dentro y fuera del aula.",
  },
};

let siteData = null;
let adminState = null;
let pendingUniversityMap = null;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function escapeAttr(value) {
  return escapeHTML(value).replace(/`/g, "&#96;");
}

function fullName(career) {
  if (career?.tipo === "catalyst") return career.nombre;
  if (!career?.subtitulo) return career?.nombre ?? "";
  return `${career.nombre} (${career.subtitulo})`;
}

function heroTitleClass(title) {
  const length = title.length;
  if (length >= 56) return "hero-title hero-title-xlong";
  if (length >= 38) return "hero-title hero-title-long";
  if (length >= 32) return "hero-title hero-title-medium";
  return "hero-title";
}

function styleVars(career) {
  const coverImage = career.coverImage || career.imagenCover || career.imagen;
  const variables = [
    `--accent: ${career.colorPrincipal}`,
    `--secondary-accent: ${career.colorSecundario}`,
    `--gradient: ${career.degradado}`,
  ];
  if (coverImage) {
    variables.push(`--career-image: url('${escapeAttr(assetUrl(coverImage))}')`);
  }
  return variables.join("; ");
}

function sectionImageKey(slug) {
  return slug === "santa-fe" ? "santaFe" : slug;
}

function sectionImageFor(career, slug) {
  const key = sectionImageKey(slug);
  if (slug === "vivencia") {
    return career.sectionImages?.vivencia || "assets/images/vivencia/bootcamps.jpg";
  }
  return career.sectionImages?.[key] || career.sectionImages?.[slug] || career.coverImage || career.imagenCover || career.imagen;
}

function mediaStyle(path) {
  return path ? `style="--media-image: url('${escapeAttr(assetUrl(path))}')"` : "";
}

function assetUrl(path) {
  if (!path || /^(https?:|data:|blob:)/i.test(path)) return path;
  return new URL(path, document.baseURI).href;
}

function normalizeCountryName(country) {
  return String(country ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function countryFlagEmoji(country) {
  const flags = {
    alemania: "🇩🇪",
    australia: "🇦🇺",
    canada: "🇨🇦",
    china: "🇨🇳",
    "corea del sur": "🇰🇷",
    espana: "🇪🇸",
    "estados unidos": "🇺🇸",
    francia: "🇫🇷",
    italia: "🇮🇹",
    japon: "🇯🇵",
    "paises bajos": "🇳🇱",
    "reino unido": "🇬🇧",
    suiza: "🇨🇭",
  };
  return flags[normalizeCountryName(country)] ?? "";
}

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function semesterRank(value) {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function yearValue(item) {
  return numericValue(item["año"] ?? item.anio ?? item.ano);
}

function generationRank(value) {
  const matches = String(value ?? "").match(/\d{4}/g);
  if (!matches?.length) return 0;
  return Number(matches[matches.length - 1]);
}

function normalizedText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function uniqueOptions(items, mapper, sorter = null) {
  const options = [];
  const seen = new Set();
  items.forEach((item) => {
    const value = mapper(item);
    if (value === undefined || value === null || value === "") return;
    const key = String(value);
    if (seen.has(key)) return;
    seen.add(key);
    options.push(key);
  });
  return sorter ? options.sort(sorter) : options;
}

function numberOptionSort(a, b) {
  return numericValue(a) - numericValue(b);
}

function semesterOptionSort(a, b) {
  return semesterRank(a) - semesterRank(b);
}

function renderListingControls({ filters = [], resultLabel = "registros", singularLabel = "registro" }) {
  return `
    <div class="listing-tools" data-result-label="${escapeAttr(resultLabel)}" data-result-singular="${escapeAttr(singularLabel)}">
      <div class="listing-controls">
        ${filters.map(renderFilterSelect).join("")}
        <label class="listing-label">
          Ordenar por
          <select class="listing-select" data-sort-control>
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="alpha">Alfabético (A-Z)</option>
          </select>
        </label>
      </div>
      <p class="result-counter" data-result-counter></p>
    </div>
  `;
}

function renderFilterSelect(filter) {
  return `
    <label class="listing-label">
      ${escapeHTML(filter.label)}
      <select class="listing-select" data-filter="${escapeAttr(filter.id)}">
        <option value="__all__">Todos</option>
        ${filter.options.map((option) => `<option value="${escapeAttr(option)}">${escapeHTML(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function attachListingControls() {
  document.querySelectorAll("[data-listing-region]").forEach((region) => {
    region.querySelectorAll("[data-filter], [data-sort-control]").forEach((control) => {
      control.addEventListener("change", () => applyListingControls(region));
    });
    applyListingControls(region);
  });
}

function applyListingControls(region) {
  const grid = region.querySelector("[data-listing-grid]");
  if (!grid) return;
  const cards = [...grid.querySelectorAll("[data-filterable-card]")];
  const filters = [...region.querySelectorAll("[data-filter]")];
  const sortMode = region.querySelector("[data-sort-control]")?.value ?? "recent";

  cards
    .sort((a, b) => compareFilterableCards(a, b, sortMode))
    .forEach((card) => grid.append(card));

  let visibleCount = 0;
  cards.forEach((card) => {
    const isVisible = filters.every((filter) => {
      if (filter.value === "__all__") return true;
      return card.dataset[filter.dataset.filter] === filter.value;
    });
    card.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  const counter = region.querySelector("[data-result-counter]");
  if (!counter) return;
  const labelSource = region.querySelector("[data-result-label]");
  const label = visibleCount === 1 ? labelSource?.dataset.resultSingular ?? "registro" : labelSource?.dataset.resultLabel ?? "registros";
  counter.textContent = visibleCount
    ? `Mostrando ${visibleCount} ${label}`
    : "No hay registros que coincidan con los filtros seleccionados.";
}

function compareFilterableCards(a, b, sortMode) {
  if (sortMode === "alpha") {
    return (a.dataset.title ?? "").localeCompare(b.dataset.title ?? "", "es", { sensitivity: "base" });
  }
  const aDate = numericValue(a.dataset.dateSort);
  const bDate = numericValue(b.dataset.dateSort);
  const direction = sortMode === "oldest" ? 1 : -1;
  const dateResult = (aDate - bDate) * direction;
  if (dateResult !== 0) return dateResult;
  return (a.dataset.title ?? "").localeCompare(b.dataset.title ?? "", "es", { sensitivity: "base" });
}

function youtubeEmbedUrl(value) {
  if (!value || typeof value !== "string") return "";
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host.endsWith("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) {
        id = url.pathname.split("/").filter(Boolean)[1] || "";
      } else if (url.pathname.startsWith("/shorts/")) {
        id = url.pathname.split("/").filter(Boolean)[1] || "";
      } else {
        id = url.searchParams.get("v") || "";
      }
    }
    if (!/^[\w-]{11}$/.test(id)) return "";
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return "";
  }
}

function byCareer(collection, careerId) {
  return collection.filter((item) => item.carreraId === careerId);
}

async function loadData() {
  const entries = await Promise.all(
    Object.entries(dataFiles).map(async ([key, url]) => {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
      return [key, await response.json()];
    }),
  );
  return Object.fromEntries(entries);
}

function renderLoading() {
  app.innerHTML = `
    <section class="catalog-section">
      <div class="section-heading">
        <div>
          <h2>Cargando catálogo</h2>
          <p>Preparando carreras, proyectos y datos editables.</p>
        </div>
      </div>
    </section>
  `;
}

function renderLoadError(error) {
  app.innerHTML = `
    <section class="catalog-section">
      <div class="section-heading">
        <div>
          <h2>No se pudieron cargar los datos</h2>
          <p>Los archivos JSON viven en <strong>data</strong>. Para leerlos, abre el sitio desde un servidor local en vez de abrir el HTML como archivo local.</p>
          <p class="error-text">${escapeHTML(error.message)}</p>
        </div>
      </div>
    </section>
  `;
}

function renderFooter() {
  if (!siteFooter || !siteData?.site) return;
  const { footer, redesSociales } = siteData.site;
  siteFooter.innerHTML = `
    <div class="footer-inner">
      <div>
        <p>${escapeHTML(footer.texto)}</p>
        <small>${escapeHTML(footer.institucion)} · ${escapeHTML(footer.campus)}</small>
      </div>
      <nav class="footer-links" aria-label="Redes sociales">
        ${redesSociales
          .map((link) => `<a href="${escapeAttr(link.url)}" target="_blank" rel="noreferrer">${escapeHTML(link.nombre)}</a>`)
          .join("")}
      </nav>
    </div>
  `;
}

function renderHome() {
  const site = siteData.site;
  const programs = siteData.carreras;
  app.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <p class="eyebrow">${escapeHTML(site.subtitulo)}</p>
        <p class="welcome-line">${escapeHTML(site.textoBienvenida)}</p>
        <h1>${escapeHTML(site.tituloSitio)}</h1>
        <p class="hero-copy">${escapeHTML(site.descripcion)}</p>
        <div class="hero-actions">
          <a class="button secondary" href="#catalogo">Ver carreras</a>
          <a class="button" href="#programa/catalyst">Explorar CATALYST</a>
        </div>
      </div>
      <div class="hero-logo-stack" aria-label="Identidades del catálogo">
        <img class="hero-logo project-logo" src="${escapeAttr(site.logos.hechoEnSantaFe)}" alt="Hecho en Santa Fe" />
        <img class="hero-logo institutional-logo" src="${escapeAttr(site.logos.escuelaIngenieriaCiencias)}" alt="Escuela de Ingeniería y Ciencias" />
      </div>
    </section>

    <section class="catalog-section" id="catalogo">
      <div class="section-heading catalog-heading">
        <div>
          <h2>Catálogo de programas</h2>
        </div>
      </div>
      <div class="program-grid">
        ${programs.map(renderProgramCard).join("")}
      </div>
    </section>
  `;
}

function renderProgramCard(program) {
  const isCatalyst = program.tipo === "catalyst";
  const actionText = isCatalyst ? "Explorar programa" : "Explorar carrera";
  const body = isCatalyst
    ? `<div><strong>¿Qué es?</strong>${escapeHTML(program.queEs)}</div>`
    : `<div><strong>¿Es para ti?</strong>${escapeHTML(program.esParaTi)}</div>
       <div><strong>¿Por qué Santa Fe?</strong>${escapeHTML(program.porQueSantaFe)}</div>`;

  return `
    <article class="program-card" style="${styleVars(program)}">
      <h3>${escapeHTML(fullName(program))}</h3>
      <div class="tag-row">
        ${program.highlights.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
      </div>
      <div class="card-copy">${body}</div>
      <div class="card-footer">
        <a class="button" href="#programa/${program.id}">${actionText}</a>
      </div>
    </article>
  `;
}

function renderCareerHub(career) {
  const availableSections = career.seccionesDisponibles
    .map((slug) => ({ slug, ...sectionMeta[slug] }))
    .filter((section) => section.title);

  app.innerHTML = `
    <div class="theme-scope" style="${styleVars(career)}">
      ${renderDetailHero(career, "INGENIERÍA - SANTA FE", "Explora proyectos, aliados, movilidad internacional, comunidad EXATEC y ventajas del campus.")}
      <section class="detail-shell career-sections-shell">
        <div class="section-grid clickable-grid">
          ${availableSections.map((section, index) => renderSectionLink(career, section, index)).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderSectionLink(career, section, index) {
  const href = section.slug === "vivencia" ? `#vivencia/${career.id}` : `#programa/${career.id}/${section.slug}`;
  return `
    <a class="info-panel section-link-card" href="${href}">
      <div class="section-card-media media-crop-${index + 1}" ${mediaStyle(sectionImageFor(career, section.slug))}></div>
      <h2><span class="section-dot" aria-hidden="true"></span>${escapeHTML(section.title)}</h2>
      <p>${escapeHTML(section.short)}</p>
      <span class="text-link">Abrir sección</span>
    </a>
  `;
}

function renderVivenciaPage(fromCareer = null) {
  const experiences = siteData.vivencia ?? [];
  const theme = {
    tipo: "vivencia",
    nombre: "Vivencia",
    colorPrincipal: "#0055a6",
    colorSecundario: "#00a3c7",
    degradado: "linear-gradient(135deg, rgba(0, 85, 166, 0.96), rgba(0, 163, 199, 0.88))",
    coverImage: "assets/images/vivencia/bootcamps.jpg",
    tagline: "Experiencias generales del campus que complementan la vida académica, profesional y comunitaria.",
  };

  app.innerHTML = `
    <div class="theme-scope" style="${styleVars(theme)}">
      ${renderDetailHero(theme, "VIVENCIA - SANTA FE", theme.tagline)}
      <section class="detail-shell" data-listing-region>
        ${renderListingControls({
          filters: [
            {
              id: "category",
              label: "Categoría",
              options: uniqueOptions(experiences, (experience) => experience.categoria),
            },
          ],
          resultLabel: "experiencias",
          singularLabel: "experiencia",
        })}
        <div class="content-grid project-grid" data-listing-grid>
          ${experiences.map((experience, index) => renderVivenciaCard(experience, index)).join("")}
        </div>
        ${renderVivenciaNav(fromCareer)}
      </section>
    </div>
  `;
  attachListingControls();
}

function renderVivenciaCard(experience, index) {
  const embedUrl = youtubeEmbedUrl(experience.media);
  const showVideo = experience.mediaType === "video" && embedUrl;
  const media = showVideo
    ? `
      <div class="video-frame project-media">
        <iframe
          src="${escapeAttr(embedUrl)}"
          title="Vivencia: ${escapeAttr(experience.titulo)}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen>
        </iframe>
      </div>
    `
    : `<div class="image-tile project-media media-crop-${(index % 5) + 1}" ${mediaStyle(experience.media)}></div>`;

  return `
    <article
      class="feature-card project-card"
      data-filterable-card
      data-category="${escapeAttr(experience.categoria)}"
      data-date-sort="${yearValue(experience)}"
      data-title="${escapeAttr(experience.titulo)}">
      ${media}
      <div class="feature-body">
        <p class="mini-label">${escapeHTML(experience.categoria)}</p>
        <h2>${escapeHTML(experience.titulo)}</h2>
        <p>${escapeHTML(experience.descripcion)}</p>
        <div class="tag-row">
          ${(experience.etiquetas ?? []).map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
        </div>
        <dl class="meta-list">
          <div><dt>Año</dt><dd>${escapeHTML(experience["año"] ?? experience.ano ?? "")}</dd></div>
          ${
            experience.enlace
              ? `<div><dt>Enlace</dt><dd><a class="text-link" href="${escapeAttr(experience.enlace)}" target="_blank" rel="noreferrer">Abrir recurso</a></dd></div>`
              : ""
          }
        </dl>
      </div>
    </article>
  `;
}

function renderVivenciaNav(fromCareer) {
  return `
    <nav class="page-nav" aria-label="Navegación de Vivencia">
      ${fromCareer ? `<a class="button ghost" href="#programa/${fromCareer.id}">Volver a la carrera</a>` : ""}
      <a class="button secondary" href="#inicio">Volver al catálogo principal</a>
    </nav>
  `;
}

function renderDetailHero(career, eyebrow, copy, sectionTitle = "") {
  const title = sectionTitle || fullName(career);
  return `
    <section class="detail-hero">
      <div class="detail-hero-inner">
        <div class="breadcrumb-row">
          <a class="back-link" href="#inicio">← Catálogo</a>
          ${career.tipo === "career" && sectionTitle ? `<a class="back-link" href="#programa/${career.id}">← Carrera</a>` : ""}
        </div>
        <p class="eyebrow">${escapeHTML(eyebrow)}</p>
        <h1 class="${heroTitleClass(title)}">${escapeHTML(title)}</h1>
        <p>${escapeHTML(copy || career.tagline)}</p>
      </div>
    </section>
  `;
}

function renderSubpage(career, slug, pathParts = []) {
  const section = sectionMeta[slug];
  if (!section || !career.seccionesDisponibles.includes(slug)) {
    renderCareerHub(career);
    return;
  }

  const renderers = {
    proyectos: renderProjectsPage,
    socios: renderPartnersPage,
    universidades: renderUniversitiesPage,
    exatecs: renderExatecsPage,
    "santa-fe": renderSantaFePage,
  };

  app.innerHTML = `
    <div class="theme-scope" style="${styleVars(career)}">
      ${renderDetailHero(career, "Vista de carrera", section.short, section.title)}
      ${renderers[slug](career, pathParts)}
    </div>
  `;
  attachListingControls();
  initializePendingUniversityMap();
}

function renderProjectsPage(career) {
  const projects = byCareer(siteData.proyectos, career.id);
  return `
    <section class="detail-shell" data-listing-region>
      ${renderListingControls({
        filters: [
          {
            id: "year",
            label: "Año",
            options: uniqueOptions(projects, (project) => project["año"], numberOptionSort),
          },
          {
            id: "semester",
            label: "Semestre",
            options: uniqueOptions(projects, (project) => project.semestre, semesterOptionSort),
          },
        ],
        resultLabel: "proyectos",
        singularLabel: "proyecto",
      })}
      <div class="content-grid project-grid" data-listing-grid>
        ${projects.map((project, index) => renderProject(project, index, career)).join("")}
      </div>
      ${renderPageNav(career)}
    </section>
  `;
}

function renderProject(project, index, career) {
  const embedUrl = youtubeEmbedUrl(project.youtubeUrl);
  const media = embedUrl
    ? `
      <div class="video-frame project-media">
        <iframe
          src="${escapeAttr(embedUrl)}"
          title="Video de ejemplo: ${escapeAttr(project.titulo)}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen>
        </iframe>
      </div>
    `
    : `<div class="image-tile project-media media-crop-${(index % 5) + 1}" ${mediaStyle(project.thumbnail)}></div>`;

  return `
    <article
      class="feature-card project-card"
      data-filterable-card
      data-year="${escapeAttr(project["año"])}"
      data-semester="${escapeAttr(project.semestre)}"
      data-date-sort="${(yearValue(project) * 100) + semesterRank(project.semestre)}"
      data-title="${escapeAttr(project.titulo)}">
      ${media}
      <div class="feature-body">
        <p class="mini-label">${escapeHTML(project.año)} - ${escapeHTML(project.semestre)}</p>
        <h2>${escapeHTML(project.titulo)}</h2>
        <p>${escapeHTML(project.descripcion)}</p>
        <div class="tag-row">
          ${project.tecnologias.map((tech) => `<span class="tag">${escapeHTML(tech)}</span>`).join("")}
        </div>
        <dl class="meta-list">
          <div><dt>Alumnos</dt><dd>${project.alumnos.map(escapeHTML).join(", ")}</dd></div>
          ${project.socioFormador ? `<div><dt>Socio formador</dt><dd>${escapeHTML(project.socioFormador)}</dd></div>` : ""}
        </dl>
      </div>
    </article>
  `;
}

function renderPartnersPage(career) {
  const partners = byCareer(siteData.socios, career.id);
  return `
    <section class="detail-shell">
      <div class="content-grid partner-grid">
        ${partners.map((partner, index) => renderPartner(partner, index)).join("")}
      </div>
      ${renderEmptyState(partners, "socios formadores")}
      ${renderPageNav(career)}
    </section>
  `;
}

function renderPartner(partner, index) {
  const logoIsImage = /\.(png|jpg|jpeg|webp|svg)$/i.test(partner.logo);
  return `
    <article class="feature-card partner-card">
      <div class="logo-row">
        ${
          logoIsImage
            ? `<div class="logo-tile image-logo" ${mediaStyle(partner.logo)}></div>`
            : `<div class="logo-tile">${escapeHTML(partner.logo)}</div>`
        }
        <div>
          <h2>${escapeHTML(partner.nombre)}</h2>
          <p class="mini-label">${escapeHTML(partner.tipoInteraccion)}</p>
        </div>
      </div>
      <p>${escapeHTML(partner.descripcion)}</p>
      <div class="image-tile media-crop-${(index % 5) + 2}" ${mediaStyle(partner.imagenOVideo)}>
        <span>Interacción con estudiantes</span>
      </div>
    </article>
  `;
}

function renderUniversitiesPage(career, pathParts = []) {
  const universities = byCareer(siteData.universidades, career.id);
  const grouped = groupUniversitiesByCountryAndCity(universities);
  const countries = Object.keys(grouped).sort((a, b) => a.localeCompare(b, "es"));
  const selectedCountry = decodeHashPart(pathParts[0]);
  const selectedCity = decodeHashPart(pathParts[1]);
  const hasSelectedCountry = Boolean(selectedCountry && grouped[selectedCountry]);
  const hasSelectedCity = Boolean(hasSelectedCountry && selectedCity && grouped[selectedCountry][selectedCity]);

  if (!universities.length) {
    pendingUniversityMap = null;
    return `
      <section class="detail-shell">
        ${renderEmptyState(universities, "universidades")}
        ${renderPageNav(career)}
      </section>
    `;
  }

  pendingUniversityMap = { career, countries, grouped };
  const selectedUniversities = hasSelectedCity ? grouped[selectedCountry][selectedCity] : [];
  return `
    <section class="detail-shell">
      ${renderUniversityFlowHeader("Mapa de países", "Explora convenios internacionales por país y ciudad.")}
      <div class="university-map-card">
        <div class="university-map-column">
          ${renderWorldMap(career, countries, grouped)}
        </div>
        ${renderCountryInfoPanel(career, hasSelectedCountry ? selectedCountry : "", hasSelectedCity ? selectedCity : "", grouped)}
      </div>
      ${
        hasSelectedCity
          ? `
            <div class="university-action-row">
              <a class="button ghost compact-button" href="#programa/${career.id}/universidades/${encodeHashPart(selectedCountry)}">Volver a ciudades</a>
              <a class="button ghost compact-button" href="#programa/${career.id}/universidades">Volver al mapa</a>
            </div>
            <div class="content-grid university-grid">
              ${selectedUniversities.map((university, index) => renderUniversity(university, index)).join("")}
            </div>
          `
          : ""
      }
      ${renderPageNav(career)}
    </section>
  `;
}

function groupUniversitiesByCountryAndCity(universities) {
  return universities.reduce((groups, university) => {
    const country = university.pais || "Sin país";
    const city = university.ciudad || "Sin ciudad";
    groups[country] ??= {};
    groups[country][city] ??= [];
    groups[country][city].push(university);
    return groups;
  }, {});
}

function encodeHashPart(value) {
  return encodeURIComponent(String(value ?? ""));
}

function decodeHashPart(value) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function renderUniversityFlowHeader(title, copy) {
  return `
    <div class="university-flow-heading">
      <p class="mini-label">Universidades extranjeras</p>
      <h2>${escapeHTML(title)}</h2>
      <p>${escapeHTML(copy)}</p>
    </div>
  `;
}

function renderWorldMap(career, countries, grouped) {
  return `
    <div class="world-map-panel">
      <div id="university-world-map" class="world-map" aria-label="Mapa mundial con países disponibles">
        <div class="map-loading">Cargando mapa mundial...</div>
      </div>
      <div class="map-country-list" aria-label="Lista de países disponibles">
        ${countries.map((country) => renderCountryListButton(career, country, grouped[country])).join("")}
      </div>
    </div>
  `;
}

function renderCountryInfoPanel(career, selectedCountry, selectedCity, grouped) {
  if (!selectedCountry || !grouped[selectedCountry]) {
    return `
      <aside class="map-info-panel">
        <p class="mini-label">Mapa de países</p>
        <h2>Selecciona un país resaltado para ver sus ciudades disponibles.</h2>
        <p>Los países con convenios para esta carrera aparecen destacados con el color principal del programa.</p>
      </aside>
    `;
  }

  const cities = grouped[selectedCountry];
  const cityCount = Object.keys(cities).length;
  const universityCount = Object.values(cities).reduce((total, items) => total + items.length, 0);
  const flag = countryFlagEmoji(selectedCountry);
  return `
    <aside class="map-info-panel">
      <div class="country-panel-heading">
        ${flag ? `<span class="country-flag" aria-hidden="true">${escapeHTML(flag)}</span>` : ""}
        <div>
          <p class="mini-label">País seleccionado</p>
          <h2>${escapeHTML(selectedCountry)}</h2>
        </div>
      </div>
      <p class="country-summary">${cityCount} ciudad${cityCount === 1 ? "" : "es"} disponible${cityCount === 1 ? "" : "s"} · ${universityCount} universidad${universityCount === 1 ? "" : "es"}</p>
      <p>Selecciona una ciudad:</p>
      <div class="city-list">
        ${Object.keys(cities)
          .sort((a, b) => a.localeCompare(b, "es"))
          .map((city) => renderCityOption(career, selectedCountry, city, cities[city].length, city === selectedCity))
          .join("")}
      </div>
      <a class="button ghost compact-button" href="#programa/${career.id}/universidades">Volver al mapa</a>
    </aside>
  `;
}

function renderCountryListButton(career, country, cities) {
  const cityCount = Object.keys(cities).length;
  return `
    <a class="country-list-button" href="#programa/${career.id}/universidades/${encodeHashPart(country)}">
      <span>${escapeHTML(country)}</span>
      <small>${cityCount} ciudad${cityCount === 1 ? "" : "es"}</small>
    </a>
  `;
}

function renderCityOption(career, country, city, count, isActive = false) {
  return `
    <a class="city-choice ${isActive ? "is-active" : ""}" href="#programa/${career.id}/universidades/${encodeHashPart(country)}/${encodeHashPart(city)}">
      <span>${escapeHTML(city)}</span>
      <small>${count} universidad${count === 1 ? "" : "es"}</small>
    </a>
  `;
}

function countryIsoCode(country) {
  const codes = {
    alemania: "DE",
    australia: "AU",
    canada: "CA",
    china: "CN",
    "corea del sur": "KR",
    dinamarca: "DK",
    espana: "ES",
    "estados unidos": "US",
    francia: "FR",
    italia: "IT",
    japon: "JP",
    "paises bajos": "NL",
    "reino unido": "GB",
    singapur: "SG",
    suiza: "CH",
  };
  return codes[normalizeCountryName(country)] ?? "";
}

function initializePendingUniversityMap() {
  if (!pendingUniversityMap) return;
  const mapElement = document.querySelector("#university-world-map");
  if (!mapElement) return;

  const { career, countries, grouped } = pendingUniversityMap;
  const countryByCode = countries.reduce((lookup, country) => {
    const code = countryIsoCode(country);
    if (code) lookup[code] = country;
    return lookup;
  }, {});
  const highlightedCodes = Object.keys(countryByCode);
  const accent = getComputedStyle(document.querySelector(".theme-scope")).getPropertyValue("--accent").trim() || "#0055a6";

  if (typeof jsVectorMap !== "function" || !highlightedCodes.length) {
    mapElement.innerHTML = `<div class="map-loading">No se pudo cargar el mapa interactivo. Usa la lista de países disponibles.</div>`;
    return;
  }

  mapElement.innerHTML = "";
  new jsVectorMap({
    selector: "#university-world-map",
    map: "world",
    zoomButtons: true,
    zoomOnScroll: false,
    selectedRegions: highlightedCodes,
    regionStyle: {
      initial: {
        fill: "#dbe3ea",
        stroke: "#ffffff",
        strokeWidth: 0.45,
      },
      hover: {
        fill: "#c8d2dc",
        cursor: "default",
      },
      selected: {
        fill: accent,
      },
      selectedHover: {
        fill: accent,
        cursor: "pointer",
      },
    },
    onRegionTooltipShow(event, tooltip, code) {
      const country = countryByCode[code];
      if (!country) {
        event.preventDefault();
        return;
      }
      const cities = Object.keys(grouped[country]).length;
      const universities = Object.values(grouped[country]).reduce((total, items) => total + items.length, 0);
      tooltip.text(`${country}: ${cities} ciudad${cities === 1 ? "" : "es"} · ${universities} universidad${universities === 1 ? "" : "es"}`);
    },
    onRegionClick(event, code) {
      const country = countryByCode[code];
      if (!country) {
        event.preventDefault();
        return;
      }
      window.location.hash = `#programa/${career.id}/universidades/${encodeHashPart(country)}`;
    },
  });
}

function renderUniversity(university, index) {
  const countryLabel = [countryFlagEmoji(university.pais), university.pais].filter(Boolean).join(" ");
  const overlayLabel = [countryLabel, university.ciudad].filter(Boolean).join(" · ");
  return `
    <article class="feature-card university-card">
      <div class="image-tile wide-tile media-crop-${(index % 5) + 3}" ${mediaStyle(university.imagen)}>
        <span class="location-badge">${escapeHTML(overlayLabel)}</span>
      </div>
      <div class="feature-body">
        <p class="mini-label">${escapeHTML(university.ciudad)}, ${escapeHTML(university.pais)}</p>
        <h2>${escapeHTML(university.nombre)}</h2>
        <p>${escapeHTML(university.descripcion)}</p>
        <div class="tag-row">
          ${university.areasRelacionadas.map((area) => `<span class="tag">${escapeHTML(area)}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderExatecsPage(career) {
  const profiles = byCareer(siteData.exatecs, career.id);
  return `
    <section class="detail-shell" data-listing-region>
      ${renderListingControls({
        filters: [
          {
            id: "generation",
            label: "Generación",
            options: uniqueOptions(profiles, (profile) => profile.generacion, (a, b) => generationRank(a) - generationRank(b)),
          },
        ],
        resultLabel: "EXATECs",
        singularLabel: "EXATEC",
      })}
      <div class="content-grid exatec-grid" data-listing-grid>
        ${profiles.map((profile, index) => renderExatec(profile, index)).join("")}
      </div>
      ${renderPageNav(career)}
    </section>
  `;
}

function renderExatec(profile, index) {
  return `
    <article
      class="feature-card exatec-card"
      data-filterable-card
      data-generation="${escapeAttr(profile.generacion)}"
      data-date-sort="${generationRank(profile.generacion)}"
      data-title="${escapeAttr(profile.nombre)}">
      <div class="profile-photo media-crop-${(index % 5) + 1}" ${mediaStyle(profile.foto)} aria-label="Foto de ejemplo"></div>
      <div class="feature-body">
        <p class="mini-label">${escapeHTML(profile.generacion)}</p>
        <h2>${escapeHTML(profile.nombre)}</h2>
        <p class="role-line">${escapeHTML(profile.puestoActual)} · ${escapeHTML(profile.empresa)}</p>
        <p>${escapeHTML(profile.descripcion)}</p>
        <dl class="meta-list">
          <div><dt>Carrera cursada</dt><dd>${escapeHTML(profile.carreraCursada)}</dd></div>
        </dl>
        <a class="button ghost compact-button" href="${escapeAttr(profile.linkedinUrl)}" target="_blank" rel="noreferrer">LinkedIn</a>
      </div>
    </article>
  `;
}

function renderSantaFePage(career) {
  const advantages = [
    ["Laboratorios", `Espacios para probar, medir y documentar soluciones vinculadas a ${career.highlights[0].toLowerCase()}.`],
    ["Ubicación", "Santa Fe conecta el aula con corporativos, startups, movilidad urbana y retos de ciudad."],
    ["Proyectos", "Retos integradores, semanas intensivas y experiencias con socios formadores durante el semestre."],
    ["Comunidad", "Equipos multidisciplinarios, profesores cercanos y actividades que impulsan colaboración entre carreras."],
    ["CATALYST", "Experiencias para acelerar ideas, formar comunidad y conectar estudiantes con mentoría temprana."],
    ["Ventaja campus", career.porQueSantaFe],
  ];

  return `
    <section class="detail-shell">
      <div class="campus-feature">
        <div>
          <p class="mini-label">Campus Santa Fe</p>
          <h2>${escapeHTML(fullName(career))} en un entorno conectado con la ciudad</h2>
          <p>Una experiencia visual y práctica donde la ubicación, los laboratorios, los aliados y la comunidad amplifican lo que sucede dentro del aula.</p>
        </div>
        <div class="campus-photo"></div>
      </div>
      <div class="advantage-grid">
        ${advantages
          .map(
            ([title, copy]) => `
              <article class="advantage-card">
                <span class="section-dot" aria-hidden="true"></span>
                <h3>${escapeHTML(title)}</h3>
                <p>${escapeHTML(copy)}</p>
              </article>
            `,
          )
          .join("")}
      </div>
      ${renderPageNav(career)}
    </section>
  `;
}

function renderPageNav(career) {
  return `
    <nav class="page-nav" aria-label="Navegación de carrera">
      <a class="button ghost" href="#programa/${career.id}">Volver a la carrera</a>
      <a class="button secondary" href="#inicio">Volver al catálogo principal</a>
    </nav>
  `;
}

function renderEmptyState(collection, label) {
  if (collection.length > 0) return "";
  return `
    <div class="empty-state">
      <h2>Sin ${escapeHTML(label)} por ahora</h2>
      <p>Agrega registros para esta carrera en el archivo JSON correspondiente.</p>
    </div>
  `;
}

function renderCatalystDetail(program) {
  app.innerHTML = `
    <div class="theme-scope" style="${styleVars(program)}">
      ${renderDetailHero(program, "PROGRAMA DE ALTO RENDIMIENTO", program.tagline)}
      <section class="detail-shell">
        <div class="section-grid">
          ${siteData.catalyst.secciones.map((section, index) => renderCatalystPanel(program, section, index)).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderCatalystPanel(program, section, index) {
  const sectionImage = sectionImageFor(program, section.id) || sectionImageFor(program, ["proyectos", "socios", "santa-fe", "exatecs"][index] || "proyectos");
  if (section.ruta) {
    return `
      <a class="info-panel section-link-card catalyst-panel-link" href="${escapeAttr(section.ruta)}">
        <div class="section-card-media media-crop-4" ${mediaStyle(sectionImage)}></div>
        <h2><span class="section-dot" aria-hidden="true"></span>${escapeHTML(section.titulo)}</h2>
        <p>${escapeHTML(section.descripcion)}</p>
        <ul class="item-list">
          ${section.items
            .map(
              (item) => `
                <li>
                  <strong>${escapeHTML(item.titulo)}</strong>
                  ${escapeHTML(item.descripcion)}
                </li>
              `,
            )
            .join("")}
        </ul>
        <span class="text-link">Ver actividades</span>
      </a>
    `;
  }

  return `
    <article class="info-panel">
      <div class="section-card-media media-crop-${(index % 5) + 1}" ${mediaStyle(sectionImage)}></div>
      <h2><span class="section-dot" aria-hidden="true"></span>${escapeHTML(section.titulo)}</h2>
      ${section.descripcion ? `<p>${escapeHTML(section.descripcion)}</p>` : ""}
      <ul class="item-list">
        ${section.items
          .map(
            (item) => `
              <li>
                <strong>${escapeHTML(item.titulo)}</strong>
                ${escapeHTML(item.descripcion)}
              </li>
            `,
          )
          .join("")}
      </ul>
    </article>
  `;
}

function renderCatalystActivitiesPage(program) {
  const activities = siteData.catalyst.actividades ?? [];
  app.innerHTML = `
    <div class="theme-scope" style="${styleVars(program)}">
      ${renderDetailHero(
        program,
        "Comunidad CATALYST",
        "Actividades, encuentros y experiencias que conectan estudiantes con retos, mentores y comunidad.",
        "Actividades y comunidad",
      )}
      <section class="detail-shell" data-listing-region>
        ${renderListingControls({
          filters: [
            {
              id: "cycle",
              label: "Año / Generación",
              options: uniqueOptions(activities, catalystActivityCycle, (a, b) => generationRank(a) - generationRank(b)),
            },
          ],
          resultLabel: "actividades CATALYST",
          singularLabel: "actividad CATALYST",
        })}
        <div class="content-grid activity-grid" data-listing-grid>
          ${activities.map((activity, index) => renderCatalystActivity(activity, index)).join("")}
        </div>
        <nav class="page-nav" aria-label="Navegación de CATALYST">
          <a class="button ghost" href="#programa/catalyst">Volver a CATALYST</a>
          <a class="button secondary" href="#inicio">Volver al catálogo principal</a>
        </nav>
      </section>
    </div>
  `;
  attachListingControls();
}

function catalystActivityCycle(activity) {
  return [activity.anio, activity.generacion].filter(Boolean).join(" · ");
}

function renderCatalystActivity(activity, index) {
  const label = catalystActivityCycle(activity);
  const media =
    activity.tipoMedia === "video"
      ? `
        <div class="video-frame">
          <iframe
            src="${escapeAttr(activity.imagenOVideo)}"
            title="Video de ejemplo: ${escapeAttr(activity.titulo)}"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen>
          </iframe>
        </div>
      `
      : `
        <div class="image-tile media-crop-${(index % 5) + 1}" ${mediaStyle(activity.imagenOVideo)}>
          <span>${escapeHTML(activity.lugarOContexto)}</span>
        </div>
      `;

  return `
    <article
      class="feature-card activity-card"
      data-filterable-card
      data-cycle="${escapeAttr(label)}"
      data-date-sort="${generationRank(label)}"
      data-title="${escapeAttr(activity.titulo)}">
      ${media}
      <div class="feature-body">
        <p class="mini-label">${escapeHTML(label)}</p>
        <h2>${escapeHTML(activity.titulo)}</h2>
        <p>${escapeHTML(activity.descripcion)}</p>
        <dl class="meta-list">
          <div><dt>Lugar o contexto</dt><dd>${escapeHTML(activity.lugarOContexto)}</dd></div>
        </dl>
      </div>
    </article>
  `;
}

const adminResources = [
  { key: "proyectos", label: "Proyectos", filename: "proyectos.json", type: "array" },
  { key: "socios", label: "Socios formadores", filename: "socios.json", type: "array" },
  { key: "universidades", label: "Universidades extranjeras", filename: "universidades.json", type: "array" },
  { key: "exatecs", label: "EXATECs", filename: "exatecs.json", type: "array" },
  { key: "catalystActivities", label: "Actividades CATALYST", filename: "catalyst.json", type: "array" },
  { key: "vivencia", label: "Vivencia", filename: "vivencia.json", type: "array" },
];

const adminNewItemValue = "__new__";

const adminIdRules = {
  proyectos: {
    prefixField: "carreraId",
    segment: "proyecto",
    required: ["carreraId", "id", "titulo", "año", "semestre"],
  },
  socios: {
    prefixField: "carreraId",
    segment: "socio",
    required: ["carreraId", "id", "nombre"],
  },
  universidades: {
    prefixField: "carreraId",
    segment: "universidad",
    required: ["carreraId", "id", "nombre", "pais"],
  },
  exatecs: {
    prefixField: "carreraId",
    segment: "exatec",
    required: ["carreraId", "id", "nombre", "generacion", "carreraCursada"],
  },
  catalystActivities: {
    fixedPrefix: "catalyst",
    segment: "actividad",
    required: ["id", "titulo", "anio", "generacion"],
  },
  vivencia: {
    base: "vivencia-",
    required: ["id", "categoria", "titulo", "año"],
  },
};

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function getAdminData(key) {
  if (key === "catalystActivities") return adminState.catalyst.actividades;
  return adminState[key];
}

function getAdminDownloadData(key) {
  if (key === "catalystActivities") return adminState.catalyst;
  return getAdminData(key);
}

function getAdminConfig(key) {
  return adminResources.find((resource) => resource.key === key) ?? adminResources[0];
}

function adminCareers() {
  return (adminState?.carreras ?? siteData.carreras).filter((career) => career.tipo !== "catalyst");
}

function isCareerScopedAdminKey(key) {
  return Boolean(adminIdRules[key]?.prefixField);
}

function adminItemLabel(item, index) {
  return item?.nombre || item?.titulo || item?.id || `Registro ${index + 1}`;
}

function adminCareerOptions(selectedValue) {
  return adminCareers()
    .map((career) => `<option value="${escapeAttr(career.id)}" ${career.id === selectedValue ? "selected" : ""}>${escapeHTML(career.nombre)}</option>`)
    .join("");
}

function defaultAdminCareerId(key) {
  if (!isCareerScopedAdminKey(key)) return "";
  return adminCareers()[0]?.id ?? "";
}

function getSelectedAdminCareerId(key) {
  if (!isCareerScopedAdminKey(key)) return "";
  return document.querySelector("#admin-career")?.value || defaultAdminCareerId(key);
}

function adminFilteredEntries(key, careerId = defaultAdminCareerId(key)) {
  const data = getAdminData(key);
  return data
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !isCareerScopedAdminKey(key) || item.carreraId === careerId);
}

function nextAdminId(key, item = {}) {
  const rule = adminIdRules[key];
  if (!rule) return item.id || `${key}-${Date.now()}`;
  const prefix = rule.prefixField ? item[rule.prefixField] : rule.fixedPrefix;
  const base = rule.base || `${prefix}-${rule.segment}-`;
  if (!rule.base && !prefix) return "";
  const data = getAdminData(key);
  const max = data.reduce((highest, current) => {
    const id = String(current.id ?? "");
    if (!id.startsWith(base)) return highest;
    const number = Number(id.slice(base.length));
    return Number.isInteger(number) && number > highest ? number : highest;
  }, 0);
  return `${base}${max + 1}`;
}

function orderedAdminEntries(object, key, prefix) {
  const entries = Object.entries(object);
  if (prefix) return entries;
  const preferred = isCareerScopedAdminKey(key) ? ["carreraId", "id"] : ["id"];
  return [
    ...preferred.filter((field) => Object.hasOwn(object, field)).map((field) => [field, object[field]]),
    ...entries.filter(([field]) => !preferred.includes(field)),
  ];
}

function renderAdminDashboard() {
  adminState = cloneData(siteData);
  app.innerHTML = `
    <section class="admin-shell">
      <div class="admin-hero">
        <p class="eyebrow">Administrador local</p>
        <h1>Editar catálogo</h1>
        <p>Modifica los datos en formularios, revisa el JSON generado y descarga el archivo actualizado. Después reemplaza manualmente el archivo correspondiente en <strong>data</strong>.</p>
      </div>
      <div class="admin-layout">
        <aside class="admin-panel">
          <label class="admin-label" for="admin-resource">Contenido</label>
          <select id="admin-resource" class="admin-control">
            ${adminResources.map((resource) => `<option value="${resource.key}">${escapeHTML(resource.label)}</option>`).join("")}
          </select>
          <div class="admin-instructions">
            <strong>Flujo local</strong>
            <p>1. Edita el formulario.</p>
            <p>2. Descarga el JSON.</p>
            <p>3. Reemplaza el archivo indicado en <code>data</code>.</p>
          </div>
        </aside>
        <section class="admin-editor-card">
          <div id="admin-editor"></div>
        </section>
      </div>
    </section>
  `;

  document.querySelector("#admin-resource").addEventListener("change", (event) => {
    renderAdminEditor(event.target.value);
  });
  renderAdminEditor(adminResources[0].key);
}

function renderAdminEditor(key, selectedCareerId = null) {
  const config = getAdminConfig(key);
  const data = getAdminData(key);
  const editor = document.querySelector("#admin-editor");
  const isArray = Array.isArray(data);
  const careerId = selectedCareerId || defaultAdminCareerId(key);
  const filteredEntries = isArray ? adminFilteredEntries(key, careerId) : [];
  const selectedIndex = isArray && filteredEntries.length > 0 ? filteredEntries[0].index : adminNewItemValue;

  editor.innerHTML = `
    <div class="admin-editor-heading">
      <div>
        <p class="mini-label">${escapeHTML(config.filename)}</p>
        <h2>${escapeHTML(config.label)}</h2>
      </div>
      ${
        isArray
          ? `<div class="admin-actions">
              <button class="button ghost compact-button" type="button" id="admin-add">Agregar</button>
              <button class="button ghost compact-button danger-button" type="button" id="admin-delete">Eliminar</button>
            </div>`
          : ""
      }
    </div>
    ${
      isArray
        ? `<div class="admin-record-controls">
          ${
            isCareerScopedAdminKey(key)
              ? `<label class="admin-label" for="admin-career">Carrera Id</label>
                 <select id="admin-career" class="admin-control">
                   ${adminCareerOptions(careerId)}
                 </select>`
              : ""
          }
          <label class="admin-label" for="admin-item">Registro</label>
           <select id="admin-item" class="admin-control">
             <option value="${adminNewItemValue}">+ Agregar nuevo registro</option>
             ${filteredEntries.map(({ item, index }) => `<option value="${index}">${escapeHTML(adminItemLabel(item, index))}</option>`).join("")}
           </select>
        </div>`
        : ""
    }
    <form id="admin-form" class="admin-form"></form>
    <div id="admin-message" class="admin-message" aria-live="polite"></div>
    <div class="admin-json-tools">
      <div>
        <h3>JSON generado</h3>
        <p>Descarga este contenido y reemplaza manualmente <code>data/${escapeHTML(config.filename)}</code>.</p>
      </div>
      <button class="button compact-button" type="button" id="admin-download">Descargar JSON</button>
    </div>
    <textarea id="admin-json-output" class="admin-json-output" spellcheck="false"></textarea>
  `;

  if (isArray) {
    document.querySelector("#admin-career")?.addEventListener("change", (event) => renderAdminEditor(key, event.target.value));
    document.querySelector("#admin-item").addEventListener("change", () => renderAdminForm(key));
    document.querySelector("#admin-add").addEventListener("click", () => addAdminItem(key));
    document.querySelector("#admin-delete").addEventListener("click", () => deleteAdminItem(key));
  }
  document.querySelector("#admin-download").addEventListener("click", () => downloadAdminJson(key));
  renderAdminForm(key, selectedIndex);
}

function renderAdminForm(key, selectedValue = null) {
  const data = getAdminData(key);
  const isArray = Array.isArray(data);
  const select = document.querySelector("#admin-item");
  if (selectedValue !== null && select) select.value = String(selectedValue);
  const selected = isArray ? select?.value || adminNewItemValue : null;
  const isNew = isArray && selected === adminNewItemValue;
  const index = isArray && !isNew ? Number(selected || 0) : null;
  const target = isArray ? (isNew ? createBlankFromTemplate(data[0], key) : data[index]) : data;
  const form = document.querySelector("#admin-form");

  if (!target) {
    form.innerHTML = `<p class="empty-state">No hay registros. Selecciona “+ Agregar nuevo registro” para capturar uno.</p>`;
    updateAdminOutput(key);
    return;
  }

  prepareAdminNewItem(target, key, isNew);
  form.innerHTML = renderAdminFields(target, "", key, isNew);
  form.querySelectorAll("[data-path]").forEach((field) => {
    const syncField = () => {
      applyAdminForm(target, form);
      if (isNew) {
        refreshGeneratedAdminId(key, target, form);
      } else {
        refreshAdminItemLabel(key);
      }
      updateAdminOutput(key);
    };
    field.addEventListener("input", syncField);
    field.addEventListener("change", syncField);
  });
  updateAdminOutput(key);
}

function renderAdminFields(object, prefix = "", key = "", isNew = false) {
  return orderedAdminEntries(object, key, prefix)
    .map(([field, value]) => {
      const path = prefix ? `${prefix}.${field}` : field;
      const label = field.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());

      if (!prefix && field === "carreraId" && isCareerScopedAdminKey(key)) {
        return "";
      }

      if (Array.isArray(value)) {
        const isPrimitiveArray = value.every((item) => typeof item !== "object");
        return `
          <label class="admin-label">
            ${escapeHTML(label)}
            <textarea class="admin-control" data-path="${escapeAttr(path)}" data-kind="${isPrimitiveArray ? "array" : "json"}">${escapeHTML(isPrimitiveArray ? value.join("\n") : JSON.stringify(value, null, 2))}</textarea>
          </label>
        `;
      }

      if (value && typeof value === "object") {
        return `
          <fieldset class="admin-fieldset">
            <legend>${escapeHTML(label)}</legend>
            ${renderAdminFields(value, path, key, isNew)}
          </fieldset>
        `;
      }

      const isLong = String(value ?? "").length > 90 || /descripcion|texto|tagline|bienvenida/i.test(field);
      const readonly = !prefix && field === "id" && isNew && adminIdRules[key] ? " readonly" : "";
      const control = isLong
        ? `<textarea class="admin-control" data-path="${escapeAttr(path)}" data-kind="string"${readonly}>${escapeHTML(value)}</textarea>`
        : `<input class="admin-control" data-path="${escapeAttr(path)}" data-kind="${typeof value === "number" ? "number" : "string"}" value="${escapeAttr(value)}"${readonly} />`;
      return `<label class="admin-label">${escapeHTML(label)}${control}</label>`;
    })
    .join("");
}

function applyAdminForm(target, form) {
  form.querySelectorAll("[data-path]").forEach((field) => {
    const kind = field.dataset.kind;
    let value = field.value;
    if (kind === "number") value = Number(value);
    if (kind === "array") value = value.split("\n").map((item) => item.trim()).filter(Boolean);
    if (kind === "json") {
      try {
        value = JSON.parse(value || "[]");
        field.classList.remove("field-error");
      } catch {
        field.classList.add("field-error");
        return;
      }
    }
    setPathValue(target, field.dataset.path, value);
  });
}

function setPathValue(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  parts.slice(0, -1).forEach((part) => {
    cursor = cursor[part];
  });
  cursor[parts.at(-1)] = value;
}

const adminBlankTemplates = {
  proyectos: {
    carreraId: "",
    id: "",
    titulo: "",
    descripcion: "",
    año: new Date().getFullYear(),
    semestre: "",
    alumnos: [],
    thumbnail: "",
    youtubeUrl: "",
    tecnologias: [],
    socioFormador: "",
  },
  socios: {
    carreraId: "",
    id: "",
    nombre: "",
    logo: "",
    descripcion: "",
    tipoInteraccion: "",
    imagenOVideo: "",
  },
  universidades: {
    carreraId: "",
    id: "",
    nombre: "",
    pais: "",
    ciudad: "",
    descripcion: "",
    areasRelacionadas: [],
    imagen: "",
  },
  exatecs: {
    carreraId: "",
    id: "",
    nombre: "",
    generacion: "",
    carreraCursada: "",
    puestoActual: "",
    empresa: "",
    descripcion: "",
    foto: "",
    linkedinUrl: "",
  },
  catalystActivities: {
    id: "",
    titulo: "",
    descripcion: "",
    anio: "2025 - 2026",
    generacion: "",
    imagenOVideo: "",
    tipoMedia: "imagen",
    lugarOContexto: "",
  },
  vivencia: {
    id: "",
    categoria: "Bootcamps",
    titulo: "",
    descripcion: "",
    "año": new Date().getFullYear(),
    media: "",
    mediaType: "image",
    enlace: "",
    etiquetas: [],
  },
};

function createBlankFromTemplate(template, key) {
  const blank = cloneData(template ?? adminBlankTemplates[key] ?? { id: "" });
  Object.keys(blank).forEach((field) => {
    if (Array.isArray(blank[field])) blank[field] = [];
    else if (blank[field] && typeof blank[field] === "object") blank[field] = createBlankFromTemplate(blank[field], key);
    else if (typeof blank[field] === "number") blank[field] = new Date().getFullYear();
    else blank[field] = adminBlankTemplates[key]?.[field] ?? "";
  });
  return blank;
}

function prepareAdminNewItem(item, key, isNew) {
  if (!isNew || !adminIdRules[key]) return;
  if (isCareerScopedAdminKey(key)) {
    item.carreraId = getSelectedAdminCareerId(key);
  }
  item.id = nextAdminId(key, item);
}

function refreshGeneratedAdminId(key, item, form) {
  if (!adminIdRules[key]) return;
  item.id = nextAdminId(key, item);
  const idField = form.querySelector('[data-path="id"]');
  if (idField) idField.value = item.id;
}

function adminRequiredLabel(field) {
  const labels = {
    carreraId: "Carrera Id",
    id: "Id",
    titulo: "Título",
    nombre: "Nombre",
    pais: "País",
    generacion: "Generación",
    carreraCursada: "Carrera cursada",
    año: "Año",
    anio: "Año",
    semestre: "Semestre",
  };
  return labels[field] ?? field;
}

function validateAdminItem(key, item) {
  const required = adminIdRules[key]?.required ?? [];
  const missing = required.filter((field) => {
    const value = item[field];
    if (typeof value === "number") return !Number.isFinite(value) || value <= 0;
    return String(value ?? "").trim() === "";
  });
  return missing;
}

function showAdminMessage(message, type = "info") {
  const element = document.querySelector("#admin-message");
  if (!element) return;
  element.className = `admin-message admin-message-${type}`;
  element.textContent = message;
}

function addAdminItem(key) {
  const data = getAdminData(key);
  const select = document.querySelector("#admin-item");
  if (select?.value !== adminNewItemValue) {
    select.value = adminNewItemValue;
    renderAdminForm(key);
    showAdminMessage("Captura el nuevo registro y presiona Agregar para sumarlo al JSON generado.", "info");
    return;
  }

  const form = document.querySelector("#admin-form");
  const item = createBlankFromTemplate(data[0], key);
  prepareAdminNewItem(item, key, true);
  applyAdminForm(item, form);
  refreshGeneratedAdminId(key, item, form);

  const missing = validateAdminItem(key, item);
  if (missing.length > 0) {
    showAdminMessage(`Faltan campos obligatorios: ${missing.map(adminRequiredLabel).join(", ")}.`, "error");
    return;
  }

  data.push(item);
  renderAdminEditor(key, item.carreraId);
  const nextSelect = document.querySelector("#admin-item");
  nextSelect.value = String(data.length - 1);
  renderAdminForm(key);
  showAdminMessage(`Registro agregado. Descarga el JSON actualizado y reemplaza manualmente el archivo correspondiente en data.`, "success");
}

function deleteAdminItem(key) {
  const data = getAdminData(key);
  const select = document.querySelector("#admin-item");
  const careerId = getSelectedAdminCareerId(key);
  if (!select || select.value === adminNewItemValue) {
    showAdminMessage("Selecciona un registro existente para eliminarlo.", "error");
    return;
  }
  const index = Number(select.value || 0);
  data.splice(index, 1);
  renderAdminEditor(key, careerId);
  showAdminMessage("Registro eliminado del JSON generado. Descarga el archivo actualizado para reemplazarlo manualmente.", "success");
}

function refreshAdminItemLabel(key) {
  const data = getAdminData(key);
  if (!Array.isArray(data)) return;
  const select = document.querySelector("#admin-item");
  const index = Number(select.value || 0);
  const item = data[index];
  const option = select ? [...select.options].find((entry) => entry.value === String(index)) : null;
  if (option && item) {
    option.textContent = adminItemLabel(item, index);
  }
}

function updateAdminOutput(key) {
  const output = document.querySelector("#admin-json-output");
  if (output) output.value = JSON.stringify(getAdminDownloadData(key), null, 2);
}

function downloadAdminJson(key) {
  const config = getAdminConfig(key);
  const blob = new Blob([JSON.stringify(getAdminDownloadData(key), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = config.filename;
  link.click();
  URL.revokeObjectURL(url);
}

function route() {
  const hash = window.location.hash || "#inicio";

  if (hash === "#admin") {
    renderAdminDashboard();
    resetScroll();
    return;
  }

  if (hash.startsWith("#vivencia")) {
    const [, fromCareerId] = hash.replace("#", "").split("/");
    const fromCareer = siteData.carreras.find((item) => item.id === fromCareerId && item.tipo === "career") ?? null;
    renderVivenciaPage(fromCareer);
    resetScroll();
    return;
  }

  if (hash.startsWith("#programa/")) {
    const [, programId, sectionSlug, ...sectionPath] = hash.replace("#", "").split("/");
    const program = siteData.carreras.find((item) => item.id === programId);
    if (program?.tipo === "catalyst") {
      if (sectionSlug === "comunidad") {
        renderCatalystActivitiesPage(program);
        resetScroll();
        return;
      }
      renderCatalystDetail(program);
      resetScroll();
      return;
    }
    if (program && sectionSlug) {
      renderSubpage(program, sectionSlug, sectionPath);
      resetScroll();
      return;
    }
    if (program) {
      renderCareerHub(program);
      resetScroll();
      return;
    }
  }

  renderHome();
  if (hash === "#catalogo") {
    requestAnimationFrame(() => document.querySelector("#catalogo")?.scrollIntoView());
  } else {
    resetScroll();
  }
}

function resetScroll() {
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "auto" });
}

async function init() {
  renderLoading();
  try {
    siteData = await loadData();
    document.title = `${siteData.site.tituloSitio} | ${siteData.site.textoBienvenida}`;
    renderFooter();
    route();
    window.addEventListener("hashchange", route);
  } catch (error) {
    renderLoadError(error);
  }
}

init();
