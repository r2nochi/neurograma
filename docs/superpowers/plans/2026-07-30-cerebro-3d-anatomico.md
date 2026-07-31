# Cerebro 3D Anatómico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir la apariencia rocosa del cerebro procedural por una malla anatómica HRA/NIH con material orgánico, manteniendo la interacción, accesibilidad y respaldo existentes.

**Architecture:** El GLB se servirá localmente y `ModeloAnatomico` lo cargará con `GLTFLoader`, normalizará sus mallas al sistema de coordenadas actual y añadirá atributos de región. `Escena` conservará cámara, rotación, proxy de raycasting y arcos, y usará el modelo procedural dentro de `Suspense`/`ErrorBoundary` cuando el asset esté cargando o falle.

**Tech Stack:** Next.js 16.2.12 App Router, React 19.2, TypeScript, Three.js 0.185, React Three Fiber 9.6, GLSL compatible con WebGL 1, Vitest, Playwright y glTF Transform.

## Global Constraints

- Leer las guías relevantes de `node_modules/next/dist/docs/` antes de cambiar componentes de Next.js.
- Conservar rotación automática, pausa al señalar, arrastre, inercia, selección por leyenda, teclado, `Escape` y `prefers-reduced-motion`.
- Mantener la alternativa DOM sin WebGL y el modelo procedural como respaldo de carga o error.
- Servir el asset desde `public/models/`; producción no dependerá de NIH, Sketchfab ni otro host.
- La fuente anatómica será HRA/NIH **Brain, Male**, con atribución CC BY 4.0 visible y documentada.
- El shader debe compilar en WebGL 1; no usar WebGPU ni extensiones experimentales.
- No añadir dependencias de ejecución si Three.js y React Three Fiber ya resuelven la necesidad.
- Objetivo: 60 fps en el equipo de referencia, DPR máximo 2, sin asignaciones evitables por fotograma.
- El resaltado debe conservar relieve, especular y contexto del resto del cerebro.
- No afirmar precisión diagnóstica ni presentar la pieza como atlas clínico certificado.
- El árbol de trabajo ya contiene cambios no relacionados: cada commit debe enumerar rutas explícitas y nunca usar `git add .`.

---

## File Map

- Create: `public/models/neurograma-brain.glb` — asset HRA optimizado y autocontenido.
- Create: `public/models/ATTRIBUTION.md` — procedencia, licencia y transformaciones del asset.
- Create: `lib/modelo-anatomico.ts` — normalización, semántica de nodos y atributos de región.
- Create: `lib/material-tejido.ts` — shader y contrato de uniformes del tejido.
- Create: `components/ModeloAnatomico.tsx` — carga GLB y render de mallas preparadas.
- Create: `components/LimiteModelo.tsx` — límite de error para volver al modelo procedural.
- Create: `tests/modelo-asset.test.ts` — contrato del archivo GLB y atribución.
- Create: `tests/modelo-anatomico.test.ts` — pruebas de normalización y clasificación.
- Create: `tests/material-tejido.test.ts` — contrato del material y uniformes.
- Modify: `package.json` / `package-lock.json` — scripts y herramientas de desarrollo.
- Modify: `components/Escena.tsx` — integración del modelo, fallback y nuevo material.
- Modify: `components/Cerebro.tsx` — configuración de color/tone mapping del renderer.
- Modify: `app/page.tsx` — atribución visible y eliminación del texto “sin modelos”.
- Modify: `app/globals.css` — composición de vitrina y estados de carga.
- Modify: `shot.mjs` — comprobaciones del asset, modo activo y render.
- Modify: `README.md` — arquitectura real, fuente, licencia y métricas finales.

---

### Task 1: Test harness and asset contract

**Files:**
- Create: `tests/modelo-asset.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: estructura actual de scripts npm.
- Produces: `npm test`, `npm run verify` y contrato verificable para `public/models/neurograma-brain.glb`.

- [ ] **Step 1: Install development-only tooling**

Run:

```powershell
npm install --save-dev vitest @gltf-transform/cli
```

Expected: `vitest` and `@gltf-transform/cli` appear only under `devDependencies`; no production dependency is added.

- [ ] **Step 2: Add exact test scripts**

Edit `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "verify": "npm test && npm run build"
  }
}
```

- [ ] **Step 3: Write the failing asset test**

Create `tests/modelo-asset.test.ts`:

```ts
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const modelPath = join(root, "public", "models", "neurograma-brain.glb");
const attributionPath = join(root, "public", "models", "ATTRIBUTION.md");

describe("asset anatómico", () => {
  it("es un GLB 2.0 local, no un recurso remoto", () => {
    const bytes = readFileSync(modelPath);
    expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.byteLength);
    expect(statSync(modelPath).size).toBeGreaterThan(100_000);
    expect(statSync(modelPath).size).toBeLessThan(35 * 1024 * 1024);
  });

  it("documenta fuente, licencia y modificaciones", () => {
    const text = readFileSync(attributionPath, "utf8");
    expect(text).toContain("Human Reference Atlas");
    expect(text).toContain("3DPX-020960");
    expect(text).toContain("CC BY 4.0");
    expect(text).toContain("Transformaciones");
  });
});
```

- [ ] **Step 4: Run the test and verify the expected failure**

Run:

```powershell
npm test -- tests/modelo-asset.test.ts
```

Expected: FAIL with `ENOENT` for `public/models/neurograma-brain.glb`.

- [ ] **Step 5: Commit the harness only**

```powershell
git add -- package.json package-lock.json tests/modelo-asset.test.ts
git commit -m "test: define contrato del modelo anatomico"
```

---

### Task 2: Acquire, attribute, inspect, and optimize the HRA model

**Files:**
- Create: `public/models/neurograma-brain.glb`
- Create: `public/models/ATTRIBUTION.md`

**Interfaces:**
- Consumes: official NIH entry `https://3d.nih.gov/entries/20960/1`.
- Produces: valid meshopt-compressed GLB at `/models/neurograma-brain.glb`.

- [ ] **Step 1: Download the official input asset**

Open `https://3d.nih.gov/entries/download/20960/1`, select the input mesh `3d-vh-m-allen-brain.glb`, and save it as:

```text
C:\tmp\3d-vh-m-allen-brain.glb
```

Do not use the NIH silicone model `3DPX-021160` or a Sketchfab replacement.

- [ ] **Step 2: Validate and inspect the source before transforming it**

Run:

```powershell
npx gltf-transform validate "C:\tmp\3d-vh-m-allen-brain.glb"
npx gltf-transform inspect "C:\tmp\3d-vh-m-allen-brain.glb"
```

Expected: validation completes without an `ERROR`; record source byte size, scenes, draw calls, vertices and triangles in the implementation notes.

- [ ] **Step 3: Optimize without changing the visible topology aggressively**

Create the target directory, then run a lossless cleanup followed by meshopt compression:

```powershell
New-Item -ItemType Directory -Force "public\models" | Out-Null
npx gltf-transform dedup "C:\tmp\3d-vh-m-allen-brain.glb" "C:\tmp\brain-dedup.glb"
npx gltf-transform prune "C:\tmp\brain-dedup.glb" "C:\tmp\brain-pruned.glb"
npx gltf-transform weld "C:\tmp\brain-pruned.glb" "C:\tmp\brain-welded.glb"
npx gltf-transform meshopt "C:\tmp\brain-welded.glb" "public\models\neurograma-brain.glb"
```

Do not run `simplify` in this first pass. The source’s sulci and silhouette are the reason for adopting it.

- [ ] **Step 4: Add complete attribution**

Create `public/models/ATTRIBUTION.md`:

```markdown
# Atribución del modelo cerebral

- Título: Brain, Male
- Autor/proyecto: Human Reference Atlas (HRA)
- Repositorio: NIH 3D
- Identificador: 3DPX-020960
- Fuente: https://3d.nih.gov/entries/20960/1
- Referencia HRA: https://purl.humanatlas.io/ref-organ/brain-male/v1.3
- Licencia: Creative Commons Attribution 4.0 International (CC BY 4.0)

## Transformaciones

La copia incluida en Neurograma fue deduplicada, podada, soldada y comprimida
con meshopt para su entrega web. En tiempo de ejecución se centra, reorienta,
normaliza y recibe materiales y regiones interactivas propios. No se presenta
como herramienta diagnóstica ni como sustituto de un atlas médico.
```

- [ ] **Step 5: Validate the output and pass the contract**

Run:

```powershell
npx gltf-transform validate "public\models\neurograma-brain.glb"
npx gltf-transform inspect "public\models\neurograma-brain.glb"
npm test -- tests/modelo-asset.test.ts
```

Expected: output validates, test PASS, and size is below 35 MB.

- [ ] **Step 6: Commit only the asset and attribution**

```powershell
git add -- public/models/neurograma-brain.glb public/models/ATTRIBUTION.md
git commit -m "feat: add attributed HRA brain model"
```

---

### Task 3: Normalize the anatomical geometry and classify regions

**Files:**
- Create: `lib/modelo-anatomico.ts`
- Create: `tests/modelo-anatomico.test.ts`

**Interfaces:**
- Consumes: `regionDe(x: number, y: number, z: number): number`, `INDICE`, `THREE.BufferGeometry`.
- Produces:
  - `crearTransformacionHra(box: THREE.Box3, anclaCerebelo?: THREE.Vector3): THREE.Matrix4`
  - `regionSemantica(nombre: string): RegionId | null`
  - `prepararMallaHra(geometry: THREE.BufferGeometry, world: THREE.Matrix4, normalizacion: THREE.Matrix4, nombre: string): THREE.BufferGeometry`

- [ ] **Step 1: Write failing normalization and classification tests**

Create `tests/modelo-anatomico.test.ts`:

```ts
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  crearTransformacionHra,
  prepararMallaHra,
  regionSemantica,
} from "@/lib/modelo-anatomico";

describe("adaptador HRA", () => {
  it("mapea largo, ancho y alto a los ejes de Neurograma", () => {
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
    expect(normalized.getCenter(new THREE.Vector3()).length()).toBeLessThan(0.08);
  });

  it("reconoce estructuras no corticales por nombre", () => {
    expect(regionSemantica("Left cerebellar hemisphere")).toBe("cerebelo");
    expect(regionSemantica("Pons of brainstem")).toBe("tronco");
    expect(regionSemantica("Left frontal cortex")).toBeNull();
  });

  it("crea atributos de región y cavidad para el shader", () => {
    const source = new THREE.BoxGeometry(1, 1, 1);
    const result = prepararMallaHra(
      source,
      new THREE.Matrix4(),
      new THREE.Matrix4(),
      "Left frontal cortex",
    );
    expect(result).not.toBe(source);
    expect(result.getAttribute("aRegion").count).toBe(
      result.getAttribute("position").count,
    );
    expect(result.getAttribute("aCavidad").count).toBe(
      result.getAttribute("position").count,
    );
    expect(result.getAttribute("normal")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the tests and verify import failure**

Run:

```powershell
npm test -- tests/modelo-anatomico.test.ts
```

Expected: FAIL because `@/lib/modelo-anatomico` does not exist.

- [ ] **Step 3: Implement the pure geometry adapter**

Create `lib/modelo-anatomico.ts` with these rules:

```ts
import * as THREE from "three";
import { INDICE, regionDe, type RegionId } from "@/lib/anatomia";

const TARGET = new THREE.Vector3(1.68, 1.12, 2);
const CEREBELO = /cerebell/i;
const TRONCO = /brain[\s_-]*stem|pons|medulla|midbrain/i;

export function regionSemantica(nombre: string): RegionId | null {
  if (CEREBELO.test(nombre)) return "cerebelo";
  if (TRONCO.test(nombre)) return "tronco";
  return null;
}

export function crearTransformacionHra(
  box: THREE.Box3,
  anclaCerebelo?: THREE.Vector3,
) {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const axes = [
    { axis: 0, size: size.x },
    { axis: 1, size: size.y },
    { axis: 2, size: size.z },
  ].sort((a, b) => a.size - b.size);

  // Cerebro adulto: altura < ancho izquierda-derecha < largo antero-posterior.
  // Destino: altura -> y, ancho -> x, largo -> z.
  const sourceForTarget = [axes[1].axis, axes[0].axis, axes[2].axis];
  const basis = new THREE.Matrix4();
  const e = basis.elements;
  e[0] = e[1] = e[2] = e[4] = e[5] = e[6] = e[8] = e[9] = e[10] = 0;
  e[sourceForTarget[0] * 4 + 0] = 1;
  e[sourceForTarget[1] * 4 + 1] = 1;
  e[sourceForTarget[2] * 4 + 2] = 1;

  const movedAnchor = anclaCerebelo?.clone().sub(center).applyMatrix4(basis);
  if (movedAnchor && movedAnchor.y > 0) e[sourceForTarget[1] * 4 + 1] *= -1;
  if (movedAnchor && movedAnchor.z > 0) e[sourceForTarget[2] * 4 + 2] *= -1;

  const orientedSize = size.clone();
  const sourceSizes = [size.x, size.y, size.z];
  orientedSize.set(
    sourceSizes[sourceForTarget[0]],
    sourceSizes[sourceForTarget[1]],
    sourceSizes[sourceForTarget[2]],
  );
  const scale = Math.min(
    TARGET.x / orientedSize.x,
    TARGET.y / orientedSize.y,
    TARGET.z / orientedSize.z,
  );

  return new THREE.Matrix4()
    .makeScale(scale, scale, scale)
    .multiply(basis)
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
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
  const p = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    regions[i] = semantic ? INDICE[semantic] : regionDe(p.x, p.y, p.z);
    // Modulación estable de baja amplitud; la cavidad visual fina se completa
    // en fragment shader con derivadas de normal.
    cavity[i] = 0.82 + 0.18 * Math.sin(p.x * 31 + p.y * 17 + p.z * 23);
  }

  result.setAttribute("aRegion", new THREE.BufferAttribute(regions, 1));
  result.setAttribute("aCavidad", new THREE.BufferAttribute(cavity, 1));
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}
```

During implementation, correct only matrix indexing errors revealed by the test; keep the public signatures unchanged.

- [ ] **Step 4: Run unit tests and type checking**

Run:

```powershell
npm test -- tests/modelo-anatomico.test.ts
npx tsc --noEmit
```

Expected: PASS and zero TypeScript errors.

- [ ] **Step 5: Commit the adapter**

```powershell
git add -- lib/modelo-anatomico.ts tests/modelo-anatomico.test.ts
git commit -m "feat: adapt HRA geometry to neurograma"
```

---

### Task 4: Build the organic tissue shader as a stable module

**Files:**
- Create: `lib/material-tejido.ts`
- Create: `tests/material-tejido.test.ts`
- Modify: `components/Escena.tsx`

**Interfaces:**
- Produces:
  - `crearMaterialTejido(): THREE.ShaderMaterial`
  - `actualizarTejido(material, state): void`
  - `EstadoTejido = { region: number; mezcla: number; acento: THREE.Color; entrada: number }`
- Consumes: `aRegion`, `aCavidad`, normals and positions from either geometry source.

- [ ] **Step 1: Write a failing material contract test**

Create `tests/material-tejido.test.ts`:

```ts
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  actualizarTejido,
  crearMaterialTejido,
} from "@/lib/material-tejido";

describe("material de tejido", () => {
  it("expone los uniformes que anima Escena", () => {
    const material = crearMaterialTejido();
    expect(material.uniforms).toMatchObject({
      uActiva: { value: -1 },
      uMezcla: { value: 0 },
      uEntrada: { value: 1 },
    });
    actualizarTejido(material, {
      region: 4,
      mezcla: 0.75,
      acento: new THREE.Color("#ff9d54"),
      entrada: 0.5,
    });
    expect(material.uniforms.uActiva.value).toBe(4);
    expect(material.uniforms.uMezcla.value).toBe(0.75);
    expect(material.uniforms.uEntrada.value).toBe(0.5);
  });
});
```

- [ ] **Step 2: Verify the test fails**

Run:

```powershell
npm test -- tests/material-tejido.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Move the tissue shader out of `Escena` and upgrade it**

Create `lib/material-tejido.ts`. Keep GLSL 1 syntax (`attribute`, `varying`, `gl_FragColor`) and implement:

```ts
import * as THREE from "three";

export type EstadoTejido = {
  region: number;
  mezcla: number;
  acento: THREE.Color;
  entrada: number;
};

const VERTEX = /* glsl */ `
  attribute float aRegion;
  attribute float aCavidad;
  varying vec3 vNormal;
  varying vec3 vVista;
  varying vec3 vObjeto;
  varying float vRegion;
  varying float vCavidad;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vVista = -mv.xyz;
    vObjeto = position;
    vRegion = aRegion;
    vCavidad = aCavidad;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;

  uniform float uActiva;
  uniform float uMezcla;
  uniform float uEntrada;
  uniform vec3 uAcento;
  uniform vec3 uTejido;
  varying vec3 vNormal;
  varying vec3 vVista;
  varying vec3 vObjeto;
  varying float vRegion;
  varying float vCavidad;

  float ruido(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vVista);
    vec3 L = normalize(vec3(-0.42, 0.72, 0.53));
    vec3 F = normalize(vec3(0.62, -0.36, 0.28));
    vec3 H = normalize(L + V);

    float difusa = max(dot(N, L), 0.0);
    float relleno = max(dot(N, F), 0.0);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.7);
    float especular = pow(max(dot(N, H), 0.0), 34.0);
    float variacion = ruido(floor(vObjeto * 95.0)) - 0.5;
    float curva = length(fwidth(N));
    float cavidad = clamp(vCavidad - curva * 0.38, 0.34, 1.0);
    float seleccion = 1.0 - smoothstep(0.35, 0.65, abs(vRegion - uActiva));

    vec3 base = uTejido * (1.0 + variacion * 0.055);
    vec3 teñida = mix(base, uAcento, 0.58);
    base = mix(base, teñida, seleccion * uMezcla);
    base *= mix(1.0, mix(0.68, 1.0, seleccion), uMezcla);

    vec3 color = base * vec3(1.08, 0.91, 0.84) * (0.16 + difusa) * cavidad;
    color += base * vec3(0.48, 0.57, 0.78) * relleno * 0.28 * cavidad;
    color += vec3(0.62, 0.12, 0.10) * fresnel * 0.18;
    color += vec3(1.0, 0.86, 0.78) * especular * 0.24 * cavidad;
    color += vec3(0.26, 0.035, 0.025) * max(0.0, dot(-N, L)) * 0.10;

    gl_FragColor = vec4(color, uEntrada);
  }
`;

export function crearMaterialTejido() {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    uniforms: {
      uActiva: { value: -1 },
      uMezcla: { value: 0 },
      uAcento: { value: new THREE.Color("#4ecdc4") },
      uTejido: { value: new THREE.Color("#b96f68") },
      uEntrada: { value: 1 },
    },
  });
}

export function actualizarTejido(
  material: THREE.ShaderMaterial,
  state: EstadoTejido,
) {
  material.uniforms.uActiva.value = state.region;
  material.uniforms.uMezcla.value = state.mezcla;
  material.uniforms.uAcento.value.copy(state.acento);
  material.uniforms.uEntrada.value = state.entrada;
}
```

Rename the procedural geometry attribute from `aHueco` to `aCavidad` in `aGeometria()` so both geometry sources share one material contract.

- [ ] **Step 4: Replace only the tissue material construction in `Escena`**

Remove `VERTEX`, `FRAGMENT`, `TEJIDO` and their direct uniform writes from `components/Escena.tsx`. Import `crearMaterialTejido` and `actualizarTejido`; keep the arc shaders unchanged.

Update the frame loop with:

```ts
actualizarTejido(mat, {
  region: s.activa,
  mezcla: s.mezcla,
  acento: activa
    ? new THREE.Color(...TONOS[POR_ID[activa].tono])
    : mat.uniforms.uAcento.value,
  entrada: 1,
});
```

Avoid creating a new `Color` each frame: store the accent color in the existing `suave` or a ref and update it only when `activa` changes.

- [ ] **Step 5: Verify units, types, and build**

Run:

```powershell
npm test -- tests/material-tejido.test.ts tests/modelo-anatomico.test.ts
npx tsc --noEmit
npm run build
```

Expected: all PASS; shader compile is verified visually in Task 7.

- [ ] **Step 6: Commit shader module and integration**

```powershell
git add -- lib/material-tejido.ts tests/material-tejido.test.ts components/Escena.tsx
git commit -m "feat: render organic brain tissue"
```

---

### Task 5: Load and render the HRA model with procedural fallback

**Files:**
- Create: `components/ModeloAnatomico.tsx`
- Create: `components/LimiteModelo.tsx`
- Modify: `components/Escena.tsx`
- Modify: `shot.mjs`

**Interfaces:**
- `ModeloAnatomicoProps = { material: THREE.ShaderMaterial; onReady(caritas: number): void; reducido: boolean }`
- `LimiteModeloProps = { fallback: React.ReactNode; children: React.ReactNode }`
- DOM diagnostic: `document.documentElement.dataset.modelo` equals `cargando`, `anatomico`, or `procedural-error`.

- [ ] **Step 1: Add a failing E2E assertion for the anatomical state**

In `shot.mjs`, immediately after the desktop page’s load wait:

```js
await p.waitForFunction(
  () => ["anatomico", "procedural-error"].includes(
    document.documentElement.dataset.modelo ?? "",
  ),
  null,
  { timeout: 15_000 },
);
const modoModelo = await p.evaluate(
  () => document.documentElement.dataset.modelo,
);
if (modoModelo !== "anatomico") {
  errores.push(`esc: modelo activo = ${modoModelo}, se esperaba anatomico`);
}
```

At the end of `shot.mjs`, before closing the browser:

```js
if (errores.length) process.exitCode = 1;
```

- [ ] **Step 2: Run E2E and confirm it fails on missing `data-modelo`**

Start the app:

```powershell
npm run dev
```

In a second PowerShell:

```powershell
node shot.mjs
```

Expected: FAIL or timeout because the current scene never publishes `data-modelo="anatomico"`.

- [ ] **Step 3: Create the loader and mesh preparation component**

Create `components/ModeloAnatomico.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import {
  crearTransformacionHra,
  prepararMallaHra,
} from "@/lib/modelo-anatomico";

type Props = {
  material: THREE.ShaderMaterial;
  onReady: (triangulos: number) => void;
  reducido: boolean;
};

export function ModeloAnatomico({ material, onReady, reducido }: Props) {
  const gltf = useLoader(
    GLTFLoader,
    "/models/neurograma-brain.glb",
    (loader) => loader.setMeshoptDecoder(MeshoptDecoder),
  );

  const geometries = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const cerebellarBox = new THREE.Box3();
    let hasCerebellum = false;

    gltf.scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh && /cerebell/i.test(object.name)) {
        cerebellarBox.expandByObject(object);
        hasCerebellum = true;
      }
    });

    const anchor = hasCerebellum
      ? cerebellarBox.getCenter(new THREE.Vector3())
      : undefined;
    const normalize = crearTransformacionHra(box, anchor);
    const result: THREE.BufferGeometry[] = [];

    gltf.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry.getAttribute("position")) return;
      result.push(
        prepararMallaHra(mesh.geometry, mesh.matrixWorld, normalize, mesh.name),
      );
    });
    return result;
  }, [gltf]);

  const entrada = useRef(reducido ? 1 : 0.2);
  useFrame((_, delta) => {
    if (entrada.current >= 0.999) return;
    entrada.current += (1 - entrada.current) * (1 - Math.pow(0.0002, delta));
    material.uniforms.uEntrada.value = entrada.current;
  });

  useEffect(() => {
    const triangles = geometries.reduce(
      (sum, geometry) =>
        sum + (geometry.index?.count ?? geometry.getAttribute("position").count) / 3,
      0,
    );
    document.documentElement.dataset.modelo = "anatomico";
    onReady(Math.round(triangles));
    return () => {
      geometries.forEach((geometry) => geometry.dispose());
      delete document.documentElement.dataset.modelo;
    };
  }, [geometries, onReady]);

  return (
    <group>
      {geometries.map((geometry, index) => (
        <mesh
          key={index}
          geometry={geometry}
          material={material}
          frustumCulled
        />
      ))}
    </group>
  );
}
```

Use a stable `onReady` callback from `Escena`; do not pass a new inline function each render.

- [ ] **Step 4: Create the error boundary**

Create `components/LimiteModelo.tsx`:

```tsx
"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; fallback: ReactNode };
type State = { failed: boolean };

export class LimiteModelo extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    document.documentElement.dataset.modelo = "procedural-error";
    if (process.env.NODE_ENV !== "production") {
      console.error("No se pudo cargar el modelo anatómico", error, info);
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
```

- [ ] **Step 5: Integrate `Suspense`, fallback, and diagnostics in `Escena`**

Import `Suspense`, `useCallback`, `ModeloAnatomico`, and `LimiteModelo`.

Define the procedural fragment once:

```tsx
const procedural = (
  <>
    <mesh geometry={geo.corteza} material={mat} />
    <mesh geometry={geo.cerebelo} material={mat} />
    <mesh geometry={geo.tronco} material={mat} />
  </>
);
```

Replace the three visible procedural meshes with:

```tsx
<LimiteModelo fallback={procedural}>
  <Suspense fallback={procedural}>
    <ModeloAnatomico
      material={mat}
      reducido={reducido}
      onReady={registrarModelo}
    />
  </Suspense>
</LimiteModelo>
```

`registrarModelo` must update `data-caras` to include anatomical triangles while preserving the proxy count. Set `data-modelo="cargando"` before the loader resolves.

Keep `geo.proxy`, `geo.arcos`, selection handlers and rotation groups exactly where they are.
Scale only the proxy and arc meshes on the left-right axis with
`scale={[1.9, 1, 1]}` so they match the HRA brain’s real width; because the
scale is an object transform, `worldToLocal()` still returns the proxy’s
original coordinates for `regionDe()`.

- [ ] **Step 6: Verify unit, build, and E2E behavior**

Run:

```powershell
npm run verify
node shot.mjs
```

Expected:

- tests PASS;
- build PASS;
- `data-modelo` becomes `anatomico`;
- no shader or GLTFLoader console errors;
- screenshots contain a visible brain;
- the nine chips still update the detail card.

- [ ] **Step 7: Commit the loader integration**

```powershell
git add -- components/ModeloAnatomico.tsx components/LimiteModelo.tsx components/Escena.tsx shot.mjs
git commit -m "feat: load anatomical brain with fallback"
```

---

### Task 6: Calibrate renderer, presentation composition, and visible attribution

**Files:**
- Modify: `components/Cerebro.tsx`
- Modify: `components/Escena.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Canvas renderer uses `THREE.ACESFilmicToneMapping` and sRGB output.
- Footer links to the HRA/NIH source.
- Visual contract: anatomical model fills the stage without clipping.

- [ ] **Step 1: Configure renderer color management**

In the `Canvas` `onCreated` callback in `components/Cerebro.tsx`:

```tsx
onCreated={({ gl }) => {
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.08;
}}
```

Import `* as THREE from "three"`. Preserve antialiasing, alpha and high-performance preference.

- [ ] **Step 2: Calibrate camera against normalized extents**

Keep the initial left-lateral camera at `+x`. Use target semiextents `z = 1`, `y = 0.6` and add 6% breathing room:

```ts
const dist = Math.max(1.06 / (aspecto * t), 0.636 / t);
cam.position.set(dist, 0.12, 0);
cam.lookAt(0, -0.04, 0);
```

Take a desktop and mobile capture. If the cerebellum or brainstem is clipped, change only the `1.06`/`0.636` margins; do not scale individual anatomical structures.

- [ ] **Step 3: Replace the obsolete footer claim with attribution**

Update `app/page.tsx`:

```tsx
<footer className="pie">
  <span>
    Modelo anatómico:{" "}
    <a
      href="https://3d.nih.gov/entries/20960/1"
      target="_blank"
      rel="noreferrer"
    >
      Human Reference Atlas / NIH 3D
    </a>{" "}
    · CC BY 4.0
  </span>
  <span>
    <a href="https://github.com/r2nochi">David Nochi</a> · Lima
  </span>
</footer>
```

- [ ] **Step 4: Refine the vitrine without redesigning the page**

In `app/globals.css`:

- keep the existing layout, typefaces and four region accents;
- change the warm halo to `rgba(190, 74, 64, 0.11)`;
- change the cool fill halo to `rgba(66, 115, 154, 0.055)`;
- widen `.escena::after` to `52%`, use `height: 7%`, and lower opacity to prevent a hard black oval;
- add `.escena canvas { filter: saturate(1.05) contrast(1.03); }`;
- ensure links in `.pie` have visible `:focus-visible` and hover color;
- do not add bloom, glass cards, gradients on text, or decorative grids.

- [ ] **Step 5: Capture and inspect the four required states**

Run the dev server and capture:

```powershell
node shot.mjs
```

Inspect:

- `capturas/esc-02-cerebro.png` — rest state;
- `capturas/esc-03-region.png` — selected region;
- `capturas/mov-02-cerebro.png` — mobile framing;
- `capturas/esc-05-reducido.png` — reduced motion.

Acceptance checks:

- sulci read as anatomical folds, not noisy rock;
- highlights remain broad and wet, not metallic;
- temporal lobe, cerebellum and brainstem remain separable;
- selected region retains shadows and specular;
- no clipping or empty vertical bands dominate the scene.

- [ ] **Step 6: Commit the presentation pass**

```powershell
git add -- components/Cerebro.tsx components/Escena.tsx app/page.tsx app/globals.css
git commit -m "feat: present brain as anatomical specimen"
```

---

### Task 7: Harden verification, document measurements, and run the final story

**Files:**
- Modify: `shot.mjs`
- Modify: `README.md`

**Interfaces:**
- `node shot.mjs` exits non-zero for missing anatomical model, empty render, unreachable controls, overflow, console errors, or broken reduced motion.
- README reports measured rather than estimated results.

- [ ] **Step 1: Convert current diagnostic logs into explicit failures**

In `shot.mjs`, push errors for:

```js
if (desborde.hay) errores.push(`${nombre}: desborde horizontal`);
if (!dibuja) errores.push(`${nombre}: lienzo plano o vacío`);
if (fallan.length) errores.push(`${nombre}: regiones fallidas: ${fallan.join(", ")}`);
if (nombre === "esc" && modoModelo !== "anatomico") {
  errores.push(`esc: no cargó el modelo anatómico`);
}
```

For reduced motion:

```js
if (!a.equals(b)) errores.push("reducido: la escena sigue animando");
```

For no-WebGL:

```js
if (hayLienzo || !leido) {
  errores.push("sin-webgl: el fallback perdió ilustración o contenido");
}
```

Keep benign GPU warnings filtered. Finish with `process.exitCode = 1` only when `errores.length > 0`.

- [ ] **Step 2: Record asset timing and payload**

Track the GLB response in the existing resource listener by accepting resource type `fetch` and URL ending in `.glb`. Print:

```text
modelo: neurograma-brain.glb · <content-length> bytes · <responseEnd-startTime> ms
```

Also read:

```js
document.documentElement.dataset.modelo
document.documentElement.dataset.caras
```

Do not hardcode measured values in the script.

- [ ] **Step 3: Update README architecture and attribution**

Replace every claim that says there is no imported model or zero asset bytes. Document:

- HRA/NIH source and CC BY 4.0;
- optimized local GLB;
- runtime normalization and region attributes;
- procedural model as loading/error fallback;
- shader terms: tissue base, cavity, wet specular, Fresnel, back-scatter approximation;
- actual measured asset size, triangle count, desktop/mobile fps and test date;
- limitations: illustrative regions, not diagnostic, tested hardware and browsers.

Keep the existing explanation of selection proxy, keyboard access and reduced motion when still accurate.

- [ ] **Step 4: Run the full verification sequence**

Run:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Start the production build:

```powershell
npm start
```

In another PowerShell:

```powershell
URL=http://localhost:3000 node shot.mjs
```

For the presentation machine’s real GPU:

```powershell
$env:CABEZA="1"
$env:URL="http://localhost:3000"
node shot.mjs
Remove-Item Env:CABEZA
Remove-Item Env:URL
```

Expected:

- every command exits `0`;
- console errors: none;
- model mode: `anatomico`;
- desktop and mobile render visible;
- nine chip selections work;
- pointer selection reaches the expected cortical areas;
- reduced-motion captures are byte-identical;
- no-WebGL content remains usable;
- fps is recorded, not inferred.

- [ ] **Step 5: Review the final diff for accidental user-change capture**

Run:

```powershell
git status --short
git diff --check
git diff --stat HEAD
```

Confirm no capture files, `.next`, temp GLBs, or unrelated pre-existing modifications are staged.

- [ ] **Step 6: Commit verification and documentation**

```powershell
git add -- shot.mjs README.md
git commit -m "docs: verify anatomical neurograma"
```
