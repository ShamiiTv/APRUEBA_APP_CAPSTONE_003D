# Perfil y ajustes del estudiante

La pantalla `/ajustes` permite editar nombre, colegio, región, pruebas seleccionadas, dificultad, tema, idioma de interfaz y preferencia de recordatorio. El correo identifica la cuenta y se muestra como solo lectura; el enlace de restablecimiento usa el flujo de recuperación existente.

## Contrato de API

`PATCH /api/v1/auth/profile` actualiza únicamente los campos enviados. Se conservan `PUT /auth/profile`, `PATCH /auth/me` y `PUT /auth/me` como alias autenticados. `GET /auth/me` y `GET /auth/profile` devuelven el perfil actualizado.

Los campos permitidos son `name`, `school`, `region`, `selectedTests`, `difficulty`, `theme`, `locale`, `dailyReminder`, y los campos de compatibilidad `lang`, `practiceFormat` y `targetTestId`. `lang` se guarda como `locale`; enviar ambos con valores distintos produce error. Solo se admite formato de práctica `random`, que es el implementado.

- Nombre no vacío, máximo 120 caracteres; se recortan espacios y se actualiza `nameLower`.
- Colegio y región son opcionales, con máximos de 200 y 100 caracteres; una cadena vacía permite borrarlos.
- Al menos una prueba válida y sin duplicados; dificultad `d1`, `d2` o `d3`.
- Tema `light` o `dark`, idioma `es` o `en`, recordatorio booleano.
- Cuerpos vacíos, tipos incorrectos y campos desconocidos se rechazan antes de escribir.

El UID procede del token. El endpoint no modifica correo, contraseña, rol, cuotas, medallas, acceso pagado, onboarding ni plan de estudio. La validación se realiza antes de la transacción; la escritura conserva los demás campos y devuelve el perfil resultante. Los errores usan códigos `INVALID_PROFILE`, `USER_NOT_FOUND` o `PROFILE_UNAVAILABLE`.

## Preferencias y experiencia web

El perfil guardado se aplica al restaurar sesión, ingresar o registrar una cuenta. Tema e idioma se guardan también en el navegador para presentar la interfaz antes de recuperar el perfil, pero los valores de la cuenta prevalecen. Un perfil antiguo sin preferencias usa claro/español; otra cuenta no hereda ajustes de la cuenta anterior. El idioma se refleja en `document.documentElement.lang`.

Los controles de tema e idioma del menú también persisten en la API. El formulario conserva sus cambios mientras se editan y envía solo campos modificados. Las preferencias cambiadas desde el menú se actualizan en los campos que aún no se editaron, evitando sobrescribirlas al guardar otro dato. «Descartar cambios» restaura el perfil actual sin escribir.

Un fallo conserva el formulario para reintentar; un guardado pendiente bloquea envíos duplicados. Las solicitudes tardías de perfil no pueden restaurar una sesión cerrada. Las pruebas y dificultad guardadas se utilizan al abrir práctica desde el menú; los accesos de Inicio y Plan de estudio mantienen su dificultad intermedia explícita. El plan nuevo toma las pruebas del perfil, mientras el plan ya guardado conserva su configuración propia.

## Límites visibles

`dailyReminder` conserva una preferencia, no activa envíos. La pantalla informa que el servicio de recordatorios aún no está disponible. El banco actual solo tiene dificultad intermedia, y se advierte que otras dificultades pueden no tener preguntas. Elegir idioma cambia la interfaz, no traduce preguntas. Cambiar correo requiere un flujo de identidad y verificación separado; no se realiza desde el editor de perfil.

## Verificación local

Se ejecutaron 40 pruebas unitarias de API, tres flujos de autenticación y perfil con Firebase emulado, nueve pruebas de práctica/progreso/plan en el emulador y seis pruebas del cliente web. Compilación Vite y ESLint de los archivos de perfil, contexto y menú pasaron.

`test/settings.browser.mjs` incluye ocho escenarios con respuestas de API simuladas: preferencias de cuenta, guardado y recarga, práctica con preferencias, recuperación tras fallo, descarte, cambios del menú, cierre durante un guardado y cambio de cuenta. También pasaron cuatro escenarios de Inicio y seis de Plan de estudio. Estos scripts requieren Playwright del runtime local y Vite en `http://127.0.0.1:5173` o `WEB_TEST_URL`.

Los tests de Firebase usaron `demo-aprueba-profile`, sin cuentas ni escrituras de producción. Desde `aprueba_api`, `npm test` incluye `profileSettings.test.js`; `npm run test:emulator` exige `AUTH_TEST_PROJECT_ID` con el mismo proyecto `demo-` iniciado en Auth. La ejecución de práctica requiere `PRACTICE_TEST_PROJECT_ID` aislado y un banco de emulador limpio para sus fixtures.
