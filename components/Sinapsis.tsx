"use client";

import { useEffect, useRef } from "react";

import { POR_ID, type RegionId } from "@/lib/regiones";

type Pulso = {
  desde: [number, number];
  hasta: [number, number];
  t: number;
  vel: number;
  tono: string;
};

const TONOS: Record<string, string> = {
  coral: "255, 107, 107",
  ambar: "255, 179, 92",
  cian: "78, 205, 196",
  violeta: "167, 139, 250",
};

/**
 * Los pulsos sinápticos que salen de la región activa hacia las regiones con
 * las que se conecta de verdad (`region.conecta`), no hacia las que quedarían
 * bonitas.
 *
 * Va en canvas y no en SVG porque son decenas de partículas por frame: el DOM
 * no es el sitio para eso.
 */
export function Sinapsis({ activa }: { activa: RegionId | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // La región activa se lee desde el bucle de render sin re-suscribirlo.
  const activaRef = useRef<RegionId | null>(activa);
  activaRef.current = activa;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let ultimoDisparo = 0;
    const pulsos: Pulso[] = [];

    const medir = () => {
      const { width, height } = canvas.getBoundingClientRect();
      // dpr acotado a 2: en un movil con dpr 3 serian 9x mas pixeles.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width, height };
    };

    let { width, height } = medir();
    const alRedimensionar = () => ({ width, height } = medir());
    window.addEventListener("resize", alRedimensionar);

    // El viewBox del SVG es 1000x760; se mapea al tamaño real del canvas
    // conservando proporción, igual que hace preserveAspectRatio.
    const proyectar = ([x, y]: [number, number]): [number, number] => {
      const escala = Math.min(width / 1000, height / 760);
      const dx = (width - 1000 * escala) / 2;
      const dy = (height - 760 * escala) / 2;
      return [x * escala + dx, y * escala + dy];
    };

    const disparar = (ahora: number) => {
      const id = activaRef.current;
      if (!id || ahora - ultimoDisparo < 220) return;
      ultimoDisparo = ahora;
      const region = POR_ID[id];
      for (const destinoId of region.conecta) {
        const destino = POR_ID[destinoId];
        pulsos.push({
          desde: proyectar(region.centro),
          hasta: proyectar(destino.centro),
          t: 0,
          vel: 0.014 + Math.min(0.01, pulsos.length * 0.0004),
          tono: TONOS[region.tono],
        });
      }
    };

    const pintar = (ahora: number) => {
      frame = requestAnimationFrame(pintar);
      ctx.clearRect(0, 0, width, height);

      if (!quieto) disparar(ahora);

      for (let i = pulsos.length - 1; i >= 0; i--) {
        const p = pulsos[i];
        p.t += p.vel;
        if (p.t >= 1) {
          pulsos.splice(i, 1);
          continue;
        }

        const x = p.desde[0] + (p.hasta[0] - p.desde[0]) * p.t;
        const y = p.desde[1] + (p.hasta[1] - p.desde[1]) * p.t;
        // Se apaga al llegar, para que el destino no parpadee.
        const vida = Math.sin(p.t * Math.PI);

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${p.tono}, ${vida * 0.28})`;
        ctx.lineWidth = 1;
        ctx.moveTo(p.desde[0], p.desde[1]);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.tono}, ${vida})`;
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.tono}, ${vida * 0.16})`;
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    frame = requestAnimationFrame(pintar);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", alRedimensionar);
    };
  }, []);

  return <canvas ref={ref} className="sinapsis" aria-hidden />;
}
