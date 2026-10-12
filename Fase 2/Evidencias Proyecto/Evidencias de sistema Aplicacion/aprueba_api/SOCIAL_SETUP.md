# Grupos y comunidad de la web

Referencia: vistas Grupos, Comunidad y compartir desde Práctica de Aprueba_Web_Wireframe (1).html, dentro del alcance del sitio web del alumno. No modifica la app móvil ni la consola administrativa.

## Flujos implementados

- Crear un grupo y su miembro líder en una transacción. El identificador de solicitud evita crear otro grupo al repetir una petición.
- Unirse mediante el código completo, con retorno exitoso si ya se pertenece al grupo.
- Consultar grupos propios y detalle privado con nombres, roles y estadísticas de la materia. Solo los miembros pueden ver ese detalle.
- Salir mediante confirmación. Si sale el líder, el primer miembro restante asume ese rol; al salir el último, el grupo se archiva y no acepta nuevos ingresos.
- Publicar preguntas o dudas tanto en la comunidad como en un grupo. La pantalla muestra quién podrá leer la publicación.
- Compartir desde el resultado de Práctica. Se envía questionId; el servidor valida que la pregunta esté publicada y pertenezca a la materia del grupo. Copia solo enunciado y alternativas, sin respuesta correcta ni explicación. Las preguntas pendientes no son compartibles. Las complementarias listas de Alloxentric están publicadas y pueden compartirse.
- Reacciones con estado deseado explícito, comentarios y carga de contenido anterior por cursor.

## Contrato REST

Todas las rutas requieren access token y onboarding completado. El envelope es {data,error,meta}.

| Ruta | Datos / comportamiento |
| --- | --- |
| GET /api/v1/groups | Grupos propios; meta.groupLimit indica el límite, 0 significa sin límite de cantidad |
| POST /api/v1/groups | name de 1–100 caracteres, subjectTestId y requestId |
| POST /api/v1/groups/join | groupId completo |
| GET /api/v1/groups/:id | Miembros y estadísticas privadas |
| POST /api/v1/groups/:id/leave | Cuerpo vacío {} |
| GET /api/v1/posts | Publicaciones públicas; cursor opcional |
| GET /api/v1/posts?groupId=:id | Publicaciones del grupo, solo miembros; cursor opcional |
| POST /api/v1/posts | text de 1–3000 caracteres, requestId; questionId y groupId opcionales |
| POST /api/v1/posts/:id/like | liked booleano: repetir true o false mantiene ese estado |
| GET /api/v1/posts/:id/comments | Comentarios; cursor opcional |
| POST /api/v1/posts/:id/comments | text de 1–1000 caracteres, requestId; meta.commentCount devuelve el total real |

Las páginas de publicaciones/comentarios tienen 20 elementos y meta.nextCursor; se ordenan por fecha y ID para conservar empates, incluida precisión de nanosegundos. Las fechas de respuesta son ISO. El cursor queda vinculado al muro/comentario correspondiente y rechaza reutilizaciones entre colecciones.

Los POST de creación requieren requestId de 16–80 caracteres alfanuméricos, guion o guion bajo. users/{uid}/socialOperations conserva la firma del contenido y el destino: repetir el mismo requestId es seguro; cambiar el contenido devuelve 409. Conservar esos registros mientras existan posibles reintentos. La web guarda la petición exacta en sessionStorage por usuario y destino. Una respuesta incierta mantiene el borrador inmovilizado y permite reintentar después de recargar; un rechazo definitivo permite corregirlo.

Este contrato cambia el antiguo toggle de likes y agrega requestId a creaciones. El equipo móvil debe adaptar esas llamadas cuando integre esta API; no se editaron sus archivos.

## Datos y estadísticas

Las estadísticas se calculan desde answeredQuestions por materia y primera respuesta a cada contenido, reutilizando la normalización del progreso. El porcentaje grupal es correctas / respuestas de todos los miembros con práctica, no un puntaje PAES ni una estimación de dominio. El miembro sin respuestas conserva accuracy=null. Incluye la práctica anterior al ingreso al grupo. No devuelve email, colegio, respuestas individuales ni información de sesión.

No se otorgan nuevas medallas ni se consume cuota al compartir/comentar. No se inventan porcentajes de cohorte, habilidad, ranking o ejercicios resueltos. La lectura privada vuelve a verificar pertenencia antes de devolver el detalle o una página de contenido.

El límite de grupos actual sigue las reglas locales del catálogo: gratis 1, uni activo 3, all activo sin límite. Planes inactivos/desconocidos usan el límite gratuito. La transacción lee grupos existentes y modifica el documento del usuario para impedir que crear/unirse simultáneamente supere ese límite. Cada grupo admite hasta 100 miembros para acotar documentos y lecturas de estadísticas.

La activación comercial de planes aún debe revisarse en el bloque de suscripciones: el controlador anterior permite pagos simulados. Estas pruebas no certifican cobros ni derechos comerciales en producción.

## Índices y validación

Se añadió a database/firestore.indexes.json el índice de posts por visibility, groupId y createdAt descendente. Los índices se prepararon localmente; no se desplegaron. El emulador no sustituye la validación de índices desplegados en un entorno de pruebas.

- npm test en API: incluye cuatro pruebas unitarias de validación y proyección pública.
- SOCIAL_TEST_PROJECT_ID=demo-... npm run test:social:emulator: diez pruebas, incluidos límite concurrente, reintentos, transferencia del líder, privacidad y 43 publicaciones/comentarios con la misma fecha.
- Las pruebas de autenticación comprueban que grupos/comunidad rechazan ausencia de sesión, refresh token y onboarding pendiente.
- test/social.browser.mjs en la web: diez escenarios con API simulada, incluidos recarga con respuesta perdida, invitación, errores, privacidad, comentarios/paginación y compartir desde práctica. También comprueba la cancelación de una consulta anterior al cambiar el filtro de tutores.
- Compilación de producción, lint completo de la web y revisión de sintaxis de los módulos API modificados.

Se ejecutó todo en emuladores/proyectos demo y navegadores aislados. No se publicaron mensajes en una comunidad real ni se escribió en Firebase de producción.

## Pendientes relacionados

Moderación, reportes, adjuntos de imagen, encuesta y una cola administrativa no forman parte del flujo implementado aquí. Deben reconciliarse con los entregables finales; los iconos decorativos del prototipo no equivalen a integraciones funcionando. No hay actualización en tiempo real: las vistas incluyen acciones explícitas para recargar. El regalo de medallas a miembros de grupos está identificado en el registro de alcance como una ampliación pendiente del bloque de gamificación.
