# Medallas y beneficios de la web

Los canjes 5→1 y las solicitudes de beneficios se ejecutan en transacciones Firestore. Cada POST requiere `requestId` (16–80 caracteres alfanuméricos, guion o guion bajo). Repetir el mismo identificador y contenido devuelve la operación registrada y el saldo actual; reutilizarlo para otro canje devuelve 409. Los identificadores se conservan en `users/{uid}/medalOperations`: no eliminarlos mientras puedan existir reintentos.

- GET `/api/v1/medals`: cinco saldos enteros no negativos, últimos 50 movimientos y últimas 50 solicitudes, con fechas ISO.
- POST `/api/v1/medals/exchange`: `{requestId,fromTier}`. Descuenta 5 y suma 1; registra ambos movimientos.
- GET `/api/v1/medals/benefits`: catálogo activo; costos o existencias inválidos nunca se sustituyen por valores inventados.
- POST `/api/v1/medals/benefits/redeem`: `{requestId,benefitId}`. Valida costo y stock actuales, descuenta platino, reduce stock y aumenta redeemedCount una sola vez. Guarda una copia de las condiciones en `benefitRedemptions`, estado `pending`, y el movimiento de salida.

La web solicita confirmación antes del beneficio. Conserva operaciones de resultado incierto en sessionStorage, por usuario, para reintentar incluso después de recargar la misma pestaña. Una respuesta definitiva 400/404/409 permite iniciar otra operación. Los errores de catálogo y de saldo se muestran por separado; los saldos que no se pudieron actualizar bloquean nuevos canjes.

El catálogo debe contener beneficios comerciales realmente aprobados: `active`, `costPlatinum` entero positivo, `stock` entero no negativo y `redeemedCount` entero no negativo. El ejemplo de seedCatalogs no acredita un convenio comercial. No ejecutar semillas sobre producción para habilitar premios ni reinicializar stock. Este bloque no contacta patrocinadores ni genera cupones. La coordinación de entrega, cancelaciones y devoluciones requiere un flujo operativo posterior; una reserva pendiente no equivale a un premio entregado.

Pruebas: iniciar emuladores y usar `MEDALS_TEST_PROJECT_ID=demo-...` con `npm run test:medals:emulator`. El archivo rechaza proyectos ajenos a demo. Los escenarios de navegador están en `test/medals.browser.mjs`; usan API simulada y Chrome sin perfiles reales.

Validaciones del bloque: 6 pruebas de API/emulador y 5 escenarios de navegador (saldo insuficiente, concurrencia, reintento después de respuesta perdida, confirmación, historial y errores independientes). Historial acotado a 50, sin paginación en esta versión. La entrega de beneficios continúa pendiente de integración comercial; no se declara completada.
