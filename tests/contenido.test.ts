import { describe, expect, it } from "vitest";

import {
  CIENTIFICOS,
  FUENTES,
  HISTORIA,
  INVESTIGACIONES,
} from "@/lib/contenido";

describe("contenido editorial del atlas", () => {
  it("mantiene una ruta narrativa con hitos y científicos", () => {
    expect(HISTORIA.length).toBeGreaterThanOrEqual(4);
    expect(CIENTIFICOS.length).toBeGreaterThanOrEqual(4);
    expect(HISTORIA.every((item) => item.titulo && item.fuente)).toBe(true);
    expect(CIENTIFICOS.every((item) => item.nombre && item.institucion)).toBe(
      true,
    );
  });

  it("presenta investigaciones actuales con responsable y pregunta abierta", () => {
    expect(INVESTIGACIONES.length).toBeGreaterThanOrEqual(3);
    expect(
      INVESTIGACIONES.every(
        (item) => item.responsable && item.pregunta && item.estado,
      ),
    ).toBe(true);
  });

  it("solo enlaza fuentes externas seguras y rastreables", () => {
    expect(FUENTES.length).toBeGreaterThanOrEqual(4);
    expect(FUENTES.every((fuente) => fuente.url.startsWith("https://"))).toBe(
      true,
    );
  });
});
