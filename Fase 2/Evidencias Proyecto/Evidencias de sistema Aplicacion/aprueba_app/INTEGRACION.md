# Integración móvil — prueba privada

Entrega original: aprueba_app_mobile-20261011T202501Z-1-001.zip. El backend alternativo de la entrega se conservó para revisión y no se instaló. La plantilla Aprueba_App (1).html se utilizó como referencia visual, no como una especificación de comportamiento validado.

La app Flutter usa la API de Aprueba ya desplegada, Firebase Authentication a través del servidor y el banco canónico revisado. No se ejecutaron las semillas ni los scripts de eliminación de preguntas de la entrega. Los JSON de preguntas no fueron modificados durante esta integración. La app conserva los identificadores de pregunta y alternativas, envía la respuesta a /practice/answers y obtiene corrección, explicación, cuota y medallas del servidor.

Adaptaciones: autenticación y onboarding compartidos; catálogo autenticado /tests; niveles d1/d2/d3; preferencias de práctica; progreso por prueba; publicaciones y reacciones; grupos y código para unirse; intercambio de medallas con identificadores de operación; ajustes de idioma, tema y hora de recordatorio. El recordatorio web no equivale a una notificación nativa.

Las funciones de la entrega que todavía no tienen un contrato compatible se muestran como pendientes: pagos, suscripciones, regalos, recorrecciones, notificaciones, beneficios y edición avanzada/eliminación de cuenta. No se simulan cobros ni premios. El ensayo facsímil no se ofrece como una modalidad funcional.

## Despliegue

URL: https://apruebashamiiplaytest.dbm.shared-servers.com/movil/

Flutter 3.47.7, Dart 3.13.5. Compilación web release con base /movil/ y API_URL apuntando al backend HTTPS compartido. Se aloja en /opt/shamii/aprueba/web/dist/movil. El servidor Aprueba conserva el puerto 8081 y Copa Kick el 8080. Respaldos previos: /var/backups/shamii/aprueba-before-mobile-20261011-210000.tar.gz y /var/backups/shamii/aprueba-before-mobile-20261011-210607.tar.gz.

La web permite una primera prueba desde navegadores Android y iPhone. No se generó ni se validó un APK/IPA. La compilación iOS nativa requiere el entorno macOS/Xcode y su distribución correspondiente. La prueba en Chrome no acredita compatibilidad completa con Safari ni con funciones nativas.

## Validación

- 6 pruebas Flutter: lectura del contrato de preguntas, identificadores de alternativas, banco vacío frente a completado, premios del servidor, perfil compartido, conteos sociales y aviso de funciones pendientes.
- Analizador Flutter sin incidencias después de las correcciones.
- 45 pruebas unitarias de la API aprobadas. La ejecución indiscriminada de node --test también encontró las suites de emuladores y rechazó ejecutarlas sin configuración demo; se usó después la selección de pruebas unitarias definida en package.json.
- Compilación web release completada.
- Chrome con ventana 390×844: carga pública, pantalla inicial, login con cuenta temporal compartida obtención de pregunta real, envío de respuesta, corrección/explicación y premio de una medalla de bronce. El perfil consultado desde la API conservó el mismo UID. Sin errores JavaScript durante ese recorrido. Cuentas temporales eliminadas al terminar.

La revisión funcional no está completa para todas las pantallas. Queda validar en dispositivos reales, ampliar cobertura de grupos/comunidad/medallas desde Flutter y desarrollar las funciones marcadas como pendientes.

## Actualizar la versión web móvil

Desde esta carpeta, con Flutter instalado:

```powershell
flutter pub get
flutter test
flutter analyze
flutter build web --release --base-href /movil/ --dart-define=API_URL=https://apruebashamiiplaytest.dbm.shared-servers.com/api/v1
```

Publicar únicamente el contenido de build/web en el directorio móvil de la VPS, con respaldo previo. El actualizador web existente extrae archivos sin borrar el directorio móvil; actualizar React no recompila Flutter. El endpoint /tests y la validación reminderTime son las extensiones de la API necesarias para esta entrega.
