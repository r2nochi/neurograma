/**
 * Las nueve regiones: qué son, qué hacen y dónde caen sobre la malla.
 *
 * `ancla` es un punto en coordenadas del modelo, algo por fuera de la
 * superficie. Sirve para dos cosas: de dónde sale y a dónde llega cada arco
 * sináptico, y hacia dónde gira el cerebro cuando alguien elige la región con
 * el teclado.
 *
 * `conecta` lista relaciones funcionales reales. Los arcos siguen esa lista,
 * no se disparan líneas porque queden bonitas.
 *
 * Los límites geométricos NO viven aquí: viven en `anatomia.ts`, en
 * `regionDe()`. Este archivo es el contenido; aquel es la forma.
 */

import type { RegionId } from "@/lib/anatomia";

export type { RegionId };

export type Region = {
  id: RegionId;
  nombre: string;
  funcion: string;
  /** El dato que hace que alguien se lo cuente a otra persona. */
  curiosidad: string;
  /** Punto flotando sobre la superficie, en coordenadas del modelo. */
  ancla: [number, number, number];
  conecta: RegionId[];
  tono: "coral" | "ambar" | "cian" | "violeta";
};

export const REGIONES: Region[] = [
  {
    id: "frontal",
    nombre: "Lóbulo frontal",
    funcion:
      "Decide, planifica y frena impulsos. Es donde vive el criterio: sopesar consecuencias antes de actuar.",
    curiosidad:
      "Es la última región en terminar de madurar, cerca de los 25 años. Por eso un adolescente y un adulto no evalúan el riesgo igual: literalmente no usan el mismo hardware.",
    ancla: [0.34, 0.14, 0.60],
    conecta: ["motora", "broca", "parietal"],
    tono: "coral",
  },
  {
    id: "motora",
    nombre: "Corteza motora",
    funcion:
      "Ordena cada movimiento voluntario. Una franja estrecha que cruza el cerebro de lado a lado.",
    curiosidad:
      "El espacio que dedica a cada parte del cuerpo no depende del tamaño, sino de la precisión. Manos y labios ocupan más corteza que todo el tronco: por eso escribes fino con los dedos y no con el codo.",
    ancla: [0.38, 0.34, 0.06],
    conecta: ["frontal", "parietal", "cerebelo"],
    tono: "ambar",
  },
  {
    id: "parietal",
    nombre: "Lóbulo parietal",
    funcion:
      "Integra tacto, temperatura y posición. Construye el mapa de dónde está tu cuerpo en el espacio.",
    curiosidad:
      "Cuando cierras los ojos y te tocas la nariz sin fallar, es este lóbulo. Se llama propiocepción y es un sentido tan real como la vista, aunque nadie lo cuente entre los cinco.",
    ancla: [0.38, 0.30, -0.26],
    conecta: ["motora", "occipital", "wernicke"],
    tono: "cian",
  },
  {
    id: "occipital",
    nombre: "Lóbulo occipital",
    funcion:
      "Procesa todo lo que ves: bordes, color, movimiento y profundidad, antes de que sepas qué estás mirando.",
    curiosidad:
      "Está en la nuca, en el extremo opuesto a los ojos. La señal cruza el cerebro entero para llegar aquí. Un golpe en la parte de atrás de la cabeza puede hacerte ver destellos.",
    ancla: [0.28, 0.02, -0.78],
    conecta: ["parietal", "temporal"],
    tono: "violeta",
  },
  {
    id: "temporal",
    nombre: "Lóbulo temporal",
    funcion:
      "Oye, reconoce caras y guarda recuerdos. Aquí dentro está el hipocampo, que decide qué se queda y qué se borra.",
    curiosidad:
      "Un olor puede traerte un recuerdo entero de la infancia, de golpe. El bulbo olfatorio conecta casi directo con esta zona, saltándose el filtro por el que pasan los demás sentidos.",
    ancla: [0.42, -0.28, 0.02],
    conecta: ["wernicke", "occipital", "frontal"],
    tono: "ambar",
  },
  {
    id: "broca",
    nombre: "Área de Broca",
    funcion:
      "Produce el habla: convierte lo que quieres decir en movimiento articulado.",
    curiosidad:
      "Debe su nombre a un paciente que solo podía pronunciar una sílaba: «tan». Entendía todo, pero no lograba decirlo. Al morir en 1861, su autopsia localizó por primera vez una función mental en un punto concreto del cerebro.",
    ancla: [0.40, -0.14, 0.34],
    conecta: ["frontal", "wernicke", "motora"],
    tono: "violeta",
  },
  {
    id: "wernicke",
    nombre: "Área de Wernicke",
    funcion: "Comprende el lenguaje. Da sentido a los sonidos que el oído entrega.",
    curiosidad:
      "Si se daña, la persona sigue hablando con fluidez y entonación normales, pero las palabras dejan de encajar entre sí. Y muchas veces no se da cuenta de que ya no la entienden.",
    ancla: [0.42, -0.13, -0.20],
    conecta: ["temporal", "parietal", "broca"],
    tono: "cian",
  },
  {
    id: "cerebelo",
    nombre: "Cerebelo",
    funcion:
      "Afina el movimiento: equilibrio, coordinación y precisión. Convierte una orden torpe en un gesto exacto.",
    curiosidad:
      "Ocupa el 10% del volumen del cerebro pero contiene más de la mitad de todas sus neuronas. Aprender a andar en bicicleta es escribirlo aquí, y por eso no se olvida.",
    ancla: [0.30, -0.34, -0.80],
    conecta: ["motora", "tronco"],
    tono: "violeta",
  },
  {
    id: "tronco",
    nombre: "Tronco encefálico",
    funcion:
      "Mantiene con vida: respiración, latido, presión y ciclo de sueño. Trabaja sin que se lo pidas.",
    curiosidad:
      "No puedes dejar de respirar voluntariamente hasta desmayarte. Al perder la consciencia, el tronco retoma el control y vuelve a respirar. Tiene la última palabra sobre tu propia voluntad.",
    ancla: [0.17, -0.55, -0.14],
    conecta: ["cerebelo", "temporal"],
    tono: "ambar",
  },
];

export const POR_ID = Object.fromEntries(
  REGIONES.map((r) => [r.id, r]),
) as Record<RegionId, Region>;

/** Los acentos del shader. Coinciden con las variables CSS de la ficha. */
export const TONOS: Record<Region["tono"], [number, number, number]> = {
  coral: [1.0, 0.42, 0.42],
  ambar: [1.0, 0.70, 0.36],
  cian: [0.31, 0.80, 0.77],
  violeta: [0.66, 0.55, 0.98],
};
