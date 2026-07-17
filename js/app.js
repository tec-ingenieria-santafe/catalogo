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
    title: "Experiencias en el extranjero",
    short: "Experiencias internacionales en universidades, ciudades y países alrededor del mundo.",
  },
  exatecs: {
    title: "Empleabilidad",
    short: "Conoce perfiles de estudiantes y EXATECs, sus prácticas y trayectorias profesionales vinculadas a la carrera.",
  },
  "santa-fe": {
    title: "¿Por qué estudiar esta carrera en Santa Fe?",
    short: "Laboratorios, ubicación, CATALYST, comunidad y ventajas específicas del campus.",
  },
  vivencia: {
    title: "Vivencia",
    short: "Descubre grupos estudiantiles, escuderías, actividades y experiencias que complementan tu formación dentro y fuera de clases.",
  },
};

const catalogLayout = {
  catalystId: "catalyst",
  groups: [
    {
      id: "computacion",
      title: "Entrada Computación",
      cardLabel: "Entrada Computación",
      careerIds: ["financial-engineering", "ai-data-science", "computacionales"],
    },
    {
      id: "ingenieria",
      title: "Entrada Ingeniería",
      cardLabel: "Entrada Ingeniería",
      careerIds: ["mecanica", "mecatronica", "industrial", "civil", "desarrollo-sustentable"],
    },
  ],
  otherCareerEntries: {
    "innovacion-desarrollo": { id: "ingenieria", cardLabel: "Entrada Ingeniería" },
    "transformacion-digital": { id: "computacion", cardLabel: "Entrada Computación" },
  },
};

const breadcrumbLabels = {
  careers: {
    "financial-engineering": "Financial Engineering",
    "ai-data-science": "AI & Data Science",
    computacionales: "Tecnologías Computacionales",
    mecanica: "Mecánica",
    mecatronica: "Mecatrónica",
    industrial: "Industrial y Sistemas",
    civil: "Civil",
    "desarrollo-sustentable": "Desarrollo Sustentable",
    "innovacion-desarrollo": "Innovación y Desarrollo",
    "transformacion-digital": "Transformación Digital",
    catalyst: "CATALYST",
  },
  sections: {
    proyectos: "Proyectos",
    socios: "Socios",
    universidades: "Experiencias",
    exatecs: "Empleabilidad",
    "santa-fe": "¿Por qué Santa Fe?",
    vivencia: "Vivencia",
  },
  catalyst: {
    comunidad: "Comunidad",
    actividades: "Actividades opcionales",
    testimonios: "Testimonios",
  },
};

let siteData = null;
let adminState = null;
let pendingUniversityMap = null;
let activeUniversityMap = null;

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

function careerShortName(career) {
  return String(career?.nombreCorto || career?.nombre || "").replace(/\s*\([^)]*\)\s*/g, "").trim();
}

function otherCatalogCareers() {
  return siteData.carreras.filter((program) => program.tipo === "career" && program.catalogGroup === "otras");
}

function programById(id) {
  return siteData.carreras.find((program) => program.id === id) ?? null;
}

function programsByIds(ids) {
  return ids.map(programById).filter(Boolean);
}

function careerBreadcrumbLabel(career) {
  return breadcrumbLabels.careers[career?.id] || careerShortName(career);
}

function careerBreadcrumbItems(career, sectionSlug = "") {
  const items = [{ label: "Catálogo", href: "#inicio" }];
  if (career?.catalogGroup === "otras") {
    items.push({ label: "Otras", href: "#otras" });
  }
  items.push({
    label: careerBreadcrumbLabel(career),
    href: sectionSlug ? `#programa/${career.id}` : "",
  });
  if (sectionSlug) {
    items.push({ label: breadcrumbLabels.sections[sectionSlug] || sectionMeta[sectionSlug]?.title || sectionSlug });
  }
  return items;
}

function catalystBreadcrumbItems(category = "") {
  const items = [
    { label: "Catálogo", href: "#inicio" },
    { label: "CATALYST", href: category ? "#programa/catalyst" : "" },
  ];
  if (category) {
    items.push({ label: breadcrumbLabels.catalyst[category] || sectionLabelForCatalyst(category) });
  }
  return items;
}

function renderBreadcrumb(items, options = {}) {
  const validItems = (items || []).filter((item) => item?.label);
  if (!validItems.length) return "";
  const style = options.neutral ? ' style="--breadcrumb-accent: #465568"' : "";
  return `
    <nav class="page-breadcrumb" aria-label="Ruta de navegación"${style}>
      <ol>
        ${validItems
          .map((item, index) => {
            const isCurrent = index === validItems.length - 1;
            return `<li>${
              isCurrent
                ? `<span aria-current="page">${escapeHTML(item.label)}</span>`
                : `<a href="${escapeAttr(item.href)}">${escapeHTML(item.label)}</a>`
            }</li>`;
          })
          .join("")}
      </ol>
    </nav>
  `;
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

function mediaStyle(path, options = {}) {
  return path ? `style="--media-image: url('${escapeAttr(assetUrl(path, options))}')"` : "";
}

function validMediaPath(path) {
  if (path === undefined || path === null) return "";
  const value = String(path).trim();
  if (!value || /^(null|undefined)$/i.test(value)) return "";
  return value.replace(/^["']|["']$/g, "").trim();
}

function hasContent(value) {
  if (Array.isArray(value)) return value.some((item) => hasContent(item));
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function assetVersion() {
  return String(siteData?.site?.assetsVersion || siteData?.site?.assetVersion || "").trim();
}

function assetUrl(path, options = {}) {
  if (!path || /^(https?:|data:|blob:)/i.test(path)) return path;
  const url = new URL(path, document.baseURI);
  if (options.version) {
    const version = assetVersion();
    if (version) url.searchParams.set("v", version);
  }
  return url.href;
}

function normalizeCountryName(country) {
  return String(country ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const countryIsoCodes = {
  afganistan: "af",
  albania: "al",
  alemania: "de",
  andorra: "ad",
  angola: "ao",
  "antigua y barbuda": "ag",
  "arabia saudita": "sa",
  argelia: "dz",
  argentina: "ar",
  armenia: "am",
  australia: "au",
  austria: "at",
  azerbaiyan: "az",
  bahamas: "bs",
  banglades: "bd",
  barbados: "bb",
  barein: "bh",
  belgica: "be",
  belice: "bz",
  benin: "bj",
  bielorrusia: "by",
  birmania: "mm",
  bolivia: "bo",
  "bosnia y herzegovina": "ba",
  botsuana: "bw",
  brasil: "br",
  brunei: "bn",
  bulgaria: "bg",
  "burkina faso": "bf",
  burundi: "bi",
  butan: "bt",
  "cabo verde": "cv",
  camboya: "kh",
  camerun: "cm",
  canada: "ca",
  catar: "qa",
  chad: "td",
  chile: "cl",
  china: "cn",
  chipre: "cy",
  "ciudad del vaticano": "va",
  colombia: "co",
  comoras: "km",
  "corea del norte": "kp",
  "corea del sur": "kr",
  "costa de marfil": "ci",
  "costa rica": "cr",
  croacia: "hr",
  cuba: "cu",
  dinamarca: "dk",
  dominica: "dm",
  ecuador: "ec",
  egipto: "eg",
  "el salvador": "sv",
  "emiratos arabes unidos": "ae",
  eritrea: "er",
  eslovaquia: "sk",
  eslovenia: "si",
  espana: "es",
  "estados unidos": "us",
  estonia: "ee",
  etiopia: "et",
  filipinas: "ph",
  finlandia: "fi",
  fiyi: "fj",
  francia: "fr",
  gabon: "ga",
  gambia: "gm",
  georgia: "ge",
  ghana: "gh",
  granada: "gd",
  grecia: "gr",
  guatemala: "gt",
  guyana: "gy",
  guinea: "gn",
  "guinea-bisau": "gw",
  "guinea ecuatorial": "gq",
  haiti: "ht",
  honduras: "hn",
  hungria: "hu",
  india: "in",
  indonesia: "id",
  irak: "iq",
  iran: "ir",
  irlanda: "ie",
  islandia: "is",
  "islas marshall": "mh",
  "islas salomon": "sb",
  israel: "il",
  italia: "it",
  jamaica: "jm",
  japon: "jp",
  jordania: "jo",
  kazajistan: "kz",
  kenia: "ke",
  kirguistan: "kg",
  kiribati: "ki",
  kosovo: "xk",
  kuwait: "kw",
  laos: "la",
  lesoto: "ls",
  letonia: "lv",
  libano: "lb",
  liberia: "lr",
  libia: "ly",
  liechtenstein: "li",
  lituania: "lt",
  luxemburgo: "lu",
  "macedonia del norte": "mk",
  madagascar: "mg",
  malasia: "my",
  malaui: "mw",
  maldivas: "mv",
  mali: "ml",
  malta: "mt",
  marruecos: "ma",
  mauricio: "mu",
  mauritania: "mr",
  mexico: "mx",
  micronesia: "fm",
  moldavia: "md",
  monaco: "mc",
  mongolia: "mn",
  montenegro: "me",
  mozambique: "mz",
  namibia: "na",
  nauru: "nr",
  nepal: "np",
  nicaragua: "ni",
  niger: "ne",
  nigeria: "ng",
  noruega: "no",
  "nueva zelanda": "nz",
  oman: "om",
  "paises bajos": "nl",
  pakistan: "pk",
  palaos: "pw",
  palestina: "ps",
  panama: "pa",
  "papua nueva guinea": "pg",
  paraguay: "py",
  peru: "pe",
  polonia: "pl",
  portugal: "pt",
  "reino unido": "gb",
  "republica centroafricana": "cf",
  "republica checa": "cz",
  "republica democratica del congo": "cd",
  "republica del congo": "cg",
  "republica dominicana": "do",
  ruanda: "rw",
  rumania: "ro",
  rusia: "ru",
  samoa: "ws",
  "san cristobal y nieves": "kn",
  "san marino": "sm",
  "san vicente y las granadinas": "vc",
  "santa lucia": "lc",
  "santo tome y principe": "st",
  senegal: "sn",
  serbia: "rs",
  seychelles: "sc",
  "sierra leona": "sl",
  singapur: "sg",
  siria: "sy",
  somalia: "so",
  "sri lanka": "lk",
  suazilandia: "sz",
  sudafrica: "za",
  sudan: "sd",
  "sudan del sur": "ss",
  suecia: "se",
  suiza: "ch",
  surinam: "sr",
  tailandia: "th",
  taiwan: "tw",
  tanzania: "tz",
  tayikistan: "tj",
  "timor oriental": "tl",
  togo: "tg",
  tonga: "to",
  "trinidad y tobago": "tt",
  tunez: "tn",
  turkmenistan: "tm",
  turquia: "tr",
  tuvalu: "tv",
  ucrania: "ua",
  uganda: "ug",
  uruguay: "uy",
  uzbekistan: "uz",
  vanuatu: "vu",
  venezuela: "ve",
  vietnam: "vn",
  yemen: "ye",
  yibuti: "dj",
  zambia: "zm",
  zimbabue: "zw",
};

function countryIsoCode(country) {
  return countryIsoCodes[normalizeCountryName(country)] ?? "";
}

function renderCountryFlag(country, className = "") {
  const code = countryIsoCode(country);
  if (!code) return "";
  const src = assetUrl(`assets/flags/4x3/${code}.svg`);
  const label = `Bandera de ${country}`;
  const classes = ["country-flag", className].filter(Boolean).join(" ");
  return `<img src="${escapeAttr(src)}" alt="${escapeAttr(label)}" class="${escapeAttr(classes)}" loading="lazy" onerror="console.warn('No se pudo cargar una bandera SVG local:', this.alt); this.hidden = true;" />`;
}

const adminCountries = [
  "Afganistán",
  "Albania",
  "Alemania",
  "Andorra",
  "Angola",
  "Antigua y Barbuda",
  "Arabia Saudita",
  "Argelia",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaiyán",
  "Bahamas",
  "Bangladés",
  "Barbados",
  "Baréin",
  "Bélgica",
  "Belice",
  "Benín",
  "Bielorrusia",
  "Birmania",
  "Bolivia",
  "Bosnia y Herzegovina",
  "Botsuana",
  "Brasil",
  "Brunéi",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Bután",
  "Cabo Verde",
  "Camboya",
  "Camerún",
  "Canadá",
  "Catar",
  "Chad",
  "Chile",
  "China",
  "Chipre",
  "Ciudad del Vaticano",
  "Colombia",
  "Comoras",
  "Corea del Norte",
  "Corea del Sur",
  "Costa de Marfil",
  "Costa Rica",
  "Croacia",
  "Cuba",
  "Dinamarca",
  "Dominica",
  "Ecuador",
  "Egipto",
  "El Salvador",
  "Emiratos Árabes Unidos",
  "Eritrea",
  "Eslovaquia",
  "Eslovenia",
  "España",
  "Estados Unidos",
  "Estonia",
  "Etiopía",
  "Filipinas",
  "Finlandia",
  "Fiyi",
  "Francia",
  "Gabón",
  "Gambia",
  "Georgia",
  "Ghana",
  "Granada",
  "Grecia",
  "Guatemala",
  "Guyana",
  "Guinea",
  "Guinea-Bisáu",
  "Guinea Ecuatorial",
  "Haití",
  "Honduras",
  "Hungría",
  "India",
  "Indonesia",
  "Irak",
  "Irán",
  "Irlanda",
  "Islandia",
  "Islas Marshall",
  "Islas Salomón",
  "Israel",
  "Italia",
  "Jamaica",
  "Japón",
  "Jordania",
  "Kazajistán",
  "Kenia",
  "Kirguistán",
  "Kiribati",
  "Kosovo",
  "Kuwait",
  "Laos",
  "Lesoto",
  "Letonia",
  "Líbano",
  "Liberia",
  "Libia",
  "Liechtenstein",
  "Lituania",
  "Luxemburgo",
  "Macedonia del Norte",
  "Madagascar",
  "Malasia",
  "Malaui",
  "Maldivas",
  "Malí",
  "Malta",
  "Marruecos",
  "Mauricio",
  "Mauritania",
  "México",
  "Micronesia",
  "Moldavia",
  "Mónaco",
  "Mongolia",
  "Montenegro",
  "Mozambique",
  "Namibia",
  "Nauru",
  "Nepal",
  "Nicaragua",
  "Níger",
  "Nigeria",
  "Noruega",
  "Nueva Zelanda",
  "Omán",
  "Países Bajos",
  "Pakistán",
  "Palaos",
  "Palestina",
  "Panamá",
  "Papúa Nueva Guinea",
  "Paraguay",
  "Perú",
  "Polonia",
  "Portugal",
  "Reino Unido",
  "República Centroafricana",
  "República Checa",
  "República Democrática del Congo",
  "República del Congo",
  "República Dominicana",
  "Ruanda",
  "Rumania",
  "Rusia",
  "Samoa",
  "San Cristóbal y Nieves",
  "San Marino",
  "San Vicente y las Granadinas",
  "Santa Lucía",
  "Santo Tomé y Príncipe",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leona",
  "Singapur",
  "Siria",
  "Somalia",
  "Sri Lanka",
  "Suazilandia",
  "Sudáfrica",
  "Sudán",
  "Sudán del Sur",
  "Suecia",
  "Suiza",
  "Surinam",
  "Tailandia",
  "Taiwán",
  "Tanzania",
  "Tayikistán",
  "Timor Oriental",
  "Togo",
  "Tonga",
  "Trinidad y Tobago",
  "Túnez",
  "Turkmenistán",
  "Turquía",
  "Tuvalu",
  "Ucrania",
  "Uganda",
  "Uruguay",
  "Uzbekistán",
  "Vanuatu",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Yibuti",
  "Zambia",
  "Zimbabue",
];

function canonicalAdminCountryName(value) {
  const normalized = normalizeCountryName(value);
  if (!normalized) return "";
  return adminCountries.find((country) => normalizeCountryName(country) === normalized) || "";
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

function renderListingControls({ filters = [], resultLabel = "registros", singularLabel = "registro", defaultSort = "recent" }) {
  return `
    <div class="listing-tools" data-result-label="${escapeAttr(resultLabel)}" data-result-singular="${escapeAttr(singularLabel)}">
      <div class="listing-controls">
        ${filters.map(renderFilterSelect).join("")}
        <label class="listing-label">
          Ordenar por
          <select class="listing-select" data-sort-control>
            ${defaultSort === "recommended" ? `<option value="recommended">Orden recomendado</option>` : ""}
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
  if (sortMode === "recommended") {
    const rankResult = numericValue(a.dataset.defaultRank) - numericValue(b.dataset.defaultRank);
    if (rankResult !== 0) return rankResult;
    return numericValue(a.dataset.sourceIndex) - numericValue(b.dataset.sourceIndex);
  }
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

function vimeoEmbedUrl(value) {
  if (!value || typeof value !== "string") return "";
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./, "");
    if (host === "player.vimeo.com" && url.pathname.startsWith("/video/")) {
      const id = url.pathname.split("/").filter(Boolean)[1] || "";
      return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : "";
    }
    if (!host.endsWith("vimeo.com")) return "";
    const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part)) || "";
    return id ? `https://player.vimeo.com/video/${id}` : "";
  } catch {
    return "";
  }
}

function vivenciaVideoEmbedUrl(experience) {
  const candidates = [experience.videoUrl, experience.video, experience.youtubeUrl, experience.media];
  const attempted = candidates.map(validMediaPath).filter(Boolean);
  for (const candidate of attempted) {
    const embedUrl = youtubeEmbedUrl(candidate) || vimeoEmbedUrl(candidate);
    if (embedUrl) return embedUrl;
  }
  if (hasContent(experience.videoUrl) || hasContent(experience.video) || hasContent(experience.youtubeUrl)) {
    console.warn("Vivencia: enlace de video no compatible, se usará imagen o solo texto.", experience.id || experience.titulo);
  }
  return "";
}

function vivenciaImagePath(experience) {
  const media = validMediaPath(experience.media || experience.imagen);
  if (!media) return "";
  if (youtubeEmbedUrl(media) || vimeoEmbedUrl(media)) return "";
  return media;
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
  const footerText = hasContent(footer.texto) ? `<p>${escapeHTML(footer.texto)}</p>` : "";
  const institutionLine = [footer.institucion, footer.campus].filter(hasContent).join(" · ");
  siteFooter.innerHTML = `
    <div class="footer-inner">
      <div>
        ${footerText}
        <small>${escapeHTML(institutionLine)}</small>
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
  const catalyst = programById(catalogLayout.catalystId);
  const heroImage = site.heroImage ?? {};
  app.innerHTML = `
    <section class="hero">
      <img
        class="hero-image"
        src="${escapeAttr(heroImage.src || "assets/images/hero/santafe-ranking-hero-2400.jpg")}"
        ${heroImage.srcset ? `srcset="${escapeAttr(heroImage.srcset)}" sizes="100vw"` : ""}
        alt="${escapeAttr(heroImage.alt || "")}"
      />
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

    <section class="catalog-section catalog-section--programs" id="catalogo">
      <div class="catalog-programs-stack">
        <div class="program-grid catalog-program-grid">
          ${catalyst ? renderProgramCard(catalyst) : ""}
          ${catalogLayout.groups
            .flatMap((group) =>
              programsByIds(group.careerIds).map((program) =>
                renderProgramCard(program, { entryId: group.id, entryLabel: group.cardLabel }),
              ),
            )
            .join("")}
        </div>
        <div class="catalog-other-entry">
          ${renderOtherProgramsEntry()}
        </div>
      </div>
    </section>
  `;
}

function renderProgramCard(program, options = {}) {
  const isCatalyst = program.tipo === "catalyst";
  const actionText = isCatalyst ? "Explorar CATALYST" : "Explorar carrera";
  const entryLabel = options.entryLabel || "";
  const entryId = ["computacion", "ingenieria"].includes(options.entryId) ? options.entryId : "";
  const showSantaFe = options.showSantaFe !== false;
  const catalystRequirements =
    isCatalyst && Array.isArray(program.requisitos) && program.requisitos.length
      ? `<div class="card-requirements">
          <strong>Requisitos</strong>
          <ul>
            ${program.requisitos.map((requirement) => `<li>${escapeHTML(requirement)}</li>`).join("")}
          </ul>
        </div>`
      : "";
  const body = isCatalyst
    ? `<div><strong>¿Qué es?</strong>${escapeHTML(program.queEs)}</div>${catalystRequirements}`
    : `<div><strong>¿Es para ti?</strong>${escapeHTML(program.esParaTi)}</div>
       ${showSantaFe ? `<div><strong>¿Por qué Santa Fe?</strong>${escapeHTML(program.porQueSantaFe)}</div>` : ""}`;

  return `
    <a
      class="program-card program-card-link${isCatalyst ? " program-card--catalyst" : ""}${entryLabel ? " program-card--entry" : ""}${entryId ? ` program-card--entry-${entryId}` : ""}"
      href="#programa/${program.id}"
      aria-label="${escapeAttr(actionText)}: ${escapeAttr(fullName(program))}"
      style="${styleVars(program)}">
      ${
        entryLabel
          ? `<div class="program-card-topline"><span class="entry-badge">${escapeHTML(entryLabel)}</span></div>`
          : ""
      }
      <h3>${escapeHTML(fullName(program))}</h3>
      <div class="tag-row">
        ${program.highlights.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
      </div>
      <div class="card-copy">${body}</div>
      <div class="card-footer">
        <span class="card-nav-hint">${escapeHTML(actionText)} <span aria-hidden="true">→</span></span>
      </div>
    </a>
  `;
}

function renderOtherProgramsEntry() {
  if (!otherCatalogCareers().length) return "";
  return `
    <a class="other-program-entry" href="#otras" aria-label="Ver otras carreras">
      <strong>Otras</strong>
      <span class="card-nav-hint">Ver otras carreras <span aria-hidden="true">→</span></span>
    </a>
  `;
}

function renderOtherProgramsPage() {
  const careers = otherCatalogCareers();
  app.innerHTML = `
    ${renderBreadcrumb(
      [
        { label: "Catálogo", href: "#inicio" },
        { label: "Otras" },
      ],
      { neutral: true },
    )}
    <section class="catalog-section other-programs-page">
      <div class="section-heading catalog-heading">
        <div>
          <p class="eyebrow">Catálogo secundario</p>
          <h1>Otras</h1>
        </div>
        <a class="button secondary" href="#catalogo">Volver al catálogo principal</a>
      </div>
      <div class="program-grid other-career-grid">
        ${careers
          .map((career) => {
            const entry = catalogLayout.otherCareerEntries[career.id] || {};
            return renderProgramCard(career, {
              entryId: entry.id,
              entryLabel: entry.cardLabel,
              showSantaFe: false,
            });
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderCareerHub(career) {
  const availableSections = career.seccionesDisponibles
    .map((slug) => ({ slug, ...sectionMeta[slug] }))
    .filter((section) => section.title);

  app.innerHTML = `
    <div class="theme-scope" style="${styleVars(career)}">
      ${renderDetailHero(
        career,
        "INGENIERÍA - SANTA FE",
        "Explora proyectos, aliados, movilidad internacional, empleabilidad y ventajas del campus.",
        "",
        { breadcrumbItems: careerBreadcrumbItems(career) },
      )}
      <section class="detail-shell career-sections-shell">
        <div class="section-grid section-nav-grid clickable-grid">
          ${availableSections.map((section) => renderSectionLink(career, section)).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderSectionLink(career, section) {
  const href = section.slug === "vivencia" ? `#vivencia/${career.id}` : `#programa/${career.id}/${section.slug}`;
  return `
    <a class="info-panel section-link-card" href="${href}">
      <h2><span class="section-dot" aria-hidden="true"></span>${escapeHTML(section.title)}</h2>
      <p>${escapeHTML(section.short)}</p>
      <span class="card-nav-hint">Ver sección <span aria-hidden="true">→</span></span>
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
    <div class="theme-scope" style="${styleVars(theme)}; --vivencia-link-accent: ${escapeAttr(fromCareer?.colorPrincipal || theme.colorPrincipal)}">
      ${renderDetailHero(
        theme,
        fromCareer ? careerShortName(fromCareer) : "VIVENCIA - SANTA FE",
        theme.tagline,
        "",
        {
          breadcrumbItems: fromCareer
            ? careerBreadcrumbItems(fromCareer, "vivencia")
            : [
                { label: "Catálogo", href: "#inicio" },
                { label: "Vivencia" },
              ],
        },
      )}
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
          defaultSort: "recommended",
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
  const embedUrl = vivenciaVideoEmbedUrl(experience);
  const imagePath = vivenciaImagePath(experience);
  const hasExternalLink = hasContent(experience.enlace);
  const hasQrCode = hasExternalLink && Boolean(validMediaPath(experience.codigoQR));
  const defaultRank = normalizedText(experience.categoria) === normalizedText("Escudería") ? 0 : hasQrCode ? 1 : 2;
  const year = experience["año"] ?? experience.ano ?? "";
  const media = embedUrl
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
    : imagePath
      ? `
        <div class="image-tile project-media media-crop-${(index % 5) + 1}" ${mediaStyle(imagePath, { version: true })}>
          <img src="${escapeAttr(assetUrl(imagePath, { version: true }))}" alt="" loading="lazy" style="display: none" onerror="this.closest('.project-media')?.remove()" />
        </div>
      `
      : "";
  const yearDetails = hasContent(year)
    ? `<dl class="meta-list"><div><dt>Año</dt><dd>${escapeHTML(year)}</dd></div></dl>`
    : "";
  const externalActions = hasExternalLink
    ? `
      <div class="external-link-wrapper vivencia-external-actions">
        <a class="button compact-button vivencia-resource-button" href="${escapeAttr(experience.enlace)}" target="_blank" rel="noreferrer">Abrir recurso</a>
        ${renderQrCode(experience.codigoQR, `Código QR de ${experience.titulo}`)}
      </div>
    `
    : "";

  return `
    <article
      class="feature-card project-card"
      data-filterable-card
      data-category="${escapeAttr(experience.categoria)}"
      data-date-sort="${yearValue(experience)}"
      data-default-rank="${defaultRank}"
      data-source-index="${index}"
      data-title="${escapeAttr(experience.titulo)}">
      ${media}
      <div class="feature-body">
        <p class="mini-label">${escapeHTML(experience.categoria)}</p>
        <h2>${escapeHTML(experience.titulo)}</h2>
        <p>${escapeHTML(experience.descripcion)}</p>
        <div class="tag-row">
          ${(experience.etiquetas ?? []).map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
        </div>
        ${yearDetails}
        ${externalActions}
      </div>
    </article>
  `;
}

function renderQrCode(path, alt) {
  const qrPath = validMediaPath(path);
  if (!qrPath) return "";
  return `
    <div class="qr-code-wrapper">
      <img
        class="qr-code-image"
        src="${escapeAttr(assetUrl(qrPath, { version: true }))}"
        alt="${escapeAttr(alt)}"
        loading="lazy"
        onerror="this.closest('.qr-code-wrapper')?.remove()" />
    </div>
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

function renderDetailHero(career, eyebrow, copy, sectionTitle = "", options = {}) {
  const title = sectionTitle || (career?.tipo === "career" ? careerShortName(career) : fullName(career));
  return `
    ${renderBreadcrumb(options.breadcrumbItems || [])}
    <section class="detail-hero">
      <div class="detail-hero-inner">
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
      ${renderDetailHero(career, careerShortName(career), section.short, section.title, {
        breadcrumbItems: careerBreadcrumbItems(career, slug),
      })}
      ${renderers[slug](career, pathParts)}
    </div>
  `;
  attachListingControls();
  attachUniversityNavigation();
  validateUniversityMedia();
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
  const thumbnail = validMediaPath(project.thumbnail);
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
    : thumbnail
      ? `<div class="image-tile project-media media-crop-${(index % 5) + 1}" ${mediaStyle(thumbnail)}></div>`
      : "";

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
  const logo = validMediaPath(partner.logo);
  const logoIsImage = /\.(png|jpg|jpeg|webp|svg)$/i.test(logo);
  const interactionTypes = partnerInteractionTypes(partner);
  const media = renderPartnerMedia(partner.imagenOVideo, index);
  return `
    <article class="feature-card partner-card">
      <div class="logo-row">
        ${
          logoIsImage
            ? `<div class="logo-tile image-logo"><img src="${escapeAttr(assetUrl(logo))}" alt="Logo de ${escapeAttr(partner.nombre)}" /></div>`
            : hasContent(partner.logo) ? `<div class="logo-tile">${escapeHTML(partner.logo)}</div>` : ""
        }
        <div class="partner-heading-content">
          <h2>${escapeHTML(partner.nombre)}</h2>
        </div>
      </div>
      ${interactionTypes.length ? `<div class="tag-row partner-tags">${interactionTypes.map((type) => `<span class="tag">${escapeHTML(type)}</span>`).join("")}</div>` : ""}
      ${hasContent(partner.descripcion) ? `<p>${escapeHTML(partner.descripcion)}</p>` : ""}
      ${media}
    </article>
  `;
}

function partnerInteractionTypes(partner) {
  if (Array.isArray(partner.tiposInteraccion)) {
    return partner.tiposInteraccion.map((item) => String(item).trim()).filter(Boolean);
  }
  return hasContent(partner.tipoInteraccion) ? [String(partner.tipoInteraccion).trim()] : [];
}

function renderPartnerMedia(mediaPath, index) {
  const media = validMediaPath(mediaPath);
  if (!media) return "";
  const embedUrl = youtubeEmbedUrl(media);
  if (embedUrl) {
    return `
      <div class="video-frame project-media partner-media">
        <iframe src="${escapeAttr(embedUrl)}" title="Interacción con estudiantes" allowfullscreen></iframe>
      </div>
    `;
  }
  return `
    <div
      class="image-tile media-crop-${(index % 5) + 2}"
      ${mediaStyle(media)}
      data-validate-image="${escapeAttr(assetUrl(media))}">
      <span>Interacción con estudiantes</span>
    </div>
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
        ${renderEmptyState(universities, "experiencias en el extranjero")}
        ${renderPageNav(career)}
      </section>
    `;
  }

  pendingUniversityMap = { career, countries, grouped };
  const selectedUniversities = hasSelectedCity ? grouped[selectedCountry][selectedCity] : [];
  return `
    <section class="detail-shell">
      ${renderUniversityFlowHeader("Mapa de países", "Explora experiencias internacionales por país y ciudad.")}
      <div class="university-map-card">
        <div class="university-map-column" data-university-map-column>
          ${renderWorldMap(career, countries, grouped)}
        </div>
        ${renderCountryInfoPanel(career, hasSelectedCountry ? selectedCountry : "", hasSelectedCity ? selectedCity : "", grouped)}
      </div>
      ${
        hasSelectedCity
          ? `
            <div class="university-action-row">
              <a class="button ghost compact-button" href="${universityHash(career, selectedCountry)}" data-university-nav data-career-id="${escapeAttr(career.id)}" data-country="${escapeAttr(selectedCountry)}">Volver a ciudades</a>
              <a class="button ghost compact-button" href="${universityHash(career)}" data-university-nav data-career-id="${escapeAttr(career.id)}">Volver al mapa</a>
            </div>
            <div class="content-grid university-grid" id="city-experience-results" data-city-experience-results>
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
      <p class="mini-label">Experiencias en el extranjero</p>
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
      <aside class="map-info-panel" data-country-info-panel>
        <p class="mini-label">Mapa de países</p>
        <h2>Selecciona un país resaltado para ver sus ciudades disponibles.</h2>
        <p>Los países con experiencias para esta carrera aparecen destacados con el color principal del programa.</p>
      </aside>
    `;
  }

  const cities = grouped[selectedCountry];
  const cityCount = Object.keys(cities).length;
  const universityCount = Object.values(cities).reduce((total, items) => total + items.length, 0);
  const flag = renderCountryFlag(selectedCountry);
  return `
    <aside class="map-info-panel" data-country-info-panel>
      <div class="country-panel-heading">
        ${flag ? `<span class="country-flag-wrapper">${flag}</span>` : ""}
        <div>
          <p class="mini-label">País seleccionado</p>
          <h2>${escapeHTML(selectedCountry)}</h2>
        </div>
      </div>
      <p class="country-summary">${cityCount} ciudad${cityCount === 1 ? "" : "es"} disponible${cityCount === 1 ? "" : "s"} · ${universityCount} experiencia${universityCount === 1 ? "" : "s"}</p>
      <p>Selecciona una ciudad:</p>
      <div class="city-list">
        ${Object.keys(cities)
          .sort((a, b) => a.localeCompare(b, "es"))
          .map((city) => renderCityOption(career, selectedCountry, city, cities[city].length, city === selectedCity))
          .join("")}
      </div>
      <a class="button ghost compact-button" href="${universityHash(career)}" data-university-nav data-career-id="${escapeAttr(career.id)}">Volver al mapa</a>
    </aside>
  `;
}

function renderCountryListButton(career, country, cities) {
  const cityCount = Object.keys(cities).length;
  return `
    <a class="country-list-button" href="${universityHash(career, country)}" data-university-nav data-career-id="${escapeAttr(career.id)}" data-country="${escapeAttr(country)}">
      <span>${escapeHTML(country)}</span>
      <small>${cityCount} ciudad${cityCount === 1 ? "" : "es"}</small>
    </a>
  `;
}

function renderCityOption(career, country, city, count, isActive = false) {
  return `
    <a class="city-choice ${isActive ? "is-active" : ""}" href="${universityHash(career, country, city)}" data-university-nav data-career-id="${escapeAttr(career.id)}" data-country="${escapeAttr(country)}" data-city="${escapeAttr(city)}">
      <span>${escapeHTML(city)}</span>
      <small>${count} experiencia${count === 1 ? "" : "s"}</small>
    </a>
  `;
}

function universityHash(career, country = "", city = "") {
  const parts = [`#programa/${career.id}/universidades`];
  if (country) parts.push(encodeHashPart(country));
  if (city) parts.push(encodeHashPart(city));
  return parts.join("/");
}

function attachUniversityNavigation() {
  document.querySelectorAll("[data-university-nav]").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      const career = siteData.carreras.find((item) => item.id === control.dataset.careerId);
      if (!career) return;
      navigateUniversityView(career, control.dataset.country || "", control.dataset.city || "");
    });
  });
}

function navigateUniversityView(career, country = "", city = "") {
  const scrollY = window.scrollY;
  const hash = universityHash(career, country, city);
  history.pushState(null, "", hash);
  renderSubpage(career, "universidades", [country, city].filter(Boolean).map(encodeHashPart));
  requestAnimationFrame(() => {
    if (city) {
      document.querySelector("[data-city-experience-results]")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    if (country && scrollCountryInfoIfStacked()) return;
    window.scrollTo({ top: scrollY, behavior: "auto" });
  });
}

function scrollCountryInfoIfStacked() {
  const mapColumn = document.querySelector("[data-university-map-column]");
  const countryPanel = document.querySelector("[data-country-info-panel]");
  if (!mapColumn || !countryPanel) return false;

  const mapRect = mapColumn.getBoundingClientRect();
  const panelRect = countryPanel.getBoundingClientRect();
  const panelIsBelowMap = panelRect.top >= mapRect.bottom - 2;
  if (!panelIsBelowMap) return false;

  const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 80;
  const scrollOffset = headerHeight + 22;
  const targetTop = countryPanel.getBoundingClientRect().top + window.scrollY - scrollOffset;
  window.scrollTo({
    top: Math.max(targetTop, 0),
    behavior: "smooth",
  });
  return true;
}

function hideMapTooltips() {
  document.querySelectorAll(".jvm-tooltip").forEach((tooltip) => {
    tooltip.classList.remove("active");
  });
}

function removeOrphanMapTooltips() {
  document.querySelectorAll(".jvm-tooltip").forEach((tooltip) => tooltip.remove());
}

function destroyActiveUniversityMap() {
  if (!activeUniversityMap) return;
  hideMapTooltips();
  try {
    activeUniversityMap.destroy();
  } catch (error) {
    console.warn("No se pudo destruir el mapa anterior.", error);
  }
  activeUniversityMap = null;
  removeOrphanMapTooltips();
}

function initializePendingUniversityMap() {
  if (!pendingUniversityMap) return;
  const mapElement = document.querySelector("#university-world-map");
  if (!mapElement) return;

  const { career, countries, grouped } = pendingUniversityMap;
  const countryByCode = countries.reduce((lookup, country) => {
    const code = countryIsoCode(country).toUpperCase();
    if (code) lookup[code] = country;
    return lookup;
  }, {});
  const highlightedCodes = Object.keys(countryByCode);
  const accent = getComputedStyle(document.querySelector(".theme-scope")).getPropertyValue("--accent").trim() || "#0055a6";

  destroyActiveUniversityMap();

  if (typeof jsVectorMap !== "function" || !highlightedCodes.length) {
    mapElement.innerHTML = `<div class="map-loading">No se pudo cargar el mapa interactivo. Usa la lista de países disponibles.</div>`;
    return;
  }

  mapElement.innerHTML = "";
  activeUniversityMap = new jsVectorMap({
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
      tooltip.text(`${country}: ${cities} ciudad${cities === 1 ? "" : "es"} · ${universities} experiencia${universities === 1 ? "" : "s"}`);
    },
    onRegionClick(event, code) {
      hideMapTooltips();
      const country = countryByCode[code];
      if (!country) {
        event.preventDefault();
        return;
      }
      navigateUniversityView(career, country);
    },
  });
  mapElement.addEventListener("mouseleave", hideMapTooltips);
}

function renderUniversity(university, index) {
  const overlayLabel = renderLocationBadge(university.pais, university.ciudad);
  const media = renderUniversityMedia(university, overlayLabel, index);
  const tags = Array.isArray(university.areasRelacionadas) ? university.areasRelacionadas.filter(hasContent) : [];
  const experienceMeta = [
    hasContent(university.alumno) ? `<div><dt>Alumno</dt><dd>${escapeHTML(university.alumno)}</dd></div>` : "",
    hasContent(university.tipoExperiencia) ? `<div><dt>Tipo de experiencia</dt><dd>${escapeHTML(university.tipoExperiencia)}</dd></div>` : "",
    hasContent(university["año"]) ? `<div><dt>Año</dt><dd>${escapeHTML(university["año"])}</dd></div>` : "",
  ].filter(Boolean).join("");
  return `
    <article class="feature-card university-card">
      ${media}
      <div class="feature-body">
        <p class="mini-label">${escapeHTML(university.ciudad)}, ${escapeHTML(university.pais)}</p>
        <h2>${escapeHTML(university.nombre)}</h2>
        ${hasContent(university.descripcion) ? `<p>${escapeHTML(university.descripcion)}</p>` : ""}
        ${experienceMeta ? `<dl class="meta-list">${experienceMeta}</dl>` : ""}
        ${tags.length ? `<div class="tag-row">${tags.map((area) => `<span class="tag">${escapeHTML(area)}</span>`).join("")}</div>` : ""}
      </div>
    </article>
  `;
}

function renderUniversityMedia(university, overlayLabel, index) {
  const imagePath = validMediaPath(university.imagen);
  if (!imagePath) return "";
  const imageUrl = assetUrl(imagePath, { version: true });
  return `
    <div
      class="image-tile wide-tile media-crop-${(index % 5) + 3}"
      data-validate-image="${escapeAttr(imageUrl)}">
      <img class="university-media-image" src="${escapeAttr(imageUrl)}" alt="Imagen de ${escapeAttr(university.nombre)}" loading="lazy" />
      ${overlayLabel}
    </div>
  `;
}

function renderLocationBadge(country, city) {
  const label = [country, city].filter(Boolean).join(" · ");
  return `
    <span class="location-badge experience-location-overlay">
      ${renderCountryFlag(country, "experience-location-flag")}
      <span>${escapeHTML(label)}</span>
    </span>
  `;
}

function validateUniversityMedia() {
  document.querySelectorAll("[data-validate-image]").forEach((tile) => {
    const imageUrl = tile.dataset.validateImage;
    const renderedImage = tile.querySelector("img");
    const removeTile = () => tile.remove();
    if (!imageUrl) {
      tile.remove();
      return;
    }
    if (renderedImage) {
      renderedImage.addEventListener("error", removeTile, { once: true });
    }
    const image = new Image();
    image.onerror = removeTile;
    image.src = imageUrl;
  });
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
        resultLabel: "perfiles de empleabilidad",
        singularLabel: "perfil de empleabilidad",
      })}
      <div class="content-grid exatec-grid" data-listing-grid>
        ${profiles.map((profile, index) => renderExatec(profile, index)).join("")}
      </div>
      ${renderPageNav(career)}
    </section>
  `;
}

function renderExatec(profile, index) {
  const photo = profilePhotoPath(profile);
  const companyLogo = validMediaPath(profile.logoEmpresa);
  const description = hasContent(profile.descripcion) ? `<p>${escapeHTML(profile.descripcion)}</p>` : "";
  const hasLinkedin = hasContent(profile.linkedinUrl);
  const linkedin = hasLinkedin
    ? `
      <div class="external-link-wrapper employability-actions">
        <div class="linkedin-button-wrapper">
          <a class="button ghost compact-button linkedin-button" href="${escapeAttr(profile.linkedinUrl)}" target="_blank" rel="noreferrer">LinkedIn</a>
        </div>
        ${renderQrCode(profile.codigoQR, `Código QR de LinkedIn de ${profile.nombre}`)}
      </div>
    `
    : "";
  const company = hasContent(profile.empresa)
    ? `
      <div class="employability-company">
        ${companyLogo ? `
          <div class="employability-company-logo">
            <img src="${escapeAttr(assetUrl(companyLogo))}" alt="Logo de ${escapeAttr(profile.empresa)}" onerror="this.closest('.employability-company-logo')?.remove()" />
          </div>
        ` : ""}
        <span>${escapeHTML(profile.empresa)}</span>
      </div>
    `
    : "";

  return `
    <article
      class="feature-card exatec-card"
      data-filterable-card
      data-generation="${escapeAttr(profile.generacion)}"
      data-date-sort="${generationRank(profile.generacion)}"
      data-title="${escapeAttr(profile.nombre)}">
      <div class="employability-profile ${!photo ? "has-no-photo" : ""}">
        ${photo ? `
          <div class="profile-photo employability-photo">
            <img src="${escapeAttr(assetUrl(photo))}" alt="Foto de ${escapeAttr(profile.nombre)}" onerror="this.closest('.profile-photo')?.remove()" />
          </div>
        ` : ""}
        <div class="employability-profile-info">
          ${hasContent(profile.generacion) ? `<p class="mini-label">${escapeHTML(profile.generacion)}</p>` : ""}
          <h2>${escapeHTML(profile.nombre)}</h2>
          ${hasContent(profile.puestoActual) ? `<p class="role-line">${escapeHTML(profile.puestoActual)}</p>` : ""}
          ${company}
        </div>
      </div>
      ${description}
      ${linkedin}
    </article>
  `;
}

function profilePhotoPath(profile) {
  return validMediaPath(profile.fotoAlumno || profile.foto || "");
}

function renderSantaFePage(career) {
  const santaFeImage = sectionImageFor(career, "santa-fe");
  const excelAdvantages = Array.isArray(career.santaFeFichas) ? career.santaFeFichas.filter((item) => hasContent(item?.titulo)) : [];
  const advantages = excelAdvantages.length
    ? excelAdvantages
    : [
        {
          titulo: "Laboratorios",
          descripcion: `Espacios para probar, medir y documentar soluciones vinculadas a ${career.highlights[0].toLowerCase()}.`,
        },
        {
          titulo: "Ubicación",
          descripcion: "Santa Fe conecta el aula con corporativos, startups, movilidad urbana y retos de ciudad.",
        },
        {
          titulo: "Proyectos",
          descripcion: "Retos integradores, semanas intensivas y experiencias con socios formadores durante el semestre.",
        },
        {
          titulo: "Comunidad",
          descripcion: "Equipos multidisciplinarios, profesores cercanos y actividades que impulsan colaboración entre carreras.",
        },
        {
          titulo: "CATALYST",
          descripcion: "Experiencias para acelerar ideas, formar comunidad y conectar estudiantes con mentoría temprana.",
        },
        {
          titulo: "Ventaja campus",
          descripcion: career.porQueSantaFe,
        },
      ];

  return `
    <section class="detail-shell">
      <div class="campus-feature">
        <div>
          <p class="mini-label">Campus Santa Fe</p>
          <h2>${escapeHTML(fullName(career))} en un entorno conectado con la ciudad</h2>
          <p>Una ubicación estratégica, espacios de prototipado, laboratorios especializados y la cercanía con empresas hacen de Campus Santa Fe un entorno donde la ingeniería se aprende mediante experiencias y retos reales.</p>
        </div>
        <div class="campus-photo" ${mediaStyle(santaFeImage, { version: true })}></div>
      </div>
      <div class="advantage-grid">
        ${advantages
          .map(
            (item) => `
              <article class="advantage-card">
                <h3><span class="section-dot" aria-hidden="true"></span>${escapeHTML(item.titulo)}</h3>
                ${hasContent(item.descripcion) ? `<p>${escapeHTML(item.descripcion)}</p>` : ""}
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
      ${renderDetailHero(program, "PROGRAMA DE ALTO RENDIMIENTO", program.tagline, "", {
        breadcrumbItems: catalystBreadcrumbItems(),
      })}
      <section class="detail-shell">
        <div class="section-grid section-nav-grid">
          ${siteData.catalyst.secciones.map((section) => renderCatalystPanel(section)).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderCatalystPanel(section) {
  const body = renderCatalystPanelBody(section);
  if (section.ruta) {
    return `
      <a class="info-panel section-link-card catalyst-panel-link" href="${escapeAttr(section.ruta)}">
        <h2><span class="section-dot" aria-hidden="true"></span>${escapeHTML(section.titulo)}</h2>
        ${body}
        <span class="card-nav-hint">Ver sección <span aria-hidden="true">→</span></span>
      </a>
    `;
  }

  return `
    <article class="info-panel">
      <h2><span class="section-dot" aria-hidden="true"></span>${escapeHTML(section.titulo)}</h2>
      ${body}
    </article>
  `;
}

function renderCatalystPanelBody(section) {
  if (Array.isArray(section.bullets) && section.bullets.length) {
    return `
      <ul class="catalyst-panel-bullets">
        ${section.bullets.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
      </ul>
    `;
  }
  return section.descripcion ? `<p>${escapeHTML(section.descripcion)}</p>` : "";
}

function catalystDetailsFor(category) {
  const details = Array.isArray(siteData.catalyst.detalles) ? siteData.catalyst.detalles : [];
  if (details.length) return details.filter((item) => item.categoria === category);
  if (category === "actividades") return siteData.catalyst.actividades ?? [];
  return [];
}

function catalystSectionById(category) {
  return siteData.catalyst.secciones.find((section) => section.id === category) ?? null;
}

function renderCatalystCategoryPage(program, category) {
  const section = catalystSectionById(category);
  if (!section || section.id === "que-es") {
    renderCatalystDetail(program);
    return;
  }
  const items = catalystDetailsFor(category);
  const showActivityControls = false;
  const compactItems = items.filter((item) => !catalystHasMedia(item));
  const mediaItems = items.filter((item) => catalystHasMedia(item));
  const renderCatalystGrid = (gridItems, modifier) => gridItems.length
    ? `<div class="content-grid activity-grid ${modifier}" ${showActivityControls ? "data-listing-grid" : ""}>
        ${gridItems.map((item, index) => renderCatalystDetailCard(item, category, index, showActivityControls)).join("")}
      </div>`
    : "";
  app.innerHTML = `
    <div class="theme-scope" style="${styleVars(program)}">
      ${renderDetailHero(
        program,
        section.titulo,
        section.descripcion,
        "CATALYST",
        { breadcrumbItems: catalystBreadcrumbItems(category) },
      )}
      <section class="detail-shell" data-listing-region>
        ${
          showActivityControls
            ? renderListingControls({
                filters: [
                  {
                    id: "cycle",
                    label: "Año / Generación",
                    options: uniqueOptions(items, catalystActivityCycle, (a, b) => generationRank(a) - generationRank(b)),
                  },
                ],
                resultLabel: "actividades CATALYST",
                singularLabel: "actividad CATALYST",
              })
            : ""
        }
        ${renderCatalystGrid(compactItems, "activity-grid--compact")}
        ${renderCatalystGrid(mediaItems, "activity-grid--media")}
        ${renderEmptyState(items, section.titulo.toLowerCase())}
        <nav class="page-nav" aria-label="Navegación de CATALYST">
          <a class="button ghost" href="#programa/catalyst">Volver a CATALYST</a>
          <a class="button secondary" href="#inicio">Volver al catálogo principal</a>
        </nav>
      </section>
    </div>
  `;
  if (showActivityControls) attachListingControls();
}

function catalystActivityCycle(activity) {
  return [activity.anio, activity.generacion].filter(Boolean).join(" · ");
}

function normalizeTags(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.replace(/,/g, "\n").split(/\r?\n/)
      : [];
  const seen = new Set();
  return raw
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLocaleLowerCase("es");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function catalystMedia(item, index) {
  const legacyMedia = validMediaPath(item.imagenOVideo || item.media || item.multimedia || item.recurso || item.urlMedia);
  const videoSource = validMediaPath(item.video || item.videoUrl || item.youtubeUrl);
  const mediaLooksVideo = youtubeEmbedUrl(legacyMedia) || vimeoEmbedUrl(legacyMedia);
  const mediaType = String(item.tipoMedia || item.mediaType || item.tipoMultimedia || item.media_type || "").trim().toLowerCase();
  const mediaCandidate = videoSource || (mediaType === "video" || mediaLooksVideo ? legacyMedia : "");
  const video = youtubeEmbedUrl(mediaCandidate) || vimeoEmbedUrl(mediaCandidate);
  if (video) {
    return `
      <div class="video-frame">
        <iframe
          src="${escapeAttr(video)}"
          title="Video: ${escapeAttr(item.titulo || item.nombre || "CATALYST") }"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen>
        </iframe>
      </div>
    `;
  }
  if (mediaCandidate) {
    console.warn("CATALYST: enlace de video no compatible, se usará imagen o solo texto.", item.id || item.titulo);
  }
  const image = validMediaPath(item.imagen || item.foto || (mediaType !== "video" && !mediaLooksVideo ? legacyMedia : ""));
  if (!image || youtubeEmbedUrl(image) || vimeoEmbedUrl(image)) return "";
  return `
    <div class="image-tile media-crop-${(index % 5) + 1}" ${mediaStyle(image)}>
    </div>
  `;
}

function catalystHasMedia(item) {
  const legacyMedia = validMediaPath(item.imagenOVideo || item.media || item.multimedia || item.recurso || item.urlMedia);
  const videoSource = validMediaPath(item.video || item.videoUrl || item.youtubeUrl);
  const mediaLooksVideo = youtubeEmbedUrl(legacyMedia) || vimeoEmbedUrl(legacyMedia);
  const mediaType = String(item.tipoMedia || item.mediaType || item.tipoMultimedia || item.media_type || "").trim().toLowerCase();
  const mediaCandidate = videoSource || (mediaType === "video" || mediaLooksVideo ? legacyMedia : "");
  if (youtubeEmbedUrl(mediaCandidate) || vimeoEmbedUrl(mediaCandidate)) return true;
  const image = validMediaPath(item.imagen || item.foto || (mediaType !== "video" && !mediaLooksVideo ? legacyMedia : ""));
  return Boolean(image && !youtubeEmbedUrl(image) && !vimeoEmbedUrl(image));
}

function renderCatalystBody(body) {
  if (!hasContent(body)) return "";
  const lines = String(body).split(/\r?\n/);
  const blocks = [];
  let listItems = [];
  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(`<ul class="catalyst-detail-list">${listItems.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }
    const bullet = trimmed.match(/^[*-]\s+(.+)$/);
    if (bullet) {
      listItems.push(bullet[1].trim());
      return;
    }
    flushList();
    blocks.push(`<p>${escapeHTML(trimmed)}</p>`);
  });
  flushList();
  return blocks.join("");
}

function renderCatalystDetailCard(item, category, index, filterable = false) {
  const title = item.titulo || item.nombre || "";
  const label = sectionLabelForCatalyst(category);
  const body = item.descripcion || item.testimonio || "";
  const year = hasContent(item["a\u00f1o"] ?? item.anio ?? item.ano) ? String(item["a\u00f1o"] ?? item.anio ?? item.ano).trim() : "";
  const media = catalystMedia(item, index);
  const tags = category === "actividades" ? normalizeTags(item.etiquetas) : [];
  const mediaClass = media ? "activity-card--with-media" : "activity-card--compact";
  return `
    <article
      class="feature-card activity-card ${mediaClass}"
      ${filterable ? "data-filterable-card" : ""}
      data-cycle="${escapeAttr(label)}"
      data-date-sort="${generationRank(label)}"
      data-title="${escapeAttr(title || body || item.id || "CATALYST")}">
      ${media}
      <div class="feature-body">
        ${year ? `<p class="mini-label">${escapeHTML(year)}</p>` : ""}
        ${title ? `<h2>${escapeHTML(title)}</h2>` : ""}
        ${
          tags.length
            ? `<div class="tag-row catalyst-activity-tags">
                ${tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
              </div>`
            : ""
        }
        ${renderCatalystBody(body)}
      </div>
    </article>
  `;
}

function sectionLabelForCatalyst(category) {
  const labels = {
    comunidad: "Comunidad motivada",
    actividades: "Actividades opcionales",
    testimonios: "Testimonios de estudiantes",
  };
  return labels[category] ?? "CATALYST";
}

const adminResources = [
  { key: "proyectos", label: "Proyectos", filename: "proyectos.json", type: "array" },
  { key: "socios", label: "Socios formadores", filename: "socios.json", type: "array" },
  { key: "universidades", label: "Experiencias en el extranjero", filename: "universidades.json", type: "array" },
  { key: "exatecs", label: "Empleabilidad", filename: "exatecs.json", type: "array" },
  { key: "catalystDetails", label: "Contenido CATALYST", filename: "catalyst.json", type: "array" },
  { key: "vivencia", label: "Vivencia", filename: "vivencia.json", type: "array" },
];

const adminNewItemValue = "__new__";

const vivenciaCategories = [
  "Biblioteca",
  "Escudería",
  "Grupo estudiantil",
  "Premios",
  "Deportes",
  "Arte y cultura",
  "Certificaciones",
  "Bootcamps",
];

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
    required: ["carreraId", "id", "nombre", "pais", "año"],
  },
  exatecs: {
    prefixField: "carreraId",
    segment: "exatec",
    required: ["carreraId", "id", "nombre"],
  },
  catalystDetails: {
    fixedPrefix: "catalyst",
    segment: "detalle",
    required: ["id", "categoria"],
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
  if (key === "catalystDetails") return adminState.catalyst.detalles;
  return adminState[key];
}

function getAdminDownloadData(key) {
  if (key === "catalystDetails") return adminState.catalyst;
  if (key === "vivencia") return adminState.vivencia.map(cleanVivenciaRecord);
  return getAdminData(key);
}

function cleanVivenciaRecord(record) {
  const item = cloneData(record);
  migrateLegacyVivenciaMedia(item);
  delete item.mediaType;
  if (!Object.hasOwn(item, "videoUrl")) item.videoUrl = "";
  return item;
}

function migrateLegacyVivenciaMedia(item) {
  const media = validMediaPath(item.media);
  if (!media || hasContent(item.videoUrl)) return;
  if (youtubeEmbedUrl(media) || vimeoEmbedUrl(media)) {
    item.videoUrl = media;
    item.media = "";
  }
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
  const preferred = key === "universidades"
    ? ["carreraId", "id", "pais", "ciudad", "nombre", "alumno", "tipoExperiencia", "año"]
    : key === "exatecs"
      ? ["carreraId", "id", "fotoAlumno", "logoEmpresa", "nombre", "generacion", "puestoActual", "empresa", "descripcion", "linkedinUrl", "codigoQR"]
    : key === "vivencia"
      ? ["id", "categoria", "titulo", "descripcion", "año", "media", "videoUrl", "enlace", "codigoQR", "etiquetas"]
    : key === "catalystDetails"
      ? ["id", "categoria", "titulo", "año", "etiquetas", "descripcion", "imagen", "video"]
    : isCareerScopedAdminKey(key) ? ["carreraId", "id"] : ["id"];
  return [
    ...preferred.filter((field) => Object.hasOwn(object, field)).map((field) => [field, object[field]]),
    ...entries.filter(([field]) => !preferred.includes(field)),
  ];
}

function adminFieldLabel(field, key) {
  const labels = {
    id: "Id",
    categoria: "Categoría",
    carreraId: "Carrera Id",
    nombre: key === "universidades" ? "Universidad" : "Nombre",
    alumno: "Alumno",
    pais: "País",
    ciudad: "Ciudad",
    tipoExperiencia: "Tipo de experiencia",
    tipoInteraccion: "Tipos de interacción",
    tiposInteraccion: "Tipos de interacción",
    año: "Año",
    anio: "Año",
    titulo: "Título",
    descripcion: "Descripción",
    generacion: "Generación",
    fotoAlumno: "Foto del alumno",
    logoEmpresa: "Logo de la empresa",
    codigoQR: "Imagen del código QR",
    foto: "Foto del alumno",
    media: key === "vivencia" ? "Imagen" : "Media",
    videoUrl: "Enlace de video",
    video: "Enlace de video",
  };
  return labels[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function normalizeAdminItem(key, item) {
  if (!item) return;
  if (key === "socios") {
    if (!Array.isArray(item.tiposInteraccion)) {
      item.tiposInteraccion = hasContent(item.tipoInteraccion) ? [String(item.tipoInteraccion).trim()] : [];
    }
    delete item.tipoInteraccion;
  }
  if (key === "exatecs") {
    if (!hasContent(item.fotoAlumno) && hasContent(item.foto)) {
      item.fotoAlumno = item.foto;
    }
    delete item.foto;
    if (!Object.hasOwn(item, "logoEmpresa")) {
      item.logoEmpresa = "";
    }
    if (!Object.hasOwn(item, "codigoQR")) {
      item.codigoQR = "";
    }
  }
  if (key === "vivencia") {
    migrateLegacyVivenciaMedia(item);
    if (!Object.hasOwn(item, "videoUrl")) {
      item.videoUrl = "";
    }
    if (!Object.hasOwn(item, "codigoQR")) {
      item.codigoQR = "";
    }
    delete item.mediaType;
  }
  if (key === "catalystDetails") {
    normalizeCatalystDetailItem(item);
  }
}

function normalizeCatalystDetailItem(item) {
  const legacyMedia = validMediaPath(item.imagenOVideo || item.media || item.multimedia || item.recurso || item.urlMedia);
  const legacyType = String(item.tipoMedia || item.mediaType || item.tipoMultimedia || item.media_type || "").trim().toLowerCase();
  const legacyVideo = validMediaPath(item.videoUrl || item.youtubeUrl);
  if (!hasContent(item.descripcion) && hasContent(item.testimonio)) {
    item.descripcion = item.testimonio;
  }
  if (!hasContent(item.imagen) && hasContent(item.foto)) {
    item.imagen = item.foto;
  }
  if (!hasContent(item.video) && legacyVideo) {
    item.video = legacyVideo;
  }
  if (!hasContent(item["año"]) && hasContent(item.anio)) {
    item["año"] = item.anio;
  }
  if (legacyMedia && !hasContent(item.imagen) && !hasContent(item.video)) {
    const isVideo = legacyType === "video" || youtubeEmbedUrl(legacyMedia) || vimeoEmbedUrl(legacyMedia);
    if (isVideo) item.video = legacyMedia;
    else item.imagen = legacyMedia;
  }
  item.etiquetas = item.categoria === "actividades" ? normalizeTags(item.etiquetas) : [];
  [
    "destacado",
    "textoDestacado",
    "highlight",
    "featuredText",
    "tipoMedia",
    "mediaType",
    "tipoMultimedia",
    "media_type",
    "imagenOVideo",
    "media",
    "multimedia",
    "recurso",
    "urlMedia",
    "foto",
    "videoUrl",
    "youtubeUrl",
    "testimonio",
    "proyectoOExperiencia",
    "lugarOContexto",
    "anio",
    "generacion",
    "carrera",
    "nombre",
    "enlace",
  ].forEach((field) => delete item[field]);
  if (!Object.hasOwn(item, "imagen")) item.imagen = "";
  if (!Object.hasOwn(item, "video")) item.video = "";
  if (!Object.hasOwn(item, "año")) item["año"] = "";
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
  const target = isArray ? (isNew ? createBlankFromTemplate(adminBlankTemplates[key] ?? data[0], key) : data[index]) : data;
  const form = document.querySelector("#admin-form");

  if (!target) {
    form.innerHTML = `<p class="empty-state">No hay registros. Selecciona “+ Agregar nuevo registro” para capturar uno.</p>`;
    updateAdminOutput(key);
    return;
  }

  normalizeAdminItem(key, target);
  prepareAdminNewItem(target, key, isNew);
  form.innerHTML = renderAdminFields(target, "", key, isNew);
  form.querySelectorAll("[data-path]").forEach((field) => {
    const syncField = () => {
      applyAdminForm(target, form, key);
      if (isNew) {
        refreshGeneratedAdminId(key, target, form);
      } else {
        refreshAdminItemLabel(key);
      }
      if (key === "catalystDetails" && field.dataset.path === "categoria") {
        toggleCatalystAdminFields(form, target);
      }
      updateAdminOutput(key);
    };
    field.addEventListener("input", syncField);
    field.addEventListener("change", syncField);
    if (field.dataset.kind === "country") {
      field.addEventListener("blur", () => {
        if (!field.value.trim() || canonicalAdminCountryName(field.value)) return;
        field.value = target.pais || "";
        field.classList.toggle("field-error", !field.value);
        showAdminMessage("Selecciona un país válido de la lista de autocompletado.", "error");
        updateAdminOutput(key);
      });
    }
  });
  updateAdminOutput(key);
}

function renderAdminFields(object, prefix = "", key = "", isNew = false) {
  return orderedAdminEntries(object, key, prefix)
    .map(([field, value]) => {
      const path = prefix ? `${prefix}.${field}` : field;
      const label = adminFieldLabel(field, key);

      if (!prefix && field === "carreraId" && isCareerScopedAdminKey(key)) {
        return "";
      }

      if (!prefix && key === "catalystDetails" && field === "categoria") {
        const categories = [
          ["comunidad", "Comunidad motivada"],
          ["actividades", "Actividades opcionales"],
          ["testimonios", "Testimonios de estudiantes"],
        ];
        return `
          <label class="admin-label">
            ${escapeHTML(label)}
            <select class="admin-control" data-path="${escapeAttr(path)}" data-kind="string">
              ${categories.map(([categoryValue, categoryLabel]) => `<option value="${escapeAttr(categoryValue)}" ${value === categoryValue ? "selected" : ""}>${escapeHTML(categoryLabel)}</option>`).join("")}
            </select>
          </label>
        `;
      }

      if (!prefix && key === "vivencia" && field === "categoria") {
        return `
          <label class="admin-label">
            ${escapeHTML(label)}
            <select class="admin-control" data-path="${escapeAttr(path)}" data-kind="string">
              ${vivenciaCategories.map((category) => `<option value="${escapeAttr(category)}" ${value === category ? "selected" : ""}>${escapeHTML(category)}</option>`).join("")}
            </select>
          </label>
        `;
      }

      if (!prefix && key === "universidades" && field === "pais") {
        return `
          <label class="admin-label">
            ${escapeHTML(label)}
            <input class="admin-control" list="admin-country-options" data-path="${escapeAttr(path)}" data-kind="country" value="${escapeAttr(value)}" autocomplete="off" />
            <datalist id="admin-country-options">
              ${adminCountries.map((country) => `<option value="${escapeAttr(country)}"></option>`).join("")}
            </datalist>
          </label>
        `;
      }

      if (!prefix && key === "catalystDetails" && field === "etiquetas") {
        const hidden = object.categoria !== "actividades" ? " hidden" : "";
        return `
          <label class="admin-label" data-catalyst-tags-field${hidden}>
            ${escapeHTML(label)}
            <small class="admin-help">Escribe una etiqueta por línea.</small>
            <textarea class="admin-control" data-path="${escapeAttr(path)}" data-kind="array">${escapeHTML(normalizeTags(value).join("\n"))}</textarea>
          </label>
        `;
      }

      if (Array.isArray(value)) {
        const isPrimitiveArray = value.every((item) => typeof item !== "object");
        const helpText = key === "socios" && field === "tiposInteraccion"
          ? `<small class="admin-help">Escribe un tipo de interacción por línea.</small>`
          : "";
        return `
          <label class="admin-label">
            ${escapeHTML(label)}
            ${helpText}
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
      const numberAttrs = typeof value === "number" ? " min=\"1000\" max=\"9999\" step=\"1\"" : "";
      const control = isLong
        ? `<textarea class="admin-control" data-path="${escapeAttr(path)}" data-kind="string"${readonly}>${escapeHTML(value)}</textarea>`
        : `<input class="admin-control" type="${typeof value === "number" ? "number" : "text"}" data-path="${escapeAttr(path)}" data-kind="${typeof value === "number" ? "number" : "string"}" value="${escapeAttr(value)}"${readonly}${numberAttrs} />`;
      return `<label class="admin-label">${escapeHTML(label)}${control}</label>`;
    })
    .join("");
}

function applyAdminForm(target, form, key = "") {
  form.querySelectorAll("[data-path]").forEach((field) => {
    const kind = field.dataset.kind;
    let value = field.value;
    if (kind === "number") value = Number(value);
    if (kind === "country") {
      const canonicalCountry = canonicalAdminCountryName(value);
      if (String(value).trim() && !canonicalCountry) {
        field.classList.add("field-error");
        return;
      }
      field.classList.remove("field-error");
      value = canonicalCountry;
      field.value = value;
    }
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
  if (key) normalizeAdminItem(key, target);
}

function toggleCatalystAdminFields(form, target) {
  const tagField = form.querySelector("[data-catalyst-tags-field]");
  if (!tagField) return;
  tagField.hidden = target.categoria !== "actividades";
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
    tiposInteraccion: [],
    imagenOVideo: "",
  },
  universidades: {
    carreraId: "",
    id: "",
    pais: "",
    ciudad: "",
    nombre: "",
    alumno: "",
    tipoExperiencia: "",
    año: new Date().getFullYear(),
    descripcion: "",
    areasRelacionadas: [],
    imagen: "",
  },
  exatecs: {
    carreraId: "",
    id: "",
    fotoAlumno: "",
    logoEmpresa: "",
    nombre: "",
    generacion: "",
    puestoActual: "",
    empresa: "",
    descripcion: "",
    linkedinUrl: "",
    codigoQR: "",
  },
  catalystDetails: {
    id: "",
    categoria: "comunidad",
    titulo: "",
    "año": "",
    etiquetas: [],
    descripcion: "",
    imagen: "",
    video: "",
  },
  vivencia: {
    id: "",
    categoria: "Bootcamps",
    titulo: "",
    descripcion: "",
    "año": new Date().getFullYear(),
    media: "",
    videoUrl: "",
    enlace: "",
    codigoQR: "",
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
    categoria: "Categoría",
    titulo: "Título",
    nombre: "Nombre",
    pais: "País",
    tipoExperiencia: "Tipo de experiencia",
    generacion: "Generación",
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
  if (key === "universidades" && item.pais && !canonicalAdminCountryName(item.pais) && !missing.includes("pais")) {
    missing.push("pais");
  }
  if (key === "universidades" && !/^\d{4}$/.test(String(item["año"] ?? "")) && !missing.includes("año")) {
    missing.push("año");
  }
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
  const item = createBlankFromTemplate(adminBlankTemplates[key] ?? data[0], key);
  prepareAdminNewItem(item, key, true);
  normalizeAdminItem(key, item);
  applyAdminForm(item, form, key);
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
  if (!hash.includes("/universidades")) {
    destroyActiveUniversityMap();
  }

  if (hash === "#admin") {
    renderAdminDashboard();
    resetScroll();
    return;
  }

  if (hash === "#otras") {
    renderOtherProgramsPage();
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
      if (["comunidad", "actividades", "testimonios"].includes(sectionSlug)) {
        renderCatalystCategoryPage(program, sectionSlug);
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
  requestAnimationFrame(() => {
    const breadcrumb = document.querySelector(".page-breadcrumb");
    const current = breadcrumb?.querySelector('[aria-current="page"]');
    if (!breadcrumb || !current || breadcrumb.scrollWidth <= breadcrumb.clientWidth) return;
    const target = current.offsetLeft + current.offsetWidth - breadcrumb.clientWidth + 18;
    breadcrumb.scrollTo({ left: Math.max(0, target), behavior: "auto" });
  });
}

async function init() {
  renderLoading();
  try {
    siteData = await loadData();
    document.title = `${siteData.site.tituloSitio} | ${siteData.site.textoBienvenida}`;
    renderFooter();
    route();
    window.addEventListener("hashchange", route);
    window.addEventListener("popstate", route);
  } catch (error) {
    renderLoadError(error);
  }
}

init();
