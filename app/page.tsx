import { Cerebro } from "@/components/Cerebro";
import { SeccionesAtlas } from "@/components/SeccionesAtlas";
import { ENLACES_NAV } from "@/lib/navegacion";

export default function Page() {
  return (
    <main>
      <a className="skip-link" href="#atlas">
        Saltar al atlas
      </a>

      <nav className="navegacion" aria-label="Secciones de Neurograma">
        <a className="marca" href="#explorar" aria-label="Neurograma, inicio">
          <span className="marca-punto" aria-hidden />
          <span>Neurograma</span>
        </a>
        <div className="navegacion-enlaces">
          {ENLACES_NAV.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </div>
      </nav>

      <header id="explorar">
        <p className="rotulo">Neurograma · anatomía cerebral interactiva</p>
        <h1 className="titular">
          Kilo y medio de tejido que <em>se pregunta</em> cómo funciona.
        </h1>
        <p className="entrada">
          Explora nueve regiones del cerebro, sigue sus conexiones y descubre
          las historias que hicieron posible dibujar lo que ocurre dentro.
        </p>
        <a className="entrada-accion" href="#atlas">
          Explorar el cerebro <span aria-hidden>↓</span>
        </a>
      </header>

      <Cerebro />

      <SeccionesAtlas />

      <footer className="pie">
        <span>
          Modelo anatómico{" "}
          <a
            href="https://3d.nih.gov/entries/20960/1"
            target="_blank"
            rel="noreferrer"
          >
            HRA / NIH 3D
          </a>{" "}
          · CC BY 4.0
        </span>
        <span>
          <a href="https://github.com/r2nochi">David Nochi</a> · Lima
        </span>
      </footer>
    </main>
  );
}
