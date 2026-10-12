# Acceso de Aprueba Web

El registro crea la identidad en Firebase Authentication y el perfil en Firestore con el mismo UID. Firebase almacena la contraseña. El acceso se verifica mediante su API REST; Aprueba emite access tokens de 15 minutos y refresh tokens de 30 días, con tipos y secretos separados. Al restablecer la contraseña, Firebase invalida sesiones anteriores y la API comprueba la fecha de revocación en cada validación de sesión.

## Desarrollo local

1. Configura `.env` con `FIREBASE_PROJECT_ID`, `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `JWT_SECRET` y `JWT_REFRESH_SECRET`. Ambos secretos deben ser aleatorios y distintos; usa al menos 32 bytes aleatorios por secreto.
2. Desde la carpeta hermana `database`, ejecuta `firebase emulators:start --only auth,firestore --project <tu-project-id>`. Usa el mismo proyecto que la API.
3. Desde `aprueba_api`, ejecuta `npm run dev`; desde `aprueba_student_web`, `npm run dev`.
4. Registra una cuenta y completa el onboarding. Para probar recuperación, solicita un enlace y consulta la consola del emulador de Auth. El emulador no envía correos reales; su enlace permite completar el restablecimiento. También puedes usar `/restablecer-contrasena?oobCode=...` en la web con el código generado.

## Firebase real

Habilita Email/Password en Firebase Authentication. Configura `FIREBASE_WEB_API_KEY` y las credenciales Admin del proyecto; elimina las variables de emulador y establece `NODE_ENV=production`. Configura la plantilla de recuperación en Firebase. Por defecto Firebase muestra su página alojada para cambiar la contraseña. Para usar la pantalla de Aprueba, configura como URL de acción `https://<tu-web>/restablecer-contrasena`; Firebase añade `oobCode` al enlace. No se necesita un servicio SMTP propio.

Configura `VITE_API_BASE_URL` en la web si la API no está en `http://localhost:4000/api/v1`. Se requiere HTTPS para publicar.

## Cuentas anteriores

Los perfiles creados por el código anterior carecen de contraseña: no se pueden validar las contraseñas que antes se ingresaron, ya que nunca se almacenaron. Recuperar contraseña crea una identidad sin contraseña con el UID existente y permite establecerla únicamente mediante acceso al correo. No se entrega el código de recuperación desde la API. Si existen perfiles duplicados con el mismo correo, la recuperación no selecciona arbitrariamente uno: deben reconciliarse antes. Los tokens antiguos se rechazan; se requiere volver a iniciar sesión.

## Pruebas

`npm test` ejecuta regresiones aisladas sin datos ni cuentas reales. `npm run test:emulator` ejecuta el flujo completo contra emuladores; exige `AUTH_TEST_PROJECT_ID` que empiece con `demo-` y usa solamente cuentas de prueba creadas durante la ejecución.

En `aprueba_student_web`, `npm test` verifica renovación concurrente, rechazo de credenciales, fallo transitorio de red y cierre de sesión durante una renovación. Las rutas de recuperación son `/recuperar-contrasena` y `/restablecer-contrasena`. El onboarding se exige tanto en la navegación web como en los endpoints funcionales de la API.
