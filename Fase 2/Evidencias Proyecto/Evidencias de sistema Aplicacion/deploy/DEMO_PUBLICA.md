# Demostración pública provisional — 12 de octubre de 2026

Web: https://apruebashamiiplaytest.dbm.shared-servers.com/
Móvil Flutter web: https://apruebashamiiplaytest.dbm.shared-servers.com/movil/

Cuenta compartida preparada: demo@aprueba.local / ApruebaDemo2026!
Cuentas adicionales: javiera@aprueba.local y claudio@aprueba.local, misma contraseña demo.
Son cuentas ficticias del proyecto demo-aprueba-entrega. También se pueden registrar nuevas cuentas de demostración desde la interfaz. Abrir en ventana privada o cerrar la sesión anterior para evitar mezclar sesiones de Firebase real y demo.

El backend habitual de Aprueba está conectado temporalmente a Auth y Firestore Emulator en la misma VPS. Ambos frontends mantienen sus URLs y usan la misma API. Los datos Firebase reales y las credenciales originales se conservan; los avances de la demo no se sincronizan con producción. La configuración real sigue en /etc/shamii/aprueba.env y la superposición demo en /etc/shamii/aprueba-demo.env y /etc/systemd/system/aprueba-api.service.d/demo.conf.

Emuladores: servicio aprueba-emulators, Auth 127.0.0.1:9199, Firestore 127.0.0.1:8180, hub 127.0.0.1:4400. Los puertos administrativos no se publicaron. Firebase Tools 15.31.0 y Java 21 portátil en /opt/shamii/aprueba/demo-tools. Los servicios arrancan con el servidor. Datos exportados/importados en /opt/shamii/aprueba/demo/saved-data. El proceso exporta al cerrar de forma controlada; los cambios posteriores al snapshot podrían perderse con una interrupción abrupta.

Preparación: banco revisado con 1.419 ítems únicos, 1.360 publicados y 59 pendientes; tres cuentas; grupo de demostración; publicaciones de ejemplo; cinco respuestas iniciales reales por API en la cuenta demo para mostrar progreso y medallas. La prueba pública posterior agregó dos respuestas a esa cuenta. La cuota diaria de práctica sigue activa y es compartida entre interfaces.

Validación con Chrome público: login web, respuesta con explicación, apertura de plan de estudio/grupos/comunidad/medallas, login móvil con el mismo UID, respuesta móvil y comprobación de incremento de cuota compartido en dos respuestas. Sin errores JavaScript. La primera navegación de prueba tuvo un aviso TLS transitorio; curl con validación Windows y la repetición de Chrome normal funcionaron. No se desactivó la validación TLS.

Las funciones previamente marcadas como pendientes siguen pendientes. Se puede demostrar el recorrido de práctica, progreso, medallas, grupos, comunidad, plan de estudio web y ajustes. Este despliegue no produce un APK/IPA y no valida funciones nativas.

Para volver a Firebase real después de la entrega, ejecutar en la VPS el script Restore-ApruebaFirebaseReal.sh, tras confirmar que Firestore real volvió a responder. El script mueve únicamente la superposición demo y reinicia aprueba-api; conserva la configuración real y los datos demo. No ejecutarlo durante la grabación. Los tokens demo serán inválidos al cambiar a Firebase real y será necesario iniciar sesión de nuevo.
