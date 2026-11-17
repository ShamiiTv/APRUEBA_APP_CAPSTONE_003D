# Aprueba — Proyecto Capstone

Proyecto del equipo Camilo Bernal, Javiera Villablanca y Claudio Valverde. El repositorio reúne las evidencias académicas por fase y el código de Aprueba web, la app Flutter y su API compartida.

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

Se integró el trabajo de rediseño del equipo y se homologaron funciones web/móvil. Consultar deploy/HOMOLOGACION_2026-11-16.md dentro de las evidencias de sistema. APK de pruebas: https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261117.apk. Facsímil permanece Próximamente y PayPal pendiente.

Correcciones del 17 de noviembre: navegación, grupos, contraste y traducciones. Detalle en deploy/REVISION_VISUAL_IDIOMA_2026-11-17.md dentro de las evidencias de sistema. APK de pruebas actualizado a 1.0.7.
