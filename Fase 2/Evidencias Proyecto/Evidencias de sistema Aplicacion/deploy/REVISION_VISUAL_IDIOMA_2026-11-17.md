# Correcciones de navegación, apariencia e idioma — 17-11-2026

Se revisaron los mensajes y cinco capturas reportados por el equipo sobre la versión 1.0.6.

- Plan de estudio y Actividad ahora se abren conservando la ruta de origen desde el menú; ambas pantallas incluyen una flecha visible y regreso a Inicio cuando se abre un enlace directo.
- Salir de un grupo actualiza tanto Mis grupos como el catálogo público. Si era el último integrante, el grupo archivado desaparece del listado; si quedan integrantes, se conserva y se transfiere la propiedad según la política existente.
- Cancelar tiene una superficie de al menos 48 píxeles. El diálogo de eliminación usa contenido desplazable para el teclado; se evita salir con el botón Atrás durante la solicitud. Se corrigió también el desborde de la fila de recorrecciones en Ajustes.
- Se corrigió el contraste de las acciones de grupos en modo oscuro, manteniendo los encabezados azules del diseño del equipo.
- Plan de estudio incluye separación entre secciones, configuración agrupada y una barra de progreso. Actividad muestra fechas locales legibles y nombres de medallas traducidos.
- Se completaron traducciones web de acceso, registro, recuperación, invitaciones, onboarding y plan de estudio, además de etiquetas de materias, planes y notificaciones. Móvil traduce materias, historial, recompensas y tiempos relativos. Los nombres propios, contenido escrito por usuarios, material de preguntas PAES y textos libres del catálogo conservan su idioma original.
- Seguridad: contraseña errónea al eliminar cuenta devuelve AUTH_INVALID_CREDENTIALS sin renovar la sesión ni repetir la solicitud destructiva. La contraseña sigue verificándose en el servidor. Se limpian los campos de contraseña al cambiar la operación de seguridad. Se comprobaron las protecciones existentes con la suite de API; esto no constituye una auditoría integral ni una prueba de penetración.

## Validación

- API: 63 pruebas unitarias y 5 pruebas de eliminación en emuladores aislados, incluyendo rechazo de contraseña incorrecta y conservación de aportes ajenos.
- React: 10 pruebas, lint y compilación; 20 comprobaciones de navegador con API simulada en temas claro/oscuro, a 390 y 1280 píxeles. Se inspeccionaron capturas reales de la web y widgets Flutter.
- Flutter: análisis estático sin incidencias; suite de 40 pruebas y dos regresiones adicionales del diálogo de cuota aprobadas. Incluye regreso desde Ajustes, invalidación del catálogo, traducciones y diálogo de eliminación con teclado abierto en ambos temas.
- Compilaciones Flutter web y APK 1.0.7+20261117. Misma firma del APK anterior; instalación y comportamiento del teclado deben confirmarse también en teléfono físico.

## Enlaces

- Web: https://aprueba.shamiiplay.com/
- Móvil web: https://aprueba.shamiiplay.com/movil/
- APK: https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261117.apk

El despliegue conserva datos, dependencias, credenciales y APK anteriores. No ejecuta semillas ni elimina cuentas reales. Facsímil y PayPal mantienen el estado pendiente acordado.

Publicación verificada: web, móvil, API y APK nuevo/anterior responden HTTPS 200; versión móvil pública 1.0.7+20261117 y Firebase conectado. Servicios aprueba-api, nginx y shamii-tournaments activos. Respaldo: /opt/shamii/aprueba-backups/aprueba-20261117-001608.tar.gz. SHA-256 del APK: f7761056907704f5260200dee95d05ceb4cbfb4f6f7a7292f2fd38e53555090e. SHA-256 de main.dart.js: ce0448abf0385d057411086428b0603c19dedd212baeb25cf44088d6f82b475a. Hashes iguales entre local y VPS.
