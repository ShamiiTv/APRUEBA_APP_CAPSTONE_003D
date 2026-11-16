# Recuperación de tutores móvil — 2026-11-15

Se recuperó la presentación de tutores del equipo a partir de e47e748: buscador por nombre, asignatura y especialidad, filtros por materia y tarjetas con avatar y acceso al perfil. Se conserva el catálogo simulado de la API y el guardado de solicitudes con identificador de operación.

Se mantienen skeletons, estados de error con reintento y mensajes para catálogo vacío o búsqueda sin coincidencias. El formulario aclara que no comparte datos con profesores reales, reserva clases ni genera pagos. No se reactivan promesas de análisis de falencias ni restricciones Premium que no corresponden al contrato actual.

Validación: 17 pruebas Flutter aprobadas. Las dos nuevas verifican búsqueda, filtro, estado sin coincidencias y apertura del perfil a 360 px en claro y oscuro con datos aislados. Flutter analyze sin incidencias. Las pruebas no envían solicitudes a producción y no acreditan una prueba en teléfono físico.

La restauración corresponde a Flutter y su versión web móvil. No modifica API, Firestore, React ni los APK históricos.