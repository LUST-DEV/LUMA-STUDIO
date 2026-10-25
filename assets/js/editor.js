(() => {
  const pageParams = new URLSearchParams(window.location.search);
  const requestedTemplate = pageParams.get("template");
  const canvas = document.querySelector("#image-canvas");
  const context = canvas.getContext("2d");
  const baseCanvas = document.createElement("canvas");
  const baseContext = baseCanvas.getContext("2d", { willReadFrequently: true });
  const drawingCanvas = document.createElement("canvas");
  const drawingContext = drawingCanvas.getContext("2d");
  const upload = document.querySelector("#image-upload");
  const logoUpload = document.querySelector("#logo-upload");
  const dropZone = document.querySelector("#drop-zone");
  const emptyState = document.querySelector("#empty-state");
  const status = document.querySelector("#editor-status");
  const imageName = document.querySelector("#image-name");
  const dimensions = document.querySelector("#image-dimensions");
  const replaceImageDialog = document.querySelector("#replace-image-dialog");
  const undoButton = document.querySelector("#undo-button");
  const redoButton = document.querySelector("#redo-button");
  const adjustmentInputs = [...document.querySelectorAll("[data-adjust]")];
  const history = [];
  const redoHistory = [];
  const layers = [];
  const layerGroups = [];
  const selectedLayerIds = new Set();
  const logoUrls = new Set();
  const tintedLogoCache = new WeakMap();
  const defaultPaperColor = "#ffffff";
  const maxHistory = 20;
  const maxImageBytes = 50 * 1024 * 1024;
  const maxCanvasEdge = 4096;
  const strokes = [];
  const defaults = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    warmth: 0,
    softness: 0
  };
  const presets = {
    original: { ...defaults },
    noir: { brightness: 95, contrast: 125, saturation: 0, warmth: -4, softness: 0 },
    doux: { brightness: 108, contrast: 88, saturation: 82, warmth: 8, softness: 1 },
    lumiere: { brightness: 112, contrast: 108, saturation: 108, warmth: 2, softness: 0 },
    cinema: { brightness: 92, contrast: 118, saturation: 78, warmth: -8, softness: 0 },
    chaud: { brightness: 106, contrast: 104, saturation: 112, warmth: 34, softness: 0 }
  };
  const backdropPresets = {
    none: [],
    graphite: ["#25282b", "#101214", "#08090a"],
    sand: ["#d0b896", "#75634f", "#342a22"],
    midnight: ["#26374b", "#111b2a", "#080d16"],
    forest: ["#35473d", "#18231d", "#0a100d"],
    wine: ["#552f3b", "#28151d", "#10090d"],
    charcoal: ["#51535a", "#24262b", "#0c0d10"],
    silver: ["#e5e7e9", "#777e89", "#252930"],
    plum: ["#583e60", "#2b2033", "#100d15"],
    ocean: ["#298094", "#183641", "#09151b"],
    neon: ["#a52aff", "#193a88", "#080a1c"],
    ember: ["#e88747", "#843d40", "#1b1014"],
    moss: ["#819052", "#37452e", "#10170e"],
    rose: ["#c38b9a", "#704858", "#21141d"],
    aurora: ["#7af0c2", "#394db8", "#17152b"],
    sunset: ["#ffc078", "#e65c87", "#49234f"],
    ice: ["#e8fbff", "#82b8d7", "#263e67"],
    candy: ["#ff86c8", "#9c6bff", "#57d8df"],
    grid: ["#1b2a46", "#101a2d", "#080d17"]
  };
  const layoutTemplates = {
    event: [
      { text: "LE RENDEZ-VOUS", font: "Montserrat", size: 2.8, x: 0.5, y: 0.15, color: "#d8c9a8" },
      { text: "NUIT", font: "Cinzel", size: 15, x: 0.5, y: 0.35, color: "#f2e8d4" },
      { text: "SONORE", font: "Cinzel", size: 8, x: 0.5, y: 0.45, color: "#d4b779" },
      { text: "LIVE · DJ SET · PERFORMANCE", font: "Montserrat", size: 2.8, x: 0.5, y: 0.59, color: "#e7dfd0" },
      { text: "24 OCTOBRE · 21H", font: "Montserrat", size: 4.2, x: 0.5, y: 0.73, color: "#f2e8d4" },
      { text: "LE STUDIO — PARIS", font: "Montserrat", size: 2.8, x: 0.5, y: 0.83, color: "#d4b779" }
    ],
    editorial: [
      { text: "LIGNE · ÉDITORIAL", font: "Montserrat", size: 2.5, x: 0.5, y: 0.12, color: "#755f43" },
      { text: "L’ART", font: "Cormorant Garamond", size: 11, x: 0.5, y: 0.31, color: "#25231f" },
      { text: "DU SILENCE", font: "Cormorant Garamond", size: 7, x: 0.5, y: 0.41, color: "#755f43" },
      { text: "COLLECTION AUTOMNE · HIVER", font: "Montserrat", size: 2.5, x: 0.5, y: 0.61, color: "#514b41" },
      { text: "UNE ÉTUDE DE LA FORME ET DE LA LUMIÈRE", font: "Montserrat", size: 2, x: 0.5, y: 0.70, color: "#777064" },
      { text: "NUMÉRO 01  /  PARIS", font: "Montserrat", size: 2.4, x: 0.5, y: 0.88, color: "#755f43" }
    ],
    product: [
      { text: "ATELIER · OBJETS", font: "Montserrat", size: 2.5, x: 0.5, y: 0.14, color: "#e7d9bd" },
      { text: "FORME", font: "Playfair Display", size: 10, x: 0.5, y: 0.34, color: "#f5efe3" },
      { text: "PURE", font: "Playfair Display", size: 12, x: 0.5, y: 0.45, color: "#d4b779" },
      { text: "DESIGNÉ POUR DURER", font: "Montserrat", size: 2.6, x: 0.5, y: 0.64, color: "#eee7da" },
      { text: "MATIÈRES CHOISIES · FABRICATION SOIGNÉE", font: "Montserrat", size: 2.1, x: 0.5, y: 0.73, color: "#c3b9a5" },
      { text: "DÉCOUVRIR LA COLLECTION", font: "Montserrat", size: 2.5, x: 0.5, y: 0.86, color: "#d4b779" }
    ],
    album: [
      { text: "LUMA RECORDS  ·  LR—001", font: "Share Tech Mono", size: 2.4, x: 0.5, y: 0.13, color: "#91d8e8" },
      { text: "AFTER", font: "Orbitron", size: 9, x: 0.5, y: 0.36, color: "#f0f2f5" },
      { text: "THE DARK", font: "Orbitron", size: 7, x: 0.5, y: 0.46, color: "#9ae9f5", strokeWidth: 0.45, strokeColor: "#5c67c8" },
      { text: "A NEW SOUND EXPERIENCE", font: "Share Tech Mono", size: 2.6, x: 0.5, y: 0.65, color: "#d6e8eb" },
      { text: "ORIGINAL SOUND · VOL. 01", font: "Share Tech Mono", size: 2.4, x: 0.5, y: 0.83, color: "#91d8e8" }
    ],
    story: [
      { text: "STUDIO LUMA PRÉSENTE", font: "Montserrat", size: 2.5, x: 0.5, y: 0.13, color: "#e4d3b9" },
      { text: "VOTRE", font: "Playfair Display", size: 8, x: 0.5, y: 0.32, color: "#fff8ec" },
      { text: "PROCHAINE", font: "Playfair Display", size: 6, x: 0.5, y: 0.41, color: "#fff8ec" },
      { text: "HISTOIRE", font: "Playfair Display", size: 8, x: 0.5, y: 0.50, color: "#d4b779" },
      { text: "COMMENCE ICI", font: "Montserrat", size: 2.8, x: 0.5, y: 0.67, color: "#f1e9db" },
      { text: "GLISSEZ POUR DÉCOUVRIR", font: "Montserrat", size: 2.4, x: 0.5, y: 0.87, color: "#d4b779" }
    ],
    gaming: [
      { text: "TRANSMISSION  ·  SECTEUR 09", font: "Share Tech Mono", size: 2.6, x: 0.5, y: 0.17, color: "#76eaff" },
      { text: "NIGHT", font: "Orbitron", size: 10, x: 0.5, y: 0.38, color: "#eefbff", strokeWidth: 0.5, strokeColor: "#783aff" },
      { text: "SHIFT", font: "Orbitron", size: 11, x: 0.5, y: 0.50, color: "#85eeff", strokeWidth: 0.55, strokeColor: "#783aff" },
      { text: "MODE MULTIJOUEUR · EN LIGNE", font: "Share Tech Mono", size: 2.5, x: 0.5, y: 0.70, color: "#e2faff" },
      { text: "SAISON 04  /  23:47", font: "Share Tech Mono", size: 2.7, x: 0.5, y: 0.84, color: "#c995ff" }
    ],
    dark: [
      { text: "LUMA STUDIO  ·  ÉDITION NOCTURNE", font: "Montserrat", size: 2.2, x: 0.5, y: 0.12, color: "#c9c1ce" },
      { text: "AFTER", font: "AngelicWar", size: 15, x: 0.5, y: 0.43, color: "#f2eaf4" },
      { text: "DARK", font: "AngelicWar", size: 13, x: 0.5, y: 0.56, color: "#c9a8e8" },
      { text: "DARK ROMANCE  ·  EST. MMXXIV", font: "Montserrat", size: 2.5, x: 0.5, y: 0.72, color: "#e1d9e5" },
      { text: "NOCTURNE  /  PARIS", font: "Montserrat", size: 2.4, x: 0.5, y: 0.87, color: "#c9a8e8" }
    ]
  };
  const templateLogos = {
    dark: {
      type: "ornateCross",
      options: { scale: 0.14, x: 0.5, y: 0.26, tintEnabled: true, tintColor: "#d9c7e5" }
    }
  };
  const templatePreviewMode = pageParams.get("preview") === "1" &&
    Object.prototype.hasOwnProperty.call(layoutTemplates, requestedTemplate);
  const templateFrames = {
    editorial: "double",
    product: "artdeco",
    album: "silver",
    story: "corners",
    gaming: "neon",
    dark: "silver"
  };
  const templateRatios = {
    event: "0.5625",
    editorial: "0.8",
    product: "1",
    album: "1",
    story: "0.5625",
    gaming: "1.7778",
    dark: "1"
  };
  const templatePaperColors = {
    event: "#191714",
    editorial: "#f1ece2",
    product: "#20201d",
    album: "#10131b",
    story: "#302923",
    gaming: "#0c111a",
    dark: "#090b0b"
  };
  const templateBackgrounds = {
    gaming: "grid",
    dark: "graphite"
  };
  const frameStyles = new Set(["none", "gold", "ivory", "film", "silver", "gothic", "neon", "double", "corners", "artdeco", "glitch", "stamp", "aurora", "ornate", "dotted", "minimal"]);
  const legacyLogoTemplates = {
    monogram: {
      name: "Monogramme",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="54" fill="none" stroke="__COLOR__" stroke-width="4"/><path d="M49 31v66h43" fill="none" stroke="__COLOR__" stroke-width="7" stroke-linecap="square"/></svg>'
    },
    spark: {
      name: "Éclat",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path d="M64 8 77 49l43 15-43 14-13 42-14-42L8 64l42-15z" fill="none" stroke="__COLOR__" stroke-width="5" stroke-linejoin="round"/><circle cx="64" cy="64" r="8" fill="__COLOR__"/></svg>'
    },
    orbit: {
      name: "Orbite",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="12" fill="__COLOR__"/><ellipse cx="64" cy="64" rx="54" ry="24" fill="none" stroke="__COLOR__" stroke-width="4" transform="rotate(-35 64 64)"/><circle cx="103" cy="30" r="7" fill="__COLOR__"/></svg>'
    },
    leaf: {
      name: "Feuille",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path d="M105 18C57 18 22 33 22 72c0 20 14 36 34 34 39-4 49-43 49-88z" fill="none" stroke="__COLOR__" stroke-width="5"/><path d="M17 111c20-29 41-49 70-73" fill="none" stroke="__COLOR__" stroke-width="5" stroke-linecap="round"/></svg>'
    },
    crest: {
      name: "Emblème",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path d="M18 18h92v37c0 34-27 54-46 65C45 109 18 89 18 55z" fill="none" stroke="__COLOR__" stroke-width="5"/><path d="m42 45 22 43 22-43" fill="none" stroke="__COLOR__" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    diamond: {
      name: "Diamant",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path d="m64 9 55 55-55 55L9 64z" fill="none" stroke="__COLOR__" stroke-width="5"/><path d="M40 64h48M64 40v48" fill="none" stroke="__COLOR__" stroke-width="4"/></svg>'
    },
    crown: {
      name: "Couronne",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path d="m15 39 27 21 22-39 22 39 27-21-14 65H29z" fill="none" stroke="__COLOR__" stroke-width="5" stroke-linejoin="round"/><path d="M32 88h64" stroke="__COLOR__" stroke-width="4"/></svg>'
    },
    laurel: {
      name: "Laurier",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path d="M64 112C32 91 22 59 34 22c21 13 30 34 30 65 0-31 9-52 30-65 12 37 2 69-30 90z" fill="none" stroke="__COLOR__" stroke-width="5"/><path d="M64 108V42" stroke="__COLOR__" stroke-width="4"/></svg>'
    },
    arch: {
      name: "Arche",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path d="M16 112V61a48 48 0 0 1 96 0v51M35 112V61a29 29 0 0 1 58 0v51M8 112h112" fill="none" stroke="__COLOR__" stroke-width="5"/></svg>'
    },
    flower: {
      name: "Rosace",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path d="M64 13c15 0 22 18 14 34 16-9 37-3 37 12s-21 21-37 13c9 16 2 34-14 34S42 88 50 72c-16 9-37 3-37-13s21-21 37-12c-8-16-1-34 14-34z" fill="none" stroke="__COLOR__" stroke-width="5"/><circle cx="64" cy="59" r="10" fill="__COLOR__"/></svg>'
    },
    cross: {
      name: "Croix",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path d="M54 9h20v35h35v20H74v55H54V64H19V44h35z" fill="none" stroke="__COLOR__" stroke-width="5" stroke-linejoin="round"/><path d="M64 16v96M26 54h76" fill="none" stroke="__COLOR__" stroke-width="2" opacity=".55"/></svg>'
    },
    gothicCross: {
      name: "Croix gothique",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f2f4f7"/><stop offset=".28" stop-color="#747b86"/><stop offset=".52" stop-color="#e4e7eb"/><stop offset=".76" stop-color="#373c45"/><stop offset="1" stop-color="#c2c7cf"/></linearGradient></defs><path d="M56 8h16l-3 24 9-10 10 10-15 17h28l18 15-18 15H73l15 17-10 10-9-10 3 24H56l3-24-9 10-10-10 15-17H27L9 64l18-15h28L40 32l10-10 9 10z" fill="#111318" stroke="url(#steel)" stroke-width="4" stroke-linejoin="round"/><path d="M64 16v96M20 64h88M31 51l66 26M97 51 31 77" fill="none" stroke="url(#steel)" stroke-width="2"/><circle cx="64" cy="64" r="7" fill="#171a20" stroke="url(#steel)" stroke-width="3"/></svg>'
    },
    ornateCross: {
      name: "Croix ornée",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="gothic-silver" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f3f4f6"/><stop offset=".45" stop-color="#6f7782"/><stop offset=".7" stop-color="#272b32"/><stop offset="1" stop-color="#c5cbd3"/></linearGradient></defs><path d="M55 8h18l-3 31c7-5 12-12 16-20l13 10c-5 9-12 15-22 21h35v18H77c10 6 17 12 22 21L86 99c-4-8-9-15-16-20l3 41H55l3-41c-7 5-12 12-16 20L29 89c5-9 12-15 22-21H16V50h35c-10-6-17-12-22-21l13-10c4 8 9 15 16 20z" fill="#0d0f13" stroke="url(#gothic-silver)" stroke-width="4" stroke-linejoin="round"/><path d="M64 17v94M25 59h78M41 33l46 62M87 33 41 95" fill="none" stroke="url(#gothic-silver)" stroke-width="2"/><circle cx="64" cy="59" r="6" fill="#101216" stroke="#e3e6eb" stroke-width="2"/></svg>'
    },
    cyberSigil: {
      name: "Sigil cyber",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="cyber" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#70f6ff"/><stop offset=".5" stop-color="#6d7cff"/><stop offset="1" stop-color="#f04fff"/></linearGradient></defs><path d="m64 7 47 27v54l-47 27-47-27V34z" fill="#0c111a" stroke="url(#cyber)" stroke-width="4"/><path d="M64 19v90M28 43l72 42M100 43 28 85M44 29l20 12 20-12M44 99l20-12 20 12M19 64h29m61 0H80" fill="none" stroke="url(#cyber)" stroke-width="4" stroke-linecap="square"/><circle cx="64" cy="64" r="12" fill="#10121b" stroke="#83f2ff" stroke-width="3"/></svg>'
    },
    eclipse: {
      name: "Éclipse",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="eclipse-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5f5f5"/><stop offset=".5" stop-color="#6d737d"/><stop offset="1" stop-color="#d0d4dc"/></linearGradient></defs><circle cx="64" cy="64" r="48" fill="#101216" stroke="url(#eclipse-metal)" stroke-width="4"/><circle cx="74" cy="53" r="26" fill="#d9dde5"/><circle cx="84" cy="43" r="26" fill="#101216"/><path d="M25 64h18m42 0h18M64 19v17m0 56v17" stroke="url(#eclipse-metal)" stroke-width="3"/><path d="m64 48 5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="url(#eclipse-metal)"/></svg>'
    },
    thornHalo: {
      name: "Halo d’épines",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="thorn-steel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0f2f5"/><stop offset=".48" stop-color="#59616c"/><stop offset="1" stop-color="#d2d7df"/></linearGradient></defs><circle cx="64" cy="64" r="43" fill="#0c0e12" stroke="url(#thorn-steel)" stroke-width="3"/><path d="m64 8 7 18 15-12-2 21 21-3-13 16 20 8-20 8 13 16-21-3 2 21-15-12-7 18-7-18-15 12 2-21-21 3 13-16-20-8 20-8-13-16 21 3-2-21 15 12z" fill="none" stroke="url(#thorn-steel)" stroke-width="3" stroke-linejoin="round"/><path d="m64 35 6 20 20 9-20 9-6 20-7-20-19-9 19-9z" fill="#171a20" stroke="#c4cad3" stroke-width="2"/></svg>'
    },
    cyberMark: {
      name: "Marque cyber",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="cyber-mark" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6cf7ff"/><stop offset=".48" stop-color="#7482ff"/><stop offset="1" stop-color="#f05aff"/></linearGradient></defs><path d="M64 7 112 35v58l-48 28-48-28V35z" fill="#0b111a" stroke="url(#cyber-mark)" stroke-width="4"/><path d="M64 18v92M27 39l74 50M101 39 27 89M18 64h35m57 0H75M42 25l22 14 22-14m-44 78 22-14 22 14" fill="none" stroke="url(#cyber-mark)" stroke-width="4" stroke-linecap="square"/><circle cx="64" cy="64" r="13" fill="#10131c" stroke="#82f1ff" stroke-width="3"/></svg>'
    },
    chromeBlade: {
      name: "Lame chrome",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="blade-steel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".35" stop-color="#727b87"/><stop offset=".55" stop-color="#e2e6eb"/><stop offset="1" stop-color="#414852"/></linearGradient></defs><path d="M64 8 81 51l34 13-34 13-17 43-17-43-34-13 34-13z" fill="#101318" stroke="url(#blade-steel)" stroke-width="4" stroke-linejoin="round"/><path d="M64 16v96M23 64h82M49 51l15 13-15 13m30-26L64 64l15 13" fill="none" stroke="url(#blade-steel)" stroke-width="3" stroke-linejoin="round"/><circle cx="64" cy="64" r="7" fill="#171b21" stroke="#f1f3f6" stroke-width="2"/></svg>'
    },
    wings: {
      name: "Ailes",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path d="M64 102V37m0 29C43 44 26 31 10 35c7 22 23 38 49 47m5-16c21-25 38-38 54-34-7 22-23 38-49 47M51 112h26" fill="none" stroke="__COLOR__" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="64" cy="24" r="7" fill="__COLOR__"/></svg>'
    },
    fleur: {
      name: "Fleur",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path d="M64 11c11 15 14 25 0 40-14-15-11-25 0-40zm0 106c-11-15-14-25 0-40 14 15 11 25 0 40zM11 64c15-11 25-14 40 0-15 14-25 11-40 0zm106 0c-15 11-25 14-40 0 15-14 25-11 40 0z" fill="none" stroke="__COLOR__" stroke-width="5" stroke-linejoin="round"/><circle cx="64" cy="64" r="11" fill="none" stroke="__COLOR__" stroke-width="5"/></svg>'
    }
  };

  const logoTemplates = {
    angels: { name: "Angels XX", src: "assets/images/logo/angels-xx.png" },
    bat: { name: "Chauve-souris", src: "assets/images/logo/bat.png" },
    chapelet: { name: "Chapelet Cruzz", src: "assets/images/logo/chapelet-cruzz.png" },
    chromeSkull: { name: "Crâne chrome", src: "assets/images/logo/Chrome-skull-Cross.png" },
    ornateCross: { name: "Croix ornée", src: "assets/images/logo/Croix-ornee.png" },
    cruzzOne: { name: "Cruzz 01", src: "assets/images/logo/cruzz-1.png" },
    dragonCruzz: { name: "Cruzz dragon", src: "assets/images/logo/cruzz-dragon.png" },
    cruzzStyle: { name: "Cruzz style", src: "assets/images/logo/cruzz-style.png" },
    cruzz: { name: "Cruzz", src: "assets/images/logo/cruzz.png" },
    cyberCross: { name: "Sigil cyber", src: "assets/images/logo/cybersigilism-cross.png" },
    eclipse: { name: "Éclipse", src: "assets/images/logo/Eclispe.png" },
    metalFlower: { name: "Fleur métal", src: "assets/images/logo/flower-metal.png" },
    gangster: { name: "Gangster boy", src: "assets/images/logo/gangster-boy.png" },
    rack: { name: "Rack", src: "assets/images/logo/rack.png" },
    savage: { name: "Savage", src: "assets/images/logo/savage.png" },
    spireCross: { name: "Croix spire", src: "assets/images/logo/spire-cross.png" },
    tripleCruzz: { name: "Triple Cruzz", src: "assets/images/logo/triple-cruzz.png" },
    you: { name: "You", src: "assets/images/logo/you.png" },
    chromeAngels: { name: "Chrome Angels", src: "assets/images/logo/Chrome-Angels-logo.png" },
    lilithSymbol: { name: "Symbole Lilith", src: "assets/images/logo/Lilith-Symbol-logo.png" },
    bitcoin: { name: "Bitcoin", src: "assets/images/logo/Logo-Bitcoin.png" },
    diamonds: { name: "Diamonds", src: "assets/images/logo/Logo-Diamonds.png" },
    emperor: { name: "Emperor", src: "assets/images/logo/logo-Emperor.png" },
    glock: { name: "Glock", src: "assets/images/logo/Logo-Glock.png" },
    hnsArchitect: { name: "HNS Architect", src: "assets/images/logo/Logo-Hns-archictect-Logo.png" },
    king: { name: "King", src: "assets/images/logo/Logo-King.png" },
    spidermanLogo: { name: "Spiderman", src: "assets/images/logo/Logo-Spiderman.png" },
    santana: { name: "Santana", src: "assets/images/logo/Santana.png" },
    spider: { name: "Spider", src: "assets/images/logo/Spider.png" },
    cross444: { name: "444 Cross", src: "assets/images/logo/444Crosss.png" },
    crossTwo: { name: "Cross 02", src: "assets/images/logo/Cross-2.png" },
    heavenCore: { name: "Heaven Core", src: "assets/images/logo/Heaven-core.png" },
    pray: { name: "Pray", src: "assets/images/logo/Pray.png" },
    sobSuasAsas: { name: "Sob Suas Asas", src: "assets/images/logo/Sob-Suas-Asas.png" },
    texte: { name: "Texte", src: "assets/images/logo/Texte.png" },
    xmdjs: { name: "XMDJS", src: "assets/images/logo/xmdjs.png" },
    blackBirds: { name: "Black Birds", src: "assets/images/logo/BlackBirds.png" },
    bxcgriynd: { name: "Bxcgriynd", src: "assets/images/logo/Bxcgriynd.png" },
    raveonOnScriots: { name: "Raveon On Scriots", src: "assets/images/logo/RaveonOnScriots.png" },
    wjEmblem: { name: "W-WJ-J-S-C-HHNCWJWW-MSJ-NJW", src: "assets/images/logo/w-wj-j-s-c-hhncwjww-msj-njw.png" }
  };

  function normalizeLogoEntry(entry) {
    const slug = (entry.id || entry.slug || entry.name || "logo").toString();
    const label = (entry.name || slug).toString();
    return {
      id: slug.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase() || `logo-${Math.random().toString(36).slice(2, 8)}`,
      name: label,
      src: entry.src || `assets/images/logo/${slug}`
    };
  }

  function renderLogoLibrary(entries) {
    const library = document.querySelector(".logo-library");
    if (!library) return;
    let grid = library.querySelector(".logo-grid");
    if (!grid) {
      grid = document.createElement("div");
      grid.className = "logo-grid";
      const search = library.querySelector("#logo-search");
      if (search) {
        search.insertAdjacentElement("afterend", grid);
      } else {
        library.append(grid);
      }
    }
    const normalized = entries
      .map((entry) => normalizeLogoEntry(entry))
      .filter((entry, index, list) => list.findIndex((item) => item.src === entry.src) === index)
      .sort((left, right) => left.name.localeCompare(right.name, "fr"));
    grid.replaceChildren();
    normalized.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "logo-card";
      button.dataset.logo = entry.id;
      button.disabled = false;
      button.title = entry.name;
      button.innerHTML = `<img src="${entry.src}" alt="" loading="lazy" /><span>${entry.name}</span>`;
      button.addEventListener("click", () => {
        document.querySelector("#logo-search").value = entry.name;
        filterLogoLibrary();
        const image = new Image();
        image.onload = () => {
          const layer = { id: `logo-${Date.now()}` }; 
          addLogoLayer(image, entry.name, entry.src, true, document.querySelector("#logo-color").value);
          document.querySelector("#logo-search").value = "";
          filterLogoLibrary();
        };
        image.onerror = () => announce(`Impossible de charger le logo « ${entry.name} ».`, true);
        image.src = entry.src;
      });
      grid.append(button);
    });
    const result = document.querySelector("#logo-results");
    if (result) result.textContent = `${normalized.length} logos disponibles`;
  }

  async function loadLogoManifest() {
    const fallbackEntries = Object.entries(logoTemplates).map(([id, logo]) => ({ id, name: logo.name, src: logo.src }));
    try {
      const response = await fetch("assets/images/logo/manifest.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const manifest = await response.json();
      const mergedEntries = Array.isArray(manifest) && manifest.length ? manifest : fallbackEntries;
      renderLogoLibrary(mergedEntries);
    } catch (_error) {
      renderLogoLibrary(fallbackEntries);
    }
  }

  let image = null;
  let sourceUrl = null;
  let originalName = "";
  let quarterTurns = 0;
  let rotationDegrees = 0;
  let flipped = false;
  let selectedLayerId = null;
  let groupSequence = 0;
  let selectedFrame = "none";
  let activePreset = "original";
  let activeSlider = null;
  let draggingLayer = null;
  let layerSequence = 0;
  let zoom = 100;
  let backgroundMask = null;
  let backgroundColor = null;
  let backgroundSamplePoint = null;
  let pickingBackground = false;
  let cropRect = null;
  let cropSelection = null;
  let croppingNow = false;
  let currentStroke = null;
  let activeTool = "select";
  let selectedBackground = "none";
  let isBlankCanvas = false;
  let paperColor = defaultPaperColor;
  let alignmentGuides = { x: null, y: null };
  let autosaveTimer = null;
  let autosaveDatabase = null;
  let restoringProject = false;
  let exportInProgress = false;
  let showDesignPreview = false;

  function announce(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function setEditorTheme(theme, persist = false) {
    const isLight = theme === "light";
    document.documentElement.dataset.editorTheme = isLight ? "light" : "dark";
    const toggle = document.querySelector("#editor-theme-toggle");
    toggle.setAttribute("aria-pressed", String(isLight));
    toggle.textContent = isLight ? "☾ Mode sombre" : "☼ Mode clair";
    toggle.title = isLight ? "Passer au mode sombre" : "Passer au mode clair";
    document.querySelector('meta[name="theme-color"]').content = isLight ? "#f1f2f4" : "#090909";
    if (persist) {
      try {
        localStorage.setItem("luma-editor-theme", isLight ? "light" : "dark");
      } catch (error) {
        announce(`Le thème est appliqué, mais n’a pas pu être mémorisé : ${error.message}`, true);
        return;
      }
    }
    announce(`Mode ${isLight ? "clair" : "sombre"} activé.`);
  }

  document.querySelector("#editor-theme-toggle").addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.editorTheme;
    setEditorTheme(currentTheme === "light" ? "dark" : "light", true);
  });

  const mobileEditorQuery = window.matchMedia("(max-width: 1100px)");
  const mobileEditorBackdrop = document.querySelector("#mobile-editor-backdrop");
  let activeMobilePanel = null;

  function closeMobilePanel(restoreFocus = false) {
    if (!activeMobilePanel) return;
    const panel = document.getElementById(activeMobilePanel);
    const trigger = document.querySelector(`[data-mobile-panel="${activeMobilePanel}"]`);
    panel.classList.remove("mobile-drawer-open");
    document.querySelector(".editor-shell").classList.remove("mobile-drawer-visible");
    document.body.classList.remove("mobile-panel-open");
    mobileEditorBackdrop.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    activeMobilePanel = null;
    if (restoreFocus && trigger) trigger.focus();
  }

  function openMobilePanel(panelId) {
    if (!mobileEditorQuery.matches) return;
    if (activeMobilePanel) closeMobilePanel();
    const panel = document.getElementById(panelId);
    if (!panel) return;
    activeMobilePanel = panelId;
    panel.open = true;
    panel.classList.add("mobile-drawer-open");
    document.querySelector(".editor-shell").classList.add("mobile-drawer-visible");
    document.body.classList.add("mobile-panel-open");
    mobileEditorBackdrop.hidden = false;
    document.querySelector(`[data-mobile-panel="${panelId}"]`).setAttribute("aria-expanded", "true");
    panel.querySelector(".mobile-drawer-close").focus();
  }

  document.querySelectorAll("[data-mobile-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      const panelId = button.dataset.mobilePanel;
      if (activeMobilePanel === panelId) closeMobilePanel(true);
      else openMobilePanel(panelId);
    });
  });
  document.querySelectorAll("[data-mobile-panel-close]").forEach((button) => {
    button.addEventListener("click", () => closeMobilePanel(true));
  });
  mobileEditorBackdrop.addEventListener("click", () => closeMobilePanel(true));
  document.addEventListener("click", (event) => {
    if (mobileEditorQuery.matches && activeMobilePanel &&
        event.target.closest("#new-text-layer, #logo-upload-button, [data-logo]")) {
      closeMobilePanel();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeMobilePanel) {
      event.preventDefault();
      closeMobilePanel(true);
    }
  });
  function syncMobileSidebarState() {
    if (!mobileEditorQuery.matches) {
      closeMobilePanel();
      document.querySelectorAll(".sidebar").forEach((panel) => {
        panel.classList.remove("mobile-drawer-open");
      });
    }
  }
  mobileEditorQuery.addEventListener("change", syncMobileSidebarState);
  window.addEventListener("resize", syncMobileSidebarState);
  const mobileSidebarResizeObserver = new ResizeObserver(syncMobileSidebarState);
  mobileSidebarResizeObserver.observe(document.documentElement);
  syncMobileSidebarState();

  function getFontCategory(fontName) {
    const normalized = String(fontName || "").toLowerCase();
    if (["unifrakturmaguntia", "grenze gotisch", "germania one", "pirata one", "medievalsharp", "eater", "rye", "rakkas", "unifrakturcook", "new rocker", "metal mania", "metal", "blackletter", "gothicville", "jellyka vampire street", "magnific", "hellbone-demo", "old london", "seagram tfb", "ruritania", "ruritania outline", "super squad", "doctor glitch", "angelicwar", "kingscross", "crosses", "angel", "angel variant", "angela", "angelin", "bleeding cowboys", "crosses", "daustley", "xxii scratch", "campus personal use", "santana", "spider", "spiderman", "bitcoin", "diamonds", "eminence"].includes(normalized)) {
      return "gothic";
    }
    if (["playfair display", "cormorant garamond", "dm serif display", "libre baskerville", "cinzel", "merriweather", "alegreya", "lora", "crimson text", "cormorant garamond", "garnet", "jacquard 12"].includes(normalized)) {
      return "serif";
    }
    if (["orbitron", "audiowide", "oxanium", "michroma", "share tech mono", "roboto mono", "ibm plex mono", "space mono", "courier prime", "fira code", "jetbrains mono", "ubuntu mono", "source sans 3"].includes(normalized)) {
      return "tech";
    }
    if (["cursive", "monsieur la doulaise", "quicksand", "nunito", "lato", "open sans", "raleway", "manrope", "plus jakarta sans", "urbanist", "montserrat", "montserrat alternates", "poppins", "dm sans", "outfit", "sora", "kanit", "league spartan", "inter", "archivo", "space grotesk", "audiowide", "beverly mint", "rodin"].includes(normalized)) {
      return "modern";
    }
    if (["eater", "medievalsharp", "rye", "rakkas", "jacquard 12", "unifrakturcook"].includes(normalized)) {
      return "script";
    }
    if (["kingscross", "crosses", "angel", "angel variant", "angela", "angelin", "angelicwar", "blackletter", "daustley", "gothicville", "jellyka vampire street", "magnific", "metal", "xxii scratch", "bleeding cowboys", "cakecafe", "campus personal use", "doctor glitch", "hellbone-demo", "ithorn", "old london", "rasley heights", "ruritania", "ruritania outline", "seagram tfb", "super squad"].includes(normalized)) {
      return "local";
    }
    return "all";
  }

  function updateFontLibrary() {
    const fontSelect = document.querySelector("#text-font");
    const searchInput = document.querySelector("#text-font-search");
    const preview = document.querySelector("#text-font-preview");
    const favoriteButton = document.querySelector("#font-favorite-toggle");
    const activeFilter = document.querySelector(".font-filter.active")?.dataset.fontFilter || "all";
    const query = searchInput.value.trim().toLowerCase();
    const options = [...fontSelect.querySelectorAll("option")];

    options.forEach((option) => {
      const optionText = option.textContent.toLowerCase();
      const optionValue = option.value.toLowerCase();
      const category = getFontCategory(option.value);
      const matchesQuery = !query || optionText.includes(query) || optionValue.includes(query);
      const matchesFilter = activeFilter === "all" || category === activeFilter;
      option.hidden = !(matchesQuery && matchesFilter);
    });

    const selectedFont = fontSelect.value || "Inter";
    const selectedOption = [...fontSelect.options].find((option) => option.value === selectedFont && !option.hidden);
    if (!selectedOption && !fontSelect.querySelector("option:not([hidden])")) {
      fontSelect.value = "Inter";
    }
    const finalFont = fontSelect.value || "Inter";
    preview.textContent = `Aa Bb 0123`;
    preview.style.fontFamily = getFontFamily(finalFont);
    preview.style.fontVariant = "normal";
    const favoriteKey = `luma-font-favorite-${finalFont}`;
    const isFavorite = Boolean(localStorage.getItem(favoriteKey));
    favoriteButton.setAttribute("aria-pressed", String(isFavorite));
    favoriteButton.textContent = isFavorite ? "★ Favori" : "☆ Favori";
    favoriteButton.disabled = !fontSelect.value;
  }

  function filterLogoLibrary() {
    const query = document.querySelector("#logo-search").value.trim().toLocaleLowerCase("fr");
    const cards = [...document.querySelectorAll(".logo-card[data-logo]")];
    let visibleCount = 0;
    cards.forEach((card) => {
      const matches = `${card.dataset.logo} ${card.querySelector("span").textContent}`.toLocaleLowerCase("fr").includes(query);
      card.hidden = !matches;
      visibleCount += Number(matches);
    });
    const result = document.querySelector("#logo-results");
    result.textContent = query ? `${visibleCount} résultat${visibleCount === 1 ? "" : "s"}` : `${cards.length} logos disponibles`;
  }

  function confirmImageReplacement() {
    return new Promise((resolve) => {
      const finish = () => {
        replaceImageDialog.removeEventListener("close", finish);
        resolve(replaceImageDialog.returnValue === "replace");
      };
      replaceImageDialog.addEventListener("close", finish);
      replaceImageDialog.showModal();
      document.querySelector("#confirm-image-replacement").focus();
    });
  }

  function readAdjustments() {
    return Object.fromEntries(adjustmentInputs.map((input) => [input.dataset.adjust, Number(input.value)]));
  }

  function setAdjustments(values) {
    adjustmentInputs.forEach((input) => {
      input.value = values[input.dataset.adjust];
      updateOutput(input);
    });
  }

  function updateOutput(input) {
    const output = document.querySelector(`[data-value-for="${input.id}"]`);
    if (!output) return;
    const suffix = ["brightness", "contrast", "saturation", "text-size", "text-stroke", "vignette", "glow", "layer-opacity", "layer-blur", "layer-x", "layer-y"].includes(input.id) ? "%" : "";
    const value = input.id === "image-rotation" || input.id === "layer-rotation"
      ? `${input.value}°`
      : input.id === "shadow-blur"
        ? `${input.value} px`
        : `${input.value}${suffix}`;
    output.value = value;
    output.textContent = value;
  }

  function snapshot() {
    return {
      image,
      originalName,
      quarterTurns,
      rotationDegrees,
      flipped,
      selectedFrame,
      activePreset,
      adjustments: readAdjustments(),
      aspectRatio: document.querySelector("#aspect-ratio").value,
      text: document.querySelector("#overlay-text").value,
      textColor: document.querySelector("#text-color").value,
      textFont: document.querySelector("#text-font").value,
      textSize: document.querySelector("#text-size").value,
      vignette: document.querySelector("#vignette").value,
      glow: document.querySelector("#glow").value,
      selectedBackground,
      isBlankCanvas,
      paperColor,
      cropRect: cropRect ? { ...cropRect } : null,
      strokes: strokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point })) })),
      layers: layers.map((layer) => ({ ...layer })),
      layerGroups: layerGroups.map((group) => ({ ...group })),
      selectedLayerId,
      selectedLayerIds: [...selectedLayerIds],
      backgroundMask,
      backgroundColor,
      backgroundSamplePoint,
      backgroundTolerance: document.querySelector("#background-tolerance").value,
      backgroundFeather: document.querySelector("#background-feather").value
    };
  }

  function saveHistory() {
    history.push(snapshot());
    if (history.length > maxHistory) history.shift();
    redoHistory.length = 0;
    updateHistoryControls();
  }

  function updateHistoryControls() {
    undoButton.disabled = history.length === 0;
    redoButton.disabled = redoHistory.length === 0;
  }

  function restoreSnapshot(previous) {
    image = previous.image;
    originalName = previous.originalName;
    quarterTurns = previous.quarterTurns;
    rotationDegrees = previous.rotationDegrees || 0;
    flipped = previous.flipped;
    selectedFrame = previous.selectedFrame;
    activePreset = previous.activePreset;
    backgroundMask = previous.backgroundMask;
    backgroundColor = previous.backgroundColor;
    backgroundSamplePoint = previous.backgroundSamplePoint;
    cropRect = previous.cropRect ? { ...previous.cropRect } : null;
    strokes.splice(0, strokes.length, ...(previous.strokes || []).map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({ ...point }))
    })));
    cropSelection = null;
    currentStroke = null;
    selectedBackground = previous.selectedBackground || "none";
    isBlankCanvas = Boolean(previous.isBlankCanvas);
    paperColor = previous.paperColor || defaultPaperColor;
    document.querySelector("#paper-color").value = paperColor;
    document.querySelector("#background-tolerance").value = previous.backgroundTolerance;
    document.querySelector("#background-feather").value = previous.backgroundFeather || "42";
    layers.splice(0, layers.length, ...previous.layers.map((layer) => ({ ...layer })));
    layerGroups.splice(0, layerGroups.length, ...(previous.layerGroups || []).map((group) => ({ ...group })));
    selectedLayerId = previous.selectedLayerId;
    selectedLayerIds.clear();
    (previous.selectedLayerIds || (selectedLayerId ? [selectedLayerId] : [])).forEach((id) => {
      if (layers.some((layer) => layer.id === id)) selectedLayerIds.add(id);
    });
    setAdjustments(previous.adjustments);
    document.querySelector("#aspect-ratio").value = previous.aspectRatio;
    document.querySelector("#image-rotation").value = String(rotationDegrees);
    document.querySelector("#vignette").value = previous.vignette;
    document.querySelector("#glow").value = previous.glow || "0";
    updateOutput(document.querySelector("#vignette"));
    updateOutput(document.querySelector("#glow"));
    updateOutput(document.querySelector("#background-tolerance"));
    updateOutput(document.querySelector("#background-feather"));
    updateOutput(document.querySelector("#image-rotation"));
    updateSelectionStates();
    updateBackdropSelection();
    updateLayersPanel();
    syncLayerControls();
    updateImageControls();
    updateToolControls();
    render();
  }

  function updateSelectionStates() {
    document.querySelectorAll("[data-preset]").forEach((button) => {
      const selected = button.dataset.preset === activePreset;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll("[data-frame]").forEach((button) => {
      const selected = button.dataset.frame === selectedFrame;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function updateBackdropSelection() {
    document.querySelectorAll("[data-backdrop]").forEach((button) => {
      const selected = button.dataset.backdrop === selectedBackground;
      button.disabled = !image;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function updateImageControls() {
    const hasImage = Boolean(image);
    const previewButton = document.querySelector("#design-preview-button");
    previewButton.disabled = !hasImage;
    previewButton.setAttribute("aria-pressed", String(showDesignPreview));
    previewButton.textContent = showDesignPreview ? "◉ Retour à l’éditeur" : "◉ Aperçu du design";
    previewButton.title = showDesignPreview
      ? "Revenir aux outils de l’éditeur"
      : "Afficher le design final en plein écran";
    document.querySelector("#design-preview-exit").hidden = !showDesignPreview;
    document.documentElement.classList.toggle("studio-design-preview", showDesignPreview);
    canvas.setAttribute("aria-label", "Aperçu du design final");
    document.querySelectorAll("#rotate-button, #flip-button, #new-text-layer, #image-rotation").forEach((button) => {
      button.disabled = !hasImage;
    });
    canvas.hidden = !hasImage;
    emptyState.hidden = hasImage;
    document.querySelector("#save-image-button").disabled = !hasImage;
    document.querySelector("#save-project-button").disabled = !hasImage;
    document.querySelector("#close-project-button").disabled = !hasImage;
    dropZone.classList.toggle("has-image", hasImage);
    dropZone.classList.toggle("sampling-background", pickingBackground);
    if (hasImage) {
      imageName.textContent = originalName;
      const angle = (quarterTurns * 90 + rotationDegrees) * Math.PI / 180;
      const width = Math.abs(image.naturalWidth * Math.cos(angle)) + Math.abs(image.naturalHeight * Math.sin(angle));
      const height = Math.abs(image.naturalWidth * Math.sin(angle)) + Math.abs(image.naturalHeight * Math.cos(angle));
      dimensions.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
    } else {
      imageName.textContent = "Aucune image";
      dimensions.textContent = "—";
    }
    document.querySelector("#open-image-button").textContent = hasImage ? "Changer d’image" : "Importer une image";
    const logoButton = document.querySelector("#logo-upload-button");
    logoButton.disabled = !hasImage;
    logoButton.classList.toggle("disabled", !hasImage);
    document.querySelector("#logo-upload").disabled = !hasImage;
    document.querySelectorAll("[data-logo]").forEach((button) => {
      button.disabled = !hasImage;
    });
    document.querySelector("#pick-background").disabled = !hasImage;
    document.querySelector("#pick-background").setAttribute("aria-pressed", String(pickingBackground));
    document.querySelector("#background-tolerance").disabled = !hasImage || !backgroundMask;
    document.querySelector("#background-feather").disabled = !hasImage || !backgroundMask;
    document.querySelector("#clear-background").disabled = !backgroundMask;
    document.querySelector("#paper-color").disabled = !hasImage || !isBlankCanvas;
    document.querySelector("#logo-tint-enabled").disabled = !hasImage || getSelectedLayer()?.type !== "image" || Boolean(getSelectedLayer()?.collageTile);
    document.querySelector("#logo-tint-color").disabled =
      !hasImage || getSelectedLayer()?.type !== "image" || Boolean(getSelectedLayer()?.collageTile) || !getSelectedLayer()?.tintEnabled;
    updateToolControls();
    updateBackdropSelection();
  }

  function updateToolControls() {
    const hasImage = Boolean(image);
    document.querySelectorAll("[data-tool]").forEach((button) => {
      const selected = button.dataset.tool === activeTool;
      button.disabled = !hasImage;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const brushActive = hasImage && (activeTool === "draw" || activeTool === "mask");
    const brushSize = document.querySelector("#brush-size");
    const brushColor = document.querySelector("#brush-color");
    const applyCrop = document.querySelector("#apply-crop");
    const cancelCrop = document.querySelector("#cancel-crop");
    brushSize.disabled = !brushActive;
    brushSize.closest(".brush-size").hidden = !brushActive;
    brushColor.disabled = !brushActive || activeTool === "mask";
    brushColor.closest(".brush-color").hidden = !brushActive;
    applyCrop.disabled = !hasImage || activeTool !== "crop" || !cropSelection;
    applyCrop.hidden = activeTool !== "crop";
    cancelCrop.disabled = !hasImage || activeTool !== "crop";
    cancelCrop.hidden = activeTool !== "crop";
    canvas.style.cursor = activeTool === "crop" || activeTool === "mask" || activeTool === "draw"
      ? "crosshair"
      : "grab";
    dropZone.classList.toggle("crop-mode", activeTool === "crop");
  }

  function setActiveTool(tool) {
    if (tool !== "select" && !image) return;
    activeTool = tool;
    cropSelection = null;
    currentStroke = null;
    updateToolControls();
    render();
    if (tool === "crop") announce("Tracez un rectangle sur l’image, puis validez le recadrage.");
    else if (tool === "mask") announce("Peignez sur l’image pour effacer localement. Ctrl+Z restaure le dernier trait.");
    else if (tool === "draw") announce("Dessinez sur l’image. La couleur et la taille du pinceau sont réglables.");
    else announce("Outil de sélection actif.");
  }

  function openAutosaveDatabase() {
    if (autosaveDatabase) return Promise.resolve(autosaveDatabase);
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("Le stockage local du navigateur n’est pas disponible."));
        return;
      }
      const request = indexedDB.open("luma-studio", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("projects")) {
          request.result.createObjectStore("projects", { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        autosaveDatabase = request.result;
        resolve(autosaveDatabase);
      };
      request.onerror = () => reject(request.error || new Error("Ouverture du stockage impossible."));
    });
  }

  async function createProjectData() {
    if (!image || !sourceUrl) throw new Error("Créez une feuille ou importez une image avant d’enregistrer.");
    const sourceBlob = await fetch(sourceUrl).then((response) => {
      if (!response.ok) throw new Error("Impossible de lire l’image source.");
      return response.blob();
    });
    const savedLayers = await Promise.all(layers.map(async (layer) => {
      const savedLayer = { ...layer };
      delete savedLayer.image;
      if (layer.type === "image" && layer.url) {
        const blob = await fetch(layer.url).then((response) => {
          if (!response.ok) throw new Error(`Impossible de lire le logo « ${layer.name} ».`);
          return response.blob();
        });
        savedLayer.asset = await blobToDataUrl(blob);
      }
      delete savedLayer.url;
      return savedLayer;
    }));
    return {
      version: 1,
      projectName: document.querySelector("#project-name").value,
      source: await blobToDataUrl(sourceBlob),
      originalName,
      quarterTurns,
      rotationDegrees,
      flipped,
      selectedFrame,
      activePreset,
      adjustments: readAdjustments(),
      aspectRatio: document.querySelector("#aspect-ratio").value,
      vignette: document.querySelector("#vignette").value,
      glow: document.querySelector("#glow").value,
      selectedBackground,
      isBlankCanvas,
      paperColor,
      cropRect: cropRect ? { ...cropRect } : null,
      strokes: strokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point })) })),
      backgroundTolerance: document.querySelector("#background-tolerance").value,
      backgroundFeather: document.querySelector("#background-feather").value,
      backgroundMask: backgroundMask?.toDataURL("image/png") || null,
      backgroundColor,
      backgroundSamplePoint,
      layers: savedLayers,
      selectedLayerId,
      selectedLayerIds: [...selectedLayerIds],
      layerGroups: layerGroups.map((group) => ({ ...group }))
    };
  }

  async function writeAutosave(project) {
    const database = await openAutosaveDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("projects", "readwrite");
      transaction.objectStore("projects").put({ id: "autosave", project, savedAt: Date.now() });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("La sauvegarde automatique a échoué."));
      transaction.onabort = () => reject(transaction.error || new Error("La sauvegarde automatique a été interrompue."));
    });
  }

  async function readAutosave() {
    const database = await openAutosaveDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction("projects", "readonly").objectStore("projects").get("autosave");
      request.onsuccess = () => resolve(request.result?.project || null);
      request.onerror = () => reject(request.error || new Error("La sauvegarde automatique n’a pas pu être lue."));
    });
  }

  function scheduleAutosave() {
    if (!image || restoringProject || templatePreviewMode) return;
    const state = document.querySelector("#autosave-state");
    state.textContent = "Modifications non enregistrées";
    state.classList.add("pending");
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(async () => {
      try {
        await writeAutosave(await createProjectData());
        state.textContent = "Sauvegardé sur cet appareil";
        state.classList.remove("pending", "error");
      } catch (error) {
        state.textContent = "Sauvegarde impossible";
        state.classList.remove("pending");
        state.classList.add("error");
        announce(`Échec de la sauvegarde automatique : ${error.message}`, true);
      }
    }, 900);
  }

  function cropDimensions(width, height) {
    const ratioValue = document.querySelector("#aspect-ratio").value;
    if (cropRect) {
      return {
        x: cropRect.x * width,
        y: cropRect.y * height,
        width: cropRect.width * width,
        height: cropRect.height * height
      };
    }
    if (ratioValue === "original") return { x: 0, y: 0, width, height };
    const ratio = Number(ratioValue);
    if (width / height > ratio) {
      const cropWidth = height * ratio;
      return { x: (width - cropWidth) / 2, y: 0, width: cropWidth, height };
    }
    const cropHeight = width / ratio;
    return { x: 0, y: (height - cropHeight) / 2, width, height: cropHeight };
  }

  function drawFrame(width, height) {
    if (selectedFrame === "none") return;
    const shortEdge = Math.min(width, height);
    const inset = Math.max(8, shortEdge * 0.025);
    const line = Math.max(2, inset * 0.16);
    const strokeInset = (offset, color, lineWidth = line) => {
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.strokeRect(inset + offset, inset + offset, width - (inset + offset) * 2, height - (inset + offset) * 2);
    };

    if (selectedFrame === "film") {
      const barHeight = height * 0.045;
      context.fillStyle = "#090909";
      context.fillRect(0, 0, width, barHeight);
      context.fillRect(0, height - barHeight, width, barHeight);
      context.strokeStyle = "rgba(245, 240, 228, 0.72)";
      context.lineWidth = Math.max(1, inset * 0.08);
      context.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
      const holeSize = Math.max(3, shortEdge * 0.012);
      const holeGap = holeSize * 2.2;
      for (let x = holeGap; x < width - holeGap; x += holeGap * 1.7) {
        context.fillStyle = "#dedbd4";
        context.fillRect(x, barHeight * 0.34, holeSize, holeSize);
        context.fillRect(x, height - barHeight * 0.34 - holeSize, holeSize, holeSize);
      }
      return;
    }
    if (selectedFrame === "gold") {
      strokeInset(0, "#d8b77a");
      return;
    }
    if (selectedFrame === "ivory") {
      strokeInset(0, "#f2eee5");
      return;
    }
    if (selectedFrame === "silver") {
      const silver = context.createLinearGradient(0, 0, width, height);
      silver.addColorStop(0, "#f4f6f8");
      silver.addColorStop(0.24, "#737b87");
      silver.addColorStop(0.5, "#e4e8ee");
      silver.addColorStop(0.76, "#525963");
      silver.addColorStop(1, "#d9dde3");
      strokeInset(0, silver, line * 1.35);
      strokeInset(line * 1.6, "rgba(255,255,255,0.72)", Math.max(1, line * 0.28));
      return;
    }
    if (selectedFrame === "double") {
      strokeInset(0, "#d7bd88", line * 0.85);
      strokeInset(inset * 0.72, "rgba(242,238,229,0.82)", Math.max(1, line * 0.45));
      return;
    }
    if (selectedFrame === "neon") {
      context.save();
      context.shadowColor = "#43ddff";
      context.shadowBlur = shortEdge * 0.035;
      strokeInset(0, "#54e9ff", line * 0.9);
      context.shadowColor = "#a64dff";
      context.shadowBlur = shortEdge * 0.025;
      strokeInset(inset * 0.65, "#a64dff", Math.max(1, line * 0.4));
      context.restore();
      return;
    }
    if (selectedFrame === "corners") {
      const cornerLength = shortEdge * 0.12;
      context.save();
      context.strokeStyle = "#bec5cf";
      context.lineWidth = Math.max(2, line * 1.15);
      context.lineCap = "square";
      [
        [inset, inset, 1, 1],
        [width - inset, inset, -1, 1],
        [inset, height - inset, 1, -1],
        [width - inset, height - inset, -1, -1]
      ].forEach(([x, y, horizontal, vertical]) => {
        context.beginPath();
        context.moveTo(x + horizontal * cornerLength, y);
        context.lineTo(x, y);
        context.lineTo(x, y + vertical * cornerLength);
        context.stroke();
      });
      context.restore();
      return;
    }
    if (selectedFrame === "gothic") {
      const silver = context.createLinearGradient(0, 0, width, height);
      silver.addColorStop(0, "#d8dde4");
      silver.addColorStop(0.5, "#4b535e");
      silver.addColorStop(1, "#bec5ce");
      strokeInset(0, silver, line);
      strokeInset(inset * 0.62, "rgba(177,190,207,0.48)", Math.max(1, line * 0.4));
      const markSize = Math.max(5, shortEdge * 0.018);
      context.save();
      context.translate(width / 2, inset * 0.95);
      context.fillStyle = "#aeb7c3";
      context.beginPath();
      context.moveTo(-markSize * 0.25, -markSize);
      context.lineTo(markSize * 0.25, -markSize);
      context.lineTo(markSize * 0.25, -markSize * 0.25);
      context.lineTo(markSize, -markSize * 0.25);
      context.lineTo(markSize, markSize * 0.25);
      context.lineTo(markSize * 0.25, markSize * 0.25);
      context.lineTo(markSize * 0.25, markSize);
      context.lineTo(-markSize * 0.25, markSize);
      context.lineTo(-markSize * 0.25, markSize * 0.25);
      context.lineTo(-markSize, markSize * 0.25);
      context.lineTo(-markSize, -markSize * 0.25);
      context.lineTo(-markSize * 0.25, -markSize * 0.25);
      context.closePath();
      context.fill();
      context.restore();
      return;
    }
    if (selectedFrame === "artdeco") {
      context.save();
      strokeInset(0, "#c7a56d", line);
      strokeInset(inset * 0.55, "rgba(231,216,185,0.78)", Math.max(1, line * 0.42));
      const decoSize = Math.max(7, shortEdge * 0.024);
      context.fillStyle = "#d5b779";
      [inset + decoSize, width - inset - decoSize].forEach((x) => {
        [inset + decoSize, height - inset - decoSize].forEach((y) => {
          context.save();
          context.translate(x, y);
          context.rotate(Math.PI / 4);
          context.fillRect(-decoSize * 0.28, -decoSize * 0.28, decoSize * 0.56, decoSize * 0.56);
          context.restore();
        });
      });
      context.restore();
      return;
    }
    if (selectedFrame === "glitch") {
      context.save();
      context.lineWidth = Math.max(2, line * 0.9);
      const segment = shortEdge * 0.16;
      for (let index = 0; index < 5; index += 1) {
        const y = inset + shortEdge * (0.12 + index * 0.16);
        const x = inset + shortEdge * (0.08 + index * 0.16);
        context.strokeStyle = index % 2 ? "#ed4dff" : "#55eaff";
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(Math.min(width - inset, x + segment), y);
        context.moveTo(width - x - segment, height - y);
        context.lineTo(width - x, height - y);
        context.stroke();
      }
      context.strokeStyle = "rgba(108,228,255,0.8)";
      context.lineWidth = Math.max(1, line * 0.36);
      context.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
      context.restore();
      return;
    }
    if (selectedFrame === "stamp") {
      context.save();
      context.strokeStyle = "#d1c3a5";
      context.lineWidth = Math.max(1, line * 0.6);
      context.setLineDash([shortEdge * 0.012, shortEdge * 0.008]);
      context.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
      context.setLineDash([]);
      strokeInset(inset * 0.75, "rgba(209,195,165,0.44)", Math.max(1, line * 0.3));
      context.restore();
      return;
    }
    if (selectedFrame === "minimal") {
      strokeInset(0, "rgba(245,245,245,0.72)", Math.max(1, line * 0.42));
      return;
    }
    if (selectedFrame === "dotted") {
      context.save();
      context.strokeStyle = "#e6d5b8";
      context.lineWidth = Math.max(2, line * 0.9);
      context.setLineDash([shortEdge * 0.006, shortEdge * 0.016]);
      context.lineDashOffset = 0;
      context.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
      context.restore();
      return;
    }
    if (selectedFrame === "aurora") {
      const aurora = context.createLinearGradient(0, 0, width, height);
      aurora.addColorStop(0, "#66f0bd");
      aurora.addColorStop(0.48, "#83a7ff");
      aurora.addColorStop(1, "#dc79ef");
      context.save();
      context.shadowColor = "#83a7ff";
      context.shadowBlur = shortEdge * 0.025;
      strokeInset(0, aurora, line);
      strokeInset(inset * 0.72, "rgba(233,255,249,0.7)", Math.max(1, line * 0.35));
      context.restore();
      return;
    }
    if (selectedFrame === "ornate") {
      context.save();
      strokeInset(0, "#d6b779", line);
      strokeInset(inset * 0.8, "rgba(240,220,173,0.75)", Math.max(1, line * 0.4));
      const mark = Math.max(7, shortEdge * 0.024);
      context.fillStyle = "#d6b779";
      [inset + mark, width - inset - mark].forEach((x) => {
        [inset + mark, height - inset - mark].forEach((y) => {
          context.save();
          context.translate(x, y);
          context.rotate(Math.PI / 4);
          context.fillRect(-mark * 0.35, -mark * 0.35, mark * 0.7, mark * 0.7);
          context.restore();
        });
      });
      context.restore();
    }
  }

  async function saveImage() {
    if (!image || !sourceUrl) {
      announce("Importez une image avant de l'enregistrer.", true);
      return;
    }
    await exportImage(document.querySelector("#export-format").value, "enregistrée");
  }

  function getFontFamily(fontName) {
    const families = {
      Alegreya: '"Alegreya", Georgia, serif',
      Archivo: '"Archivo", "Segoe UI", sans-serif',
      Inter: '"Inter", "Segoe UI", sans-serif',
      Outfit: '"Outfit", "Segoe UI", sans-serif',
      "Plus Jakarta Sans": '"Plus Jakarta Sans", "Segoe UI", sans-serif',
      Sora: '"Sora", "Segoe UI", sans-serif',
      Urbanist: '"Urbanist", "Segoe UI", sans-serif',
      Kanit: '"Kanit", "Segoe UI", sans-serif',
      "League Spartan": '"League Spartan", "Segoe UI", sans-serif',
      Nunito: '"Nunito", "Segoe UI", sans-serif',
      Orbitron: '"Orbitron", "Segoe UI", sans-serif',
      Audiowide: '"Audiowide", "Segoe UI", sans-serif',
      Oxanium: '"Oxanium", "Segoe UI", sans-serif',
      Michroma: '"Michroma", "Segoe UI", sans-serif',
      "Share Tech Mono": '"Share Tech Mono", Consolas, monospace',
      Lora: '"Lora", Georgia, serif',
      "Crimson Text": '"Crimson Text", Georgia, serif',
      Quicksand: '"Quicksand", "Segoe UI", sans-serif',
      Roboto: '"Roboto", "Segoe UI", sans-serif',
      Montserrat: '"Montserrat", "Segoe UI", sans-serif',
      "Montserrat Alternates": '"Montserrat Alternates", "Segoe UI", sans-serif',
      Poppins: '"Poppins", "Segoe UI", sans-serif',
      "DM Sans": '"DM Sans", "Segoe UI", sans-serif',
      Lato: '"Lato", "Segoe UI", sans-serif',
      "Open Sans": '"Open Sans", "Segoe UI", sans-serif',
      Raleway: '"Raleway", "Segoe UI", sans-serif',
      "Space Grotesk": '"Space Grotesk", "Segoe UI", sans-serif',
      Manrope: '"Manrope", "Segoe UI", sans-serif',
      "Playfair Display": '"Playfair Display", Georgia, serif',
      "Cormorant Garamond": '"Cormorant Garamond", Georgia, serif',
      "DM Serif Display": '"DM Serif Display", Georgia, serif',
      "Libre Baskerville": '"Libre Baskerville", Georgia, serif',
      Cinzel: '"Cinzel", Georgia, serif',
      "Monsieur La Doulaise": '"Monsieur La Doulaise", cursive',
      UnifrakturMaguntia: '"UnifrakturMaguntia", Georgia, serif',
      "Grenze Gotisch": '"Grenze Gotisch", Georgia, serif',
      "Germania One": '"Germania One", Georgia, serif',
      "Pirata One": '"Pirata One", Georgia, serif',
      "Metal Mania": '"Metal Mania", Georgia, serif',
      "New Rocker": '"New Rocker", Georgia, serif',
      Merriweather: '"Merriweather", Georgia, serif',
      Oswald: '"Oswald", "Arial Narrow", sans-serif',
      "Bebas Neue": '"Bebas Neue", "Arial Narrow", sans-serif',
      "Roboto Mono": '"Roboto Mono", "SFMono-Regular", Consolas, monospace',
      "IBM Plex Mono": '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
      "Space Mono": '"Space Mono", "SFMono-Regular", Consolas, monospace',
      "Courier Prime": '"Courier Prime", "Courier New", monospace',
      "Fira Code": '"Fira Code", "SFMono-Regular", Consolas, monospace',
      "JetBrains Mono": '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
      "Ubuntu Mono": '"Ubuntu Mono", "SFMono-Regular", Consolas, monospace',
      "Source Sans 3": '"Source Sans 3", "Segoe UI", sans-serif',
      KingsCross: '"KingsCross", Georgia, serif',
      Crosses: '"Crosses", "Segoe UI", sans-serif',
      Angel: '"Angel", Georgia, serif',
      "Angel Variant": '"Angel Variant", Georgia, serif',
      Angela: '"Angela", cursive',
      Angelin: '"Angelin", cursive',
      AngelicWar: '"AngelicWar", Georgia, serif',
      Blackletter: '"Blackletter", Georgia, serif',
      Daustley: '"Daustley", cursive',
      GothicVille: '"GothicVille", Georgia, serif',
      "Jellyka Vampire Street": '"Jellyka Vampire Street", cursive',
      Magnific: '"Magnific", Georgia, serif',
      Metal: '"Metal", Georgia, serif',
      "XXII Scratch": '"XXII Scratch", sans-serif',
      "Bleeding Cowboys": '"Bleeding Cowboys", Georgia, serif',
      "Cakecafe": '"Cakecafe", cursive',
      "CAMPUS PERSONAL USE": '"CAMPUS PERSONAL USE", sans-serif',
      "Doctor Glitch": '"Doctor Glitch", sans-serif',
      "Hellbone-Demo": '"Hellbone-Demo", Georgia, serif',
      "Ithorn": '"Ithorn", Georgia, serif',
      "Old London": '"Old London", Georgia, serif',
      "Rasley Heights": '"Rasley Heights", cursive',
      "Ruritania": '"Ruritania", Georgia, serif',
      "Ruritania Outline": '"Ruritania Outline", Georgia, serif',
      "Seagram tfb": '"Seagram tfb", Georgia, serif',
      "Super Squad": '"Super Squad", sans-serif'
    };
    return families[fontName] || '"Inter", "Segoe UI", sans-serif';
  }

  function getFont(layer, size) {
    const fontFamily = getFontFamily(layer.font || "Inter");
    const weight = /Mono|Code|Display|Bebas|Oswald/.test(layer.font || "") ? 600 : 500;
    return `${weight} ${size}px ${fontFamily}`;
  }

  function getSelectedLayer() {
    return layers.find((layer) => layer.id === selectedLayerId) || null;
  }

  function selectLayerIds(ids, activeId = ids[ids.length - 1] || null) {
    selectedLayerIds.clear();
    ids.forEach((id) => {
      if (layers.some((layer) => layer.id === id)) selectedLayerIds.add(id);
    });
    selectedLayerId = selectedLayerIds.has(activeId) ? activeId : [...selectedLayerIds].pop() || null;
  }

  function updateLayersPanel() {
    const list = document.querySelector("#layer-list");
    list.replaceChildren();
    [...selectedLayerIds].forEach((id) => {
      if (!layers.some((layer) => layer.id === id)) selectedLayerIds.delete(id);
    });
    if (selectedLayerId && !selectedLayerIds.has(selectedLayerId)) selectLayerIds([selectedLayerId]);
    if (!selectedLayerId) selectedLayerIds.clear();
    const selected = getSelectedLayer();
    document.querySelector(".editor-shell").classList.toggle("has-collage", layers.some((layer) => Boolean(layer.collageTile)));
    document.querySelector("#layer-count").textContent = String(layers.length);
    document.querySelector("#layer-selection-summary").textContent = selectedLayerIds.size > 1
      ? `${selectedLayerIds.size} calques sélectionnés`
      : selected
        ? `${selected.type === "text" ? "Texte" : "Image"} sélectionné · Z ${layers.indexOf(selected) + 1}/${layers.length}`
      : "Aucun calque sélectionné";
    const canEditSelected = Boolean(selected && !selected.locked && selectedLayerIds.size === 1);
    ["#duplicate-layer", "#move-layer-back", "#move-layer-front", "#delete-layer"].forEach((selector) => {
      document.querySelector(selector).disabled = !canEditSelected;
    });
    document.querySelector("#group-layers").disabled = selectedLayerIds.size < 2 ||
      [...selectedLayerIds].some((id) => layers.find((layer) => layer.id === id)?.collageTile);
    document.querySelector("#ungroup-layers").disabled = ![...selectedLayerIds]
      .some((id) => layers.find((layer) => layer.id === id)?.groupId);
    if (!layers.length) {
      const empty = document.createElement("p");
      empty.className = "layer-empty";
      empty.textContent = "Aucun calque ajouté";
      list.append(empty);
      return;
    }

    const renderedGroups = new Set();
    [...layers].reverse().forEach((layer) => {
      const group = layer.groupId ? layerGroups.find((item) => item.id === layer.groupId) : null;
      if (layer.groupId) {
        if (group && !renderedGroups.has(group.id)) {
          renderedGroups.add(group.id);
          const groupRow = document.createElement("div");
          groupRow.className = "layer-group-row";
          const groupButton = document.createElement("button");
          groupButton.type = "button";
          groupButton.className = "layer-group-name";
          groupButton.dataset.layerGroupSelect = group.id;
          groupButton.textContent = `${group.name} · ${layers.filter((item) => item.groupId === group.id).length}`;
          groupButton.setAttribute("aria-pressed", String(layers.filter((item) => item.groupId === group.id).every((item) => selectedLayerIds.has(item.id))));
          const collapseButton = document.createElement("button");
          collapseButton.type = "button";
          collapseButton.className = "layer-utility layer-group-toggle";
          collapseButton.dataset.layerGroupToggle = group.id;
          collapseButton.setAttribute("aria-label", `${group.collapsed ? "Développer" : "Réduire"} ${group.name}`);
          collapseButton.setAttribute("aria-expanded", String(!group.collapsed));
          collapseButton.textContent = group.collapsed ? "＋" : "−";
          groupRow.append(groupButton, collapseButton);
          list.append(groupRow);
        }
        if (group?.collapsed) return;
      }
      const row = document.createElement("div");
      row.className = "layer-row";
      row.classList.toggle("is-hidden", layer.visible === false);
      row.classList.toggle("is-selected", selectedLayerIds.has(layer.id));
      const button = document.createElement("button");
      button.type = "button";
      button.className = "layer-item";
      button.dataset.layerId = layer.id;
      button.classList.toggle("active", selectedLayerIds.has(layer.id));
      button.classList.toggle("locked", Boolean(layer.locked));
      button.setAttribute("aria-pressed", String(selectedLayerIds.has(layer.id)));
      button.title = `${layer.type === "text" ? "Texte" : "Image"} · ${Math.round(layer.x * 100)}% / ${Math.round(layer.y * 100)}%`;
      let kind;
      if (layer.type === "image") {
        kind = document.createElement("img");
        kind.className = "layer-kind layer-thumbnail";
        kind.src = layer.image.currentSrc || layer.image.src;
        kind.alt = "";
        kind.setAttribute("aria-hidden", "true");
      } else {
        kind = document.createElement("span");
        kind.className = "layer-kind";
        kind.textContent = "T";
      }
      const name = document.createElement("span");
      name.className = "layer-name";
      name.textContent = layer.type === "text" ? layer.text || "Texte" : layer.name;
      const position = document.createElement("span");
      position.className = "layer-position";
      position.textContent = layer.type === "image" && layer.blur
        ? `Flou ${Math.round(layer.blur)}% · Z ${layers.indexOf(layer) + 1}`
        : `Z ${layers.indexOf(layer) + 1}`;
      button.append(kind, name, position);
      const visibility = document.createElement("button");
      visibility.type = "button";
      visibility.className = "layer-utility";
      visibility.dataset.layerVisibility = layer.id;
      visibility.setAttribute("aria-label", `${layer.visible === false ? "Afficher" : "Masquer"} ${name.textContent}`);
      visibility.title = visibility.getAttribute("aria-label");
      visibility.setAttribute("aria-pressed", String(layer.visible !== false));
      visibility.textContent = layer.visible === false ? "◌" : "◉";
      const lock = document.createElement("button");
      lock.type = "button";
      lock.className = "layer-utility";
      lock.dataset.layerLock = layer.id;
      lock.setAttribute("aria-label", `${layer.locked ? "Déverrouiller" : "Verrouiller"} ${name.textContent}`);
      lock.title = lock.getAttribute("aria-label");
      lock.setAttribute("aria-pressed", String(Boolean(layer.locked)));
      lock.textContent = layer.locked ? "▣" : "◇";
      row.append(button, visibility, lock);
      list.append(row);
    });
  }

  function syncLayerControls() {
    const layer = getSelectedLayer();
    const canEdit = Boolean(layer && !layer.locked && selectedLayerIds.size <= 1);
    const isText = canEdit && layer?.type === "text";
    const isImage = canEdit && layer?.type === "image" && !layer.collageTile;
    const textInput = document.querySelector("#overlay-text");
    const colorInput = document.querySelector("#text-color");
    const fontSelect = document.querySelector("#text-font");
    const sizeInput = document.querySelector("#text-size");
    const zIndexInput = document.querySelector("#layer-z-index");
    [textInput, fontSelect].forEach((control) => {
      control.disabled = !isText;
    });
    colorInput.disabled = !isText || Boolean(layer?.gradientEnabled);
    sizeInput.disabled = !canEdit;
    zIndexInput.disabled = !canEdit;
    zIndexInput.max = String(Math.max(1, layers.length));
    zIndexInput.value = String(layer ? layers.indexOf(layer) + 1 : 1);
    document.querySelector("#layer-opacity").disabled = !canEdit;
    document.querySelector("#layer-blur").disabled = !canEdit || layer?.type !== "image";
    document.querySelector("#layer-x").disabled = !canEdit;
    document.querySelector("#layer-y").disabled = !canEdit;
    document.querySelector("#layer-rotation").disabled = !canEdit;
    document.querySelector("#shadow-blur").disabled = !canEdit;
    document.querySelector("#shadow-color").disabled = !canEdit;
    document.querySelector("#text-stroke").disabled = !isText;
    document.querySelector("#text-stroke-color").disabled = !isText;
    document.querySelector("#text-underline").disabled = !isText;
    document.querySelector("#text-gradient-enabled").disabled = !isText;
    document.querySelectorAll(".text-gradient-colors input").forEach((input) => {
      input.disabled = !isText || !layer?.gradientEnabled;
    });
    document.querySelector("#logo-tint-enabled").disabled = !isImage;
    document.querySelector("#logo-tint-color").disabled = !isImage || !layer?.tintEnabled;
    document.querySelector("#logo-tint-enabled").checked = isImage && Boolean(layer.tintEnabled);
    document.querySelector("#logo-tint-color").value = isImage ? layer.tintColor || "#e8d7b4" : "#e8d7b4";
    document.querySelectorAll("[data-text-symbol]").forEach((button) => {
      button.disabled = !isText;
    });
    document.querySelector("#text-font-search").disabled = !isText;
    document.querySelectorAll(".font-filter").forEach((button) => {
      button.disabled = !isText;
    });
    document.querySelector("#font-favorite-toggle").disabled = !isText;
    document.querySelector("#layer-rotate-minus").disabled = !canEdit;
    document.querySelector("#layer-rotate-plus").disabled = !canEdit;
    document.querySelector("#center-layer-button").disabled = !canEdit;
    document.querySelector("#clear-drawing-button").disabled = !strokes.length;
    document.querySelector("#selected-layer-rotation").textContent = `${layer?.rotation || 0}°`;
    if (layer) {
      textInput.value = isText ? layer.text : "";
      colorInput.value = isText ? layer.color : "#f3e7c9";
      fontSelect.value = isText ? layer.font : "Inter";
      document.querySelector("#text-stroke").value = String(isText ? layer.strokeWidth || 0 : 0);
      document.querySelector("#text-stroke-color").value = isText ? layer.strokeColor || "#111111" : "#111111";
      document.querySelector("#text-underline").checked = isText && Boolean(layer.underline);
      document.querySelector("#text-gradient-enabled").checked = isText && Boolean(layer.gradientEnabled);
      document.querySelector("#text-gradient-start").value = isText ? layer.gradientStart || "#ff4d8d" : "#ff4d8d";
      document.querySelector("#text-gradient-middle").value = isText ? layer.gradientMiddle || "#a855f7" : "#a855f7";
      document.querySelector("#text-gradient-end").value = isText ? layer.gradientEnd || "#38bdf8" : "#38bdf8";
      sizeInput.min = isText ? "2" : "5";
      sizeInput.max = isText ? "24" : "150";
      sizeInput.value = String(isText ? layer.size : layer.scale * 100);
      document.querySelector("#text-size-label").textContent = isText ? "Taille du texte" : "Taille du logo";
      document.querySelector("#layer-opacity").value = String(Math.round(layer.opacity * 100));
      document.querySelector("#layer-blur").value = String(Math.round(layer.blur || 0));
      document.querySelector("#layer-x").value = String(Math.round(layer.x * 100));
      document.querySelector("#layer-y").value = String(Math.round(layer.y * 100));
      document.querySelector("#layer-rotation").value = String(layer.rotation || 0);
      document.querySelector("#shadow-blur").value = String(layer.shadowBlur || 0);
      document.querySelector("#shadow-color").value = layer.shadowColor || "#000000";
    } else {
      textInput.value = "";
      document.querySelector("#text-stroke").value = "0";
      document.querySelector("#text-stroke-color").value = "#111111";
      document.querySelector("#text-underline").checked = false;
      document.querySelector("#text-gradient-enabled").checked = false;
      document.querySelector("#text-gradient-start").value = "#ff4d8d";
      document.querySelector("#text-gradient-middle").value = "#a855f7";
      document.querySelector("#text-gradient-end").value = "#38bdf8";
      sizeInput.min = "2";
      sizeInput.max = "24";
      sizeInput.value = "6";
      document.querySelector("#layer-opacity").value = "100";
      document.querySelector("#layer-blur").value = "0";
      document.querySelector("#layer-x").value = "50";
      document.querySelector("#layer-y").value = "50";
      document.querySelector("#layer-rotation").value = "0";
      document.querySelector("#shadow-blur").value = "0";
      document.querySelector("#shadow-color").value = "#000000";
    }
    [sizeInput, document.querySelector("#text-stroke"), document.querySelector("#layer-opacity"), document.querySelector("#layer-blur"), document.querySelector("#layer-x"), document.querySelector("#layer-y"), document.querySelector("#layer-rotation"), document.querySelector("#shadow-blur")].forEach(updateOutput);
  }

  function rotatedBounds(centerX, centerY, width, height, degrees = 0) {
    const radians = (degrees * Math.PI) / 180;
    const rotatedWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
    const rotatedHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
    return { left: centerX - rotatedWidth / 2, top: centerY - rotatedHeight / 2, width: rotatedWidth, height: rotatedHeight };
  }

  function layerBounds(layer, width, height) {
    const centerX = layer.x * width;
    const centerY = layer.y * height;
    if (layer.type === "image") {
      if (layer.collageTile) {
        return rotatedBounds(centerX, centerY, layer.collageTile.width * width, layer.collageTile.height * height, layer.rotation);
      }
      const scale = (Math.min(width, height) * layer.scale) / Math.max(layer.image.naturalWidth, layer.image.naturalHeight);
      const layerWidth = layer.image.naturalWidth * scale;
      const layerHeight = layer.image.naturalHeight * scale;
      return rotatedBounds(centerX, centerY, layerWidth, layerHeight, layer.rotation);
    }
    const size = Math.max(12, Math.min(width, height) * layer.size / 100);
    context.save();
    context.font = getFont(layer, size);
    const textWidth = Math.min(width * 0.9, context.measureText(layer.text || " ").width);
    context.restore();
    const textHeight = size * 1.35;
    return rotatedBounds(centerX, centerY, textWidth, textHeight, layer.rotation);
  }

  function layerResizeHandles(layer, width, height) {
    const bounds = layerBounds(layer, width, height);
    return [
      { x: bounds.left - 4, y: bounds.top - 4 },
      { x: bounds.left + bounds.width + 4, y: bounds.top - 4 },
      { x: bounds.left - 4, y: bounds.top + bounds.height + 4 },
      { x: bounds.left + bounds.width + 4, y: bounds.top + bounds.height + 4 }
    ];
  }

  function pickResizeHandle(x, y) {
    const layer = getSelectedLayer();
    if (!layer || layer.locked || layer.visible === false) return null;
    const tolerance = Math.max(10, Math.min(canvas.width, canvas.height) / 100);
    return layerResizeHandles(layer, canvas.width, canvas.height)
      .find((handle) => Math.hypot(x - handle.x, y - handle.y) <= tolerance) || null;
  }

  function drawLayers(width, height, showSelection) {
    layers.forEach((layer) => {
      if (layer.visible === false) return;
      const bounds = layerBounds(layer, width, height);
      context.save();
      context.globalAlpha = layer.opacity;
      context.translate(layer.x * width, layer.y * height);
      context.rotate(((layer.rotation || 0) * Math.PI) / 180);
      context.shadowColor = layer.shadowColor || "#000000";
      context.shadowBlur = layer.shadowBlur || 0;
      if (layer.type === "image") {
        const blurRadius = Math.min(width, height) * (Number(layer.blur) || 0) / 1000;
        const bleed = blurRadius * 3;
        if (layer.collageTile) {
          const tile = layer.collageTile;
          const tileWidth = width * tile.width;
          const tileHeight = height * tile.height;
          context.save();
          context.beginPath();
          context.rect(-tileWidth / 2, -tileHeight / 2, tileWidth, tileHeight);
          context.clip();
          context.filter = blurRadius ? `blur(${blurRadius}px)` : "none";
          if (tile.fit === "contain") {
            const imageScale = Math.min(tileWidth / layer.image.naturalWidth, tileHeight / layer.image.naturalHeight);
            const imageWidth = layer.image.naturalWidth * imageScale;
            const imageHeight = layer.image.naturalHeight * imageScale;
            context.drawImage(
              layer.image,
              -imageWidth / 2 - bleed,
              -imageHeight / 2 - bleed,
              imageWidth + bleed * 2,
              imageHeight + bleed * 2
            );
          } else {
            const tileRatio = tileWidth / tileHeight;
            const imageRatio = layer.image.naturalWidth / layer.image.naturalHeight;
            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = layer.image.naturalWidth;
            let sourceHeight = layer.image.naturalHeight;
            if (imageRatio > tileRatio) {
              sourceWidth = layer.image.naturalHeight * tileRatio;
              sourceX = (layer.image.naturalWidth - sourceWidth) / 2;
            } else {
              sourceHeight = layer.image.naturalWidth / tileRatio;
              sourceY = (layer.image.naturalHeight - sourceHeight) / 2;
            }
            context.drawImage(
              layer.image,
              sourceX,
              sourceY,
              sourceWidth,
              sourceHeight,
              -tileWidth / 2 - bleed,
              -tileHeight / 2 - bleed,
              tileWidth + bleed * 2,
              tileHeight + bleed * 2
            );
          }
          context.filter = "none";
          if (layer.tintEnabled) {
            context.globalCompositeOperation = "source-atop";
            context.fillStyle = layer.tintColor || "#e8d7b4";
            context.fillRect(-tileWidth / 2, -tileHeight / 2, tileWidth, tileHeight);
          }
          context.restore();
          return;
        }
        const imageScale = (Math.min(width, height) * layer.scale) / Math.max(layer.image.naturalWidth, layer.image.naturalHeight);
        const imageWidth = layer.image.naturalWidth * imageScale;
        const imageHeight = layer.image.naturalHeight * imageScale;
        const logoImage = layer.tintEnabled
          ? getTintedLogo(layer.image, layer.tintColor || "#e8d7b4")
          : layer.image;
        context.filter = blurRadius ? `blur(${blurRadius}px)` : "none";
        context.drawImage(
          logoImage,
          -imageWidth / 2 - bleed,
          -imageHeight / 2 - bleed,
          imageWidth + bleed * 2,
          imageHeight + bleed * 2
        );
        context.filter = "none";
      } else {
        const size = Math.max(12, Math.min(width, height) * layer.size / 100);
        context.font = getFont(layer, size);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineJoin = "round";
        if (layer.strokeWidth > 0) {
          context.lineWidth = Math.max(1, size * layer.strokeWidth / 100);
          context.strokeStyle = layer.strokeColor || "#111111";
          context.strokeText(layer.text || " ", 0, 0, width * 0.9);
        }
        if (layer.gradientEnabled) {
          const metrics = context.measureText(layer.text || " ");
          const gradient = context.createLinearGradient(-metrics.width / 2, 0, metrics.width / 2, 0);
          gradient.addColorStop(0, layer.gradientStart || "#ff4d8d");
          gradient.addColorStop(0.5, layer.gradientMiddle || "#a855f7");
          gradient.addColorStop(1, layer.gradientEnd || "#38bdf8");
          context.fillStyle = gradient;
        } else {
          context.fillStyle = layer.color;
        }
        context.fillText(layer.text || " ", 0, 0, width * 0.9);
        if (layer.underline) {
          const metrics = context.measureText(layer.text || " ");
          const underlineWidth = Math.min(width * 0.9, metrics.width);
          const underlineY = Math.max(size * 0.5, metrics.actualBoundingBoxDescent + size * 0.08);
          context.strokeStyle = layer.color;
          context.lineWidth = Math.max(1, size * 0.045);
          context.lineCap = "round";
          context.beginPath();
          context.moveTo(-underlineWidth / 2, underlineY);
          context.lineTo(underlineWidth / 2, underlineY);
          context.stroke();
        }
      }
      context.restore();
      if (showSelection && layer.id === selectedLayerId) {
        context.save();
        context.strokeStyle = "#e7c98e";
        context.lineWidth = Math.max(1, Math.min(width, height) / 500);
        context.setLineDash([Math.min(width, height) / 100, Math.min(width, height) / 160]);
        context.strokeRect(bounds.left - 4, bounds.top - 4, bounds.width + 8, bounds.height + 8);
        context.setLineDash([]);
        context.fillStyle = "#e7c98e";
        if (!layer.locked) {
          const handle = Math.max(5, Math.min(width, height) / 90);
          layerResizeHandles(layer, width, height).forEach(({ x, y }) => {
            context.fillRect(x - handle / 2, y - handle / 2, handle, handle);
          });
        }
        context.restore();
      }
    });
  }

  function getTintedLogo(image, color) {
    let colorCache = tintedLogoCache.get(image);
    if (!colorCache) {
      colorCache = new Map();
      tintedLogoCache.set(image, colorCache);
    }
    if (colorCache.has(color)) return colorCache.get(color);

    const tinted = document.createElement("canvas");
    tinted.width = image.naturalWidth;
    tinted.height = image.naturalHeight;
    const tintedContext = tinted.getContext("2d");
    tintedContext.drawImage(image, 0, 0);
    tintedContext.globalCompositeOperation = "source-in";
    tintedContext.fillStyle = color;
    tintedContext.fillRect(0, 0, tinted.width, tinted.height);
    colorCache.set(color, tinted);
    return tinted;
  }

  function drawOverlay(width, height) {
    const glow = Number(document.querySelector("#glow").value) / 100;
    if (glow > 0) {
      const radius = Math.hypot(width, height) * 0.62;
      const gradient = context.createRadialGradient(width * 0.5, height * 0.34, 0, width * 0.5, height * 0.34, radius);
      gradient.addColorStop(0, `rgba(255, 226, 177, ${glow * 0.24})`);
      gradient.addColorStop(1, "rgba(255, 226, 177, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    }
    const vignette = Number(document.querySelector("#vignette").value) / 100;
    if (vignette > 0) {
      const radius = Math.hypot(width, height) * 0.66;
      const gradient = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, radius);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, `rgba(0, 0, 0, ${vignette * 0.82})`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    }
  }

  function drawBackdrop(target, width, height) {
    const colors = backdropPresets[selectedBackground];
    if (!colors || !colors.length) return;
    const gradient = target.createLinearGradient(0, 0, width * 0.85, height);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.56, colors[1]);
    gradient.addColorStop(1, colors[2]);
    target.fillStyle = gradient;
    target.fillRect(0, 0, width, height);
    const light = target.createRadialGradient(width * 0.18, height * 0.12, 0, width * 0.18, height * 0.12, Math.max(width, height) * 0.9);
    light.addColorStop(0, "rgba(255,255,255,0.08)");
    light.addColorStop(1, "rgba(255,255,255,0)");
    target.fillStyle = light;
    target.fillRect(0, 0, width, height);
    if (selectedBackground === "aurora") {
      target.save();
      target.globalCompositeOperation = "screen";
      [
        [0.15, 0.25, "#48edb0"],
        [0.72, 0.38, "#766aff"],
        [0.45, 0.8, "#e85fcb"]
      ].forEach(([x, y, color]) => {
        const bloom = target.createRadialGradient(width * x, height * y, 0, width * x, height * y, Math.max(width, height) * 0.55);
        bloom.addColorStop(0, `${color}55`);
        bloom.addColorStop(1, `${color}00`);
        target.fillStyle = bloom;
        target.fillRect(0, 0, width, height);
      });
      target.restore();
    } else if (selectedBackground === "sunset") {
      target.save();
      const sun = target.createRadialGradient(width * 0.72, height * 0.34, 0, width * 0.72, height * 0.34, Math.min(width, height) * 0.38);
      sun.addColorStop(0, "rgba(255,220,156,0.82)");
      sun.addColorStop(0.22, "rgba(255,152,116,0.34)");
      sun.addColorStop(1, "rgba(255,115,130,0)");
      target.fillStyle = sun;
      target.fillRect(0, 0, width, height);
      target.restore();
    } else if (selectedBackground === "ice") {
      target.save();
      target.globalAlpha = 0.22;
      target.strokeStyle = "#d9f7ff";
      target.lineWidth = Math.max(2, Math.min(width, height) * 0.003);
      for (let index = 0; index < 9; index += 1) {
        target.beginPath();
        target.moveTo(width * (index / 8), 0);
        target.lineTo(width * Math.max(0, Math.min(1, index / 8 + 0.18)), height);
        target.stroke();
      }
      target.restore();
    } else if (selectedBackground === "candy") {
      target.save();
      target.globalAlpha = 0.12;
      target.fillStyle = "#ffffff";
      const spacing = Math.max(24, Math.min(width, height) * 0.06);
      for (let y = spacing; y < height; y += spacing) {
        for (let x = spacing; x < width; x += spacing) {
          target.beginPath();
          target.arc(x, y, Math.max(2, spacing * 0.035), 0, Math.PI * 2);
          target.fill();
        }
      }
      target.restore();
    } else if (selectedBackground === "grid") {
      target.save();
      target.strokeStyle = "rgba(103, 165, 255, 0.2)";
      target.lineWidth = 1;
      target.beginPath();
      for (let x = 0; x <= width; x += 40) {
        target.moveTo(x, 0);
        target.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += 40) {
        target.moveTo(0, y);
        target.lineTo(width, y);
      }
      target.stroke();
      const glow = target.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.68);
      glow.addColorStop(0, "rgba(55, 118, 219, 0.18)");
      glow.addColorStop(1, "rgba(55, 118, 219, 0)");
      target.fillStyle = glow;
      target.fillRect(0, 0, width, height);
      target.restore();
    }
  }

  function drawStrokes(target, width, height) {
    target.clearRect(0, 0, width, height);
    strokes.forEach((stroke) => {
      if (!stroke.points.length) return;
      target.save();
      target.globalCompositeOperation = stroke.mode === "mask" ? "destination-out" : "source-over";
      target.strokeStyle = stroke.mode === "mask" ? "#000000" : stroke.color;
      target.lineWidth = Math.max(1, Math.min(width, height) * stroke.size / 100);
      target.lineCap = "round";
      target.lineJoin = "round";
      target.beginPath();
      if (stroke.points.length === 1) {
        target.arc(stroke.points[0].x * width, stroke.points[0].y * height, target.lineWidth / 2, 0, Math.PI * 2);
        target.fillStyle = stroke.mode === "mask" ? "#000000" : stroke.color;
        target.fill();
        target.restore();
        return;
      }
      stroke.points.forEach((point, index) => {
        const x = point.x * width;
        const y = point.y * height;
        if (index === 0) target.moveTo(x, y);
        else target.lineTo(x, y);
      });
      target.stroke();
      target.restore();
    });
  }

  function drawCropSelection(width, height) {
    if (!cropSelection) return;
    const left = Math.min(cropSelection.start.x, cropSelection.end.x);
    const top = Math.min(cropSelection.start.y, cropSelection.end.y);
    const selectionWidth = Math.abs(cropSelection.end.x - cropSelection.start.x);
    const selectionHeight = Math.abs(cropSelection.end.y - cropSelection.start.y);
    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.58)";
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = "destination-out";
    context.fillRect(left, top, selectionWidth, selectionHeight);
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = "#e6c98f";
    context.lineWidth = Math.max(2, Math.min(width, height) / 350);
    context.setLineDash([Math.max(5, width / 90), Math.max(3, width / 150)]);
    context.strokeRect(left, top, selectionWidth, selectionHeight);
    context.restore();
  }

  function drawAlignmentGuides(width, height) {
    if (alignmentGuides.x === null && alignmentGuides.y === null) return;
    context.save();
    context.strokeStyle = "rgba(225, 190, 115, 0.9)";
    context.lineWidth = Math.max(1, Math.min(width, height) / 700);
    context.setLineDash([Math.max(5, width / 100), Math.max(3, width / 180)]);
    if (alignmentGuides.x !== null) {
      context.beginPath();
      context.moveTo(width * alignmentGuides.x, 0);
      context.lineTo(width * alignmentGuides.x, height);
      context.stroke();
    }
    if (alignmentGuides.y !== null) {
      context.beginPath();
      context.moveTo(0, height * alignmentGuides.y);
      context.lineTo(width, height * alignmentGuides.y);
      context.stroke();
    }
    context.restore();
  }

  function render(showSelection = true) {
    if (!image) return;
    const rotation = (quarterTurns * 90 + rotationDegrees) * Math.PI / 180;
    const rotatedWidth = Math.abs(image.naturalWidth * Math.cos(rotation)) + Math.abs(image.naturalHeight * Math.sin(rotation));
    const rotatedHeight = Math.abs(image.naturalWidth * Math.sin(rotation)) + Math.abs(image.naturalHeight * Math.cos(rotation));
    const crop = cropDimensions(rotatedWidth, rotatedHeight);
    const scale = Math.min(1, maxCanvasEdge / Math.max(crop.width, crop.height));
    const outputWidth = Math.max(1, Math.round(crop.width * scale));
    const outputHeight = Math.max(1, Math.round(crop.height * scale));
    const adjustments = readAdjustments();

    canvas.width = outputWidth;
    canvas.height = outputHeight;
    baseCanvas.width = outputWidth;
    baseCanvas.height = outputHeight;
    drawingCanvas.width = outputWidth;
    drawingCanvas.height = outputHeight;
    baseContext.clearRect(0, 0, outputWidth, outputHeight);
    drawingContext.clearRect(0, 0, outputWidth, outputHeight);
    context.clearRect(0, 0, outputWidth, outputHeight);
    baseContext.save();
    baseContext.translate(outputWidth / 2, outputHeight / 2);
    baseContext.rotate(rotation);
    const cropOffsetX = crop.x + crop.width / 2 - rotatedWidth / 2;
    const cropOffsetY = crop.y + crop.height / 2 - rotatedHeight / 2;
    const sourceOffsetX = -cropOffsetX * Math.cos(rotation) - cropOffsetY * Math.sin(rotation);
    const sourceOffsetY = cropOffsetX * Math.sin(rotation) - cropOffsetY * Math.cos(rotation);
    baseContext.translate(sourceOffsetX, sourceOffsetY);
    baseContext.scale(flipped ? -scale : scale, scale);
    baseContext.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) blur(${adjustments.softness}px)`;
    baseContext.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    baseContext.restore();
    baseContext.filter = "none";

    if (isBlankCanvas) {
      baseContext.globalCompositeOperation = "source-atop";
      baseContext.fillStyle = paperColor;
      baseContext.fillRect(0, 0, outputWidth, outputHeight);
      baseContext.globalCompositeOperation = "source-over";
    }
    if (adjustments.warmth !== 0) {
      baseContext.fillStyle = adjustments.warmth > 0
        ? `rgba(255, 170, 65, ${Math.abs(adjustments.warmth) / 500})`
        : `rgba(82, 145, 255, ${Math.abs(adjustments.warmth) / 650})`;
      baseContext.fillRect(0, 0, outputWidth, outputHeight);
    }
    if (backgroundMask && backgroundMask.width === outputWidth && backgroundMask.height === outputHeight) {
      baseContext.save();
      baseContext.globalCompositeOperation = "destination-in";
      baseContext.drawImage(backgroundMask, 0, 0);
      baseContext.restore();
    }
    drawBackdrop(context, outputWidth, outputHeight);
    if (!(isBlankCanvas && selectedBackground !== "none")) {
      context.drawImage(baseCanvas, 0, 0);
    }
    drawStrokes(drawingContext, outputWidth, outputHeight);
    context.drawImage(drawingCanvas, 0, 0);
    drawOverlay(outputWidth, outputHeight);
    drawLayers(outputWidth, outputHeight, showSelection);
    drawFrame(outputWidth, outputHeight);
    if (showSelection && draggingLayer) drawAlignmentGuides(outputWidth, outputHeight);
    if (showSelection && activeTool === "crop") drawCropSelection(outputWidth, outputHeight);
    if (!restoringProject && !templatePreviewMode) scheduleAutosave();
  }

  function createTextLayer(text = "NOUVEAU TEXTE") {
    saveHistory();
    const layer = {
      id: `text-${++layerSequence}`,
      type: "text",
      name: "Texte",
      visible: true,
      locked: false,
      text,
      color: "#f3e7c9",
      gradientEnabled: false,
      gradientStart: "#ff4d8d",
      gradientMiddle: "#a855f7",
      gradientEnd: "#38bdf8",
      font: "Inter",
      size: 6,
      strokeWidth: 0,
      strokeColor: "#111111",
      underline: false,
      opacity: 1,
      rotation: 0,
      shadowBlur: 0,
      shadowColor: "#000000",
      x: 0.5,
      y: 0.5
    };
    layers.push(layer);
    selectedLayerId = layer.id;
    updateLayersPanel();
    syncLayerControls();
    render();
    document.querySelector("#overlay-text").focus();
    announce("Calque texte créé. Glissez-le sur l'image pour le déplacer.");
  }

  async function loadLogo(file) {
    if (!file) return;
    const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) && !isSvg) {
      announce("Logo non pris en charge. Choisissez un fichier PNG, JPG, WebP ou SVG.", true);
      return;
    }
    if (file.size > maxImageBytes) {
      announce("Ce logo dépasse la limite de 50 Mo.", true);
      return;
    }
    let logoBlob = file;
    if (isSvg) {
      try {
        logoBlob = await sanitizeSvgLogo(file);
      } catch (error) {
        announce(`SVG refusé : ${error.message}`, true);
        return;
      }
    }
    const url = URL.createObjectURL(logoBlob);
    const logo = new Image();
    logo.onload = () => {
      addLogoLayer(logo, file.name, url);
    };
    logo.onerror = () => {
      URL.revokeObjectURL(url);
      announce("Impossible de lire ce logo. Essayez un autre fichier.", true);
    };
    logo.src = url;
  }

  async function sanitizeSvgLogo(file) {
    const parsed = new DOMParser().parseFromString(await file.text(), "image/svg+xml");
    if (parsed.querySelector("parsererror") || parsed.documentElement.localName !== "svg") {
      throw new Error("fichier SVG mal formé.");
    }
    parsed.querySelectorAll("script, foreignObject, iframe, object, embed, image, audio, video").forEach((element) => {
      element.remove();
    });
    parsed.querySelectorAll("style").forEach((element) => {
      if (/@import|expression\s*\(|javascript:|data:|https?:|url\(\s*['"]?(?!#)/i.test(element.textContent)) {
        element.remove();
      }
    });
    [...parsed.querySelectorAll("*"), parsed.documentElement].forEach((element) => {
      [...element.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();
        const hasExternalReference = /url\(\s*['"]?(?!#)[^)]+\)/i.test(value);
        if (name.startsWith("on") || name === "src" ||
            name === "style" && /expression\s*\(|javascript:|data:|https?:|url\(\s*['"]?(?!#)/i.test(value) ||
            (name === "href" || name.endsWith(":href")) && !value.startsWith("#") ||
            /javascript:|data:|https?:|file:/i.test(value) || hasExternalReference) {
          element.removeAttribute(attribute.name);
        }
      });
    });
    return new Blob([new XMLSerializer().serializeToString(parsed.documentElement)], { type: "image/svg+xml" });
  }

  function addLogoLayer(logo, name, url, tintEnabled = false, tintColor = "#e8d7b4") {
    if (url.startsWith("blob:")) logoUrls.add(url);
    saveHistory();
    const layer = {
      id: `logo-${++layerSequence}`,
      type: "image",
      name,
      visible: true,
      locked: false,
      image: logo,
      url,
      scale: 0.24,
      tintEnabled,
      tintColor,
      opacity: 1,
      rotation: 0,
      shadowBlur: 0,
      shadowColor: "#000000",
      x: 0.5,
      y: 0.5
    };
    layers.push(layer);
    selectedLayerId = layer.id;
    updateLayersPanel();
    syncLayerControls();
    render();
    announce(`Logo « ${name} » ajouté. Glissez-le sur l'image pour le positionner.`);
  }

  async function createPhotoCollage(files) {
    if (files.length < 2 || files.length > 6) {
      announce("Choisissez entre 2 et 6 photos pour créer un collage.", true);
      return;
    }
    const collageLayout = document.querySelector("#collage-layout").value;
    const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (files.some((file) => !supportedTypes.includes(file.type) || file.size > maxImageBytes)) {
      announce("Chaque photo doit être au format JPG, PNG ou WebP et faire moins de 50 Mo.", true);
      return;
    }

    const photoUrls = [];
    try {
      const photos = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        photoUrls.push(url);
        const photo = new Image();
        photo.onload = () => resolve({ image: photo, name: file.name, url });
        photo.onerror = () => reject(new Error(`La photo « ${file.name} » n’a pas pu être chargée.`));
        photo.src = url;
      })));
      createBlankCanvas("blank", () => {
        saveHistory();
        const count = photos.length;
        if (count === 2 && collageLayout === "blur") {
          const [backgroundPhoto, foregroundPhoto] = photos;
          [
            {
              photo: backgroundPhoto,
              name: `${backgroundPhoto.name} · fond`,
              blur: 54,
              collageTile: { x: 0, y: 0, width: 1, height: 1 }
            },
            {
              photo: foregroundPhoto,
              name: `${foregroundPhoto.name} · net`,
              blur: 0,
              collageTile: { x: 0.12, y: 0.07, width: 0.76, height: 0.86, fit: "contain" }
            }
          ].forEach(({ photo, name, blur, collageTile }) => {
            layers.push({
              id: `logo-${++layerSequence}`,
              type: "image",
              name,
              visible: true,
              locked: false,
              image: photo.image,
              url: photo.url,
              collageTile,
              blur,
              scale: 0.24,
              tintEnabled: false,
              tintColor: "#e8d7b4",
              opacity: 1,
              rotation: 0,
              shadowBlur: 0,
              shadowColor: "#000000",
              x: 0.5,
              y: 0.5
            });
            logoUrls.add(photo.url);
          });
          selectedLayerId = layers[layers.length - count].id;
          updateLayersPanel();
          syncLayerControls();
          render();
          announce("Collage créé : fond flou et photo nette au premier plan. Réglez le flou sur le calque « fond ».");
          return;
        }
        const rowCounts = count === 2 ? [2] : count === 3 ? [3] : count === 4 ? [2, 2] : count === 5 ? [3, 2] : [3, 3];
        const rows = rowCounts.length;
        const gap = 0.008;
        let photoIndex = 0;
        rowCounts.forEach((columns, row) => {
          const tileWidth = 1 / columns - gap;
          const tileHeight = 1 / rows - gap;
          for (let column = 0; column < columns; column += 1) {
            const photo = photos[photoIndex];
            const layer = {
              id: `logo-${++layerSequence}`,
              type: "image",
              name: photo.name,
              visible: true,
              locked: false,
              image: photo.image,
              url: photo.url,
              collageTile: {
                x: column / columns + gap / 2,
                y: row / rows + gap / 2,
                width: tileWidth,
                height: tileHeight
              },
              scale: 0.24,
              blur: 0,
              tintEnabled: false,
              tintColor: "#e8d7b4",
              opacity: 1,
              rotation: 0,
              shadowBlur: 0,
              shadowColor: "#000000",
              x: column / columns + gap / 2 + tileWidth / 2,
              y: row / rows + gap / 2 + tileHeight / 2
            };
            layers.push(layer);
            logoUrls.add(photo.url);
            photoIndex += 1;
          }
        });
        selectedLayerId = layers[layers.length - photos.length].id;
        updateLayersPanel();
        syncLayerControls();
        render();
        announce(`Collage paysage large créé avec ${count} photos. Chaque photo reste un calque indépendant.${collageLayout === "blur" ? " Le style fond flou est réservé à deux photos." : ""}`);
      }, () => photoUrls.forEach((url) => URL.revokeObjectURL(url)), false, "1.7778");
    } catch (error) {
      photoUrls.forEach((url) => URL.revokeObjectURL(url));
      announce(`Impossible de créer le collage : ${error.message}`, true);
    }
  }

  function addBuiltInLogo(type, layerOptions = null, previewMode = false, statusMessage = null) {
    const template = logoTemplates[type];
    if (!image || !template) return;
    const color = document.querySelector("#logo-color").value;
    const logo = new Image();
    logo.onload = () => {
      try {
        const sourceCanvas = document.createElement("canvas");
        sourceCanvas.width = logo.naturalWidth;
        sourceCanvas.height = logo.naturalHeight;
        sourceCanvas.getContext("2d").drawImage(logo, 0, 0);
        addLogoLayer(logo, template.name, sourceCanvas.toDataURL("image/png"), true, layerOptions?.tintColor || color);
        const layer = getSelectedLayer();
        if (layer && layerOptions) Object.assign(layer, layerOptions);
        if (previewMode) selectedLayerId = null;
        updateLayersPanel();
        syncLayerControls();
        render(!previewMode);
        if (statusMessage) announce(statusMessage);
      } catch (error) {
        announce(`Impossible de préparer le logo « ${template.name} » : ${error.message}`, true);
      }
    };
    logo.onerror = () => {
      announce(`Le logo PNG « ${template.name} » n'a pas pu être chargé.`, true);
    };
    logo.src = new URL(template.src, document.baseURI).href;
  }

  function pointOnCanvas(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height
    };
  }

  function pickLayer(x, y) {
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      const layer = layers[index];
      if (layer.visible === false) continue;
      const bounds = layerBounds(layer, canvas.width, canvas.height);
      const padding = Math.max(8, Math.min(canvas.width, canvas.height) * 0.008);
      if (x >= bounds.left - padding && x <= bounds.left + bounds.width + padding &&
          y >= bounds.top - padding && y <= bounds.top + bounds.height + padding) {
        return layer;
      }
    }
    return null;
  }

  function updateLayerProperty(property, value) {
    const layer = getSelectedLayer();
    if (!layer) return;
    layer[property] = value;
    if (property === "rotation") {
      document.querySelector("#selected-layer-rotation").textContent = `${layer.rotation}°`;
    }
    updateLayersPanel();
    render();
  }

  function rotateSelectedLayer(degrees) {
    const layer = getSelectedLayer();
    if (!layer) return;
    saveHistory();
    layer.rotation = ((layer.rotation + degrees + 180) % 360 + 360) % 360 - 180;
    syncLayerControls();
    render();
  }

  function makeBackgroundMask(x, y, keepSample = false) {
    const processingCanvas = document.createElement("canvas");
    const scale = Math.min(1, 2000 / Math.max(baseCanvas.width, baseCanvas.height));
    processingCanvas.width = Math.max(1, Math.round(baseCanvas.width * scale));
    processingCanvas.height = Math.max(1, Math.round(baseCanvas.height * scale));
    const processingContext = processingCanvas.getContext("2d", { willReadFrequently: true });
    processingContext.drawImage(baseCanvas, 0, 0, processingCanvas.width, processingCanvas.height);
    const pixels = processingContext.getImageData(0, 0, processingCanvas.width, processingCanvas.height);
    const sampleX = Math.max(0, Math.min(processingCanvas.width - 1, Math.floor(x * scale)));
    const sampleY = Math.max(0, Math.min(processingCanvas.height - 1, Math.floor(y * scale)));
    const sampleIndex = (sampleY * processingCanvas.width + sampleX) * 4;
    if (!keepSample || !backgroundColor) {
      backgroundColor = [pixels.data[sampleIndex], pixels.data[sampleIndex + 1], pixels.data[sampleIndex + 2]];
    }
    const tolerance = Number(document.querySelector("#background-tolerance").value);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const red = pixels.data[index] - backgroundColor[0];
      const green = pixels.data[index + 1] - backgroundColor[1];
      const blue = pixels.data[index + 2] - backgroundColor[2];
      const distance = Math.sqrt(red * red + green * green + blue * blue);
      const feather = Math.max(1, Number(document.querySelector("#background-feather").value));
      const keep = Math.max(0, Math.min(1, (distance - tolerance) / feather));
      pixels.data[index + 3] = Math.round(pixels.data[index + 3] * keep);
    }
    processingContext.putImageData(pixels, 0, 0);
    backgroundMask = document.createElement("canvas");
    backgroundMask.width = baseCanvas.width;
    backgroundMask.height = baseCanvas.height;
    backgroundMask.getContext("2d").drawImage(processingCanvas, 0, 0, backgroundMask.width, backgroundMask.height);
  }

  function clearBackgroundMask() {
    backgroundMask = null;
    backgroundColor = null;
    backgroundSamplePoint = null;
    pickingBackground = false;
    dropZone.classList.remove("sampling-background");
    updateImageControls();
    render();
  }

  function resetEdits() {
    quarterTurns = 0;
    rotationDegrees = 0;
    flipped = false;
    layers.length = 0;
    layerGroups.length = 0;
    selectedLayerIds.clear();
    selectedLayerId = null;
    backgroundMask = null;
    backgroundColor = null;
    backgroundSamplePoint = null;
    pickingBackground = false;
    cropRect = null;
    cropSelection = null;
    currentStroke = null;
    strokes.length = 0;
    activeTool = "select";
    selectedBackground = "none";
    selectedFrame = "none";
    activePreset = "original";
    setAdjustments(defaults);
    document.querySelector("#aspect-ratio").value = "original";
    document.querySelector("#image-rotation").value = "0";
    document.querySelector("#vignette").value = "0";
    document.querySelector("#glow").value = "0";
    document.querySelector("#background-tolerance").value = "45";
    document.querySelector("#background-feather").value = "42";
    paperColor = defaultPaperColor;
    document.querySelector("#paper-color").value = paperColor;
    document.querySelector("#canvas-zoom").value = "100";
    zoom = 100;
    document.querySelector("#canvas-zoom-output").textContent = "100%";
    canvas.style.transform = "";
    showDesignPreview = false;
    updateOutput(document.querySelector("#vignette"));
    updateOutput(document.querySelector("#glow"));
    updateOutput(document.querySelector("#background-tolerance"));
    updateOutput(document.querySelector("#background-feather"));
    updateOutput(document.querySelector("#image-rotation"));
    updateSelectionStates();
    updateLayersPanel();
    syncLayerControls();
    updateImageControls();
    updateBackdropSelection();
    render();
  }

  async function loadImage(file, afterLoad = null, blankCanvas = false, onCancel = null) {
    if (!file) return;
    const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!supportedTypes.includes(file.type)) {
      announce("Format non pris en charge. Choisissez une image JPG, PNG ou WebP.", true);
      return;
    }
    if (file.size > maxImageBytes) {
      announce("Cette image dépasse la limite de 50 Mo.", true);
      return;
    }
    if (image && !(await confirmImageReplacement())) {
      onCancel?.();
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      sourceUrl = nextUrl;
      image = nextImage;
      sessionStorage.removeItem("luma-project-closed");
      originalName = file.name;
      isBlankCanvas = blankCanvas;
      history.length = 0;
      redoHistory.length = 0;
      updateHistoryControls();
      resetEdits();
      announce("Image chargée. Votre espace est prêt.");
      if (afterLoad) afterLoad();
    };
    nextImage.onerror = () => {
      URL.revokeObjectURL(nextUrl);
      announce("Impossible de lire cette image. Essayez un autre fichier.", true);
    };
    nextImage.src = nextUrl;
  }

  function createBlankCanvas(template = "blank", onReady = null, onCancel = null, previewMode = false, ratioOverride = null) {
    const ratioValue = ratioOverride || templateRatios[template] || document.querySelector("#aspect-ratio").value;
    const dimensionsByRatio = {
      "1": [1200, 1200],
      "0.8": [1200, 1500],
      "1.7778": [1600, 900],
      "0.5625": [900, 1600],
      "0.6667": [1000, 1500],
      "2.63": [1600, 608],
      "1.91": [1200, 628],
      "3": [1800, 600],
      "4": [2000, 500],
      "1.3333": [1200, 900],
      "1.5": [1500, 1000],
      "0.75": [900, 1200],
      "1.25": [1250, 1000],
      "0.707": [1000, 1414],
      "1.414": [1414, 1000],
      "2": [1600, 800]
    };
    const [width, height] = dimensionsByRatio[ratioValue] || [1200, 1500];
    const blankCanvas = document.createElement("canvas");
    blankCanvas.width = width;
    blankCanvas.height = height;
    const blankContext = blankCanvas.getContext("2d");
    blankContext.fillStyle = "#ffffff";
    blankContext.fillRect(0, 0, width, height);
    blankCanvas.toBlob((blob) => {
      if (!blob) {
        announce("Impossible de créer la feuille blanche.", true);
        return;
      }
      const file = new File([blob], `luma-${template}.png`, { type: "image/png" });
      loadImage(file, () => {
        selectedFrame = templateFrames[template] || "none";
        selectedBackground = templateBackgrounds[template] || "none";
        document.querySelector("#aspect-ratio").value = ratioValue;
        paperColor = templatePaperColors[template] || defaultPaperColor;
        document.querySelector("#paper-color").value = paperColor;
        updateSelectionStates();
        updateBackdropSelection();
        if (onReady) {
          onReady();
          return;
        }
        if (template === "blank") return;
        const layersForTemplate = layoutTemplates[template] || [];
        layersForTemplate.forEach((settings) => {
          createTextLayer(settings.text);
          const layer = getSelectedLayer();
          Object.assign(layer, settings);
          syncLayerControls();
          updateLayersPanel();
          render();
        });
        if (previewMode) {
          selectedLayerId = null;
          syncLayerControls();
          updateLayersPanel();
          render(false);
        }
        const logo = templateLogos[template];
        if (logo) {
          addBuiltInLogo(logo.type, logo.options, previewMode, `Modèle ${template} prêt à personnaliser.`);
        } else {
          announce(`Modèle ${template} prêt à personnaliser.`);
        }
      }, true, onCancel);
    }, "image/png");
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Impossible de lire la sauvegarde locale."));
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const [header, data] = dataUrl.split(",");
    const mime = header.match(/data:(.*?);base64/)?.[1];
    if (!mime || !data) throw new Error("La sauvegarde locale contient une image invalide.");
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }

  function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(dataUrlToBlob(dataUrl));
      const loadedImage = new Image();
      loadedImage.onload = () => resolve({ image: loadedImage, url });
      loadedImage.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Une image de la sauvegarde locale n’a pas pu être chargée."));
      };
      loadedImage.src = url;
    });
  }

  async function saveProjectFile() {
    try {
      const project = await createProjectData();
      const fileBlob = new Blob([JSON.stringify(project)], { type: "application/json" });
      const fileUrl = URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `${(project.projectName.trim() || "luma-projet").replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/\s+/g, "-")}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
      announce("Modifications enregistrées en JSON.");
    } catch (error) {
      announce(`Échec de l’enregistrement : ${error.message}`, true);
    }
  }

  async function openProjectFile(file) {
    if (!file) return;
    if (file.size > 150 * 1024 * 1024) {
      announce("Le projet dépasse la limite de 150 Mo.", true);
      return;
    }
    try {
      const project = JSON.parse(await file.text());
      if (!project || project.version !== 1 || typeof project.source !== "string" || !Array.isArray(project.layers)) {
        throw new Error("Ce fichier n’est pas un projet Luma valide.");
      }
      const sourceBlob = dataUrlToBlob(project.source);
      if (!["image/jpeg", "image/png", "image/webp"].includes(sourceBlob.type)) {
        throw new Error("Le format d’image du projet n’est pas pris en charge.");
      }
      if (sourceBlob.size > maxImageBytes) throw new Error("L’image source dépasse la limite de 50 Mo.");
      await restoreProject(project);
      announce("Projet ouvert. Tous les calques sont modifiables.");
    } catch (error) {
      announce(`Fichier projet invalide : ${error.message}`, true);
    }
  }

  async function restoreProject(project) {
    const loadedAssets = [];
    let loadedMask = null;
    try {
      const loadedSource = await loadImageFromDataUrl(project.source);
      loadedAssets.push(loadedSource.url);
      const restoredLayers = [];
      for (const savedLayer of project.layers) {
        if (!savedLayer || !["text", "image"].includes(savedLayer.type) ||
            typeof savedLayer.id !== "string" || !savedLayer.id) {
          throw new Error("Le projet contient un calque non pris en charge.");
        }
        const layer = { ...savedLayer };
        layer.visible = layer.visible !== false;
        layer.locked = Boolean(layer.locked);
        if (layer.type === "image") {
          if (typeof layer.asset !== "string") throw new Error(`Le logo « ${layer.name || "sans nom"} » est manquant.`);
          const asset = await loadImageFromDataUrl(layer.asset);
          loadedAssets.push(asset.url);
          layer.image = asset.image;
          layer.url = asset.url;
          delete layer.asset;
        }
        restoredLayers.push(layer);
      }
      if (project.backgroundMask) {
        loadedMask = await loadImageFromDataUrl(project.backgroundMask);
        loadedAssets.push(loadedMask.url);
      }
      if (project.strokes !== undefined && !Array.isArray(project.strokes)) {
        throw new Error("Le projet contient des traits invalides.");
      }
      const restoredStrokes = (project.strokes || []).map((stroke) => {
        if (!stroke || !["draw", "mask"].includes(stroke.mode) || !Array.isArray(stroke.points) ||
            !stroke.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) {
          throw new Error("Le projet contient un trait invalide.");
        }
        return {
          ...stroke,
          points: stroke.points.map((point) => ({
            x: Math.max(0, Math.min(1, point.x)),
            y: Math.max(0, Math.min(1, point.y))
          }))
        };
      });

      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      logoUrls.forEach((url) => URL.revokeObjectURL(url));
      logoUrls.clear();
      image = loadedSource.image;
      sourceUrl = loadedSource.url;
      sessionStorage.removeItem("luma-project-closed");
      originalName = String(project.originalName || "luma-projet");
      restoredLayers.forEach((layer) => {
        if (layer.type === "image") logoUrls.add(layer.url);
      });
      layers.splice(0, layers.length, ...restoredLayers);
      layerGroups.splice(0, layerGroups.length, ...(Array.isArray(project.layerGroups) ? project.layerGroups : [])
        .filter((group) => typeof group?.id === "string" && typeof group?.name === "string")
        .map((group) => ({ id: group.id, name: group.name.slice(0, 40), collapsed: Boolean(group.collapsed) })));
      const validGroupIds = new Set(layerGroups.map((group) => group.id));
      layers.forEach((layer) => {
        if (!validGroupIds.has(layer.groupId)) delete layer.groupId;
      });
      quarterTurns = Number.isFinite(Number(project.quarterTurns)) ? Number(project.quarterTurns) : 0;
      rotationDegrees = Math.max(-180, Math.min(180, Number(project.rotationDegrees) || 0));
      flipped = Boolean(project.flipped);
      selectedFrame = frameStyles.has(project.selectedFrame) ? project.selectedFrame : "none";
      activePreset = Object.hasOwn(presets, project.activePreset) || project.activePreset === "custom"
        ? project.activePreset
        : "original";
      selectedBackground = Object.hasOwn(backdropPresets, project.selectedBackground) ? project.selectedBackground : "none";
      isBlankCanvas = Boolean(project.isBlankCanvas);
      paperColor = /^#[\da-f]{6}$/i.test(project.paperColor) ? project.paperColor : defaultPaperColor;
      document.querySelector("#paper-color").value = paperColor;
      cropRect = project.cropRect && typeof project.cropRect === "object"
        ? Object.fromEntries(Object.entries(project.cropRect).filter(([, value]) => Number.isFinite(Number(value))))
        : null;
      if (cropRect && !["x", "y", "width", "height"].every((key) => Number.isFinite(cropRect[key]))) {
        cropRect = null;
      }
      setAdjustments({ ...defaults, ...(project.adjustments || {}) });
      const aspectRatio = document.querySelector("#aspect-ratio");
      aspectRatio.value = [...aspectRatio.options].some((option) => option.value === project.aspectRatio)
        ? project.aspectRatio
        : "original";
      document.querySelector("#project-name").value = String(project.projectName || "Sans titre").slice(0, 80);
      document.querySelector("#vignette").value = String(project.vignette || 0);
      document.querySelector("#glow").value = String(project.glow || 0);
      document.querySelector("#background-tolerance").value = String(project.backgroundTolerance || 45);
      document.querySelector("#background-feather").value = String(project.backgroundFeather || 42);
      document.querySelector("#image-rotation").value = String(rotationDegrees);
      backgroundColor = Array.isArray(project.backgroundColor) && project.backgroundColor.length === 3
        ? project.backgroundColor.map((value) => Math.max(0, Math.min(255, Number(value) || 0)))
        : null;
      backgroundSamplePoint = project.backgroundSamplePoint &&
        Number.isFinite(project.backgroundSamplePoint.x) && Number.isFinite(project.backgroundSamplePoint.y)
        ? { ...project.backgroundSamplePoint }
        : null;
      backgroundMask = null;
      if (loadedMask) {
        backgroundMask = document.createElement("canvas");
        backgroundMask.width = loadedMask.image.naturalWidth;
        backgroundMask.height = loadedMask.image.naturalHeight;
        backgroundMask.getContext("2d").drawImage(loadedMask.image, 0, 0);
        URL.revokeObjectURL(loadedMask.url);
        loadedAssets.splice(loadedAssets.indexOf(loadedMask.url), 1);
      }
      strokes.splice(0, strokes.length, ...restoredStrokes);
      selectedLayerId = layers.some((layer) => layer.id === project.selectedLayerId) ? project.selectedLayerId : null;
      const restoredSelection = Array.isArray(project.selectedLayerIds)
        ? project.selectedLayerIds.filter((id) => layers.some((layer) => layer.id === id))
        : selectedLayerId ? [selectedLayerId] : [];
      selectLayerIds(restoredSelection, selectedLayerId);
      layerSequence = Math.max(layerSequence, ...layers.map((layer) => Number(layer.id.match(/-(\d+)$/)?.[1]) || 0));
      history.length = 0;
      redoHistory.length = 0;
      updateHistoryControls();
      activeTool = "select";
      cropSelection = null;
      document.querySelector("#image-rotation").value = String(rotationDegrees);
      updateOutput(document.querySelector("#image-rotation"));
      updateOutput(document.querySelector("#vignette"));
      updateOutput(document.querySelector("#glow"));
      updateOutput(document.querySelector("#background-tolerance"));
      updateOutput(document.querySelector("#background-feather"));
      updateSelectionStates();
      updateLayersPanel();
      syncLayerControls();
      updateImageControls();
      updateBackdropSelection();
      restoringProject = true;
      render();
      restoringProject = false;
      scheduleAutosave();
    } catch (error) {
      loadedAssets.forEach((url) => URL.revokeObjectURL(url));
      restoringProject = false;
      throw error;
    }
  }

  async function restoreAutosave() {
    try {
      if (sessionStorage.getItem("luma-project-closed") === "true") return;
      const project = await readAutosave();
      if (!project || image) return;
      await restoreProject(project);
      announce("Votre dernière création a été restaurée depuis cet appareil.");
    } catch (error) {
      announce(`Impossible de récupérer la sauvegarde locale : ${error.message}`, true);
    }
  }

  async function closeProject() {
    if (!image) return;
    clearTimeout(autosaveTimer);
    try {
      await writeAutosave(await createProjectData());
      sessionStorage.setItem("luma-project-closed", "true");
    } catch (error) {
      announce(`Impossible de fermer le projet sans sauvegarder : ${error.message}`, true);
      return;
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    logoUrls.forEach((url) => URL.revokeObjectURL(url));
    logoUrls.clear();
    sourceUrl = null;
    image = null;
    originalName = "";
    layers.length = 0;
    selectedLayerId = null;
    history.length = 0;
    redoHistory.length = 0;
    updateHistoryControls();
    resetEdits();
    document.querySelector("#project-name").value = "Sans titre";
    document.querySelector("#autosave-state").textContent = "Sauvegarde conservée sur cet appareil";
    document.querySelector("#autosave-state").classList.remove("pending", "error");
    announce("Projet fermé. Votre sauvegarde est conservée sur cet appareil.");
  }

  async function exportImage(mimeType = document.querySelector("#export-format").value, action = "exportée") {
    if (!image) {
      announce("Importez une image avant de l'exporter.", true);
      return;
    }
    if (exportInProgress) return;
    const originalExtension = originalName.match(/\.([^.]+)$/)?.[1].toLowerCase();
    const extension = mimeType === "image/jpeg"
      ? ["jpg", "jpeg"].includes(originalExtension) ? originalExtension : "jpg"
      : mimeType === "image/webp" ? "webp" : "png";
    const baseName = (document.querySelector("#project-name").value.trim() || "luma-creation")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\s+/g, "-");
    const exportButton = document.querySelector("#export-button");
    const saveImageButton = document.querySelector("#save-image-button");
    exportInProgress = true;
    exportButton.disabled = true;
    saveImageButton.disabled = true;
    exportButton.textContent = "Préparation…";
    announce(`Préparation de l’image en ${extension.toUpperCase()}…`);
    try {
      render(false);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Le navigateur n'a pas pu générer le fichier."));
        }, mimeType, 0.94);
      });
      if (blob.type !== mimeType) throw new Error(`Le format ${extension.toUpperCase()} n’est pas pris en charge par ce navigateur.`);
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${baseName}.${extension}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      render();
      announce(`Image ${action} en ${extension.toUpperCase()}.`);
    } catch (error) {
      render();
      announce(`Échec de l'export : ${error.message}`, true);
    } finally {
      exportInProgress = false;
      exportButton.disabled = false;
      saveImageButton.disabled = !image;
      exportButton.textContent = "Exporter";
    }
  }

  document.querySelector("#confirm-image-replacement").addEventListener("click", () => {
    replaceImageDialog.close("replace");
  });
  document.querySelector("#keep-current-image").addEventListener("click", () => {
    replaceImageDialog.close("keep");
  });
  replaceImageDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    replaceImageDialog.close("keep");
  });
  document.querySelector("#open-image-button").addEventListener("click", () => upload.click());
  upload.addEventListener("change", () => {
    loadImage(upload.files[0]);
    upload.value = "";
  });
  const projectUpload = document.querySelector("#project-upload");
  document.querySelector("#open-project-button").addEventListener("click", () => projectUpload.click());
  projectUpload.addEventListener("change", () => {
    openProjectFile(projectUpload.files[0]);
    projectUpload.value = "";
  });
  document.querySelector("#save-project-button").addEventListener("click", saveProjectFile);
  document.querySelector("#save-image-button").addEventListener("click", saveImage);
  const designPreviewButton = document.querySelector("#design-preview-button");
  const designPreviewExit = document.querySelector("#design-preview-exit");
  function toggleDesignPreview(force = !showDesignPreview) {
    showDesignPreview = force;
    updateImageControls();
    render(false);
    if (showDesignPreview) {
      announce("Aperçu du design final. Appuyez sur Échap pour revenir à l’éditeur.");
      designPreviewExit.focus();
    } else {
      announce("Retour à l’éditeur.");
      designPreviewButton.focus();
    }
  }
  designPreviewButton.addEventListener("click", () => toggleDesignPreview());
  designPreviewExit.addEventListener("click", () => toggleDesignPreview(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && showDesignPreview) {
      event.preventDefault();
      toggleDesignPreview(false);
    }
  });
  document.querySelector("#new-blank-canvas").addEventListener("click", () => createBlankCanvas());
  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => createBlankCanvas(button.dataset.template));
  });
  document.querySelector("#project-name").addEventListener("input", scheduleAutosave);
  const paperColorInput = document.querySelector("#paper-color");
  paperColorInput.addEventListener("focus", saveHistory);
  paperColorInput.addEventListener("input", () => {
    if (!isBlankCanvas) return;
    paperColor = paperColorInput.value;
    render();
  });
  document.querySelector("#snap-guides").addEventListener("change", () => {
    alignmentGuides = { x: null, y: null };
  });
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", (event) => {
    if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove("drag-over");
  });
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
    loadImage(event.dataTransfer.files[0]);
  });

  function bindSliderHistory(input, onInput) {
    input.addEventListener("pointerdown", () => {
      saveHistory();
      activeSlider = input;
    });
    input.addEventListener("keydown", (event) => {
      if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") saveHistory();
    });
    input.addEventListener("input", () => {
      onInput();
    });
    input.addEventListener("change", () => {
      if (activeSlider !== input) saveHistory();
      activeSlider = null;
    });
  }

  adjustmentInputs.forEach((input) => {
    bindSliderHistory(input, () => {
      activePreset = "custom";
      updateOutput(input);
      updateSelectionStates();
      render();
    });
  });

  bindSliderHistory(document.querySelector("#text-size"), () => {
    const layer = getSelectedLayer();
    if (!layer) return;
    if (layer.type === "text") layer.size = Number(document.querySelector("#text-size").value);
    else layer.scale = Number(document.querySelector("#text-size").value) / 100;
    updateOutput(document.querySelector("#text-size"));
    updateLayersPanel();
    render();
  });
  bindSliderHistory(document.querySelector("#text-stroke"), () => {
    const layer = getSelectedLayer();
    if (!layer || layer.type !== "text") return;
    layer.strokeWidth = Number(document.querySelector("#text-stroke").value);
    updateOutput(document.querySelector("#text-stroke"));
    render();
  });
  document.querySelector("#layer-z-index").addEventListener("change", (event) => {
    const input = event.currentTarget;
    const layer = getSelectedLayer();
    const targetIndex = Number(input.value) - 1;
    if (!layer || layer.locked || !Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= layers.length) {
      syncLayerControls();
      return;
    }
    const currentIndex = layers.indexOf(layer);
    if (targetIndex === currentIndex) return;
    saveHistory();
    layers.splice(currentIndex, 1);
    layers.splice(targetIndex, 0, layer);
    updateLayersPanel();
    syncLayerControls();
    render();
    announce(`Ordre du calque réglé sur ${targetIndex + 1} sur ${layers.length}.`);
  });
  document.querySelector("#text-underline").addEventListener("change", (event) => {
    const layer = getSelectedLayer();
    if (!layer || layer.type !== "text") return;
    saveHistory();
    layer.underline = event.currentTarget.checked;
    render();
  });
  bindSliderHistory(document.querySelector("#layer-opacity"), () => {
    updateLayerProperty("opacity", Number(document.querySelector("#layer-opacity").value) / 100);
    updateOutput(document.querySelector("#layer-opacity"));
  });
  bindSliderHistory(document.querySelector("#layer-blur"), () => {
    updateLayerProperty("blur", Number(document.querySelector("#layer-blur").value));
    updateOutput(document.querySelector("#layer-blur"));
  });
  bindSliderHistory(document.querySelector("#layer-x"), () => {
    updateLayerProperty("x", Number(document.querySelector("#layer-x").value) / 100);
    updateOutput(document.querySelector("#layer-x"));
  });
  bindSliderHistory(document.querySelector("#layer-y"), () => {
    updateLayerProperty("y", Number(document.querySelector("#layer-y").value) / 100);
    updateOutput(document.querySelector("#layer-y"));
  });
  bindSliderHistory(document.querySelector("#layer-rotation"), () => {
    updateLayerProperty("rotation", Number(document.querySelector("#layer-rotation").value));
    updateOutput(document.querySelector("#layer-rotation"));
  });
  bindSliderHistory(document.querySelector("#shadow-blur"), () => {
    updateLayerProperty("shadowBlur", Number(document.querySelector("#shadow-blur").value));
    updateOutput(document.querySelector("#shadow-blur"));
  });
  bindSliderHistory(document.querySelector("#image-rotation"), () => {
    rotationDegrees = Number(document.querySelector("#image-rotation").value);
    updateOutput(document.querySelector("#image-rotation"));
    if (backgroundMask) clearBackgroundMask();
    updateImageControls();
    render();
  });
  bindSliderHistory(document.querySelector("#vignette"), () => {
    updateOutput(document.querySelector("#vignette"));
    render();
  });
  bindSliderHistory(document.querySelector("#glow"), () => {
    updateOutput(document.querySelector("#glow"));
    render();
  });
  bindSliderHistory(document.querySelector("#background-tolerance"), () => {
    updateOutput(document.querySelector("#background-tolerance"));
    if (!backgroundMask || !backgroundSamplePoint) return;
    makeBackgroundMask(backgroundSamplePoint.x, backgroundSamplePoint.y, true);
    render();
  });
  bindSliderHistory(document.querySelector("#background-feather"), () => {
    updateOutput(document.querySelector("#background-feather"));
    if (!backgroundMask || !backgroundSamplePoint) return;
    makeBackgroundMask(backgroundSamplePoint.x, backgroundSamplePoint.y, true);
    render();
  });

  const textInput = document.querySelector("#overlay-text");
  textInput.addEventListener("focus", saveHistory);
  textInput.addEventListener("input", () => {
    const layer = getSelectedLayer();
    if (!layer || layer.type !== "text") return;
    layer.text = textInput.value;
    updateLayersPanel();
    render();
  });

  document.querySelectorAll("[data-text-symbol]").forEach((button) => {
    button.addEventListener("click", () => {
      const layer = getSelectedLayer();
      if (!layer || layer.type !== "text") return;
      const start = textInput.selectionStart ?? textInput.value.length;
      const end = textInput.selectionEnd ?? start;
      const symbol = button.dataset.textSymbol;
      if (textInput.value.length + symbol.length - (end - start) > Number(textInput.maxLength)) {
        announce("Le texte a atteint la limite de 80 caractères.", true);
        return;
      }
      saveHistory();
      textInput.focus();
      textInput.setRangeText(symbol, start, end, "end");
      layer.text = textInput.value;
      updateLayersPanel();
      render();
    });
  });

  ["#text-color", "#text-font"].forEach((selector) => {
    const control = document.querySelector(selector);
    control.addEventListener("focus", saveHistory);
    control.addEventListener("input", () => {
      const layer = getSelectedLayer();
      if (!layer || layer.type !== "text") return;
      layer[selector === "#text-color" ? "color" : "font"] = control.value;
      render();
      if (selector === "#text-font" && document.fonts) {
        const font = getFont(layer, Math.max(12, Math.min(canvas.width, canvas.height) * layer.size / 100));
        document.fonts.load(font).then(() => render()).catch(() => {
          announce(`La police « ${control.value} » n'a pas pu être chargée.`, true);
        });
      }
      updateFontLibrary();
    });
  });
  const fontSearch = document.querySelector("#text-font-search");
  fontSearch.addEventListener("input", updateFontLibrary);
  document.querySelectorAll(".font-filter").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".font-filter").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      updateFontLibrary();
    });
  });
  document.querySelector("#font-favorite-toggle").addEventListener("click", () => {
    const fontName = document.querySelector("#text-font").value;
    if (!fontName) return;
    const key = `luma-font-favorite-${fontName}`;
    const isFavorite = localStorage.getItem(key) !== null;
    if (isFavorite) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, "1");
    }
    updateFontLibrary();
  });
  document.querySelector("#text-font").addEventListener("change", () => {
    updateFontLibrary();
  });
  const textStrokeColor = document.querySelector("#text-stroke-color");
  textStrokeColor.addEventListener("focus", saveHistory);
  textStrokeColor.addEventListener("input", () => {
    const layer = getSelectedLayer();
    if (!layer || layer.type !== "text") return;
    layer.strokeColor = textStrokeColor.value;
    render();
  });
  const textGradientEnabled = document.querySelector("#text-gradient-enabled");
  textGradientEnabled.addEventListener("change", () => {
    const layer = getSelectedLayer();
    if (!layer || layer.type !== "text") return;
    saveHistory();
    layer.gradientEnabled = textGradientEnabled.checked;
    syncLayerControls();
    render();
  });
  document.querySelectorAll("[data-gradient-color]").forEach((input) => {
    input.addEventListener("focus", saveHistory);
    input.addEventListener("input", () => {
      const layer = getSelectedLayer();
      if (!layer || layer.type !== "text") return;
      layer[input.dataset.gradientColor] = input.value;
      render();
    });
  });
  const shadowColor = document.querySelector("#shadow-color");
  shadowColor.addEventListener("focus", saveHistory);
  shadowColor.addEventListener("input", () => {
    updateLayerProperty("shadowColor", shadowColor.value);
  });
  const logoTintEnabled = document.querySelector("#logo-tint-enabled");
  logoTintEnabled.addEventListener("change", () => {
    const layer = getSelectedLayer();
    if (!layer || layer.type !== "image") return;
    saveHistory();
    layer.tintEnabled = logoTintEnabled.checked;
    syncLayerControls();
    render();
  });
  const logoTintColor = document.querySelector("#logo-tint-color");
  logoTintColor.addEventListener("focus", saveHistory);
  logoTintColor.addEventListener("input", () => {
    const layer = getSelectedLayer();
    if (!layer || layer.type !== "image") return;
    layer.tintColor = logoTintColor.value;
    render();
  });

  document.querySelector("#canvas-zoom").addEventListener("input", (event) => {
    zoom = Number(event.currentTarget.value);
    document.querySelector("#canvas-zoom-output").textContent = `${zoom}%`;
    canvas.style.transform = `scale(${zoom / 100})`;
    canvas.style.transformOrigin = "center center";
  });
  document.querySelector("#aspect-ratio").addEventListener("focus", saveHistory);
  document.querySelector("#aspect-ratio").addEventListener("change", () => {
    cropRect = null;
    if (backgroundMask) clearBackgroundMask();
    render();
  });
  document.querySelectorAll("[data-backdrop]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!image || button.dataset.backdrop === selectedBackground) return;
      saveHistory();
      selectedBackground = button.dataset.backdrop;
      updateBackdropSelection();
      render();
      announce(`Arrière-plan « ${button.getAttribute("aria-label") || button.textContent.trim()} » appliqué.`);
    });
  });
  document.querySelector("#layer-rotate-minus").addEventListener("click", () => rotateSelectedLayer(-15));
  document.querySelector("#layer-rotate-plus").addEventListener("click", () => rotateSelectedLayer(15));
  document.querySelector("#center-layer-button").addEventListener("click", () => {
    const layer = getSelectedLayer();
    if (!layer) return;
    saveHistory();
    layer.x = 0.5;
    layer.y = 0.5;
    syncLayerControls();
    updateLayersPanel();
    render();
    announce("Calque centré.");
  });
  document.querySelector("#clear-drawing-button").addEventListener("click", () => {
    if (!strokes.length) return;
    saveHistory();
    strokes.length = 0;
    syncLayerControls();
    render();
    announce("Les traits et coups de gomme ont été effacés.");
  });

  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => setActiveTool(button.dataset.tool));
  });
  document.querySelector("#brush-size").addEventListener("input", (event) => {
    document.querySelector("#brush-size-output").textContent = `${event.currentTarget.value}%`;
  });
  document.querySelector("#apply-crop").addEventListener("click", () => {
    if (!image || !cropSelection) return;
    const left = Math.min(cropSelection.start.x, cropSelection.end.x);
    const top = Math.min(cropSelection.start.y, cropSelection.end.y);
    const selectedWidth = Math.abs(cropSelection.end.x - cropSelection.start.x);
    const selectedHeight = Math.abs(cropSelection.end.y - cropSelection.start.y);
    if (selectedWidth < canvas.width * 0.025 || selectedHeight < canvas.height * 0.025) {
      announce("La sélection est trop petite. Tracez une zone plus grande.", true);
      return;
    }
    saveHistory();
    const rotation = (quarterTurns * 90 + rotationDegrees) * Math.PI / 180;
    const rotatedWidth = Math.abs(image.naturalWidth * Math.cos(rotation)) + Math.abs(image.naturalHeight * Math.sin(rotation));
    const rotatedHeight = Math.abs(image.naturalWidth * Math.sin(rotation)) + Math.abs(image.naturalHeight * Math.cos(rotation));
    const currentCrop = cropDimensions(rotatedWidth, rotatedHeight);
    const xRatio = left / canvas.width;
    const yRatio = top / canvas.height;
    const widthRatio = selectedWidth / canvas.width;
    const heightRatio = selectedHeight / canvas.height;
    cropRect = {
      x: (currentCrop.x + xRatio * currentCrop.width) / rotatedWidth,
      y: (currentCrop.y + yRatio * currentCrop.height) / rotatedHeight,
      width: widthRatio * currentCrop.width / rotatedWidth,
      height: heightRatio * currentCrop.height / rotatedHeight
    };
    strokes.forEach((stroke) => {
      stroke.points = stroke.points
        .filter((point) => point.x >= xRatio && point.x <= xRatio + widthRatio && point.y >= yRatio && point.y <= yRatio + heightRatio)
        .map((point) => ({
          x: (point.x - xRatio) / widthRatio,
          y: (point.y - yRatio) / heightRatio
        }));
    });
    cropSelection = null;
    setActiveTool("select");
    syncLayerControls();
    if (backgroundMask) clearBackgroundMask();
    render();
    announce("Recadrage appliqué. Vous pouvez annuler avec Ctrl+Z.");
  });
  document.querySelector("#cancel-crop").addEventListener("click", () => {
    cropSelection = null;
    setActiveTool("select");
    announce("Recadrage annulé.");
  });

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!image) return announce("Importez une image pour appliquer un filtre.", true);
      saveHistory();
      activePreset = button.dataset.preset;
      setAdjustments(presets[activePreset]);
      updateSelectionStates();
      render();
      announce(`Filtre « ${button.textContent.trim()} » appliqué.`);
    });
  });

  document.querySelectorAll("[data-frame]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!image) return announce("Importez une image pour ajouter un cadre.", true);
      saveHistory();
      selectedFrame = button.dataset.frame;
      updateSelectionStates();
      render();
    });
  });

  document.querySelector("#rotate-button").addEventListener("click", () => {
    saveHistory();
    quarterTurns = (quarterTurns + 1) % 4;
    if (backgroundMask) clearBackgroundMask();
    updateImageControls();
    render();
  });
  document.querySelector("#flip-button").addEventListener("click", () => {
    saveHistory();
    flipped = !flipped;
    if (backgroundMask) clearBackgroundMask();
    render();
  });
  document.querySelector("#pick-background").addEventListener("click", () => {
    if (!image) return;
    pickingBackground = true;
    updateImageControls();
    announce("Cliquez sur la couleur unie du fond à rendre transparente.");
  });
  document.querySelector("#clear-background").addEventListener("click", () => {
    if (!backgroundMask) return;
    saveHistory();
    clearBackgroundMask();
    announce("Le détourage du fond a été retiré.");
  });
  document.querySelector("#new-text-layer").addEventListener("click", () => {
    if (image) createTextLayer();
  });
  document.querySelector("#logo-upload-button").addEventListener("click", () => logoUpload.click());
  logoUpload.addEventListener("change", () => {
    loadLogo(logoUpload.files[0]);
    logoUpload.value = "";
  });
  const collageUpload = document.querySelector("#collage-upload");
  document.querySelector("#collage-button").addEventListener("click", () => collageUpload.click());
  collageUpload.addEventListener("change", () => {
    createPhotoCollage([...collageUpload.files]);
    collageUpload.value = "";
  });
  document.querySelectorAll("[data-logo]").forEach((button) => {
    button.addEventListener("click", () => addBuiltInLogo(button.dataset.logo));
  });
  document.querySelector("#logo-search").addEventListener("input", filterLogoLibrary);
  loadLogoManifest();
  document.querySelector("#layer-list").addEventListener("click", (event) => {
    const visibilityButton = event.target.closest("[data-layer-visibility]");
    const lockButton = event.target.closest("[data-layer-lock]");
    const groupToggle = event.target.closest("[data-layer-group-toggle]");
    const groupSelect = event.target.closest("[data-layer-group-select]");
    if (groupToggle) {
      const group = layerGroups.find((item) => item.id === groupToggle.dataset.layerGroupToggle);
      if (!group) return;
      group.collapsed = !group.collapsed;
      updateLayersPanel();
      return;
    }
    if (groupSelect) {
      const groupId = groupSelect.dataset.layerGroupSelect;
      const ids = layers.filter((layer) => layer.groupId === groupId).map((layer) => layer.id);
      if (!ids.length) return;
      selectLayerIds(ids, ids[ids.length - 1]);
      updateLayersPanel();
      syncLayerControls();
      render();
      return;
    }
    const utilityButton = visibilityButton || lockButton;
    if (utilityButton) {
      const layerId = utilityButton.dataset.layerVisibility || utilityButton.dataset.layerLock;
      const layer = layers.find((item) => item.id === layerId);
      if (!layer) return;
      saveHistory();
      if (visibilityButton) layer.visible = layer.visible === false;
      else layer.locked = !layer.locked;
      updateLayersPanel();
      syncLayerControls();
      render();
      return;
    }
    const button = event.target.closest("[data-layer-id]");
    if (!button) return;
    const clickedId = button.dataset.layerId;
    if (event.shiftKey && selectedLayerId) {
      const visibleIds = [...document.querySelectorAll("#layer-list .layer-item")].map((item) => item.dataset.layerId);
      const start = visibleIds.indexOf(selectedLayerId);
      const end = visibleIds.indexOf(clickedId);
      if (start >= 0 && end >= 0) {
        const range = visibleIds.slice(Math.min(start, end), Math.max(start, end) + 1);
        selectLayerIds([...new Set([...selectedLayerIds, ...range])], clickedId);
      } else {
        selectLayerIds([clickedId]);
      }
    } else if (event.ctrlKey || event.metaKey) {
      const nextIds = new Set(selectedLayerIds);
      if (nextIds.has(clickedId)) nextIds.delete(clickedId);
      else nextIds.add(clickedId);
      selectLayerIds([...nextIds], clickedId);
    } else {
      selectLayerIds([clickedId]);
    }
    updateLayersPanel();
    syncLayerControls();
    render();
  });
  document.querySelector("#group-layers").addEventListener("click", () => {
    const chosen = [...selectedLayerIds].map((id) => layers.find((layer) => layer.id === id)).filter(Boolean);
    if (chosen.length < 2 || chosen.some((layer) => layer.collageTile)) return;
    const name = document.querySelector("#layer-group-name").value.trim();
    if (!name) {
      announce("Donnez un nom au groupe avant de regrouper les calques.", true);
      return;
    }
    saveHistory();
    const groupId = `group-${++groupSequence}`;
    const previousGroupIds = new Set(chosen.map((layer) => layer.groupId).filter(Boolean));
    chosen.forEach((layer) => { layer.groupId = groupId; });
    previousGroupIds.forEach((id) => {
      if (!layers.some((layer) => layer.groupId === id)) {
        const index = layerGroups.findIndex((group) => group.id === id);
        if (index >= 0) layerGroups.splice(index, 1);
      }
    });
    layerGroups.push({ id: groupId, name: name.slice(0, 40), collapsed: false });
    updateLayersPanel();
    syncLayerControls();
    render();
    announce(`${chosen.length} calques regroupés dans « ${name} ».`);
  });
  document.querySelector("#ungroup-layers").addEventListener("click", () => {
    const selectedGroups = new Set([...selectedLayerIds]
      .map((id) => layers.find((layer) => layer.id === id)?.groupId)
      .filter(Boolean));
    if (!selectedGroups.size) return;
    saveHistory();
    layers.forEach((layer) => {
      if (selectedGroups.has(layer.groupId)) delete layer.groupId;
    });
    for (let index = layerGroups.length - 1; index >= 0; index -= 1) {
      if (selectedGroups.has(layerGroups[index].id)) layerGroups.splice(index, 1);
    }
    updateLayersPanel();
    syncLayerControls();
    render();
    announce("Les calques sélectionnés ont été dégroupés.");
  });
  document.querySelector("#duplicate-layer").addEventListener("click", () => {
    const selected = getSelectedLayer();
    if (!selected) return;
    saveHistory();
    const copy = {
      ...selected,
      id: `${selected.type}-${++layerSequence}`,
      name: selected.type === "image" ? `${selected.name} — copie` : "Texte — copie",
      text: selected.type === "text" ? `${selected.text} — copie` : selected.text,
      x: Math.min(0.94, selected.x + 0.04),
      y: Math.min(0.94, selected.y + 0.04)
    };
    layers.splice(layers.indexOf(selected) + 1, 0, copy);
    selectedLayerId = copy.id;
    updateLayersPanel();
    syncLayerControls();
    render();
    announce("Calque dupliqué.");
  });
  document.querySelector("#delete-layer").addEventListener("click", () => {
    const index = layers.findIndex((layer) => layer.id === selectedLayerId);
    if (index < 0) return;
    saveHistory();
    layers.splice(index, 1);
    selectedLayerId = layers[Math.min(index, layers.length - 1)]?.id || null;
    updateLayersPanel();
    syncLayerControls();
    render();
  });
  ["#move-layer-back", "#move-layer-front"].forEach((selector) => {
    document.querySelector(selector).addEventListener("click", () => {
      const index = layers.findIndex((layer) => layer.id === selectedLayerId);
      const direction = selector === "#move-layer-front" ? 1 : -1;
      const target = index + direction;
      if (index < 0 || target < 0 || target >= layers.length) return;
      saveHistory();
      [layers[index], layers[target]] = [layers[target], layers[index]];
      updateLayersPanel();
      syncLayerControls();
      render();
    });
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (!image) return;
    const point = pointOnCanvas(event);
    if (pickingBackground) {
      saveHistory();
      backgroundSamplePoint = point;
      makeBackgroundMask(point.x, point.y);
      pickingBackground = false;
      dropZone.classList.remove("sampling-background");
      updateImageControls();
      render();
      announce(`Fond échantillonné (R${backgroundColor[0]} · V${backgroundColor[1]} · B${backgroundColor[2]}). Ajustez la tolérance.`);
      return;
    }
    if (activeTool === "crop") {
      cropSelection = { start: point, end: point };
      croppingNow = true;
      canvas.setPointerCapture(event.pointerId);
      updateToolControls();
      render();
      return;
    }
    if (activeTool === "draw" || activeTool === "mask") {
      saveHistory();
      currentStroke = {
        mode: activeTool,
        color: document.querySelector("#brush-color").value,
        size: Number(document.querySelector("#brush-size").value),
        points: [{ x: point.x / canvas.width, y: point.y / canvas.height }]
      };
      strokes.push(currentStroke);
      syncLayerControls();
      canvas.setPointerCapture(event.pointerId);
      render();
      return;
    }
    const resizeHandle = selectedLayerIds.size === 1 ? pickResizeHandle(point.x, point.y) : null;
    const selectedLayer = getSelectedLayer();
    if (resizeHandle && selectedLayer) {
      saveHistory();
      draggingLayer = {
        mode: "resize",
        id: selectedLayer.id,
        centerX: selectedLayer.x * canvas.width,
        centerY: selectedLayer.y * canvas.height,
        startDistance: Math.max(1, Math.hypot(point.x - selectedLayer.x * canvas.width, point.y - selectedLayer.y * canvas.height)),
        startSize: selectedLayer.size,
        startScale: selectedLayer.scale,
        startPoint: point,
        moved: false
      };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "nwse-resize";
      return;
    }
    const layer = pickLayer(point.x, point.y);
    if (layer) {
      const group = layer.groupId ? layerGroups.find((item) => item.id === layer.groupId) : null;
      selectLayerIds(group
        ? layers.filter((item) => item.groupId === group.id).map((item) => item.id)
        : [layer.id], layer.id);
    } else {
      selectLayerIds([]);
    }
    if (layer) {
      if (!layer.locked) {
        saveHistory();
        const movingLayers = selectedLayerIds.size > 1
          ? [...selectedLayerIds].map((id) => layers.find((item) => item.id === id)).filter((item) => item && !item.locked)
          : [layer];
        draggingLayer = {
          id: layer.id,
          pointerX: point.x,
          pointerY: point.y,
          members: movingLayers.map((item) => ({ id: item.id, x: item.x, y: item.y })),
          moved: false
        };
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = "grabbing";
      } else {
        draggingLayer = null;
        canvas.style.cursor = "not-allowed";
      }
    } else {
      draggingLayer = null;
      canvas.style.cursor = "default";
    }
    updateLayersPanel();
    syncLayerControls();
    render();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (croppingNow && cropSelection) {
      cropSelection.end = pointOnCanvas(event);
      updateToolControls();
      render();
      return;
    }
    if (currentStroke) {
      const point = pointOnCanvas(event);
      currentStroke.points.push({ x: point.x / canvas.width, y: point.y / canvas.height });
      render();
      return;
    }
    if (!draggingLayer) {
      const point = pointOnCanvas(event);
      canvas.style.cursor = pickResizeHandle(point.x, point.y) ? "nwse-resize" : "grab";
      return;
    }
    const layer = layers.find((item) => item.id === draggingLayer.id);
    if (!layer) return;
    const point = pointOnCanvas(event);
    if (draggingLayer.mode === "resize") {
      const distance = Math.hypot(point.x - draggingLayer.centerX, point.y - draggingLayer.centerY);
      const factor = distance / draggingLayer.startDistance;
      if (Math.hypot(point.x - draggingLayer.startPoint.x, point.y - draggingLayer.startPoint.y) > 2) {
        draggingLayer.moved = true;
      }
      if (layer.type === "text") {
        layer.size = Math.max(2, Math.min(24, draggingLayer.startSize * factor));
      } else {
        layer.scale = Math.max(0.05, Math.min(1.5, draggingLayer.startScale * factor));
      }
      syncLayerControls();
      render();
      return;
    }
    if (Math.abs(point.x - draggingLayer.pointerX) + Math.abs(point.y - draggingLayer.pointerY) > 2) draggingLayer.moved = true;
    let deltaX = (point.x - draggingLayer.pointerX) / canvas.width;
    let deltaY = (point.y - draggingLayer.pointerY) / canvas.height;
    alignmentGuides = { x: null, y: null };
    if (document.querySelector("#snap-guides").checked) {
      const snapDistance = 12;
      const proposedX = draggingLayer.members[0].x + deltaX;
      const proposedY = draggingLayer.members[0].y + deltaY;
      if (Math.abs(proposedX - 0.5) * canvas.width <= snapDistance) {
        deltaX = 0.5 - draggingLayer.members[0].x;
        alignmentGuides.x = 0.5;
      }
      if (Math.abs(proposedY - 0.5) * canvas.height <= snapDistance) {
        deltaY = 0.5 - draggingLayer.members[0].y;
        alignmentGuides.y = 0.5;
      }
    }
    draggingLayer.members.forEach((member) => {
      const movingLayer = layers.find((item) => item.id === member.id);
      if (!movingLayer) return;
      movingLayer.x = Math.max(0, Math.min(1, member.x + deltaX));
      movingLayer.y = Math.max(0, Math.min(1, member.y + deltaY));
    });
    syncLayerControls();
    render();
  });
  canvas.addEventListener("pointerup", () => {
    if (croppingNow) {
      croppingNow = false;
      updateToolControls();
      render();
      return;
    }
    if (currentStroke) {
      currentStroke = null;
      syncLayerControls();
      announce(activeTool === "mask" ? "Masque appliqué." : "Trait ajouté.");
      return;
    }
    if (draggingLayer?.moved) {
      announce(draggingLayer.mode === "resize" ? "Taille du calque ajustée." : "Calque déplacé.");
    }
    draggingLayer = null;
    alignmentGuides = { x: null, y: null };
    canvas.style.cursor = "grab";
    render();
  });
  canvas.addEventListener("pointercancel", () => {
    croppingNow = false;
    currentStroke = null;
    draggingLayer = null;
    alignmentGuides = { x: null, y: null };
    canvas.style.cursor = "grab";
    render();
  });
  document.querySelector("#undo-button").addEventListener("click", () => {
    const previous = history.pop();
    if (!previous) return;
    redoHistory.push(snapshot());
    restoreSnapshot(previous);
    updateHistoryControls();
    announce("Dernière modification annulée.");
  });
  redoButton.addEventListener("click", () => {
    const next = redoHistory.pop();
    if (!next) return;
    history.push(snapshot());
    if (history.length > maxHistory) history.shift();
    restoreSnapshot(next);
    updateHistoryControls();
    announce("Modification rétablie.");
  });
  document.querySelector("#reset-button").addEventListener("click", () => {
    if (!image) {
      announce("Importez une image avant de réinitialiser l'éditeur.", true);
      return;
    }
    saveHistory();
    resetEdits();
    announce("Les réglages ont été réinitialisés.");
  });
  document.querySelector("#close-project-button").addEventListener("click", closeProject);
  document.querySelector("#export-button").addEventListener("click", exportImage);

  try {
    setEditorTheme(localStorage.getItem("luma-editor-theme") || "dark");
  } catch (error) {
    setEditorTheme("dark");
    announce(`Impossible de lire le thème enregistré : ${error.message}`, true);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && replaceImageDialog.open) {
      event.preventDefault();
      replaceImageDialog.close("keep");
      return;
    }
    const editing = event.target.matches("input, textarea, select");
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && event.shiftKey && !editing) {
      event.preventDefault();
      redoButton.click();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y" && !editing) {
      event.preventDefault();
      redoButton.click();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !editing) {
      event.preventDefault();
      undoButton.click();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && !editing) {
      event.preventDefault();
      document.querySelector("#duplicate-layer").click();
    } else if ((event.key === "Delete" || event.key === "Backspace") && !editing && selectedLayerId) {
      event.preventDefault();
      document.querySelector("#delete-layer").click();
    }
  });

  window.addEventListener("beforeunload", () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    logoUrls.forEach((url) => URL.revokeObjectURL(url));
  });
  updateImageControls();
  updateSelectionStates();
  updateBackdropSelection();
  updateLayersPanel();
  syncLayerControls();
  const hasRequestedTemplate = Object.prototype.hasOwnProperty.call(layoutTemplates, requestedTemplate);
  if (hasRequestedTemplate && !templatePreviewMode) {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("template");
    window.history.replaceState(null, "", cleanUrl);
  }
  if (templatePreviewMode && hasRequestedTemplate) {
    createBlankCanvas(requestedTemplate, null, null, true);
  } else {
    restoreAutosave().then(() => {
      if (hasRequestedTemplate) createBlankCanvas(requestedTemplate);
    });
  }
})();
