# Homologación web y móvil — 16 de noviembre de 2026

Se integraron los commits de rediseno-onboarding hasta a0c45c0 conservando el diseño y trabajo del equipo.

## Cambios

- Web: campana y listado de notificaciones, recompensa diaria, análisis de aciertos, tutores con búsqueda/filtros y solicitud simulada con reintento seguro; cambio de contraseña y eliminación confirmada de cuenta.
- Móvil: plan de estudio persistido, historial de actividad y medallas, publicaciones de grupo y comentarios paginados compartidos con la comunidad; retorno al plan gratuito.
- Ambas interfaces usan la misma API y política de acceso: tutores y análisis requieren el plan completo vigente de $4.990. El porcentaje de aciertos se distingue del avance por cobertura.
- Eliminación: conserva integrantes y publicaciones de otras personas; transacciones para transferir grupos y retirar reacciones sin descontar dos veces. Anonimiza aportes conservados. Se desplegó el índice collection-group comments.authorUid conservando índices de colección existentes.
- Registro: consentimiento explícito e idioma, sin inventar consentimiento en cuentas históricas.
- Facsímil permanece deshabilitado como Próximamente. PayPal queda pendiente; los planes y solicitudes de tutoría siguen siendo una simulación sin cobros.

## Validación

API: 63 pruebas unitarias, 5 pruebas de eliminación y 5 pruebas de contratos compartidos en emuladores aislados. React: 8 pruebas, lint y build. Flutter: análisis estático, suite de pruebas y compilaciones web y APK release. Navegador: 10 comprobaciones con API simulada en temas claro/oscuro. Los emuladores no usan la base de producción.

APK 1.0.6+20261116, compatible desde Android 7 y con la misma firma de pruebas que el APK anterior. La instalación y las notificaciones nativas deben comprobarse en un teléfono real. El acceso social nativo mantiene la limitación previa de usar navegador.

## Publicación

- Web: https://aprueba.shamiiplay.com/
- Móvil web: https://aprueba.shamiiplay.com/movil/
- APK: https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261116.apk

Se publica únicamente código y compilaciones de Aprueba, con respaldo previo del servidor. No se ejecutan seeds, migraciones de usuarios ni borrados de datos de producción. Se conservan credenciales, dependencias y APK anteriores.

### Resultado verificado

Publicación completada el 16-11-2026. Web, móvil, API health y APK responden HTTPS 200; API conectada a Firebase. Versión móvil 1.0.6+20261116. Servicios aprueba-api, nginx y shamii-tournaments activos. Respaldo: /opt/shamii/aprueba-backups/aprueba-20261116-060836.tar.gz.

SHA-256 APK: 11a524a1a73075027e087aff39a576f7eb9fc6e08420d903b0e89a3914c9d5dc. SHA-256 Flutter main.dart.js: 3113e6529c013559cca4671ff5c0a129ca6c11b93a239e17fa0d3426e6bcd9c2. Ambos coinciden entre compilación local y servidor. No se realizaron recorridos autenticados con cuentas reales durante esta publicación; esas funciones se validaron en emuladores y navegador con API simulada.
