# Estilo de activación de cuenta — 2026-11-02

Se alineó la pantalla de confirmar correo con las plantillas existentes de Aprueba: tarjeta redondeada, tipografía y colores de marca, correo destacado, acción principal dorada y sección secundaria de reenvío. Flutter utiliza los colores adaptativos existentes y un ancho limitado para pantallas grandes.

Las acciones y las restricciones de verificación se conservan. No se modificó la API ni Firebase. Las pruebas visuales utilizaron respuestas API aisladas para revisar claro/oscuro y reenvío sin enviar correos reales. No sustituyen una prueba de entrega de correo.

Validación: build React correcto, Flutter analyze sin incidencias, Flutter Web y APK compilados, firma APK verificada. Pantallas web y Flutter Web recorridas en Chrome a 390 píxeles en ambos temas, sin desbordamientos detectados. Capturas de la aplicación real junto a este documento.

Entrega: misma web https://aprueba.shamiiplay.com/ y móvil https://aprueba.shamiiplay.com/movil/. APK 1.0.2, código 20261102: https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261102.apk.

Respaldo de las vistas anteriores en VPS: /opt/shamii/aprueba-backups/activation-style-20261102.tar.gz. Se mantienen las descargas anteriores.
