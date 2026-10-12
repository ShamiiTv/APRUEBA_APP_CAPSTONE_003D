# Testeo de Aprueba en VPS — 10 de octubre de 2026

Entorno: web pública en https://apruebashamiiplaytest.dbm.shared-servers.com, API de producción y proyecto Firebase aprueba-app-9d317. Banco real: 1.360 preguntas publicadas y 59 pendientes. No se utilizaron respuestas simuladas en estos recorridos.

## Comprobaciones realizadas

- Registro, login con contraseña correcta, rechazo de contraseña incorrecta, configuración inicial obligatoria y refresco de sesión.
- Edición de perfil, rechazo de campos de privilegios, bloqueo de visitantes en rutas privadas y rechazo de sesiones revocadas.
- Carga de preguntas en M1, M2, Lectora y Ciencias, sin revelar la respuesta antes de contestar.
- Guardado de respuesta, reintento idempotente y consumo único de cuota.
- Progreso, medallas, plan de estudio, creación y consulta de grupos, publicación privada, comentarios y reacciones.
- Acceso directo anónimo a un documento de pregunta en Firestore rechazado con 403.
- Chrome en escritorio 1280 px y móvil 390 px: acceso y registro visibles, HTTPS validado, sin desbordamiento horizontal ni errores de JavaScript.
- Recorrido público en Chrome: formulario de registro, onboarding, respuesta de práctica y nuevo login; sin interceptar ni simular peticiones de la aplicación.

Las cuentas, grupos y publicaciones temporales se eliminaron al terminar cada ejecución. Las respuestas reales de prueba incrementan las estadísticas agregadas de las preguntas elegidas; no se restauran esos contadores para evitar sobrescribir actividad concurrente de otros usuarios.

## Correcciones y configuración

Se desplegaron las reglas del repositorio que deniegan acceso directo desde clientes; los estudiantes acceden por la API autenticada. Se respaldó la referencia de reglas anterior. El usuario agregó a la cuenta de servicio el rol Cloud Datastore Index Admin porque Google rechazaba crear índices. Se solicitaron los 19 índices del repositorio, incluyendo el índice nuevo de planes por published/order. Los fallos de feeds y planes se verifican de nuevo tras su construcción.

Test-Aprueba-Vps.mjs deja el reporte más reciente en /opt/shamii/aprueba-backups/qa-latest.json. Los tests de API se ejecutan desde la VPS; el test de navegador usa la URL HTTPS pública. Las pruebas repetidas de autenticación simulan clientes independientes desde loopback para no agotar el límite por IP; no se desactiva el límite de producción. El login y registro públicos se verificaron también en Chrome a través de Nginx.

## Límites del resultado

Este testeo funcional permite evaluar una prueba privada del flujo gratuito; no certifica lanzamiento comercial, resistencia a carga ni ausencia de todas las vulnerabilidades. No se verificó entrega de correo de recuperación a un buzón real. No se cargaron catálogos ficticios de tutores, convenios ni beneficios. Pagos y suscripciones mantienen implementación simulada pendiente de reemplazar; no ofrecer compras reales. El banco no contiene dificultad académica aprobada y usa d2 por defecto.

Resultado final de API: **44 comprobaciones aprobadas, 0 fallos**, después de crear los índices. Comunidad pública, feed privado y listado de planes responden HTTP 200. El recorrido público del navegador también pasó. Resultado: apta para una prueba privada y acotada del flujo gratuito, con los límites anteriores comunicados a los participantes.
