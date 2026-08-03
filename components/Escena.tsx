"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { LimiteModelo } from "@/components/LimiteModelo";
import { ModeloAnatomico } from "@/components/ModeloAnatomico";
import { INDICE, ORDEN, regionDe, type RegionId } from "@/lib/anatomia";
import {
  construirCerebelo,
  construirCorteza,
  construirTronco,
  fundir,
  type Malla,
} from "@/lib/geometria";
import {
  actualizarTejido,
  crearMaterialTejido,
} from "@/lib/material-tejido";
import { POR_ID, REGIONES, TONOS } from "@/lib/regiones";

// --------------------------------------------------------------- shaders

const ARCO_VERTEX = /* glsl */ `
  attribute float aOrigen;
  attribute float aT;
  attribute float aFase;

  varying vec3 vNormal;
  varying vec3 vVista;
  varying float vOrigen;
  varying float vT;
  varying float vFase;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vVista = -mv.xyz;
    vOrigen = aOrigen;
    vT = aT;
    vFase = aFase;
    gl_Position = projectionMatrix * mv;
  }
`;

const ARCO_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uActiva;
  uniform float uMezcla;
  uniform float uPulso;
  uniform float uQuieto;   // 1 con movimiento reducido: el pulso no viaja
  uniform vec3 uAcento;

  varying vec3 vNormal;
  varying vec3 vVista;
  varying float vOrigen;
  varying float vT;
  varying float vFase;

  void main() {
    float vivo = (1.0 - step(0.5, abs(vOrigen - uActiva))) * uMezcla;

    float d = abs(fract(vT - uPulso - vFase) - 0.0);
    d = min(d, 1.0 - d);
    float chispa = exp(-d * d / 0.0016);

    // Con movimiento reducido no hay pulso viajero: el cordón se enciende
    // entero y se lee igual de bien, solo que quieto.
    float brillo = mix(0.14 + 0.86 * chispa, 0.62, uQuieto);

    float halo = pow(1.0 - abs(dot(normalize(vNormal), normalize(vVista))), 1.5);

    // Alfa 0 a propósito: el color ya va premultiplicado y la mezcla de abajo
    // lo suma directo. Escribir alfa 1 sobre un lienzo transparente pintaba
    // los cordones apagados de NEGRO OPACO en vez de dejarlos invisibles.
    gl_FragColor = vec4(uAcento * (brillo + halo * 0.45) * vivo, 0.0);
  }
`;

// ------------------------------------------------------------ geometrías

function aGeometria(m: Malla) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(m.posiciones, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(m.normales, 3));
  g.setAttribute("aRegion", new THREE.BufferAttribute(m.regiones, 1));
  g.setAttribute("aCavidad", new THREE.BufferAttribute(m.huecos, 1));
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  g.computeBoundingSphere();
  return g;
}

/**
 * Los arcos sinápticos: un tubo por cada conexión declarada en `conecta`.
 *
 * Van todos en UNA geometría con un atributo `aOrigen`, en vez de una malla
 * por arco. Así el resaltado es un cambio de uniform y no 24 cambios de
 * visibilidad en el árbol de React.
 */
function construirArcos() {
  const pos: number[] = [];
  const nor: number[] = [];
  const org: number[] = [];
  const tt: number[] = [];
  const fase: number[] = [];
  const idx: number[] = [];

  const SEG = 26;
  const RAD = 6;
  const GROSOR = 0.0115;

  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const C = new THREE.Vector3();
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const n1 = new THREE.Vector3();
  const n2 = new THREE.Vector3();
  const arriba = new THREE.Vector3(0, 1, 0);

  for (const region of REGIONES) {
    region.conecta.forEach((destinoId, k) => {
      const destino = POR_ID[destinoId];
      A.fromArray(region.ancla);
      B.fromArray(destino.ancla);

      // El punto de control se empuja hacia fuera del centro: el arco pasa
      // por encima de la superficie en vez de atravesar el tejido.
      C.addVectors(A, B).multiplyScalar(0.5);
      const largo = C.length() || 1;
      C.multiplyScalar((largo + 0.34) / largo);

      const base = pos.length / 3;

      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const u = 1 - t;

        p.set(0, 0, 0)
          .addScaledVector(A, u * u)
          .addScaledVector(C, 2 * u * t)
          .addScaledVector(B, t * t);

        // Derivada de la Bézier cuadrática.
        tan
          .set(0, 0, 0)
          .addScaledVector(A, -2 * u)
          .addScaledVector(C, 2 * (u - t))
          .addScaledVector(B, 2 * t)
          .normalize();

        n1.crossVectors(tan, arriba);
        if (n1.lengthSq() < 1e-6) n1.set(1, 0, 0);
        n1.normalize();
        n2.crossVectors(tan, n1).normalize();

        // Se afila en los extremos: el cordón nace y muere en el tejido.
        const grosor = GROSOR * (0.35 + 0.65 * Math.sin(Math.PI * t) ** 0.5);

        for (let j = 0; j < RAD; j++) {
          const a = (j / RAD) * Math.PI * 2;
          const nx = n1.x * Math.cos(a) + n2.x * Math.sin(a);
          const ny = n1.y * Math.cos(a) + n2.y * Math.sin(a);
          const nz = n1.z * Math.cos(a) + n2.z * Math.sin(a);
          pos.push(p.x + nx * grosor, p.y + ny * grosor, p.z + nz * grosor);
          nor.push(nx, ny, nz);
          org.push(INDICE[region.id]);
          tt.push(t);
          fase.push(k * 0.28);
        }
      }

      for (let i = 0; i < SEG; i++) {
        for (let j = 0; j < RAD; j++) {
          const j2 = (j + 1) % RAD;
          const a = base + i * RAD + j;
          const b = base + i * RAD + j2;
          const c = base + (i + 1) * RAD + j;
          const d = base + (i + 1) * RAD + j2;
          idx.push(a, c, b, b, c, d);
        }
      }
    });
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("aOrigen", new THREE.Float32BufferAttribute(org, 1));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(tt, 1));
  g.setAttribute("aFase", new THREE.Float32BufferAttribute(fase, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// --------------------------------------------------------------- escena

const NEUTRO = new THREE.Color(0.42, 0.50, 0.72);

type Props = {
  activa: RegionId | null;
  onActiva: (id: RegionId | null) => void;
  /** Región elegida desde la leyenda: el cerebro gira para encararla. */
  encarar: RegionId | null;
  reducido: boolean;
};

export function Escena({
  activa,
  onActiva,
  encarar,
  reducido,
}: Props) {
  const { camera, gl, size, invalidate } = useThree();

  const giro = useRef({ y: -0.22, z: 0.05, vy: 0, vz: 0, arrastrando: false });
  const suave = useRef({
    mezcla: 0,
    activa: -1,
    pulso: 0,
    acento: new THREE.Color(...TONOS.cian),
  });
  const grupoY = useRef<THREE.Group>(null);
  const grupoZ = useRef<THREE.Group>(null);
  const camaraObjetivo = useRef(new THREE.Vector3(3.2, 0.16, 0));
  const miradaObjetivo = useRef(new THREE.Vector3(0, -0.03, 0));

  // --- geometría: se calcula una vez, en el cliente ---------------------
  const geo = useMemo(
    () => ({
      corteza: aGeometria(construirCorteza(5)),
      cerebelo: aGeometria(construirCerebelo(3)),
      tronco: aGeometria(construirTronco()),
      // Proxy invisible para el cursor: la misma forma sin pliegues, 1 280
      // caras en vez de 20 480. El relieve es de ±0,04, así que señalar sobre
      // la forma base es indistinguible — y cuesta veinte veces menos.
      proxy: aGeometria(
        fundir([
          construirCorteza(3, false),
          construirCerebelo(2, false),
          construirTronco(10, 10),
        ]),
      ),
      arcos: construirArcos(),
    }),
    [],
  );

  const mat = useMemo(() => crearMaterialTejido(), []);

  const matArcos = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ARCO_VERTEX,
        fragmentShader: ARCO_FRAGMENT,
        uniforms: {
          uActiva: { value: -1 },
          uMezcla: { value: 0 },
          uPulso: { value: 0 },
          uQuieto: { value: 0 },
          uAcento: { value: new THREE.Color(...TONOS.cian) },
        },
        transparent: true,
        depthWrite: false,
        // Aditivo PREMULTIPLICADO, con el canal alfa intacto. El
        // `AdditiveBlending` de serie usa SrcAlpha también para el alfa, así
        // que sobre un lienzo transparente los cordones apagados escribían
        // alfa 1 con color 0: negro opaco atravesando la escena.
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
        blendEquationAlpha: THREE.AddEquation,
        blendSrcAlpha: THREE.ZeroFactor,
        blendDstAlpha: THREE.OneFactor,
      }),
    [],
  );

  const matProxy = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        transparent: true,
        opacity: 0,
      }),
    [],
  );

  const caras = useCallback(
    (g: THREE.BufferGeometry) =>
      (g.index?.count ?? g.getAttribute("position").count) / 3,
    [],
  );

  const carasProcedurales = useMemo(
    () =>
      caras(geo.corteza) +
      caras(geo.cerebelo) +
      caras(geo.tronco) +
      caras(geo.arcos),
    [caras, geo],
  );

  // El estado y el recuento se publican en el DOM para que la verificación
  // compruebe qué ruta se montó de verdad, no qué ruta esperábamos montar.
  useEffect(() => {
    document.documentElement.dataset.modelo = "cargando";
    document.documentElement.dataset.caras =
      `${Math.round(carasProcedurales)} en respaldo · ${Math.round(caras(geo.proxy))} en el proxy`;
    return () => {
      delete document.documentElement.dataset.modelo;
      delete document.documentElement.dataset.caras;
    };
  }, [caras, carasProcedurales, geo.proxy]);

  const registrarModelo = useCallback(
    (triangulos: number) => {
      document.documentElement.dataset.caras =
        `${triangulos} anatómicos · ${Math.round(caras(geo.arcos))} en conexiones · ${Math.round(caras(geo.proxy))} en el proxy`;
    },
    [caras, geo.arcos, geo.proxy],
  );

  const registrarFalloModelo = useCallback(() => {
    document.documentElement.dataset.modelo = "procedural-error";
    document.documentElement.dataset.caras =
      `${Math.round(carasProcedurales)} en respaldo · ${Math.round(caras(geo.proxy))} en el proxy`;
  }, [caras, carasProcedurales, geo.proxy]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      mat.dispose();
      matArcos.dispose();
      matProxy.dispose();
    },
    [geo, mat, matArcos, matProxy],
  );

  // --- encuadre: el cerebro cabe entero a cualquier proporción ----------
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspecto = size.width / Math.max(1, size.height);
    const t = Math.tan((cam.fov * Math.PI) / 360);
    // El modelo médico incluye el tronco, por lo que necesita algo más de
    // margen vertical que la antigua pieza procedural.
    const dist = Math.max(1.12 / (aspecto * t), 1.0 / t);
    camaraObjetivo.current.set(dist, 0.08, 0);
    miradaObjetivo.current.set(0, -0.03, 0);
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);

  // --- arrastre para girar ---------------------------------------------
  useEffect(() => {
    const lienzo = gl.domElement;
    let ultimo = { x: 0, y: 0, t: 0 };

    const abajo = (e: PointerEvent) => {
      giro.current.arrastrando = true;
      giro.current.vy = 0;
      giro.current.vz = 0;
      ultimo = { x: e.clientX, y: e.clientY, t: performance.now() };
      lienzo.setPointerCapture(e.pointerId);
      lienzo.style.cursor = "grabbing";
    };

    const mover = (e: PointerEvent) => {
      if (!giro.current.arrastrando) return;
      const dt = Math.max(8, performance.now() - ultimo.t) / 1000;
      const dx = e.clientX - ultimo.x;
      const dy = e.clientY - ultimo.y;
      // Arrastrar a la derecha gira hacia la derecha: el eje de pantalla
      // horizontal es -z del mundo, de ahí el signo.
      giro.current.y -= dx * 0.008;
      giro.current.z = Math.min(0.55, Math.max(-0.55, giro.current.z - dy * 0.006));
      giro.current.vy = (-dx * 0.008) / dt;
      giro.current.vz = (-dy * 0.006) / dt;
      ultimo = { x: e.clientX, y: e.clientY, t: performance.now() };
      invalidate();
    };

    const arriba = (e: PointerEvent) => {
      if (!giro.current.arrastrando) return;
      giro.current.arrastrando = false;
      lienzo.releasePointerCapture?.(e.pointerId);
      lienzo.style.cursor = "grab";
    };

    lienzo.style.cursor = "grab";
    lienzo.style.touchAction = "pan-y";
    lienzo.addEventListener("pointerdown", abajo);
    lienzo.addEventListener("pointermove", mover);
    lienzo.addEventListener("pointerup", arriba);
    lienzo.addEventListener("pointercancel", arriba);
    return () => {
      lienzo.removeEventListener("pointerdown", abajo);
      lienzo.removeEventListener("pointermove", mover);
      lienzo.removeEventListener("pointerup", arriba);
      lienzo.removeEventListener("pointercancel", arriba);
    };
  }, [gl, invalidate]);

  useEffect(() => {
    invalidate();
  }, [activa, encarar, invalidate]);

  // --- bucle -------------------------------------------------------------
  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    const g = giro.current;
    const s = suave.current;
    const pasoCamara = reducido ? 1 : 1 - Math.pow(0.0008, dt);

    camera.position.lerp(camaraObjetivo.current, pasoCamara);
    camera.lookAt(miradaObjetivo.current);

    // Rotación libre. Se detiene mientras hay una región abierta: quien está
    // leyendo la ficha no quiere que el sujeto se le escape de la vista.
    const auto = !reducido && !g.arrastrando && !activa ? 0.19 : 0;
    if (!g.arrastrando) {
      const freno = Math.pow(0.015, dt);
      g.vy *= freno;
      g.vz *= freno;
      g.y += (g.vy + auto) * dt;
      g.z = Math.min(0.55, Math.max(-0.55, g.z + g.vz * dt));
    }

    // Al elegir desde la leyenda, el cerebro encara la región.
    if (encarar) {
      const a = POR_ID[encarar].ancla;
      const objetivo = Math.atan2(a[2], a[0]);
      let d = (objetivo - g.y) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      const paso = reducido ? 1 : 1 - Math.pow(0.002, dt);
      g.y += d * paso;
      g.z += (0.06 - g.z) * paso;
    }

    if (grupoY.current) grupoY.current.rotation.y = g.y;
    if (grupoZ.current) grupoZ.current.rotation.z = g.z;

    // Índice de la región activa. Se mantiene el ÚLTIMO valor mientras se
    // apaga: si se pusiera a -1 de golpe, `sel` valdría 0 en toda la malla y
    // el cerebro entero se atenuaría durante la salida.
    if (activa) {
      s.activa = INDICE[activa];
      s.acento.setRGB(...TONOS[POR_ID[activa].tono]);
      matArcos.uniforms.uAcento.value.copy(s.acento);
    }
    const destino = activa ? 1 : 0;
    // 0,18 s de entrada y de salida. Nada de retardo: la lección del hover
    // muerto es que un resalte que tarda se siente roto.
    const vel = reducido ? 1 : 1 - Math.pow(0.0008, dt);
    s.mezcla += (destino - s.mezcla) * vel;
    if (s.mezcla < 0.002 && !activa) s.activa = -1;

    if (!reducido) s.pulso = (s.pulso + dt * 0.55) % 1;

    actualizarTejido(mat, {
      region: s.activa,
      mezcla: s.mezcla,
      acento: s.acento,
      entrada: 1,
    });

    matArcos.uniforms.uActiva.value = s.activa;
    matArcos.uniforms.uMezcla.value = s.mezcla;
    matArcos.uniforms.uPulso.value = s.pulso;
    matArcos.uniforms.uQuieto.value = reducido ? 1 : 0;
  });

  // --- selección con el cursor -------------------------------------------
  /**
   * Qué región hay bajo el cursor.
   *
   * El atributo del vértice NO basta para la corteza: el proxy tiene 642
   * vértices y las áreas del lenguaje son parches de pocos milímetros, así
   * que Broca y Wernicke serían inalcanzables. En cambio el punto de impacto
   * está en las mismas coordenadas que usa `regionDe()` —el proxy es la
   * forma moldeada, solo que sin pliegues—, así que la frontera se evalúa
   * exacta y sin depender de la resolución de la malla.
   *
   * El atributo sí sirve para lo que resuelve bien: distinguir cerebelo y
   * tronco, que son mallas aparte con un índice constante.
   */
  const señalar = (e: {
    face?: THREE.Face | null;
    point: THREE.Vector3;
    object: THREE.Object3D;
  }) => {
    if (giro.current.arrastrando) return;
    const attr = (e.object as THREE.Mesh).geometry.getAttribute("aRegion");
    if (!attr || !e.face) return;

    const bruto = Math.round(attr.getX(e.face.a));
    let id: RegionId | undefined;
    if (bruto === INDICE.cerebelo || bruto === INDICE.tronco) {
      id = ORDEN[bruto];
    } else {
      const p = e.object.worldToLocal(e.point.clone());
      id = ORDEN[regionDe(p.x, p.y, p.z)];
    }
    if (id && id !== activa) onActiva(id);
  };

  const respaldo = (
    <group scale={[1.85, 1, 1]}>
      <mesh geometry={geo.corteza} material={mat} />
      <mesh geometry={geo.cerebelo} material={mat} />
      <mesh geometry={geo.tronco} material={mat} />
    </group>
  );

  return (
    <group ref={grupoZ}>
      <group ref={grupoY}>
            <Suspense fallback={null}>
              <LimiteModelo fallback={respaldo} onError={registrarFalloModelo}>
                <ModeloAnatomico
                  material={mat}
                  reducido={reducido}
                  onReady={registrarModelo}
                />
              </LimiteModelo>
            </Suspense>

            <mesh
              geometry={geo.arcos}
              material={matArcos}
              renderOrder={2}
              scale={[1.85, 1, 1]}
            />

        {/* Proxy de selección: no pinta nada (colorWrite off) pero recibe el
            rayo. Separarlo de la malla visible baja el coste del hover de
            20 480 pruebas de triángulo a 1 780. */}
            {
              <mesh
                geometry={geo.proxy}
                material={matProxy}
                renderOrder={-1}
                scale={[1.85, 1, 1]}
                onPointerMove={señalar}
                onPointerOut={() => onActiva(null)}
              />
            }
        </group>
      </group>
  );
}

/** Se usa desde el contenedor para saber si merece la pena montar el lienzo. */
export function hayWebgl() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export { NEUTRO };
