/**
 * Ruido de gradiente 3D, determinista.
 *
 * Es el motor de los pliegues: sin ruido el cerebro sería un huevo liso.
 *
 * La tabla de permutación se genera con un PRNG sembrado, NO con Math.random.
 * Eso importa más de lo que parece: si la forma cambiara en cada build, dos
 * capturas del mismo commit no serían comparables y la verificación no
 * probaría nada. Con semilla fija, el cerebro de hoy es el de mañana.
 */

/** PRNG de 32 bits, sembrado. Suficiente para barajar una tabla. */
function mulberry32(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERM = (() => {
  const azar = mulberry32(0x6ce3);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  // Duplicada para poder indexar hasta 511 sin módulo en el bucle interno.
  return Uint8Array.from([...p, ...p]);
})();

/** Los 12 gradientes de Perlin: aristas del cubo. */
const GRAD = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

const suavizar = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const mezclar = (a: number, b: number, t: number) => a + t * (b - a);

function punto(hash: number, x: number, y: number, z: number) {
  const g = GRAD[hash % 12];
  return g[0] * x + g[1] * y + g[2] * z;
}

/** Ruido de gradiente 3D en [-1, 1] aproximadamente. */
export function ruido3(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  const fx = x - Math.floor(x);
  const fy = y - Math.floor(y);
  const fz = z - Math.floor(z);
  const u = suavizar(fx);
  const v = suavizar(fy);
  const w = suavizar(fz);

  const A = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;

  return mezclar(
    mezclar(
      mezclar(punto(PERM[AA], fx, fy, fz), punto(PERM[BA], fx - 1, fy, fz), u),
      mezclar(punto(PERM[AB], fx, fy - 1, fz), punto(PERM[BB], fx - 1, fy - 1, fz), u),
      v,
    ),
    mezclar(
      mezclar(punto(PERM[AA + 1], fx, fy, fz - 1), punto(PERM[BA + 1], fx - 1, fy, fz - 1), u),
      mezclar(punto(PERM[AB + 1], fx, fy - 1, fz - 1), punto(PERM[BB + 1], fx - 1, fy - 1, fz - 1), u),
      v,
    ),
    w,
  );
}

/** Suma de octavas. El relieve de fondo, sin aristas. */
export function fbm(x: number, y: number, z: number, octavas = 4): number {
  let suma = 0;
  let amp = 0.5;
  let frec = 1;
  for (let i = 0; i < octavas; i++) {
    suma += ruido3(x * frec, y * frec, z * frec) * amp;
    frec *= 2.03; // No exactamente 2: evita que las octavas se alineen en rejilla.
    amp *= 0.5;
  }
  return suma;
}

/**
 * Ruido de crestas: `1 - |ruido|`, elevado al cuadrado y realimentado.
 *
 * Es lo que separa un cerebro de una patata. El fbm normal da bultos suaves;
 * esto da lomos redondeados separados por hendiduras afiladas, que es
 * exactamente la relación entre una circunvolución y un surco.
 */
export function crestas(x: number, y: number, z: number, octavas = 4): number {
  let suma = 0;
  let amp = 0.5;
  let frec = 1;
  let previa = 1;
  for (let i = 0; i < octavas; i++) {
    let n = 1 - Math.abs(ruido3(x * frec, y * frec, z * frec));
    n *= n;
    suma += n * amp * previa;
    previa = n;
    frec *= 2.03;
    amp *= 0.5;
  }
  return suma;
}
