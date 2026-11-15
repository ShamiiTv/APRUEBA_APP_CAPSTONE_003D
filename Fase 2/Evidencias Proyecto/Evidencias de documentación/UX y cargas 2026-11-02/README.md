# Onboarding, grupos, niveles y skeletons — 2026-11-02

## Cambios
- Web, paso 1 de 2: permite omitir con confirmación; no envía colegio/región al completar el onboarding si se eligió omitir. Conserva la selección de pruebas del paso 2. El aviso explica 10 preguntas base y hasta 10 adicionales al completar colegio/edad/región (+5) y dirección (+5) después desde el perfil.
- Móvil: el formulario opcional de desbloqueo también avisa al elegir «Más tarde». La selección inicial de pruebas conserva su flujo propio.
- Niveles web: tarjetas con nombre, progreso, estado, selección y bloqueo; móvil: tarjetas adaptativas con indicador de acceso y selector de prueba con formato del formulario.
- Grupos: acciones más claras para crear y unirse por código. Los grupos propios del catálogo público muestran «Abrir mi grupo» en lugar de «Unirme». Móvil presenta «Mis grupos» antes del catálogo.
- Skeletons de contenido para inicio/progreso, preguntas, grupos, medallas, tutores y comunidad; móvil también incluye selección de pruebas y niveles. Se mantienen los indicadores de actividad de los botones al guardar. Los skeletons usan los colores de cada tema, ocultan las formas decorativas a lectores de pantalla y anuncian la carga. La animación web respeta reducción de movimiento.
- Se corrigieron fondos y campos fijos claros del onboarding web para funcionar en oscuro.

## Validación
Flutter analyze sin incidencias; 11 pruebas Flutter aprobadas; compilaciones React, Flutter Web y APK correctas; firma APK verificada.

Chrome con respuestas API aisladas en claro y oscuro: omitir y revisar el payload sin datos académicos; catálogo con grupo propio y ajeno; no mostrar Unirme para el propio; skeleton durante una respuesta demorada y retirada al llegar contenido; niveles bloqueados; sin desbordamiento horizontal. Flutter Web: acceso con perfil de prueba, grupos propios, niveles y confirmación al omitir, sin desbordamientos detectados en ambos temas a 390 px.

Las capturas adjuntas son de las aplicaciones reales durante QA con datos aislados. No se enviaron invitaciones ni se modificaron cuentas reales. Esta revisión no constituye una prueba nueva en un teléfono físico; el APK compilado queda disponible al tester.

## Entrega
Web: https://aprueba.shamiiplay.com/
Móvil web: https://aprueba.shamiiplay.com/movil/
APK 1.0.3 (código 20261103): https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261102-UX.apk

Se mantienen API y Firebase. Respaldo de vistas anteriores en VPS: /opt/shamii/aprueba-backups/ux-20261102.tar.gz. Las descargas anteriores se conservan.

## Corrección posterior de conexión
El frontend se recompiló usando /api/v1 en producción por defecto. La compilación anterior había usado localhost por falta de variable de entorno. Se verificó que el bundle final no contiene la API localhost y se republicó únicamente React, manteniendo móvil y Firebase.
