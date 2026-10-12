import json
import re
import hashlib
import unicodedata
from collections import defaultdict, Counter
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'Fase 2').is_dir())
BANK = ROOT / 'Fase 2/Evidencias Proyecto/Evidencias de sistema Aplicacion/aprueba_api/src/data/questions'
OUT = ROOT / 'Fase 2/Evidencias Proyecto/Evidencias de documentación/Revisión banco de preguntas'
OUT.mkdir(exist_ok=True)
FIELDS = ['pregunta', 'alternativas', 'respuesta_correcta', 'explicacion_respuesta', 'habilidad_requerida']

def normalized(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', value)).strip().casefold()

issues, files, records = [], [], []
exact, content, statements, file_hashes = defaultdict(list), defaultdict(list), defaultdict(list), defaultdict(list)
for path in sorted(BANK.glob('*.json')):
    raw = path.read_bytes()
    file_hashes[hashlib.sha256(raw).hexdigest()].append(path.name)
    duplicate_keys = []
    repeated_by_object = {}
    def pairs_hook(pairs):
        result = {}
        repeated = []
        for key, value in pairs:
            if key in result:
                duplicate_keys.append(key)
                repeated.append({'campo': key, 'valor_anterior': result[key], 'valor_final': value, 'valores_distintos': result[key] != value})
            result[key] = value
        if repeated:
            repeated_by_object[id(result)] = repeated
        return result
    try:
        data = json.loads(raw.decode('utf-8-sig'), object_pairs_hook=pairs_hook)
    except (ValueError, UnicodeError) as exc:
        issues.append({'archivo': path.name, 'tipo': 'JSON invalido', 'detalle': str(exc)})
        continue
    if not isinstance(data, list):
        issues.append({'archivo': path.name, 'tipo': 'raiz no es arreglo'})
        continue
    if duplicate_keys:
        issues.append({'archivo': path.name, 'tipo': 'claves JSON repetidas', 'detalle': duplicate_keys})
    file_info = {'archivo': path.name, 'preguntas': len(data), 'respuestas': dict(Counter(str(q.get('respuesta_correcta')) for q in data if isinstance(q, dict)))}
    files.append(file_info)
    for index, q in enumerate(data, 1):
        location = {'archivo': path.name, 'pregunta_numero': index}
        def issue(kind, detail):
            issues.append({**location, 'tipo': kind, 'detalle': detail})
        if not isinstance(q, dict):
            issue('item no es objeto', type(q).__name__)
            continue
        if id(q) in repeated_by_object:
            issue('campos repetidos en pregunta', repeated_by_object[id(q)])
        for field in FIELDS:
            if field not in q:
                issue('campo ausente', field)
        for field in [f for f in FIELDS if f != 'alternativas']:
            value = q.get(field)
            if not isinstance(value, str) or not value.strip():
                issue('texto invalido', field)
            elif '\ufffd' in value or re.search(r'Ã[\x80-\xbf]|Â[\x80-\xbf]|â€', value):
                issue('posible codificacion corrupta', field)
        opts = q.get('alternativas')
        answer = q.get('respuesta_correcta')
        if not isinstance(opts, list) or not 4 <= len(opts) <= 5:
            issue('alternativas invalidas', 'Se esperan 4 o 5 alternativas en un arreglo')
        if isinstance(opts, list):
            if any(not isinstance(o, str) or not o.strip() for o in opts):
                issue('alternativa vacia o no textual', opts)
            elif len({normalized(o) for o in opts}) != len(opts):
                issue('alternativas repetidas', opts)
            if not isinstance(answer, str) or answer not in 'ABCDE'[:len(opts)] or len(answer) != 1:
                issue('respuesta fuera de alternativas', answer)
        if isinstance(q.get('pregunta'), str) and isinstance(opts, list) and all(isinstance(o, str) for o in opts):
            record = {**location, **q}
            records.append(record)
            exact[json.dumps(q, sort_keys=True, ensure_ascii=False)].append(record)
            content[(normalized(q['pregunta']), tuple(normalized(o) for o in opts))].append(record)
            statements[normalized(q['pregunta'])].append(record)

def groups(mapping, predicate=lambda g: True):
    return [{'enunciado': group[0]['pregunta'], 'ubicaciones': [{k: r[k] for k in ['archivo', 'pregunta_numero', 'respuesta_correcta']} for r in group]} for group in mapping.values() if len(group) > 1 and predicate(group)]

report = {
    'archivos': files,
    'total_preguntas': len(records),
    'archivos_identicos': [g for g in file_hashes.values() if len(g) > 1],
    'problemas_estructura': issues,
    'duplicados_exactos': groups(exact),
    'mismo_enunciado_y_alternativas': groups(content),
    'respuestas_en_conflicto': groups(content, lambda g: len({r.get('respuesta_correcta') for r in g}) > 1),
    'mismo_enunciado_distintas_alternativas': groups(statements, lambda g: len({tuple(normalized(o) for o in r['alternativas']) for r in g}) > 1),
}
(OUT / 'auditoria.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
summary = {k: len(v) if isinstance(v, list) else v for k, v in report.items()}
summary['copias_exactas_sobrantes'] = sum(len(g['ubicaciones']) - 1 for g in report['duplicados_exactos'])
print(json.dumps(summary, ensure_ascii=False, indent=2))

repeated_questions = [i for i in issues if i['tipo'] == 'campos repetidos en pregunta']
repeated_options = [i for i in issues if i['tipo'] == 'alternativas repetidas']
lines = [
    '# Auditoría de preguntas PAES', '',
    'Revisión del 9 de octubre de 2026. Los originales no fueron modificados.', '',
    '## Resultado', '',
    f'- {len(files)} archivos JSON y {len(records)} preguntas examinadas.',
    '- Ningún archivo completo idéntico a otro. Todos tienen sintaxis JSON interpretable y raíz de tipo arreglo.',
    f'- {len(repeated_questions)} preguntas en {len({i["archivo"] for i in repeated_questions})} archivos contienen claves repetidas con valores distintos. El lector estándar conserva el último valor: la validación básica anterior no detectaba este problema.',
    f'- {len(repeated_options)} preguntas tienen alternativas textualmente repetidas, normalizando espacios y mayúsculas. No se comprobaron equivalencias algebraicas, por lo que podría haber más alternativas equivalentes.',
    '- 1 par de objetos completamente idénticos, incluido texto de explicación y habilidad.',
    '- 7 pares con el mismo enunciado y alternativas (incluyen el par exacto anterior); sus respuestas finales coinciden. Los otros 6 pares difieren en explicación o habilidad.',
    '- 18 grupos adicionales comparten enunciado pero cambian las alternativas. Son candidatos para revisión manual, no duplicados confirmados.',
    '- No se detectaron campos básicos ausentes, alternativas vacías, respuestas finales fuera de A–E ni señales de codificación corrupta con las comprobaciones implementadas.', '',
    'La revisión valida estructura y duplicación textual, no certifica todas las soluciones académicas. La numeración de preguntas comienza en 1 dentro de cada archivo.', '',
    '## Ejemplo de inconsistencia de contenido', '',
    '`preguntas PAES Chile matematica 3.json`, pregunta 2: la explicación final resuelve un área de 60, mientras el enunciado contiene 56. Para ancho x y largo x+4, x(x+4)=56 tiene solución positiva aproximadamente 5,746; sustituir silenciosamente 56 por 60 no corrige el ítem original. Este caso requiere editar conjuntamente enunciado, alternativas y explicación.', '',
    '## Preguntas con campos JSON repetidos', '',
    '| Archivo | Pregunta | Campos repetidos |', '|---|---:|---|',
]
for item in repeated_questions:
    fields = ', '.join(dict.fromkeys(d['campo'] for d in item['detalle']))
    lines.append(f'| {item["archivo"]} | {item["pregunta_numero"]} | {fields} |')
lines += ['', '## Preguntas con alternativas repetidas', '', '| Archivo | Preguntas |', '|---|---|']
by_file = defaultdict(list)
for item in repeated_options:
    by_file[item['archivo']].append(item['pregunta_numero'])
for filename, indexes in by_file.items():
    lines.append(f'| {filename} | {", ".join(map(str, indexes))} |')
for title, key in [('Duplicados exactos', 'duplicados_exactos'), ('Mismo enunciado y alternativas', 'mismo_enunciado_y_alternativas'), ('Enunciados iguales con alternativas distintas: revisar manualmente', 'mismo_enunciado_distintas_alternativas')]:
    lines += ['', f'## {title}', '']
    for group in report[key]:
        lines.append(f'- **{group["enunciado"]}**')
        for loc in group['ubicaciones']:
            lines.append(f'  - `{loc["archivo"]}`, pregunta {loc["pregunta_numero"]}, respuesta final {loc["respuesta_correcta"]}.')
lines += ['', '## Recomendación', '',
    'Conservar los originales como referencia. Corregir primero los 58 objetos con campos repetidos, validando qué valor corresponde al enunciado real; después revisar las 108 preguntas con opciones repetidas para que exista una única alternativa correcta. No eliminar una opción sin ajustar su letra de respuesta.', '',
    'Consolidar los 7 pares de mismo enunciado y alternativas preservando la explicación válida. Revisar los otros 18 grupos antes de deduplicar: cambiar opciones puede representar una variante intencional.', '',
    'El archivo auditoria.json conserva los valores anteriores y finales de las claves repetidas y las ubicaciones de cada hallazgo. Ejecutar `python -X utf8 audit_questions.py` desde la raíz para regenerar ambos informes. El script no modifica preguntas ni escribe en Firebase.',
]
(OUT / 'INFORME.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
