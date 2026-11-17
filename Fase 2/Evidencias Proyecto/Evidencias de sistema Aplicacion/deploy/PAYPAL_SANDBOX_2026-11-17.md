# PayPal Sandbox: planes Aprueba

## Entrega y alcance

Integración publicada el 17 de noviembre de 2026 en la API, React, Flutter web y APK 1.0.9+202611171. Solo existe integración con `https://api-m.sandbox.paypal.com`; no se implementó un modo de cobros reales.

- Web: https://aprueba.shamiiplay.com/plan
- Móvil web: https://aprueba.shamiiplay.com/movil/
- APK: https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261117-paypal.apk
- SHA256 APK: `8a368a5ce7ec0c1709ec2b3848367bfe9a8f8b3a0e6f7a8be12e4776b9233d44`.

Los planes conservan los precios de referencia de 990 y 4.990 CLP. La pasarela utiliza importes ficticios independientes de 0,99 y 4,99 USD al mes; se informa explícitamente que no son conversiones monetarias. CLP no aparece en la lista oficial de monedas de la API: https://developer.paypal.com/api/codes/currency.

Facsímil permanece Próximamente. No se modificó la economía de medallas ni se implementaron las batallas. No se borraron cuentas ni datos reales para estas pruebas.

## Flujo implementado

El alumno elige una prueba ilimitada o acceso completo. La API reserva la operación, crea una suscripción mensual en PayPal Sandbox con clave de idempotencia y devuelve su enlace de aprobación. Solo se permiten enlaces HTTPS del dominio `www.sandbox.paypal.com`. El APK abre el navegador; la web navega a PayPal. Al regresar, la página pública `paypal-return.html` informa que el retorno no confirma el pago y permite volver a Aprueba. En el APK se vuelve desde las aplicaciones recientes y se puede comprobar el pago; también se comprueba al reanudar la pantalla.

`GET /plans/paypal` consulta la suscripción y los movimientos directamente a PayPal. Solo un movimiento COMPLETED con importe, moneda, plan y propietario esperados habilita el acceso durante un mes desde el pago, ajustando el último día del mes. No se concede acceso por parámetros de la URL ni solo por estado aprobado/activo de la suscripción. Se conserva el historial con el identificador de pago para evitar registros duplicados.

`POST /plans/paypal/cancel` detiene las renovaciones y mantiene únicamente el período pagado confirmado. En esta primera versión, una suscripción cancelada con período vigente debe vencer antes de contratar otro plan. No hay prorrateo ni cambio inmediato de una suscripción pagada a otra.

Si está pendiente de aprobación, se descarta localmente la selección. PayPal devolvió RESOURCE_NOT_FOUND al intentar consultar movimientos o cancelar borradores no aprobados; esas llamadas se omiten. El registro se marca abandonado: si posteriormente llega una activación firmada de ese enlace viejo, se solicita su cancelación y no se concede acceso. La eliminación de cuenta cancela la suscripción existente y elimina o desvincula los registros de PayPal asociados.

Los planes de demostración ya concedidos se conservan hasta su vencimiento; el endpoint de activación directa `/plans/subscribe` queda deshabilitado cuando el modo es paypal-sandbox.

## Webhook y configuración privada

Endpoint: `POST /api/v1/payments/paypal/webhook`. Se registraron eventos de activación, cancelación, suspensión, vencimiento, fallo de pago, pago completado, reembolso y reversión. Los eventos requieren los encabezados de firma y un certificado de dominio Sandbox, y se verifican con la API de PayPal usando el webhook ID configurado. La aplicación vuelve a consultar el estado remoto; el cuerpo recibido no concede privilegios directamente. Reembolsos que solo identifican una venta se resuelven a su suscripción mediante el mapa privado de ventas.

Variables: PAYMENTS_MODE=paypal-sandbox, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_PLAN_UNI, PAYPAL_PLAN_ALL, PAYPAL_WEBHOOK_ID y PAYPAL_RETURN_ORIGIN. Los planes del catálogo son mensuales, sin prueba gratuita y con los importes de demostración anteriores.

En la VPS, las claves están en `/etc/aprueba/paypal-sandbox.env`, root:root 0600. El servicio las carga mediante `/etc/systemd/system/aprueba-api.service.d/zz-paypal-sandbox.conf`. El prefijo zz es necesario: security.conf reinicia la lista de EnvironmentFile y debe procesarse antes del archivo que agrega PayPal. Se verificó la presencia de claves y el modo en el proceso real, sin imprimirlas. Ambos planes se consultaron desde la VPS y están ACTIVE en USD.

Las claves no están en Git, React ni el APK. El archivo local de preparación está fuera del repositorio. Nunca incluirlo en paquetes ni documentación. Para desarrollo local usar Firebase Emulator con proyecto demo- y un PAYPAL_RETURN_ORIGIN local; mantener las credenciales en un archivo privado y cargarlo por variables de entorno. La API usa Node 22 o posterior. No ejecutar semillas contra Firebase real.

Colecciones privadas: paypalSandboxSubscriptions y paypalSandboxSales; subcolección users/{uid}/paypalSandboxPayments. Las reglas existentes niegan acceso directo desde clientes; solo la API opera con Admin SDK. No se almacenan tarjetas ni contraseñas de compradores.

## Validación realizada

- API: 72 pruebas unitarias, incluyendo cinco de PayPal para URL segura, aprobación insuficiente, importe/moneda/propietario, vencimiento y cancelación.
- Firebase aislado: prueba integrada de PayPal con respuestas del proveedor controladas; cubre concurrencia/reintentos, aislamiento de cuentas, confirmación, cancelación, descarte de pendiente, webhook, reembolso y repetición. No equivale a un pago aprobado en PayPal.
- Regresiones aisladas: seguridad 9, homologación 5 y eliminación de cuenta 5 aprobadas. La eliminación se repitió tras agregar la limpieza de PayPal.
- React: 10 pruebas, lint y build correctos. Chrome con cuenta local temporal: inicio de sesión, catálogo, creación real de suscripción Sandbox, formulario de comprador de PayPal, regreso sin pagar, cuenta todavía gratuita y descarte de selección.
- Flutter: 42 pruebas, análisis sin incidencias, compilación web y APK correctas. No se probó todavía la compra en un teléfono físico. En Windows, pub get descargó las dependencias pero advirtió que los enlaces simbólicos de escritorio requieren Developer Mode; las compilaciones web y Android se completaron con --no-pub después de resolver las dependencias. No se cambiaron ajustes globales de Windows.
- VPS: API sana conectada a Firebase; raíz, /movil/, retorno y APK HTTP 200; ruta de estado sin sesión HTTP 401; archivo .env solicitado por web HTTP 404; webhook sin firma HTTP 400. Los demás servicios compartidos siguen activos. Dependencias API desplegadas con audit sin vulnerabilidades.

## Validación pendiente con el usuario

Completar una compra aprobada con una cuenta Personal de Sandbox, verificar el movimiento real de prueba y la activación compartida en web/APK. En el formulario inspeccionado apareció inicio de sesión de PayPal; no se mostró una opción directa de tarjeta sin cuenta. No se afirma que guest checkout esté disponible para este comercio. Para usar una tarjeta ficticia, configurar el comprador Sandbox y utilizar únicamente las tarjetas de prueba admitidas por PayPal: https://developer.paypal.com/sandbox-testing/card-testing.

También falta comprobar renovaciones y reembolsos emitidos realmente por Sandbox y la llegada de sus eventos firmados, además de regreso desde el navegador en un teléfono físico. Las pruebas automatizadas cubren esas transiciones con respuestas controladas, pero no sustituyen esa validación externa.

## Operación y recuperación

Último respaldo de despliegue: `/opt/shamii/aprueba-backups/security-release-20261117T234243Z`; mantiene API y dist previos. El despliegue conserva descargas y assets antiguos. Un respaldo anterior, de las 23:41:11 UTC, contiene la versión previa a PayPal. La configuración del servicio tiene respaldo privado en aprueba-backups/paypal-service-* y paypal-before-dropin-order-fix.conf. No imprimir ni publicar respaldos de configuración que pudieran contener claves.

Para desactivar la integración, retirar el drop-in zz-paypal-sandbox.conf con respaldo, recargar systemd y reiniciar solo aprueba-api; comprobar el modo efectivo resultante. Volver a simulation reabre la activación interna de demostración, por lo que no equivale a deshabilitar compras por completo. Para bloquear todas las compras, establecer PAYMENTS_MODE=unavailable en una configuración aplicada después de security.conf y verificar el proceso.

Las fuentes de referencia de PayPal son la API Subscriptions v1 y la verificación de firmas Webhooks v1. La integración necesita todavía la prueba externa anterior antes de considerarse validada de extremo a extremo.

## Hallazgo posterior de CI

La auditoría completa de desarrollo de la web detectó GHSA-fc5q-39xc-vjpf, revisado el 17 de noviembre, sin versión corregida publicada. La auditoría de producción de la web no tiene vulnerabilidades. Se documentó una excepción temporal exacta para picomatch 4.0.7 hasta el 2 de diciembre, con advertencia visible y controles que siguen bloqueando otros avisos y cualquier vulnerabilidad de producción. Ver aprueba_student_web/DEPENDENCY_EXCEPTION_2026-11-17.md. No se modificaron paquetes, dependencias del navegador ni la compilación desplegada para ocultar el aviso.
