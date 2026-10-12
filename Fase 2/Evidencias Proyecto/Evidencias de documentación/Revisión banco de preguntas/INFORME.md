# Auditoría de preguntas PAES

Revisión del 9 de octubre de 2026. Los originales no fueron modificados.

## Resultado

- 33 archivos JSON y 1426 preguntas examinadas.
- Ningún archivo completo idéntico a otro. Todos tienen sintaxis JSON interpretable y raíz de tipo arreglo.
- 58 preguntas en 21 archivos contienen claves repetidas con valores distintos. El lector estándar conserva el último valor: la validación básica anterior no detectaba este problema.
- 108 preguntas tienen alternativas textualmente repetidas, normalizando espacios y mayúsculas. No se comprobaron equivalencias algebraicas, por lo que podría haber más alternativas equivalentes.
- 1 par de objetos completamente idénticos, incluido texto de explicación y habilidad.
- 7 pares con el mismo enunciado y alternativas (incluyen el par exacto anterior); sus respuestas finales coinciden. Los otros 6 pares difieren en explicación o habilidad.
- 18 grupos adicionales comparten enunciado pero cambian las alternativas. Son candidatos para revisión manual, no duplicados confirmados.
- No se detectaron campos básicos ausentes, alternativas vacías, respuestas finales fuera de A–E ni señales de codificación corrupta con las comprobaciones implementadas.

La revisión valida estructura y duplicación textual, no certifica todas las soluciones académicas. La numeración de preguntas comienza en 1 dentro de cada archivo.

## Ejemplo de inconsistencia de contenido

`preguntas PAES Chile matematica 3.json`, pregunta 2: la explicación final resuelve un área de 60, mientras el enunciado contiene 56. Para ancho x y largo x+4, x(x+4)=56 tiene solución positiva aproximadamente 5,746; sustituir silenciosamente 56 por 60 no corrige el ítem original. Este caso requiere editar conjuntamente enunciado, alternativas y explicación.

## Preguntas con campos JSON repetidos

| Archivo | Pregunta | Campos repetidos |
|---|---:|---|
| preguntas PAES Chile matematica 3.json | 2 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES Chile matematica 3.json | 3 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES Chile matematica 3.json | 14 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES Chile matematica 3.json | 43 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES Chile matematica 3.json | 44 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematica 5.json | 1 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematica 5.json | 27 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematica 6.json | 6 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematica 6.json | 8 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematica 6.json | 19 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematicas 10.json | 1 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematicas 10.json | 14 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile matematicas 11.json | 1 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile matematicas 11.json | 15 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile matematicas 11.json | 32 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile matematicas 11.json | 45 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile matematicas 13.json | 15 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile matematicas 13.json | 29 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile matematicas 13.json | 43 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematicas 4.json | 12 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematicas 4.json | 34 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematicas 7.json | 18 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematicas 7.json | 38 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematicas 8.json | 16 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematicas 9.json | 30 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematicas 9.json | 35 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematicas 9.json | 36 | respuesta_correcta, explicacion_respuesta |
| preguntas paes chile matematicas 9.json | 43 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 12.json | 13 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 13.json | 29 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 13.json | 36 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 2.json | 29 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 3.json | 5 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 4.json | 14 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 5.json | 3 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 5.json | 12 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 5.json | 17 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 5.json | 25 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 6.json | 2 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 6.json | 3 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 6.json | 7 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 6.json | 9 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 6.json | 23 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 6.json | 24 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 7.json | 12 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 7.json | 16 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 7.json | 19 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 7.json | 22 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 7.json | 29 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 8.json | 16 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 8.json | 30 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 9.json | 3 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 9.json | 6 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 9.json | 19 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 9.json | 22 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES chile verbal 9.json | 26 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES verbal Chile 10.json | 20 | respuesta_correcta, explicacion_respuesta |
| preguntas PAES verbal Chile 10.json | 30 | respuesta_correcta, explicacion_respuesta |

## Preguntas con alternativas repetidas

| Archivo | Preguntas |
|---|---|
| preguntas PAES chile matematica 12.json | 4, 15, 21, 22, 27, 28, 33, 36, 44, 45, 47, 48, 51, 60, 61 |
| preguntas paes chile matematica 5.json | 32, 43, 45 |
| preguntas paes chile matematica 6.json | 24, 46 |
| preguntas paes chile matematicas 10.json | 8, 12, 18, 27, 28, 32, 33, 44, 45, 52 |
| preguntas PAES chile matematicas 11.json | 5, 9, 17, 21, 27, 28, 35, 43, 46, 50, 51, 55, 59, 60 |
| preguntas PAES chile matematicas 13.json | 5, 9, 17, 21, 22, 30, 32, 36, 47, 49, 50, 51, 59, 62 |
| Preguntas PAES Chile matematicas 2.json | 8 |
| preguntas paes chile matematicas 4.json | 3, 20, 43, 46 |
| preguntas paes chile matematicas 7.json | 9, 19, 23, 26, 34, 36 |
| preguntas paes chile matematicas 8.json | 5, 12, 21, 22, 24, 31, 34, 35, 41, 52, 53 |
| preguntas paes chile matematicas 9.json | 4, 5, 22, 23, 24, 28, 33, 39, 46, 52, 53, 54, 59 |
| preguntas PAES chile verbal 11.json | 6 |
| preguntas PAES chile verbal 12.json | 6 |
| preguntas PAES chile verbal 13.json | 48 |
| preguntas PAES chile verbal 15 .json | 21 |
| preguntas PAES chile verbal 16.json | 10 |
| preguntas PAES chile verbal 17.json | 3, 6, 14, 25, 29, 33, 37, 41, 45 |
| preguntas PAES verbal Chile 10.json | 14 |

## Duplicados exactos

- **Resuelve la ecuación trigonométrica: 2 cos x + 1 = 0 para x en [0, 2π).**
  - `preguntas PAES chile matematicas 11.json`, pregunta 49, respuesta final A.
  - `preguntas PAES chile matematicas 13.json`, pregunta 20, respuesta final A.

## Mismo enunciado y alternativas

- **Resuelve la ecuación: √(2x+1) = x-1.**
  - `preguntas paes chile matematica 6.json`, pregunta 45, respuesta final A.
  - `preguntas paes chile matematicas 7.json`, pregunta 39, respuesta final A.
- **Resuelve la ecuación trigonométrica: 2 cos x + 1 = 0 para x en [0, 2π).**
  - `preguntas PAES chile matematicas 11.json`, pregunta 49, respuesta final A.
  - `preguntas PAES chile matematicas 13.json`, pregunta 20, respuesta final A.
- **Se lanzan tres monedas. ¿Cuál es la probabilidad de obtener al menos dos caras?**
  - `preguntas PAES chile matematicas 13.json`, pregunta 34, respuesta final A.
  - `preguntas paes chile matematicas 7.json`, pregunta 28, respuesta final A.
- **Calcula la integral definida ∫₀^{π/4} sec² x dx.**
  - `preguntas PAES chile matematicas 13.json`, pregunta 37, respuesta final A.
  - `preguntas paes chile matematicas 9.json`, pregunta 13, respuesta final A.
- **En la oración 'Necesito que me ayudes', el verbo 'ayudes' está en modo:**
  - `preguntas PAES chile verbal 12.json`, pregunta 27, respuesta final A.
  - `preguntas PAES chile verbal 17.json`, pregunta 16, respuesta final A.
- **En la oración 'Corrió tanto que se cansó', la palabra 'tanto' es un adverbio de:**
  - `preguntas PAES chile verbal 12.json`, pregunta 31, respuesta final A.
  - `preguntas PAES chile verbal 14.json`, pregunta 45, respuesta final A.
- **En la oración 'Espero que todo salga bien', el verbo 'salga' está en modo:**
  - `preguntas PAES chile verbal 15 .json`, pregunta 35, respuesta final A.
  - `preguntas PAES chile verbal 4.json`, pregunta 29, respuesta final A.

## Enunciados iguales con alternativas distintas: revisar manualmente

- **Calcula el límite: lim_{x→2} (x² - 4)/(x - 2).**
  - `preguntas PAES Chile matematica 1.json`, pregunta 15, respuesta final C.
  - `preguntas PAES chile matematica 12.json`, pregunta 57, respuesta final A.
  - `preguntas paes chile matematica 5.json`, pregunta 40, respuesta final A.
- **Halla la derivada de f(x) = ln(cos x).**
  - `preguntas paes chile matematica 6.json`, pregunta 5, respuesta final A.
  - `preguntas paes chile matematicas 10.json`, pregunta 52, respuesta final A.
- **¿Cuál de las siguientes palabras es un adverbio de modo?**
  - `preguntas PAES chile verbal 11.json`, pregunta 15, respuesta final A.
  - `preguntas PAES chile verbal 15 .json`, pregunta 15, respuesta final A.
- **¿Cuál de las siguientes opciones es un texto continuo?**
  - `preguntas PAES chile verbal 11.json`, pregunta 22, respuesta final C.
  - `preguntas PAES chile verbal 17.json`, pregunta 26, respuesta final C.
- **¿Cuál de las siguientes opciones es un texto argumentativo?**
  - `preguntas PAES chile verbal 12.json`, pregunta 26, respuesta final B.
  - `preguntas PAES chile verbal 17.json`, pregunta 34, respuesta final C.
- **¿Cuál de las siguientes opciones es una oración simple?**
  - `preguntas PAES chile verbal 13.json`, pregunta 37, respuesta final B.
  - `preguntas PAES chile verbal 15 .json`, pregunta 57, respuesta final B.
- **¿Cuál de las siguientes palabras es un adverbio de afirmación?**
  - `preguntas PAES chile verbal 14.json`, pregunta 15, respuesta final A.
  - `preguntas PAES chile verbal 15 .json`, pregunta 53, respuesta final A.
- **¿Cuál de las siguientes opciones es un texto discontinuo?**
  - `preguntas PAES chile verbal 14.json`, pregunta 34, respuesta final A.
  - `preguntas PAES chile verbal 15 .json`, pregunta 34, respuesta final A.
  - `preguntas PAES verbal Chile 10.json`, pregunta 28, respuesta final B.
- **Señala la opción donde la palabra 'conque' está correctamente usada como conjunción consecutiva.**
  - `preguntas PAES chile verbal 14.json`, pregunta 37, respuesta final A.
  - `preguntas PAES chile verbal 15 .json`, pregunta 25, respuesta final D.
- **Señala la opción donde se produce un hiato (vocales en sílabas distintas).**
  - `preguntas PAES chile verbal 15 .json`, pregunta 6, respuesta final C.
  - `preguntas PAES chile verbal 8.json`, pregunta 25, respuesta final C.
- **¿Cuál de las siguientes palabras es un sustantivo concreto?**
  - `preguntas PAES chile verbal 15 .json`, pregunta 46, respuesta final B.
  - `preguntas PAES chile verbal 8.json`, pregunta 17, respuesta final C.
- **Señala la opción donde se produce una cacofonía.**
  - `preguntas PAES chile verbal 15 .json`, pregunta 52, respuesta final A.
  - `preguntas PAES verbal Chile 10.json`, pregunta 6, respuesta final A.
- **Señala la opción donde la palabra 'más' (adverbio de cantidad) está correctamente acentuada.**
  - `preguntas PAES chile verbal 15 .json`, pregunta 56, respuesta final B.
  - `preguntas PAES verbal Chile 10.json`, pregunta 3, respuesta final A.
- **¿Cuál de las siguientes palabras es un adverbio de lugar?**
  - `preguntas PAES chile verbal 16.json`, pregunta 15, respuesta final A.
  - `preguntas PAES chile verbal 9.json`, pregunta 9, respuesta final A.
- **Señala la opción donde la palabra 'sí' (afirmación) lleva tilde correctamente.**
  - `preguntas PAES chile verbal 16.json`, pregunta 32, respuesta final B.
  - `preguntas PAES verbal Chile 10.json`, pregunta 20, respuesta final B.
- **¿Cuál de las siguientes palabras es un sustantivo abstracto?**
  - `preguntas PAES chile verbal 16.json`, pregunta 39, respuesta final A.
  - `preguntas PAES chile verbal 6.json`, pregunta 22, respuesta final A.
  - `preguntas PAES verbal Chile 10.json`, pregunta 24, respuesta final A.
- **¿Cuál de las siguientes palabras es un adverbio de duda?**
  - `preguntas PAES chile verbal 17.json`, pregunta 19, respuesta final A.
  - `preguntas PAES chile verbal 4.json`, pregunta 22, respuesta final A.
- **¿Cuál de las siguientes opciones es una oración unimembre?**
  - `preguntas PAES chile verbal 3.json`, pregunta 26, respuesta final E.
  - `preguntas PAES chile verbal 9.json`, pregunta 16, respuesta final E.

## Recomendación

Conservar los originales como referencia. Corregir primero los 58 objetos con campos repetidos, validando qué valor corresponde al enunciado real; después revisar las 108 preguntas con opciones repetidas para que exista una única alternativa correcta. No eliminar una opción sin ajustar su letra de respuesta.

Consolidar los 7 pares de mismo enunciado y alternativas preservando la explicación válida. Revisar los otros 18 grupos antes de deduplicar: cambiar opciones puede representar una variante intencional.

El archivo auditoria.json conserva los valores anteriores y finales de las claves repetidas y las ubicaciones de cada hallazgo. Ejecutar `python -X utf8 audit_questions.py` desde la raíz para regenerar ambos informes. El script no modifica preguntas ni escribe en Firebase.
