# Aprueba — Proyecto Capstone

Proyecto del equipo Camilo Bernal, Javiera Villablanca y Claudio Valverde. El repositorio reúne las evidencias académicas por fase y el código de Aprueba web, la app Flutter y su API compartida.

## Estado actual — 22 de noviembre de 2026

Arena 1.2.0 está publicada en web y Flutter: duelos 1 contra 1 con matchmaking, Matemática M1/M2, entrada de una medalla de bronce y pozo de dos, empate con devolución, rango por prueba y recuperación de desconexiones. Disponible para cuentas verificadas de cualquier plan; las medallas no se compran. Cinco partidas diarias y una misma pareja por prueba cada 24 horas.

- Arena: https://aprueba.shamiiplay.com/arena
- APK 1.2.0: https://aprueba.shamiiplay.com/descargas/Aprueba-1.2.0.apk
- Detalle técnico y alcance: `deploy/ARENA_1_2_0_2026-11-22.md`, dentro de las evidencias de sistema.
- Código publicado: `54edf9650f1296e6bc22d2399e0fa5a56244df82`. [Controles de GitHub aprobados](https://github.com/ShamiiTv/APRUEBA_APP_CAPSTONE_003D/actions/runs/44982905762).

Validación: 77 pruebas unitarias API, 74 integraciones, 19 web y 58 Flutter; duelos completos entre dos navegadores, temas e idiomas, firma del APK y hashes del contenido servido. La prueba del equipo en dos teléfonos físicos sigue pendiente. Se conservaron datos, configuración privada, descargas anteriores y respaldos. PayPal continúa en Sandbox y Facsímil permanece Próximamente.

## Organización

```text
Fase 1/
  Evidencias Individuales/
  Evidencias Grupales/
Fase 2/
  Evidencias Individuales/
  Evidencias Grupales/
  Evidencias Proyecto/
    Evidencias de documentación/
    Evidencias de sistema Aplicacion/
Fase 3/
  Evidencias Individuales/
  Evidencias Grupales/
```

La documentación de Fase 2 incluye arquitectura, requisitos, planificación Scrum, gestión, pruebas y los informes de revisión del código y banco de preguntas. Las guías 2.4 y 2.6 están en Evidencias Grupales. Se incorporaron los documentos recibidos en Fase2Drive.zip sin sobrescribir el código actualizado ni modificar el contenido de los documentos originales.

## Aplicaciones

En [Evidencias de sistema Aplicacion](Fase%202/Evidencias%20Proyecto/Evidencias%20de%20sistema%20Aplicacion):

- `aprueba_api`: API Node/Express, autenticación y persistencia Firebase, banco revisado y pruebas.
- `aprueba_student_web`: interfaz web React/Vite.
- `aprueba_app`: app Flutter integrada con la misma API; incluye la versión web para demostraciones móviles.
- `database`: configuración Firebase, reglas e índices Firestore.
- `deploy`: instrucciones de despliegue, pruebas de VPS y documentación de la demo pública.
- `aprueba_landing`: fuente de la landing existente.

Los scripts de auditoría del banco están en `aprueba_api/tools/banco_preguntas`. Los informes y registros de revisión están en las evidencias de documentación.

## Ejecución y validación

Instalar dependencias con `npm ci` en la API y web y con `flutter pub get` en la app. Configurar la API a partir de `.env.example`, usando credenciales propias o emuladores. Nunca guardar claves privadas en Git.

Pruebas API y web: `npm test` en cada proyecto. Web: `npm run dev`. App: `flutter test`, `flutter analyze` y compilación para la plataforma deseada. Consultar las guías de cada componente para configurar puertos y la URL de la API. Las dependencias y compilaciones se generan localmente y no se incluyen en Git.

## Servicio público y demostración histórica

- Web: https://aprueba.shamiiplay.com/
- Interfaz móvil: https://aprueba.shamiiplay.com/movil/

Desde el 13 de octubre de 2026 la VPS volvió a Firebase real. La demo del 12 de octubre usó emuladores aislados y sus cuentas y avances se conservaron separados de los reales. El recorrido web/móvil de login, práctica y progreso compartido fue comprobado. Las funciones señaladas como pendientes siguen en desarrollo; hay un APK Android de pruebas; iOS sigue pendiente. El estado temporal y el procedimiento para volver a Firebase real se describen en `deploy/DEMO_PUBLICA.md`, dentro de las evidencias de sistema.

## Mejoras del 21 de octubre de 2026

Se incorporaron las funciones del wireframe de Alloxentric manteniendo la interfaz propia del equipo. Cuotas 10 + 5 + 5, regalos y canje de medallas, grupos públicos/privados, niveles por dificultad, datos personales y verificación por correo. Los planes de $990/$4.990 y los tutores funcionan como demostración explícita; no cobran dinero. Consultar el informe `deploy/MEJORAS_2026-10-21.md` para las comprobaciones y requisitos externos pendientes.

## Evidencias académicas

Se conservan las evidencias recibidas. Las carpetas que aún no tienen documentos mantienen `.gitkeep`; esto no implica que una fase esté completada. Según la estructura de entrega suministrada, todavía deben incorporarse cuando estén disponibles los diarios individuales de Fase 2, las planillas de evaluación de avance/final de Fase 2 y las presentaciones del proyecto. No se generaron resultados de evaluación ni documentos académicos ficticios.

Los ZIP originales, herramientas descargadas, logs, datos de emuladores, credenciales y cachés permanecen fuera de Git mediante `.gitignore`.

## Actualización del 16 de noviembre de 2026

Se integró el trabajo de rediseño del equipo y se homologaron funciones web/móvil. Consultar deploy/HOMOLOGACION_2026-11-16.md dentro de las evidencias de sistema. APK de pruebas: https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261117-seguridad.apk. Facsímil permanece Próximamente y PayPal pendiente.

Correcciones del 17 de noviembre: navegación, grupos, contraste y traducciones. Detalle en deploy/REVISION_VISUAL_IDIOMA_2026-11-17.md dentro de las evidencias de sistema. APK de pruebas actualizado a 1.0.7.

Revisión de ciberseguridad del 17 de noviembre: versión 1.0.8, sesiones de navegador con cookies HttpOnly, revocación por dispositivo, dependencias corregidas y servicio VPS aislado. Alcance, pruebas y pendientes de producción en deploy/REVISION_CIBERSEGURIDAD_2026-11-17.md, dentro de las evidencias de sistema. No equivale a certificación ni auditoría externa.

Mantenimiento Ubuntu autorizado y completado el 17 de noviembre: 178 paquetes actualizados, 26 nuevos y kernel 6.8.0-149 activo. Aprueba y los servicios compartidos fueron verificados después del reinicio. Ver deploy/MANTENIMIENTO_UBUNTU_2026-11-17.md dentro de las evidencias de sistema; snapd mantiene un aplazamiento gradual gestionado por Ubuntu.

## PayPal Sandbox — 17 de noviembre de 2026

Se publicó la integración de suscripciones mensuales de prueba en web y Flutter, con confirmación del servidor, cancelación y webhook verificado. APK 1.0.9: https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261117-paypal.apk. Falta completar una compra aprobada con comprador Sandbox y probarla en teléfono físico; el recorrido hasta PayPal y el regreso sin pagar ya fueron comprobados. Ver deploy/PAYPAL_SANDBOX_2026-11-17.md dentro de las evidencias de sistema. Solo pagos ficticios, nunca dinero real.

## Interfaz 1.1.0 — 17 de noviembre de 2026

Suscripción con ventana emergente y actualización automática, condiciones mensuales claras, Tutores rediseñado, skeletons por sección, marca Aprueba en las pestañas, traducciones ampliadas y eliminación del contenido propio al borrar una cuenta conservando respuestas ajenas. El pago Sandbox aprobado por el usuario ya fue verificado contra PayPal. APK: https://aprueba.shamiiplay.com/descargas/Aprueba-1.1.0.apk. Detalle y límites en deploy/INTERFAZ_1_1_0_2026-11-17.md dentro de las evidencias de sistema.

## Plan de estudio — 18 de noviembre de 2026

Versión 1.1.1: objetivo de hoy destacado, configuración simplificada, tarjetas por prueba, textos completos en español/inglés y skeletons ajustados en web y Flutter. Ver deploy/PLAN_ESTUDIO_1_1_1_2026-11-18.md dentro de las evidencias de sistema. APK: https://aprueba.shamiiplay.com/descargas/Aprueba-1.1.1.apk.

## Carga y tema — 18 de noviembre de 2026

Versión 1.1.2: skeleton de lateral/cabecera al restaurar sesión, revelación circular del tema en web y colores interpolados en Flutter. Informe deploy/CARGA_TEMA_1_1_2_2026-11-18.md. APK: https://aprueba.shamiiplay.com/descargas/Aprueba-1.1.2.apk. La especificación de Arena queda en deploy/ARENA_PROPUESTA_V1.md; todavía no está implementada.

La entrega 1.1.2 también corrige metas según cuota/plan, continuidad tras cumplir el objetivo y presentación de acceso ilimitado. Ver deploy/CUOTAS_Y_METAS_2026-11-18.md para reglas y pruebas.

## Inicio y revisión de flujos — 18 de noviembre de 2026

Versión 1.1.3: Inicio rediseñado, contraste de texto separado del azul de superficies, transición de tema más perceptible con alternativa si falla la captura y progreso móvil basado en el resumen actual del servidor. Revisión ampliada: 57 pruebas de integración en diez suites. Detalle en deploy/INICIO_CONTRASTE_LOGICA_1_1_3_2026-11-18.md. APK: https://aprueba.shamiiplay.com/descargas/Aprueba-1.1.3.apk.
