import * as THREE from "three";

export type EstadoTejido = {
  region: number;
  mezcla: number;
  acento: THREE.Color;
  entrada: number;
};

const VERTEX = /* glsl */ `
  attribute float aRegion;
  attribute float aCavidad;

  varying vec3 vNormal;
  varying vec3 vVista;
  varying vec3 vObjeto;
  varying float vRegion;
  varying float vCavidad;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vVista = -mv.xyz;
    vObjeto = position;
    vRegion = aRegion;
    vCavidad = aCavidad;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uActiva;
  uniform float uMezcla;
  uniform float uEntrada;
  uniform vec3 uAcento;
  uniform vec3 uTejido;

  varying vec3 vNormal;
  varying vec3 vVista;
  varying vec3 vObjeto;
  varying float vRegion;
  varying float vCavidad;

  float hash31(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  }

  void main() {
    vec3 N = normalize(vNormal);
    if (!gl_FrontFacing) N = -N;

    vec3 V = normalize(vVista);
    vec3 L = normalize(vec3(-0.42, 0.72, 0.53));
    vec3 F = normalize(vec3(0.62, -0.36, 0.28));
    vec3 H = normalize(L + V);

    float difusa = max(dot(N, L), 0.0);
    float relleno = max(dot(N, F), 0.0);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.7);
    float especular = pow(max(dot(N, H), 0.0), 34.0);
    float variacion = hash31(floor(vObjeto * 92.0)) - 0.5;
    float curva = clamp(length(fwidth(N)) * 0.32, 0.0, 0.34);
    float cavidad = clamp(vCavidad - curva, 0.34, 1.0);
    float seleccion =
      1.0 - smoothstep(0.35, 0.65, abs(vRegion - uActiva));

    vec3 base = uTejido * (1.0 + variacion * 0.055);
    vec3 tenida = mix(base * 0.82, uAcento, 0.58);
    base = mix(base, tenida, seleccion * uMezcla);
    base *= mix(1.0, mix(0.68, 1.0, seleccion), uMezcla);

    vec3 color =
      base * vec3(1.08, 0.91, 0.84) * (0.16 + difusa) * cavidad;
    color +=
      base * vec3(0.48, 0.57, 0.78) * relleno * 0.28 * cavidad;
    color += vec3(0.62, 0.12, 0.10) * fresnel * 0.18;
    color +=
      vec3(1.0, 0.86, 0.78) * especular * 0.24 * cavidad;
    color +=
      vec3(0.26, 0.035, 0.025) *
      max(0.0, dot(-N, L)) *
      0.10;

    gl_FragColor = vec4(color, uEntrada);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function crearMaterialTejido() {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: true,
    uniforms: {
      uActiva: { value: -1 },
      uMezcla: { value: 0 },
      uAcento: { value: new THREE.Color("#4ecdc4") },
      uTejido: { value: new THREE.Color("#b86f68") },
      uEntrada: { value: 1 },
    },
  });
}

export function actualizarTejido(
  material: THREE.ShaderMaterial,
  estado: EstadoTejido,
) {
  material.uniforms.uActiva.value = estado.region;
  material.uniforms.uMezcla.value = estado.mezcla;
  material.uniforms.uAcento.value.copy(estado.acento);
  material.uniforms.uEntrada.value = estado.entrada;
}
