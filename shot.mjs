/**
 * Verificación de "Neurograma".
 *
 * Reporta: desborde horizontal, errores de consola, fps (GPU libre, CPU x4
 * y móvil), qué GPU se usó de verdad, si las nueve regiones responden, y —lo
 * más importante— si el lienzo DIBUJA el cerebro.
 *
 * Esa última comprobación no es paranoia. Un error de compilación de GLSL
 * deja el lienzo vacío, y como no hay nada que rasterizar el contador de
 * requestAnimationFrame sube a 60 fps limpios: el fallo se disfraza de
 * éxito. Aquí se decodifica el PNG del lienzo, se mide su desviación típica
 * y se cuenta qué fracción de píxeles NO son fondo. Sin varianza y sin
 * superficie no hay pieza, por muy bueno que sea el fps.
 *
 *   URL=http://localhost:3000 node shot.mjs
 *   CABEZA=1 node shot.mjs      # con ventana, para medir sobre GPU real
 */
import { mkdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { chromium } from "playwright";

const OUT = "capturas";
mkdirSync(OUT, { recursive: true });
const URL = process.env.URL ?? "http://localhost:3000";

// ------------------------------------------------- decodificador PNG mínimo
/** Deshace el filtrado por scanline de un PNG de 8 bits. */
function pixelesPng(buf) {
  let off = 8;
  let ancho = 0;
  let alto = 0;
  let tipo = 0;
  let prof = 8;
  const partes = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const nombre = buf.toString("ascii", off + 4, off + 8);
    const datos = buf.subarray(off + 8, off + 8 + len);
    if (nombre === "IHDR") {
      ancho = datos.readUInt32BE(0);
      alto = datos.readUInt32BE(4);
      prof = datos[8];
      tipo = datos[9];
    } else if (nombre === "IDAT") partes.push(datos);
    else if (nombre === "IEND") break;
    off += 12 + len;
  }
  const canales = { 0: 1, 2: 3, 4: 2, 6: 4 }[tipo];
  if (prof !== 8 || !canales) return null;

  const cruda = inflateSync(Buffer.concat(partes));
  const paso = ancho * canales;
  const out = Buffer.alloc(alto * paso);
  let pos = 0;
  for (let y = 0; y < alto; y++) {
    const f = cruda[pos++];
    const linea = cruda.subarray(pos, pos + paso);
    pos += paso;
    const dest = out.subarray(y * paso, (y + 1) * paso);
    const arriba = y > 0 ? out.subarray((y - 1) * paso, y * paso) : null;
    for (let i = 0; i < paso; i++) {
      const a = i >= canales ? dest[i - canales] : 0;
      const b = arriba ? arriba[i] : 0;
      const c = arriba && i >= canales ? arriba[i - canales] : 0;
      let v = linea[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      dest[i] = v & 255;
    }
  }
  return { ancho, alto, canales, datos: out };
}

/**
 * Desviación típica, tonos distintos y —clave en una pieza 3D— qué fracción
 * de la imagen es tejido y no fondo. Un cerebro renderizado como un punto de
 * veinte píxeles pasaría el test de varianza y aun así estaría roto.
 */
function estadisticas(buf, umbralFondo = 46) {
  const img = pixelesPng(buf);
  if (!img) return null;
  const { ancho, alto, canales, datos } = img;
  let n = 0;
  let s = 0;
  let s2 = 0;
  let cuerpo = 0;
  const tonos = new Set();
  for (let y = 0; y < alto; y += 2) {
    for (let x = 0; x < ancho; x += 2) {
      const i = y * ancho * canales + x * canales;
      const l = (datos[i] * 299 + datos[i + 1] * 587 + datos[i + 2] * 114) / 1000;
      s += l;
      s2 += l * l;
      n++;
      tonos.add(Math.round(l));
      if (l > umbralFondo) cuerpo++;
    }
  }
  const media = s / n;
  return {
    media: +media.toFixed(1),
    desv: +Math.sqrt(Math.max(0, s2 / n - media * media)).toFixed(1),
    tonos: tonos.size,
    cuerpo: +((cuerpo / n) * 100).toFixed(1),
  };
}

// ------------------------------------------------------------------ arranque
// Chromium headless cae a SwiftShader (rasterizado por software) y ahí un fps
// no significa nada. Con CABEZA=1 se abre con ventana y usa la GPU real; ese
// es el número que vale para el presupuesto.
const conCabeza = process.env.CABEZA === "1";
const navegador = await chromium.launch({
  headless: !conCabeza,
  args: [
    "--ignore-gpu-blocklist",
    "--enable-gpu-rasterization",
    ...(conCabeza ? ["--use-angle=d3d11"] : ["--enable-unsafe-swiftshader"]),
  ],
});

const errores = [];
const avisos = [];
const BENIGNO = /GPU stall due to ReadPixels|THREE\.Clock: This module has been deprecated/;

const registrar = (etiqueta, p) => {
  p.on("console", (m) => {
    const t = m.text();
    // Los errores de compilación de GLSL de three llegan por aquí; se
    // recogen aunque el tipo no sea exactamente "error".
    if (m.type() === "error" || /THREE|Shader Error|WebGL/i.test(t)) {
      const linea = `${etiqueta}: ${t.slice(0, 220)}`;
      (BENIGNO.test(t) ? avisos : errores).push(linea);
    }
  });
  p.on("pageerror", (e) => errores.push(`${etiqueta}: ${e}`));
};

const MUESTRAS_FPS = 60;
const medirFps = (p) =>
  p.evaluate(
    (muestras) =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const tic = () => {
          if (++n >= muestras)
            return res(Math.round((muestras * 1000) / (performance.now() - t0)));
          requestAnimationFrame(tic);
        };
        requestAnimationFrame(tic);
      }),
    MUESTRAS_FPS,
  );

/**
 * Recorte del lienzo, para juzgarlo sin el texto de alrededor.
 *
 * Primero lo centra en pantalla: `screenshot({clip})` recorta contra el
 * VIEWPORT, no contra la página. Sin este scroll el cerebro sale cortado por
 * abajo y la captura miente sobre la silueta — que es justo lo que hay que
 * juzgar aquí.
 */
const cajaEscena = async (p) => {
  await p.evaluate(() =>
    document.querySelector(".escena").scrollIntoView({ block: "center" }),
  );
  await p.waitForTimeout(450);
  return p.evaluate(() => {
    const c = document.querySelector(".escena").getBoundingClientRect();
    return {
      x: Math.round(c.x),
      y: Math.round(c.y),
      width: Math.round(c.width),
      height: Math.round(Math.min(c.height, window.innerHeight - c.y)),
    };
  });
};

const rotulo = async (p) => ((await p.textContent(".ficha-rotulo")) ?? "").trim();

const esperarModelo = async (p, timeout = 15000) => {
  try {
    await p.waitForFunction(
      () =>
        document.documentElement.dataset.modelo === "anatomico" ||
        document.documentElement.dataset.modelo === "procedural-error",
      undefined,
      { timeout },
    );
  } catch {
    // El estado exacto se reporta abajo como error; aquí evitamos ocultar el
    // resto del diagnóstico si el asset no termina de cargar.
  }
  return p.evaluate(() => document.documentElement.dataset.modelo);
};

// ------------------------------------------------------- escritorio y móvil
for (const [nombre, vp] of [
  ["esc", { width: 1440, height: 900 }],
  ["mov", { width: 390, height: 844 }],
]) {
  const p = await navegador.newPage({ viewport: vp });
  registrar(nombre, p);

  await p.goto(URL, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const modoModelo = await esperarModelo(p);
  await p.waitForTimeout(350);

  if (nombre === "esc") {
    if (modoModelo !== "anatomico") {
      errores.push(
        `esc: modelo activo = ${modoModelo ?? "sin estado"}, se esperaba anatomico`,
      );
    }
  }

  const desborde = await p.evaluate(() => ({
    hay: document.documentElement.scrollWidth > window.innerWidth + 1,
    ancho: document.documentElement.scrollWidth,
    ventana: window.innerWidth,
  }));
  console.log(
    `\n${nombre} ${vp.width}x${vp.height}: desborde-x ${desborde.hay ? "SI" : "no"} ` +
      `(scrollWidth ${desborde.ancho} / innerWidth ${desborde.ventana})`,
  );

  if (nombre === "esc") {
    const gpu = await p.evaluate(() => {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) return "sin webgl";
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);
    });
    console.log(`  renderizador: ${gpu}`);
    const caras = await p.evaluate(
      () => document.documentElement.dataset.caras ?? "?",
    );
    console.log(`  triángulos generados: ${caras}`);
  }

  await p.screenshot({ path: `${OUT}/${nombre}-01-completa.png` });

  // ¿Hay un cerebro ahí? Varianza Y superficie ocupada.
  const cuerpo = await p.screenshot({
    path: `${OUT}/${nombre}-02-cuerpo.png`,
    clip: await cajaEscena(p),
  });
  const cuerpoStats = estadisticas(cuerpo);
  console.log(
    `  silueta: desv ${cuerpoStats?.desv} · ${cuerpoStats?.tonos} tonos · ` +
      `${cuerpoStats?.cuerpo}% de superficie`,
  );

  const caja = await cajaEscena(p);
  const lienzo = await p.screenshot({ path: `${OUT}/${nombre}-02-cerebro.png`, clip: caja });
  const e = estadisticas(lienzo);
  const dibuja = e && e.desv > 6 && e.tonos > 30 && e.cuerpo > 10;
  console.log(
    `  lienzo: media ${e?.media} · desv ${e?.desv} · ${e?.tonos} tonos · ` +
      `${e?.cuerpo}% de superficie → ${dibuja ? "el cerebro se dibuja" : "PLANO O VACÍO — revisar"}`,
  );

  if (nombre === "esc") {
    const fps = await medirFps(p);
    console.log(`  fps (${MUESTRAS_FPS} frames, GPU libre): ${fps}`);

    const cdp = await p.context().newCDPSession(p);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await p.waitForTimeout(700);
    const fpsLento = await medirFps(p);
    console.log(`  fps (${MUESTRAS_FPS} frames, CPU x4 mas lenta): ${fpsLento}`);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  } else {
    const fps = await medirFps(p);
    console.log(`  fps movil (${MUESTRAS_FPS} frames): ${fps}`);
  }

  // ------------------------------------------ las nueve regiones responden
  const chips = p.locator(".chip");
  const totalChips = await chips.count();
  const fallan = [];
  for (let i = 0; i < totalChips; i++) {
    const chip = chips.nth(i);
    const nombreChip = ((await chip.textContent()) ?? "").trim();
    await chip.click();
    await p.waitForTimeout(160);
    const leido = await rotulo(p);
    if (leido.toLowerCase() !== nombreChip.toLowerCase()) {
      fallan.push(`${nombreChip} → "${leido}"`);
    }
  }
  console.log(
    `  regiones que responden: ${totalChips - fallan.length}/${totalChips}` +
      (fallan.length ? ` — fallan: ${fallan.join(", ")}` : ""),
  );

  if (nombre === "esc") {
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/esc-03-region.png`, clip: caja });
  }

  await p.close();
}

// --------------------------------------- señalar la malla con el cursor
// Se hace con movimiento reducido: sin giro automático la escena está
// quieta y la rejilla de puntos es determinista.
{
  const p = await navegador.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  registrar("puntero", p);
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await esperarModelo(p);
  await p.waitForTimeout(350);

  const caja = await cajaEscena(p);
  const vistas = new Set();
  // Rejilla ancha a propósito: el tronco encefálico es un blanco de unos
  // treinta píxeles y una malla más gruesa lo pasaría por alto, dando por
  // inalcanzable algo que sí se puede señalar.
  for (let fy = 0.18; fy <= 0.92; fy += 0.06) {
    for (let fx = 0.12; fx <= 0.88; fx += 0.05) {
      await p.mouse.move(caja.x + caja.width * fx, caja.y + caja.height * fy);
      await p.waitForTimeout(40);
      const r = await rotulo(p);
      if (r && !/regiones$/i.test(r)) vistas.add(r);
    }
  }
  console.log(
    `\npuntero sobre la malla: ${vistas.size} regiones distintas alcanzadas ` +
      `→ ${vistas.size >= 5 ? "la malla responde al cursor" : "POCAS — revisar el proxy"}`,
  );
  console.log("  " + [...vistas].join(" · "));
  await p.screenshot({ path: `${OUT}/esc-04-puntero.png`, clip: caja });
  await p.close();
}

// ------------------------------------------------------ movimiento reducido
{
  const p = await navegador.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  registrar("reducido", p);
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await esperarModelo(p);
  await p.waitForTimeout(350);
  const caja = await cajaEscena(p);

  const e = estadisticas(
    await p.screenshot({ path: `${OUT}/esc-05-reducido.png`, clip: caja }),
  );
  console.log(
    `\nreducido: desv ${e?.desv} · ${e?.tonos} tonos · ${e?.cuerpo}% de superficie → ` +
      `${e && e.desv > 6 && e.cuerpo > 10 ? "escena quieta y visible" : "PLANO — revisar"}`,
  );

  // Quieto de verdad: dos capturas separadas en el tiempo deben ser
  // idénticas byte a byte. Un cerebro que sigue girando bajo
  // prefers-reduced-motion incumple el CLAUDE.md aunque se vea bien.
  const a = await p.screenshot({ clip: caja });
  await p.waitForTimeout(1200);
  const b = await p.screenshot({ clip: caja });
  console.log(
    `reducido: fotogramas separados 1,2 s ${a.equals(b) ? "idénticos (quieto)" : "DISTINTOS — sigue animando"}`,
  );
  await p.close();
}

// -------------------------------------------------------------- sin WebGL
{
  const p = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  registrar("sin-webgl", p);
  await p.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (tipo, ...resto) {
      if (String(tipo).includes("webgl")) return null;
      return orig.call(this, tipo, ...resto);
    };
  });
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/esc-06-sin-webgl.png` });

  const hayLienzo = await p.evaluate(() => !!document.querySelector("canvas"));
  // Lo que importa del fallback: el contenido no se pierde. Las regiones
  // siguen alcanzables aunque no haya ilustración.
  const chips = p.locator(".chip");
  await chips.first().click();
  await p.waitForTimeout(150);
  const leido = await rotulo(p);
  console.log(
    `\nsin webgl: lienzo = ${hayLienzo} (debe ser false) · ` +
      `la ficha sigue respondiendo = ${leido ? `sí ("${leido}")` : "NO"}`,
  );
  await p.close();
}

// ------------------------------------------------------ transición del modelo
// El GLB se retrasa a propósito: durante la carga no debe aparecer la malla
// procedural y luego desaparecer cuando llega la superficie anatómica.
{
  const p = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  registrar("carga", p);
  await p.route("**/models/neurograma-brain.glb**", async (route) => {
    const respuesta = await route.fetch();
    const cuerpo = await respuesta.body();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await route.fulfill({ response: respuesta, body: cuerpo });
  });
  await p.goto(URL, { waitUntil: "domcontentloaded" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(750);
  const caja = await cajaEscena(p);
  const estado = await p.evaluate(() => document.documentElement.dataset.modelo);
  const e = estadisticas(
    await p.screenshot({ path: `${OUT}/esc-07-carga.png`, clip: caja }),
  );
  const hayCerebroProvisional = !!e && e.cuerpo > 10;
  console.log(
    `\ncarga retrasada: estado ${estado ?? "sin estado"} · ` +
      `${e?.cuerpo}% de superficie → ` +
      `${hayCerebroProvisional ? "APARECE respaldo durante carga" : "sin reemplazo visual"}`,
  );
  if (hayCerebroProvisional) {
    errores.push("carga: el respaldo procedural aparece mientras llega el GLB");
  }
  await p.close();
}

// --------------------------------------------------------- peso de assets
{
  const p = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  const recursos = [];
  p.on("response", (r) => {
    const t = r.request().resourceType();
    if (["image", "font", "media"].includes(t)) {
      recursos.push([
        t,
        r.url().split("/").pop().slice(0, 46),
        r.headers()["content-length"] ?? "?",
      ]);
    }
  });
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);
  console.log("\nassets (imagen/fuente/media) descargados:");
  for (const r of recursos) console.log("  ", r.join("  "));
  await p.close();
}

console.log(
  "\nerrores de consola:",
  errores.length ? errores.slice(0, 6) : "ninguno",
);
console.log(
  `avisos benignos filtrados: ${avisos.length}` +
    (avisos.length ? ` (p. ej. "${avisos[0].slice(0, 90)}...")` : ""),
);
await navegador.close();
if (errores.length) process.exitCode = 1;
