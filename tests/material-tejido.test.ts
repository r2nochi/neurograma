import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  actualizarTejido,
  crearMaterialTejido,
} from "@/lib/material-tejido";

describe("material orgánico de tejido", () => {
  it("expone y actualiza el estado animado de la escena", () => {
    const material = crearMaterialTejido();

    expect(material.uniforms.uActiva.value).toBe(-1);
    expect(material.uniforms.uMezcla.value).toBe(0);
    expect(material.uniforms.uEntrada.value).toBe(1);

    actualizarTejido(material, {
      region: 4,
      mezcla: 0.75,
      acento: new THREE.Color("#ff9d54"),
      entrada: 0.5,
    });

    expect(material.uniforms.uActiva.value).toBe(4);
    expect(material.uniforms.uMezcla.value).toBe(0.75);
    expect(material.uniforms.uAcento.value.getHexString()).toBe("ff9d54");
    expect(material.uniforms.uEntrada.value).toBe(0.5);
  });

  it("permite renderizar ambos lados de las piezas anatómicas", () => {
    const material = crearMaterialTejido();

    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(true);
  });
});
