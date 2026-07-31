import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const modelPath = join(root, "public", "models", "neurograma-brain.glb");
const attributionPath = join(root, "public", "models", "ATTRIBUTION.md");

describe("asset anatómico", () => {
  it("es un GLB 2.0 local y autocontenido", () => {
    const bytes = readFileSync(modelPath);

    expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.byteLength);
    expect(statSync(modelPath).size).toBeGreaterThan(100_000);
    expect(statSync(modelPath).size).toBeLessThan(35 * 1024 * 1024);
  });

  it("documenta la procedencia y la licencia del modelo", () => {
    const text = readFileSync(attributionPath, "utf8");

    expect(text).toContain("Human Reference Atlas");
    expect(text).toContain("3DPX-020960");
    expect(text).toContain("CC BY 4.0");
    expect(text).toContain("Transformaciones");
  });
});
