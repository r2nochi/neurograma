/**
 * Las regiones del cerebro, en vista lateral izquierda (frente a la izquierda).
 *
 * TÉCNICA: no se dibuja cada lóbulo por separado —eso produjo manchas sueltas
 * que no encajaban—. Se dibuja UNA silueta (`SILUETA`) y los lóbulos se
 * recortan contra ella con un `clipPath`. Así las fronteras casan por
 * construcción y solo hay que acertar con un contorno, no con nueve.
 *
 * Nada de esto viene de un modelo ni de una imagen: son curvas propias, así que
 * no hay licencia que verificar ni megabytes que descargar.
 *
 * `conecta` lista relaciones funcionales reales. La animación de sinapsis usa
 * esa lista, no conexiones inventadas por quedar bonitas.
 */

export type RegionId =
  | "frontal"
  | "motora"
  | "parietal"
  | "occipital"
  | "temporal"
  | "broca"
  | "wernicke"
  | "cerebelo"
  | "tronco";

export type Region = {
  id: RegionId;
  nombre: string;
  funcion: string;
  /** El dato que hace que alguien se lo cuente a otra persona. */
  curiosidad: string;
  path: string;
  /** Ancla del pulso sináptico, en coordenadas del viewBox 1000×760. */
  centro: [number, number];
  conecta: RegionId[];
  tono: "coral" | "ambar" | "cian" | "violeta";
  /** Si se recorta contra la silueta del cerebro. */
  recortada: boolean;
};

/** Contorno del cerebro (hemisferios + lóbulo temporal colgando). */
export const SILUETA =
  "M 202 380 C 194 258 268 156 390 138 C 508 122 640 142 726 206 " +
  "C 796 258 820 330 812 392 C 804 440 772 466 726 460 " +
  "C 664 452 600 454 538 450 C 458 444 366 442 294 434 " +
  "C 232 428 208 420 202 380 Z";

export const REGIONES: Region[] = [
  {
    id: "frontal",
    nombre: "Lóbulo frontal",
    funcion:
      "Decide, planifica y frena impulsos. Es donde vive el criterio: sopesar consecuencias antes de actuar.",
    curiosidad:
      "Es la última región en terminar de madurar, cerca de los 25 años. Por eso un adolescente y un adulto no evalúan el riesgo igual: literalmente no usan el mismo hardware.",
    path: "M 0 0 L 452 0 C 420 220 428 460 400 760 L 0 760 Z",
    centro: [300, 290],
    conecta: ["motora", "broca", "parietal"],
    tono: "coral",
    recortada: true,
  },
  {
    id: "motora",
    nombre: "Corteza motora",
    funcion:
      "Ordena cada movimiento voluntario. Una franja estrecha que cruza el cerebro de lado a lado.",
    curiosidad:
      "El espacio que dedica a cada parte del cuerpo no depende del tamaño, sino de la precisión. Manos y labios ocupan más corteza que todo el tronco: por eso escribes fino con los dedos y no con el codo.",
    path: "M 452 0 L 536 0 C 500 220 496 470 470 760 L 400 760 C 428 460 420 220 452 0 Z",
    centro: [492, 236],
    conecta: ["frontal", "parietal", "cerebelo"],
    tono: "ambar",
    recortada: true,
  },
  {
    id: "parietal",
    nombre: "Lóbulo parietal",
    funcion:
      "Integra tacto, temperatura y posición. Construye el mapa de dónde está tu cuerpo en el espacio.",
    curiosidad:
      "Cuando cierras los ojos y te tocas la nariz sin fallar, es este lóbulo. Se llama propiocepción y es un sentido tan real como la vista, aunque nadie lo cuente entre los cinco.",
    path: "M 536 0 L 692 0 C 674 240 668 470 654 760 L 470 760 C 496 470 500 220 536 0 Z",
    centro: [608, 248],
    conecta: ["motora", "occipital", "wernicke"],
    tono: "cian",
    recortada: true,
  },
  {
    id: "occipital",
    nombre: "Lóbulo occipital",
    funcion:
      "Procesa todo lo que ves: bordes, color, movimiento y profundidad, antes de que sepas qué estás mirando.",
    curiosidad:
      "Está en la nuca, en el extremo opuesto a los ojos. La señal cruza el cerebro entero para llegar aquí. Un golpe en la parte de atrás de la cabeza puede hacerte ver destellos.",
    path: "M 692 0 L 1000 0 L 1000 760 L 654 760 C 668 470 674 240 692 0 Z",
    centro: [758, 352],
    conecta: ["parietal", "temporal"],
    tono: "violeta",
    recortada: true,
  },
  {
    id: "temporal",
    nombre: "Lóbulo temporal",
    funcion:
      "Oye, reconoce caras y guarda recuerdos. Aquí dentro está el hipocampo, que decide qué se queda y qué se borra.",
    curiosidad:
      "Un olor puede traerte un recuerdo entero de la infancia, de golpe. El bulbo olfatorio conecta casi directo con esta zona, saltándose el filtro por el que pasan los demás sentidos.",
    path: "M 300 470 C 372 452 462 452 542 470 C 594 482 618 512 604 542 C 588 574 528 590 452 586 C 372 582 306 558 280 526 C 258 500 268 480 300 470 Z",
    centro: [440, 520],
    conecta: ["wernicke", "occipital", "frontal"],
    tono: "ambar",
    recortada: false,
  },
  {
    id: "broca",
    nombre: "Área de Broca",
    funcion:
      "Produce el habla: convierte lo que quieres decir en movimiento articulado.",
    curiosidad:
      "Debe su nombre a un paciente que solo podía pronunciar una sílaba: «tan». Entendía todo, pero no lograba decirlo. Al morir en 1861, su autopsia localizó por primera vez una función mental en un punto concreto del cerebro.",
    path: "M 306 384 C 336 376 364 384 374 402 C 382 420 370 436 346 442 C 320 448 296 438 288 420 C 280 400 288 390 306 384 Z",
    centro: [332, 412],
    conecta: ["frontal", "wernicke", "motora"],
    tono: "coral",
    recortada: false,
  },
  {
    id: "wernicke",
    nombre: "Área de Wernicke",
    funcion: "Comprende el lenguaje. Da sentido a los sonidos que el oído entrega.",
    curiosidad:
      "Si se daña, la persona sigue hablando con fluidez y entonación normales, pero las palabras dejan de encajar entre sí. Y muchas veces no se da cuenta de que ya no la entienden.",
    path: "M 516 480 C 546 472 574 482 584 500 C 592 518 580 534 556 540 C 528 546 504 536 496 518 C 488 498 498 486 516 480 Z",
    centro: [540, 510],
    conecta: ["temporal", "parietal", "broca"],
    tono: "cian",
    recortada: false,
  },
  {
    id: "cerebelo",
    nombre: "Cerebelo",
    funcion:
      "Afina el movimiento: equilibrio, coordinación y precisión. Convierte una orden torpe en un gesto exacto.",
    curiosidad:
      "Ocupa el 10% del volumen del cerebro pero contiene más de la mitad de todas sus neuronas. Aprender a andar en bicicleta es escribirlo aquí, y por eso no se olvida.",
    path: "M 646 466 C 700 454 754 476 776 516 C 796 552 780 590 740 606 C 698 622 650 610 626 582 C 602 554 610 502 646 466 Z",
    centro: [700, 536],
    conecta: ["motora", "tronco"],
    tono: "violeta",
    recortada: false,
  },
  {
    id: "tronco",
    nombre: "Tronco encefálico",
    funcion:
      "Mantiene con vida: respiración, latido, presión y ciclo de sueño. Trabaja sin que se lo pidas.",
    curiosidad:
      "No puedes dejar de respirar voluntariamente hasta desmayarte. Al perder la consciencia, el tronco retoma el control y vuelve a respirar. Tiene la última palabra sobre tu propia voluntad.",
    path: "M 574 528 C 604 522 626 546 630 582 C 634 620 622 660 600 682 C 580 702 558 696 550 674 C 542 646 550 588 564 556 Z",
    centro: [590, 604],
    conecta: ["cerebelo", "temporal"],
    tono: "ambar",
    recortada: false,
  },
];

export const POR_ID = Object.fromEntries(
  REGIONES.map((r) => [r.id, r]),
) as Record<RegionId, Region>;
