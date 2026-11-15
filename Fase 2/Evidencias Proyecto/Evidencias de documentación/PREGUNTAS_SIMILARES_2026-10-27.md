# Corrección de Preguntas similares · 27 de octubre de 2026

## Causa confirmada

En Flutter, el botón «Practicar similares» de la explicación enviaba a /practice sin identificar la pregunta de origen. PracticeRepository.next recuperaba preguntas según las preferencias generales, sin filtro de relación. La web no tenía una acción equivalente de búsqueda específica.

## Cambio

- La API GET /practice/next admite similarTo con el ID de la pregunta original.
- La prueba y dificultad se derivan de la pregunta publicada de origen, aunque el cliente envíe otros valores; se conserva la validación de cuota por prueba y de nivel.
- Los candidatos deben ser preguntas publicadas válidas de la misma prueba, dificultad y eje normalizado, con conceptos clave compartidos en los metadatos de explicación.
- La coincidencia de conceptos es una comparación de palabras normalizadas, con eliminación de términos genéricos y normalización básica de plurales. No constituye una clasificación semántica manual ni un modelo que garantice similitud pedagógica perfecta. Su calidad depende de los ejes y conceptos existentes del banco.
- Se excluye el contenido de la pregunta original, incluso si existe con otro ID, y las preguntas ya respondidas por el alumno. Se conserva la deduplicación de contenido.
- Sin conceptos o candidatos relacionados, se informa que no hay otras similares disponibles. No se cambia silenciosamente a una pregunta aleatoria.
- La respuesta correcta y la explicación siguen ocultas hasta responder.
- Flutter tiene acceso desde el resultado y desde la explicación detallada. El botón de la pantalla de habilidades también queda conectado, aunque esa ruta continúa pendiente dentro de la beta.
- La web incorpora el botón después de responder, una indicación del modo relacionado y salida a práctica general.
- Ambas interfaces ofrecen volver a práctica general cuando no hay resultados. El historial, la cuota y las medallas mantienen sus reglas existentes.

## Validación

- 63 pruebas API aprobadas, incluyendo tres nuevas de relación por metadatos, exclusión por materia/nivel/eje/concepto/estado y exclusión del original.
- Análisis Flutter sin incidencias y seis pruebas aprobadas. Lint web aprobado.
- Nueve comprobaciones de API/navegador contra Firebase local: pregunta original respondida, materia/nivel derivados de origen, exclusión de otro concepto/preguntas pendientes/duplicados, respuesta oculta, ausencia de pares, referencia inválida/no publicada, botón web y agotamiento sin repetición.
- Recorrido en Flutter Web real contra emuladores: cargar una relacionada, responder, abrir explicación, practicar similares y mostrar agotamiento con salida a práctica general.
- Compilaciones React, Flutter Web y APK release generadas. APK con firma verificada y versionCode 20261027; misma aplicación com.example.aprueba_app.

No se usó la maqueta HTML como evidencia y no se modificó el banco de producción para las pruebas. Los datos y respuestas de prueba pertenecen al proyecto local demo-aprueba-similar. La ejecución del APK en Android físico sigue pendiente del tester; la validación de interfaz se hizo con Flutter Web.

## Distribución

- Web: https://aprueba.shamiiplay.com/
- Móvil en navegador: https://aprueba.shamiiplay.com/movil/
- Nuevo APK: https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261027.apk
- APK anterior del 26 permanece disponible, pero no contiene esta corrección de cliente.
- Archivo local: .deployment/releases/Aprueba-Android-pruebas-20261027.apk.
- Firma de pruebas privada: Android Debug, conservando la configuración existente; no es una publicación en Play Store.
- SHA256 APK: 190f5d64cb66c2916feb03fe06c1672cf3e00bd153b016e48246513a88e0c38f.
- SHA256 main.dart.js: a462b8733fcd1cc87469aa6a3ccea54f23abf6b35356e8b52ef9d7e009bf1a47.
- SHA256 index.html web: d2dea47d680dfcbe703e760bb60de0a9d3b154f0e58cce00c69f5b804670f4e0.

Publicación confirmada: API, Nginx y torneos activos; salud ok con Firebase real. Los hashes remotos coinciden con las compilaciones locales y el APK responde HTTP 200 con 63.172.873 bytes.

Una comprobación posterior con una cuenta temporal encontró 40 candidatas relacionadas para una pregunta real de M1 y devolvió otra pregunta, excluyendo la original. Esa cifra corresponde a esa pregunta, no a todo el banco. La cuenta temporal fue eliminada y no se enviaron respuestas ni correos reales durante esa comprobación.

El instalador conserva respaldo, comprueba sintaxis, reinicia solo aprueba-api y restaura ante fallo de salud. No cambia Firebase, HTTPS, claves, dependencias o el banco. Respaldo confirmado: /opt/shamii/aprueba-backups/similar-20261027.tar.gz. No se realizó commit ni push.
