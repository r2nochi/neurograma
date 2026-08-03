import { describe, expect, it } from "vitest";

import { ENLACES_NAV } from "@/lib/navegacion";

describe("navegación principal", () => {
  it("no duplica el acceso al visor cerebral", () => {
    expect(ENLACES_NAV.map(([label]) => label)).toEqual([
      "Cerebro 3D",
      "Historias",
      "Científicos",
      "Investigación",
      "Fuentes",
    ]);
    expect(ENLACES_NAV.some(([label]) => label === "Explorar")).toBe(false);
  });
});
