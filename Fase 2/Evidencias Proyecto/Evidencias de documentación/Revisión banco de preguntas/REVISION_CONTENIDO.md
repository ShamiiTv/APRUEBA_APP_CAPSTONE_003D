Actualización del 10-10-2026: por indicación del responsable del proyecto se incluyen las 591 preguntas listas entregadas por Alloxentric que antes se conservaban como complementarias. La práctica dispone de 1.360 preguntas y mantiene 59 pendientes por ambigüedad. Las etiquetas editoriales y el informe del 9 de octubre que sigue se conservan como registro histórico; sus exclusiones y conteos ya no describen la disponibilidad actual.

# Revisión editorial del banco — 9 de octubre de 2026

Se registraron decisiones para los 33 archivos y sus 1.419 preguntas. Se corrigió contenido en **250 preguntas**, además de asignar prueba y uso pedagógico. Las **166 preguntas pendientes del informe anterior** tienen una decisión registrada. No quedan alternativas literalmente repetidas. Esta revisión editorial y de coherencia no certifica procedencia oficial DEMRE, dificultad, cobertura completa ni validez psicométrica.

## Resultado que aplica la API

| Estado | Cantidad | Se ofrece en práctica |
|---|---:|---|
| Lista y dentro del alcance de práctica | 769 | Sí |
| Pendiente por ambigüedad | 59 | No |
| Lista como material complementario | 591 | No |
| Total de contenidos únicos | 1.419 | |

La clasificación complementaria afecta a 633 preguntas: 591 listas y 42 que además están pendientes. Las categorías de estado anteriores son exclusivas; las 633 complementarias no deben sumarse nuevamente al total.

| Prueba | Preguntas habilitadas |
|---|---:|
| Matemática M1 | 313 |
| Matemática M2 | 162 |
| Competencia Lectora | 171 |
| Ciencias: Biología | 123 |
| Historia | 0 |

La clasificación inicial procede de contrastar los temas con los temarios DEMRE 2027. Cálculo, complejos, matrices, cónicas, trigonometría inversa y vectores avanzados se conservan fuera de práctica. Los ejercicios aislados de ortografía, gramática y terminología literaria también se conservan como complementarios. Los microtextos habilitados son práctica introductoria: no sustituyen lecturas extensas ni un ensayo PAES. La clasificación por patrones requiere revisión editorial al incorporar nuevas preguntas.

## Correcciones realizadas

- Claves numéricas equivocadas, ecuaciones cuyo resultado no estaba entre las opciones y explicaciones que modificaban los datos originales para justificar la respuesta.
- Distractores equivalentes: fracciones reducidas, raíces, orden de soluciones y expresiones algebraicas distintas con el mismo valor.
- Precisión biológica: transporte de membrana, ADN bicatenario, ribosomas, centrosomas, fotosíntesis, respiración y regulación hormonal.
- Preguntas verbales con usos normativos variables, opciones solapadas o inferencias que el fragmento no permite. Cuando la solución exige inventar contexto, se mantiene pendiente.

Ejemplos verificables: matemática 2, pregunta 3 cambia la clave a C; matemática 12, pregunta 9 pasa a D (7√2). Matemática 3, pregunta 2 conserva área 56 y ofrece ancho 2√15−2, en vez de cambiar el área para forzar una opción. Matemática 10, pregunta 6 deja de ofrecer 2/3 y 4/6 como opciones distintas. Verbal 3, pregunta 15 evalúa la contradicción entre promesa y actuación sin atribuir una intención irónica que el texto no demuestra.

## Registro y respaldos

- `revision_contenido.json`: decisión por pregunta, archivo e índice, razones y diferencias de cada campo con su valor anterior. Los índices corresponden al banco normalizado, no al JSON original con claves duplicadas.
- `banco_antes_revision_contenido.zip`: los 33 JSON inmediatamente anteriores a esta revisión.
- `preguntas_originales.zip`: originales anteriores a la primera reparación; no se sobrescribieron sus informes.
- `verificacion_matematica.json`: comprobación simbólica auxiliar de 118 ejercicios; 13 expresiones no reconocidas quedan informadas. Usa una región positiva para variables y no demuestra dominios completos. La revisión manual conserva las condiciones del enunciado.

`review_bank_edits.py` aplica la edición inicial una sola vez; `finalize_bank_review.py` agrega las comprobaciones posteriores preservando diferencias originales. No deben ejecutarse como cargadores de Firebase. `verify_bank_math.py` requiere SymPy como herramienta opcional local; no se agregó una dependencia a la aplicación.

## Validación funcional

`npm run questions:check` valida 1.419 contenidos únicos: 769 publicados, 59 pendientes y 591 complementarios. La API usa `prueba` para separar M1/M2 y excluye los estados pendientes y complementarios al obtener y al responder preguntas. La carga preserva estadísticas, historiales y medallas; los IDs de preguntas editadas cambian y los anteriores se archivan sin borrar el historial.

Pasaron 20 pruebas de API, 7 de práctica contra emuladores Firebase y 6 de sesión web. La web compiló correctamente. Se probó únicamente con proyectos `demo-` aislados; no se actualizó Firebase de producción. Estos checks no certifican los demás módulos de la web.

## Límites y trabajo pendiente

El banco tiene solo dificultad intermedia. Falta contenido de Historia, Física y Química y cobertura equilibrada de habilidades, especialmente textos completos de lectura. Las 59 preguntas siguientes necesitan reformulación o contexto; permanecen bloqueadas. Este banco no debe presentarse como preguntas oficiales DEMRE ni como ensayo calibrado.

## Fuentes consultadas

- [m1](https://demre.cl/publicaciones/pdf/2027-26-03-19-temario-paes-regular-m1.pdf)
- [m2](https://demre.cl/publicaciones/pdf/2027-26-03-19-temario-paes-regular-m2.pdf)
- [lectora](https://demre.cl/publicaciones/pdf/2027-26-03-19-temario-paes-regular-competencia-lectora.pdf)
- [celula](https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells)
- [membrana](https://openstax.org/books/biology-2e/pages/5-2-passive-transport)
- [lipidos](https://openstax.org/books/biology-2e/pages/3-3-lipids)
- [rae](https://www.rae.es/dpd/)

Referencias normativas específicas: [azúcar](https://www.rae.es/dpd/az%C3%BAcar), [solo](https://www.rae.es/dpd/solo) y [deber](https://www.rae.es/dpd/deber).

## Preguntas que permanecen pendientes

| Referencia | Motivo |
|---|---|
| v1:17 (preguntas paes chile verbal 1.json, #17) | Varias oraciones usan sino correctamente y otra usa si no; la clave todas no responde a la categoría solicitada. |
| v1:23 (preguntas paes chile verbal 1.json, #23) | Salgamos puede analizarse como presente de subjuntivo con valor exhortativo; opciones de modo y función se solapan. |
| v11:3 (preguntas PAES chile verbal 11.json, #3) | Caracter y carácteres contienen errores distintos; falta delimitar singular/plural. |
| v11:4 (preguntas PAES chile verbal 11.json, #4) | Metáfora y paradoja son defendibles con sueño despierto; se necesita reformular la tarea. |
| v11:20 (preguntas PAES chile verbal 11.json, #20) | Analogía y símil se superponen en el fragmento. |
| v12:8 (preguntas PAES chile verbal 12.json, #8) | La vanidad y la soledad del poder no se distinguen inequívocamente en el fragmento. |
| v12:16 (preguntas PAES chile verbal 12.json, #16) | Varias opciones describen paso del tiempo, envejecimiento e identidad; falta una inferencia única. |
| v12:17 (preguntas PAES chile verbal 12.json, #17) | Más de una construcción con punto y coma puede ser válida; el contexto es insuficiente. |
| v12:22 (preguntas PAES chile verbal 12.json, #22) | Un aviso de empleo no es necesariamente instructivo sin su contenido. |
| v12:28 (preguntas PAES chile verbal 12.json, #28) | La pobreza descrita puede ser literal, no necesariamente hipérbole. |
| v13:6 (preguntas PAES chile verbal 13.json, #6) | Baca, bello y bien se escriben con b; no hay opción única. |
| v13:15 (preguntas PAES chile verbal 13.json, #15) | La función del lenguaje en un diálogo teatral depende del fragmento, que no se proporciona. |
| v13:18 (preguntas PAES chile verbal 13.json, #18) | B y E confunden a ver y haber; hay dos errores. |
| v13:25 (preguntas PAES chile verbal 13.json, #25) | Conque se usa como causal en varias opciones; requiere una consecuencia inequívoca. |
| v13:27 (preguntas PAES chile verbal 13.json, #27) | Se miraron admite interpretación reflexiva y recíproca sin más contexto. |
| v13:33 (preguntas PAES chile verbal 13.json, #33) | C tiene además error de persona; no demuestra la diferencia de aspecto solicitada. |
| v13:40 (preguntas PAES chile verbal 13.json, #40) | A y C usan solo sin tilde como adverbio; hay dos respuestas válidas. |
| v13:41 (preguntas PAES chile verbal 13.json, #41) | Llegaste puede solicitar información o mantener contacto; falta contexto comunicativo. |
| v13:44 (preguntas PAES chile verbal 13.json, #44) | El enunciado invierte deber/deber de y la norma admite usos que la explicación rechaza. |
| v13:47 (preguntas PAES chile verbal 13.json, #47) | Una afirmación aislada no permite distinguir texto expositivo de argumentativo. |
| v14:3 (preguntas PAES chile verbal 14.json, #3) | C y E usan mí correctamente como pronombre. |
| v14:16 (preguntas PAES chile verbal 14.json, #16) | La comparación con como y la personificación pueden coexistir; falta delimitar. |
| v14:25 (preguntas PAES chile verbal 14.json, #25) | A y C usan sino correctamente. |
| v14:37 (preguntas PAES chile verbal 14.json, #37) | El sentido consecutivo de conque no está claramente separado del causal. |
| v14:43 (preguntas PAES chile verbal 14.json, #43) | Analogía y símil son respuestas solapadas. |
| v14:44 (preguntas PAES chile verbal 14.json, #44) | La pregunta dice número, pero el error no es de número: es el artículo ante a tónica. |
| v15:10 (preguntas PAES chile verbal 15 .json, #10) | A y D puntúan correctamente el vocativo. |
| v15:17 (preguntas PAES chile verbal 15 .json, #17) | A, B y E son construcciones concesivas válidas. |
| v15:22 (preguntas PAES chile verbal 15 .json, #22) | B y E contienen interrogativas indirectas. |
| v15:25 (preguntas PAES chile verbal 15 .json, #25) | El uso consecutivo de conque requiere reformulación; no se justifica la clave por descarte. |
| v15:29 (preguntas PAES chile verbal 15 .json, #29) | Según mi opinión y según el pronóstico pueden ser válidos. |
| v15:33 (preguntas PAES chile verbal 15 .json, #33) | A y D usan sino correctamente. |
| v15:41 (preguntas PAES chile verbal 15 .json, #41) | A y E pueden puntuar correctamente la enumeración compleja. |
| v15:50 (preguntas PAES chile verbal 15 .json, #50) | Felices es predicativo subjetivo opcional, no obligatorio; falta la opción correcta. |
| v16:3 (preguntas PAES chile verbal 16.json, #3) | D y E escriben él correctamente como pronombre. |
| v16:6 (preguntas PAES chile verbal 16.json, #6) | B y C escriben té bebida correctamente; B tiene otro error que el enunciado no pregunta. |
| v16:12 (preguntas PAES chile verbal 16.json, #12) | Peinarse puede ser reflexivo o recíproco en plural sin contexto. |
| v16:17 (preguntas PAES chile verbal 16.json, #17) | Aun así significa pese a eso, no incluso; no aparece una opción inequívoca con el sentido pedido. |
| v16:20 (preguntas PAES chile verbal 16.json, #20) | Analogía y símil se superponen en este fragmento. |
| v16:34 (preguntas PAES chile verbal 16.json, #34) | Densidad del silencio permite varias lecturas figuradas; no hay respuesta exclusiva. |
| v16:47 (preguntas PAES chile verbal 16.json, #47) | Ojalá y que llueva pueden expresar deseo; hay dos respuestas. |
| v17:9 (preguntas PAES chile verbal 17.json, #9) | Un discurso de despedida no es necesariamente argumentativo; falta el contenido. |
| v17:17 (preguntas PAES chile verbal 17.json, #17) | Varias opciones usan hay; otra usa ay. Todas no resuelve la pregunta sobre hay. |
| v17:27 (preguntas PAES chile verbal 17.json, #27) | La atribución de una bofetada al silencio puede ser metáfora; sinestesia no es exclusiva. |
| v2:4 (preguntas PAES chile verbal 2.json, #4) | Varias opciones incluyen pronombres indirectos correctamente usados; falta delimitar la aparición evaluada. |
| v3:26 (preguntas PAES chile verbal 3.json, #26) | Llueve mucho y la exclamación pueden clasificarse como unimembres según el marco gramatical. |
| v5:5 (preguntas PAES chile verbal 5.json, #5) | Trasporte también es variante admitida; no hay una única palabra bien escrita. |
| v5:8 (preguntas PAES chile verbal 5.json, #8) | Ven, vení y venga son imperativos válidos para distintos tratamientos; falta especificar destinatario. |
| v5:15 (preguntas PAES chile verbal 5.json, #15) | El fragmento no obliga a interpretar una paradoja; requiere replantear el objetivo de lectura. |
| v5:18 (preguntas PAES chile verbal 5.json, #18) | La idea principal no está sintetizada por ninguna opción: adaptación de TV al cambio de hábitos juveniles. |
| v6:12 (preguntas PAES chile verbal 6.json, #12) | Habrá personas y haber problemas son usos existenciales correctos. |
| v6:26 (preguntas PAES chile verbal 6.json, #26) | No hay una elipsis inequívoca que permita distinguir las opciones. |
| v6:27 (preguntas PAES chile verbal 6.json, #27) | La norma actual no permite marcar deber de obligación como error universal sin contexto. |
| v8:1 (preguntas PAES chile verbal 8.json, #1) | El fragmento admite análisis de comparación y metáfora; requiere delimitar qué relación se evalúa. |
| v8:28 (preguntas PAES chile verbal 8.json, #28) | Analogía y metáfora se superponen en las opciones para este fragmento. |
| v9:10 (preguntas PAES chile verbal 9.json, #10) | Analogía y símil se solapan; no hay una respuesta exclusiva con el enunciado actual. |
| v9:15 (preguntas PAES chile verbal 9.json, #15) | Servicio y casa contienen c; falta delimitar el significado o la palabra buscada. |
| v9:16 (preguntas PAES chile verbal 9.json, #16) | Llueve mucho también puede clasificarse como unimembre; el marco de análisis no está indicado. |
| v10:9 (preguntas PAES verbal Chile 10.json, #9) | Varias alternativas pueden representar posterioridad; hay que distinguir consecuencia inmediata de evento independiente. |
