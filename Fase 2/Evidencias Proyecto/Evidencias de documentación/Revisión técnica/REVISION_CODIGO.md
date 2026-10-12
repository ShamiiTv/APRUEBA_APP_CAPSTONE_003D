# Revisión del código de Aprueba

Fecha: 9 de octubre de 2026.

Este documento conserva la auditoría inicial y sus resultados históricos. Desde esa revisión se implementaron los bloques de autenticación/onboarding, banco y práctica, inicio/progreso, plan de estudio diario, perfil/ajustes, canjes/beneficios y grupos/comunidad. Sus verificaciones actuales se documentan en los archivos SETUP de `aprueba_api`, en `MEDALS_SETUP.md` y en `ALCANCE_WEB.md` dentro de Evidencias de sistema Aplicacion, además de `Evidencias de documentación/Revisión banco de preguntas/REVISION_CONTENIDO.md`. Los hallazgos de esos bloques no deben interpretarse como fallos que siguen presentes sin consultar esos registros; el registro de alcance distingue explícitamente las ampliaciones e integraciones todavía pendientes.

## Alcance y validación

Revisión del backend Express, frontend React/Vite, rutas, controladores, contextos, estilos, scripts de carga, configuración y reglas/índices de Firestore en `Fase 2/Evidencias Proyecto/Evidencias de sistema Aplicacion`. Las evidencias Word/Excel/PDF no forman parte del código de desarrollo. Se validaron los 33 archivos JSON del banco: 1.426 preguntas; todos se pueden interpretar y contienen los campos básicos de enunciado, alternativas y respuesta A–E. Esto no certifica la corrección académica ni la procedencia DEMRE del contenido.

Comprobaciones ejecutadas:

- `npm.cmd run build`: correcto, 41 módulos transformados.
- `npm.cmd run lint`: falla, 12 errores y 2 advertencias.
- `node --check` sobre los archivos JS del backend: correcto.
- Prueba aislada de `login`, sustituyendo Firestore por datos simulados: una contraseña incorrecta produjo una sesión y un token. No se accedió a cuentas reales ni se escribió en Firestore.

No se realizó una prueba integral con Firebase ni una inspección visual en navegador. No se modificó el código de aplicación. La compilación generó `dist`, ignorado por Git. El backend no define un comando de pruebas automatizadas.

## Hallazgos por prioridad

Las rutas siguientes son relativas a la carpeta de aplicación indicada en el alcance. P0: crítico; P1: alta; P2: media.

1. **P0 — Inicio de sesión sin verificación de contraseña.** `aprueba_api/src/controllers/authController.js:69–93`. `login` únicamente comprueba que el correo exista antes de generar tokens. `register` tampoco guarda un hash ni crea un usuario en Firebase Auth. Basta conocer un correo registrado y enviar cualquier contraseña no vacía para acceder a esa cuenta. Corregir con un mecanismo real de autenticación y una estrategia para las cuentas existentes que carecen de contraseña guardada. Confirmado mediante prueba aislada.

2. **P1 — Secreto JWT predeterminado y público.** `aprueba_api/src/middleware/auth.js:3`. Cuando falta `JWT_SECRET`, se usa una constante del repositorio que permite fabricar tokens para cualquier UID conocido. Exigir la variable y rechazar el arranque si falta; rotar el secreto si se utilizó este valor en un entorno accesible.

3. **P1 — El refresh token sirve como access token.** `aprueba_api/src/middleware/auth.js:14–15,28`. Ambos tokens comparten firma y payload, y el middleware no distingue su propósito. Un refresh token permite acceder directamente a las rutas protegidas durante 30 días. Separar los tipos de token y validar su uso; actualmente tampoco hay una ruta de renovación.

4. **P1 — La cuota diaria nunca se reinicia.** `aprueba_api/src/controllers/practiceController.js:20–28,123–130,163–167`. Se compara `used` con `max` sin comprobar la fecha; no existe lógica de reinicio en el código revisado. Un estudiante gratuito queda bloqueado después de 20 respuestas acumuladas, aunque pase otro día. La interfaz promete un reinicio a medianoche. Reiniciar y consumir cuota dentro de la transacción usando la zona horaria definida para el producto.

5. **P1 — Repetir respuestas permite obtener medallas adicionales.** `aprueba_api/src/controllers/practiceController.js:160–194`. No se verifica si `answeredQuestions/{questionId}` ya existe antes de premiar. Reenviar una respuesta correcta vuelve a sumar bronce y sobrescribe el registro; además, el primer envío revela la solución. Hacer que la respuesta sea idempotente y guardar respuesta, saldo, consumo y movimiento de auditoría en una sola transacción. Un fallo tras actualizar el usuario deja datos parciales y un reintento puede duplicar el premio.

6. **P1 — Solicitudes concurrentes superan la cuota.** `aprueba_api/src/controllers/practiceController.js:125–130,160–175`. La comprobación del límite ocurre fuera de la transacción. Varias solicitudes pueden observar la última plaza libre y todas incrementar el consumo, porque dentro de la transacción no se vuelve a validar el límite. Comprobar la cuota actualizada antes de escribir.

7. **P1 — El banco se considera terminado al responder 60 preguntas.** `aprueba_api/src/controllers/practiceController.js:41–54`. Siempre se consulta el mismo conjunto limitado a 60 documentos y luego se eliminan los respondidos. Cuando se agotan esos 60, se devuelve `allCompleted` aunque queden cientos fuera de la consulta. Paginar o buscar más candidatos hasta encontrar una pregunta válida o agotar realmente el banco.

8. **P1 para producción — Los planes pagados se activan sin pago.** `aprueba_api/src/controllers/plansController.js:61–108`. Cualquier usuario autenticado puede activar `uni` o `all`; el servidor crea una factura `paid` y acceso ilimitado sin verificación de pago. Está documentado como simulación en un comentario: es aceptable como demostración, pero debe quedar restringido explícitamente a ese entorno. Para producción, activar mediante confirmación validada de la pasarela. Tampoco hay lógica que retire el acceso al vencer `currentPeriodEnd` o cierre suscripciones anteriores al cambiar de plan.

9. **P2 — Guardar ajustes devuelve 404.** `aprueba_student_web/src/pages/Settings.jsx:20–26` frente a `aprueba_api/src/routes/authRoutes.js:23`. El frontend usa `PATCH /auth/profile`, pero la API solo registra `PUT`. Unificar el método. Después de resolverlo, `dailyReminder` seguirá sin persistir: `updateProfile` no incluye este campo en la lectura del body ni en las actualizaciones (`authController.js:121–141`). El error solo aparece en consola, sin aviso al usuario.

10. **P2 — La API está fijada a localhost.** `aprueba_student_web/src/api/client.js:1`. Al abrir el sitio desde otro equipo, el cliente intenta acceder al puerto 4000 del equipo del visitante. Una publicación HTTPS también requiere un endpoint apropiado. Configurar la URL por entorno o usar una ruta relativa con proxy.

11. **P2 — Se envía la explicación antes de responder.** `aprueba_api/src/controllers/practiceController.js:63–79`. Solo se excluyen `correctAnswer` y `stats`; `explanation` se entrega completa en `/practice/next`. Las explicaciones del banco pueden revelar la solución y facilitar premios sin resolver. Usar una lista explícita de campos públicos y entregar la resolución al registrar la respuesta.

12. **P2 — Preferencias, publicación y límites de planes no se aplican.** `aprueba_api/src/controllers/practiceController.js:8,41–43`; `groupsController.js:36–125`; `seedCatalogs.js:13,26,39`. La dificultad se devuelve como metadato pero no filtra preguntas; tampoco se filtra `status`. La práctica permite cualquier prueba sin aplicar el límite de una prueba de `uni`, y creación/unión a grupos no verifica los límites del catálogo. Aplicar las condiciones del usuario y del plan en el servidor. Las opciones M2 e Historia no tienen preguntas sembradas: todas las matemáticas se asignan a M1 y no hay archivos de Historia.

13. **P2 — Índices declarados incompletos para las consultas actuales.** `aprueba_api/src/controllers/plansController.js:6` y `supportController.js:52–55`; `database/firestore.indexes.json`. No se declaran las combinaciones `plans(published, order)` y `supportTickets(userId, createdAt)`. Un despliegue nuevo basado solo en este archivo puede fallar al listar planes o tickets. La existencia de índices creados manualmente en un proyecto remoto no se comprobó.

14. **P2 — La carga de preguntas duplica el banco al repetirse.** `aprueba_api/src/data/seedData.js:102–105`. Cada ejecución crea IDs aleatorios para el mismo contenido. Se acumulan duplicados que el alumno puede volver a responder porque su historial está basado en IDs. Usar IDs estables derivados de la fuente y de la identidad de cada ítem. Los errores por archivo solo producen una advertencia y el proceso termina con código 0, por lo que una carga parcial puede aparentar éxito.

15. **P2 — Racha de estudio sin actualización.** `aprueba_api/src/controllers/authController.js:35–36` y `practiceController.js:166–169`. `streak` y `lastActiveDate` se inicializan al registrar, pero no hay código que actualice o interrumpa la racha al practicar. La interfaz muestra una racha activa que no refleja la actividad real.

16. **P2 — Onboarding no obligatorio y sin estado inicial explícito.** `aprueba_api/src/controllers/authController.js:24–45`; `aprueba_student_web/src/App.jsx:45`; `components/PrivateRoute.jsx:23–27`. El registro no establece `onboardingCompleted: false`, y las rutas privadas solo comprueban que exista usuario. Registrar redirige inicialmente al onboarding, pero se puede omitir navegando al inicio o volviendo a iniciar sesión. Inicializar el estado y exigir la configuración pendiente donde corresponda.

17. **P2 — Se pierden incrementos concurrentes de reportes.** `aprueba_api/src/controllers/supportController.js:86–95,117–122`. `flagCount` se calcula con una lectura externa a la transacción. Dos reportes simultáneos pueden escribir el mismo valor y perder uno de los incrementos. Leer la pregunta dentro de la transacción o usar un incremento atómico.

18. **P2 — El último resultado queda oculto al agotar cuota.** `aprueba_student_web/src/pages/Practice.jsx:69–75,149`. Al responder la pregunta 20, se guarda el resultado y se activa `quotaExceeded`; el render prioriza el aviso de cuota y deja de mostrar la corrección y explicación de esa última respuesta. Mantener visible la retroalimentación y limitar la solicitud de la siguiente pregunta.

## Otros problemas de mantenimiento e integridad

- Validación de entradas insuficiente: varios controladores llaman `.trim()` sin verificar tipo; un JSON con tipos incorrectos produce errores 500 o 400 genéricos. Definir esquemas para tipos, enumeraciones, longitudes y alternativas válidas. `zod` está instalado pero no se utiliza.
- Registro de correo no atómico: la búsqueda seguida de creación en un ID aleatorio permite cuentas duplicadas bajo solicitudes concurrentes (`authController.js:13,20,47`). Garantizar unicidad desde el mecanismo de identidad.
- Creación de grupo y miembro, y creación de ticket y primer mensaje, se hacen en escrituras separadas. Un fallo intermedio deja entidades incompletas (`groupsController.js:68–77`; `supportController.js:32–40`; `tutorsController.js:62–70`). Usar batches o transacciones.
- `getPosts` consulta secuencialmente likes y comentarios por publicación; con 30 posts hace hasta 60 consultas adicionales. `getMyGroups` y `getMyTickets` también leen subcolecciones por entidad, sin paginación global. Reducir consultas y paginar.
- El muro carga los primeros 10 comentarios por fecha ascendente, aunque el comentario del código dice “últimos”; no hay mecanismo para consultar los restantes (`postsController.js:24–27`). Los comentarios nuevos pueden desaparecer de la vista después de recargar.
- No hay control de respuestas obsoletas al cambiar rápidamente la materia o filtro de tutores. Una petición anterior puede sobrescribir el resultado de la selección más reciente (`Practice.jsx:22–53`; `Tutors.jsx:16–30`). Cancelar o identificar solicitudes.
- Tema e idioma se almacenan en el navegador pero no se restauran desde el perfil al iniciar sesión en otro dispositivo (`ThemeContext.jsx:7–8`; `AuthContext.jsx:18–21`).
- Faltan variables CSS usadas en algunas pantallas, como `--texto-oscuro` y `--gris-medio`. El sidebar tiene ancho fijo de 260 px, sin adaptación móvil, y algunos grids exigen un mínimo de 360 px. Revisar presentación en pantallas pequeñas (`Layout.jsx:41`; `Medals.jsx:128`). Observación de código, sin verificación visual.
- El catálogo promete beneficios canjeables, pero solo existe un endpoint de listado y la pantalla no implementa canje de beneficios; obtiene historial de medallas pero no lo muestra. Los grupos mantienen `score` y `avgScore` en cero sin actualización desde la práctica. Son funciones pendientes, distintas del canje de medallas 5 a 1 que sí está implementado.
- Los IDs `sk_<test>_general` asignados a preguntas no existen en el catálogo de habilidades sembrado (`seedData.js:39`; `seedCatalogs.js:87–90`). Resolver las referencias para que consultar el detalle de habilidad de una pregunta funcione.
- El README principal solo contiene el nombre del repositorio y el del frontend sigue siendo el de la plantilla. Faltan instrucciones de arranque, variables requeridas, uso de emuladores, carga de datos y pruebas. El script de emuladores vive en el paquete API, mientras `firebase.json` está en la carpeta hermana `database`; conviene indicar explícitamente la configuración y verificar el comando desde ese directorio.

## Estado de los controles

Las rutas funcionales revisadas exigen token. Las reglas de Firestore deniegan acceso directo a clientes; los controladores usan Admin SDK, por lo que la autorización y validación de negocio debe residir en la API. Los canjes de medallas y los likes utilizan transacciones. La compilación correcta del frontend no valida los comportamientos de autenticación, cuotas ni suscripciones.

ESLint reportó errores en `AuthContext`, `ThemeContext`, `Community`, `Groups`, `Medals`, `Onboarding`, `Practice` y `Tutors`: reglas de efectos, exportaciones para Fast Refresh y variables no usadas; además de dos advertencias de dependencias de hooks. Corregir y volver a ejecutar el control antes de integrar cambios. No se verificaron vulnerabilidades de dependencias mediante auditoría de red.

## Orden recomendado de corrección

1. Autenticación real, secreto obligatorio y separación de tokens.
2. Respuestas idempotentes, cuota por fecha y comprobaciones dentro de la transacción.
3. Recorrido completo del banco y separación de campos públicos/solución.
4. Contrato frontend/API de ajustes, URL por entorno e índices.
5. Restricción de pagos simulados y cumplimiento de límites de planes.
6. Integridad de cargas, validación, pruebas de regresión y funciones pendientes.
