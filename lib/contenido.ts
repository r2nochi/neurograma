export type TonoEditorial = "coral" | "ambar" | "cian" | "violeta";

export type Hito = {
  fecha: string;
  etiqueta: string;
  titulo: string;
  resumen: string;
  fuente: string;
  tono: TonoEditorial;
};

export type Cientifico = {
  nombre: string;
  disciplina: string;
  institucion: string;
  aporte: string;
  tono: TonoEditorial;
};

export type Investigacion = {
  estado: string;
  nombre: string;
  responsable: string;
  institucion: string;
  pregunta: string;
  resumen: string;
  fuente: string;
  tono: TonoEditorial;
};

export type Fuente = {
  nombre: string;
  contexto: string;
  url: string;
};

export const HISTORIA: Hito[] = [
  {
    fecha: "1906",
    etiqueta: "La neurona toma forma",
    titulo: "Cajal convierte el tejido en un mapa",
    resumen:
      "Sus dibujos de neuronas y conexiones ayudaron a demostrar que el sistema nervioso está formado por células individuales. Compartió el Nobel con Camillo Golgi.",
    fuente: "https://www.nobelprize.org/prizes/medicine/1906/summary/",
    tono: "coral",
  },
  {
    fecha: "1952 → 1986",
    etiqueta: "Una señal que hace crecer",
    titulo: "El factor de crecimiento nervioso",
    resumen:
      "Rita Levi-Montalcini siguió una señal que guía el desarrollo de las neuronas. El descubrimiento del NGF recibió el Nobel de Fisiología o Medicina en 1986.",
    fuente:
      "https://www.nobelprize.org/prizes/medicine/1986/levi-montalcini/facts/",
    tono: "ambar",
  },
  {
    fecha: "2003",
    etiqueta: "Ver sin abrir",
    titulo: "La resonancia magnética entra en escena",
    resumen:
      "Paul Lauterbur y Peter Mansfield fueron reconocidos por descubrimientos que hicieron posible obtener imágenes del interior del cuerpo sin cirugía.",
    fuente: "https://www.nobelprize.org/prizes/medicine/2003/summary/",
    tono: "cian",
  },
  {
    fecha: "2023",
    etiqueta: "Una lista de piezas",
    titulo: "El atlas celular del cerebro de ratón",
    resumen:
      "El BRAIN Initiative Cell Census Network publicó un atlas de referencia que integra tipos celulares, ubicación y señales moleculares a gran escala.",
    fuente:
      "https://braininitiative.nih.gov/news-events/blog/nih-brain-initiative-cell-census-network-publishes-collection-papers-unveiling",
    tono: "violeta",
  },
];

export const CIENTIFICOS: Cientifico[] = [
  {
    nombre: "Santiago Ramón y Cajal",
    disciplina: "Histología · neuroanatomía",
    institucion: "Universidad Central de Madrid · Instituto Cajal",
    aporte:
      "Dibujó la arquitectura microscópica del sistema nervioso y defendió la doctrina neuronal.",
    tono: "coral",
  },
  {
    nombre: "Brenda Milner",
    disciplina: "Neuropsicología cognitiva",
    institucion: "McGill University · Montreal Neurological Institute",
    aporte:
      "Sus estudios sobre memoria distinguieron el aprendizaje consciente de otras formas de memoria que el cerebro conserva.",
    tono: "ambar",
  },
  {
    nombre: "Rita Levi-Montalcini",
    disciplina: "Neuroembriología",
    institucion: "Washington University · CNR de Roma",
    aporte:
      "Identificó junto a Stanley Cohen el factor de crecimiento nervioso, una señal esencial para el desarrollo celular.",
    tono: "cian",
  },
  {
    nombre: "Wilder Penfield",
    disciplina: "Neurocirugía funcional",
    institucion: "McGill University · Montreal Neurological Institute",
    aporte:
      "Durante cirugías con pacientes despiertos relacionó puntos de la corteza con movimiento, lenguaje y sensación.",
    tono: "violeta",
  },
];

export const INVESTIGACIONES: Investigacion[] = [
  {
    estado: "Red activa",
    nombre: "BRAIN Initiative Cell Atlas Network",
    responsable: "NIH BRAIN Initiative · red multicéntrica",
    institucion: "National Institutes of Health · Estados Unidos",
    pregunta:
      "¿Cómo se distribuyen y conectan los tipos de células humanas a distintas escalas?",
    resumen:
      "BICAN amplía el censo celular hacia mapas multiescala del cerebro, con énfasis en células humanas y herramientas para estudiarlas.",
    fuente:
      "https://braininitiative.nih.gov/research/tools-and-technologies-brain-cells-and-circuits",
    tono: "coral",
  },
  {
    estado: "Datos abiertos · análisis en curso",
    nombre: "MICrONS",
    responsable: "Allen Institute · Baylor College of Medicine · Princeton University",
    institucion: "Machine Intelligence from Cortical Networks · IARPA",
    pregunta:
      "¿Qué reglas de cableado explican la función de un circuito cortical?",
    resumen:
      "El consorcio publicó un mapa funcional y de conexiones de un volumen de corteza visual de ratón con más de 200.000 células y cientos de millones de sinapsis.",
    fuente:
      "https://alleninstitute.org/news/revealing-the-largest-wiring-diagram-and-functional-map-of-the-brain-through-microns",
    tono: "ambar",
  },
  {
    estado: "Infraestructura en evolución",
    nombre: "EBRAINS 2.0",
    responsable: "EBRAINS · consorcio europeo",
    institucion: "European Union · infraestructura ESFRI",
    pregunta:
      "¿Cómo se combinan atlas, imágenes y simulaciones en un mismo flujo reproducible?",
    resumen:
      "La plataforma reúne datasets, atlas y herramientas de modelado para que distintos laboratorios puedan comparar hipótesis sobre el cerebro.",
    fuente: "https://ebrains.eu/about/at-a-glance/ebrains-20",
    tono: "cian",
  },
];

export const FUENTES: Fuente[] = [
  {
    nombre: "NIH 3D Human Reference Atlas",
    contexto: "Modelo anatómico usado en la pieza interactiva",
    url: "https://3d.nih.gov/entries/20960/1",
  },
  {
    nombre: "NIH BRAIN Initiative",
    contexto: "Censos celulares, circuitos y herramientas de investigación",
    url: "https://braininitiative.nih.gov/about/overview",
  },
  {
    nombre: "Allen Institute · MICrONS",
    contexto: "Conectómica y mapas funcionales de corteza visual de ratón",
    url: "https://alleninstitute.org/brain-science/connectomics",
  },
  {
    nombre: "EBRAINS",
    contexto: "Atlas y simulación para investigación cerebral abierta",
    url: "https://ebrains.eu/about",
  },
  {
    nombre: "Nobel Prize · Medicina",
    contexto: "Hitos históricos de Cajal, Levi-Montalcini y la resonancia magnética",
    url: "https://www.nobelprize.org/prizes/medicine/",
  },
];
