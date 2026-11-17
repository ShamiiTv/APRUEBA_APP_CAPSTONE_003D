# Mantenimiento pendiente del host Ubuntu

Estado observado el 17-11-2026: Ubuntu 24.04, kernel en ejecución 6.8.0-36-generic, archivo reboot-required presente y 174 paquetes en la simulación de upgrade. El número no implica que todos sean actualizaciones de seguridad y puede variar al actualizar índices.

La VPS comparte Aprueba con Torneos y retransmisión. No se ejecutó upgrade ni reinicio durante la revisión. Se necesita acordar la interrupción antes de aplicarlos.

## Procedimiento propuesto para la ventana

1. Comprobar acceso de consola del proveedor y respaldo/snapshot recuperable. Guardar estado de paquetes, servicios habilitados, configuración nginx/SSH/systemd y reglas de firewall en un directorio privado. Los respaldos de aplicación actuales están documentados en REVISION_CIBERSEGURIDAD_2026-11-17.md; no sustituyen un snapshot ni una restauración comprobada.
2. Verificar que no haya apt/dpkg activo, espacio libre y servicios críticos configurados para iniciar al arrancar. No terminar procesos de actualización a la fuerza.
3. Ejecutar apt-get update y repetir apt-get -s upgrade --with-new-pkgs. Revisar cambios y paquetes retenidos; no ejecutar autoremove ni cambios de versión de distribución.
4. Aplicar upgrade conservando configuraciones locales de nginx y SSH. Revisar conffiles y recomendaciones de reinicio, sin reemplazar automáticamente las configuraciones endurecidas.
5. Validar nginx -t y sshd -t; comprobar claves de acceso y estado de arranque de los servicios. Reiniciar el host dentro de la ventana acordada.
6. Reconectar con host key verificada. Comprobar kernel, firewall, SSH por clave, usuario/aislamiento de Aprueba, salud Firebase, HTTPS, interfaces, APK y servicios de Torneos/retransmisión. Ante fallo de arranque o pérdida de acceso, usar consola/snapshot del proveedor.
7. Registrar versiones y pruebas posteriores. Mantener observación del servicio y no eliminar los respaldos previos hasta validar recuperación.

No se ofrece una duración garantizada sin confirmar capacidad de recuperación del proveedor. El reinicio interrumpe los servicios compartidos y debe autorizarse como operación de mantenimiento.
