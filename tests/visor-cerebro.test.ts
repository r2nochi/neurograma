import { describe, expect, it } from "vitest";

import { CEREBRO_VIEW } from "@/lib/visor-cerebro";

describe("visor principal de Neurograma", () => {
  it("entra directamente en el cerebro 3D sin una silueta corporal", () => {
    expect(CEREBRO_VIEW.nivelInicial).toBe("cerebro");
    expect(CEREBRO_VIEW.mostrarAtlasCorporal).toBe(false);
  });
});
