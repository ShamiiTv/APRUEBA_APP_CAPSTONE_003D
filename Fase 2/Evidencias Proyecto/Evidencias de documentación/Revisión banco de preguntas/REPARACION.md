# Limpieza del banco de preguntas

Los originales están en preguntas_originales.zip. Los JSON actuales usan formato UTF-8 uniforme, sin claves repetidas.

- originales: 1426
- conservadas: 1419
- listas: 1253
- pendientes: 166
- duplicadas_retiradas: 7

Los ítems con campos conflictivos o alternativas repetidas conservan el último valor que utilizaba el lector original, pero están marcados como pendientes y no se publican en la práctica. No se inventaron respuestas ni distractores. El archivo reparacion.json conserva motivos, ubicaciones originales y valores conflictivos. Los enunciados iguales con alternativas distintas se conservan como variantes.

«Lista» indica que superó estas comprobaciones estructurales; no certifica corrección académica ni origen DEMRE. Para aprobar un ítem pendiente hay que validar enunciado, alternativas y solución; cambiar estado_revision a lista y retirar motivos_revision solo tras esa revisión.
