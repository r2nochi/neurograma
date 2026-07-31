import * as THREE from "three";

import { INDICE, regionDe, type RegionId } from "@/lib/anatomia";

const CEREBELO = /cerebell|paravermis/i;
const TRONCO = /brain[\s_-]*stem|pons|medulla|midbrain|peduncle/i;
const SUPERFICIE =
  /gyrus|cortex|lobule|precuneus|cuneus|pole|operculum|insula|sulcus|planum|parahippocampal|paracingulate|frontomarginal|cerebell|paravermis|pons|medulla|midbrain|peduncle/i;
const INTERIOR = /deep_nuclei|central_canal|olfactory/i;

export function esMallaVisible(nombre: string) {
  return SUPERFICIE.test(nombre) && !INTERIOR.test(nombre);
}

export function regionSemantica(nombre: string): RegionId | null {
  if (CEREBELO.test(nombre)) return "cerebelo";
  if (TRONCO.test(nombre)) return "tronco";
  return null;
}

/**
 * HRA usa x izquierda-derecha, y inferior-superior y z posterior-anterior.
 * El largo antero-posterior se normaliza a 2 unidades y los demás ejes
 * conservan su proporción médica real.
 */
export function crearTransformacionHra(
  box: THREE.Box3,
  anclaCerebelo?: THREE.Vector3,
) {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 2 / Math.max(size.z, Number.EPSILON);
  const sy = anclaCerebelo && anclaCerebelo.y > center.y ? -scale : scale;
  const sz = anclaCerebelo && anclaCerebelo.z > center.z ? -scale : scale;

  return new THREE.Matrix4()
    .makeScale(scale, sy, sz)
    .multiply(
      new THREE.Matrix4().makeTranslation(
        -center.x,
        -center.y,
        -center.z,
      ),
    );
}

export function prepararMallaHra(
  geometry: THREE.BufferGeometry,
  world: THREE.Matrix4,
  normalizacion: THREE.Matrix4,
  nombre: string,
) {
  const result = geometry.clone();
  result.applyMatrix4(world);
  result.applyMatrix4(normalizacion);
  if (!result.getAttribute("normal")) result.computeVertexNormals();

  const position = result.getAttribute("position");
  const semantic = regionSemantica(nombre);
  const regions = new Float32Array(position.count);
  const cavity = new Float32Array(position.count);
  const point = new THREE.Vector3();

  for (let index = 0; index < position.count; index++) {
    point.fromBufferAttribute(position, index);
    regions[index] = semantic
      ? INDICE[semantic]
      : regionDe(point.x, point.y, point.z);
    cavity[index] =
      0.82 +
      0.18 *
        Math.sin(point.x * 31 + point.y * 17 + point.z * 23);
  }

  result.setAttribute(
    "aRegion",
    new THREE.BufferAttribute(regions, 1),
  );
  result.setAttribute(
    "aCavidad",
    new THREE.BufferAttribute(cavity, 1),
  );
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}
