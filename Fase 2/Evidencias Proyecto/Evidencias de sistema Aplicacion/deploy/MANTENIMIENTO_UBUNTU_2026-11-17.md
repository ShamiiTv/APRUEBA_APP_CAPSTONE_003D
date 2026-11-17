# Mantenimiento del host Ubuntu — realizado el 17-11-2026

Estado observado el 17-11-2026: Ubuntu 24.04, kernel en ejecución 6.8.0-36-generic, archivo reboot-required presente y 174 paquetes en la simulación de upgrade. El número no implica que todos sean actualizaciones de seguridad y puede variar al actualizar índices.

La VPS comparte Aprueba con Torneos y retransmisión. Tras la revisión inicial, el propietario autorizó explícitamente aplicar parches y reiniciar. La operación y sus verificaciones quedaron completadas el 17-11-2026.

## Procedimiento utilizado

1. Comprobar acceso de consola del proveedor y respaldo/snapshot recuperable. Guardar estado de paquetes, servicios habilitados, configuración nginx/SSH/systemd y reglas de firewall en un directorio privado. Los respaldos de aplicación actuales están documentados en REVISION_CIBERSEGURIDAD_2026-11-17.md; no sustituyen un snapshot ni una restauración comprobada.
2. Verificar que no haya apt/dpkg activo, espacio libre y servicios críticos configurados para iniciar al arrancar. No terminar procesos de actualización a la fuerza.
3. Ejecutar apt-get update y repetir apt-get -s upgrade --with-new-pkgs. Revisar cambios y paquetes retenidos; no ejecutar autoremove ni cambios de versión de distribución.
4. Aplicar upgrade conservando configuraciones locales de nginx y SSH. Revisar conffiles y recomendaciones de reinicio, sin reemplazar automáticamente las configuraciones endurecidas.
5. Validar nginx -t y sshd -t; comprobar claves de acceso y estado de arranque de los servicios. Reiniciar el host dentro de la ventana acordada.
6. Reconectar con host key verificada. Comprobar kernel, firewall, SSH por clave, usuario/aislamiento de Aprueba, salud Firebase, HTTPS, interfaces, APK y servicios de Torneos/retransmisión. Ante fallo de arranque o pérdida de acceso, usar consola/snapshot del proveedor.
7. Registrar versiones y pruebas posteriores. Mantener observación del servicio y no eliminar los respaldos previos hasta validar recuperación.

No se ofrece una duración garantizada sin confirmar capacidad de recuperación del proveedor. El reinicio interrumpe los servicios compartidos y debe autorizarse como operación de mantenimiento.


## Resultado de la operación autorizada

- Después de actualizar los índices, el plan pasó de 174 a 204 cambios de paquetes. Resultado de apt: **178 actualizados, 26 nuevos, 0 eliminados**. No se cambió la versión de distribución.
- Respaldo privado: `/opt/shamii/aprueba-backups/ubuntu-maintenance-20261117T060211Z`. Incluye configuración/arranque, inventario de paquetes/servicios, logs, hashes y copia consistente de SQLite de Torneos. El archivo de configuración se verificó por listado y SHA-256, y la copia SQLite pasó integrity_check; no equivale a una restauración externa ni a un snapshot del proveedor.
- nginx y sshd validaron antes y después. Los hashes de nginx, SSH por clave y aislamiento systemd de Aprueba permanecieron iguales.
- Reinicio solicitado a las 06:10:34 UTC; verificaciones posteriores registradas a las 06:12:42 UTC. Se comprobó que cambió el boot ID. No son mediciones exactas del tiempo de indisponibilidad pública.
- Kernel en ejecución: **6.8.0-149-generic**, antes 6.8.0-36-generic. No quedó reboot-required ni hubo incidencias en dpkg --audit.
- Aprueba, nginx, Torneos, Army, chat, predicciones y relay iniciaron correctamente; todos reportaron NRestarts=0 y ExecMainStatus=0 en la comprobación. No hubo unidades fallidas. El relay escucha en UDP 8890; no se realizó una emisión real ni se enviaron mensajes de prueba.
- La API escucha en 127.0.0.1:4000, con usuario aprueba-api, ProtectSystem=strict, capacidades vacías y NoNewPrivileges. UFW continúa activo. Los timers de actualización automática volvieron a estar activos tras arrancar.
- Torneos HTTP 200 y SQLite quick_check=ok. API de Aprueba HTTP 200 con Firebase conectado. Web, Flutter web y APK HTTP 200; rutas sensibles 404 y perfil sin token 401. Chrome abrió ambas interfaces sin errores ni infracciones CSP.
- APK 1.0.8 y su hash se conservaron: `dead1b802eb7d4285cf505eee05ff3ca92d9cbc722e6f52debd08dadbb1c94b7`. No se necesita reinstalar por este mantenimiento del servidor.
- Ubuntu aplazó **snapd 2.78+ubuntu24.04**, con despliegue gradual al 50%; sigue instalada **2.76+ubuntu24.04.1** del repositorio noble-security. No se forzó el despliegue gradual. La nueva simulación mostró 0 cambios aplicables y 1 paquete aplazado.

Este mantenimiento cierra el pendiente de actualización/reinicio del host señalado en la revisión. Permanecen los otros pendientes de producción descritos en REVISION_CIBERSEGURIDAD_2026-11-17.md, como IAM/MFA administrativo, firma Android de producción y restauración externa de respaldos.
