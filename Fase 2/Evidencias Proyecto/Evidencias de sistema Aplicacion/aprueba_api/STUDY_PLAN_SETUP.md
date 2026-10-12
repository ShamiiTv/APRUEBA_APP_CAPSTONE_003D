# Plan de estudio del estudiante

La web incorpora `/plan-estudio`, accesible desde Inicio y el menú. La pantalla `/plan` conserva las suscripciones y se identifica como «Suscripción». El plan de estudio no contrata planes, entrega premios ni modifica cuotas.

## Configuración y persistencia

`GET /api/v1/study-plan` obtiene la propuesta y el avance. `PUT /api/v1/study-plan` guarda `{ dailyGoal, testIds }` en `users/{uid}.studyPlan`. Ambos requieren sesión válida y onboarding completo. El UID procede del token; no puede elegirse otro usuario en el cuerpo.

Se permite una meta entera de 1 a 20 preguntas diarias y una lista sin duplicados de pruebas válidas. Sin configuración guardada se propone una meta de 10 y las pruebas seleccionadas del perfil. El formulario permite personalizar la selección del plan sin sobrescribir las preferencias generales de práctica.

## Cumplimiento y recomendaciones

El cumplimiento diario cuenta primeros intentos guardados hoy en las pruebas del plan, con fecha `America/Santiago`. Las respuestas de otras pruebas no completan esa meta. No hay un botón que permita marcar práctica ficticia ni premios extra por cambiar la meta.

La cantidad propuesta se limita por tres factores: meta pendiente, cuota disponible y preguntas aún sin responder del banco actual. Las pruebas sin banco se conservan visibles con un aviso y cero tareas; las pruebas ya completadas tienen un estado diferente. Una meta cumplida no genera tareas adicionales. La práctica sigue aplicando su propia cuota al responder.

La distribución se realiza por rondas, empezando por pruebas con menos de 60% de aciertos históricos y al menos cinco respuestas; luego pruebas con pocas respuestas y después las restantes. Es una regla sencilla y explícita de orientación, no un diagnóstico ni una estimación de puntaje PAES. No presupone una cobertura completa del temario ni dificultad calibrada. Las tareas abren práctica de la prueba correspondiente en dificultad intermedia, que es la disponible actualmente.

Al volver desde práctica se recarga el plan. Se actualiza al recuperar el foco o al detectar un nuevo día cuando no hay cambios pendientes del formulario. La actualización manual también está disponible. Los cambios sin guardar deshabilitan los accesos de las recomendaciones anteriores para evitar practicar con una selección obsoleta. Un fallo al guardar mantiene el formulario y permite reintentar.

## Validación local

- `npm test` en API: 33 pruebas, incluyendo seis de configuración, distribución, cuota, metas cumplidas y falta de contenido.
- `npm run test:practice:emulator`: nueve pruebas, incluyendo guardado personal y avance desde respuestas reales. Requiere `PRACTICE_TEST_PROJECT_ID` con prefijo `demo-`.
- `npm run test:emulator`: dos flujos de autenticación, incluyendo rechazo del plan sin sesión o sin onboarding. `AUTH_TEST_PROJECT_ID` debe coincidir con el proyecto iniciado en el emulador Auth.
- `npm test` en web: seis pruebas de sesión; compilación Vite y ESLint de los archivos modificados.
- `test/studyPlan.browser.mjs`: seis escenarios de navegador con API simulada: preferencias iniciales, persistencia tras recarga, acceso a práctica, meta cumplida, recuperación de carga y reintento de guardado. Usa Playwright del runtime local y Vite en `http://127.0.0.1:5173` o `WEB_TEST_URL`.

Se verificó con el proyecto aislado `demo-aprueba-study-plan`; no se escribieron datos de producción. El plan es diario y por prueba; aún no incluye calendario semanal, recordatorios enviados ni tareas por habilidad específica.
