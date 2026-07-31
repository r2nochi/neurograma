import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  crearTransformacionHra,
  esMallaVisible,
  prepararMallaHra,
  regionSemantica,
} from "@/lib/modelo-anatomico";

describe("adaptador del modelo HRA", () => {
  it("mantiene las proporciones anatómicas al llevarlo a la escena", () => {
    const box = new THREE.Box3(
      new THREE.Vector3(-70, -46.5, -83.5),
      new THREE.Vector3(70, 46.5, 83.5),
    );

    const matrix = crearTransformacionHra(
      box,
      new THREE.Vector3(0, -35, -58),
    );
    const normalized = box.clone().applyMatrix4(matrix);
    const size = normalized.getSize(new THREE.Vector3());

    expect(size.x).toBeCloseTo(1.68, 1);
    expect(size.y).toBeCloseTo(1.12, 1);
    expect(size.z).toBeCloseTo(2, 1);
    expect(normalized.getCenter(new THREE.Vector3()).length()).toBeLessThan(
      0.08,
    );
  });

  it("conserva superficie externa y descarta núcleos internos", () => {
    expect(esMallaVisible("Allen_superior_frontal_gyrus_L")).toBe(true);
    expect(esMallaVisible("Allen_lateral_hemisphere_of_cerebellum_R")).toBe(
      true,
    );
    expect(esMallaVisible("Allen_basilar_part_of_pons_L")).toBe(true);
    expect(esMallaVisible("Allen_head_of_caudate_L")).toBe(false);
    expect(esMallaVisible("Allen_hypothalamus_R")).toBe(false);
    expect(esMallaVisible("Allen_cerebellar_deep_nuclei_L")).toBe(false);
    expect(esMallaVisible("Allen_central_canal_of_medulla_oblongata_R")).toBe(
      false,
    );
    expect(esMallaVisible("Allen_lateral_olfactory_gyrus_L")).toBe(false);
  });

  it("reconoce cerebelo y tronco por su nombre anatómico", () => {
    expect(regionSemantica("Allen_cerebellar_vermis_L")).toBe("cerebelo");
    expect(regionSemantica("Allen_basilar_part_of_pons_R")).toBe("tronco");
    expect(regionSemantica("Allen_superior_frontal_gyrus_L")).toBeNull();
  });

  it("crea normales y atributos consumidos por el shader", () => {
    const source = new THREE.BoxGeometry(1, 1, 1);
    source.deleteAttribute("normal");

    const result = prepararMallaHra(
      source,
      new THREE.Matrix4(),
      new THREE.Matrix4(),
      "Allen_superior_frontal_gyrus_L",
    );

    expect(result).not.toBe(source);
    expect(result.getAttribute("normal")).toBeDefined();
    expect(result.getAttribute("aRegion").count).toBe(
      result.getAttribute("position").count,
    );
    expect(result.getAttribute("aCavidad").count).toBe(
      result.getAttribute("position").count,
    );
  });
});
