# Aprueba: revisión de ciberseguridad y correcciones

Fecha: 17 de noviembre de 2026. Alcance: API Express/Firebase, React, Flutter web/Android, dependencias, historial Git, configuración de Firebase, GitHub y servicio Aprueba en la VPS compartida. Se aplicaron controles y pruebas concretas; este informe no es una certificación OWASP ni demuestra ausencia de toda vulnerabilidad.

## Resultado ejecutivo

Se corrigieron riesgos de dependencias, almacenamiento de sesiones del navegador, revocación al cerrar sesión, validación, exposición de campos internos, permisos Linux, aislamiento del proceso y cabeceras HTTP. Las correcciones de aplicación se compilaron y publicaron como versión 1.0.8+202611170, con respaldo y conservación de las cuentas, datos y APK anteriores. Los pagos continúan simulados por decisión del proyecto.

Quedan tareas de producción que requieren mantenimiento del host o intervención del propietario: revisar IAM completo, activar/verificar MFA administrativo, definir firma de producción Android y acreditar restauración externa de respaldos. No se debe presentar el sistema como listo para producción comercial mientras estas tareas sigan abiertas.

## Hallazgos y tratamiento

| ID | Prioridad | Evidencia y alcance | Tratamiento |
|---|---|---|---|
| SEC-01 | Alta | `npm audit`: API 13 alertas (2 altas), web 6 (3 altas). Incluían body-parser, Zod, Vite y dependencias transitivas. Algunas afectaban herramientas de desarrollo o rutas no utilizadas, no se afirmó explotación. | Actualizaciones compatibles; retirada de nodemon por `node --watch`; overrides de rimraf 6.1.4 y uuid 11.1.1 probados con Firebase. Auditorías finales API/web: cero alertas conocidas en esta consulta. |
| SEC-02 | Alta | React persistía JWT de acceso y renovación en localStorage; Flutter web conservaba tokens en almacenamiento del navegador. | Renovación en cookie HttpOnly, Secure en producción, SameSite=Strict, sin Domain y limitada a `/api/v1/auth`; acceso solo en memoria. Marcador local sin credenciales y migración de sesiones antiguas. Cookies separadas para React y Flutter web evitan mezclar identidades entre interfaces. Android mantiene almacenamiento seguro nativo. |
| SEC-03 | Media | Cerrar sesión eliminaba solo los tokens del dispositivo. | Identificador de sesión firmado y revocación por dispositivo en servidor. Acceso y renovación rechazados tras logout. Tokens antiguos sin identificador usan revocación Firebase al cerrar sesión. Sin conexión, el dispositivo se limpia, pero la revocación remota requiere que la solicitud alcance el servidor. |
| SEC-04 | Media | CORS abierto y errores/tamaños de entrada sin política homogénea. | Lista de orígenes aprobados; soporte explícito de clientes nativos; JSON máximo 32 KiB, sin descompresión de solicitudes; 400/413/415 seguros; datos sensibles `no-store`; límites de escrituras por cuenta y de autenticación. Desarrollo usa proxy de la misma procedencia para cookies. |
| SEC-05 | Media | Endpoints heredados de soporte/habilidades aceptaban tipos y tamaños insuficientemente validados y podían devolver errores internos. | Listas de campos permitidos, IDs y enums, límites de texto/consulta, tickets atómicos, contador de reportes leído dentro de transacción y errores opacos. |
| SEC-06 | Media | Respuestas de perfil propagaban el documento completo, con riesgo de devolver campos internos o credenciales históricas si existían. | Proyección explícita de campos de perfil en login, registro, lectura/actualización y selección de plan. Prueba con secretos ficticios almacenados confirma su exclusión. No se afirmó que hubiera contraseñas reales almacenadas. |
| SEC-07 | Alta | Código y dist tenían permisos 777; API compartía usuario y grupo con otros servicios. | Archivos root:root, sin escritura para grupo/otros; usuario `aprueba-api`, configuración separada `/etc/aprueba`, privilegios/capacidades mínimos, sistema de archivos de solo lectura para el proceso, dispositivos privados y límites de memoria/tareas. Dependencias nuevas se preparan aparte y la publicación conserva el aislamiento. |
| SEC-08 | Media | Respaldo con permisos 755 y archivo histórico de demo 666. | Respaldos privados 700 y archivos sin permisos para otros; archivo de demo protegido. Los originales no se borraron. |
| SEC-09 | Media | Interfaces sin CSP, HSTS ni defensa explícita contra framing; rutas `/.env` y `/.git/config` devolvían HTML del SPA con 200. | CSP ajustada y probada para React y Flutter; HSTS, nosniff, protección de framing, política de referencias/permisos y redirección HTTPS. Rutas sensibles 404. El 200 anterior era fallback del SPA: no se encontró una filtración de esos archivos. |
| SEC-10 | Media | Logs nginx por defecto podían registrar parámetros de URL con códigos de recuperación. | Registro exclusivo de Aprueba sin query string, cuerpo ni Authorization. No se borró el histórico. |
| SEC-11 | Media | Runtime Node de Aprueba 22.23.3 y autenticación SSH por contraseña habilitada para cuentas no root. | Node 22.23.5 LTS verificado contra SHA-256 oficial e instalado aparte, sin cambiar Node de otros servicios. SSH solo por clave, validación previa, temporizador de reversión y conexión nueva comprobada. |
| SEC-12 | Media | Política de contraseña Firebase no declarada, aunque la API exigía 8–128. | Política Firebase ENFORCE 8–128 sin forzar actualización al inicio de sesión de cuentas existentes; configuración previa respaldada. No se añadieron requisitos de composición incompatibles con las aplicaciones. |
| SEC-13 | Media | Secret scanning, push protection y actualizaciones de seguridad Dependabot estaban deshabilitados. | Activados mediante API de GitHub. Se incorporaron flujos CI y configuración Dependabot con acciones fijadas a SHA. El resultado del primer CI se registra aparte. |
| SEC-14 | Alta, atendida el 17-11-2026 | Ubuntu ejecuta kernel 6.8.0-36 y existe `reboot-required`; simulación de upgrade identifica 174 paquetes. | Mantenimiento autorizado y completado: 178 paquetes actualizados, 26 nuevos y 0 eliminados; reinicio con kernel 6.8.0-149. Servicios, datos e integridad verificados. snapd quedó aplazado por phasing de Ubuntu; ver informe de mantenimiento. |

## Pruebas y evidencias

- API: 67 pruebas unitarias, incluyendo CORS en producción, cookies Secure/HttpOnly, proyección de perfil y throttling por cuenta.
- Aplicación real contra emuladores aislados: 9 pruebas de seguridad. Se cubrieron ausencia/falsificación/confusión de tokens; inyección de privilegios; acceso de un no miembro a grupos privados, posts, comentarios, likes e invitaciones; notificaciones/regalos entre cuentas; tipos inválidos en soporte; cookie, namespaces y cierre por dispositivo; contraseña incorrecta y cuenta deshabilitada.
- Regresiones en emuladores: 5 de eliminación y 5 de contratos compartidos; Firebase actualizado conservó comportamiento. No se usaron cuentas reales para estas pruebas.
- React: 10 pruebas, lint y build. Chrome con backend real de emuladores comprobó login, ausencia de JWT persistidos, cookie HttpOnly, recarga, HTML almacenado tratado como texto, revocación de bearer capturado y migración de sesión anterior.
- Flutter: análisis estático, suite de 42 pruebas y builds release web/Android. El manifiesto compilado declara allowBackup=false y usesCleartextTraffic=false; no es un APK debug, aunque conserva la firma de pruebas para actualizar instalaciones existentes.
- Dependencias Pub: 83 paquetes hospedados consultados en OSV, sin avisos en la respuesta obtenida. Esto no sustituye análisis de código ni garantiza ausencia de vulnerabilidades no publicadas.
- Git: 663 objetos de texto del historial examinados con patrones de alta confianza para claves privadas, tokens GitHub y claves AWS; sin coincidencias. El escaneo no equivale a cobertura universal de todos los tipos de secreto ni a análisis de binarios/documentos comprimidos.
- Firebase real: reglas desplegadas de Firestore verificadas como deny-all para clientes; acceso de Admin SDK sigue controlado por IAM y los permisos de la API. Protección contra enumeración de correo habilitada y autenticación anónima deshabilitada.
- VPS: API conectada a Firebase, escucha solo en 127.0.0.1:4000, usuario dedicado y código no escribible por el proceso. Aprueba, nginx y Torneos activos.
- HTTPS público: interfaces 200; perfil sin token 401; origen no autorizado 403; archivos sensibles 404; APK nuevo y anteriores disponibles. Chrome abrió React y Flutter web con CSP real sin errores ni infracciones de política.

## Respaldos y publicación

- Aislamiento/configuración: `/opt/shamii/aprueba-backups/security-20261117T034302Z`.
- Runtime/logging: `/opt/shamii/aprueba-backups/security-runtime-20261117T035534Z`.
- Contraseñas Firebase: `/opt/shamii/aprueba-backups/security-password-policy-2026-11-17T03-53-52.625Z`.
- SSH: `/opt/shamii/aprueba-backups/security-ssh-20261117T041003Z`.
- Release anterior completo, con dependencias y dist: `/opt/shamii/aprueba-backups/security-release-20261117T041347Z`.
- APK: https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261117-seguridad.apk
- SHA-256 APK: `dead1b802eb7d4285cf505eee05ff3ca92d9cbc722e6f52debd08dadbb1c94b7`.
- SHA-256 Flutter main.dart.js: `41796e35895e34464163665f0f821c0569aec9d3e25fce0ec85fb2fdca70581c`.
- SHA-256 lockfile API: `3632c403bc86155537246f15f3e2d0036aef53f045517069dfe0521dc842f7ec`.

La entrega excluye secretos, usuarios, datos de emuladores y backups privados. La publicación normal ahora prepara `npm ci --omit=dev --ignore-scripts` en un directorio nuevo, conserva el API anterior con node_modules y activa con validación de salud y reversión. No aplicar el antiguo chown recursivo a shamii. Consultar `deploy/Update-Aprueba.ps1` e `Install-ApruebaRelease.sh`.

## Pendientes antes de producción comercial

1. **Mantenimiento continuo (operador):** la actualización/reinicio autorizados del 17-11-2026 están completados y verificados. Seguir el aplazamiento gradual de snapd y futuras actualizaciones. La existencia de copias no demuestra una restauración externa exitosa; no se hizo una emisión real ni una prueba autenticada con cuentas de producción durante el reinicio.
2. **IAM completo y MFA (propietario):** la cuenta de servicio devuelve 403 al leer la política IAM del proyecto. Revisar en la consola los roles de usuarios/cuentas de servicio y MFA de Google/GitHub. No se le otorgó Owner a la aplicación para facilitar una auditoría.
3. **Firma Android de producción (equipo):** gestionar un keystore de producción protegido y un plan de transición/Play App Signing. No sustituir automáticamente la firma actual porque impediría actualizar los APK de prueba instalados. Probar instalación y sesión en teléfono físico.
4. **Continuidad y datos personales (equipo/operador):** verificar una restauración aislada, cifrado y copia fuera del servidor; fijar RPO/RTO, retención de logs y política de borrado. No publicar respaldos ni datos reales en el repositorio.
5. **Operación de sesiones:** vigilar crecimiento de `users/{uid}/revokedSessions` y configurar TTL para expiresAt; no hay revocación remota garantizada mientras el dispositivo esté sin red. Los JWT de renovación expiran en 30 días y se revocan por familia/dispositivo, pero no tienen rotación de un solo uso en cada renovación. Evaluarla antes de incorporar sesiones de alto riesgo.
6. **Control de abuso y carga:** revisar límites reales del gateway y origen confiable de IP; valorar App Check/reCAPTCHA con cambios coordinados de clientes. No se hicieron ataques de carga, DDoS, fuerza bruta de contraseñas reales ni pruebas sobre otros sitios/servicios de la VPS.
7. **Pagos:** desactivar el modo simulación y revisar verificación de webhooks, importes y derechos antes de integrar cobros reales. El actual acceso a planes simulados no representa un pago validado.
8. **Revisión independiente:** realizar pentest externo y revisión humana de permisos/reglas y requisitos de privacidad; esta intervención no acredita conformidad legal ni certificación ASVS.

## Referencias utilizadas

- [OWASP REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) y [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
- [Firebase: reglas y Admin SDK](https://firebase.google.com/docs/firestore/security/insecure-rules).
- [Identity Platform: política de contraseñas](https://docs.cloud.google.com/identity-platform/docs/password-policy); se contrastaron los nombres reales de campos con el discovery REST v2.
- [Android: configuración de seguridad de red](https://developer.android.com/privacy-and-security/security-config).
- [Node 22.23.5 LTS](https://nodejs.org/en/blog/release/v22.23.5).
- [GitHub: seguridad y análisis del repositorio](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository).

## Cierre de CI y clasificación de resultados

El commit de aplicación 82d42c3 pasó los cinco trabajos de CI (API, web, autorización, Flutter y CodeQL): https://github.com/ShamiiTv/APRUEBA_APP_CAPSTONE_003D/actions/runs/44016661025. Dependabot y secret scanning no mostraron alertas abiertas en la consulta final. CodeQL generó nueve avisos de missing-rate-limiting en test/auth.emulator.test.js y test/parity.emulator.test.js; se verificó su guardia demo-, escucha loopback y exclusión de releases, y se clasificaron individualmente como used in tests con justificación en alertas 1 a 9. No se excluyeron reglas ni rutas de producción; la consulta posterior de CodeQL no mostró alertas abiertas. La clasificación no significa que se hayan corregido nueve fallos explotables en producción.

Se consolidaron las cabeceras de la API para evitar valores duplicados de X-Frame-Options (respuesta final DENY). Respaldo adicional: /opt/shamii/aprueba-backups/security-headers-20261117T042316Z. El mantenimiento de Ubuntu fue autorizado y completado posteriormente; resultados concretos en MANTENIMIENTO_UBUNTU_2026-11-17.md.

Cierre del mantenimiento: kernel 6.8.0-149-generic activo, sin reinicio adicional requerido; 178 paquetes actualizados, 26 nuevos, 0 eliminados. Se conservaron configuraciones, APK, datos y servicios. Detalle y limitaciones en MANTENIMIENTO_UBUNTU_2026-11-17.md.
