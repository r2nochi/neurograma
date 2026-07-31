# Neurograma

Experiencia web 3D de anatomía cerebral construida con Next.js, React Three
Fiber, Three.js y shaders GLSL propios. El cerebro gira automáticamente, se
detiene mientras se explora y permite identificar nueve regiones tanto con el
cursor como con teclado.

## Qué cambió

La visualización principal usa una superficie anatómica real del
[Human Reference Atlas en NIH 3D](https://3d.nih.gov/entries/20960/1), no una
aproximación generada con ruido. El asset incluido está simplificado para web,
conserva los surcos principales y se renderiza con un material orgánico propio:

- luz cálida principal y relleno frío;
- oclusión visual en cavidades;
- brillo húmedo y Fresnel rojizo en los bordes;
- microvariación de color para evitar una superficie plástica;
- resaltado animado por región.

La antigua geometría procedural sigue en el proyecto con dos funciones
concretas: es el respaldo si el GLB falla y actúa como proxy invisible de baja
resolución para que el `raycasting` del cursor siga siendo rápido.

## Arquitectura

| Archivo | Responsabilidad |
|---|---|
| `components/ModeloAnatomico.tsx` | Carga el GLB, filtra estructuras internas, normaliza la orientación y fusiona la superficie |
| `components/LimiteModelo.tsx` | Recuperación automática hacia la malla procedural si falla el modelo |
| `components/Escena.tsx` | Cámara, giro, inercia, selección, conexiones y composición |
| `lib/modelo-anatomico.ts` | Adaptador de coordenadas HRA y clasificación de regiones |
| `lib/material-tejido.ts` | Shader GLSL del tejido orgánico |
| `lib/geometria.ts` | Malla procedural de respaldo y proxy de selección |
| `public/models/neurograma-brain.glb` | Modelo web optimizado |
| `public/models/ATTRIBUTION.md` | Fuente, licencia y transformaciones del asset |

## Presupuesto actual

- Modelo descargado: aproximadamente 4,7 MB.
- Superficie visible: aproximadamente 152 mil triángulos.
- Conexiones: 7.488 triángulos.
- Proxy de selección: 1.810 triángulos.
- Geometría procedural de respaldo: 30.308 triángulos.
- Regiones accesibles por cursor y teclado: 9/9.
- Medición local Intel UHD / D3D11: 57 FPS en escritorio, con CPU ×4 y en
  viewport móvil.

El modelo se prepara en el cliente y sus piezas se fusionan en una sola
`BufferGeometry`, evitando más de cien `draw calls`. Las normales ya vienen
calculadas en el asset para no bloquear el primer fotograma. El estado activo se
expone en `data-modelo` y el número real de caras en `data-caras`, de modo que la
verificación automatizada comprueba la ruta que se montó realmente.

## Accesibilidad y tolerancia a fallos

- Los nueve botones permiten explorar todas las regiones con teclado.
- `Escape` libera una selección fija.
- La ficha usa `aria-live="polite"`.
- `prefers-reduced-motion` detiene el giro y el pulso viajero.
- Sin WebGL, el contenido textual y la leyenda siguen disponibles.
- Si el GLB falla al cargar, se monta la versión procedural sin perder la
  interacción.

## Fuente y licencia

Modelo “Brain, Male”, Human Reference Atlas, identificador NIH 3D
`3DPX-020960`, bajo licencia CC BY 4.0. La atribución completa está en
[`public/models/ATTRIBUTION.md`](public/models/ATTRIBUTION.md).

Neurograma es una experiencia educativa y de divulgación. No es una herramienta
diagnóstica ni reemplaza un atlas médico validado.

## Desarrollo

```powershell
npm install
npm run dev
npm test
npm run build
npm run verify
```

Verificación visual y de interacción:

```powershell
node shot.mjs
$env:CABEZA = "1"; node shot.mjs
$env:URL = "https://tu-despliegue.example"; node shot.mjs
```

En modo headless Chromium usa SwiftShader; ese FPS sirve para detectar
regresiones grandes, pero no representa el rendimiento de la GPU real. Para una
medición de presentación usa `CABEZA=1`.

## Stack

Next.js 16 · React 19 · Three.js 0.185 · React Three Fiber 9.6 · GLSL · Vitest ·
Playwright

---

Parte del laboratorio de front-end de
[David Nochi](https://github.com/r2nochi) — Lima.
