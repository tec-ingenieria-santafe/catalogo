(function initializeCatalogI18n(global) {
  const STORAGE_KEY = "catalogLanguage";
  const supportedLanguages = ["es", "en"];

  const messages = {
    es: {
      catalog: "Catálogo",
      engineering: "Ingeniería",
      catalogIdentities: "Identidades del catálogo",
      admin: "Admin",
      backHome: "Volver al inicio",
      mainNavigation: "Navegación principal",
      languageSelector: "Seleccionar idioma",
      spanish: "Español",
      english: "Inglés",
      loadingTitle: "Cargando catálogo",
      loadingCopy: "Preparando carreras, proyectos y datos editables.",
      loadErrorTitle: "No se pudieron cargar los datos",
      loadErrorCopy: "Los archivos JSON viven en data. Para leerlos, abre el sitio desde un servidor local en vez de abrir el HTML como archivo local.",
      viewPrograms: "Ver carreras",
      exploreCareer: "Explorar carrera",
      exploreCatalyst: "Explorar CATALYST",
      exploreQuantum: "Explorar QUANTUM",
      computingEntry: "Entrada Computación",
      engineeringEntry: "Entrada Ingeniería",
      onlyInSpanish: "",
      whatIs: "¿Qué es?",
      isForYou: "¿Es para ti?",
      whySantaFe: "¿Por qué Santa Fe?",
      requirements: "Requisitos",
      otherPrograms: "Otras",
      viewOtherPrograms: "Ver otras carreras",
      secondaryCatalog: "Catálogo secundario",
      backMainCatalog: "Volver al catálogo principal",
      careerHubEyebrow: "INGENIERÍA - SANTA FE",
      careerHubCopy: "Explora proyectos, aliados, movilidad internacional, empleabilidad y ventajas del campus.",
      viewSection: "Ver sección",
      studentProjects: "Proyectos de estudiantes",
      industryPartners: "Socios formadores",
      internationalExperiences: "Experiencias en el extranjero",
      careerOutcomes: "Empleabilidad",
      whyStudySantaFe: "¿Por qué estudiar esta carrera en Santa Fe?",
      studentLife: "Vivencia",
      scholarships: "Becas",
      scholarshipStudentsSummary: "{percent}% de los estudiantes de {acronym} cuentan con una beca.",
      scholarshipAverageSummary: "En promedio, la beca cubre {percent}% de la colegiatura.",
      scholarshipQrAlt: "Código QR con más información de becas",
      motivatedCommunity: "Comunidad motivada",
      optionalActivities: "Actividades opcionales",
      studentTestimonials: "Testimonios de estudiantes",
      highPerformanceProgram: "PROGRAMA DE ALTO RENDIMIENTO",
      category: "Categoría",
      all: "Todos",
      sortBy: "Ordenar por",
      recommendedOrder: "Orden recomendado",
      newest: "Más recientes",
      oldest: "Más antiguos",
      alphabetical: "Alfabético (A-Z)",
      showingResults: "Mostrando {count} {label}",
      noMatches: "No hay registros que coincidan con los filtros seleccionados.",
      year: "Año",
      semester: "Semestre",
      students: "Alumnos",
      partner: "Socio formador",
      generation: "Generación",
      position: "Puesto",
      company: "Empresa",
      country: "País",
      city: "Ciudad",
      student: "Alumno",
      experienceType: "Tipo de experiencia",
      selectedCountry: "País seleccionado",
      selectCountry: "Selecciona un país en el mapa o en la lista para consultar sus ciudades y experiencias.",
      selectCity: "Selecciona una ciudad:",
      mapCountries: "Mapa de países",
      mapCopy: "Explora experiencias internacionales por país y ciudad.",
      mapLoading: "Cargando mapa mundial...",
      selectHighlightedCountry: "Selecciona un país resaltado para ver sus ciudades disponibles.",
      highlightedCountryCopy: "Los países con experiencias para esta carrera aparecen destacados con el color principal del programa.",
      availableCountries: "Países disponibles",
      backToCities: "Volver a ciudades",
      backToMap: "Volver al mapa",
      cityAvailable: "{count} ciudad disponible",
      citiesAvailable: "{count} ciudades disponibles",
      experienceAvailable: "{count} experiencia",
      experiencesAvailable: "{count} experiencias",
      openResource: "Abrir recurso",
      backToCareer: "Volver a la carrera",
      backToCatalyst: "Volver a CATALYST",
      backToQuantum: "Volver a QUANTUM",
      withoutItems: "Sin {label} por ahora",
      addRecords: "Agrega registros para esta carrera en el archivo JSON correspondiente.",
      campusSantaFe: "Campus Santa Fe",
      campusHeading: "{program} en un entorno conectado con la ciudad",
      campusCopy: "Una ubicación estratégica, espacios de prototipado, laboratorios especializados y la cercanía con empresas hacen de Campus Santa Fe un entorno donde la ingeniería se aprende mediante experiencias y retos reales.",
      socialNetworks: "Redes sociales",
      linkedin: "LinkedIn",
      interactionWithStudents: "Interacción con estudiantes",
      mapUnavailable: "No se pudo cargar el mapa interactivo. Usa la lista de países disponibles.",
      vivenciaEyebrow: "VIVENCIA - SANTA FE",
      vivenciaCopy: "Experiencias generales del campus que complementan la vida académica, profesional y comunitaria.",
      activitiesLabel: "actividades",
      activityLabel: "actividad",
      experiencesLabel: "experiencias",
      experienceLabel: "experiencia",
      projectsLabel: "proyectos",
      projectLabel: "proyecto",
      profilesLabel: "perfiles de empleabilidad",
      profileLabel: "perfil de empleabilidad",
      noDescription: "",
    },
    en: {
      catalog: "Catalog",
      engineering: "Engineering",
      catalogIdentities: "Catalog identities",
      admin: "Admin",
      backHome: "Back to Home",
      mainNavigation: "Main navigation",
      languageSelector: "Select language",
      spanish: "Spanish",
      english: "English",
      loadingTitle: "Loading catalog",
      loadingCopy: "Preparing programs, projects, and editable data.",
      loadErrorTitle: "The data could not be loaded",
      loadErrorCopy: "The JSON files are stored in data. To read them, open the site from a local server instead of opening the HTML file directly.",
      viewPrograms: "View Programs",
      exploreCareer: "Explore Program",
      exploreCatalyst: "Explore CATALYST",
      exploreQuantum: "Explore QUANTUM",
      computingEntry: "Computing Entry",
      engineeringEntry: "Engineering Entry",
      onlyInSpanish: "Only in Spanish",
      whatIs: "What is it?",
      isForYou: "Is this for you?",
      whySantaFe: "Why Santa Fe?",
      requirements: "Requirements",
      otherPrograms: "Other Programs",
      viewOtherPrograms: "View Other Programs",
      secondaryCatalog: "Secondary catalog",
      backMainCatalog: "Back to Main Catalog",
      careerHubEyebrow: "ENGINEERING - SANTA FE",
      careerHubCopy: "Explore projects, partners, international mobility, career outcomes, and campus advantages.",
      viewSection: "View Section",
      studentProjects: "Student Projects",
      industryPartners: "Industry Partners",
      internationalExperiences: "International Experiences",
      careerOutcomes: "Career Outcomes",
      whyStudySantaFe: "Why Study This Program at Santa Fe?",
      studentLife: "Student Life",
      scholarships: "Scholarships",
      scholarshipStudentsSummary: "{percent}% of {acronym} students receive a scholarship.",
      scholarshipAverageSummary: "On average, the scholarship covers {percent}% of tuition.",
      scholarshipQrAlt: "QR code with more scholarship information",
      motivatedCommunity: "Motivated Community",
      optionalActivities: "Optional Activities",
      studentTestimonials: "Student Testimonials",
      highPerformanceProgram: "HIGH-PERFORMANCE PROGRAM",
      category: "Category",
      all: "All",
      sortBy: "Sort by",
      recommendedOrder: "Recommended order",
      newest: "Newest",
      oldest: "Oldest",
      alphabetical: "Alphabetical (A-Z)",
      showingResults: "Showing {count} {label}",
      noMatches: "No records match the selected filters.",
      year: "Year",
      semester: "Semester",
      students: "Students",
      partner: "Industry partner",
      generation: "Class Year",
      position: "Position",
      company: "Company",
      country: "Country",
      city: "City",
      student: "Student",
      experienceType: "Experience type",
      selectedCountry: "Selected Country",
      selectCountry: "Select a country on the map or from the list to view its cities and experiences.",
      selectCity: "Select a City:",
      mapCountries: "Country Map",
      mapCopy: "Explore international experiences by country and city.",
      mapLoading: "Loading world map...",
      selectHighlightedCountry: "Select a highlighted country to view its available cities.",
      highlightedCountryCopy: "Countries with experiences for this program are highlighted with the program's primary color.",
      availableCountries: "Available countries",
      backToCities: "Back to Cities",
      backToMap: "Back to Map",
      cityAvailable: "{count} city available",
      citiesAvailable: "{count} cities available",
      experienceAvailable: "{count} experience",
      experiencesAvailable: "{count} experiences",
      openResource: "Open Resource",
      backToCareer: "Back to Program",
      backToCatalyst: "Back to CATALYST",
      backToQuantum: "Back to QUANTUM",
      withoutItems: "No {label} yet",
      addRecords: "Add records for this program in the corresponding JSON file.",
      campusSantaFe: "Santa Fe Campus",
      campusHeading: "{program} in an environment connected to the city",
      campusCopy: "A strategic location, prototyping spaces, specialized laboratories, and proximity to companies make the Santa Fe Campus an environment where engineering is learned through real-world experiences and challenges.",
      socialNetworks: "Social media",
      linkedin: "LinkedIn",
      interactionWithStudents: "Interaction with students",
      mapUnavailable: "The interactive map could not be loaded. Use the list of available countries.",
      vivenciaEyebrow: "STUDENT LIFE - SANTA FE",
      vivenciaCopy: "Campus-wide experiences that complement academic, professional, and community life.",
      activitiesLabel: "activities",
      activityLabel: "activity",
      experiencesLabel: "experiences",
      experienceLabel: "experience",
      projectsLabel: "projects",
      projectLabel: "project",
      profilesLabel: "career profiles",
      profileLabel: "career profile",
      noDescription: "",
    },
  };

  const categoryLabels = {
    vivencia: {
      "Biblioteca": { es: "Biblioteca", en: "Library" },
      "Escudería": { es: "Escudería", en: "Student Racing Team" },
      "Grupo estudiantil": { es: "Grupo estudiantil", en: "Student Organization" },
      "Premios": { es: "Premios", en: "Awards" },
      "Deportes": { es: "Deportes", en: "Sports" },
      "Arte y cultura": { es: "Arte y cultura", en: "Arts and Culture" },
      "Certificaciones": { es: "Certificaciones", en: "Certifications" },
      "Bootcamps": { es: "Bootcamps", en: "Bootcamps" },
    },
  };

  const countryNames = {
    "Alemania": "Germany",
    "Australia": "Australia",
    "Austria": "Austria",
    "Canadá": "Canada",
    "Dinamarca": "Denmark",
    "España": "Spain",
    "Estados Unidos": "United States",
    "Francia": "France",
    "Irlanda": "Ireland",
    "Italia": "Italy",
    "Japón": "Japan",
    "México": "Mexico",
    "Portugal": "Portugal",
    "Reino Unido": "United Kingdom",
    "Suecia": "Sweden",
    "Sin país": "Unknown Country",
  };

  function normalizeLanguage(value) {
    return supportedLanguages.includes(value) ? value : "es";
  }

  function getStoredLanguage() {
    try {
      return normalizeLanguage(global.localStorage?.getItem(STORAGE_KEY));
    } catch {
      return "es";
    }
  }

  function setStoredLanguage(language) {
    const normalized = normalizeLanguage(language);
    try {
      global.localStorage?.setItem(STORAGE_KEY, normalized);
    } catch {
      // The catalog still works when storage is unavailable.
    }
    return normalized;
  }

  function text(value, language = "es") {
    const lang = normalizeLanguage(language);
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    const preferred = value[lang];
    if (typeof preferred === "string" && preferred.trim()) return preferred;
    const spanish = value.es;
    return typeof spanish === "string" ? spanish : "";
  }

  function list(value, language = "es") {
    const lang = normalizeLanguage(language);
    if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined && String(item).trim());
    if (!value || typeof value !== "object") return [];
    const preferred = Array.isArray(value[lang]) ? value[lang].filter(Boolean) : [];
    if (preferred.length) return preferred;
    return Array.isArray(value.es) ? value.es.filter(Boolean) : [];
  }

  function message(key, language = "es", variables = {}) {
    const lang = normalizeLanguage(language);
    const template = messages[lang]?.[key] ?? messages.es[key] ?? key;
    return String(template).replace(/\{(\w+)\}/g, (_, name) => variables[name] ?? "");
  }

  function category(group, value, language = "es") {
    const item = categoryLabels[group]?.[value];
    return item ? text(item, language) : String(value ?? "");
  }

  function country(value, language = "es") {
    if (normalizeLanguage(language) !== "en") return String(value ?? "");
    return countryNames[value] ?? String(value ?? "");
  }

  global.CatalogI18n = {
    STORAGE_KEY,
    supportedLanguages,
    messages,
    normalizeLanguage,
    getStoredLanguage,
    setStoredLanguage,
    text,
    list,
    message,
    category,
    country,
  };
})(window);
