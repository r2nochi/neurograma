/**
 * La forma del cerebro, escrita como función.
 *
 * No hay ningún `.glb` descargado ni escaneo de resonancia: la superficie
 * entera sale de estas ecuaciones. Eso no es purismo, son tres cosas
 * concretas: no hay licencia que verificar, no hay megabytes que descargar en
 * una conexión peruana, y la malla se puede regenerar a cualquier resolución.
 *
 * SISTEMA DE COORDENADAS
 *   +x  izquierda del sujeto      +y  arriba      +z  anterior (la frente)
 *
 * La cámara se sitúa en +x mirando hacia el origen. Eso da la vista lateral
 * IZQUIERDA con la frente a la izquierda de la pantalla, que es la lámina
 * clásica de anatomía — y además es el hemisferio correcto: Broca y Wernicke
 * están a la izquierda en la mayoría de las personas.
 *
 * PROPORCIONES: cerebro adulto ~167 mm de largo, 140 de ancho, 93 de alto.
 * Normalizado a semilargo = 1.0 quedan los radios de abajo.
 */

import { crestas, fbm } from "@/lib/ruido";

export const RADIOS = { x: 0.44, y: 0.60, z: 1.0 };

const suave = (b0: number, b1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - b0) / (b1 - b0)));
  return t * t * (3 - 2 * t);
};

/**
 * Cisura de Silvio, la hendidura diagonal que separa el lóbulo temporal.
 * Va del polo temporal (anterior-inferior) hacia atrás y hacia arriba.
 * Es LA marca que hace que una vista lateral se lea como un cerebro.
 */
export const ySilvio = (z: number) => -0.112 - 0.439 * z;

/**
 * Surco central (de Rolando): separa la corteza motora de la parietal.
 * Baja desde el borde superior hacia delante, hasta morir sobre Silvio.
 */
export const zCentral = (y: number) => 0.22 - 0.45 * (y + 0.05);

/**
 * Lleva una dirección de la esfera unidad a la superficie del cerebro,
 * ANTES de los pliegues. Esta es la silueta; el ruido va aparte.
 *
 * Se aplica en orden: elipsoide → afinar polos → aplanar la base →
 * ensanchar el temporal → cisura interhemisférica → Silvio → Rolando.
 */
export function moldear(dx: number, dy: number, dz: number): [number, number, number] {
  let x = dx * RADIOS.x;
  let y = dy * RADIOS.y;
  let z = dz * RADIOS.z;

  // Polo frontal: más estrecho y algo más bajo que el resto. Sin pasarse: con
  // un afinado más fuerte el frontal salía en punta, como un huso.
  const frontal = suave(0.2, 1.0, z);
  x *= 1 - 0.17 * frontal;
  y = y * (1 - 0.10 * frontal) - 0.045 * frontal;

  // Polo occipital: se afila hacia atrás.
  const occipital = suave(0.25, 1.0, -z);
  x *= 1 - 0.13 * occipital;
  y = y * (1 - 0.07 * occipital) - 0.02 * occipital;

  // Escotadura del tentorio. Sin esto el occipital baja hasta el suelo y se
  // COME el sitio del cerebelo, que queda enterrado dentro del hemisferio y
  // no se ve: un cerebro sin cerebelo visible no se lee como un cerebro.
  if (y < 0) y *= 1 - 0.56 * suave(-0.26, -0.74, z);

  // La base es plana: el cerebro se apoya sobre el suelo del cráneo.
  if (y < -0.16) y = -0.16 + (y + 0.16) * 0.74;

  // El punto más ancho no está en el centro geométrico, sino algo por detrás
  // y por debajo: es el bulto temporoparietal.
  const bulto =
    Math.exp(-((z + 0.12) ** 2) / 0.62) * Math.exp(-((y + 0.06) ** 2) / 0.30);
  x *= 1 + 0.20 * bulto;

  // Cisura interhemisférica: el tajo profundo entre los dos hemisferios.
  // Solo existe por arriba; por debajo los hemisferios están unidos.
  const superior = suave(-0.08, 0.28, y);
  const interhemis = Math.exp(-(x * x) / (2 * 0.070 * 0.070));
  y -= 0.175 * interhemis * superior;

  // Polo temporal: el lóbulo temporal se adelanta por debajo del frontal y
  // deja una muesca entre ambos. Es el rasgo que da el perfil de bota que
  // reconoces como cerebro; sin él la silueta es un pan de molde.
  const pTemporal =
    Math.exp(-((z - 0.42) ** 2) / 0.085 - (y + 0.26) ** 2 / 0.045) *
    suave(0.30, 0.65, Math.abs(x) / RADIOS.x);
  z += 0.13 * pTemporal;
  x *= 1 + 0.14 * pTemporal;
  y -= 0.035 * pTemporal;

  // Cisura de Silvio, hundida hacia dentro en la cara lateral.
  //
  // Es estrecha y no llega a los polos: empieza sobre el polo temporal y
  // muere hacia dos tercios del recorrido. Con más profundidad y más tramo,
  // el cerebro se leía partido en dos de un sierrazo.
  const lateral = suave(0.28, 0.70, Math.abs(x) / RADIOS.x);
  const tramo = suave(-0.50, -0.34, z) * (1 - suave(0.38, 0.54, z));
  const dSilvio = (y - ySilvio(z)) / 0.042;
  const silvio = Math.exp(-dSilvio * dSilvio) * lateral * tramo;
  x -= Math.sign(x) * 0.058 * silvio;
  y -= 0.015 * silvio;

  // Surco central. Solo por encima de Silvio, y también cruzando el borde
  // superior — por eso no se limita a la cara lateral.
  if (y > ySilvio(z) + 0.02) {
    const dRol = (z - zCentral(y)) / 0.048;
    const rolando = Math.exp(-dRol * dRol) * suave(0.10, 0.45, Math.abs(x) / RADIOS.x + Math.max(0, y));
    x -= Math.sign(x) * 0.05 * rolando;
    y -= 0.045 * rolando * suave(0.30, 0.55, y);
  }

  return [x, y, z];
}

/**
 * Relieve de las circunvoluciones.
 *
 * Devuelve [desplazamiento, hueco] donde `hueco` va de 0 (fondo de surco) a
 * 1 (lomo de circunvolución). Ese segundo valor viaja a la GPU como
 * oclusión ambiental horneada: sin él los pliegues existen en la geometría
 * pero no se VEN, porque la luz difusa sola no oscurece las hendiduras.
 */
export function pliegues(x: number, y: number, z: number): [number, number] {
  // Deformación del dominio: sin esto las crestas salen en rejilla y se nota.
  const wx = fbm(x * 2.4 + 11.3, y * 2.4 + 4.1, z * 2.4 + 7.7, 2);
  const wy = fbm(x * 2.4 + 27.9, y * 2.4 + 19.2, z * 2.4 + 3.4, 2);
  const wz = fbm(x * 2.4 + 5.6, y * 2.4 + 31.8, z * 2.4 + 23.1, 2);

  // Una vista lateral real muestra del orden de treinta circunvoluciones. Con
  // k = 11 salían ocho, del tamaño de una coliflor; con 16 la densidad ya es
  // la correcta y la silueta deja de parecer dentada.
  const k = 16;
  // El muestreo anisótropo alarga los lomos: una circunvolución es un cordón
  // largo, no una burbuja. Se comprime el eje z porque en la cara lateral las
  // circunvoluciones corren sobre todo de delante a atrás.
  // Comprimir un eje del muestreo ESTIRA los rasgos en ese eje. Con z a 0,38
  // las crestas salen casi tres veces más largas que anchas: cordones, que es
  // lo que es una circunvolución. Sin esa anisotropía el relieve es coliflor.
  const c = crestas(
    (x + wx * 0.14) * k * 1.3,
    (y + wy * 0.14) * k * 1.05,
    (z + wz * 0.14) * k * 0.30,
    3,
  );

  // `crestas` vive en torno a ~0.55; se centra para que el desplazamiento
  // reparta hacia dentro y hacia fuera en vez de inflar la pieza entera.
  //
  // La amplitud es 0,042 y no más: con el doble, la SILUETA sale dentada y el
  // cerebro se lee como una piedra. Un surco real es una hendidura estrecha
  // que se ve por su sombra, no un diente que asoma por el contorno.
  const hueco = Math.min(1, Math.max(0, (c - 0.28) / 0.52));
  return [(hueco - 0.5) * 0.032, hueco];
}

// ---------------------------------------------------------------- regiones

export type RegionId =
  | "frontal"
  | "motora"
  | "parietal"
  | "occipital"
  | "temporal"
  | "broca"
  | "wernicke"
  | "cerebelo"
  | "tronco";

/** Orden fijo: el índice es lo que viaja al shader como atributo. */
export const ORDEN: RegionId[] = [
  "frontal",
  "motora",
  "parietal",
  "occipital",
  "temporal",
  "broca",
  "wernicke",
  "cerebelo",
  "tronco",
];

export const INDICE = Object.fromEntries(ORDEN.map((id, i) => [id, i])) as Record<
  RegionId,
  number
>;

/** Centros de las áreas del lenguaje, en coordenadas ya moldeadas. */
const BROCA = { z: 0.34, y: -0.16, r: 0.155 };
const WERNICKE = { z: -0.20, y: -0.15, r: 0.145 };

/**
 * Qué región ocupa un punto de la corteza. Se evalúa sobre el punto
 * MOLDEADO y antes de los pliegues: así el mapa de regiones no depende del
 * ruido, y el mismo criterio sirve para pintar la malla y para acertar con
 * el cursor.
 */
export function regionDe(x: number, y: number, z: number): number {
  const lateral = Math.abs(x) / RADIOS.x > 0.45;

  // Las áreas del lenguaje se comen a las demás: son parches pequeños dentro
  // del frontal y del temporal, así que se comprueban primero.
  if (lateral) {
    const db = Math.hypot(z - BROCA.z, (y - BROCA.y) * 1.4);
    if (db < BROCA.r && y > ySilvio(z)) return INDICE.broca;

    const dw = Math.hypot(z - WERNICKE.z, (y - WERNICKE.y) * 1.4);
    if (dw < WERNICKE.r && y < ySilvio(z) + 0.10) return INDICE.wernicke;
  }

  // Por debajo de Silvio y por delante del occipital: lóbulo temporal.
  if (y < ySilvio(z) && z > -0.52) return INDICE.temporal;

  if (z < -0.50) return INDICE.occipital;

  const zc = zCentral(y);
  if (z > zc + 0.115) return INDICE.frontal;
  if (z > zc - 0.045) return INDICE.motora;
  return INDICE.parietal;
}

// -------------------------------------------------- cerebelo y tronco

/** El cerebelo ocupa la escotadura: detrás y debajo del occipital. */
export const CEREBELO = {
  centro: [0, -0.30, -0.58] as [number, number, number],
  radios: [0.37, 0.23, 0.31] as [number, number, number],
};

/**
 * Folias: los pliegues del cerebelo son mucho más finos y casi paralelos
 * entre sí, en bandas horizontales. Por eso el muestreo va aplastado 20x en
 * el eje vertical.
 */
export function folias(x: number, y: number, z: number): [number, number] {
  const c = crestas(x * 4, y * 62, z * 5, 3);
  const hueco = Math.min(1, Math.max(0, (c - 0.30) / 0.50));
  // El vermis: el surco central que divide los dos hemisferios cerebelosos.
  const vermis = Math.exp(-(x * x) / (2 * 0.055 * 0.055));
  return [(hueco - 0.5) * 0.030 - vermis * 0.028, hueco * (1 - vermis * 0.6)];
}

/**
 * Tronco encefálico: mesencéfalo, protuberancia y bulbo.
 *
 * Va por DELANTE del cerebelo y es corto: en una vista lateral asoman unos
 * cuatro centímetros sobre un cerebro de dieciséis. Con el largo que tenía
 * antes —tres cuartos de la altura del cerebro— la pieza parecía un
 * champiñón, no un encéfalo.
 */
export const TRONCO = {
  desde: [0, -0.24, -0.24] as [number, number, number],
  hasta: [0, -0.70, -0.06] as [number, number, number],
  /** Radio a lo largo del recorrido; la joroba es la protuberancia. */
  radio: (t: number) => {
    const cuerpo =
      0.125 + 0.055 * Math.exp(-((t - 0.30) ** 2) / 0.030) - 0.045 * suave(0.5, 1.0, t);
    // El último tramo cierra en cúpula: un bulbo cortado en plano se ve como
    // un tubo serrado en cuanto la pieza gira un poco.
    const cierre = t > 0.86 ? Math.sqrt(Math.max(0, 1 - ((t - 0.86) / 0.14) ** 2)) : 1;
    return cuerpo * cierre;
  },
};
