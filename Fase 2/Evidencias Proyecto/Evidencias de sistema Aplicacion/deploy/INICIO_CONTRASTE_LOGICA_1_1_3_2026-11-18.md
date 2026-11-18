# Inicio, contraste y revisión de flujos · Aprueba 1.1.3

18 de noviembre de 2026, Chile.

## Resultado de interfaz

Inicio web se reorganiza con bienvenida, acceso vigente y acción principal, actividad real de hoy, cuatro métricas, disponibilidad de práctica separada del saldo, tarjetas por prueba y accesos a Tutores/Grupos/Comunidad. Las cifras históricas no se presentan como puntaje PAES. Bancos vacíos o completados no muestran una acción disponible; una prueba ilimitada sigue accesible si la cuota gratuita de otras está agotada.

Se distingue el azul de superficie del color de texto de marca. Las cifras, enlaces, títulos y etiquetas dejan de usar azul oscuro sobre panel oscuro. Se ajustan también los textos secundarios de claro, las letras de ciertas asignaturas y el aviso dorado de práctica. El dorado de botones/logotipo se conserva; el texto dorado tiene su propio color legible.

La revelación de tema cambia de 480 ms con aceleración rápida a 720 ms con avance más perceptible. La prueba real en Chrome midió aproximadamente 728–732 ms desde el icono y verificó que el círculo parte del botón, en ambos sentidos. También se conserva un fundido de colores de 450 ms cuando no hay View Transitions o la captura es rechazada. Se sigue respetando prefers-reduced-motion; por ello una preferencia de movimiento reducido aplica el tema inmediatamente. El caso exacto reportado por el usuario no se reprodujo en su perfil personal de Chrome; las mediciones usan un contexto de Chrome aislado, sin extensiones ni datos del usuario.

Las actualizaciones de progreso en segundo plano conservan los datos cargados y evitan consultas simultáneas de foco/visibilidad. Un fallo de actualización no reemplaza cifras por ceros. Los skeletons de Inicio se ajustan a la nueva disposición.

## Homologación móvil

Inicio Flutter incorpora bienvenida, acción principal y métricas con el mismo lenguaje visual. Los saldos en cero conservan legibilidad y la racha tiene contraste en oscuro. El resumen completo de progreso del servidor se comparte entre los proveedores de datos; no se duplica la consulta al mostrar resumen y desglose. La racha corresponde a actividad de estudio actual, no a un valor antiguo del perfil. Inicio no presenta fallos/cargas de historial como cero respuestas, y permite reintentar deslizando.

La caché compartida se invalida al entrar, salir, responder o actualizar datos en los mismos puntos donde antes se invalidaba el desglose. Se mantienen rutas y permisos. Android 1.1.3+202611182, conservando firma/aplicación de las entregas anteriores.

## Revisión de lógica y límites de la evidencia

Se ejecutan las diez suites de emuladores: autenticación 3, práctica 9, medallas 6, mejoras 6, social 10, seguridad 9, eliminación de cuenta 5, homologación 5, PayPal 1 y cuotas 3: 57 pruebas aprobadas. Cubren recuperación de contraseña, conservación de UID/perfil, recompensas sin duplicar, respuestas concurrentes y cuota final, banco y progreso, canjes/regalos, privacidad de grupos, comentarios/reacciones, sesiones, borrado y conservación de terceros, pagos verificados, reintentos, cancelación y reglas gratuitas/ilimitadas.

Dos expectativas antiguas de autenticación asumían saldos anteriores a las medallas de bienvenida e inicio diario. Se actualizan para verificar conservación del saldo más la recompensa legítima y que volver a iniciar sesión el mismo día no la duplique. No se elimina la recompensa para hacer pasar la prueba. Las diez suites se incorporan al trabajo de autorización/regresión de GitHub.

API: 75 pruebas unitarias aprobadas. Web: 19 pruebas unitarias, lint y compilación. Flutter: análisis sin incidencias y 53 pruebas, incluidas Inicio a 360 px en claro/oscuro, racha actual del servidor frente al perfil viejo y error de progreso sin cifras fabricadas y cuota vigente frente a un perfil ilimitado desactualizado.

Chrome: revisión de once secciones en español/claro, español/oscuro e inglés/oscuro, ocho rutas a 390 px sin desbordamiento horizontal, cambio de tema real desde el icono, fundido por falta de soporte/rechazo y movimiento reducido. La comprobación automática de contraste no encontró incidencias en los textos visibles sobre fondos sólidos contemplados; omite gradientes, transparencias, textos decorativos y controles deshabilitados. Se revisaron manualmente las capturas de Inicio y la transición. Esto no equivale a una certificación de accesibilidad de toda la aplicación.

Se verifican además Inicio con datos anteriores ante un fallo de actualización, bancos completados sin botón activo y acceso de una asignatura pagada con la cuota gratuita agotada. Los escenarios son fixtures y datos de proyectos demo-, sin modificar cuentas reales. Las pruebas no prueban ausencia de cualquier defecto ni sustituyen una prueba de teléfono físico, renovación real del proveedor o servicios externos no configurados.

Arena sigue como propuesta documentada, sin matchmaking publicado. Facsímil permanece Próximamente. No se cambian precios, economía de medallas, reglas Firestore ni configuración privada de pagos.

## Repetir la revisión de navegador

El recorrido reproducible está en aprueba_student_web/test/fullReview.browser.mjs. Requiere Chrome, Playwright disponible mediante PLAYWRIGHT_MODULE, Vite en http://localhost:5179 y puerto API 4000 libre. Desde aprueba_api se puede ejecutar con Firebase emulators:exec, proyecto demo-aprueba-full-review, auth/firestore y configuración ../database/firebase.json, pasando node ../aprueba_student_web/test/fullReview.browser.mjs como comando. El archivo fija destinos demo-/emuladores, crea una cuenta ficticia verificada y la elimina al terminar; genera capturas e informe en una carpeta temporal o APRUEBA_REVIEW_OUTPUT_DIR. No ejecutarlo contra Firebase real.

## Entrega

APK: https://aprueba.shamiiplay.com/descargas/Aprueba-1.1.3.apk. Se registra respaldo/huellas al completar la publicación mediante el instalador reversible existente.

### Publicación completada

Respaldo: `/opt/shamii/aprueba-backups/security-release-20261118T060853Z`. API conectada a Firebase tras activar; auditoría de dependencias desplegadas: cero vulnerabilidades. SHA256 APK: `704ff9ff709659d89235e4044ff1c2f88fd5eeaaf3025deafba9d66e9bbcbf26`. SHA256 Flutter web main.dart.js: `3d6fd2d30b6afed63fe90343c41921e92eaffea1a1936b4157b4fa3ac1e85b29`. Se conserva configuración privada, descargas y assets anteriores. No se migran ni eliminan datos de usuarios reales.
