"use client";

import { useState } from "react";

import { Sinapsis } from "@/components/Sinapsis";
import { POR_ID, REGIONES, SILUETA, type RegionId } from "@/lib/regiones";

/**
 * El cerebro. Cada región es un <path> real del DOM, no una zona calculada
 * sobre una imagen: por eso el hover es exacto, se alcanza con Tab y un lector
 * de pantalla puede leerlo.
 */
/** Clases de una región según cuál esté activa. */
function clases(
  tono: string,
  activa: RegionId | null,
  id: RegionId,
) {
  const estado =
    activa === id ? " activa" : activa ? " atenuada" : "";
  return `region tono-${tono}${estado}`;
}

export function Cerebro() {
  const [activa, setActiva] = useState<RegionId | null>(null);
  const region = activa ? POR_ID[activa] : null;

  return (
    <div className="lienzo">
      <div className="cerebro-caja">
        <Sinapsis activa={activa} />

        <svg
          className="cerebro"
          viewBox="0 0 1000 760"
          role="group"
          aria-label="Cerebro humano en vista lateral. Recorre las regiones para conocer su función."
        >
          <defs>
            {/* Los lóbulos se recortan contra la silueta: así las fronteras
                encajan por construcción en vez de depender de que nueve
                contornos dibujados a mano casen entre sí. */}
            <clipPath id="silueta">
              <path d={SILUETA} />
            </clipPath>
          </defs>

          {/* Masa del cerebro, para que el recorte tenga sobre qué apoyarse. */}
          <path d={SILUETA} className="masa" aria-hidden />

          <g clipPath="url(#silueta)">
            {REGIONES.filter((r) => r.recortada).map((r) => (
              <path
                key={r.id}
                d={r.path}
                className={clases(r.tono, activa, r.id)}
                tabIndex={0}
                role="button"
                aria-label={`${r.nombre}. ${r.funcion}`}
                onMouseEnter={() => setActiva(r.id)}
                onMouseLeave={() => setActiva(null)}
                onFocus={() => setActiva(r.id)}
                onBlur={() => setActiva(null)}
              />
            ))}

            {/* Surcos: textura de tejido, recortada igual que los lóbulos. */}
            <g className="surcos" aria-hidden>
              <path d="M 252 250 C 310 226 372 236 424 268" />
              <path d="M 232 316 C 296 292 364 300 424 332" />
              <path d="M 592 218 C 640 208 682 224 710 258" />
              <path d="M 600 296 C 654 284 700 300 726 334" />
              <path d="M 286 388 C 372 366 470 364 546 380" />
            </g>
          </g>

          {/* Estructuras que NO son corteza cerebral: van fuera del recorte
              porque anatómicamente son otra cosa. */}
          {REGIONES.filter((r) => !r.recortada).map((r) => (
            <path
              key={r.id}
              d={r.path}
              className={clases(r.tono, activa, r.id)}
              tabIndex={0}
              role="button"
              aria-label={`${r.nombre}. ${r.funcion}`}
              onMouseEnter={() => setActiva(r.id)}
              onMouseLeave={() => setActiva(null)}
              onFocus={() => setActiva(r.id)}
              onBlur={() => setActiva(null)}
            />
          ))}
        </svg>
      </div>

      <aside className="ficha" aria-live="polite">
        {region ? (
          <>
            <p className={`ficha-rotulo tono-texto-${region.tono}`}>
              {region.nombre}
            </p>
            <p className="ficha-funcion">{region.funcion}</p>
            <div className="ficha-nota">
              <span className="ficha-nota-marca" aria-hidden>
                i
              </span>
              <p>{region.curiosidad}</p>
            </div>
          </>
        ) : (
          <>
            <p className="ficha-rotulo ficha-reposo">
              {REGIONES.length} regiones
            </p>
            <p className="ficha-funcion">
              Pasa el cursor sobre una región —o recórrelas con el tabulador—
              para ver qué hace y un dato que probablemente no sabías.
            </p>
            <div className="ficha-nota ficha-nota-reposo">
              <span className="ficha-nota-marca" aria-hidden>
                i
              </span>
              <p>
                Las líneas que se disparan entre regiones no son decorativas:
                siguen las conexiones funcionales reales de cada zona.
              </p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
