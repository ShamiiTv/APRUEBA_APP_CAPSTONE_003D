"""Reproducible editorial changes; never connects to Firebase.

Indices refer to the normalized bank snapshot, not the original duplicate-key JSON.
Every changed field is retained in Fase 2/Evidencias Proyecto/Evidencias de documentación/Revisión banco de preguntas/revision_contenido.json.
"""
import copy
import hashlib
import json
import re
import zipfile
from collections import Counter
from review_bank import ROOT, bank, outside_math

OUT = ROOT / 'Fase 2/Evidencias Proyecto/Evidencias de documentación/Revisión banco de preguntas'
SNAPSHOT = OUT / 'banco_antes_revision_contenido.zip'
DATE = '2026-10-09'
SOURCES = {
    'm1': 'https://demre.cl/publicaciones/pdf/2027-26-03-19-temario-paes-regular-m1.pdf',
    'm2': 'https://demre.cl/publicaciones/pdf/2027-26-03-19-temario-paes-regular-m2.pdf',
    'lectora': 'https://demre.cl/publicaciones/pdf/2027-26-03-19-temario-paes-regular-competencia-lectora.pdf',
    'celula': 'https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells',
    'membrana': 'https://openstax.org/books/biology-2e/pages/5-2-passive-transport',
    'lipidos': 'https://openstax.org/books/biology-2e/pages/3-3-lipids',
    'rae': 'https://www.rae.es/dpd/',
}

def main():
    if (OUT / 'revision_contenido.json').exists():
        raise SystemExit('Revisión ya aplicada. No se sobrescribe el historial editorial.')
    data = bank()
    originals = copy.deepcopy(data)
    notes = {}
    approved = set()
    def edit(ref, reason, **fields):
        key, number = ref.split(':')
        q = data[key][1][int(number)-1]
        q.update(fields)
        notes.setdefault(ref, []).append(reason)
        approved.add(ref)
    def option(ref, index, text, reason='Se sustituye un distractor equivalente o incorrectamente formulado.'):
        key, number = ref.split(':')
        options = data[key][1][int(number)-1]['alternativas'].copy()
        options[index] = text
        edit(ref, reason, alternativas=options)
    def answer(ref, letter, reason='La clave se corrige mediante resolución independiente del enunciado.'):
        edit(ref, reason, respuesta_correcta=letter)

    # Mathematical corrections preserve the quantities in the statement.
    for ref, letter in {'m2:3':'C', 'm2:20':'B', 'm7:25':'B', 'm9:44':'B', 'm12:1':'E', 'm12:9':'D'}.items():
        answer(ref, letter)
    edit('m3:2', 'El área original es 56, no 60; se resuelve sin alterar el dato.',
         alternativas=['(2√15 − 2) m','6 m','7 m','8 m','10 m'],
         explicacion_respuesta='Sea x el ancho: x(x+4)=56. Entonces x²+4x−56=0 y x=−2±2√15. Se descarta la raíz negativa. El ancho es 2√15−2 m, aproximadamente 5,746 m.')
    edit('m3:14', 'Se explicita una escala de 0 a 10 para evitar el contexto chileno de notas hasta 7.',
         pregunta='En una escala de calificaciones de 0 a 10, un estudiante obtuvo 5, 6, 7, 8 y 9 en cinco pruebas. ¿Qué calificación necesita en la sexta para promediar 7,5?')
    edit('m3:44', 'Los argumentos 0,6 y 0,8 no son iguales: el seno de la suma vale 0,96.',
         alternativas=['0,96','0,8','0,6','0,5','0,2'],
         explicacion_respuesta='Sean α=arcsen(0,6) y β=arccos(0,8). En sus rangos principales, cos α=0,8 y sen β=0,6. Por la fórmula de suma, sen(α+β)=0,6·0,8+0,8·0,6=0,96.')
    edit('m4:12', 'El sistema original tiene suma de cuadrados 25, no 29.',
         alternativas=['((3+√41)/2, (−3+√41)/2) y ((3−√41)/2, (−3−√41)/2)', '(5,2) y (−2,−5)', '(4,1) y (−1,−4)', '(3,0) y (0,−3)', '(5,2) y (−1,−4)'],
         explicacion_respuesta='De x−y=3 resulta x=y+3. Sustituyendo: (y+3)²+y²=25, es decir y²+3y−8=0. Por fórmula general, y=(−3±√41)/2 y x=(3±√41)/2, tomando el mismo signo en ambas coordenadas.')
    edit('m4:34', 'La solución omitía el término constante +2 de la integral.',
         alternativas=['38/3','20/3','22/3','8','10'],
         explicacion_respuesta='Una antiderivada es x³/3+3x²/2+2x. Entre 0 y 2 da 8/3+6+4=38/3.')
    edit('m5:1', 'La explicación pertenecía a otra ecuación; la solución real es 31/5.',
         alternativas=['31/5','6','7','8','9'], respuesta_correcta='A',
         explicacion_respuesta='Multiplicando por 6: 3(x−3)+2(x+1)=24. Entonces 5x−7=24, de donde x=31/5=6,2.')
    edit('m5:27', 'Se resuelve la ecuación original con base 3, sin reemplazarla por otra.',
         alternativas=['5','7/2','4','2','6'],
         explicacion_respuesta='Como 27=3³, x+1=3(x−2). Así 2x=7 y x=7/2.')
    edit('m5:34', 'Se reemplaza la opción aproximada arbitraria por el redondeo correcto.',
         pregunta='Dados los valores 10, 12, 15, 18 y 20, ¿cuál es la desviación estándar poblacional, redondeada a dos decimales?',
         alternativas=['3,69','4,00','3,20','2,50','4,50'],
         explicacion_respuesta='La media es 15. La suma de los cuadrados de las desviaciones es 68. La varianza poblacional es 68/5=13,6 y la desviación estándar es √13,6≈3,69.')
    edit('m6:8', 'La explicación resolvía un sistema diferente; el original da x=9/7.',
         alternativas=['9/7','2','3','4','0'], respuesta_correcta='A',
         explicacion_respuesta='Restando la primera ecuación de la segunda: x−2y=−3. Sumando la primera y la tercera: 2x+3y=9. Sustituyendo x=2y−3: 7y=15, luego y=15/7 y x=9/7. Finalmente z=18/7.')
    edit('m6:19', 'El integrando original es (x²+2x)/x, no (x²+2)/x.',
         respuesta_correcta='A',
         explicacion_respuesta='Para x≠0, (x²+2x)/x=x+2. Integrando en cualquier intervalo que no contenga 0: x²/2+2x+C.')
    edit('m6:34', 'El punto original estaba sobre la recta dada; se pregunta explícitamente por la pendiente, sin afirmar paralelismo estricto.',
         pregunta='Halla la ecuación de la recta que pasa por (1,2) y tiene pendiente −3.',
         explicacion_respuesta='Usando punto-pendiente: y−2=−3(x−1). Por tanto y=−3x+5.')
    edit('m7:4', 'La distancia es no negativa para cualquier valor real de a.',
         alternativas=['|a|√2','a','2a','a√3','0'],
         explicacion_respuesta='Las diferencias de coordenadas son a y −a. La distancia es √(2a²)=|a|√2, para todo a real.')
    option('m7:16',4,'x = (5±√37)/4','Se corrige un paréntesis incompleto en el distractor.')
    edit('m7:18', 'Se preserva el sistema original: x=1, y=−1 satisface ambas ecuaciones.',
         explicacion_respuesta='De 3x+y=2, y=2−3x. Sustituyendo: 5x−2(2−3x)=7, luego 11x=11, x=1 e y=−1. Así 2x−y=3.')
    edit('m9:34', 'La solución original resolvía otra ecuación; el resultado real es 7/4.',
         alternativas=['2','7/4','4','5','1'],
         explicacion_respuesta='Como 32=2⁵, igualamos exponentes: x+2=5(x−1). De aquí 4x=7 y x=7/4.')
    edit('m9:35', 'Se mantiene el área 48 y se calcula su perímetro exacto.',
         alternativas=['28 cm','8√13 cm','24 cm','20 cm','36 cm'],
         explicacion_respuesta='Si el ancho es x, x(x+4)=48. Entonces x=−2+2√13 y el largo es 2+2√13. El perímetro es 2(x+x+4)=8√13 cm≈28,84 cm.')
    edit('m10:1', 'Distribuir en la ecuación original da x=−5, no 7.',
         alternativas=['−5','5','9','11','3'],
         explicacion_respuesta='4(2x−3)+5=8x−7 y 3(3x+2)−8=9x−2. Entonces 8x−7=9x−2, de donde x=−5.')
    edit('m10:14', 'Los exponentes difieren en 5 para todo x: no hay solución real.',
         alternativas=['No tiene solución real','−3','5','3','0'],
         explicacion_respuesta='Como 9=3², se requeriría 2x−1=2(x+2)=2x+4. Esto implica −1=4, una contradicción. No hay solución real.')
    edit('m10:32', 'Se especifica el intervalo del argumento para evitar dos convenciones de argumento principal.',
         pregunta='Para z=−2−2i, ¿cuál es su argumento en el intervalo [0°,360°)?')
    edit('m10:40', 'Se corrige el monto y se elimina la selección de una opción por cercanía arbitraria.',
         alternativas=['$2343,32','$2320','$2330','$2350','$2400'],
         explicacion_respuesta='La tasa trimestral es 0,08/4=0,02 y hay 8 trimestres. M=2000(1,02)⁸=2343,318762…; redondeado a centavos, $2343,32.')
    edit('m11:32', 'El aumento original es 10 km/h; el tiempo exacto es 8/3 h.',
         alternativas=['8/3 h','2,5 h','2 h','2,8 h','3 h'],
         explicacion_respuesta='La velocidad inicial es 240/3=80 km/h. La nueva es 90 km/h. El tiempo es 240/90=8/3 h, equivalente a 2 h 40 min.')
    edit('m13:42', 'Con perímetro 32 y ancho 6, el largo es 10; la diagonal no es 10.',
         alternativas=['2√34 cm','8 cm','12 cm','14 cm','9 cm'],
         explicacion_respuesta='De 2(L+6)=32 resulta L=10. Por Pitágoras, d=√(10²+6²)=√136=2√34 cm≈11,66 cm.')
    edit('m13:44', 'La capitalización anual exige contar años completos; superar el umbral requiere 5 años.',
         pregunta='Un capital de $8000 se invierte al 5% con capitalización anual. ¿Después de cuántos años completos supera por primera vez los $10000?', respuesta_correcta='B',
         explicacion_respuesta='Se busca el menor entero n con 8000(1,05)^n>10000. Tras 4 años hay $9724,05; tras 5, $10210,25 aproximadamente. Se necesitan 5 años completos.')

    # Explicit replacements for semantically equivalent choices.
    replacements = {
        'm3:39':{4:'x=−1, x=−5'}, 'm4:23':{2:'x=3±2'}, 'm4:41':{1:'6'}, 'm4:48':{3:'15/52'},
        'm5:25':{4:'3/8'}, 'm5:46':{3:'x=ln2, x=1'}, 'm6:16':{1:'f⁻¹(x)=(3x−1)/(2−x)'}, 'm6:20':{2:'15/52'},
        'm7:33':{3:'(x−2)/(x+2)²'}, 'm7:37':{0:'13/51'}, 'm7:41':{2:'√58'},
        'm8:11':{2:'x²+2',3:'x²−2',4:'x⁴+1'}, 'm8:25':{4:'5/2'}, 'm8:27':{1:'6'},
        'm9:18':{4:'x=−3, x=1/2'}, 'm9:37':{4:'2/√3'}, 'm9:55':{3:'x=ln2, x=1'},
        'm10:6':{3:'1/6'}, 'm10:15':{1:'2,2'}, 'm10:37':{4:'x=−4±2'}, 'm10:43':{3:'sec x'},
        'm11:6':{3:'1/6'}, 'm11:7':{2:'x=−2, x=−4',3:'x=−4, x=−2'}, 'm11:12':{1:'2,4'},
        'm11:25':{4:'−2/√3'}, 'm11:37':{3:'7/9'}, 'm11:40':{2:'x=−1, x=1/2',3:'x=−1/2, x=1'},
        'm11:45':{3:'1/6'}, 'm11:59':{3:'x(2 ln x−1)'},
        'm12:7':{3:'x=−1/2, x=2'}, 'm12:21':{4:'1/(1+(2x+1)²)'}, 'm12:36':{4:'−sen(4x)'},
        'm12:53':{3:'3/17'}, 'm13:5':{3:'−3x+C'}, 'm13:17':{3:'3/25',4:'1/5'},
        'm13:35':{4:'e^x(x²−2x)'}, 'm13:60':{1:'2/17'}, 'm8:21':{3:'6 sen(6x)'},
        'm9:4':{3:'5(2x+1)³'}, 'm9:32':{2:'(3x+1)/(2√(x+1))',3:'(3x+4)/(2√(x+1))'},
        'm9:45':{4:'3 tan²(2x) sec²(2x)'},
    }
    for ref, updates in replacements.items():
        for index, text in updates.items():
            option(ref,index,text)

    # Cases with fewer than four distinct alternatives need authored distractors.
    full_options = {
        'm5:32':['(6x+2)/(3x²+2x)','1/(3x²+2x)','6x/(3x²+2x)','(3x²+2x)/(6x+2)'],
        'm5:43':['(x−4)/(x+4)','(x+4)/(x−4)','(x−4)/(x+4)²','1'],
        'm6:24':['1/(2√x(1+x))','1/(1+x)','√x/(1+x)','1/(2√x)'],
        'm8:12':['2/(2x+1)','1/(2x+1)','2x/(2x+1)','2/(2x−1)'],
        'm8:35':['y⁷','x²y²','x⁴y²','y⁶'],
        'm8:41':['ln(2x)+1','ln(2x)+1/2','2x','ln(2x)−1'],
        'm9:51':['x³+y³','x³−y³','x⁶+y⁶','x²+y²'],
        'm9:58':['(sen x cos x)/√(1+sen² x)','(2 sen x cos x)/√(1+sen² x)','cos x/√(1+sen² x)','sen x/√(1+sen² x)'],
        'm12:33':['x²−y²','x²+y²','x⁴−y⁴','x²−2y²'],
        'm12:44':['2/(2x+1)+3e^{3x}','1/(2x+1)+e^{3x}','2/(2x+1)+e^{3x}','1/(2x+1)+3e^{3x}'],
        'm12:60':['5/(2√(5x+3))','1/(2√(5x+3))','5/√(5x+3)','1/√(5x+3)'],
        'm12:61':['x³/3−2x²+4x+C','x³/3−4x²+4x+C','x³/3−2x²+C','x³/3−2x²+2x+C'],
        'm13:20':['3/√(1−9x²)','1/√(1−9x²)','3/√(1−3x²)','3/√(1−x²)'],
        'm13:31':['2 sec²(2x)−2 csc²(2x)','2 sec²(2x)+2 csc²(2x)','sec²(2x)−csc²(2x)','sec²(2x)+csc²(2x)'],
        'm13:46':['x−1','x+1','x²−1','1'],
        'm13:49':['2x/(x²+4)','1/(x²+4)','x/(x²+4)','2/(x²+4)'],
    }
    for ref, options in full_options.items():
        edit(ref,'Se reconstruyen distractores distintos tras resolver el ejercicio; la solución A se conserva.', alternativas=options, respuesta_correcta='A')

    # Biological ambiguity and incorrect absolutes.
    edit('b1:3','El agua también atraviesa parcialmente la bicapa; se pregunta por una molécula apolar.',
         pregunta='¿Cuál de las siguientes moléculas pequeñas y apolares atraviesa con facilidad la bicapa lipídica por difusión simple, sin proteínas transportadoras?')
    option('b1:4',3,'Las células se originan espontáneamente a partir de materia inerte.', 'Se reemplaza un postulado discutible por una afirmación inequívocamente falsa.')
    edit('b1:4','Se corrige la justificación de la teoría celular.', explicacion_respuesta='La teoría celular establece que los seres vivos están formados por células, que estas son la unidad estructural y funcional y que proceden de células preexistentes. Por eso la generación espontánea a partir de materia inerte no forma parte de esta teoría. La célula es también la unidad básica que contiene y transmite información genética.')
    edit('b1:11','Se evita afirmar ausencia de centríolos en todo el reino vegetal.', pregunta='Al comparar una célula animal típica con una célula de una planta con flores, ¿qué estructura suele encontrarse en la primera y estar ausente en la segunda?')
    edit('b1:17','70S es el ribosoma completo, no una subunidad; se elimina la comparación ambigua con orgánulos.',
         pregunta='Al comparar ribosomas citosólicos bacterianos con ribosomas citosólicos de células animales y vegetales, ¿en qué grupo se encuentran los ribosomas 70S?',
         explicacion_respuesta='Los ribosomas citosólicos bacterianos son 70S, formados por subunidades 50S y 30S. Los ribosomas citosólicos eucariontes son 80S (60S y 40S). Estas cifras son coeficientes de sedimentación y no se suman aritméticamente. Los ribosomas de algunos orgánulos constituyen un caso diferente de los citosólicos.')
    edit('b1:18','Se precisa la fotosíntesis oxigénica y se evita universalizar la fermentación.',
         pregunta='¿Cuál de estos procesos utiliza energía luminosa para sintetizar materia orgánica a partir de CO₂ y agua, liberando oxígeno?',
         explicacion_respuesta='La fotosíntesis oxigénica utiliza luz, CO₂ y agua para producir materia orgánica y liberar O₂. La realizan plantas, algas y cianobacterias. Respiración y fermentación son procesos catabólicos; la digestión descompone alimentos y la síntesis de proteínas utiliza aminoácidos.')
    edit('b1:19','Chargaff exige ADN de doble hebra.', pregunta='Una molécula de ADN bicatenario contiene 30% de adenina. ¿Qué porcentaje de sus bases corresponde a citosina?')
    edit('b1:23','Se explicita célula animal sin pared.', pregunta='¿Qué ocurre generalmente con una célula animal sin pared celular al colocarla en un medio hipotónico?')
    edit('b2:3','Se distingue transcripción nuclear de transcripción mitocondrial.', pregunta='En una célula eucariota, ¿dónde se sintetiza el ARNm de un gen localizado en el ADN nuclear?')
    edit('b2:24','El núcleo contiene nucleoplasma; la matriz corresponde a la mitocondria.', pregunta='¿Cuál de los siguientes orgánulos posee una envoltura de dos membranas que separa el nucleoplasma del citoplasma?')
    edit('b2:35','El colesterol también es anfipático; se describe la estructura específica del fosfolípido.', pregunta='¿Qué lípido de membrana presenta típicamente una cabeza polar con fosfato y dos colas de ácidos grasos, y forma la bicapa lipídica?')
    edit('b2:37','Los mitorribosomas no son universalmente 70S.', pregunta='¿Qué teoría explica el origen bacteriano de mitocondrias y cloroplastos, apoyado por su ADN propio y por similitudes de sus ribosomas con los bacterianos?', explicacion_respuesta='La teoría endosimbiótica propone que mitocondrias y cloroplastos descienden de bacterias incorporadas por células ancestrales. Su ADN propio, ribosomas de origen bacteriano, división y doble membrana apoyan esta teoría. El coeficiente de sedimentación de los ribosomas mitocondriales varía entre organismos; no todos son 70S.')
    edit('b2:38','Quitina pertenece a hongos y artrópodos, no a la pared vegetal.', pregunta='¿Qué polisacárido estructural forma parte de la pared celular de los hongos y del exoesqueleto de los artrópodos?')
    edit('b2:41','La fluorescencia también permite observar células vivas; se precisa que no hay marcaje.', pregunta='Para observar orgánulos en movimiento dentro de células vivas sin marcadores fluorescentes, ¿qué tipo de microscopio, equipado con contraste de fases, es adecuado?', explicacion_respuesta='Un microscopio óptico compuesto con contraste de fases permite observar estructuras en células vivas sin teñirlas. La microscopía electrónica convencional requiere preparación incompatible con células vivas. La fluorescencia puede utilizarse en células vivas marcadas, pero ese procedimiento queda excluido por el enunciado.')
    edit('b2:44','Se pregunta por el producto de fosforilar ADP, sin comparar cantidades indeterminadas.', pregunta='Mitocondrias aisladas reciben ADP, fosfato inorgánico, oxígeno y un sustrato respiratorio. ¿Qué molécula se forma al fosforilar el ADP?')
    edit('b2:45','Los plásmidos no son universales ni exclusivos de procariotas.', pregunta='¿Cómo se llaman las moléculas de ADN extracromosómico, frecuentemente circulares, que pueden encontrarse en bacterias y portar genes de resistencia?', explicacion_respuesta='Los plásmidos son moléculas de ADN extracromosómico presentes en muchas bacterias y también en algunos eucariontes, como levaduras. No todas las bacterias poseen plásmidos. Pueden portar genes que confieren ventajas, como resistencia a antibióticos.')
    edit('b2:46','Se aclara el modelo hipotético y el rendimiento total; la opción D sí existe.',
         pregunta='En un modelo simplificado hipotético, la glucólisis aporta 2 ATP netos y 2 NADH, y se asignan 3 ATP a cada NADH. ¿Cuál es el total de ATP de esos aportes, sin considerar lanzaderas?', respuesta_correcta='D',
         explicacion_respuesta='Bajo la hipótesis indicada: 2 ATP directos+2·3 ATP de los NADH=8 ATP. El valor de 3 ATP por NADH es un supuesto del ejercicio, no un rendimiento fisiológico universal; los cálculos actuales dependen de las condiciones y las lanzaderas.')
    edit('b3:6','También se forma el huso en profase I; se pregunta por el evento distintivo.', pregunta='¿Qué proceso distingue la profase I de la meiosis de la profase de la mitosis?')
    edit('b3:12','Existen intrones procariotas; se precisa el procesamiento eucariota habitual.', pregunta='¿Qué proceso elimina intrones y une exones durante la maduración del pre-ARNm nuclear de muchos genes eucariotas?', explicacion_respuesta='El splicing elimina intrones del pre-ARNm y une los exones para formar un ARNm maduro. Es parte del procesamiento nuclear de muchos genes eucariotas. No es correcto afirmar que todo procariota carece de intrones: existen excepciones.')
    option('b3:16',2,'Centrosoma','El centro organizador es el centrosoma, no el centríolo aislado.')
    edit('b3:16','Se precisa el papel del centrosoma animal.', pregunta='¿Qué estructura actúa como principal centro organizador de microtúbulos y participa en la organización del huso mitótico de una célula animal típica?', explicacion_respuesta='El centrosoma, compuesto por centríolos y material pericentriolar, actúa como principal centro organizador de microtúbulos en células animales típicas. El centrómero y el cinetocoro pertenecen al cromosoma; los telómeros son sus extremos y el nucléolo participa en la producción de ribosomas.')
    edit('b3:17','También interviene en estomas; se precisa su papel mecánico en tejidos de sostén.', pregunta='¿Qué papel mecánico cumple la presión de turgencia en el sostén de los tejidos herbáceos de una planta?')
    edit('b3:18','Calorías por volumen también son energía; se exige energía por superficie.', pregunta='¿Qué unidad expresa directamente la energía almacenada en la biomasa por unidad de superficie de un ecosistema?')
    edit('b3:22','La tiroides también regula calcio; se pregunta específicamente por PTH.', pregunta='¿Qué glándulas producen la hormona paratiroidea (PTH), que participa en la regulación del calcio sanguíneo?')
    edit('b3:23','La condensación persiste en metafase; se pregunta cuándo comienza.', pregunta='¿En qué fase de la mitosis comienzan a condensarse los cromosomas y a hacerse visibles como estructuras individualizadas?')
    edit('b3:25','Se precisa fijación del carbono y se evita la alternativa parcialmente verdadera.', pregunta='¿Qué ciclo fija CO₂ en el estroma del cloroplasto usando ATP y NADPH de la fase lumínica?')
    edit('b3:33','NH₃ y NH₄⁺ son respuestas posibles en el enunciado original.', pregunta='Tras la fijación biológica del nitrógeno, ¿cuál es la forma protonada del amoníaco, predominante en solución acuosa cercana a pH neutro?')
    option('b3:34',4,'Cloroplastos','Las neuronas sí pueden conservar centríolos; se elimina esa afirmación falsa.')
    edit('b3:34','Se sustituye la falsa explicación sobre centríolos neuronales.', pregunta='¿Cuál de estas estructuras NO se encuentra en una neurona humana ni está asociada a ella?', explicacion_respuesta='Una neurona humana puede tener soma, dendritas y axón; algunas se asocian con vainas de mielina producidas por células gliales. No posee cloroplastos. La ausencia de división de una neurona madura no implica que carezca universalmente de centríolos.')
    option('b3:37',0,'Producir vitamina B12','La piel sintetiza vitamina D, por lo que la alternativa original también era válida.')
    edit('b3:37','Se elimina la contradicción sobre vitamina D.', explicacion_respuesta='La piel protege frente a agentes externos y limita la pérdida de agua. Además participa en la termorregulación y en la síntesis de vitamina D, pero no sintetiza vitamina B12. El almacenamiento principal de calcio está en los huesos y la producción de células sanguíneas en la médula ósea.')
    edit('b3:40','Se evita universalizar ribosomas mitocondriales 70S.', explicacion_respuesta='La mitocondria posee ADN propio y ribosomas de origen bacteriano. Estas características, junto con su división y doble membrana, apoyan la teoría endosimbiótica. El tamaño de sus ribosomas no es 70S en todos los organismos.')
    option('b3:44',1,'La capacidad de recuperarse o reorganizarse tras una perturbación','Resiliencia no es únicamente velocidad de recuperación.')

    # Language corrections are tracked even when the item is supplementary.
    def vedit(ref, reason, **fields):
        edit(ref, reason, **fields)
    option('v1:9',0,'Ganar mucho dinero no garantiza la felicidad.','La negación de suficiencia no equivale a negar toda felicidad.')
    edit('v1:16','El fragmento no resume tramas; se reemplaza la etiqueta de la clave.', alternativas=['Datos de nacimiento y familia','Valoración crítica de las novelas','Información sobre obras y rasgos de su escritura','Historia política de Chile','Instrucciones para escribir novelas'], explicacion_respuesta='El fragmento menciona dos títulos y describe rasgos de la escritura: mezcla realidad y ficción y crea personajes complejos. No relata las tramas ni entrega datos de nacimiento o familia.')
    edit('v1:29','No hay subrayado en el JSON; se identifica la expresión evaluada.', pregunta="En 'No es que no quiera ayudarte, es que no puedo', ¿qué expresa la primera parte, 'No es que no quiera ayudarte'?")
    # A question about grammatical form alone is not reading practice.
    option('v1:30',4,'Buho','Había más de una palabra correctamente escrita.')
    option('v1:30',3,'Cojeme','Se elimina otra alternativa correctamente tildada.')
    option('v2:20',2,'Tengo; hambre quiero comer.','El punto y coma original en C también era válido.')
    edit('v2:25','El fragmento contiene dos tiempos distintos; se delimita el que se pregunta.', pregunta="En 'Si hubiera estudiado más, habría aprobado', ¿qué tiempo verbal corresponde exclusivamente a 'hubiera estudiado'?")
    edit('v2:29','Azúcar admite masculino y femenino; se usa un error real.', alternativas=['El agua está fría.','La puerta está abierta.','El águila vuela alta.','Las malas noticias afectaron al equipo.','La puerta está abierto.'], explicacion_respuesta="'Puerta' es femenino singular y exige 'abierta'. 'Azúcar' admite los dos géneros, por lo que 'la azúcar morena' no justificaba una clave de error.")
    edit('v3:5','Se pregunta por el hiato que la solución intentaba evaluar.', pregunta='¿Cuál de las siguientes palabras lleva tilde para marcar un hiato de vocal abierta y vocal cerrada tónica?', explicacion_respuesta="'Raíz' contiene a-í en sílabas distintas y la vocal cerrada tónica lleva tilde. 'Cantábamos' y 'víctima' están bien acentuadas por ser esdrújulas, pero no por ese tipo de hiato.")
    edit('v3:6','Solo por Juan es complemento agente.', pregunta="En la construcción 'La novela fue leída por Juan', ¿qué función cumple exclusivamente 'por Juan'?")
    edit('v3:11','Cacofonía urbana puede ser literal; se retira la clasificación metafórica no demostrada.', pregunta="Lee: 'El ruido de los autos, las sirenas, los gritos. Todo se mezclaba en una cacofonía urbana'. ¿Qué significa 'cacofonía urbana' en este contexto?", alternativas=['Una combinación desagradable de sonidos de la ciudad','Un silencio absoluto','Una melodía suave de instrumentos','Una conversación ordenada','Un olor intenso'], explicacion_respuesta='Las referencias a autos, sirenas y gritos indican una mezcla discordante de sonidos urbanos. El fragmento no obliga a interpretarla como una metáfora.')
    edit('v4:14','Había dos causales válidas.', alternativas=['No sé porqué razón lo hizo.','¿Por qué no viniste?','Ese es el porque de su éxito.','Ese es el porqué de su enfado.','No vino porque estaba enfermo.'])
    edit('v4:23','No hay acceso a pensamientos que justifique omnisciencia; se evalúa una atmósfera sustentada en el texto.', pregunta="Lee: 'Después de la tormenta, el campo olía a tierra mojada y a hierba recién cortada. Todo era calma'. ¿Qué atmósfera construye el fragmento?", alternativas=['Calma posterior a la tormenta','Violencia creciente','Euforia colectiva','Caos urbano','Temor a un incendio'], explicacion_respuesta="La frase 'Todo era calma' y los olores del campo construyen una atmósfera serena tras la tormenta.")
    option('v4:28',2,'Compré manzanas, peras y plátanos.','Se elimina un segundo error de puntuación.')
    option('v5:3',0,'Camino','Se sustituye una pseudopalabra que no ofrece un distractor útil.')
    option('v5:12',1,'Canto','Café y cantó cumplían simultáneamente la condición.')
    edit('v5:17','Si introduce una interrogativa indirecta, no una condición.', alternativas=['Interrogativa indirecta / Disyunción','Duda / Condición','Condición / Adversativo','Causa / Condición','Condición / Disyunción'], respuesta_correcta='A', explicacion_respuesta="'Si' introduce una interrogativa indirecta dependiente de 'no sé'; 'o' presenta las alternativas ir o quedarse. No se plantea una condición.")
    edit('v5:22','La opción marcada ya estaba bien escrita.', alternativas=['No vino a la fiesta, sino al cine.','No es grande, sino pequeño.','Sino estudias, reprobarás.','No solo canta, sino que baila.','No me gusta el frío, sino el calor.'], explicacion_respuesta="La condición negativa debe escribirse 'Si no estudias, reprobarás'. 'Sino' contrapone o añade elementos tras una negación y no reemplaza la secuencia condicional 'si no'.")
    for ref in ['v5:25','v6:23']:
        key,number=ref.split(':')
        edit(ref,'La clave corresponde a la tesis, no a un argumento de apoyo.', pregunta=data[key][1][int(number)-1]['pregunta'].replace('¿Cuál es el argumento principal?','¿Cuál es la tesis que defiende el texto?'))
    edit('v6:2','Se elimina la segunda construcción válida.', alternativas=['Estudia a fin de que apruebes.','Trabaja a fin de que tener dinero.','Estudia a fin de que apruebas.','Salí temprano a fin de que llegar puntual.','A fin de que estudiaste, aprobaste.'], explicacion_respuesta="La locución final 'a fin de que' introduce una oración con subjuntivo; 'apruebes' cumple esa condición. Los restantes ejemplos contienen errores en la construcción final.")
    edit('v6:3','La clave pasa al error inequívoco en una enumeración simple.', alternativas=['Si quieres, ven con nosotros.','Compré manzanas, peras, y bananas.','Llegó tarde; por lo tanto, no lo dejaron entrar.','El día estaba soleado y decidimos salir.','Me gusta el té, pero prefiero el café.'], respuesta_correcta='B', explicacion_respuesta="En la enumeración simple de B no corresponde una coma ante la 'y' que une el último elemento. Las otras comas delimitan una condición, un conector o una coordinación adversativa.")
    option('v6:9',4,'Sé feliz.','También se requería tilde en sé.')
    edit('v6:9','Se elimina la justificación que asumía una corrección inexistente.', explicacion_respuesta="En B, 'tú' es pronombre personal y debe llevar tilde. 'Tu' sin tilde es posesivo. El imperativo 'sé' de la alternativa E ya está correctamente tildado.")
    edit('v6:24','No había error en ríe y no era una palabra compuesta.', pregunta='¿Cuál de estos adverbios terminados en -mente presenta un error de tildación?', alternativas=['Facilmente','Rápidamente','Lentamente','Cortésmente','Hábilmente'], explicacion_respuesta="Los adverbios en -mente conservan la tilde del adjetivo base. De 'fácil' se forma 'fácilmente'; por eso A es incorrecta.")
    option('v6:28',2,'Agora','Vosotros sigue siendo de uso corriente en España.')
    edit('v6:28','Se corrige la explicación del arcaísmo.', explicacion_respuesta="'Agora', con el sentido de 'ahora', es una forma histórica en desuso en el español general actual. 'Vosotros' no es un arcaísmo: sigue vigente en variedades del español.")
    edit('v7:12','Había tres enumeraciones con el mismo error.', alternativas=['Compré pan, leche, y huevos.','Visité Madrid, París y Londres.','Era alto, delgado y simpático.','Llegué, vi y vencí.','Estudié, aprobé y celebré.'], explicacion_respuesta="En A sobra la coma ante la 'y' que precede al último elemento de una enumeración simple. B, C, D y E presentan enumeraciones correctamente puntuadas.")
    edit('v7:16','Se evita una regla absoluta sobre solo y se evalúa un error inequívoco.', pregunta='¿Cuál de estas formas verbales presenta un error de tildación?', alternativas=['Fue','Fué','Fui','Dio','Vio'], explicacion_respuesta='Fue es un monosílabo sin tilde diacrítica; la forma fué es incorrecta. No debe enseñarse que la tilde de solo sea un error universal en cualquier contexto.')
    edit('v7:19','Habían sido avisados también era un compuesto válido; se precisa haber existencial.', pregunta="¿Cuál de estas oraciones usa correctamente 'haber' con sentido existencial en un tiempo compuesto?", explicacion_respuesta="'Ha habido una reunión' mantiene en singular el auxiliar del haber impersonal. 'Habían sido avisados' es una construcción personal pasiva válida, pero no expresa existencia.")
    answer('v7:20','B','La duplicación del complemento indirecto nominal pospuesto es posible, no universalmente obligatoria.')
    edit('v7:20','Se explica la opcionalidad en este contexto.', explicacion_respuesta="Con un complemento indirecto nominal pospuesto como 'a mi hermana', el pronombre puede aparecer: 'Le compré un regalo a mi hermana'; también es posible 'Compré un regalo a mi hermana'. Hay otros contextos en que la duplicación sí es obligatoria.")
    edit('v7:22','Comprar un libro a alguien es válido; se usa un caso sin a personal.', alternativas=['Voy a visitar a mi abuela.','Conozco a María.','Busco a mi perro.','Espero a Juan.','Conozco María.'], pregunta="¿Cuál de estas oraciones omite incorrectamente la preposición 'a' ante una persona identificada?", explicacion_respuesta="Ante el complemento directo de persona identificada, se dice 'Conozco a María'. 'Comprar un libro a mi amigo' no era una prueba válida de error.")
    edit('v7:29','Estamos a una fecha es válido; se sustituye por discordancia real.', alternativas=['Estoy contento.','La casa está en la esquina.','Estamos contento.','El libro está sobre la mesa.','¿Cómo estás?'], explicacion_respuesta="'Estamos' exige un atributo plural si se refiere a varias personas: 'Estamos contentos'. La expresión 'Estamos a 20 de marzo' es válida.")
    answer('v8:14','B','La duplicación no es obligatoria con este complemento nominal pospuesto.')
    edit('v8:14','Se explica la duplicación nominal opcional.', explicacion_respuesta="Son posibles 'Les presté dinero a mis amigos' y 'Presté dinero a mis amigos'. La obligatoriedad de la duplicación depende de la estructura; no es universal.")
    edit('v8:16','Todas las opciones originales usaban subjuntivo.', alternativas=['Estudia para que apruebes.','Te lo digo para que lo sepas.','Te lo expliqué para que lo entiendes.','Trabaja para que ganes dinero.','Llamé para que viniera.'], explicacion_respuesta="La locución final 'para que' requiere subjuntivo: en C debería decir 'para que lo entiendas' o, según el contexto temporal, 'entendieras'. 'Entiendes' es indicativo.")
    edit('v8:19','Lo dije a Juan es válido; se explicita una sustitución incorrecta por género.', pregunta="Si el complemento directo es 'la carta', ¿qué oración usa incorrectamente el pronombre que lo sustituye?", alternativas=['La leí ayer.','No la encontré.','La compré para ella.','Lo envié a Juan.','La guardé en el cajón.'], explicacion_respuesta="El complemento directo 'la carta' se sustituye por 'la': 'La envié a Juan'. La oración original 'Lo dije a Juan' sí era correcta cuando 'lo' representa lo dicho.")
    option('v8:23',1,'No imaginas qué hermoso es el paisaje.','Se reemplaza una interrogativa por una exclamativa indirecta clara.')
    edit('v8:26','No hay fuente para la estadística atribuida a OMS; se usa una encuesta ficticia explícita.', pregunta="Lee este ejemplo ficticio: 'Según la encuesta del curso, el 80% de los estudiantes prefiere leer en papel'. ¿Qué información predomina?", alternativas=['Un resultado estadístico atribuido a una encuesta','Una experiencia personal','Una descripción de paisaje','Una narración de aventuras','Una instrucción'], explicacion_respuesta='El texto presenta un porcentaje y lo atribuye a una encuesta. Es un ejemplo ficticio para interpretar una estadística, sin atribuir datos sanitarios no documentados a una institución real.')
    edit('v8:30','Hay dos disyuntivas válidas; se delimita la estructura correlativa.', pregunta="¿Cuál de estas opciones presenta la estructura disyuntiva correlativa 'o... o...' completa?", respuesta_correcta='C', explicacion_respuesta="'O te vas o te quedas' presenta dos alternativas con la correlación o... o... La primera opción también contiene una disyuntiva simple, pero no la correlación solicitada.")
    edit('v9:3','Había tres opciones correctamente tildadas.', alternativas=['Yo tambien quiero ir.','Vosotros tambien venís.','Ella tambien lo sabe.','Nosotras también lo hicimos.','Él tambien es mi amigo.'], explicacion_respuesta="'También' es aguda terminada en n y lleva tilde. Solo D conserva la tilde en este conjunto de alternativas.")
    edit('v9:4','Se identifican ventanas y puertas con partes corporales mediante metáforas.', respuesta_correcta='B', explicacion_respuesta="'Ventanas, ojos cerrados' y 'puertas, bocas mudas' identifican elementos distintos sin un nexo comparativo. Son metáforas. El fragmento también personifica la casa, pero la pregunta delimita las ventanas y puertas.")
    edit('v9:6','Azúcar admite dos géneros; se emplea una discordancia real.', alternativas=['El agua fría','La mano derecha','El ala rota','El mano derecha','El hacha afilada'], explicacion_respuesta="'Mano' es femenino y se construye con 'la'. 'El mano derecha' es incorrecto. El artículo masculino ante agua, ala y hacha se debe a su inicio con a tónica y no cambia el género del sustantivo.")
    edit('v9:19','No existía uso incorrecto del gerundio; se plantea una posterioridad inequívoca.', alternativas=['Salió corriendo.','Está lloviendo.','Vino diciendo mentiras.','Nació en 1980, graduándose veinte años después.','El agua estuvo hirviendo.'], explicacion_respuesta="D usa el gerundio para un evento independiente ocurrido veinte años después. Se debe coordinar: 'Nació en 1980 y se graduó veinte años después'. Las otras formas expresan simultaneidad o una perífrasis.")
    edit('v9:22','Se delimita no solo... sino que para eliminar varias respuestas válidas.', pregunta="¿Cuál de estas oraciones contiene correctamente la correlación aditiva 'no solo... sino que...'?")
    edit('v9:26','Había varios prefijos bien escritos; se delimita ante-.', pregunta="¿Cuál de estas palabras está correctamente formada con el prefijo 'ante-'?", explicacion_respuesta="'Anteayer' se forma con ante- y ayer. El enunciado delimita el prefijo; no afirma que las otras palabras bien formadas sean incorrectas.")
    option('v9:27',2,'Se pidió lo siguiente: silencio y atención.','Se elimina otro caso de dos puntos entre verbo y complemento.')
    edit('v10:4','El fragmento no limita el narrador a una sola conciencia; se pregunta por información explícita.', pregunta="Lee: 'El tren partió con retraso. Los pasajeros, impacientes, miraban el reloj. Finalmente, el silbato anunció la salida'. ¿Qué anunció la salida?", alternativas=['El reloj','Los pasajeros','Un anuncio escrito','El silbato','El conductor'], explicacion_respuesta="La última oración indica explícitamente que el silbato anunció la salida.")
    option('v10:10',0,'Sombrío y triste','Se elimina una definición circular que repetía la palabra preguntada.')
    edit('v10:14','Se elimina la repetición de caza y se especifica seseo chileno.', pregunta="En la pronunciación seseante habitual en Chile, ¿qué palabra distinta de 'casa' es homófona de ella?", alternativas=['Caza','Cosa','Mesa','Caso','Capa'], explicacion_respuesta="En variedades seseantes, 'caza' y 'casa' se pronuncian igual aunque tienen distinta escritura y significado. No son homófonas en todas las variedades del español.")
    edit('v10:20','Se precisa sí como adverbio, no como sustantivo.', pregunta="¿Dónde aparece 'sí' correctamente tildado como adverbio de afirmación?", explicacion_respuesta="En B, 'sí' afirma la aceptación. En 'El sí de las niñas', sí es un sustantivo también correctamente tildado, pero no cumple la categoría pedida.")
    option('v10:30',0,'Él fué el ganador.','Todas las opciones originales escribían fue correctamente.')
    edit('v10:30','Se proporciona el error que la pregunta pide encontrar.', explicacion_respuesta="La forma 'fue' es monosílaba y no lleva tilde. Por eso 'fué' en A es incorrecta; las otras formas están bien escritas.")
    edit('v11:6','Se reconstruyen opciones sin repeticiones.', pregunta="¿Qué palabra designa un recipiente para beber y se escribe con 'v'?", alternativas=['Vaso','Beso','Bazo','Paso','Caso'], explicacion_respuesta="'Vaso' designa el recipiente para beber y se escribe con v. 'Bazo' es un órgano, y las otras palabras tienen significados diferentes.")
    edit('v11:21','La confusión a ver/haber estaba en E, no en D.', respuesta_correcta='E', explicacion_respuesta="En E, el sentido es existencial: 'No sé si va a haber comida'. D contiene un error distinto de concordancia: 'Va a haber muchos problemas'.")
    option('v11:23',0,'Afirmación','Más es adverbio de cantidad, no una categoría comparación separada.')
    answer('v11:23','B')
    edit('v12:6','Se retira la repetición y se pregunta por la escritura completa.', pregunta="¿Cuál es la escritura correcta de la palabra que designa el residuo de una combustión?", alternativas=['Ceniza','Seniza','Cenisa','Senisa','Ceníza'], explicacion_respuesta="'Ceniza' se escribe con c y z y no lleva tilde porque es llana terminada en vocal.")
    option('v12:13',2,'Espero que viene mañana.','Tal vez admite indicativo y subjuntivo; no es un error por sí solo.')
    edit('v12:13','Se justifica el error real de selección de modo.', explicacion_respuesta="Con 'espero que' referido a un deseo se requiere subjuntivo: 'Espero que venga mañana'. 'Tal vez viene mañana' no justificaba afirmar un error universal.")
    edit('v12:25','El leísmo de persona masculina singular puede estar admitido; se explicita referente femenino.', pregunta="Si 'le' se refiere a María, ¿qué oración lo usa incorrectamente para sustituir un complemento directo femenino?", explicacion_respuesta="Para un complemento directo femenino se usa 'la': 'La vi ayer'. En A, C, D y E, le puede sustituir al complemento indirecto de María. El leísmo de persona masculina singular no era una prueba inequívoca de incorrección.")
    edit('v13:29','Ciudad contiene dos vocales cerradas; no ejemplifica cerrada+abierta.', alternativas=['Tierra','Causa','Reír','País','Día'], explicacion_respuesta="'Tierra' contiene ie, vocal cerrada átona seguida de vocal abierta tónica, en una misma sílaba: tie-rra. Causa tiene diptongo decreciente y reír, país y día contienen hiatos.")
    edit('v13:36','La elipsis del verbo no era un error; se plantea una oposición real también/tampoco.', alternativas=['Yo también quiero ir.','Ella no vino; él tampoco.','Si tú no vas, yo tampoco.','Yo sí quiero ir; mi hermana tampoco quiere ir.','También yo fui al cine.'], explicacion_respuesta="Tampoco añade una negación a otra anterior. En D, la primera parte es afirmativa; para oponer la negativa corresponde 'mi hermana no quiere ir'. La elipsis en 'No me gusta el frío, tampoco el calor' no era por sí sola un error.")
    edit('v13:48','Se explicita recipiente y se reconstruye un distractor repetido.', pregunta="¿Cuál es la escritura correcta de la palabra que designa el recipiente para beber?", alternativas=['Baso','Vaso','Bazo','Vazo','Vasó'], explicacion_respuesta="'Vaso' es el recipiente. 'Baso' es una forma de basar y 'bazo' designa un órgano; no deben describirse como palabras inexistentes.")
    edit('v15:21','Se explicita sufragio y se eliminan opciones duplicadas.', pregunta="¿Cuál es la escritura correcta del verbo que significa emitir un sufragio?", alternativas=['Botar','Votar','Votár','Vottar','Bottar'], explicacion_respuesta="'Votar' significa emitir un sufragio y se escribe con v. 'Botar' es otra palabra válida con distinto significado. Las restantes grafías no corresponden al verbo solicitado.")
    option('v16:10',4,'Juan el médico me, atendió.','Se sustituye la repetición exacta de un distractor.')
    for ref, updates in {
        'v17:3':{4:'Cálla te'},'v17:6':{4:'Hàbil'},'v17:14':{4:'Tambíén'},
        'v17:24':{4:'Córtes'},'v17:28':{3:'Fácíl'},'v17:32':{4:'Cántaró'},
        'v17:36':{3:'Pájaró'},'v17:40':{4:'Teléfonó'},'v17:44':{3:'Lídér',4:'Lìder'},
    }.items():
        for index,text in updates.items(): option(ref,index,text,'Se elimina una alternativa repetida en el ejercicio de tildación.')

    # Additional ambiguous items stay unpublished, with a precise reason.
    unresolved = {
        'v1:17':'Varias oraciones usan sino correctamente y otra usa si no; la clave todas no responde a la categoría solicitada.',
        'v1:23':'Salgamos puede analizarse como presente de subjuntivo con valor exhortativo; opciones de modo y función se solapan.',
        'v2:4':'Varias opciones incluyen pronombres indirectos correctamente usados; falta delimitar la aparición evaluada.',
        'v3:26':'Llueve mucho y la exclamación pueden clasificarse como unimembres según el marco gramatical.',
        'v5:5':'Trasporte también es variante admitida; no hay una única palabra bien escrita.',
        'v5:8':'Ven, vení y venga son imperativos válidos para distintos tratamientos; falta especificar destinatario.',
        'v5:15':'El fragmento no obliga a interpretar una paradoja; requiere replantear el objetivo de lectura.',
        'v5:18':'La idea principal no está sintetizada por ninguna opción: adaptación de TV al cambio de hábitos juveniles.',
        'v6:12':'Habrá personas y haber problemas son usos existenciales correctos.',
        'v6:26':'No hay una elipsis inequívoca que permita distinguir las opciones.',
        'v6:27':'La norma actual no permite marcar deber de obligación como error universal sin contexto.',
        'v8:1':'El fragmento admite análisis de comparación y metáfora; requiere delimitar qué relación se evalúa.',
        'v8:28':'Analogía y metáfora se superponen en las opciones para este fragmento.',
        'v9:10':'Analogía y símil se solapan; no hay una respuesta exclusiva con el enunciado actual.',
        'v9:15':'Servicio y casa contienen c; falta delimitar el significado o la palabra buscada.',
        'v9:16':'Llueve mucho también puede clasificarse como unimembre; el marco de análisis no está indicado.',
        'v10:9':'Varias alternativas pueden representar posterioridad; hay que distinguir consecuencia inmediata de evento independiente.',
        'v11:3':'Caracter y carácteres contienen errores distintos; falta delimitar singular/plural.',
        'v11:4':'Metáfora y paradoja son defendibles con sueño despierto; se necesita reformular la tarea.',
        'v11:20':'Analogía y símil se superponen en el fragmento.',
        'v12:8':'La vanidad y la soledad del poder no se distinguen inequívocamente en el fragmento.',
        'v12:16':'Varias opciones describen paso del tiempo, envejecimiento e identidad; falta una inferencia única.',
        'v12:17':'Más de una construcción con punto y coma puede ser válida; el contexto es insuficiente.',
        'v12:22':'Un aviso de empleo no es necesariamente instructivo sin su contenido.',
        'v12:28':'La pobreza descrita puede ser literal, no necesariamente hipérbole.',
        'v13:6':'Baca, bello y bien se escriben con b; no hay opción única.',
        'v13:15':'La función del lenguaje en un diálogo teatral depende del fragmento, que no se proporciona.',
        'v13:18':'B y E confunden a ver y haber; hay dos errores.',
        'v13:25':'Conque se usa como causal en varias opciones; requiere una consecuencia inequívoca.',
        'v13:27':'Se miraron admite interpretación reflexiva y recíproca sin más contexto.',
        'v13:33':'C tiene además error de persona; no demuestra la diferencia de aspecto solicitada.',
        'v13:40':'A y C usan solo sin tilde como adverbio; hay dos respuestas válidas.',
        'v13:41':'Llegaste puede solicitar información o mantener contacto; falta contexto comunicativo.',
        'v13:44':'El enunciado invierte deber/deber de y la norma admite usos que la explicación rechaza.',
        'v13:47':'Una afirmación aislada no permite distinguir texto expositivo de argumentativo.',
        'v14:3':'C y E usan mí correctamente como pronombre.',
        'v14:16':'La comparación con como y la personificación pueden coexistir; falta delimitar.',
        'v14:25':'A y C usan sino correctamente.',
        'v14:37':'El sentido consecutivo de conque no está claramente separado del causal.',
        'v14:43':'Analogía y símil son respuestas solapadas.',
        'v14:44':'La pregunta dice número, pero el error no es de número: es el artículo ante a tónica.',
        'v15:10':'A y D puntúan correctamente el vocativo.',
        'v15:17':'A, B y E son construcciones concesivas válidas.',
        'v15:22':'B y E contienen interrogativas indirectas.',
        'v15:25':'El uso consecutivo de conque requiere reformulación; no se justifica la clave por descarte.',
        'v15:29':'Según mi opinión y según el pronóstico pueden ser válidos.',
        'v15:33':'A y D usan sino correctamente.',
        'v15:41':'A y E pueden puntuar correctamente la enumeración compleja.',
        'v15:50':'Felices es predicativo subjetivo opcional, no obligatorio; falta la opción correcta.',
        'v16:3':'D y E escriben él correctamente como pronombre.',
        'v16:6':'B y C escriben té bebida correctamente; B tiene otro error que el enunciado no pregunta.',
        'v16:12':'Peinarse puede ser reflexivo o recíproco en plural sin contexto.',
        'v16:17':'Aun así significa pese a eso, no incluso; no aparece una opción inequívoca con el sentido pedido.',
        'v16:20':'Analogía y símil se superponen en este fragmento.',
        'v16:34':'Densidad del silencio permite varias lecturas figuradas; no hay respuesta exclusiva.',
        'v16:47':'Ojalá y que llueva pueden expresar deseo; hay dos respuestas.',
        'v17:9':'Un discurso de despedida no es necesariamente argumentativo; falta el contenido.',
        'v17:17':'Varias opciones usan hay; otra usa ay. Todas no resuelve la pregunta sobre hay.',
        'v17:27':'La atribución de una bofetada al silencio puede ser metáfora; sinestesia no es exclusiva.',
    }

    for ref in ['m3:3','m3:43','m6:6','m8:16','m11:1','m11:15','m13:15','m13:28','v6:7']:
        edit(ref, 'Se verifica independientemente la clave conservada; el conflicto original de claves queda resuelto.')
    option('m10:33', 4, '−2x/√(1−x⁴)')

    # Finish decisions, deduplicate literal alternatives and remap the answer.
    decisions=[]
    with zipfile.ZipFile(SNAPSHOT,'w',zipfile.ZIP_DEFLATED) as z:
        for key,(path,_) in originals.items(): z.write(path,path.name)
    for key,(path,questions) in data.items():
        for index,q in enumerate(questions,1):
            ref=f'{key}:{index}'
            original=originals[key][1][index-1]
            answer_text=q['alternativas'][ord(q['respuesta_correcta'])-65]
            distinct=list(dict.fromkeys(q['alternativas']))
            if len(distinct)!=len(q['alternativas']) and len(distinct)>=4:
                q['alternativas']=distinct
                q['respuesta_correcta']=chr(65+distinct.index(answer_text))
                notes.setdefault(ref,[]).append('Se retiran alternativas literalmente repetidas y se remapea la clave conservando su texto.')
                approved.add(ref)
            if ref in approved or original['estado_revision']=='lista':
                q['estado_revision']='lista'
                q.pop('motivos_revision',None)
            if ref in unresolved:
                q['estado_revision']='pendiente'
                q['motivos_revision']=[unresolved[ref]]
            if len(set(q['alternativas']))!=len(q['alternativas']) or len(q['alternativas'])<4:
                q['estado_revision']='pendiente'
                q['motivos_revision']=['Persisten alternativas repetidas o menos de cuatro opciones distintas; requiere edición de distractores.']
            # Calculus, complex arithmetic, matrices are retained as supplementary material.
            if key.startswith('m') and outside_math(q):
                q['uso_pedagogico']='complementario'
                q['motivo_alcance']='Cálculo, álgebra de complejos, matrices o vectores avanzados no pertenecen al temario M1/M2 consultado.'
            elif key.startswith('v') and (re.search(r'ortograf|tilde|acentua|sintáct|gramat|pronombre|sustantivo|verbo|adjetivo|predicativo|vocativo|concordancia|punto y coma|escritura correcta',q['pregunta'],re.I) or not re.search(r"Lee |texto:|fragmento:|frase:|enunciado:|contextual|significado.*frase|texto argumentativo:",q['pregunta'],re.I)):
                q['uso_pedagogico']='complementario'
                q['motivo_alcance']='Ejercicio aislado de gramática, ortografía, terminología o cultura literaria; no evalúa una tarea de lectura de un texto.'
            else:
                q['uso_pedagogico']='practica'
                q.pop('motivo_alcance',None)
            if key.startswith('m'):
                advanced=bool(re.search(r'log|ln\b|sen|cos|tan|interés|capital|invierte|invers|perpendicular|paralela|pendiente|recta|esfera|varianza|desviación|combin|permut|progresión|\bPG\b|\bPA\b',q['pregunta'],re.I))
                q['prueba']='m2' if advanced else 'm1'
            elif key.startswith('b'): q['prueba']='cien'
            else: q['prueba']='lectora'
            q['revision_contenido']={'fecha':DATE,'version':1,'alcance':'Revisión editorial del enunciado, clave, alternativas y coherencia; no certifica origen DEMRE ni calibración psicométrica.'}
            changes={k:{'antes':original.get(k),'despues':q.get(k)} for k in set(original)|set(q) if original.get(k)!=q.get(k)}
            decisions.append({'id_revision':ref,'archivo':path.name,'numero':index,'pregunta':q['pregunta'],'estado_anterior':original['estado_revision'],'estado':q['estado_revision'],'uso':q['uso_pedagogico'],'prueba':q['prueba'],'notas':notes.get(ref,[]),'motivos_pendientes':q.get('motivos_revision',[]),'cambios':changes})
        path.write_text(json.dumps(questions,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    summary={'total':len(decisions),'correcciones_editoriales':len(notes),'pendientes':sum(d['estado']=='pendiente' for d in decisions),'complementarias':sum(d['uso']=='complementario' for d in decisions),'habilitables':sum(d['uso']=='practica' and d['estado']=='lista' for d in decisions),'pendientes_iniciales_revisadas':sum(d['estado_anterior']=='pendiente' for d in decisions)}
    (OUT/'revision_contenido.json').write_text(json.dumps({'fecha':DATE,'fuentes':SOURCES,'resumen':summary,'preguntas':decisions},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summary,ensure_ascii=False))

if __name__=='__main__': main()
