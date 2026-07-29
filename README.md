# Neurograma

Anatomía interactiva del cerebro humano. Pasas el cursor sobre una región —o la
recorres con el tabulador— y aparece qué hace, qué se rompe cuando falla, y un dato
que probablemente no sabías.

## Qué lo hace distinto de una infografía

- **Cada región es un `<path>` real del DOM**, no una zona calculada sobre una imagen.
  Por eso el hover es exacto al píxel, se alcanza con `Tab` y un lector de pantalla lo
  puede leer.
- **Las sinapsis no son decorativas.** Los pulsos van de la región activa hacia las que
  aparecen en su campo `conecta`, que lista relaciones funcionales reales. No se
  disparan líneas porque queden bonitas.
- **Cero assets externos.** No hay modelo 3D, ni imagen, ni textura. Todo es SVG dibujado
  a mano y canvas. Sin licencias que verificar y sin megabytes que descargar.

## La decisión técnica que lo salvó

La primera versión dibujaba cada lóbulo como un contorno independiente. El resultado
fueron **nueve manchas sueltas que no encajaban entre sí**: acertar a ciegas con nueve
curvas que compartan frontera es prácticamente imposible.

La solución fue invertir el problema. Se dibuja **una sola silueta** (`SILUETA` en
`lib/regiones.ts`) y los lóbulos se recortan contra ella con un `clipPath`. Las fronteras
casan por construcción, y solo hay que acertar con un contorno en vez de nueve.

El lóbulo temporal, el cerebelo y el tronco quedan **fuera** del recorte a propósito: el
hueco entre el temporal y el resto es la **cisura de Silvio**, y es el rasgo que hace que
un cerebro parezca un cerebro.

## Medido

| | |
|---|---|
| fps con las sinapsis disparando | **60** |
| Desborde horizontal a 390 px | ninguno |
| Errores de consola | ninguno |
| Peso de assets externos | 0 bytes |

Verificado con `node shot.mjs`, que además comprueba que **las nueve regiones responden**
al señalar su centro anatómico.

## Accesibilidad

- Cada región es `tabIndex={0}` con `role="button"` y un `aria-label` que incluye su
  función. Se navega entera con teclado.
- La ficha lateral es `aria-live="polite"`: quien usa lector de pantalla oye el cambio.
- Con `prefers-reduced-motion` los pulsos **no se disparan**, pero el resto de la pieza
  sigue completa: se puede recorrer y leer todo.

## Límites — lo que NO se probó

Léelo antes de confiar en los números de arriba.

- **No es material médico.** Es una ilustración estilizada con fines divulgativos. Las
  formas son aproximadas y las fronteras entre lóbulos están simplificadas. Para estudiar
  anatomía, usa un atlas.
- **fps medido solo en Chromium de escritorio**, sin ralentización de CPU. Falta la
  medición con CPU 4× lenta que exige el `CLAUDE.md` del laboratorio.
- **Sin probar en Safari ni en iOS.** `clip-path` sobre SVG y el escalado del canvas se
  comportan distinto en WebKit.
- **Sin probar con lector de pantalla real** (NVDA, VoiceOver). Los `aria-label` están
  puestos, pero no verificados escuchándolos.
- Las curiosidades siguen la divulgación neurocientífica estándar, pero **no citan fuente
  primaria**.

## Correr en local

```powershell
npm install
npm run dev
node shot.mjs                    # capturas + desborde + errores + fps
URL=https://... node shot.mjs    # lo mismo contra producción
```

## Stack

Next.js 16 · React 19 · SVG · canvas 2D · sin dependencias de animación.

---

Parte del laboratorio de front-end de [David Nochi](https://github.com/r2nochi) — Lima.
