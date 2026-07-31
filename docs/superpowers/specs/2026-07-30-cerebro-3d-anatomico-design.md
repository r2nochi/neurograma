# Neurograma: cerebro 3D anatómico

Fecha: 2026-07-30  
Estado: aprobado para planificación  
Objetivo: elevar el cerebro interactivo a una calidad visual apta para una presentación, sin perder la interacción, accesibilidad ni estabilidad actuales.

## 1. Resultado esperado

La página debe mostrar un cerebro reconocible como una preparación anatómica húmeda bajo iluminación clínica dirigida. La silueta, los surcos y las circunvoluciones deben proceder de una malla anatómica real, no de ruido procedural.

Al mover el cursor sobre el modelo:

- la rotación automática se detiene;
- la región situada bajo el cursor se resalta;
- el resto del cerebro permanece visible como contexto;
- la ficha lateral muestra el nombre, función y curiosidad de la región.

El arrastre, la inercia, la selección desde la leyenda, el enfoque por teclado, `Escape`, `prefers-reduced-motion` y la alternativa sin WebGL se conservarán.

## 2. Fuente anatómica y licencia

La fuente principal será **Brain, Male** del Human Reference Atlas, publicado en NIH 3D:

- entrada: <https://3d.nih.gov/entries/20960/1>;
- procedencia: Allen Human Reference Atlas 3D;
- contenido declarado: cerebro completo construido a partir de 141 estructuras anatómicas;
- licencia: Creative Commons Attribution 4.0 International.

La aplicación incluirá una atribución visible y breve en el pie. También se conservará un archivo de atribución junto al asset con el título, autores, fuente, URL, licencia y descripción de las transformaciones realizadas.

No se usará un modelo cuya descarga requiera credenciales en producción ni uno cuya licencia no sea explícita.

## 3. Estrategia de assets

El modelo descargado se inspeccionará antes de integrarlo. Se identificarán las mallas que forman la superficie cortical, el cerebelo y el tronco encefálico, descartando para esta vista las estructuras internas que no sean visibles y solo aumenten el coste.

El asset final se almacenará localmente bajo `public/models/`; la página no dependerá de NIH ni de otro proveedor durante la ejecución.

La optimización tendrá estos objetivos:

- conservar la silueta y los surcos principales;
- eliminar nodos, materiales y estructuras internas que no se dibujen;
- eliminar atributos de vértice que no se consuman;
- reducir la cantidad de triángulos solo hasta donde la silueta siga siendo limpia;
- evitar texturas de alta resolución si el material procedural ofrece mejor relación entre calidad y peso;
- producir un `.glb` autocontenido y comprimido cuando la compatibilidad del navegador lo permita.

El objetivo operativo es mantener la malla visible por debajo de aproximadamente 180.000 triángulos en escritorio y usar una variante más ligera si la versión fuente supera de forma material ese presupuesto. La decisión final se tomará a partir de capturas comparativas y medición, no solo del número.

## 4. Arquitectura del render

`Cerebro.tsx` seguirá siendo el límite cliente y el propietario del estado de interacción:

- `sobre`: selección efímera por cursor;
- `fijada`: selección persistente desde leyenda o teclado;
- `activa = sobre ?? fijada`;
- detección de WebGL y movimiento reducido.

`Escena.tsx` seguirá controlando cámara, rotación, inercia, enfoque de una región, animación de uniformes y raycasting. La carga y preparación del GLB se aislará en un módulo o componente de modelo, para no mezclar parsing de assets con el bucle de interacción.

La geometría procedural existente se conservará como respaldo. Se mostrará mientras el GLB se carga y permanecerá disponible si la carga o preparación del modelo anatómico falla. Un fallo de asset no deberá dejar el lienzo vacío ni eliminar el contenido textual.

No se añadirá una librería completa de controles de cámara ni una librería de postprocesado si el resultado puede lograrse con React Three Fiber y Three.js existentes.

## 5. Registro de regiones y selección

La nueva malla necesita conservar las nueve regiones actuales:

- lóbulo frontal;
- corteza motora;
- lóbulo parietal;
- lóbulo occipital;
- lóbulo temporal;
- área de Broca;
- área de Wernicke;
- cerebelo;
- tronco encefálico.

Durante la preparación de la geometría se normalizará su orientación y escala a un sistema de coordenadas documentado. Cada vértice visible recibirá un atributo `aRegion` calculado sobre esas coordenadas. Las fronteras se ajustarán a la nueva anatomía y se comprobarán visualmente desde la vista lateral izquierda.

Para el raycasting se utilizará una geometría simplificada o una estructura de aceleración solo si la medición demuestra que la malla final provoca retrasos perceptibles. El punto de impacto se transformará a coordenadas locales y se clasificará con la misma función de regiones utilizada para colorear.

Las áreas pequeñas de Broca y Wernicke se evaluarán en el punto exacto de impacto y no solo a partir del índice del vértice más cercano. Las nueve regiones deben ser alcanzables tanto con cursor como con teclado.

## 6. Material de tejido

El cerebro usará un material personalizado que combine una respuesta físicamente plausible con controles artísticos específicos para tejido blando. El shader incluirá:

- base rosada ligeramente desaturada, con sombras vino y luces melocotón;
- variación de color de baja amplitud en espacio del objeto para evitar una superficie plástica uniforme;
- rugosidad media con especular ancho y contenido, similar a una membrana húmeda;
- Fresnel suave para separar la silueta del fondo;
- refuerzo de oclusión en los fondos de los surcos;
- contraluz rojiza dependiente de la orientación, como aproximación económica a dispersión subsuperficial;
- microdetalle normal procedural de amplitud muy baja, sin deformar la silueta;
- mezcla animada hacia el color de la región activa.

El resaltado no reemplazará por completo el color del tejido. La región activa conservará relieve, especular y sombras, mientras el resto se atenuará solo lo suficiente para establecer jerarquía.

El shader tendrá una ruta compatible con WebGL 1. No dependerá de extensiones experimentales ni de características exclusivas de WebGPU.

## 7. Iluminación y composición

La escena simulará una pieza anatómica en una vitrina oscura:

- luz principal cálida desde arriba y al frente;
- relleno frío débil desde el lado opuesto;
- contraluz rojiza muy controlada para perfilar el tejido;
- sombra de contacto bajo el cerebro para darle peso;
- fondo índigo oscuro sin elementos gráficos que compitan con el modelo.

La cámara conservará la vista lateral izquierda inicial y se recalculará a partir del `boundingBox` real del modelo. El cerebro debe ocupar la mayor parte útil del lienzo sin recortar cerebelo ni tronco en escritorio o móvil.

No se añadirá bloom general. Si se mantiene el pulso de las conexiones, su intensidad se limitará para que no haga parecer artificial el tejido.

## 8. Estados y manejo de errores

Estados previstos:

1. **Carga:** se muestra el modelo procedural actual, sin bloquear controles ni contenido.
2. **Listo:** el modelo anatómico sustituye al respaldo con una transición breve de opacidad si no hay movimiento reducido.
3. **Fallo de asset:** se mantiene el modelo procedural y se registra un error diagnóstico en desarrollo.
4. **Sin WebGL:** se conserva la alternativa DOM existente.
5. **Movimiento reducido:** no hay giro automático, inercia prolongada, transición de modelo ni pulso viajero.

La atribución y el texto educativo no dependen de que WebGL funcione.

## 9. Rendimiento

El presupuesto de calidad se evaluará en escritorio y viewport móvil:

- objetivo de 60 fps en el equipo de referencia;
- interacción de hover sin retraso visible;
- `devicePixelRatio` limitado a 2 en escritorio y reducido cuando sea necesario en móvil;
- ausencia de asignaciones por fotograma evitables;
- materiales, geometrías y texturas liberados al desmontar;
- asset servido localmente y cacheable;
- sin nuevas dependencias de ejecución salvo que una medición justifique su coste.

Si el modelo optimizado no cumple el presupuesto, el orden de reducción será:

1. eliminar geometría interna;
2. reducir DPR en móvil;
3. simplificar microdetalle y luces del shader;
4. introducir una malla de menor resolución;
5. reducir la cantidad de triángulos visibles.

No se degradará primero la precisión de selección ni la accesibilidad.

## 10. Interfaz

La estructura editorial existente se mantendrá. El cerebro será el elemento memorable; la interfaz no competirá con él.

Ajustes permitidos:

- recalibrar el fondo y los halos para el nuevo material;
- mejorar la sombra de contacto;
- ajustar el tamaño del lienzo y el encuadre;
- hacer más clara la indicación de arrastre;
- ajustar colores de chips para que coincidan con el resaltado del shader;
- añadir la atribución del modelo en el pie.

No se cambiarán la arquitectura de la página, el contenido principal ni el vocabulario de las regiones salvo para corregir una inconsistencia demostrable.

## 11. Verificación

Antes de considerar terminado el cambio se comprobará:

- `next build` sin errores;
- ausencia de errores y advertencias relevantes en consola;
- compilación correcta de shaders;
- carga correcta del GLB desde producción;
- cerebro visible y correctamente encuadrado;
- rotación automática y pausa durante hover;
- arrastre e inercia;
- resaltado y ficha correctos para las nueve regiones;
- selección con teclado y liberación con `Escape`;
- comportamiento con `prefers-reduced-motion`;
- alternativa sin WebGL;
- viewport de escritorio y móvil sin desbordamiento horizontal;
- comparación visual mediante capturas del estado base y de una región activa;
- medición de fps, triángulos dibujados, peso del asset y tiempo aproximado hasta el primer modelo anatómico.

## 12. Criterios de aceptación

La implementación queda aceptada cuando:

- la silueta y los pliegues se perciben anatómicos y no como roca o coliflor;
- el material se lee como tejido blando húmedo, sin parecer plástico o metálico;
- seleccionar una región conserva el volumen y relieve del modelo;
- todas las interacciones existentes continúan funcionando;
- las nueve regiones son alcanzables con cursor y teclado;
- el sitio continúa siendo útil ante fallo del asset o ausencia de WebGL;
- el rendimiento medido es adecuado para una presentación fluida;
- la atribución CC BY 4.0 queda visible y documentada.

## 13. Fuera de alcance

- convertir Neurograma en un atlas clínico certificado;
- mostrar las 141 estructuras internas del modelo HRA;
- cortes sagitales, coronales o axiales;
- vasos sanguíneos, nervios craneales o patologías;
- WebXR;
- edición manual avanzada de la malla en Blender salvo que sea indispensable para separar la superficie visible;
- afirmar precisión diagnóstica o sustituir material médico profesional.
