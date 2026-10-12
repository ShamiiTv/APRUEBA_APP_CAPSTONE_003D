# Banco y práctica

Los 33 JSON se normalizaron en UTF-8 y recibieron una revisión editorial posterior. El banco actual tiene 1.419 contenidos únicos: 769 publicados, 59 pendientes y 591 complementarios. Se corrigió contenido en 250 preguntas. Las cantidades anteriores se preservan en sus informes históricos; una variante antes idéntica ahora tiene distractores corregidos y una identidad propia. Los respaldos, las diferencias por pregunta y las limitaciones están en `revision_preguntas/REVISION_CONTENIDO.md` y `revision_contenido.json`, en la raíz del repositorio.

## Actualizar el banco

Desde `aprueba_api`:

1. `npm run questions:check` valida el banco completo sin conectarse a la base.
2. Inicia Firebase local siguiendo `AUTH_SETUP.md` y comprueba que `.env` apunta al proyecto y emuladores deseados.
3. `npm run seed:questions` carga el banco. Los IDs dependen del contenido y se reutilizan en cada ejecución; no se duplican documentos ni se reinician contadores existentes. Las preguntas retiradas que eran administradas por este cargador se archivan.

La práctica exige `bankVersion: 2` y `status: published`. Los documentos aleatorios creados por el cargador anterior se conservan para vincular los historiales antiguos, pero dejan de aparecer en la práctica. No se borran historiales ni se reinician medallas. Los archivos fuente deben indicar `estado_revision: lista` o `pendiente`; los pendientes solo deben aprobarse tras verificar enunciado, alternativas y explicación. «Publicado» no certifica procedencia DEMRE ni constituye revisión académica completa.

La actualización se probó únicamente en un proyecto demo aislado; no se ha cargado el banco en Firebase de producción ni en el proyecto habitual del usuario.

## Comportamiento

- El límite actual continúa en 20 preguntas, reiniciadas por fecha `America/Santiago`. Los bonos y planes se acordarán en su bloque funcional.
- La cuota se valida y consume en la misma transacción que la respuesta, el premio, el historial y los contadores de pregunta.
- Reenviar una pregunta muestra el primer intento, sin cambiar la alternativa ni entregar otro premio.
- El recorrido usa páginas de 100 documentos y selección aleatoria sobre todas las preguntas publicadas elegibles. El resultado distingue banco vacío de banco completado.
- No se devuelve explicación ni respuesta correcta al pedir una pregunta.
- La web aplica prueba y dificultad, cancela solicitudes obsoletas, conserva la explicación del último cupo e informa errores mediante su código de API.
- El banco declara dificultad intermedia: 313 preguntas M1, 162 M2, 171 de lectura y 123 de Biología. Faltan Historia, Física y Química. Las combinaciones sin contenido muestran falta de preguntas, no un logro de finalización.
- La racha se actualiza una vez al día al responder. El tiempo registrado proviene del cliente y no se usa para recompensas ni percentiles.

## Pruebas

`npm test` incluye autenticación y comprobaciones del banco/fecha/identidad. `npm run test:practice:emulator` requiere `PRACTICE_TEST_PROJECT_ID` con prefijo `demo-` y los emuladores en 8080/9099. Carga el banco real en ese proyecto aislado para verificar idempotencia, y comprueba concurrencia, cuota, paginación, casos vacíos y compatibilidad con historiales antiguos. En la web, `npm test` y `npm run build` comprueban las regresiones de sesión y la compilación.

El muestreo recorre todas las preguntas de la prueba; para el tamaño actual permite resultados correctos. Para un banco mucho mayor se debe optimizar la selección e indexación sin volver a limitar incorrectamente el recorrido.
