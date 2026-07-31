# Neurograma

Un cerebro humano en 3D que puedes girar con el cursor. Señalas una región —o la
eliges de la lista con el tabulador— y aparece qué hace, qué se rompe cuando falla,
y un dato que probablemente no sabías.

## Qué lo hace distinto de un visor de anatomía

- **No hay ningún modelo descargado.** La malla entera se genera en el navegador
  a partir de ecuaciones: un icosaedro subdividido, deformado a proporciones de
  cerebro adulto y esculpido con ruido de crestas. Cero `.glb`, cero texturas,
  cero licencias que verificar, cero megabytes que bajar en una conexión peruana.
- **Las circunvoluciones son geometría real**, no un mapa de relieve pintado.
  Se ven porque existen: cada pliegue desplaza vértices y las normales se
  recalculan sobre la superficie deformada.
- **Las sinapsis no son decorativas.** Los cordones que se encienden van de la
  región activa hacia las que aparecen en su campo `conecta`, que lista
  relaciones funcionales reales.

## Cómo está construido

| Archivo | Qué resuelve |
|---|---|
| `lib/ruido.ts` | Ruido de gradiente 3D con semilla fija, y ruido de **crestas** (`1 − \|n\|`) |
| `lib/anatomia.ts` | La forma: elipsoide → polos → base plana → escotadura del tentorio → polo temporal → cisuras. Y `regionDe()`, que decide qué región ocupa cada punto |
| `lib/geometria.ts` | Icosfera **indexada** y desplazamiento de la malla |
| `components/Escena.tsx` | Shader de tejido, arcos sinápticos, giro y selección |

### Las tres decisiones que sostienen la pieza

**1. Ruido de crestas, no fbm.** El fbm normal da bultos suaves: una patata. El
ruido de crestas (`1 − |n|`, elevado al cuadrado y realimentado) da lomos
redondeados separados por hendiduras afiladas — que es exactamente la relación
entre una circunvolución y un surco. Y el muestreo va comprimido 3× en el eje
antero-posterior, porque una circunvolución es un **cordón largo**, no una
burbuja; sin esa anisotropía el relieve sale como una coliflor.

**2. Oclusión horneada en un atributo del vértice.** La luz difusa no distingue
una hendidura estrecha de una superficie plana. Si solo se ilumina, los pliegues
existen en la geometría pero **no se ven**. Cada vértice lleva un valor `hueco`
—cuánto de fondo de surco es— calculado en CPU y consumido por el shader.

**3. Icosfera indexada, no `IcosahedronGeometry`.** La de three devuelve la malla
sin índices, con cada vértice triplicado: las normales salen por cara y el
cerebro se ve facetado como un diamante. Aquí se cachean los puntos medios de la
subdivisión para que cada vértice exista una sola vez y la normal se promedie.

### El proxy de selección

Señalar sobre la malla visible costaría 20 480 pruebas de triángulo por
movimiento del ratón. En su lugar hay una **copia invisible de 1 810 caras** sin
pliegues (el relieve es de ±0,03: indistinguible al apuntar).

Y sobre esa copia no se lee el atributo del vértice, sino que se evalúa
`regionDe()` **en el punto de impacto**. La diferencia importa: con 642 vértices,
las áreas de Broca y Wernicke son parches de tan pocos vértices que resultaban
inalcanzables con el cursor. Evaluando la frontera analítica, la precisión deja
de depender de la resolución de la malla.

## Medido

Con `CABEZA=1 node shot.mjs`, sobre **Intel UHD Graphics integrada** — no una
tarjeta dedicada. Ese es el número que vale para el presupuesto de 60 fps.

| | |
|---|---|
| fps, GPU libre (1440×900) | **60** |
| fps, **CPU 4× más lenta** | **60** |
| fps, viewport móvil 390×844 | **60** |
| Triángulos dibujados | 30 308 |
| Triángulos del proxy de selección | 1 810 |
| Regiones alcanzables con el cursor | **9 / 9** |
| Regiones alcanzables con el teclado | **9 / 9** |
| Desborde horizontal a 390 px | ninguno |
| Errores de consola | ninguno |
| Peso de assets externos | **0 bytes** (solo las tipografías) |

La verificación comprueba además que el lienzo **dibuje**: decodifica el PNG,
mide su desviación típica y cuenta qué fracción no es fondo. Sin esa prueba un
error de compilación de GLSL pasaría por bueno — deja el lienzo vacío, y como no
hay nada que rasterizar el contador de `requestAnimationFrame` sube a 60 fps
limpios: el fallo se disfraza de éxito.

## Accesibilidad

- **Una malla 3D no se puede tabular.** Por eso hay una leyenda de nueve botones
  bajo el lienzo: al recibir foco resaltan la región **y giran el cerebro para
  encararla**. Es la pieza que hace la escena utilizable sin ratón.
- El ratón manda mientras está encima; al salir, la ficha vuelve a lo elegido con
  el teclado en vez de vaciarse. `Escape` suelta la selección.
- La ficha es `aria-live="polite"`: quien usa lector de pantalla oye el cambio.
- Con `prefers-reduced-motion` **no hay giro automático ni pulso viajero**: los
  cordones se encienden enteros y quietos. Verificado comparando dos capturas
  separadas 1,2 s — idénticas byte a byte.
- **Sin WebGL** desaparece la ilustración, no el contenido: la leyenda y la ficha
  siguen funcionando. Verificado anulando `getContext('webgl')`.

## Límites — lo que NO se probó

Léelo antes de confiar en los números de arriba.

- **No es material médico.** Es una ilustración generada con ruido, no un atlas.
  Las circunvoluciones son plausibles pero **no corresponden a las de un cerebro
  concreto**: ningún surco de esta malla tiene nombre salvo los tres que se
  esculpen a mano (interhemisférica, Silvio y Rolando). Las fronteras entre
  lóbulos están simplificadas a planos y esferas. Para estudiar anatomía, usa un
  atlas de verdad.
- **Medido en un solo equipo** (Intel UHD, Windows, Chromium). Sin probar en
  gama baja Android real, que es donde el presupuesto de 60 fps se juega de
  verdad. El throttling 4× de CPU **no simula una GPU lenta**.
- **Sin probar en Safari ni en iOS.** WebKit maneja distinto la pérdida de
  contexto WebGL y el `pointercapture` del arrastre.
- **Sin probar con lector de pantalla real** (NVDA, VoiceOver). Los `aria-label`
  están puestos, pero no verificados escuchándolos.
- **La generación de la malla ocupa el hilo principal** al cargar (~30 000
  vértices con ruido). En un móvil lento eso es un tirón perceptible antes del
  primer fotograma; no se ha medido cuánto ni se ha movido a un worker.
- Las curiosidades siguen la divulgación neurocientífica estándar, pero **no
  citan fuente primaria**.

## Correr en local

```powershell
npm install
npm run dev
node shot.mjs                    # capturas + fps + regiones + desborde
CABEZA=1 node shot.mjs           # con ventana: mide sobre la GPU real
URL=https://... node shot.mjs    # lo mismo contra producción
```

Sin `CABEZA=1`, Chromium headless cae a SwiftShader (rasterizado por software) y
el fps que reporta —unos 40— no dice nada de ningún dispositivo real.

## Stack

Next.js 16 · React 19 · three 0.185 · @react-three/fiber 9.6 · GLSL propio · sin
librerías de animación ni de controles de cámara.

---

Parte del laboratorio de front-end de [David Nochi](https://github.com/r2nochi) — Lima.
