/**
 * Construcción de la malla. Todo se genera en el navegador al cargar.
 *
 * Se parte de un icosaedro subdividido en vez de una esfera UV porque la
 * esfera UV amontona triángulos en los polos: los pliegues saldrían finos
 * arriba y bastos en el ecuador. El icosaedro reparte área uniforme, que es
 * lo que necesita un relieve isótropo como la corteza.
 *
 * Cada vértice lleva tres atributos: posición, región (índice) y hueco
 * (oclusión horneada). El tercero es el que hace que los surcos se VEAN:
 * la iluminación difusa por sí sola no oscurece una hendidura estrecha.
 */

import {
  CEREBELO,
  INDICE,
  RADIOS,
  TRONCO,
  folias,
  moldear,
  pliegues,
  regionDe,
} from "@/lib/anatomia";

export type Malla = {
  posiciones: Float32Array;
  normales: Float32Array;
  regiones: Float32Array;
  huecos: Float32Array;
  indices: Uint32Array;
};

// ------------------------------------------------------------ icosfera

const PHI = (1 + Math.sqrt(5)) / 2;

const VERTICES_BASE: [number, number, number][] = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
];

const CARAS_BASE: [number, number, number][] = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
];

/**
 * Icosfera INDEXADA: los vértices se comparten entre caras.
 *
 * `IcosahedronGeometry` de three devuelve la malla sin índices, con cada
 * vértice triplicado. Con eso las normales salen por cara y el cerebro se
 * vería facetado como un diamante. Aquí se cachean los puntos medios para
 * que cada vértice exista una sola vez y la normal se pueda promediar.
 */
function icosfera(subdiv: number): { dir: Float32Array; indices: Uint32Array } {
  let puntos = VERTICES_BASE.map((v) => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l] as [number, number, number];
  });
  let caras = CARAS_BASE.map((c) => [...c] as [number, number, number]);

  for (let s = 0; s < subdiv; s++) {
    const medios = new Map<number, number>();
    const nuevas: [number, number, number][] = [];

    const medio = (a: number, b: number) => {
      const clave = a < b ? a * 1e7 + b : b * 1e7 + a;
      const visto = medios.get(clave);
      if (visto !== undefined) return visto;
      const p = puntos[a];
      const q = puntos[b];
      const m: [number, number, number] = [
        (p[0] + q[0]) / 2,
        (p[1] + q[1]) / 2,
        (p[2] + q[2]) / 2,
      ];
      const l = Math.hypot(m[0], m[1], m[2]);
      m[0] /= l;
      m[1] /= l;
      m[2] /= l;
      const i = puntos.length;
      puntos.push(m);
      medios.set(clave, i);
      return i;
    };

    for (const [a, b, c] of caras) {
      const ab = medio(a, b);
      const bc = medio(b, c);
      const ca = medio(c, a);
      nuevas.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    caras = nuevas;
  }

  const dir = new Float32Array(puntos.length * 3);
  puntos.forEach((p, i) => {
    dir[i * 3] = p[0];
    dir[i * 3 + 1] = p[1];
    dir[i * 3 + 2] = p[2];
  });

  const indices = new Uint32Array(caras.length * 3);
  caras.forEach((c, i) => {
    indices[i * 3] = c[0];
    indices[i * 3 + 1] = c[1];
    indices[i * 3 + 2] = c[2];
  });

  return { dir, indices };
}

/** Normales promediadas por vértice, a partir de las caras reales. */
function normalesDe(posiciones: Float32Array, indices: Uint32Array): Float32Array {
  const n = new Float32Array(posiciones.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const ux = posiciones[b] - posiciones[a];
    const uy = posiciones[b + 1] - posiciones[a + 1];
    const uz = posiciones[b + 2] - posiciones[a + 2];
    const vx = posiciones[c] - posiciones[a];
    const vy = posiciones[c + 1] - posiciones[a + 1];
    const vz = posiciones[c + 2] - posiciones[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) {
      n[k] += nx;
      n[k + 1] += ny;
      n[k + 2] += nz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
  return n;
}

// ------------------------------------------------------------- corteza

/**
 * @param subdiv 5 para la malla visible (20 480 caras), 3 para el proxy de
 *   selección (1 280). El proxy no se dibuja: solo recibe el rayo del cursor.
 * @param conPliegues el proxy va liso — el relieve es de ±0,04, así que
 *   acertar sobre la forma base es indistinguible al señalar.
 */
export function construirCorteza(subdiv: number, conPliegues = true): Malla {
  const { dir, indices } = icosfera(subdiv);
  const n = dir.length / 3;
  const posiciones = new Float32Array(n * 3);
  const regiones = new Float32Array(n);
  const huecos = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const dx = dir[i * 3];
    const dy = dir[i * 3 + 1];
    const dz = dir[i * 3 + 2];

    const [x, y, z] = moldear(dx, dy, dz);
    regiones[i] = regionDe(x, y, z);

    let px = x;
    let py = y;
    let pz = z;

    if (conPliegues) {
      const [d, hueco] = pliegues(x, y, z);
      huecos[i] = hueco;
      // La normal del elipsoide en esa dirección: (dx/rx, dy/ry, dz/rz).
      // Desplazar por ahí mantiene el relieve perpendicular a la superficie
      // en vez de estirarlo hacia el centro.
      let nx = dx / RADIOS.x;
      let ny = dy / RADIOS.y;
      let nz = dz / RADIOS.z;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      px += nx * d;
      py += ny * d;
      pz += nz * d;
    } else {
      huecos[i] = 1;
    }

    posiciones[i * 3] = px;
    posiciones[i * 3 + 1] = py;
    posiciones[i * 3 + 2] = pz;
  }

  return {
    posiciones,
    normales: normalesDe(posiciones, indices),
    regiones,
    huecos,
    indices,
  };
}

// ------------------------------------------------------------ cerebelo

export function construirCerebelo(subdiv: number, conPliegues = true): Malla {
  const { dir, indices } = icosfera(subdiv);
  const n = dir.length / 3;
  const posiciones = new Float32Array(n * 3);
  const regiones = new Float32Array(n).fill(INDICE.cerebelo);
  const huecos = new Float32Array(n);
  const [cx, cy, cz] = CEREBELO.centro;
  const [rx, ry, rz] = CEREBELO.radios;

  for (let i = 0; i < n; i++) {
    const dx = dir[i * 3];
    const dy = dir[i * 3 + 1];
    const dz = dir[i * 3 + 2];

    // Achatado por arriba: el cerebelo se mete bajo el occipital.
    const achatar = dy > 0 ? 1 - 0.30 * dy : 1;
    let px = dx * rx;
    let py = dy * ry * achatar;
    let pz = dz * rz;

    if (conPliegues) {
      const [d, hueco] = folias(px, py, pz);
      huecos[i] = hueco;
      let nx = dx / rx;
      let ny = dy / ry;
      let nz = dz / rz;
      const l = Math.hypot(nx, ny, nz) || 1;
      px += (nx / l) * d;
      py += (ny / l) * d;
      pz += (nz / l) * d;
    } else {
      huecos[i] = 1;
    }

    posiciones[i * 3] = px + cx;
    posiciones[i * 3 + 1] = py + cy;
    posiciones[i * 3 + 2] = pz + cz;
  }

  return {
    posiciones,
    normales: normalesDe(posiciones, indices),
    regiones,
    huecos,
    indices,
  };
}

// -------------------------------------------------------------- tronco

/** Tubo de radio variable: mesencéfalo, protuberancia (la joroba) y bulbo. */
export function construirTronco(largo = 26, radial = 20): Malla {
  const posiciones = new Float32Array((largo + 1) * radial * 3 + 3);
  const regiones = new Float32Array((largo + 1) * radial + 1).fill(INDICE.tronco);
  const huecos = new Float32Array((largo + 1) * radial + 1).fill(0.9);
  const caras: number[] = [];
  const [ax, ay, az] = TRONCO.desde;
  const [bx, by, bz] = TRONCO.hasta;

  for (let i = 0; i <= largo; i++) {
    const t = i / largo;
    const r = TRONCO.radio(t);
    // Ligera comba anterior: el tronco no es una vara recta.
    const comba = Math.sin(t * Math.PI) * 0.045;
    const cx = ax + (bx - ax) * t;
    const cy = ay + (by - ay) * t;
    const cz = az + (bz - az) * t + comba;

    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const k = (i * radial + j) * 3;
      posiciones[k] = cx + Math.cos(a) * r;
      posiciones[k + 1] = cy;
      // Sección ovalada: más ancho de lado a lado que de delante a atrás.
      posiciones[k + 2] = cz + Math.sin(a) * r * 0.82;
      huecos[i * radial + j] = 0.72 + 0.28 * Math.abs(Math.cos(a));
    }
  }

  for (let i = 0; i < largo; i++) {
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial;
      const a = i * radial + j;
      const b = i * radial + j2;
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + j2;
      caras.push(a, c, b, b, c, d);
    }
  }

  // Tapa inferior, para que el bulbo no quede hueco visto desde abajo.
  const tapa = (largo + 1) * radial;
  posiciones[tapa * 3] = bx;
  posiciones[tapa * 3 + 1] = by;
  posiciones[tapa * 3 + 2] = bz;
  for (let j = 0; j < radial; j++) {
    caras.push(largo * radial + j, largo * radial + ((j + 1) % radial), tapa);
  }

  const indices = Uint32Array.from(caras);
  return {
    posiciones,
    normales: normalesDe(posiciones, indices),
    regiones,
    huecos,
    indices,
  };
}

/** Une varias mallas en una sola, reindexando. Se usa para el proxy. */
export function fundir(mallas: Malla[]): Malla {
  const nv = mallas.reduce((s, m) => s + m.posiciones.length / 3, 0);
  const ni = mallas.reduce((s, m) => s + m.indices.length, 0);
  const posiciones = new Float32Array(nv * 3);
  const normales = new Float32Array(nv * 3);
  const regiones = new Float32Array(nv);
  const huecos = new Float32Array(nv);
  const indices = new Uint32Array(ni);

  let ov = 0;
  let oi = 0;
  for (const m of mallas) {
    posiciones.set(m.posiciones, ov * 3);
    normales.set(m.normales, ov * 3);
    regiones.set(m.regiones, ov);
    huecos.set(m.huecos, ov);
    for (let i = 0; i < m.indices.length; i++) indices[oi + i] = m.indices[i] + ov;
    ov += m.posiciones.length / 3;
    oi += m.indices.length;
  }

  return { posiciones, normales, regiones, huecos, indices };
}
