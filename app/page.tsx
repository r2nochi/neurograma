import { Cerebro } from "@/components/Cerebro";

export default function Page() {
  return (
    <main>
      <header>
        <p className="rotulo">Neurograma · anatomía interactiva</p>
        <h1 className="titular">
          Kilo y medio de tejido que <em>se pregunta</em> cómo funciona.
        </h1>
        <p className="entrada">
          Cada región del cerebro hace algo distinto, y casi ninguna hace lo que
          uno supondría. Recorre el mapa y descubre qué se rompe cuando se rompe
          cada parte.
        </p>
      </header>

      <Cerebro />

      <footer className="pie">
        <span>
          Ilustración dibujada en SVG · sin modelos ni imágenes importadas
        </span>
        <span>
          <a href="https://github.com/r2nochi">David Nochi</a> · Lima
        </span>
      </footer>
    </main>
  );
}
