# Cobertura del alcance: Aprueba web del alumno

Actualizado: 9 de octubre de 2026. Este registro diferencia lo implementado y probado de funciones parciales, ejemplos e integraciones pendientes. No declara terminado el proyecto completo.

Fuentes del usuario:

- E:/DescargasE/Aprueba_Alcances_Stack (1).docx.
- C:/Users/Shamii/Downloads/Aprueba_Web_Wireframe (1).html.

El documento describe el ecosistema y su stack; el HTML ilustra comportamiento esperado y contiene datos demostrativos. Se usan como referencias de requisitos, sujetos a la instrucción del usuario: trabajar solo en la web del alumno y en la API necesaria para ella. Móvil, administración, generador, landing y módulo independiente de tutor quedan fuera de este trabajo.

## Estado por bloque

| Bloque de la web | Implementado y validado localmente | Pendiente / límite |
| --- | --- | --- |
| Autenticación y onboarding | Email/contraseña Firebase, recuperación, sesión access/refresh, revocación, perfil protegido y guardas de onboarding | Google/Apple y SMS; configuración y comprobación de proveedores en entorno de integración |
| Banco y práctica | Auditoría/deduplicación, revisión editorial, banco elegible, cuota diaria, primera respuesta y recompensa atómicas, explicación, filtros y estados vacíos | Banco actual sin Historia/Física/Química publicadas; dificultad elegible principalmente d2; lecturas completas/procedencia DEMRE sin certificar |
| Inicio y progreso | Métricas reales por materia, cobertura del banco, cuota, racha y actividad reciente | Dominio por habilidad y percentiles de cohorte; no se muestran valores inventados |
| Plan de estudio | Objetivo diario, materias, tareas disponibles y recomendaciones explicadas | Calendario semanal y entrega de recordatorios |
| Perfil y ajustes | Datos editables, materias/dificultad, tema/idioma persistidos, preferencia de recordatorio y protección de campos sensibles | Traducción íntegra de nuevas pantallas; recordatorio guardado como preferencia, sin envío |
| Medallas y beneficios | Canjes 5→1 idempotentes, historial, solicitudes de beneficio con stock/saldo y entrega pendiente | Regalos de hasta 10 bronces por día entre miembros de grupos; recompensa diaria de login; recorrección confirmada y su recompensa; entrega comercial de premios |
| Grupos | Crear/unirse/salir, invitación, roles, estadísticas reales por materia y muro privado con preguntas compartidas | No hay puntajes PAES ni ranking académico inventado; cantidad de miembros acotada a 100 y estadísticas no son dominio por habilidad |
| Comunidad | Publicar, compartir pregunta desde práctica, reacciones repetibles, comentarios, paginación y errores/reintentos visibles | Actualización en tiempo real, moderación/reportes y adjuntos por definir frente a entregables finales |
| Suscripciones (Plan del wireframe) | Existe catálogo y pantalla heredada | Pago actual simulado: revisar primero; Stripe, checkout/confirmación verificable, cancelación, recibos reales y derechos del plan necesitan implementación |
| Tutores y soporte en web | Existen pantalla y endpoints heredados; se corrigió la cancelación al cambiar el filtro de tutores | Revisión funcional completa: solicitudes/ticket/mensaje atómicos, consulta y seguimiento del alumno, validaciones y privacidad |

## Diferencias que requieren cierre del alcance

El wireframe menciona cuota base 10 +5 por colegio +5 por dirección, mientras la implementación validada usa 20 preguntas diarias gratuitas. Debe reconciliarse al cerrar las reglas de planes/onboarding; no modificar cuotas ni recompensas comerciales arbitrariamente con datos del prototipo.

Los botones de recorrección, regalo de medallas, recompensa diaria y pagos del prototipo no se consideran completados por existir una pantalla. Deben tener comportamiento de servidor y pruebas que demuestren saldo, autorización y reintentos.

La revisión de contenidos dejó 1.419 preguntas únicas, con clasificación detallada en revision_preguntas/REVISION_CONTENIDO.md. El 10-10-2026 se incorporaron por indicación del responsable las 591 preguntas complementarias listas entregadas por Alloxentric: hay 1.360 disponibles y 59 pendientes excluidas por ambigüedad. La etiqueta complementaria se conserva como metadato editorial.

## Referencias de validación

- aprueba_api/AUTH_SETUP.md, PRACTICE_SETUP.md, PROGRESS_SETUP.md, STUDY_PLAN_SETUP.md y PROFILE_SETUP.md.
- MEDALS_SETUP.md para canjes/beneficios.
- aprueba_api/SOCIAL_SETUP.md para grupos/comunidad.
- REVISION_CODIGO.md conserva la auditoría histórica inicial; consultar los registros posteriores antes de tratar sus hallazgos como fallos actuales.

Los resultados son locales: API en proyectos Firebase demo, pruebas unitarias y de navegador, compilación y lint. No constituyen una certificación de producción, validación de convenios comerciales ni una implementación completa de todas las integraciones externas.

Prioridad siguiente: sustituir la activación de suscripciones simuladas por un flujo de pago verificable y cerrar las reglas de derechos/cuotas del plan. Después, tutores/soporte y las funciones adicionales de gamificación/recorrección identificadas arriba, sin perder los pendientes transversales de autenticación, idioma y despliegue.
