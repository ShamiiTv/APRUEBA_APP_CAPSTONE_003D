# Revisión de cuotas, acceso y metas · Aprueba 1.1.2

18 de noviembre de 2026, Chile.

## Reglas de acceso verificadas

Gratis: 10 preguntas nuevas por día de Chile, más 5 si colegio/edad/región están completos y más 5 si además tiene dirección completa: 10/15/20. Es una cuota compartida entre pruebas, no una cuota por asignatura. Se renueva a medianoche de America/Santiago, no a medianoche UTC. La meta usa la cuota habilitada del día, no solamente las preguntas que queden pendientes a esta hora.

Una prueba: acceso sin cuota diaria solo a la asignatura contratada, mientras el período pagado esté vigente. Las demás comparten la cuota gratuita correspondiente al perfil. Acceso completo: todas las pruebas sin cuota diaria mientras el período pagado esté vigente. Las respuestas ilimitadas no consumen la cuota gratuita. Sin cuota no significa banco infinito: se mantiene la disponibilidad real y la exclusión de preguntas ya respondidas, sin volver a otorgar medallas por reintentos.

Cancelar renovación conserva los derechos hasta el vencimiento ya pagado; el vencimiento se comprueba en el servidor al solicitar/guardar práctica y al validar la meta. Un perfil no puede concederse acceso, cambiar vencimiento o inventar quota.unlimited mediante una actualización normal.

## Problemas corregidos

1. Antes se aceptaban metas 1–20 aunque la cuenta gratuita solo tuviera 10. La API ahora valida la cuota real en la misma transacción que guarda preferencias. Web y Flutter muestran un máximo dinámico de 10/15/20 para selecciones sin acceso ilimitado.
2. Con al menos una prueba ilimitada seleccionada, el organizador permite metas personales 1–100. Este máximo del selector no es una cuota ni impide responder más preguntas; la práctica no consulta la meta como límite de acceso. Si se retira esa prueba del plan, la meta del borrador baja al máximo gratuito correspondiente.
3. El plan podía anunciar cuota agotada con una prueba ilimitada todavía utilizable. Ahora los mensajes respetan las tareas disponibles para esa prueba y el inicio distingue su acceso del contador gratuito de las demás.
4. Al cumplir una meta se bloqueaban los botones porque había cero tareas propuestas. Ahora se puede seguir practicando cuando queda contenido y acceso, tanto gratis como pagado. Meta completada y cuota agotada son estados diferentes.
5. Si un plan vence o pierde bonos, la meta efectiva se ajusta al acceso actual y se informa. El objetivo original guardado se conserva en Firestore; no hay migración ni modificación masiva de perfiles. Guardar conscientemente una nueva meta reemplaza esa preferencia.
6. Los contadores de inicio/práctica no presentan el límite gratuito como si fuera un límite de la asignatura pagada. Los errores nuevos tienen texto ES/EN.

La distribución de tareas respeta el banco restante por asignatura, las respuestas de hoy dentro del plan y el presupuesto gratuito compartido. Al agotarse este presupuesto, solo las asignaturas cubiertas por el plan pueden recibir tareas adicionales. Plan y formato de preguntas son conceptos distintos: Facsímil continúa Próximamente.

## Validación

- API: 75 pruebas unitarias. Firebase aislado: seguridad 9, eliminación 5, homologación 5, PayPal 1 y cuotas 3, aprobadas. Las pruebas nuevas ejercitan los endpoints reales: tope 10/15/20, rechazo de campos falsificados, respuestas premium tras agotar gratis sin aumentar su contador, acceso por asignatura y vencimiento con conservación de la preferencia original.
- Web: 19 pruebas unitarias, lint y compilación. Navegador: matriz de seis escenarios de cuota, cuatro combinaciones idioma/tamaño del plan y cuatro de carga/transición. Incluye continuación tras la meta, borrador al cambiar de asignatura ilimitada, objetivo ajustado por vencimiento y ausencia de errores/desbordamientos.
- Flutter: análisis sin incidencias, 49 pruebas incluidas continuidad tras cumplir meta, ajuste del slider, carga estrecha y colores interpolados. Compilaciones web/APK.

Solo se usaron fixtures y proyectos demo- para las pruebas; no se consumieron preguntas, editaron preferencias ni borraron cuentas de alumnos reales. La validación de interfaz en memoria no sustituye una prueba de teléfono físico.

## Publicación

Se entrega junto a los skeletons y transiciones de tema de 1.1.2. APK: https://aprueba.shamiiplay.com/descargas/Aprueba-1.1.2.apk. El registro de respaldo y huellas se añade al completar el despliegue. Arena está documentada pero todavía no implementada.

### Despliegue completado

Respaldo: `/opt/shamii/aprueba-backups/security-release-20261118T051126Z`. API conectada a Firebase tras activar. Auditoría de dependencias de API: cero vulnerabilidades. SHA256 APK 1.1.2: `69084991546aafedcf0f1bb27125738d909ff879c21f53e02a46f5e6dbffcbd6`. SHA256 Flutter web main.dart.js: `d15abbf78094c388d0b176358e8e8e209cc9b1c102e1e44dce2017b006e96a0b`. Se conserva la configuración privada y no se ejecuta migración de usuarios ni limpieza de datos.
