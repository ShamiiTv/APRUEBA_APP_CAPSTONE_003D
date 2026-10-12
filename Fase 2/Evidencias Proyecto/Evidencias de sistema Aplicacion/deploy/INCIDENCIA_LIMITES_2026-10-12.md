# Bloqueos de acceso y lecturas repetidas

Los registros mostraron respuestas 429 en login/registro y consultas reiteradas /auth/me con 401 desde la interfaz Flutter. El gateway presenta una IP de origen compartida; el limiter anterior admitía sólo 10 solicitudes por 15 minutos sumando login, registro y recuperación, incluso exitosas. La comprobación directa de una lectura Firestore y el health de la API funcionaron durante el diagnóstico: la primera consulta simple funcionó, pero posteriormente la consulta exacta de registro confirmó error 8 RESOURCE_EXHAUSTED: Quota exceeded. El health escribía en lugar de consultar, por lo que se cambió a una lectura real y respuesta 503 cuando no puede consultar.

Cambios:
- Presupuesto de login por cuenta normalizada; 10 fallos/15 minutos en producción. Los logins exitosos no lo consumen. Registro y recuperación usan presupuestos separados. El límite general permanece habilitado.
- Desactivados los reintentos automáticos de providers Flutter para evitar repetir errores de sesión/servicio. Las acciones explícitas de recarga siguen disponibles.
- Una caché compartida en memoria mantiene el banco de preguntas durante una hora y agrupa lecturas concurrentes. Progreso y selección de próxima pregunta usan esa caché. Historial, cuota y premios siguen consultándose/validándose por usuario; el envío de respuestas verifica la pregunta directamente en Firestore.
- El banco actualizado/retirado se refleja en la selección al expirar la caché o reiniciar aprueba-api. Reiniciar la API después de publicar cambios editoriales evita esperar esa hora. La caché no se entrega al navegador con las soluciones.

El error QUOTA_EXCEEDED de práctica sigue significando 20 preguntas respondidas en el día de Chile, compartidas por web y móvil. Navegar y obtener preguntas no consume esa cuota. No se modificaron saldos ni cuotas de usuarios.

Validación local: 45 pruebas previas y tres nuevas (dos de caché y una de limitación real HTTP) aprobadas; seis pruebas Flutter aprobadas; analizador sin incidencias. La prueba HTTP valida logins correctos repetidos, bloqueo tras diez fallos, aislamiento entre cuentas y registro separado.

Despliegue correctivo con respaldo /var/backups/shamii/aprueba-before-mobile-20261012-205010.tar.gz. La validación pública con registro temporal quedó bloqueada por la cuota de Firestore; no se dio por aprobada. La recuperación del servicio depende del restablecimiento de esa cuota externa. No se activó facturación ni se cambiaron permisos.

Resultado final: 48 pruebas API aprobadas, 6 Flutter aprobadas, analizador sin incidencias. En Chrome público la interfaz móvil realizó sólo una consulta de perfil durante la espera de 12 segundos y no produjo errores JavaScript. La API desplegada devuelve DATABASE_QUOTA_EXCEEDED en el health basado en lectura. Respaldo final: /var/backups/shamii/aprueba-before-mobile-20261012-205327.tar.gz. Registro/login/práctica completos deben repetirse después de recuperarse la cuota del servicio; no se afirmaron como validados en producción en esta incidencia.
