# Inicio y progreso del estudiante

`GET /api/v1/progress` requiere sesión válida y onboarding completo. Obtiene el UID del token; no acepta un identificador de otro estudiante. Devuelve únicamente estadísticas del perfil y su historial, saldos de medallas, cuota, racha, avance por prueba y cinco respuestas recientes, sin claves ni explicaciones del banco.

## Qué significa cada indicador

- **Respondidas y aciertos:** primeros intentos guardados en `users/{uid}/answeredQuestions`, deduplicados por contenido. Se conservan los intentos de preguntas retiradas en el historial. Si un documento antiguo ya no tiene pregunta vinculada, se cuenta su registro histórico sin atribuirle avance en el banco actual.
- **Porcentaje de aciertos:** aciertos entre respuestas históricas. Se devuelve `null` y se muestra un guion si no hay respuestas. No representa puntaje PAES.
- **Avance por prueba:** preguntas respondidas que siguen habilitadas en el banco actual, entre preguntas disponibles. No incorpora preguntas pendientes o complementarias. Un banco vacío se muestra como no disponible, no como 100% completado.
- **Racha:** días consecutivos con respuestas fechadas, calculados en `America/Santiago`. Se mantiene durante el día siguiente al último día de práctica y vuelve a cero cuando se omite un día. Crear una cuenta o iniciar sesión no suma días. Historiales sin fecha no generan días supuestos.
- **Cuota de hoy:** se calcula con la fecha de Chile; su consumo continúa siendo responsabilidad de la transacción de práctica. Leer el inicio no consume cuota ni escribe estadísticas.
- **Medallas:** saldos del perfil. No se reconstruyen a partir de aciertos, porque los canjes y beneficios pueden cambiar los saldos. El premio sigue guardándose junto con la respuesta.

Los registros nuevos empiezan con racha cero y sin fecha de actividad. Al responder se calcula la racha a partir del historial real, corrigiendo los valores iniciales ficticios de perfiles antiguos sin borrar respuestas ni modificar saldos.

## Comportamiento web

El inicio carga datos al abrirse y al volver a la pestaña. Un chequeo local de fecha detecta el cambio de día sin consultar el banco cada minuto. Incluye actualización manual, estado de carga y error con reintento. Las solicitudes se cancelan al salir; un error no se presenta como estadísticas en cero.

Los accesos por prueba navegan a `/practicar?testId=...&difficulty=d2`. La práctica valida estos parámetros antes de usarlos. El inicio indica que los accesos usan el banco intermedio disponible; las pruebas sin contenido y la cuota agotada deshabilitan esos accesos. Las medallas llevan a `/medallas`.

El resumen lee el historial y los campos mínimos del banco necesarios para validar disponibilidad e interpretar IDs antiguos. Para un crecimiento importante del banco o del historial conviene mantener agregados transaccionales y un catálogo versionado; esta implementación prioriza compatibilidad y exactitud con el banco actual. Las estadísticas de preguntas antiguas sin fecha tienen límites explícitos.

## Verificación

- `npm test`: incluye pruebas de autenticación, práctica y progreso, con duplicados, cuentas nuevas, preguntas retiradas, cuota y cambio de fecha en Chile.
- `PRACTICE_TEST_PROJECT_ID=demo-... npm run test:practice:emulator`: incluye persistencia de respuestas, premios únicos, aislamiento entre estudiantes y progreso real.
- `AUTH_TEST_PROJECT_ID=demo-... npm run test:emulator`: verifica que el progreso rechace una sesión ausente o un onboarding incompleto. El ID debe coincidir con el proyecto iniciado en el emulador Auth.
- En `aprueba_student_web`, `npm test`, `npm run build` y ESLint sobre los archivos modificados verifican sesión, compilación y código.
- `test/home.browser.mjs` ejecuta cuatro escenarios en Chrome sin interfaz usando Playwright del entorno local y respuestas de API explícitamente simuladas. Requiere Vite en `http://127.0.0.1:5173` o `WEB_TEST_URL`; `PLAYWRIGHT_MODULE` puede apuntar al módulo instalado en el runtime. No inicia sesión en cuentas reales.

Las comprobaciones se realizaron con proyectos Firebase `demo-` aislados. No se cargaron cambios en producción.
