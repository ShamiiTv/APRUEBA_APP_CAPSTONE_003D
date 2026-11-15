# Verificación obligatoria de correo · web y móvil

## Comportamiento

El registro crea la cuenta, inicia una sesión limitada e intenta enviar el enlace de verificación de Firebase. Si el envío inicial falla, la cuenta se conserva y se permite solicitar otro correo desde la pantalla de verificación. No se guardan contraseñas ni códigos de verificación en Firestore.

Antes de confirmar el correo, el usuario permanece en «Confirma tu correo». Puede comprobar el estado, reenviar el enlace con su contraseña actual o cerrar sesión. Después de abrir el enlace y pulsar «Ya confirmé mi correo · Comprobar», pasa a la selección de pruebas si no completó su configuración, o a Inicio si ya lo hizo.

La regla también se aplica a las cuentas existentes que no estén verificadas. No se eliminan sus datos ni su progreso. No se añadió SMS ni facturación.

## Protección compartida

- Firebase Authentication es la fuente del estado emailVerified. No se confía en un valor enviado por el cliente ni en un privilegio guardado en el JWT.
- La API bloquea onboarding, catálogo de pruebas, práctica, progreso, plan de estudio, grupos, publicaciones, medallas, planes, habilidades, soporte y tutores para cuentas no verificadas.
- El rechazo utiliza HTTP 403 con código EMAIL_VERIFICATION_REQUIRED. No cierra ni renueva automáticamente la sesión como si fuera un error de contraseña.
- Se conserva acceso autenticado a las operaciones de cuenta necesarias para verificar y recuperar la cuenta.
- El reenvío tiene límite de una solicitud por minuto por UID en producción; los usuarios de una misma IP no comparten ese límite. Requiere contraseña actual e identidad Firebase coincidente.
- El formulario móvil compacto acordado anteriormente queda incluido en la compilación publicada. La selección existente de Javiera se conserva.

## Validación realizada

- 60 pruebas unitarias API aprobadas, incluyendo origen fiable del estado y limitación por usuario.
- 3 pruebas de integración de autenticación en Firebase Emulator aprobadas. El recorrido comprueba enlace inicial, rechazo antes de verificar, código inválido, código reutilizado y acceso con la misma sesión después de confirmar.
- 6 pruebas web y lint aprobados; compilación de producción generada con API relativa /api/v1.
- 6 pruebas Flutter y análisis estático aprobados; compilación de producción generada para /movil/ y API canónica HTTPS.
- 19 comprobaciones de navegador aprobadas en web y Flutter Web contra el proyecto aislado demo-aprueba-email-verification. Incluyen registro desde ambos formularios reales, URLs directas bloqueadas, reenvío web, contraseña incorrecta, comprobación de estado y llegada a la selección de pruebas después de confirmar. Sin errores JavaScript en ese recorrido.

Las pruebas emuladas no envían mensajes a bandejas reales. Queda por comprobar manualmente la entrega y ubicación del correo en una casilla del equipo: crear una cuenta propia, revisar bandeja/spam, abrir el enlace de Firebase y volver a «Comprobar». No se afirma que se haya probado la entrega real del proveedor, un APK ni una IPA.

## Publicación

Se actualizaron API, React web y Flutter Web. No se modificaron claves, HTTPS ni el proyecto Firebase, ni se publicaron los emuladores locales. Se conservaron las dependencias y el runtime CanvasKit existente.

- Web: https://aprueba.shamiiplay.com/
- Móvil en navegador: https://aprueba.shamiiplay.com/movil/
- Respaldo: /opt/shamii/aprueba-backups/email-verification-20261025.tar.gz
- Salud posterior: ok, connected (Firebase).
- Servicios: aprueba-api, nginx y shamii-tournaments activos.
- SHA256 web index.html: b1387a93606dc5f96663c3c60e4d31a5032a5332005083cbb7f9baa4a8a9207b.
- SHA256 móvil main.dart.js: b5096d50f35d65c9aae99fa2fe8a53bbb5c01659443773cf531a0fba6402ee38.

Si un navegador conserva una versión anterior, recargar antes de probar. Los cambios están guardados en el proyecto local y desplegados; este trabajo no realizó commit ni push.
