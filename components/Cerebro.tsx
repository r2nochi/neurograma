"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";

import { Escena, hayWebgl } from "@/components/Escena";
import { CEREBRO_VIEW } from "@/lib/visor-cerebro";
import { POR_ID, REGIONES, type RegionId } from "@/lib/regiones";

/**
 * Contenedor de la pieza cerebral.
 *
 * El visor entra directamente en el modelo 3D. `sobre` representa el hover
 * efímero del cursor y `fijada` la región elegida desde la leyenda o teclado.
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
    const esc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFijada(null);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  return (
    <section
      className="cerebro-shell"
      id="atlas"
      data-visor-level={CEREBRO_VIEW.nivelInicial}
      aria-label="Cerebro humano interactivo"
    >
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
              onCreated={({ gl: renderer }) => {
                renderer.outputColorSpace = THREE.SRGBColorSpace;
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.06;
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
            <div className="sin-lienzo" role="img" aria-label="Cerebro humano">
              <span aria-hidden>◍</span>
              {listo && !gl && (
                <p>
                  Tu navegador no tiene WebGL disponible. La información de
                  las regiones sigue completa aquí abajo.
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
                  Los cordones que se encienden entre regiones siguen las
                  conexiones funcionales reales de cada zona.
                </p>
              </div>
            </>
          )}
        </aside>

        <div className="leyenda" aria-label="Regiones del cerebro">
          {REGIONES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip tono-${item.tono}${activa === item.id ? " activa" : ""}`}
              aria-pressed={fijada === item.id}
              onFocus={() => setFijada(item.id)}
              onClick={() => setFijada((current) => (current === item.id ? null : item.id))}
              onMouseEnter={() => setSobre(item.id)}
              onMouseLeave={() => setSobre(null)}
            >
              <span className="chip-marca" aria-hidden />
              {item.nombre}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
