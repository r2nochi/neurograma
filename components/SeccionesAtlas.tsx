import {
  CIENTIFICOS,
  FUENTES,
  HISTORIA,
  INVESTIGACIONES,
} from "@/lib/contenido";

function FlechaFuente() {
  return (
    <span className="flecha-fuente" aria-hidden>
      ↗
    </span>
  );
}

export function SeccionesAtlas() {
  return (
    <div className="contenido-atlas">
      <section className="seccion seccion-historias" id="historias">
        <div className="seccion-cabecera seccion-cabecera-historias">
          <div>
            <p className="seccion-etiqueta">01 · Historia de una pregunta</p>
            <h2>La ciencia también se dibuja.</h2>
          </div>
          <p className="seccion-lead">
            Cada herramienta cambió la escala del mapa: del trazo de una
            neurona a un atlas de células y conexiones que todavía estamos
            aprendiendo a leer.
          </p>
        </div>

        <div className="linea-tiempo" aria-label="Hitos de la neurociencia">
          {HISTORIA.map((hito, index) => (
            <article className={`hito tono-borde-${hito.tono}`} key={hito.fecha}>
              <div className="hito-cabeza">
                <span className="hito-fecha">{hito.fecha}</span>
                <span className="hito-numero">0{index + 1}</span>
              </div>
              <p className="hito-etiqueta">{hito.etiqueta}</p>
              <h3>{hito.titulo}</h3>
              <p>{hito.resumen}</p>
              <a href={hito.fuente} target="_blank" rel="noreferrer">
                Leer la fuente <FlechaFuente />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="seccion seccion-cientificos" id="cientificos">
        <div className="seccion-cabecera">
          <div>
            <p className="seccion-etiqueta">02 · Personas detrás del mapa</p>
            <h2>Quienes hicieron visible lo invisible.</h2>
          </div>
          <p className="seccion-lead">
            No hay un cerebro que se entienda desde una sola disciplina. Esta
            es una pequeña constelación de anatomistas, neuropsicólogos y
            cirujanos que cambiaron la pregunta.
          </p>
        </div>

        <div className="cientificos-lista">
          {CIENTIFICOS.map((cientifico, index) => (
            <article
              className={`cientifico tono-borde-${cientifico.tono}`}
              key={cientifico.nombre}
            >
              <span className="cientifico-indice">0{index + 1}</span>
              <div>
                <p className="cientifico-disciplina">{cientifico.disciplina}</p>
                <h3>{cientifico.nombre}</h3>
                <p className="cientifico-institucion">{cientifico.institucion}</p>
                <p className="cientifico-aporte">{cientifico.aporte}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="seccion seccion-investigacion" id="investigacion">
        <div className="seccion-cabecera seccion-cabecera-investigacion">
          <div>
            <p className="seccion-etiqueta">03 · La frontera sigue abierta</p>
            <h2>Lo que todavía no sabemos.</h2>
          </div>
          <div className="investigacion-nota">
            <span className="punto-vivo" aria-hidden />
            <p>
              Lectura editorial · agosto de 2026
              <br />
              Los proyectos cambian; cada ficha enlaza a su fuente primaria.
            </p>
          </div>
        </div>

        <div className="investigacion-lista">
          {INVESTIGACIONES.map((investigacion) => (
            <article
              className={`investigacion tono-borde-${investigacion.tono}`}
              key={investigacion.nombre}
            >
              <div className="investigacion-lateral">
                <span className="investigacion-punto" aria-hidden />
                <span>{investigacion.estado}</span>
              </div>
              <div className="investigacion-cuerpo">
                <h3>{investigacion.nombre}</h3>
                <p className="investigacion-pregunta">{investigacion.pregunta}</p>
                <p>{investigacion.resumen}</p>
                <dl className="investigacion-meta">
                  <div>
                    <dt>Responsables</dt>
                    <dd>{investigacion.responsable}</dd>
                  </div>
                  <div>
                    <dt>Institución / programa</dt>
                    <dd>{investigacion.institucion}</dd>
                  </div>
                </dl>
                <a href={investigacion.fuente} target="_blank" rel="noreferrer">
                  Ver proyecto <FlechaFuente />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="seccion seccion-fuentes" id="fuentes">
        <div className="fuentes-intro">
          <p className="seccion-etiqueta">04 · Cómo leer este atlas</p>
          <h2>Una pieza visual, con los pies en la evidencia.</h2>
          <p>
            Neurograma es una experiencia educativa, no una herramienta de
            diagnóstico. El modelo 3D muestra una anatomía de referencia; las
            fichas simplifican funciones para poder recorrerlas y las fuentes
            permiten seguir profundizando.
          </p>
        </div>
        <div className="fuentes-lista">
          {FUENTES.map((fuente, index) => (
            <a
              className="fuente"
              href={fuente.url}
              target="_blank"
              rel="noreferrer"
              key={fuente.url}
            >
              <span className="fuente-indice">0{index + 1}</span>
              <span>
                <strong>{fuente.nombre}</strong>
                <small>{fuente.contexto}</small>
              </span>
              <FlechaFuente />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
