import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const OUT = "capturas";
mkdirSync(OUT, { recursive: true });
const URL = process.env.URL ?? "http://localhost:3000";

const b = await chromium.launch();
const errs = [];

for (const [nombre, vp] of [
  ["esc", { width: 1440, height: 900 }],
  ["mov", { width: 390, height: 844 }],
]) {
  const p = await b.newPage({ viewport: vp });
  p.on("console", (m) => m.type() === "error" && errs.push(`${nombre}: ${m.text()}`));
  p.on("pageerror", (e) => errs.push(`${nombre}: ${e}`));

  await p.goto(URL, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);

  const desborde = await p.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  console.log(`${nombre}: desborde-x ${desborde}`);

  await p.screenshot({ path: `${OUT}/${nombre}-completa.png`, fullPage: true });

  // El cerebro solo, para juzgar la forma sin el resto de la página.
  const caja = p.locator(".cerebro-caja");
  await caja.scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  await caja.screenshot({ path: `${OUT}/${nombre}-cerebro.png` });

  if (nombre === "esc") {
    // Se apunta al centro anatómico de la región, no al centro de su bounding
    // box: con clip-path, buena parte del rectángulo está recortada y no es
    // señalable — que es justo el comportamiento correcto.
    const caja2 = await caja.boundingBox();
    const proyectar = ([x, y]) => {
      const escala = Math.min(caja2.width / 1000, caja2.height / 760);
      return {
        x: caja2.x + x * escala + (caja2.width - 1000 * escala) / 2,
        y: caja2.y + y * escala + (caja2.height - 760 * escala) / 2,
      };
    };

    // Comprueba que TODAS las regiones responden al pasar por su centro.
    const { REGIONES } = await import("./lib/regiones.mjs").catch(() => ({}));
    const centros = REGIONES ?? [];
    for (const r of centros) {
      const { x, y } = proyectar(r.centro);
      await p.mouse.move(x, y);
      await p.waitForTimeout(120);
      const activa = await p.evaluate(
        () => document.querySelectorAll(".region.activa").length,
      );
      if (activa !== 1) console.log(`  AVISO: ${r.id} no se activó al señalarla`);
    }

    const { x, y } = proyectar([420, 512]); // lóbulo temporal
    await p.mouse.move(x, y);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/${nombre}-hover.png` });

    // fps sobre 120 frames, con la animación activa.
    const fps = await p.evaluate(
      () =>
        new Promise((res) => {
          let n = 0;
          const t0 = performance.now();
          const tic = () => {
            if (++n >= 120)
              return res(Math.round(120000 / (performance.now() - t0)));
            requestAnimationFrame(tic);
          };
          requestAnimationFrame(tic);
        }),
    );
    console.log(`  fps con sinapsis activas: ${fps}`);
  }

  await p.close();
}

console.log("errores:", errs.length ? errs.slice(0, 4) : "ninguno");
await b.close();
