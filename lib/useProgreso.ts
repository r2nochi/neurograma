"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Progreso 0..1 del scroll a través de un elemento alto.
 *
 * 0 = el elemento acaba de llegar arriba del viewport
 * 1 = su último píxel acaba de salir por arriba
 *
 * Se lee en rAF para no forzar layout en cada evento de scroll. Con
 * `prefers-reduced-motion` devuelve 1 fijo: todas las escenas se muestran ya
 * resueltas, sin animación intermedia.
 */
export function useProgreso<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    const menosMovimiento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (menosMovimiento.matches) {
      setProgreso(1);
      return;
    }

    let frame = 0;
    let ultimo = -1;

    const medir = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;

      const { top, height } = el.getBoundingClientRect();
      const recorrido = height - window.innerHeight;
      if (recorrido <= 0) return;

      const valor = Math.min(1, Math.max(0, -top / recorrido));
      // Evita renders por cambios imperceptibles.
      if (Math.abs(valor - ultimo) < 0.002) return;
      ultimo = valor;
      setProgreso(valor);
    };

    const alScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", alScroll, { passive: true });
    window.addEventListener("resize", alScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", alScroll);
      window.removeEventListener("resize", alScroll);
    };
  }, []);

  return { ref, progreso };
}

/** Reescala `v` desde el tramo [a,b] al tramo [0,1], recortando fuera. */
export function tramo(v: number, a: number, b: number) {
  if (b === a) return v >= b ? 1 : 0;
  return Math.min(1, Math.max(0, (v - a) / (b - a)));
}

/** Suavizado clásico: arranca y termina con velocidad cero. */
export function suave(t: number) {
  return t * t * (3 - 2 * t);
}
