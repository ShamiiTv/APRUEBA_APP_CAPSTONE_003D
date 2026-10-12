"""Generate a readable review from recorded decisions."""
import json
from collections import Counter
from review_bank import ROOT

directory=ROOT/'Fase 2/Evidencias Proyecto/Evidencias de documentación/Revisión banco de preguntas'
report=json.loads((directory/'revision_contenido.json').read_text(encoding='utf-8'))
questions=report['preguntas']
counts=Counter(q['prueba'] for q in questions if q['estado']=='lista' and q['uso']=='practica')
text='''# Revisión editorial del banco — 9 de octubre de 2026

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

'''
for label,url in report['fuentes'].items(): text+=f'- [{label}]({url})\n'
text+='\nReferencias normativas específicas: [azúcar](https://www.rae.es/dpd/az%C3%BAcar), [solo](https://www.rae.es/dpd/solo) y [deber](https://www.rae.es/dpd/deber).\n\n## Preguntas que permanecen pendientes\n\n| Referencia | Motivo |\n|---|---|\n'
for q in questions:
    if q['estado']=='pendiente':
        reason=' '.join(q['motivos_pendientes']).replace('|','/')
        text+=f"| {q['id_revision']} ({q['archivo']}, #{q['numero']}) | {reason} |\n"
(directory/'REVISION_CONTENIDO.md').write_text(text,encoding='utf-8')
