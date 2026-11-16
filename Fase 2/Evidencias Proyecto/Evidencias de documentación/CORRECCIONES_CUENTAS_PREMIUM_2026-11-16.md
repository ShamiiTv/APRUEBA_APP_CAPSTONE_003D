# Correcciones de eliminación, Premium y Facsímil — 2026-11-16

Base: a0c45c0 (rama rediseno-onboarding de Javiera), integrada localmente sin conflictos. Se conserva su diseño.

## Cambios

- Eliminación de cuentas: grupos actualizados mediante transacciones que releen miembros y propietario. El grupo vacío se archiva; se conserva cualquier integrante añadido después de enumerar los grupos.
- Reacciones: limpieza de los Me gusta históricos por ID de usuario, recorriendo los IDs de publicaciones en páginas de 100. La reacción y el contador se actualizan juntos en una transacción. Un reintento o retirada simultánea no descuenta dos veces ni borra publicaciones/reacciones ajenas. No exige migrar reacciones antiguas ni un índice nuevo.
- Premium: el modelo móvil interpreta el vencimiento ISO o Timestamp Firestore y exige plan all, permiso unlimited calculado por el servidor y fecha vigente. Tutores, análisis y acceso directo al formulario comparten el criterio; los estados de carga/error del perfil no muestran el contenido protegido. La API conserva su comprobación de vigencia de dailyQuota, incluida la modalidad simulada.
- Facsímil aparece como Próximamente, sin selección en ningún plan y sin anunciarse como beneficio disponible. Se ignora una selección facsímil antigua y se conserva Aleatorio. No se implementó un examen ni puntaje oficial.
- Pruebas de planes actualizadas al rediseño recibido: estados de carga y contenido, datos de los dos planes de pago y ausencia de desbordamientos a 320, 390 y 800 px en ambos temas. La prueba anterior dependía de tres widgets Card que ya no existen.

## Validación

- 63 pruebas unitarias de API aprobadas.
- 5 pruebas nuevas con emuladores aprobadas: concurrencia de integrantes, grupo vacío, reacciones históricas a través de varias páginas, retirada concurrente e idempotencia, y endpoint de eliminación con posterior registro del mismo correo.
- 29 pruebas Flutter aprobadas, incluidas 9 nuevas de Premium, acceso directo, perfil pendiente y Facsímil para cuentas gratuitas/de pago.
- Flutter analyze sin incidencias y compilación web release correcta.
- git diff --check sin errores de espacios.

Comando de regresión API (requiere Auth Emulator 9099 y Firestore Emulator 8080 iniciados con el mismo proyecto demo): definir ACCOUNT_DELETION_TEST_PROJECT_ID=demo-aprueba-review-20261116 y ejecutar npm run test:account-deletion:emulator. La suite rechaza identificadores que no empiecen por demo-.

Los datos temporales de las pruebas se limpiaron. No se usaron cuentas ni datos de producción. La compilación de revisión está en C:/Users/Shamii/Documents/ChatGPT/Aprueba/fixed-mobile-build.

## Publicación

Estos cambios no despliegan la aplicación ni Firebase. Se mantiene pendiente publicar/verificar el índice comments.authorUid que añadió Javiera antes de activar eliminación de cuentas en producción. Las pruebas con emulador no certifican que el índice exista en Firebase real. Tampoco constituyen una prueba en teléfono físico.