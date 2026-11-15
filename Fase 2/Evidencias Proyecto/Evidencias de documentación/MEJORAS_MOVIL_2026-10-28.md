# Mejoras de interfaz móvil — 28 de octubre de 2026

Se atendió el feedback sobre el tema claro/oscuro y la dificultad para encontrar funciones distintas de las preguntas, modificando la aplicación Flutter existente de Javiera.

## Cambios

- El tema se carga antes de mostrar la aplicación, se guarda en el perfil y se recuerda localmente. Las respuestas antiguas del perfil no revierten una selección que se está guardando. Si falla el guardado, se restaura el tema anterior.
- Toda la fila «Modo oscuro» permite activar el interruptor. Se evita guardar varias veces simultáneamente y se puede navegar mientras termina el guardado.
- Se conserva la preferencia al cerrar sesión. Se mejoraron fondos, tarjetas, contraste de textos, etiquetas, opciones y botones en ambos temas.
- La navegación principal ofrece Inicio, Medallas, Practicar, Grupos y Más. El menú Más reúne tutores, comunidad, datos y privacidad, planes y ajustes.
- Inicio incorpora accesos visuales a las funciones secundarias. Práctica también permite abrir el menú. Datos y privacidad conserva el regreso a la pantalla anterior.
- Las funciones pendientes y los servicios simulados siguen identificados como tales.

## Validación

- Flutter analyze: sin incidencias. Once pruebas Flutter aprobadas, incluidas persistencia, condiciones de carrera, recuperación ante fallo, contraste y navegación.
- APK instalado y probado en un emulador Android API 35: acceso con una cuenta temporal propia a la API y Firebase reales, guardado claro/oscuro, persistencia tras reiniciar y regreso desde privacidad. La cuenta temporal se eliminó al finalizar.
- Flutter Web probado con Chrome a 390 y 360 píxeles de ancho, API local y emuladores Firebase: navegación a grupos, medallas, tutores, comunidad, perfil y ajustes; recarga con ambos temas; navegación a práctica durante un guardado demorado. Sin errores JavaScript ni desbordamientos detectados en el recorrido.
- Las capturas de la carpeta [Evidencias móvil 2026-10-28](./Evidencias%20m%C3%B3vil%202026-10-28/) corresponden a la aplicación real durante las pruebas; no son maquetas.
- Falta la confirmación visual del tester en sus teléfonos físicos Android/iPhone. El APK se verificó en emulador Android; iPhone utiliza la versión web.

## Entrega

- Versión móvil web: https://aprueba.shamiiplay.com/movil/
- APK privado: https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261028.apk
- Versión Android 1.0.1, código 20261028; Android 7 o superior; ARM32, ARM64 y x86_64. Se mantiene la firma existente de pruebas para permitir actualizar la instalación anterior.
- SHA-256 APK: `549ba91cf031c4663258ce9a8ada182a1df168e73214c092f7363ff20efaded2`.
- La publicación actualiza Flutter Web y agrega el APK; mantiene la misma API, Firebase y dominio con HTTPS.
- Respaldo previo de Flutter Web en la VPS: `/opt/shamii/aprueba-backups/mobile-ui-20261028.tar.gz`.
