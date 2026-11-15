# Validación funcional de Aprueba · 27 de octubre de 2026

## Resultado

Los recorridos comprobados de práctica, cuenta compartida, cuotas, grupos y economía de medallas funcionan en la versión publicada. No se puede declarar que el producto cumple el 100 % de las referencias de Alloxentric: hay recorridos pendientes, contenido insuficiente para algunas opciones y servicios deliberadamente simulados.

Se revisaron el código Flutter de Javiera integrado en el proyecto, React web, API y las referencias originales Aprueba_Wireframe.html, Aprueba_App.html y Aprueba_Web_Wireframe.html. No se utilizó la maqueta HTML generada anteriormente como evidencia del móvil.

## Qué se comprobó ahora

- 60 pruebas unitarias API aprobadas.
- 6 pruebas web aprobadas; lint sin errores.
- 6 pruebas Flutter aprobadas; análisis sin incidencias.
- 55 comprobaciones aprobadas en una primera auditoría de la API y las interfaces publicadas.
- 16 comprobaciones puntuales adicionales aprobadas para comentarios, persistencia del plan, cuota agotada y pantallas móviles restantes.
- La primera auditoría esperaba erróneamente HTTP 201 al crear un comentario. La API documentada en el código devuelve HTTP 200. Se corrigió la expectativa en la comprobación puntual y se verificaron el comentario guardado, su recuperación y que el reintento no lo duplique. No fue un fallo funcional del producto ni se modificó la API para alterar su contrato.

Estos resultados no representan una prueba exhaustiva de cada combinación de datos, dispositivo, idioma y error de red. La inspección de pantallas confirma carga y contenido visible, y las operaciones enumeradas abajo se comprobaron mediante la API real compartida. No se verificó instalación nativa del APK en un dispositivo físico.

## Matriz funcional

| Función | Resultado y evidencia actual | Límite frente a la referencia |
| --- | --- | --- |
| Cuenta compartida | Login en web y Flutter Web con una identidad temporal de la misma API. | La cuenta de Max no se utilizó ni modificó. |
| Verificación obligatoria | API rechazó funciones para cuenta sin verificar y permitió continuar con la misma sesión después de cambiar el estado en Firebase. | Se probó el estado mediante cuentas Admin de auditoría; no se enviaron correos reales. El registro y aplicación de enlaces se validaron con emuladores en el trabajo anterior. La recepción en bandeja real no se repitió hoy. |
| Renovación de sesión | Endpoint de refresh respondió correctamente. | No se hicieron pruebas de larga duración en segundo plano en un teléfono. |
| Registro y consentimiento | Formulario móvil compacto publicado; selección de pruebas existente conservada. | El cliente recibe consent pero no lo envía; la API no registra aceptación ni versión/fecha del texto. El registro web no la solicita. Es un pendiente técnico real. |
| Selección de pruebas | Vista Mis pruebas móvil carga. Catálogo compartido disponible. | No recrear lo ya desarrollado por Javiera. El onboarding internacional por teléfono, país y grado del prototipo no forma parte del flujo PAES actual. |
| Perfil y cuota | Perfil PATCH pasó de 10 a 15 con colegio/edad/región, y de 15 a 20 con dirección. Intentar editar emailVerified fue rechazado. | El onboarding web sigue omitiendo edad: completar colegio/región allí no basta para obtener el bono; se debe completar el dato o guiar al perfil. |
| Cuota agotada | API devuelve QUOTA_EXCEEDED cuando se consume la cuota de una cuenta fixture. | No se probó esperar físicamente hasta medianoche; el cálculo de fechas y límites tiene pruebas unitarias. |
| Práctica | Se obtuvo una pregunta real intermedia, se respondió y se recuperó explicación. La respuesta correcta no se expuso antes de contestar. | No se revisó pedagógicamente cada una de las preguntas ni la representación de todas las fórmulas/tablas/textos largos. |
| Progreso e idempotencia | Progreso pasó a una respuesta; repetir la misma operación no aumentó el total. | El progreso no equivale a un puntaje PAES oficial. |
| Niveles | API devuelve disponibilidad y desbloqueos por prueba; vista móvil carga. | En M1 se confirmó básica 0, intermedia 423 y avanzada 0. El banco actual no permite una experiencia real con todas las dificultades. La referencia incluye también un cuarto nivel. |
| Plan de estudio | Consulta, guardado de meta y recuperación persistida funcionaron. Página web carga. | Sin ruta equivalente de plan de estudio en el móvil. Persisten textos fijos en español en la web. |
| Grupos privados | Creación, lectura propia, rechazo de lectura ajena, invitación con token e incorporación de otro usuario funcionaron. Detalle informó dos integrantes. | Se creó solo un grupo privado aislado en esta auditoría; el recorrido público/invitación desde login se probó en el trabajo del 26. No se repitió hoy la creación pública. |
| Compartir pregunta al grupo | Publicación privada con una pregunta real visible para el segundo miembro. | No se publicó contenido de auditoría en la comunidad pública. |
| Comentarios y reacciones | Reacción guardada, comentario persistido y recuperable; reintento sin duplicación. | El flujo de moderación no se considera implementado por estas pruebas. |
| Regalos | Transferencia de dos bronces entre compañeros de grupo y reintento sin duplicar. Vista móvil carga. | Para aislar la prueba, los saldos iniciales de las cuentas QA fueron de 10 bronces, creados como fixtures; no se otorgaron medallas a usuarios reales. |
| Canje | Cinco bronces por una plata funcionó; el reintento no duplicó el resultado. Vista móvil carga. | No se recorrió físicamente toda la cadena de medallas con un alumno. |
| Beneficios | Endpoint y pantalla móvil responden. | Catálogo activo confirmado: cero beneficios. No existe un beneficio comercial disponible para probar entrega completa. Cinco platinos equivalen a 3.125 bronces en la cadena 5:1; requiere validar economía con Alloxentric. |
| Plan de $990 | Activación simulada respondió como tal; M2 quedó ilimitada y M1 conservó cuota finita. | No hubo cobro. No hay pasarela real. |
| Planes y precios | Catálogo consultado; páginas web/móvil cargan. | La selección de $4.990 existe, pero no se volvió a activar ese plan en esta auditoría. Cobro, boletas y gestión real de suscripción siguen pendientes. |
| Tutores | Catálogo marcado como simulado y solicitud de demostración persistida. Páginas de catálogo cargan en web/móvil. | Sin contacto real con profesores, chat real, reseñas verificadas o calificaciones reales. La simulación es el alcance acordado. |
| Correo y redes | Correo verificado es requisito de acceso. Hay implementación para vincular Google en navegador. | No se repitió aprobación manual Google ni envío/recepción real de correo. Facebook y SMS siguen pendientes; Google nativo no está terminado. |
| Idiomas y temas | Infraestructura ES/EN y tema existe. | Persisten textos en español y colores claros fijos en algunas vistas. No afirmar cobertura completa de traducción ni de modo oscuro. |
| Notificaciones | Se accedió a la ruta móvil y se confirmó la redirección al aviso de función pendiente. | No hay pantalla funcional de notificaciones ni servicio completo de entrega validado. |
| Facsímil | No hay recorrido completo de examen con puntaje en las interfaces actuales. | Pendiente frente a las referencias; la práctica aleatoria no lo sustituye. |
| Habilidades y recorrección | Existen piezas de backend y pantallas fuente. | Las rutas móviles están bloqueadas con aviso de beta; no se consideran recorridos funcionales completos. |
| APK Android | Compilado, firma verificada y enlace de descarga disponible desde el trabajo anterior. | Instalación/ejecución en Android físico sigue pendiente por parte del tester. No existe entrega IPA para iPhone. |

## Banco confirmado

La comprobación local del banco informa 1.419 preguntas únicas: 1.360 publicadas y 59 pendientes. El catálogo publicado consultado hoy devuelve:

| Prueba | Preguntas disponibles |
| --- | ---: |
| Matemática M1 | 423 |
| Matemática M2 | 256 |
| Competencia Lectora | 558 |
| Ciencias | 123 |
| Historia | 0 |

No se reclasificaron preguntas ni se insertó contenido ficticio para aparentar disponibilidad.

## Rutas móviles expresamente pendientes

El router redirige estas nueve rutas a PrivateBetaNotice:

- /practice/skill — dominio por habilidad.
- /practice/correction — solicitar recorrección.
- /corrections — recorrecciones.
- /notifications — notificaciones.
- /checkout — pago.
- /payment-success — resultado de pago.
- /manage-plan — gestión de suscripción.
- /invoices — boletas.
- /tutors/analysis — análisis de brechas.

Las cuatro rutas de pagos/boletas son coherentes con no tener pasarela. El análisis de tutores debe seguir el alcance de demostración acordado. Las demás requieren definición/implementación si se busca completar el recorrido de la referencia.

## Prioridad recomendada

1. Completar el envío, validación y persistencia del consentimiento en ambos clientes y la API, y alinear onboarding con los datos del bono de cuota.
2. Resolver el alcance de habilidades, recorrección y notificaciones: implementar los recorridos que se necesiten y presentar claramente como pendientes los demás.
3. Revisar las 59 preguntas pendientes; planificar contenido revisado para Historia y dificultades básica/avanzada. No asignar dificultades automáticamente solo para llenar el selector.
4. Completar traducción/tema y probar preguntas con fórmulas y lecturas largas en tamaños de teléfono.
5. Pedir catálogo real de beneficios y validar su economía. Mantener pagos y tutores simulados mientras ese sea el acuerdo.
6. Terminar prueba del APK en Android físico; después evaluar facsímil, distribución iOS y servicios externos según alcance.

## Seguridad y limpieza de la auditoría

Se crearon tres cuentas temporales con UID reservado qa-audit-20261027-, mediante Firebase Admin, sin enviar correos ni usar credenciales de usuarios reales. Los grupos y publicaciones fueron privados. Se eliminaron las tres cuentas de Auth, sus perfiles/subcolecciones, los dos grupos y las dos publicaciones con sus subcolecciones. Los resultados guardados no incluyen contraseñas ni tokens.

Se guardó una respuesta real de práctica de una cuenta QA. Su contador agregado en la pregunta puede aumentar en una unidad; no se reescribieron contadores globales al limpiar para evitar interferir con respuestas concurrentes de alumnos. La cuenta y su historial individual sí se eliminaron.

La cuenta de Max y las de otros usuarios no fueron utilizadas ni modificadas. No se aplicaron cambios funcionales ni despliegues durante esta auditoría: se generaron scripts y documentación de evidencia.
