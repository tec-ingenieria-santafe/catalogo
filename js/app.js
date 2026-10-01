const app = document.querySelector("#app");
const siteFooter = document.querySelector("#site-footer");
const catalogI18n = window.CatalogI18n;
let currentLanguage = catalogI18n?.getStoredLanguage() || "es";

const localizedText = (value, language = currentLanguage) => catalogI18n?.text(value, language) ?? String(value ?? "");
const localizedList = (value, language = currentLanguage) => catalogI18n?.list(value, language) ?? (Array.isArray(value) ? value : []);
const t = (key, variables = {}, language = currentLanguage) => catalogI18n?.message(key, language, variables) ?? key;
const localizedCategory = (group, value) => catalogI18n?.category(group, value, currentLanguage) ?? String(value ?? "");
const localizedCountry = (value) => catalogI18n?.country(value, currentLanguage) ?? String(value ?? "");

const dataFiles = {
  site: "data/site.json",
  carreras: "data/carreras.json",
  proyectos: "data/proyectos.json",
  socios: "data/socios.json",
  universidades: "data/universidades.json",
  exatecs: "data/exatecs.json",
  catalyst: "data/catalyst.json",
  quantum: "data/quantum.json",
  vivencia: "data/vivencia.json",
  becas: "data/becas.json",
};

const sectionMeta = {
  proyectos: {},
  socios: {},
  universidades: {},
  exatecs: {},
  "santa-fe": {},
  vivencia: {},
  becas: {},
};

const sectionMessageKeys = {
  proyectos: "studentProjects",
  socios: "industryPartners",
  universidades: "internationalExperiences",
  exatecs: "careerOutcomes",
  "santa-fe": "whyStudySantaFe",
  vivencia: "studentLife",
  becas: "scholarships",
};

const sectionDescriptions = {
  proyectos: {
    es: "Galería de prototipos, soluciones y retos desarrollados por estudiantes.",
    en: "A gallery of prototypes, solutions, and challenges developed by students.",
  },
  socios: {
    es: "Empresas e instituciones que colaboran con retos, mentoría y experiencias.",
    en: "Companies and institutions that collaborate through challenges, mentoring, and experiences.",
  },
  universidades: {
    es: "Experiencias internacionales en universidades, ciudades y países alrededor del mundo.",
    en: "International experiences at universities, cities, and countries around the world.",
  },
  exatecs: {
    es: "Conoce perfiles de estudiantes y EXATECs, sus prácticas y trayectorias profesionales vinculadas a la carrera.",
    en: "Meet students and alumni and learn about their internships and professional paths related to the program.",
  },
  "santa-fe": {
    es: "Laboratorios, ubicación, CATALYST, comunidad y ventajas específicas del campus.",
    en: "Laboratories, location, CATALYST, community, and campus-specific advantages.",
  },
  vivencia: {
    es: "Descubre grupos estudiantiles, escuderías, actividades y experiencias que complementan tu formación dentro y fuera de clases.",
    en: "Discover student organizations, racing teams, activities, and experiences that complement your education inside and outside the classroom.",
  },
  becas: { es: "", en: "" },
};

function localizedSectionMeta(slug) {
  return {
    slug,
    title: t(sectionMessageKeys[slug] || slug),
    short: localizedText(sectionDescriptions[slug] || sectionMeta[slug]?.short),
  };
}

const catalogLayout = {
  catalystId: "catalyst",
  quantumId: "quantum",
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
    "financial-engineering": { es: "Financial Engineering", en: "Financial Engineering" },
    "ai-data-science": { es: "AI & Data Science", en: "AI & Data Science" },
    computacionales: { es: "Tecnologías Computacionales", en: "Computer Technologies" },
    mecanica: { es: "Mecánica", en: "Mechanical Engineering" },
    mecatronica: { es: "Mecatrónica", en: "Mechatronics" },
    industrial: { es: "Industrial y Sistemas", en: "Industrial Engineering" },
    civil: { es: "Civil", en: "Civil Engineering" },
    "desarrollo-sustentable": { es: "Desarrollo Sustentable", en: "Sustainable Development" },
    "innovacion-desarrollo": { es: "Innovación y Desarrollo", en: "Innovation and Development" },
    "transformacion-digital": { es: "Transformación Digital", en: "Digital Transformation" },
    catalyst: "CATALYST",
    quantum: "QUANTUM",
  },
  sections: {
    proyectos: { es: "Proyectos", en: "Projects" },
    socios: { es: "Socios", en: "Partners" },
    universidades: { es: "Experiencias", en: "Experiences" },
    exatecs: { es: "Empleabilidad", en: "Career Outcomes" },
    "santa-fe": { es: "¿Por qué Santa Fe?", en: "Why Santa Fe?" },
    vivencia: { es: "Vivencia", en: "Student Life" },
    becas: { es: "Becas", en: "Scholarships" },
  },
  specialProgram: {
    comunidad: { es: "Comunidad", en: "Community" },
    actividades: { es: "Actividades opcionales", en: "Optional Activities" },
    testimonios: { es: "Testimonios", en: "Testimonials" },
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
  if (career?.tipo !== "career") return localizedText(career?.nombre);
  const name = localizedText(career?.nombre);
  const subtitle = currentLanguage === "en" && career?.subtitulo && typeof career.subtitulo === "object"
    ? String(career.subtitulo.en || "").trim()
    : localizedText(career?.subtitulo);
  const completeName = !subtitle || normalizedText(subtitle) === normalizedText(name) ? name : `${name} (${subtitle})`;
  return withLanguageAvailability(completeName, career);
}

function careerShortName(career) {
  const name = localizedText(career?.nombreCorto || career?.nombre).replace(/\s*\([^)]*\)\s*/g, "").trim();
  return withLanguageAvailability(name, career);
}

function withLanguageAvailability(name, career) {
  if (currentLanguage !== "en" || !career?.onlyInSpanish || !name) return name;
  return `${name} (${t("onlyInSpanish")})`;
}

function careerAcronymLines(career, language = currentLanguage) {
  const source = career?.acronimo;
  const localized = source && typeof source === "object" && !Array.isArray(source)
    ? source[language] ?? source.es
    : source;
  const values = Array.isArray(localized)
    ? localized
    : String(localized ?? "").split(/\s+-\s+/);
  return values.map((value) => String(value).trim()).filter(Boolean);
}

function careerAcronym(career, language = currentLanguage) {
  return careerAcronymLines(career, language).join(" - ");
}

function careerAcronymSizeClass(lines) {
  if (lines.length > 1) return "career-acronym-watermark--stacked";
  const length = lines[0]?.replace(/\s/g, "").length || 0;
  if (length <= 2) return "acronym--short";
  if (length === 3) return "acronym--medium";
  return "acronym--long";
}

function scholarshipPercentage(value) {
  if (value === undefined || value === null || String(value).trim() === "") return "X";
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) return "X";
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(2)));
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
  return localizedText(breadcrumbLabels.careers[career?.id]) || careerShortName(career);
}

function careerBreadcrumbItems(career, sectionSlug = "") {
  const items = [{ label: t("catalog"), href: "#inicio" }];
  if (career?.catalogGroup === "otras") {
    items.push({ label: t("otherPrograms"), href: "#otras" });
  }
  items.push({
    label: careerBreadcrumbLabel(career),
    href: sectionSlug ? `#programa/${career.id}` : "",
  });
  if (sectionSlug) {
    items.push({ label: localizedText(breadcrumbLabels.sections[sectionSlug]) || localizedText(sectionMeta[sectionSlug]?.title) || sectionSlug });
  }
  return items;
}

function specialProgramBreadcrumbItems(program, category = "") {
  const items = [
    { label: t("catalog"), href: "#inicio" },
    { label: localizedText(program.nombre), href: category ? `#programa/${program.id}` : "" },
  ];
  if (category) {
    items.push({ label: localizedText(breadcrumbLabels.specialProgram[category]) || sectionLabelForSpecialProgram(category, program) });
  }
  return items;
}

function renderBreadcrumb(items, options = {}) {
  const validItems = (items || []).filter((item) => item?.label);
  if (!validItems.length) return "";
  const style = options.neutral ? ' style="--breadcrumb-accent: #465568"' : "";
  return `
    <nav class="page-breadcrumb" aria-label="${escapeAttr(currentLanguage === "en" ? "Breadcrumb" : "Ruta de navegación")}"${style}>
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
    return career.sectionImages?.vivencia || "assets/images/vivencia/bootcamp_women.jpg";
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
  if (value && typeof value === "object") return hasContent(localizedText(value)) || Object.values(value).some((item) => hasContent(item));
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function renderFormattedDescription(value) {
  value = localizedText(value);
  if (!hasContent(value)) return "";

  const lines = String(value).replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraphLines = [];
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push(`<p>${paragraphLines.map(escapeHTML).join("<br>")}</p>`);
    paragraphLines = [];
  };
  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(`<ul>${listItems.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  lines.forEach((line) => {
    const bullet = line.match(/^[-*]\s+(.+?)\s*$/);
    if (bullet && bullet[1].trim()) {
      flushParagraph();
      listItems.push(bullet[1].trim());
      return;
    }

    const text = line.trim();
    if (!text) {
      flushParagraph();
      flushList();
      return;
    }

    flushList();
    paragraphLines.push(text);
  });

  flushParagraph();
  flushList();
  return blocks.length ? `<div class="formatted-description">${blocks.join("")}</div>` : "";
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

function localizedSemester(value) {
  const text = String(value ?? "");
  return currentLanguage === "en" ? text.replace(/^Semestre\b/i, "Semester") : text;
}

function localizedGeneration(value) {
  const text = String(value ?? "");
  return currentLanguage === "en" ? text.replace(/^Generaci[oó]n\b/i, "Class Year") : text;
}

function renderListingControls({ filters = [], resultLabel = "registros", singularLabel = "registro", defaultSort = "recent" }) {
  return `
    <div class="listing-tools" data-result-label="${escapeAttr(resultLabel)}" data-result-singular="${escapeAttr(singularLabel)}">
      <div class="listing-controls">
        ${filters.map(renderFilterSelect).join("")}
        <label class="listing-label">
          ${escapeHTML(t("sortBy"))}
          <select class="listing-select" data-sort-control>
            ${defaultSort === "recommended" ? `<option value="recommended">${escapeHTML(t("recommendedOrder"))}</option>` : ""}
            <option value="recent">${escapeHTML(t("newest"))}</option>
            <option value="oldest">${escapeHTML(t("oldest"))}</option>
            <option value="alpha">${escapeHTML(t("alphabetical"))}</option>
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
        <option value="__all__">${escapeHTML(t("all"))}</option>
        ${filter.options.map((option) => {
          const value = typeof option === "object" ? option.value : option;
          const label = typeof option === "object" ? option.label : option;
          return `<option value="${escapeAttr(value)}">${escapeHTML(label)}</option>`;
        }).join("")}
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
  counter.textContent = visibleCount ? t("showingResults", { count: visibleCount, label }) : t("noMatches");
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
          <h2>${escapeHTML(t("loadingTitle"))}</h2>
          <p>${escapeHTML(t("loadingCopy"))}</p>
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
          <h2>${escapeHTML(t("loadErrorTitle"))}</h2>
          <p>${escapeHTML(t("loadErrorCopy"))}</p>
          <p class="error-text">${escapeHTML(error.message)}</p>
        </div>
      </div>
    </section>
  `;
}

function renderFooter() {
  if (!siteFooter || !siteData?.site) return;
  const { footer, redesSociales } = siteData.site;
  const footerText = hasContent(footer.texto) ? `<p>${escapeHTML(localizedText(footer.texto))}</p>` : "";
  const institutionLine = [localizedText(footer.institucion), localizedText(footer.campus)].filter(hasContent).join(" · ");
  siteFooter.innerHTML = `
    <div class="footer-inner">
      <div>
        ${footerText}
        <small>${escapeHTML(institutionLine)}</small>
      </div>
      <nav class="footer-links" aria-label="${escapeAttr(t("socialNetworks"))}">
        ${redesSociales
          .map((link) => `<a href="${escapeAttr(link.url)}" target="_blank" rel="noreferrer">${escapeHTML(localizedText(link.nombre))}</a>`)
          .join("")}
      </nav>
    </div>
  `;
}

function renderHome() {
  const site = siteData.site;
  const catalyst = programById(catalogLayout.catalystId);
  const quantum = programById(catalogLayout.quantumId);
  const heroImage = site.heroImage ?? {};
  app.innerHTML = `
    <section class="hero">
      <img
        class="hero-image"
        src="${escapeAttr(heroImage.src || "assets/images/hero/santafe-ranking-hero-2400.jpg")}"
        ${heroImage.srcset ? `srcset="${escapeAttr(heroImage.srcset)}" sizes="100vw"` : ""}
        alt="${escapeAttr(localizedText(heroImage.alt))}"
      />
      <div class="hero-content">
        <p class="eyebrow">${escapeHTML(localizedText(site.subtitulo))}</p>
        <p class="welcome-line">${escapeHTML(localizedText(site.textoBienvenida))}</p>
        <h1>${escapeHTML(localizedText(site.tituloSitio))}</h1>
        <p class="hero-copy">${escapeHTML(localizedText(site.descripcion))}</p>
        <div class="hero-actions">
          <a class="button secondary" href="#catalogo">${escapeHTML(t("viewPrograms"))}</a>
          <a class="button" href="#programa/catalyst">${escapeHTML(t("exploreCatalyst"))}</a>
          <a class="button" href="#programa/quantum">${escapeHTML(t("exploreQuantum"))}</a>
        </div>
      </div>
      <div class="hero-logo-stack" aria-label="${escapeAttr(t("catalogIdentities"))}">
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
          ${quantum ? renderProgramCard(quantum) : ""}
        </div>
        <div class="catalog-other-entry">
          ${renderOtherProgramsEntry()}
        </div>
      </div>
    </section>
  `;
}

function renderProgramCard(program, options = {}) {
  const isSpecialProgram = ["catalyst", "quantum"].includes(program.tipo);
  const actionText = program.tipo === "catalyst" ? t("exploreCatalyst") : program.tipo === "quantum" ? t("exploreQuantum") : t("exploreCareer");
  const entryLabel = options.entryLabel ? t(options.entryId === "computacion" ? "computingEntry" : "engineeringEntry") : "";
  const entryId = ["computacion", "ingenieria"].includes(options.entryId) ? options.entryId : "";
  const showSantaFe = options.showSantaFe !== false;
  const highlights = localizedList(program.highlights);
  const acronymLines = isSpecialProgram ? [] : careerAcronymLines(program);
  const acronymClass = careerAcronymSizeClass(acronymLines);
  const catalystRequirements =
    program.tipo === "catalyst" && localizedList(program.requisitos).length
      ? `<div class="card-requirements">
          <strong>${escapeHTML(t("requirements"))}</strong>
          <ul>
            ${localizedList(program.requisitos).map((requirement) => `<li>${escapeHTML(requirement)}</li>`).join("")}
          </ul>
        </div>`
      : "";
  const body = isSpecialProgram
    ? `<div><strong>${escapeHTML(t("whatIs"))}</strong>${escapeHTML(localizedText(program.queEs))}</div>${catalystRequirements}`
    : `<div><strong>${escapeHTML(t("isForYou"))}</strong>${escapeHTML(localizedText(program.esParaTi))}</div>
       ${showSantaFe ? `<div><strong>${escapeHTML(t("whySantaFe"))}</strong>${escapeHTML(localizedText(program.porQueSantaFe))}</div>` : ""}`;

  return `
    <a
      class="program-card program-card-link${isSpecialProgram ? ` program-card--special program-card--${program.tipo}` : ""}${entryLabel ? " program-card--entry" : ""}${entryId ? ` program-card--entry-${entryId}` : ""}"
      href="#programa/${program.id}"
      aria-label="${escapeAttr(actionText)}: ${escapeAttr(fullName(program))}"
      style="${styleVars(program)}">
      ${
        entryLabel
          ? `<div class="career-entry-lockup">
              <div class="career-acronym-watermark ${acronymClass}" aria-hidden="true">
                ${acronymLines.map((line) => `<span>${escapeHTML(line)}</span>`).join("")}
              </div>
              <span class="entry-badge career-entry-badge">${escapeHTML(entryLabel)}</span>
            </div>`
          : ""
      }
      <h3>${escapeHTML(fullName(program))}</h3>
      <div class="tag-row">
        ${highlights.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
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
    <a class="other-program-entry" href="#otras" aria-label="${escapeAttr(t("viewOtherPrograms"))}">
      <strong>${escapeHTML(t("otherPrograms"))}</strong>
      <span class="card-nav-hint">${escapeHTML(t("viewOtherPrograms"))} <span aria-hidden="true">→</span></span>
    </a>
  `;
}

function renderOtherProgramsPage() {
  const careers = otherCatalogCareers();
  app.innerHTML = `
    ${renderBreadcrumb(
      [
        { label: t("catalog"), href: "#inicio" },
        { label: t("otherPrograms") },
      ],
      { neutral: true },
    )}
    <section class="catalog-section other-programs-page">
      <div class="section-heading catalog-heading">
        <div>
          <p class="eyebrow">${escapeHTML(t("secondaryCatalog"))}</p>
          <h1>${escapeHTML(t("otherPrograms"))}</h1>
        </div>
        <a class="button secondary" href="#catalogo">${escapeHTML(t("backMainCatalog"))}</a>
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
    .map((slug) => localizedSectionMeta(slug))
    .filter((section) => section.title);

  app.innerHTML = `
    <div class="theme-scope" style="${styleVars(career)}">
      ${renderDetailHero(
        career,
        t("careerHubEyebrow"),
        t("careerHubCopy"),
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
  const description = section.slug === "becas"
    ? renderScholarshipNavigationSummary(career)
    : `<p>${escapeHTML(section.short)}</p>`;
  return `
    <a class="info-panel section-link-card" href="${href}">
      <h2><span class="section-dot" aria-hidden="true"></span>${escapeHTML(section.title)}</h2>
      ${description}
      <span class="card-nav-hint">${escapeHTML(t("viewSection"))} <span aria-hidden="true">→</span></span>
    </a>
  `;
}

function renderScholarshipNavigationSummary(career) {
  const percentages = career.becas || {};
  const students = scholarshipPercentage(percentages.porcentajeAlumnosConBeca);
  const average = scholarshipPercentage(percentages.porcentajePromedioBeca);
  const acronym = careerAcronym(career);
  return `
    <div class="scholarship-nav-summary">
      <p>${escapeHTML(t("scholarshipStudentsSummary", { percent: students, acronym }))}</p>
      <p>${escapeHTML(t("scholarshipAverageSummary", { percent: average }))}</p>
    </div>
  `;
}

function renderVivenciaPage(fromCareer = null) {
  const experiences = siteData.vivencia ?? [];
  const theme = {
    tipo: "vivencia",
    nombre: { es: "Vivencia", en: "Student Life" },
    colorPrincipal: "#0055a6",
    colorSecundario: "#00a3c7",
    degradado: "linear-gradient(135deg, rgba(0, 85, 166, 0.96), rgba(0, 163, 199, 0.88))",
    coverImage: "assets/images/vivencia/bootcamp_women.jpg",
    tagline: { es: "Experiencias generales del campus que complementan la vida académica, profesional y comunitaria.", en: "Campus-wide experiences that complement academic, professional, and community life." },
  };

  app.innerHTML = `
    <div class="theme-scope" style="${styleVars(theme)}; --vivencia-link-accent: ${escapeAttr(fromCareer?.colorPrincipal || theme.colorPrincipal)}">
      ${renderDetailHero(
        theme,
        fromCareer ? careerShortName(fromCareer) : t("vivenciaEyebrow"),
        localizedText(theme.tagline),
        "",
        {
          breadcrumbItems: fromCareer
            ? careerBreadcrumbItems(fromCareer, "vivencia")
            : [
                { label: t("catalog"), href: "#inicio" },
                { label: t("studentLife") },
              ],
        },
      )}
      <section class="detail-shell" data-listing-region>
        ${renderListingControls({
          filters: [
            {
              id: "category",
              label: t("category"),
              options: uniqueOptions(experiences, (experience) => experience.categoria).map((value) => ({ value, label: localizedCategory("vivencia", value) })),
            },
          ],
          resultLabel: t("experiencesLabel"),
          singularLabel: t("experienceLabel"),
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
  const tags = localizedList(experience.etiquetas);
  const title = localizedText(experience.titulo);
  const hasExternalLink = hasContent(experience.enlace);
  const hasQrCode = hasExternalLink && Boolean(validMediaPath(experience.codigoQR));
  const defaultRank = normalizedText(experience.categoria) === normalizedText("Escudería") ? 0 : hasQrCode ? 1 : 2;
  const year = experience["año"] ?? experience.ano ?? "";
  const media = embedUrl
    ? `
      <div class="video-frame project-media">
        <iframe
          src="${escapeAttr(embedUrl)}"
          title="${escapeAttr(t("studentLife"))}: ${escapeAttr(title)}"
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
    ? `<dl class="meta-list"><div><dt>${escapeHTML(t("year"))}</dt><dd>${escapeHTML(year)}</dd></div></dl>`
    : "";
  const externalActions = hasExternalLink
    ? `
      <div class="external-link-wrapper vivencia-external-actions">
        <a class="button compact-button vivencia-resource-button" href="${escapeAttr(experience.enlace)}" target="_blank" rel="noreferrer">${escapeHTML(t("openResource"))}</a>
        ${renderQrCode(experience.codigoQR, `${currentLanguage === "en" ? "QR code for" : "Código QR de"} ${title}`)}
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
      data-title="${escapeAttr(title)}">
      ${media}
      <div class="feature-body">
        <p class="mini-label">${escapeHTML(localizedCategory("vivencia", experience.categoria))}</p>
        <h2>${escapeHTML(title)}</h2>
        ${tags.length ? `<div class="tag-row">${tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
        ${renderFormattedDescription(experience.descripcion)}
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
      ${fromCareer ? `<a class="button ghost" href="#programa/${fromCareer.id}">${escapeHTML(t("backToCareer"))}</a>` : ""}
      <a class="button secondary" href="#inicio">${escapeHTML(t("backMainCatalog"))}</a>
    </nav>
  `;
}

function renderDetailHero(career, eyebrow, copy, sectionTitle = "", options = {}) {
  const title = localizedText(sectionTitle) || (career?.tipo === "career" ? careerShortName(career) : fullName(career));
  const heroCopy = options.hideCopy ? "" : localizedText(copy || career.tagline);
  return `
    ${renderBreadcrumb(options.breadcrumbItems || [])}
    <section class="detail-hero">
      <div class="detail-hero-inner">
        <p class="eyebrow">${escapeHTML(localizedText(eyebrow))}</p>
        <h1 class="${heroTitleClass(title)}">${escapeHTML(title)}</h1>
        ${heroCopy ? `<p>${escapeHTML(heroCopy)}</p>` : ""}
      </div>
    </section>
  `;
}

function renderSubpage(career, slug, pathParts = []) {
  const section = localizedSectionMeta(slug);
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
    becas: renderScholarshipsPage,
  };

  app.innerHTML = `
    <div class="theme-scope" style="${styleVars(career)}">
      ${renderDetailHero(career, careerShortName(career), section.short, section.title, {
        breadcrumbItems: careerBreadcrumbItems(career, slug),
        hideCopy: slug === "becas",
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
            label: t("year"),
            options: uniqueOptions(projects, (project) => project["año"], numberOptionSort),
          },
          {
            id: "semester",
            label: t("semester"),
            options: uniqueOptions(projects, (project) => project.semestre, semesterOptionSort).map((value) => ({ value, label: localizedSemester(value) })),
          },
        ],
        resultLabel: t("projectsLabel"),
        singularLabel: t("projectLabel"),
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
  const tags = localizedList(project.tecnologias);
  const title = localizedText(project.titulo);
  const media = embedUrl
    ? `
      <div class="video-frame project-media">
        <iframe
          src="${escapeAttr(embedUrl)}"
          title="Video: ${escapeAttr(title)}"
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
      data-title="${escapeAttr(title)}">
      ${media}
      <div class="feature-body">
        <p class="mini-label">${escapeHTML(project.año)} - ${escapeHTML(localizedSemester(project.semestre))}</p>
        <h2>${escapeHTML(title)}</h2>
        ${tags.length ? `<div class="tag-row">${tags.map((tech) => `<span class="tag">${escapeHTML(tech)}</span>`).join("")}</div>` : ""}
        ${renderFormattedDescription(project.descripcion)}
        <dl class="meta-list">
          <div><dt>${escapeHTML(t("students"))}</dt><dd>${project.alumnos.map(escapeHTML).join(", ")}</dd></div>
          ${project.socioFormador ? `<div><dt>${escapeHTML(t("partner"))}</dt><dd>${escapeHTML(project.socioFormador)}</dd></div>` : ""}
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
      ${renderFormattedDescription(partner.descripcion)}
      ${media}
    </article>
  `;
}

function partnerInteractionTypes(partner) {
  const translated = localizedList(partner.tiposInteraccion);
  if (translated.length) return translated;
  return hasContent(partner.tipoInteraccion) ? [localizedText(partner.tipoInteraccion).trim()] : [];
}

function renderPartnerMedia(mediaPath, index) {
  const media = validMediaPath(mediaPath);
  if (!media) return "";
  const embedUrl = youtubeEmbedUrl(media);
  if (embedUrl) {
    return `
      <div class="video-frame project-media partner-media">
        <iframe src="${escapeAttr(embedUrl)}" title="${escapeAttr(t("interactionWithStudents"))}" allowfullscreen></iframe>
      </div>
    `;
  }
  return `
    <div
      class="image-tile media-crop-${(index % 5) + 2}"
      ${mediaStyle(media)}
      data-validate-image="${escapeAttr(assetUrl(media))}">
      <span>${escapeHTML(t("interactionWithStudents"))}</span>
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
        ${renderEmptyState(universities, t("internationalExperiences").toLowerCase())}
        ${renderPageNav(career)}
      </section>
    `;
  }

  pendingUniversityMap = { career, countries, grouped };
  const selectedUniversities = hasSelectedCity ? grouped[selectedCountry][selectedCity] : [];
  return `
    <section class="detail-shell">
      ${renderUniversityFlowHeader(t("mapCountries"), t("mapCopy"))}
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
               <a class="button ghost compact-button" href="${universityHash(career, selectedCountry)}" data-university-nav data-career-id="${escapeAttr(career.id)}" data-country="${escapeAttr(selectedCountry)}">${escapeHTML(t("backToCities"))}</a>
               <a class="button ghost compact-button" href="${universityHash(career)}" data-university-nav data-career-id="${escapeAttr(career.id)}">${escapeHTML(t("backToMap"))}</a>
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
      <p class="mini-label">${escapeHTML(t("internationalExperiences"))}</p>
      <h2>${escapeHTML(title)}</h2>
      <p>${escapeHTML(copy)}</p>
    </div>
  `;
}

function renderWorldMap(career, countries, grouped) {
  return `
    <div class="world-map-panel">
      <div id="university-world-map" class="world-map" aria-label="${escapeAttr(t("mapCountries"))}">
        <div class="map-loading">${escapeHTML(t("mapLoading"))}</div>
      </div>
      <div class="map-country-list" aria-label="${escapeAttr(t("availableCountries"))}">
        ${countries.map((country) => renderCountryListButton(career, country, grouped[country])).join("")}
      </div>
    </div>
  `;
}

function renderCountryInfoPanel(career, selectedCountry, selectedCity, grouped) {
  if (!selectedCountry || !grouped[selectedCountry]) {
    return `
      <aside class="map-info-panel" data-country-info-panel>
        <p class="mini-label">${escapeHTML(t("mapCountries"))}</p>
        <h2>${escapeHTML(t("selectHighlightedCountry"))}</h2>
        <p>${escapeHTML(t("highlightedCountryCopy"))}</p>
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
          <p class="mini-label">${escapeHTML(t("selectedCountry"))}</p>
          <h2>${escapeHTML(localizedCountry(selectedCountry))}</h2>
        </div>
      </div>
      <p class="country-summary">${escapeHTML(cityCount === 1 ? t("cityAvailable", { count: cityCount }) : t("citiesAvailable", { count: cityCount }))} · ${escapeHTML(universityCount === 1 ? t("experienceAvailable", { count: universityCount }) : t("experiencesAvailable", { count: universityCount }))}</p>
      <p>${escapeHTML(t("selectCity"))}</p>
      <div class="city-list">
        ${Object.keys(cities)
          .sort((a, b) => a.localeCompare(b, "es"))
          .map((city) => renderCityOption(career, selectedCountry, city, cities[city].length, city === selectedCity))
          .join("")}
      </div>
      <a class="button ghost compact-button" href="${universityHash(career)}" data-university-nav data-career-id="${escapeAttr(career.id)}">${escapeHTML(t("backToMap"))}</a>
    </aside>
  `;
}

function renderCountryListButton(career, country, cities) {
  const cityCount = Object.keys(cities).length;
  return `
    <a class="country-list-button" href="${universityHash(career, country)}" data-university-nav data-career-id="${escapeAttr(career.id)}" data-country="${escapeAttr(country)}">
      <span>${escapeHTML(localizedCountry(country))}</span>
      <small>${escapeHTML(cityCount === 1 ? t("cityAvailable", { count: cityCount }) : t("citiesAvailable", { count: cityCount }))}</small>
    </a>
  `;
}

function renderCityOption(career, country, city, count, isActive = false) {
  return `
    <a class="city-choice ${isActive ? "is-active" : ""}" href="${universityHash(career, country, city)}" data-university-nav data-career-id="${escapeAttr(career.id)}" data-country="${escapeAttr(country)}" data-city="${escapeAttr(city)}">
      <span>${escapeHTML(city)}</span>
      <small>${escapeHTML(count === 1 ? t("experienceAvailable", { count }) : t("experiencesAvailable", { count }))}</small>
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
    mapElement.innerHTML = `<div class="map-loading">${escapeHTML(t("mapUnavailable"))}</div>`;
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
      tooltip.text(`${localizedCountry(country)}: ${cities} ${cities === 1 ? t("cityAvailable", { count: cities }).replace(`${cities} `, "") : t("citiesAvailable", { count: cities }).replace(`${cities} `, "")} · ${universities} ${universities === 1 ? t("experienceAvailable", { count: universities }).replace(`${universities} `, "") : t("experiencesAvailable", { count: universities }).replace(`${universities} `, "")}`);
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
  const tags = localizedList(university.areasRelacionadas);
  const experienceMeta = [
    hasContent(university.alumno) ? `<div><dt>${escapeHTML(t("student"))}</dt><dd>${escapeHTML(university.alumno)}</dd></div>` : "",
    hasContent(university.tipoExperiencia) ? `<div><dt>${escapeHTML(t("experienceType"))}</dt><dd>${escapeHTML(localizedText(university.tipoExperiencia))}</dd></div>` : "",
    hasContent(university["año"]) ? `<div><dt>${escapeHTML(t("year"))}</dt><dd>${escapeHTML(university["año"])}</dd></div>` : "",
  ].filter(Boolean).join("");
  return `
    <article class="feature-card university-card">
      ${media}
      <div class="feature-body">
        <p class="mini-label">${escapeHTML(university.ciudad)}, ${escapeHTML(localizedCountry(university.pais))}</p>
        <h2>${escapeHTML(university.nombre)}</h2>
        ${tags.length ? `<div class="tag-row">${tags.map((area) => `<span class="tag">${escapeHTML(area)}</span>`).join("")}</div>` : ""}
        ${renderFormattedDescription(university.descripcion)}
        ${experienceMeta ? `<dl class="meta-list">${experienceMeta}</dl>` : ""}
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
  const label = [localizedCountry(country), city].filter(Boolean).join(" · ");
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
            label: t("generation"),
            options: uniqueOptions(profiles, (profile) => profile.generacion, (a, b) => generationRank(a) - generationRank(b)).map((value) => ({ value, label: localizedGeneration(value) })),
          },
        ],
        resultLabel: t("profilesLabel"),
        singularLabel: t("profileLabel"),
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
  const description = renderFormattedDescription(profile.descripcion);
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
          ${hasContent(profile.generacion) ? `<p class="mini-label">${escapeHTML(localizedGeneration(profile.generacion))}</p>` : ""}
          <h2>${escapeHTML(profile.nombre)}</h2>
          ${hasContent(profile.puestoActual) ? `<p class="role-line">${escapeHTML(localizedText(profile.puestoActual))}</p>` : ""}
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
          titulo: { es: "Laboratorios", en: "Laboratories" },
          descripcion: currentLanguage === "en" ? `Spaces to test, measure, and document solutions related to ${localizedList(career.highlights)[0]?.toLowerCase() || "the program"}.` : `Espacios para probar, medir y documentar soluciones vinculadas a ${localizedList(career.highlights)[0]?.toLowerCase() || "la carrera"}.`,
        },
        {
          titulo: { es: "Ubicación", en: "Location" },
          descripcion: { es: "Santa Fe conecta el aula con corporativos, startups, movilidad urbana y retos de ciudad.", en: "Santa Fe connects the classroom with corporations, startups, urban mobility, and city challenges." },
        },
        {
          titulo: { es: "Proyectos", en: "Projects" },
          descripcion: { es: "Retos integradores, semanas intensivas y experiencias con socios formadores durante el semestre.", en: "Integrative challenges, intensive weeks, and experiences with industry partners throughout the semester." },
        },
        {
          titulo: { es: "Comunidad", en: "Community" },
          descripcion: { es: "Equipos multidisciplinarios, profesores cercanos y actividades que impulsan colaboración entre carreras.", en: "Multidisciplinary teams, approachable faculty, and activities that foster collaboration across programs." },
        },
        {
          titulo: "CATALYST",
          descripcion: { es: "Experiencias para acelerar ideas, formar comunidad y conectar estudiantes con mentoría temprana.", en: "Experiences that accelerate ideas, build community, and connect students with early mentoring." },
        },
        {
          titulo: { es: "Ventaja campus", en: "Campus Advantage" },
          descripcion: localizedText(career.porQueSantaFe),
        },
      ];

  return `
    <section class="detail-shell">
      <div class="campus-feature">
        <div>
          <p class="mini-label">${escapeHTML(t("campusSantaFe"))}</p>
          <h2>${escapeHTML(t("campusHeading", { program: fullName(career) }))}</h2>
          <p>${escapeHTML(t("campusCopy"))}</p>
        </div>
        <div class="campus-photo" ${mediaStyle(santaFeImage, { version: true })}></div>
      </div>
      <div class="advantage-grid">
        ${advantages
          .map(
            (item) => `
              <article class="advantage-card">
                <h3><span class="section-dot" aria-hidden="true"></span>${escapeHTML(localizedText(item.titulo))}</h3>
                ${renderFormattedDescription(item.descripcion)}
              </article>
            `,
          )
          .join("")}
      </div>
      ${renderPageNav(career)}
    </section>
  `;
}

function renderScholarshipsPage(career) {
  const scholarships = [...(siteData.becas || [])].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
  return `
    <section class="detail-shell scholarship-page">
      <div class="content-grid scholarship-grid">
        ${scholarships.map((scholarship) => renderScholarshipCard(scholarship)).join("")}
      </div>
      ${renderPageNav(career)}
    </section>
  `;
}

function renderScholarshipCard(scholarship) {
  const title = localizedText(scholarship.titulo);
  const qrCode = validMediaPath(scholarship.codigoQR);
  return `
    <article class="feature-card scholarship-card">
      <div class="feature-body">
        <h2>${escapeHTML(title)}</h2>
        ${renderFormattedDescription(scholarship.descripcion)}
        ${qrCode ? renderQrCode(qrCode, t("scholarshipQrAlt")) : ""}
      </div>
    </article>
  `;
}

function renderPageNav(career) {
  return `
    <nav class="page-nav" aria-label="Navegación de carrera">
      <a class="button ghost" href="#programa/${career.id}">${escapeHTML(t("backToCareer"))}</a>
      <a class="button secondary" href="#inicio">${escapeHTML(t("backMainCatalog"))}</a>
    </nav>
  `;
}

function renderEmptyState(collection, label) {
  if (collection.length > 0) return "";
  return `
    <div class="empty-state">
      <h2>${escapeHTML(t("withoutItems", { label }))}</h2>
      <p>${escapeHTML(t("addRecords"))}</p>
    </div>
  `;
}

function specialProgramData(program) {
  return siteData?.[program?.id] || { secciones: [], detalles: [] };
}

function renderSpecialProgramDetail(program) {
  const programData = specialProgramData(program);
  const eyebrow = program.tipo === "catalyst" ? t("highPerformanceProgram") : localizedText(program.subtitulo);
  app.innerHTML = `
    <div class="theme-scope" style="${styleVars(program)}">
      ${renderDetailHero(program, eyebrow, localizedText(program.tagline), "", {
        breadcrumbItems: specialProgramBreadcrumbItems(program),
      })}
      <section class="detail-shell">
        <div class="section-grid section-nav-grid">
          ${(programData.secciones || []).map((section) => renderSpecialProgramPanel(section)).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderSpecialProgramPanel(section) {
  const body = renderSpecialProgramPanelBody(section);
  if (section.ruta) {
    return `
      <a class="info-panel section-link-card catalyst-panel-link" href="${escapeAttr(section.ruta)}">
        <h2><span class="section-dot" aria-hidden="true"></span>${escapeHTML(localizedText(section.titulo))}</h2>
        ${body}
        <span class="card-nav-hint">${escapeHTML(t("viewSection"))} <span aria-hidden="true">→</span></span>
      </a>
    `;
  }

  return `
    <article class="info-panel">
      <h2><span class="section-dot" aria-hidden="true"></span>${escapeHTML(localizedText(section.titulo))}</h2>
      ${body}
    </article>
  `;
}

function renderSpecialProgramPanelBody(section) {
  const bullets = localizedList(section.bullets);
  if (bullets.length) {
    return `
      <ul class="catalyst-panel-bullets">
        ${bullets.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
      </ul>
    `;
  }
  const description = localizedText(section.descripcion);
  return description ? `<p>${escapeHTML(description)}</p>` : "";
}

function specialProgramDetailsFor(program, category) {
  const programData = specialProgramData(program);
  const details = Array.isArray(programData.detalles) ? programData.detalles : [];
  if (details.length) return details.filter((item) => item.categoria === category);
  if (category === "actividades") return programData.actividades ?? [];
  return [];
}

function specialProgramSectionById(program, category) {
  return specialProgramData(program).secciones.find((section) => section.id === category) ?? null;
}

function renderSpecialProgramCategoryPage(program, category) {
  const section = specialProgramSectionById(program, category);
  if (!section || section.id === "que-es") {
    renderSpecialProgramDetail(program);
    return;
  }
  const items = specialProgramDetailsFor(program, category);
  const showActivityControls = false;
  const compactItems = items.filter((item) => !catalystHasMedia(item));
  const mediaItems = items.filter((item) => catalystHasMedia(item));
  const renderCatalystGrid = (gridItems, modifier) => gridItems.length
    ? `<div class="content-grid activity-grid ${modifier}" ${showActivityControls ? "data-listing-grid" : ""}>
        ${gridItems.map((item, index) => renderSpecialProgramDetailCard(item, category, index, showActivityControls, program)).join("")}
      </div>`
    : "";
  app.innerHTML = `
    <div class="theme-scope" style="${styleVars(program)}">
      ${renderDetailHero(
        program,
        localizedText(section.titulo),
        localizedText(section.descripcion),
        localizedText(program.nombre),
        { breadcrumbItems: specialProgramBreadcrumbItems(program, category) },
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
                resultLabel: `${t("activitiesLabel")} ${localizedText(program.nombre)}`,
                singularLabel: `${t("activityLabel")} ${localizedText(program.nombre)}`,
              })
            : ""
        }
        ${renderCatalystGrid(compactItems, "activity-grid--compact")}
        ${renderCatalystGrid(mediaItems, "activity-grid--media")}
        ${renderEmptyState(items, localizedText(section.titulo).toLowerCase())}
        <nav class="page-nav" aria-label="${escapeAttr(currentLanguage === "en" ? `${localizedText(program.nombre)} navigation` : `Navegación de ${localizedText(program.nombre)}`)}">
          <a class="button ghost" href="#programa/${escapeAttr(program.id)}">${escapeHTML(program.id === "quantum" ? t("backToQuantum") : t("backToCatalyst"))}</a>
          <a class="button secondary" href="#inicio">${escapeHTML(t("backMainCatalog"))}</a>
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

function catalystMedia(item, index, programName = "CATALYST") {
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
          title="Video: ${escapeAttr(localizedText(item.titulo || item.nombre) || programName) }"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen>
        </iframe>
      </div>
    `;
  }
  if (mediaCandidate) {
    console.warn(`${programName}: enlace de video no compatible, se usará imagen o solo texto.`, item.id || localizedText(item.titulo));
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

function renderSpecialProgramDetailCard(item, category, index, filterable = false, program = { nombre: "CATALYST" }) {
  const title = localizedText(item.titulo || item.nombre);
  const label = sectionLabelForSpecialProgram(category, program);
  const body = localizedText(item.descripcion || item.testimonio);
  const year = hasContent(item["a\u00f1o"] ?? item.anio ?? item.ano) ? String(item["a\u00f1o"] ?? item.anio ?? item.ano).trim() : "";
  const media = catalystMedia(item, index, localizedText(program.nombre));
  const tags = category === "actividades" ? normalizeTags(localizedList(item.etiquetas)) : [];
  const mediaClass = media ? "activity-card--with-media" : "activity-card--compact";
  return `
    <article
      class="feature-card activity-card ${mediaClass}"
      ${filterable ? "data-filterable-card" : ""}
      data-cycle="${escapeAttr(label)}"
      data-date-sort="${generationRank(label)}"
      data-title="${escapeAttr(title || body || item.id || localizedText(program.nombre))}">
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
        ${renderFormattedDescription(body)}
      </div>
    </article>
  `;
}

function sectionLabelForSpecialProgram(category, program = { nombre: "CATALYST" }) {
  const labels = {
    comunidad: t("motivatedCommunity"),
    actividades: t("optionalActivities"),
    testimonios: t("studentTestimonials"),
  };
  return labels[category] ?? localizedText(program.nombre);
}

const adminResources = [
  { key: "proyectos", label: "Proyectos", filename: "proyectos.json", type: "array" },
  { key: "socios", label: "Socios formadores", filename: "socios.json", type: "array" },
  { key: "universidades", label: "Experiencias en el extranjero", filename: "universidades.json", type: "array" },
  { key: "exatecs", label: "Empleabilidad", filename: "exatecs.json", type: "array" },
  { key: "careerScholarships", label: "Porcentajes de Becas por carrera", filename: "carreras.json", type: "array", editableRecords: false },
  { key: "becas", label: "Contenido compartido de Becas", filename: "becas.json", type: "array" },
  { key: "catalystDetails", label: "Contenido CATALYST", filename: "catalyst.json", type: "array" },
  { key: "quantumDetails", label: "Contenido QUANTUM", filename: "quantum.json", type: "array" },
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
  quantumDetails: {
    fixedPrefix: "quantum",
    segment: "detalle",
    required: ["id", "categoria"],
  },
  vivencia: {
    base: "vivencia-",
    required: ["id", "categoria", "titulo", "año"],
  },
  becas: {
    fixedPrefix: "beca",
    segment: "tipo",
    required: ["id", "titulo", "descripcion", "orden"],
  },
};

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function getAdminData(key) {
  if (key === "catalystDetails") return adminState.catalyst.detalles;
  if (key === "quantumDetails") return adminState.quantum.detalles;
  return adminState[key];
}

function getAdminDownloadData(key) {
  if (key === "catalystDetails") return adminState.catalyst;
  if (key === "quantumDetails") return adminState.quantum;
  if (key === "vivencia") return adminState.vivencia.map(cleanVivenciaRecord);
  if (key === "careerScholarships") {
    syncCareerScholarshipsToCareers();
    return adminState.carreras;
  }
  return getAdminData(key);
}

function syncCareerScholarshipsToCareers() {
  const valuesByCareer = new Map((adminState.careerScholarships || []).map((item) => [item.id, item.becas]));
  adminState.carreras.forEach((career) => {
    if (career.tipo !== "career" || !valuesByCareer.has(career.id)) return;
    career.becas = cloneData(valuesByCareer.get(career.id));
  });
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
  return (adminState?.carreras ?? siteData.carreras).filter((career) => career.tipo === "career");
}

function isCareerScopedAdminKey(key) {
  return Boolean(adminIdRules[key]?.prefixField);
}

function adminItemLabel(item, index) {
  return localizedText(item?.nombre || item?.titulo, "es") || item?.id || `Registro ${index + 1}`;
}

function adminCareerOptions(selectedValue) {
  return adminCareers()
    .map((career) => `<option value="${escapeAttr(career.id)}" ${career.id === selectedValue ? "selected" : ""}>${escapeHTML(localizedText(career.nombre, "es"))}</option>`)
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
    : ["catalystDetails", "quantumDetails"].includes(key)
      ? ["id", "categoria", "titulo", "año", "etiquetas", "descripcion", "imagen", "video"]
    : key === "becas"
      ? ["id", "titulo", "descripcion", "orden", "codigoQR"]
    : key === "careerScholarships"
      ? ["id", "nombre", "becas"]
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
    orden: "Orden",
    becas: "Becas",
    porcentajeAlumnosConBeca: "Porcentaje de estudiantes con beca",
    porcentajePromedioBeca: "Porcentaje promedio de beca",
  };
  return labels[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function normalizeAdminItem(key, item) {
  if (!item) return;
  const translatedFields = {
    proyectos: ["titulo", "descripcion", "tecnologias"],
    socios: ["descripcion", "tiposInteraccion"],
    universidades: ["tipoExperiencia", "descripcion", "areasRelacionadas"],
    exatecs: ["puestoActual", "descripcion"],
    vivencia: ["titulo", "descripcion", "etiquetas"],
    catalystDetails: ["titulo", "descripcion", "etiquetas"],
    quantumDetails: ["titulo", "descripcion", "etiquetas"],
    becas: ["titulo", "descripcion"],
  };
  (translatedFields[key] || []).forEach((field) => {
    if (!Object.hasOwn(item, field)) return;
    const value = item[field];
    if (value && typeof value === "object" && !Array.isArray(value) && Object.hasOwn(value, "es")) {
      if (!Object.hasOwn(value, "en")) value.en = Array.isArray(value.es) ? [] : "";
      return;
    }
    item[field] = { es: value ?? "", en: Array.isArray(value) ? [] : "" };
  });
  if (key === "socios") {
    if (!hasContent(item.tiposInteraccion)) {
      item.tiposInteraccion = { es: hasContent(item.tipoInteraccion) ? [String(item.tipoInteraccion).trim()] : [], en: [] };
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
  if (["catalystDetails", "quantumDetails"].includes(key)) {
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
  if (item.categoria === "actividades") {
    const tags = item.etiquetas;
    item.etiquetas = tags && typeof tags === "object" && !Array.isArray(tags) && Object.hasOwn(tags, "es")
      ? { es: normalizeTags(tags.es), en: normalizeTags(tags.en) }
      : { es: normalizeTags(tags), en: [] };
  } else {
    item.etiquetas = { es: [], en: [] };
  }
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
  adminState.careerScholarships = adminState.carreras
    .filter((career) => career.tipo === "career")
    .map((career) => ({
      id: career.id,
      nombre: cloneData(career.nombre),
      becas: cloneData(career.becas || {
        porcentajeAlumnosConBeca: null,
        porcentajePromedioBeca: null,
      }),
    }));
  app.innerHTML = `
    <section class="admin-shell">
      <div class="admin-hero">
        <p class="eyebrow">Administrador local</p>
        <h1>Editar catálogo</h1>
        <p>Modifica los datos en formularios, revisa el JSON generado y descarga el archivo actualizado. Después reemplaza manualmente el archivo correspondiente en <strong>data</strong>.</p>
        <div class="admin-language-note"><strong>Contenido bilingüe</strong><span>Toda la información debe registrarse primero en español. La traducción al inglés es opcional. Cuando un campo no tenga traducción, el catálogo mostrará automáticamente su versión en español.</span></div>
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
  const canEditRecords = config.editableRecords !== false;
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
        isArray && canEditRecords
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
             ${canEditRecords ? `<option value="${adminNewItemValue}">+ Agregar nuevo registro</option>` : ""}
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
    document.querySelector("#admin-add")?.addEventListener("click", () => addAdminItem(key));
    document.querySelector("#admin-delete")?.addEventListener("click", () => deleteAdminItem(key));
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
      if (["catalystDetails", "quantumDetails"].includes(key) && field.dataset.path === "categoria") {
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

      if (!prefix && key === "careerScholarships" && field === "id") {
        return "";
      }

      if (!prefix && key === "careerScholarships" && field === "nombre") {
        return `<div class="admin-record-title"><span class="mini-label">Carrera</span><strong>${escapeHTML(localizedText(value, "es"))}</strong></div>`;
      }

      if (["porcentajeAlumnosConBeca", "porcentajePromedioBeca"].includes(field)) {
        const inputValue = value === null || value === undefined ? "" : value;
        return `
          <label class="admin-label">
            ${escapeHTML(label)} <span class="admin-optional">Opcional</span>
            <input class="admin-control" type="number" min="0" max="100" step="0.1" data-path="${escapeAttr(path)}" data-kind="optional-percentage" value="${escapeAttr(inputValue)}" />
          </label>
        `;
      }

      if (!prefix && field === "carreraId" && isCareerScopedAdminKey(key)) {
        return "";
      }

      if (!prefix && ["catalystDetails", "quantumDetails"].includes(key) && field === "categoria") {
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

      if (value && typeof value === "object" && !Array.isArray(value) && Object.hasOwn(value, "es")) {
        const spanish = value.es ?? "";
        const english = value.en ?? (Array.isArray(spanish) ? [] : "");
        const isArray = Array.isArray(spanish) || Array.isArray(english);
        const isConditionalTags = !prefix && ["catalystDetails", "quantumDetails"].includes(key) && field === "etiquetas";
        const hidden = isConditionalTags && object.categoria !== "actividades" ? " hidden" : "";
        const descriptionHelp = field === "descripcion"
          ? `<small class="admin-help">Los saltos de línea se respetarán. Escribe “- ” o “* ” al inicio de una línea para crear una viñeta.</small>`
          : isArray ? `<small class="admin-help">Escribe un elemento por línea.</small>` : "";
        const fieldKind = isArray ? "array" : "string";
        const spanishValue = isArray ? normalizeTags(spanish).join("\n") : spanish;
        const englishValue = isArray ? normalizeTags(english).join("\n") : english;
        return `
          <fieldset class="admin-fieldset admin-bilingual-field" ${isConditionalTags ? "data-catalyst-tags-field" : ""}${hidden}>
            <legend>${escapeHTML(label)}</legend>
            ${descriptionHelp}
            <label class="admin-label">${escapeHTML(label)} — Español
              <textarea class="admin-control" data-path="${escapeAttr(`${path}.es`)}" data-kind="${fieldKind}">${escapeHTML(spanishValue)}</textarea>
            </label>
            <label class="admin-label">${escapeHTML(label)} — Inglés <span class="admin-optional">Opcional</span>
              <textarea class="admin-control" data-path="${escapeAttr(`${path}.en`)}" data-kind="${fieldKind}">${escapeHTML(englishValue)}</textarea>
            </label>
          </fieldset>
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
      const numberAttrs = typeof value === "number"
        ? field === "orden" ? " min=\"1\" max=\"99\" step=\"1\"" : " min=\"1000\" max=\"9999\" step=\"1\""
        : "";
      const control = isLong
        ? `<textarea class="admin-control" data-path="${escapeAttr(path)}" data-kind="string"${readonly}>${escapeHTML(value)}</textarea>`
        : `<input class="admin-control" type="${typeof value === "number" ? "number" : "text"}" data-path="${escapeAttr(path)}" data-kind="${typeof value === "number" ? "number" : "string"}" value="${escapeAttr(value)}"${readonly}${numberAttrs} />`;
      const descriptionHelp = field === "descripcion"
        ? `<small class="admin-help">Los saltos de línea se respetarán. Escribe “- ” o “* ” al inicio de una línea para crear una viñeta.</small>`
        : "";
      return `<label class="admin-label">${escapeHTML(label)}${descriptionHelp}${control}</label>`;
    })
    .join("");
}

function applyAdminForm(target, form, key = "") {
  form.querySelectorAll("[data-path]").forEach((field) => {
    const kind = field.dataset.kind;
    let value = field.value;
    if (kind === "optional-percentage") {
      const trimmed = String(value).trim();
      if (!trimmed) {
        field.classList.remove("field-error");
        setPathValue(target, field.dataset.path, null);
        return;
      }
      const percentage = Number(trimmed);
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        field.classList.add("field-error");
        return;
      }
      field.classList.remove("field-error");
      setPathValue(target, field.dataset.path, percentage);
      return;
    }
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
    titulo: { es: "", en: "" },
    descripcion: { es: "", en: "" },
    año: new Date().getFullYear(),
    semestre: "",
    alumnos: [],
    thumbnail: "",
    youtubeUrl: "",
    tecnologias: { es: [], en: [] },
    socioFormador: "",
  },
  socios: {
    carreraId: "",
    id: "",
    nombre: "",
    logo: "",
    descripcion: { es: "", en: "" },
    tiposInteraccion: { es: [], en: [] },
    imagenOVideo: "",
  },
  universidades: {
    carreraId: "",
    id: "",
    pais: "",
    ciudad: "",
    nombre: "",
    alumno: "",
    tipoExperiencia: { es: "", en: "" },
    año: new Date().getFullYear(),
    descripcion: { es: "", en: "" },
    areasRelacionadas: { es: [], en: [] },
    imagen: "",
  },
  exatecs: {
    carreraId: "",
    id: "",
    fotoAlumno: "",
    logoEmpresa: "",
    nombre: "",
    generacion: "",
    puestoActual: { es: "", en: "" },
    empresa: "",
    descripcion: { es: "", en: "" },
    linkedinUrl: "",
    codigoQR: "",
  },
  catalystDetails: {
    id: "",
    categoria: "comunidad",
    titulo: { es: "", en: "" },
    "año": "",
    etiquetas: { es: [], en: [] },
    descripcion: { es: "", en: "" },
    imagen: "",
    video: "",
  },
  vivencia: {
    id: "",
    categoria: "Bootcamps",
    titulo: { es: "", en: "" },
    descripcion: { es: "", en: "" },
    "año": new Date().getFullYear(),
    media: "",
    videoUrl: "",
    enlace: "",
    codigoQR: "",
    etiquetas: { es: [], en: [] },
  },
  quantumDetails: {
    id: "",
    categoria: "comunidad",
    titulo: { es: "", en: "" },
    "año": "",
    etiquetas: { es: [], en: [] },
    descripcion: { es: "", en: "" },
    imagen: "",
    video: "",
  },
  becas: {
    id: "",
    titulo: { es: "", en: "" },
    descripcion: { es: "", en: "" },
    orden: 1,
    codigoQR: "",
  },
};

function createBlankFromTemplate(template, key) {
  const blank = cloneData(template ?? adminBlankTemplates[key] ?? { id: "" });
  Object.keys(blank).forEach((field) => {
    if (Array.isArray(blank[field])) blank[field] = [];
    else if (blank[field] && typeof blank[field] === "object") blank[field] = createBlankFromTemplate(blank[field], key);
    else if (typeof blank[field] === "number") blank[field] = field === "orden" ? 1 : new Date().getFullYear();
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
    const rawValue = item[field];
    const value = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue) && Object.hasOwn(rawValue, "es") ? rawValue.es : rawValue;
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

function updateGlobalChrome() {
  document.documentElement.lang = currentLanguage;
  if (siteData?.site) {
    document.title = `${localizedText(siteData.site.tituloSitio)} | ${localizedText(siteData.site.textoBienvenida)}`;
  }
  const isAdmin = (window.location.hash || "#inicio") === "#admin";
  const languageSwitcher = document.querySelector("[data-language-switcher]");
  if (languageSwitcher) {
    languageSwitcher.hidden = isAdmin;
    languageSwitcher.setAttribute("aria-label", t("languageSelector"));
    languageSwitcher.querySelectorAll("[data-language]").forEach((button) => {
      const active = button.dataset.language === currentLanguage;
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", button.dataset.language === "es" ? t("spanish") : t("english"));
    });
  }
  const topNav = document.querySelector("[data-top-nav]");
  topNav?.setAttribute("aria-label", t("mainNavigation"));
  const home = document.querySelector("[data-header-home]");
  home?.setAttribute("aria-label", t("backHome"));
  const brandTitle = document.querySelector("[data-brand-title]");
  if (brandTitle) brandTitle.textContent = t("engineering");
  const catalogLink = document.querySelector("[data-nav-catalog]");
  if (catalogLink) catalogLink.textContent = t("catalog");
  const adminLink = document.querySelector("[data-nav-admin]");
  if (adminLink) adminLink.textContent = t("admin");
}

function listingStateSnapshot() {
  return [...document.querySelectorAll("[data-filter], [data-sort-control]")].map((control) => ({
    selector: control.hasAttribute("data-sort-control") ? "sort" : control.dataset.filter,
    value: control.value,
  }));
}

function restoreListingState(snapshot) {
  snapshot.forEach(({ selector, value }) => {
    const control = selector === "sort"
      ? document.querySelector("[data-sort-control]")
      : document.querySelector(`[data-filter="${CSS.escape(selector)}"]`);
    if (control && [...control.options].some((option) => option.value === value)) control.value = value;
  });
  document.querySelectorAll("[data-listing-region]").forEach(applyListingControls);
}

function installLanguageSwitcher() {
  document.querySelector("[data-language-switcher]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-language]");
    if (!button || button.dataset.language === currentLanguage) return;
    const scrollPosition = window.scrollY;
    const listingState = listingStateSnapshot();
    currentLanguage = catalogI18n.setStoredLanguage(button.dataset.language);
    renderFooter();
    route();
    requestAnimationFrame(() => {
      restoreListingState(listingState);
      window.scrollTo({ top: scrollPosition, behavior: "auto" });
    });
  });
}

function route() {
  const hash = window.location.hash || "#inicio";
  updateGlobalChrome();
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
    if (["catalyst", "quantum"].includes(program?.tipo)) {
      if (["comunidad", "actividades", "testimonios"].includes(sectionSlug)) {
        renderSpecialProgramCategoryPage(program, sectionSlug);
        resetScroll();
        return;
      }
      renderSpecialProgramDetail(program);
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
    document.title = `${localizedText(siteData.site.tituloSitio)} | ${localizedText(siteData.site.textoBienvenida)}`;
    renderFooter();
    installLanguageSwitcher();
    route();
    window.addEventListener("hashchange", route);
    window.addEventListener("popstate", route);
  } catch (error) {
    renderLoadError(error);
  }
}

init();
