# Arena Aprueba · Especificación propuesta de la primera versión

Estado: la primera entrega competitiva con entrada 1 y M1/M2 está implementada; consultar ARENA_1_2_0_2026-11-22.md para estado de publicación, alcance validado y límites. El resto de este documento conserva el diseño más amplio para futuras entregas. El usuario eligió duelos con matchmaking y pozo de medallas. Los valores de tiempos, rangos y límites siguientes son decisiones iniciales propuestas, configurables; no son resultados de pruebas ni funciones publicadas.

## Experiencia

Una vista Arena en web y móvil. Cabecera con alias, rango por prueba, saldo disponible y entrada reservada si hay partida. Selector de prueba con su color. Selector de entrada: 1, 5 o 10 medallas de bronce. Pozo visible 2, 10 o 20; texto explícito de que una derrota pierde la entrada. Acceso para cuentas verificadas, gratuitas o premium, con las mismas condiciones. Sin compras de medallas y sin vinculación con PayPal.

Botón Buscar rival y alternativa Entrenar sin medallas ni rango. Solo se habilitan pruebas con suficientes preguntas revisadas para Arena. No se publican datos de una prueba inexistente ni rivales automáticos presentados como estudiantes reales.

### Pantallas

1. Arena: selectores, saldo/entrada/pozo, rango, historial breve y reglas desplegables. Reglas y premios visibles antes de confirmar.
2. Búsqueda: prueba, entrada, tiempo transcurrido, rango buscado y Cancelar. Mensaje veraz si no hay rival; nunca inventar tiempo estimado ni alumnos conectados.
3. Rival encontrado: alias y rango de ambos, pozo y confirmación Estoy listo durante 20 segundos. Sin correos ni nombres completos obligatorios. Si alguno no acepta, no se cobra a nadie; se ofrece volver a buscar sin hacerlo automáticamente.
4. Partida: ambos alias, estado de conexión, ronda 1/5, temporizador, pregunta y opciones. Confirmar respuesta una sola vez; estado Respuesta enviada mientras termina el rival. Salir requiere confirmar que cuenta como abandono.
5. Resultado: victoria, derrota, empate o anulación; aciertos, movimientos del saldo, cambio de rango y nueva búsqueda. Revisión de las cinco preguntas con respuesta propia, correcta y explicación, disponible al finalizar para ambos.
6. Historial: prueba, fecha localizada, rival, resultado, entrada, premio bruto y variación neta de saldo. Sin multiplicar cifras con fines de apariencia: entrada 5, premio 10, ganancia neta +5; derrota -5; empate 0 neto.

## Matchmaking

Una sola búsqueda o partida activa por cuenta, aunque abra varias pestañas o dispositivos. Misma prueba, entrada y dificultad intermedia; rango competitivo cercano. Ventana inicial de ±150 puntos durante 20 s y ampliación hasta ±300 durante los siguientes 40 s. Al minuto sin rival, informar y ofrecer continuar o cambiar a entrada 1; nunca cambiar prueba o entrada sin decisión del alumno. Los rivales son personas realmente en cola y conectadas. No emparejar la cuenta consigo misma ni repetir pareja competitiva durante 24 h.

Las entradas 1/5/10 estarán definidas, pero conviene iniciar las pruebas internas con entrada 1 y abrir el resto cuando haya suficientes alumnos para no fragmentar la cola. El modo de entrenamiento inicial es individual, no un rival ficticio, y no altera saldo ni rango.

## Partida y preguntas

Cinco preguntas iguales en el mismo orden, con el mismo orden de opciones para ambos. 60 segundos por ronda, cuenta atrás inicial de 3 s y pausa de 2 s entre rondas. Los textos elegibles deben revisarse para ese tiempo; no incorporar lecturas extensas a una ronda de un minuto sin revisión. Avance cuando ambos responden o termina el plazo; no revelar aciertos ni respuestas correctas hasta el resultado final.

Un acierto vale 1; error o falta de respuesta vale 0. Gana quien tenga más aciertos. Empate: devolución íntegra de ambas entradas y sin cambio de rango. No usar milisegundos ni latencia como desempate. El servidor decide plazos y validez, permite una respuesta por jugador/ronda y no entrega claves de respuesta ni preguntas futuras antes de tiempo.

La selección usa un banco elegible revisado, procurando preguntas no vistas por ninguno. Si no hay cinco adecuadas para ambos, no comienza una partida con entrada; se informa y no se descuenta. No reutilizar a escondidas preguntas ya resueltas para favorecer a un alumno. Los datos de Arena quedan separados del historial de práctica y no cambian aciertos académicos, cuota diaria, recompensas por pregunta o meta del plan de estudio.

Límite inicial propuesto: cinco partidas competitivas y tres entrenamientos por día de Chile, igual para todos los planes. Las partidas iniciadas cuentan aunque se abandonen; una falla confirmada del servidor no consume el límite. Con esto Arena no se convierte en una vía ilimitada para obtener preguntas y recompensas fuera de la práctica.

## Pozo y economía

Buscar no cuesta. Cuando ambos aceptan y se comprueban saldo, conexión y preguntas, una sola transacción descuenta ambas entradas del saldo disponible y las mueve a un depósito de la partida. Si una comprobación falla, no se descuenta ninguna. El saldo reservado no puede canjearse, regalarse ni usarse en otra partida.

En una victoria, el depósito completo se acredita al ganador y se cierra. No se crean medallas nuevas: saldo de ambos más depósito se conserva. Empates y anulaciones devuelven cada entrada a su propietario. Cada débito, premio o devolución queda registrado y no se repite aunque el cliente reintente, se reconecte o el proceso reinicie. La transferencia debe ser atómica y permitir verificar ganador, propietarios e importe. El cliente nunca manda un ganador, premio o saldo aceptado sin comprobación.

## Desconexión y fallos

- Antes del inicio: cancelar o no confirmar libera la búsqueda sin coste ni cambio de rango.
- Durante la partida: aviso Reconectando y hasta 30 s para volver. El reloj de la ronda continúa; volver no permite cambiar respuestas enviadas ni recuperar tiempo.
- Un jugador no vuelve en 30 s o abandona: derrota por abandono; el rival conectado gana el pozo. Mostrarlo claramente antes de salir.
- Ambos pierden conexión y no vuelven: anulación con devolución, sin cambio de rango; cuenta en su límite diario y se registra para detectar abuso.
- Falla verificada del servidor o estado inconsistente: anulación y devolución sin consumir límite. Un mensaje del cliente no basta para declarar un fallo del servidor.
- Reinicio de VPS: recuperar estado y plazos guardados. Si no puede garantizarse continuidad justa, anular y devolver; nunca dejar medallas retenidas indefinidamente.
- Al eliminar una cuenta: cancelar cola o prepartida; si ya empezó, resolver como abandono antes de limpiar/anomizar sus datos. No borrar resultados o contenido de la otra persona.

## Rango competitivo

Puntuación independiente por prueba, inicialmente 1000 puntos y En clasificación durante cinco partidas resueltas. Aspirante: menos de 1100; Explorador: 1100–1299; Estratega: 1300–1599; Maestro: 1600 o más. Ajuste Elo con K=40 durante clasificación y K=24 después, calculado y redondeado en servidor, mínimo 0. Empate o anulación no cambian puntos. Las entradas mayores no dan más puntos de rango. No presentar este rango como nota, dominio o puntaje PAES. Sin reinicios de temporada en la primera versión.

## Integración y seguridad

API existente para comandos autenticados, Firestore como estado durable y transacciones para saldos/depósitos/resultados. Canal de eventos en tiempo real para notificar emparejamiento, ronda, respuesta enviada y resultado; reconectar recupera una instantánea autorizada. Los eventos de interfaz no sustituyen las validaciones del servidor.

Validar sesión, verificación, pertenencia a la partida, estado, plazo, identificador de pregunta y opción. Limitar solicitudes, búsquedas y conexiones; identificadores de operaciones idempotentes. Si se usan WebSockets, validar origen y autenticar con cookie de sesión o ticket corto emitido por la API para móvil; no exponer JWT de larga duración en URL. Presencia con latidos y limpieza por vencimiento, sin depender del cliente para cerrar depósitos. Trabajador con bloqueo/lease para que dos procesos no liquiden el mismo resultado. Historial económico mínimo auditado y separado de los datos públicos de perfil.

## Orden de implementación y aceptación

1. Modelo de estados, reglas, depósito y liquidación, con emuladores y pruebas de concurrencia.
2. Partida completa entre dos cuentas verificadas, con reconexión y recuperación tras reinicio.
3. Cola y confirmación de rival con alumnos reales, límites y vencimientos.
4. Arena, partida, resultados y entrenamiento en web y Flutter, ES/EN y claro/oscuro.
5. Prueba entre dos compañeros en distintos dispositivos; publicación gradual primero con entrada 1.

Para publicar deben pasar: saldos conservados; una sola liquidación; empate y devoluciones exactas; sin doble partida o gasto; respuesta fuera de plazo rechazada; preguntas y respuestas protegidas; ausencia de rival sin cobro; reconexión/reinicio sin medallas retenidas; terceros sin acceso al duelo; eliminación de cuenta sin perjudicar al rival; lectura accesible, skeletons por pantalla, idiomas y ausencia de desbordamientos.
