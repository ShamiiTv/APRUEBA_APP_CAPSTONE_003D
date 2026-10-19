# Firebase real y reducción de lecturas — 13 de octubre de 2026

La VPS volvió al proyecto real aprueba-app-9d317. La superposición demo se movió a /opt/shamii/aprueba/demo/disabled-config/demo-20261013-224648.conf. El servicio aprueba-emulators fue detenido y deshabilitado; aprueba-api y el servicio independiente de torneos siguieron activos. El health público informa connected (Firebase).

Antes de reconectar se exportaron todos los datos demo a /opt/shamii/aprueba/demo/snapshots/20261013-224648 y se conservó una copia para importación en saved-data. No se migraron cuentas, respuestas ni premios de la demo a Firebase real. Respaldo del código anterior: /var/backups/shamii/aprueba-before-real-20261013-224648.tar.gz.

## Optimización

- El banco compartido permanece en memoria durante seis horas por proceso y se reutiliza en práctica, progreso, plan de estudio y estadísticas de grupos. Las consultas concurrentes comparten la misma carga. Se eliminó la consulta completa que aún conservaba el detalle de grupos.
- El historial se reutiliza durante 60 segundos, con caché separada por UID y hasta 100 entradas. Se invalida después de cada respuesta confirmada. Un resultado antiguo que llegue después de invalidar no puede restaurar datos obsoletos en la caché.
- La validación de respuestas, repetición de intentos, cuota y premios sigue leyendo Firestore dentro de transacciones. No se utiliza historial cacheado para decidir premios.
- Publicar o retirar preguntas requiere reiniciar aprueba-api para actualizar inmediatamente el banco del proceso servidor. El seed invalida la caché de su propio proceso; no invalida otros procesos o servidores. Las respuestas siempre verifican la pregunta vigente en Firestore.
- Permanecen las correcciones anteriores del límite de acceso y la desactivación de reintentos automáticos Flutter.

## Verificación

52 pruebas unitarias, 9 pruebas de práctica/progreso/plan de estudio con emulador y 10 pruebas sociales con emulador aprobadas. Verifican aislamiento entre usuarios, invalidación tras escribir, carreras entre lectura y escritura, concurrencia de respuestas y límites, deduplicación de premios y privacidad de grupos. Se usaron exclusivamente proyectos demo en los emuladores para esas pruebas.

El límite gratuito de Firebase mide operaciones, no tokens. Estas cachés reducen lecturas repetidas del banco y del historial, pero no eliminan las lecturas necesarias para autenticar, comprobar permisos o escribir respuestas. Los historiales grandes todavía se leen completos en la transacción de respuesta; un uso mayor requerirá optimizaciones adicionales de agregados y migración de intentos históricos. No se activó facturación.

## Prueba pública con Firebase real

Se crearon tres cuentas temporales y se ejecutaron 60 consultas de progreso/próxima pregunta en tres recorridos concurrentes. Todas respondieron correctamente. Un grupo temporal con los tres miembros devolvió estadísticas correctas. El progreso reflejó inmediatamente una respuesta guardada. La web completó login y respuesta desde Chrome. El recorrido móvil completó login, respuesta y verificación de cuota compartida en una prueba adicional, sin errores JavaScript; el primer intento automatizado móvil envió un formulario aún sin estabilizar y devolvió 400, por lo que se repitió esperando las actualizaciones de Flutter.

El journal del proceso de API registró una sola carga completa: Banco compartido cargado: 1419 preguntas; caché de 6 horas. Esto acredita la reutilización del banco en esos recorridos, no una medición completa de todas las lecturas facturables. Perfiles, permisos, historial y transacciones también generan lecturas. Las cuentas y el grupo de pruebas fueron eliminados al finalizar. Las pocas respuestas de QA pueden quedar incluidas en las estadísticas agregadas de las preguntas, como en las comprobaciones previas.

Los enlaces públicos se conservan. Es necesario cerrar la sesión demo y entrar con una cuenta real. Los registros de demo no se trasladaron automáticamente. Cambios guardados localmente y desplegados en la VPS; no se hizo un nuevo push en esta tarea.
