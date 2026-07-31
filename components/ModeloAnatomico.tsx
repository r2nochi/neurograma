"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  crearTransformacionHra,
  esMallaVisible,
  prepararMallaHra,
  regionSemantica,
} from "@/lib/modelo-anatomico";

type Props = {
  material: THREE.ShaderMaterial;
  reducido: boolean;
  onReady: (triangulos: number) => void;
};

const URL_MODELO = "/models/neurograma-brain.glb?v=3";

/**
 * Superficie anatómica HRA/Allen convertida al sistema de coordenadas de la
 * escena. Todas las piezas comparten un solo material: se conserva el detalle
 * de los surcos sin pagar una compilación de shader por región.
 */
export function ModeloAnatomico({ material, reducido, onReady }: Props) {
  const gltf = useLoader(GLTFLoader, URL_MODELO);
  const entrada = useRef(reducido ? 1 : 0.08);

  const piezas = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(gltf.scene);
    const boxCerebelo = new THREE.Box3();
    const candidatas: THREE.Mesh[] = [];

    gltf.scene.traverse((objeto) => {
      if (!(objeto instanceof THREE.Mesh) || !esMallaVisible(objeto.name)) {
        return;
      }

      candidatas.push(objeto);
      if (regionSemantica(objeto.name) === "cerebelo") {
        boxCerebelo.union(new THREE.Box3().setFromObject(objeto));
      }
    });

    if (!candidatas.length || box.isEmpty()) {
      throw new Error("El GLB no contiene superficies anatómicas reconocibles.");
    }

    const anclaCerebelo = boxCerebelo.isEmpty()
      ? undefined
      : boxCerebelo.getCenter(new THREE.Vector3());
    const normalizacion = crearTransformacionHra(box, anclaCerebelo);

    const geometries = candidatas.map((malla) =>
      prepararMallaHra(
        malla.geometry,
        malla.matrixWorld,
        normalizacion,
        malla.name,
      ),
    );
    const geometria = mergeGeometries(geometries, false);
    geometries.forEach((pieza) => pieza.dispose());

    if (!geometria) {
      throw new Error("Las superficies del GLB no se pudieron combinar.");
    }

    geometria.computeBoundingBox();
    geometria.computeBoundingSphere();
    return geometria;
  }, [gltf]);

  useEffect(() => {
    const triangulos =
      (piezas.index?.count ?? piezas.getAttribute("position").count) / 3;

    document.documentElement.dataset.modelo = "anatomico";
    onReady(Math.round(triangulos));

    return () => {
      piezas.dispose();
      delete document.documentElement.dataset.modelo;
    };
  }, [onReady, piezas]);

  useFrame((_, delta) => {
    if (reducido) {
      entrada.current = 1;
    } else {
      entrada.current +=
        (1 - entrada.current) * (1 - Math.pow(0.0002, Math.min(delta, 0.05)));
    }
    material.uniforms.uEntrada.value = entrada.current;
  });

  return <mesh geometry={piezas} material={material} frustumCulled />;
}
