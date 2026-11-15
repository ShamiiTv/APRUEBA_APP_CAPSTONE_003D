# Revisión de Aprueba frente a las referencias de Alloxentric

Fecha de revisión: 25 de octubre de 2026, horario de Chile.

## Alcance y evidencia

Se revisó el código real de aprueba_app (Flutter), aprueba_student_web (React) y aprueba_api. Se contrastó con Aprueba_Wireframe.html (37 láminas), Aprueba_App.html y Aprueba_Web_Wireframe.html, conservados en Requisitos/Wireframes Alloxentric 2026-10-21. No se utilizó la maqueta resumida generada anteriormente como evidencia del producto.

Se visitaron en navegador las pantallas públicas de login y registro web/móvil, se consultó salud de la API y se comprobó la protección del catálogo sin sesión. No se crearon cuentas, modificaron datos de producción ni desplegaron cambios. Las vistas privadas se evaluaron por su implementación y por pruebas locales; no se presenta esta revisión como una validación completa de extremo a extremo en producción.

## Comprobaciones realizadas hoy

- Login y registro web cargan con HTTP 200; el registro tiene cuatro campos y no solicita aceptación de términos.
- Flutter Web carga login y registro, con dos y tres campos respectivamente. En el cambio interno por hash no hay una nueva respuesta HTTP de documento; eso no es un error de carga.
- El registro móvil publicado todavía muestra «Con tu nombre y correo desbloqueas 10 preguntas diarias gratis» y «+10 preguntas/día».
- Salud: HTTP 200, status ok, connected (Firebase).
- GET /api/v1/tests sin token: HTTP 401, como corresponde.
- Sin errores JavaScript no controlados en las pantallas públicas recorridas.
- El hash de main.dart.js publicado coincide con el build local existente: 9fcb912d9269e360c88b83e46960bd6c8079347e7d845aaa9a39ccc057841864. El build existente es anterior a los últimos cambios del código de registro; la coincidencia no significa que esos cambios estén publicados.
- 58 pruebas API, 6 web y 6 Flutter aprobadas: 70 en total. Flutter emitió un aviso por no poder consultar etiquetas en GitHub, pero ejecutó sus seis pruebas y terminó correctamente.
- Comprobación local del banco, sin escritura: 1.419 preguntas únicas; 1.360 publicadas; 59 pendientes.

## Comparación funcional

| Área | Situación en nuestro sistema | Diferencia o trabajo necesario |
| --- | --- | --- |
| Identidad visual | El móvil ya utiliza azul/dorado, tipografías, tarjetas, píldoras de pruebas y seis pestañas. | Conservar el trabajo existente de Javiera. No reemplazarlo por otra implementación HTML. La web tiene estructura propia de escritorio. |
| Registro | Correo y contraseña con API compartida. Cambios locales compactos del móvil: tres campos, placeholders e interruptor de consentimiento. | Compilar, revisar visualmente y publicar el cambio acordado. La web aún usa confirmación de contraseña y no solicita consentimiento. |
| Consentimiento | La pantalla Flutter exige activar el control. | AuthRepository.register recibe consent y locale pero no los envía. La API solo extrae name/email/password y no guarda aceptación, versión del texto ni fecha. Corregir el contrato compartido, presentar el texto que se acepta y dejar evidencia de aceptación explícita. No se evalúa aquí cumplimiento jurídico. |
| Selección de pruebas | Ya existe en Flutter después del registro y en Ajustes; usa píldoras con colores por prueba. Web tiene onboarding de dos pasos. | No hace falta recrearla. El original interactivo añade teléfono, país/idioma y grado: ese recorrido internacional no está implementado y excede el enfoque PAES actual. |
| Cuota | La lógica compartida implementa 10 base +5 colegio/edad/región +5 comuna/calle, en ese orden, máximo 20. | El onboarding web pregunta colegio y región, pero no edad; por sí solo no permite completar el primer bono. Aclarar el texto y completar el dato en el paso correspondiente o dirigir al perfil. |
| Práctica | Preguntas, alternativas, resultado, explicación, tiempo de respuesta y opciones de compartir están implementados. | Falta revisar visualmente preguntas representativas con fórmulas, tablas o textos largos frente al original. No se afirma equivalencia exacta de formato con todas las preguntas. |
| Dificultades | Tres niveles y progresión por aciertos en la API; móvil ofrece selector. | El banco publicado actual está clasificado como intermedio. Falta contenido revisado básico/avanzado y publicado para Historia. La referencia también incluye un cuarto nivel. No reclasificar automáticamente para llenar opciones. |
| Facsímil | La preparación actual es práctica aleatoria. | No se encontró un recorrido completo de facsímil premium con sesión de examen y puntaje. La referencia sí lo muestra. Es un módulo adicional, no solamente una pantalla. |
| Habilidades y recorrección | Hay piezas de backend para habilidades/soporte y pantallas Flutter. | Las rutas móviles de dominio por habilidad, solicitud de recorrección y listado de recorrecciones redirigen a aviso pendiente. No equivalen a recorridos terminados. |
| Medallas | Implementados saldos, canje 5:1 y regalos de hasta 10 bronces diarios entre miembros de grupos. | Recorrer con dos cuentas en móvil y web para validar de nuevo la experiencia completa. La existencia de la pantalla no sustituye esa prueba. |
| Beneficios | Hay validación y reserva de stock con requisito de cinco platinos. | La revisión anterior dejó pendiente el catálogo real y la coordinación de entrega; hoy no se consultó con sesión el catálogo. Validar economía: cinco platinos equivalen a 3.125 bronces si se usa toda la cadena 5:1. |
| Grupos y comunidad | Grupos públicos/privados, invitación protegida, miembros y actividad compartida implementados. | La referencia separa invitación, detalle y estadísticas en varias láminas; la app agrupa parte de esa información. No confundir número de rutas con número de funciones. Pendiente nuevo recorrido autenticado de ambos clientes. |
| Tutores | Catálogo, perfil y solicitud de demostración, con advertencia de simulación. | No hay marketplace real, chat con profesores, reseñas verificadas ni calificaciones reales. El análisis de brechas móvil está bloqueado. La simulación fue acordada y no obliga a desarrollar una app de tutores. |
| Planes | Selección simulada de $990 por una prueba y $4.990 por todas, con alcance y vencimiento en servidor. | No existe pasarela real. Checkout, resultado de pago, gestión de plan y boletas móviles siguen bloqueados. Mantener la etiqueta de simulación. |
| Verificación y redes | Implementaciones para correo y vinculación Google en navegador. | Falta validación manual completa del correo y consentimiento Google. SMS y Facebook pendientes. El original interactivo sí simula SMS; no prometer que esté activo en nuestro producto. |
| Idiomas y apariencia | Hay soporte ES/EN y temas; muchas vistas ya tienen traducciones. | StudyPlan.jsx mantiene muchos textos fijos en español y hay textos fijos en Medals.jsx. Onboarding web tiene textos y colores claros fijos. Revisar vista a vista; no afirmar traducción o tema completos. |
| Notificaciones | Hay preferencias y código asociado. | /notifications móvil está bloqueada y el recordatorio web se presenta como preferencia para servicio futuro. No equivale a entrega de notificaciones validada. |
| Plan de estudio | La web tiene meta diaria y recomendaciones persistidas. | No existe un recorrido equivalente de plan de estudio en el router móvil. Es una diferencia entre nuestros clientes; no se debe confundir con una regresión de las píldoras de selección. |
| Distribución móvil | Versión publicada accesible como Flutter Web en /movil/. | Esta revisión no confirma APK Android ni IPA/TestFlight de iPhone. La integración Google nativa tampoco está terminada. |

## Nueve rutas móviles pendientes

El router redirige estas rutas a PrivateBetaNotice:

1. /practice/skill — dominio por habilidad.
2. /practice/correction — solicitud de recorrección.
3. /corrections — listado de recorrecciones.
4. /notifications — notificaciones.
5. /checkout — pago.
6. /payment-success — resultado de pago.
7. /manage-plan — gestión de suscripción.
8. /invoices — boletas.
9. /tutors/analysis — análisis de brechas.

## Orden recomendado

1. Cerrar el registro: contrato de consentimiento, coherencia de onboarding y publicación del formulario compacto ya acordado. No requiere rehacer el trabajo de Javiera.
2. Recorrer con cuentas de prueba ambas interfaces: registro → selección → pregunta → cuota → grupo → regalo/canje → perfil. Verificar persistencia, permisos y mensajes de error. Evitar cargar repetidamente el banco completo para cuidar las lecturas Firebase.
3. Revisar las 59 preguntas pendientes y planificar contenido básico/avanzado e Historia con criterio pedagógico. Explicar las opciones sin contenido hasta entonces.
4. Completar idioma/tema y eliminar accesos que sugieran funcionalidades activas cuando solo hay un aviso pendiente.
5. Si se busca mayor paridad académica con la referencia: recorrección, habilidades y posteriormente facsímil. La gestión y evaluación de esos procesos requiere definir el flujo del equipo, sin desarrollar por defecto nuevas aplicaciones de administración.
6. Mantener pagos y tutores simulados hasta que cambie el alcance acordado. Solicitar catálogo real de beneficios y revisar su economía. SMS, Facebook y distribución nativa quedan como dependencias separadas.

No se aplicaron cambios funcionales ni despliegues durante esta auditoría.
