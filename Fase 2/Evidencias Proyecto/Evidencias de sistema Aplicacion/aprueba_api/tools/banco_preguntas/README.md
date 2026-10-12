# Herramientas de revisión del banco

Estos scripts se conservaron como evidencia de auditoría y revisión editorial. Localizan la raíz del repositorio desde su ubicación y guardan resultados en las evidencias de documentación de Fase 2.

`audit_questions.py` analiza formato y duplicados. `classify_difficulty.mjs` genera propuestas de dificultad sin modificar el banco. `verify_bank_math.py` requiere SymPy y registra comprobaciones simbólicas.

`repair_questions.py`, `review_bank_edits.py` y `finalize_bank_review.py` modifican los JSON: corresponden al proceso histórico de revisión y no deben ejecutarse como parte del inicio normal de la aplicación. Las copias ZIP originales se conservan localmente, fuera de Git; el repositorio conserva los JSON revisados y su historial.

La comprobación habitual del banco se ejecuta desde la API con `npm run questions:check`.
