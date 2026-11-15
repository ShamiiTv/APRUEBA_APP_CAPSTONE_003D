# Geometría de skeletons — 2026-11-02

Se reemplazó la distribución genérica de cuatro tarjetas por variantes para inicio, planes, preguntas, medallas, grupos, formularios, tutores y publicaciones. Las variantes respetan columnas, cantidades conocidas, márgenes y espacios principales del apartado.

Web: skeleton y contenido de planes comparten las clases de tarjeta y rejilla, con mínimos de altura comunes. En preguntas se comparte espacio de enunciado, alternativas y contenedor; al recargar se conserva además la altura medida de la pregunta anterior. Inicio reserva cuatro métricas y sus secciones; medallas reserva cinco saldos y las filas de canje; el directorio de grupos usa filas, evitando una cuadrícula ajena al contenido final.

Flutter: se agregaron variantes de cinco medallas, grupos con acciones y filas, inicio con sus tarjetas, formulario, preguntas y niveles. Planes y su skeleton usan LoadingGeometry.planHeight para compartir mínimo por tipo de plan, ancho y escala de texto. Se corrigió el selector de prueba para no desbordarse en pantallas estrechas.

## Mediciones y pruebas
- Planes web a 390 px: skeleton y contenido de cada tarjeta coinciden en ancho 358 px y alturas 340 / 400 / 340 px en ambos temas.
- Planes web a 1280 px: tres columnas, cada tarjeta 308 x 400 px antes y después, en ambos temas.
- Flutter: prueba automática compara las tres tarjetas cargando/cargadas a 320, 390 y 800 px; diferencia máxima permitida de 1 px, aprobada.
- Flutter: todos los tipos de skeleton se renderizan sin desbordamiento en 320 px, prueba aprobada.
- Analyze sin incidencias. Pruebas previas de omitir, grupos propios y práctica web siguen pasando en claro/oscuro. Flutter Web verificado visualmente con API demorada y el APK compilado conserva la firma de pruebas.

## Límites del ajuste
Las preguntas de lectura, los nombres largos, la ampliación de texto y las listas con cantidad desconocida pueden ocupar más espacio del estimado. Se usa altura mínima, nunca recorte ni altura fija sobre contenido real: el texto completo sigue accesible. No se garantiza identidad de altura para datos arbitrarios aún desconocidos; se reduce el salto inicial y se mantiene la última medida en las preguntas web.

Entrega: misma web y móvil; APK 1.0.5, código 20261105, https://aprueba.shamiiplay.com/descargas/Aprueba-Android-pruebas-20261102-layout.apk.
Respaldo VPS previo: /opt/shamii/aprueba-backups/skeleton-layout-20261102.tar.gz.
