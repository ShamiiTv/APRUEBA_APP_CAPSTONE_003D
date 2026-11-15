# Cargas unificadas — 2026-11-02

Se agregó carga explícita de suscripciones web: skeleton de tres tarjetas con nombre, precio, beneficios y acción. Al fallar la API, el skeleton se reemplaza por error y reintento; un catálogo vacío muestra su estado correspondiente.

La pantalla móvil de planes ahora consulta el catálogo de la misma API y muestra sus precios, con skeleton antes de la respuesta y recuperación ante fallo. Mantiene las selecciones de pago simuladas y no realiza cobros reales. Se usa el proveedor de planes existente, evitando consultas repetidas cuando el catálogo ya está disponible.

También se agregaron skeletons a plan de estudio web, restauración de sesión privada y las cargas secundarias móviles: perfil, detalle de grupo, canjes, regalos, beneficios, compartir preguntas, explicación y pantallas de suscripción. Se conservaron los indicadores de los botones al guardar y el indicador de arranque de la app, que representan actividad y no sustitución de contenido.

Los skeletons distinguen preguntas, formularios, tarjetas y planes y usan los colores del tema. Se mantienen accesibles y la animación web respeta reducción de movimiento. No se introdujeron esperas artificiales: si el contenido ya está disponible no se demora su presentación.

Validación: React compilado sin API localhost; Flutter analyze sin incidencias, 11 pruebas aprobadas, compilaciones Flutter Web y APK realizadas y firma del APK verificada. Prueba web en Chrome, 390 px, claro/oscuro, API aislada con demora, error y reintento. Capturas reales de la aplicación durante QA.

Web: https://aprueba.shamiiplay.com/
Móvil: https://aprueba.shamiiplay.com/movil/
APK 1.0.4 (código 20261104): https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261102-skeletons.apk
Respaldo VPS: /opt/shamii/aprueba-backups/skeletons-20261102.tar.gz

Validación móvil adicional en Flutter Web: skeleton visible durante demora de API y reemplazo por los tres planes en claro/oscuro, sin desbordamientos detectados. Capturas adjuntas. La comprobación de este lote se hizo en navegador; queda la prueba del APK en teléfono físico.
