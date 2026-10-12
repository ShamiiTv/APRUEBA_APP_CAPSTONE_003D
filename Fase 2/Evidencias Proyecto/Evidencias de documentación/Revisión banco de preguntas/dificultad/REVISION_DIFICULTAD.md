# Clasificación inicial de dificultad

Se revisaron las 1.360 preguntas habilitadas para práctica. Las demás preguntas mantienen su estado editorial y no se publican mediante esta herramienta.

| Propuesta | Cantidad |
| --- | ---: |
| Básica (d1) | 32 |
| Intermedia (d2) | 247 |
| Avanzada (d3) | 7 |
| Pendiente de clasificación manual | 1.074 |
| Clasificación aprobada | 0 |

Estas cantidades describen propuestas de reglas, no dificultad pedagógica certificada. Actualmente el banco carece de dificultad explícita; la aplicación sigue usando d2 como valor predeterminado. No se modificaron los JSON originales, las preguntas de Firestore ni el historial de los estudiantes.

## Rúbrica para revisar cada pregunta

- Básica: aplicar un concepto explícito directamente, localizar información literal o reconocer una estructura/función sin integrar evidencias.
- Intermedia: relacionar conceptos o representaciones, inferir información y encadenar procedimientos conocidos.
- Avanzada: integrar restricciones, modelar situaciones, evaluar argumentos o analizar evidencia/diseño experimental que requiera razonamiento sustantivo.

La evaluación debe considerar la prueba (M1/M2/Lectora/Ciencias), el enunciado completo, los conocimientos previos, el razonamiento de la solución y los distractores. Una palabra como «identificar», la extensión del texto o el nombre de un contenido no bastan para aprobar un nivel. Un contenido de M2 tampoco es automáticamente avanzado dentro de esa prueba.

## Cómo se generó la primera pasada

classify_difficulty.mjs lee los descriptores de habilidad y busca indicadores definidos por materia. Cuando encuentra indicadores de un solo nivel, registra una propuesta y las razones. Cuando hay indicadores de varios niveles o ninguno suficiente, deja proposedLevel=null. Todas las filas conservan reviewStatus=pending_teacher_review, confidence=indicative_only y approvedLevel=null. El hash del ítem permite comprobar que una revisión corresponda a la misma versión de la pregunta.

Esto es un filtro de trabajo para ordenar la revisión, no un clasificador automático validado. Las 1.074 pendientes forman parte del informe: no se ocultan ni se clasifican como intermedias por falta de información.

## Archivos y siguiente paso

- propuestas.json: 1.360 registros, referencia de archivo/posición, enunciado, habilidad, propuesta, razones y estado.
- propuestas.csv: listado para lectura y revisión, separado por punto y coma y con UTF-8.
- Ejecutar desde la raíz: E:/Node/node.exe classify_difficulty.mjs. Regenera los archivos de propuestas; conservar revisiones docentes en otro archivo antes de ejecutarlo nuevamente.

Antes de activar niveles nuevos en práctica, revisar/aprobar cada decisión en un archivo separado, verificar su hash contra el banco y aplicar únicamente aprobaciones explícitas con una migración controlada. La herramienta actual no aplica esas decisiones ni cambia estados editoriales. El funcionamiento del selector de dificultad y el plan diario deben verificarse cuando se incorporen niveles aprobados; no mezclar este informe con métricas de aciertos reales o calibración psicométrica.
