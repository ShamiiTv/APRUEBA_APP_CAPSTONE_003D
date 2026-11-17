# Despliegue de Aprueba en VPS

Configuración recuperada del chat «Revisar y escalar torneos», relacionado con Copa Kick, y comprobada por SSH el 10-10-2026.

- Database Mart, Ubuntu 24.04; host compartido 93.127.139.145, SSH 10047.
- Dominio principal: https://aprueba.shamiiplay.com; móvil: https://aprueba.shamiiplay.com/movil/ (gateway hacia puerto 8081). El alias anterior se conserva como referencia histórica.
- Código API: /opt/shamii/aprueba/api; interfaz: /opt/shamii/aprueba/web/dist.
- Servicio: aprueba-api, usuario exclusivo aprueba-api, Node /opt/aprueba-node-v22.23.5/bin/node y configuración /etc/aprueba/api.env (desde 17-11-2026).
- Configuración Firebase actual: /etc/aprueba/firebase.json para aprueba-app-9d317, permisos 640 root:aprueba-api; /etc/aprueba/api.env es 600 root:root. Las rutas anteriores se conservan privadas para recuperación; no volver a dar acceso al usuario compartido shamii.
- Torneos usa otros directorios/servicio y puerto 8080. El despliegue de Aprueba no reinicia ni modifica ese proyecto.

La clave y known_hosts existentes se referencian desde C:/Users/Shamii/Desktop/Torneo-GTA. No se copian a este repositorio ni se muestran en informes. No desactivar StrictHostKeyChecking. .deployment está ignorado por Git.

## Actualizar avances

Desde PowerShell, ejecutar & './Fase 2/Evidencias Proyecto/Evidencias de sistema Aplicacion/deploy/Update-Aprueba.ps1' para preparar un paquete validado. Agregar -Publish para subirlo, guardar respaldo remoto y actualizar Aprueba. El script ejecuta pruebas, lint y build con VITE_API_BASE_URL=/api/v1. Cualquier fallo detiene el despliegue.

Para actualizar también Flutter web, usar `-IncludeMobile -FlutterPath "ruta/a/flutter.bat"`. La compilación usa el dominio nuevo y se incluye bajo `/movil/`. Sin ese parámetro se conserva la app móvil que ya está en la VPS.

El paquete contiene solo fuente API, manifests, dist e índices/reglas. No contiene .env, credenciales, datos de usuarios ni emuladores. Conserva configuración del servidor y prepara dependencias de producción en un directorio nuevo, validando audit y salud; mantiene la versión anterior completa para reversión. Los respaldos quedan en /opt/shamii/aprueba-backups; el script no borra copias ni datos Firebase.

Los despliegues se ejecutan durante el trabajo autorizado en este chat, después de validar cambios. Este procedimiento no crea una automatización periódica ni publica silenciosamente cambios sin revisar.

## Estado operativo

Publicación verificada el 10-10-2026: paquete aprueba-20261010-040720, respaldo en /opt/shamii/aprueba-backups/aprueba-20261010-040720.tar.gz. La interfaz responde HTTP 200 y su JavaScript coincide por SHA-256 con el paquete local. Nginx y shamii-tournaments permanecen activos. La API responde 503 mientras faltan credenciales reales. Validación: 44 pruebas API, 6 pruebas cliente, 9 pruebas de práctica en emulador, lint y build aprobados. La prueba del banco se ejecuta en un proyecto de emulador nuevo para evitar interferencia de datos de ejecuciones anteriores.

Actualización posterior del 10-10-2026: API habilitada con Firebase real; Firestore responde y Email/Password devuelve INVALID_LOGIN_CREDENTIALS ante credenciales inexistentes (no se creó usuario de prueba). Banco cargado: 1.419 documentos, 1.360 publicados y 59 pendientes. Se guardó respaldo privado previo de preguntas; la base no contenía preguntas. No se cargaron catálogos de demostración de patrocinadores, beneficios ni tutores. No se migraron usuarios de los emuladores locales. Reglas e índices todavía requieren despliegue y verificación para completar los módulos que dependen de índices compuestos. Los despliegues normales de código no ejecutan seeds remotos.

Testeo posterior: reglas desplegadas y 19 índices solicitados con el rol Cloud Datastore Index Admin agregado por el usuario. La validación final aprobó 44 comprobaciones de API con 0 fallos, incluidos feeds público/privado y listado de planes. Chrome validó HTTPS y el recorrido público de registro/onboarding/práctica/login. Consultar TESTEO_VPS.md para resultados y límites: prueba privada del flujo gratuito, pagos pendientes y catálogos comerciales sin datos de demostración.

El proveedor presentó anteriormente una cadena TLS incompleta. Chrome validó HTTPS en esta revisión; no desactivar TLS para las llamadas de aplicación.

Desde 17-11-2026 puede incluirse APK con -IncludeMobile -IncludeApk -FlutterPath explícito. Consultar REVISION_CIBERSEGURIDAD_2026-11-17.md y MANTENIMIENTO_UBUNTU_2026-11-17.md para el estado de seguridad y mantenimiento pendiente.
