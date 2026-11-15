# Invitaciones de grupos y APK Android de pruebas

## Corrección del feedback

La app móvil ya tenía «Copiar código para invitar» en el detalle del grupo. Al crear desde Compartir pregunta, CreateGroupScreen descartaba el grupo creado y cerraba la pantalla. El usuario regresaba al selector sin llegar a la invitación.

Ahora se abre el detalle del grupo recién creado y se destacan las invitaciones. Se muestran el código completo y los botones para copiar código o enlace. Se conserva el código privado con token, sin sustituirlo por el ID público. La pantalla anterior para compartir preguntas permanece en el recorrido.

El enlace canónico abre /invitacion?codigo=… en la web. Presenta el acceso a la cuenta y conserva la invitación durante login, verificación y onboarding en ese navegador. Unirse requiere confirmación: abrir el enlace no agrega miembros automáticamente. Se corrigió también la redirección del login para que no descarte la invitación. En Android puede pegarse el enlace o código en Grupos → Unirme con código. No se configuraron Android App Links: tocar el enlace abre la web, no garantiza abrir el APK.

Las interfaces web y móvil utilizan la misma API y Firebase real. No se cambió la protección de grupos privados ni las reglas de verificación del correo.

## Validación

- Análisis Flutter sin incidencias y seis pruebas aprobadas.
- Lint web y seis pruebas aprobadas.
- Diez comprobaciones de navegador web con Firebase Emulator: dos cuentas aisladas, crear desde el contexto de compartir pregunta, invitaciones visibles, copiar enlace canónico, denegar ingreso privado con ID solo, conservar invitación tras login, ingresar pegando enlace, confirmar dos miembros y rechazar un enlace malformado.
- Tres comprobaciones de interfaz Flutter Web real contra la API local con emuladores: crear abre detalle, copiar enlace completo y copiar el mismo código privado.
- No se utilizaron maquetas HTML como representación del móvil ni cuentas reales de usuarios para estas pruebas.
- Compilaciones de producción React, Flutter Web y APK release generadas correctamente. Firma APK verificada con apksigner; paquete y compatibilidad inspeccionados con aapt.
- La ejecución nativa del APK no pudo verificarse: el emulador Android normal rechazó iniciar por falta de espacio libre en C:, y el intento reducido tampoco pudo arrancar por falta de imagen inicial de datos. No se afirma que se haya instalado en un dispositivo ni probado un recorrido nativo completo. El tester debe confirmar la instalación y uso en Android físico.

## APK para el tester

- Descarga: https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261026.apk
- Archivo local: .deployment/releases/Aprueba-Android-pruebas-20261026.apk
- Tamaño: 63.172.777 bytes, aproximadamente 60,2 MiB.
- Versión: 1.0.0, código 20261026.
- Paquete existente conservado: com.example.aprueba_app.
- Android mínimo: 7.0 / API 24. Target SDK 36.
- Arquitecturas: arm64-v8a, armeabi-v7a, x86_64.
- API: https://aprueba.shamiiplay.com/api/v1.
- SHA256: 49490bd032c833b020d073553b521775b644cad2f2f5151382a37daa711c7290.
- Build release con la firma Android Debug ya configurada en el proyecto. Válido para distribución privada de pruebas; no es una publicación en Play Store ni una clave de firma de producción preparada para tienda.
- La vinculación Google nativa sigue pendiente; el adaptador informa usar la versión web. Pagos y tutores conservan el modo simulado acordado. Verificación de correo y cuenta compartida se mantienen.
- El APK no se instala en iPhone. Para iPhone se mantiene la versión móvil en navegador.

## Guía breve de prueba física

1. Descargar el APK desde Android y permitir instalar desde la fuente elegida cuando el sistema lo solicite.
2. Iniciar sesión con una cuenta propia o registrarse y confirmar el correo. No hay credenciales de usuarios incluidas en el archivo.
3. Elegir una prueba con contenido, responder y entrar a Compartir al grupo. Si no hay grupos, crear uno privado.
4. Comprobar que aparece el detalle con código y botón Copiar enlace. Enviar el enlace por un canal elegido por el tester a una segunda persona autorizada.
5. Con una segunda cuenta, confirmar el ingreso desde la web o pegar el enlace/código en Grupos del APK. Verificar ambos integrantes y compartir una pregunta.
6. Registrar modelo Android, versión del sistema, pasos del problema y captura si aparece un fallo.

## Publicación

Se actualizaron las interfaces y se habilitó la descarga. La API no requirió modificación ni reinicio. Se conservaron HTTPS, Firebase y CanvasKit remoto.

- Respaldo: /opt/shamii/aprueba-backups/groups-ui-20261026.tar.gz.
- Servicios aprueba-api, nginx y shamii-tournaments activos.
- Hash de main.dart.js: 51015acfa918dcd3e7ab5462f3a4610e936fe8c2195cc5567977bd7b88044aed.
- Hash de index.html web: 8d4c5fe28675f5356e5103cb49d76c969af2f208cdadcdcf50fb5f698e7385ec.

Los cambios permanecen guardados localmente y publicados. No se realizó commit ni push. No se envió el APK a ninguna persona desde herramientas externas; se entrega el enlace al usuario para que lo comparta.
