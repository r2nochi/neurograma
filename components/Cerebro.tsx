"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";

import { Escena, hayWebgl } from "@/components/Escena";
import { POR_ID, REGIONES, type RegionId } from "@/lib/regiones";

/**
 * Contenedor de la pieza.
 *
 * DOS FUENTES DE SELECCIÓN, y esa es la decisión de diseño que importa:
 *
 *   `sobre`  — el cursor pasa por encima de la malla. Efímero.
 *   `fijada` — alguien eligió desde la leyenda, con clic o con el tabulador.
 *              Se queda puesta.
 *
 * `activa = sobre ?? fijada`. Así el ratón manda mientras está encima, pero al
 * salir la ficha no se vacía si venías del teclado. Sin esa jerarquía, una
 * pieza 3D es inutilizable sin ratón: no se puede dar foco a un triángulo.
 */
export function Cerebro() {
  const [sobre, setSobre] = useState<RegionId | null>(null);
  const [fijada, setFijada] = useState<RegionId | null>(null);
  const [listo, setListo] = useState(false);
  const [gl, setGl] = useState(false);
  const [reducido, setReducido] = useState(false);

  const activa = sobre ?? fijada;
  const region = activa ? POR_ID[activa] : null;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducido(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    setGl(hayWebgl());
    setListo(true);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFijada(null);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  return (
    <div className="lienzo">
      <div className="escena">
        {listo && gl ? (
          <Canvas
            dpr={[1, 2]}
            frameloop={reducido ? "demand" : "always"}
            camera={{ fov: 34, near: 0.1, far: 20, position: [3.2, 0.16, 0] }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
            }}
          >
            <Escena
              activa={activa}
              onActiva={setSobre}
              encarar={fijada}
              reducido={reducido}
            />
          </Canvas>
        ) : (
          // Telón mientras arranca, y sustituto permanente si no hay WebGL.
          // La ficha y la leyenda de abajo siguen funcionando: sin lienzo se
          // pierde la ilustración, no el contenido.
          <div className="sin-lienzo" role="img" aria-label="Cerebro humano">
            <span aria-hidden>◍</span>
            {listo && !gl && (
              <p>
                Tu navegador no tiene WebGL disponible. El mapa de regiones
                sigue completo aquí abajo.
              </p>
            )}
          </div>
        )}

        {listo && gl && (
          <p className="pista" aria-hidden>
            Arrastra para girar
          </p>
        )}
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
              Señala una región sobre el modelo —o elígela en la lista— para
              ver qué hace y un dato que probablemente no sabías.
            </p>
            <div className="ficha-nota ficha-nota-reposo">
              <span className="ficha-nota-marca" aria-hidden>
                i
              </span>
              <p>
                Los cordones que se encienden entre regiones no son
                decorativos: siguen las conexiones funcionales reales de cada
                zona.
              </p>
            </div>
          </>
        )}
      </aside>

      <ul className="leyenda">
        {REGIONES.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className={`chip tono-${r.tono}${activa === r.id ? " activa" : ""}`}
              aria-pressed={fijada === r.id}
              onFocus={() => setFijada(r.id)}
              onClick={() => setFijada((f) => (f === r.id ? null : r.id))}
              onMouseEnter={() => setSobre(r.id)}
              onMouseLeave={() => setSobre(null)}
            >
              <span className="chip-marca" aria-hidden />
              {r.nombre}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
