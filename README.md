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

## Demostración pública provisional

- Web: https://apruebashamiiplaytest.dbm.shared-servers.com/
- Interfaz móvil: https://apruebashamiiplaytest.dbm.shared-servers.com/movil/

La demo configurada el 12 de octubre de 2026 usa emuladores aislados en la VPS. Sus cuentas y avances son independientes de Firebase real. El recorrido web/móvil de login, práctica y progreso compartido fue comprobado. Las funciones señaladas como pendientes siguen en desarrollo; no se generó un APK/IPA nativo. El estado temporal y el procedimiento para volver a Firebase real se describen en `deploy/DEMO_PUBLICA.md`, dentro de las evidencias de sistema.

## Evidencias académicas

Se conservan las evidencias recibidas. Las carpetas que aún no tienen documentos mantienen `.gitkeep`; esto no implica que una fase esté completada. Según la estructura de entrega suministrada, todavía deben incorporarse cuando estén disponibles los diarios individuales de Fase 2, las planillas de evaluación de avance/final de Fase 2 y las presentaciones del proyecto. No se generaron resultados de evaluación ni documentos académicos ficticios.

Los ZIP originales, herramientas descargadas, logs, datos de emuladores, credenciales y cachés permanecen fuera de Git mediante `.gitignore`.
