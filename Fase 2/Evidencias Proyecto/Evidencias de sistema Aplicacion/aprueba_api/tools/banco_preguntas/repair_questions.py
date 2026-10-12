"""Canonicalize JSON without inventing answers; retain ambiguous items for review."""
import hashlib
import json
import re
import zipfile
from pathlib import Path
import unicodedata

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'Fase 2').is_dir())
BANK = ROOT / 'Fase 2/Evidencias Proyecto/Evidencias de sistema Aplicacion/aprueba_api/src/data/questions'
OUT = ROOT / 'Fase 2/Evidencias Proyecto/Evidencias de documentación/Revisión banco de preguntas'
OUT.mkdir(exist_ok=True)
BACKUP = OUT / 'preguntas_originales.zip'
paths = sorted(BANK.glob('*.json'))
if (OUT / 'reparacion.json').exists() and all(all('estado_revision' in q for q in json.loads(p.read_text(encoding='utf-8-sig'))) for p in paths):
    print('El banco ya está normalizado; se conservan el respaldo y la auditoría originales.')
    raise SystemExit(0)
if not BACKUP.exists():
    with zipfile.ZipFile(BACKUP, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in paths:
            archive.write(path, path.name)

def norm(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', text)).strip().casefold()

seen = {}
changes = []
counts = {'originales': 0, 'conservadas': 0, 'listas': 0, 'pendientes': 0, 'duplicadas_retiradas': 0}
for path in paths:
    conflicts = {}
    def hook(pairs):
        obj, repeated = {}, []
        for key, value in pairs:
            if key in obj:
                repeated.append({'campo': key, 'anterior': obj[key], 'final': value})
            obj[key] = value
        if repeated:
            conflicts[id(obj)] = repeated
        return obj
    data = json.loads(path.read_text(encoding='utf-8-sig'), object_pairs_hook=hook)
    cleaned = []
    for index, q in enumerate(data, 1):
        counts['originales'] += 1
        reasons = list(q.get('motivos_revision', []))
        repeated = conflicts.get(id(q), [])
        if repeated:
            reasons.append('El original tenía campos repetidos con valores distintos; revisar la solución antes de publicar.')
        options = q['alternativas']
        if len(set(map(norm, options))) != len(options):
            reasons.append('Hay alternativas textualmente repetidas; revisar distractores y respuesta.')
        if path.name == 'preguntas PAES Chile matematica 3.json' and index == 2:
            reasons.append('El enunciado usa un área de 56 m² y la explicación resuelve 60 m².')
        key = (norm(q['pregunta']), tuple(map(norm, options)))
        loc = {'archivo': path.name, 'numero_original': index}
        if key in seen:
            first = seen[key]
            if q['respuesta_correcta'] == first['respuesta']:
                changes.append({**loc, 'accion': 'duplicado retirado', 'conservado_en': first['ubicacion']})
                counts['duplicadas_retiradas'] += 1
                continue
            reasons.append('Respuesta distinta en otro ítem con el mismo enunciado y alternativas.')
        else:
            seen[key] = {'respuesta': q['respuesta_correcta'], 'ubicacion': loc}
        q['estado_revision'] = 'pendiente' if reasons else 'lista'
        if reasons:
            q['motivos_revision'] = list(dict.fromkeys(reasons))
            changes.append({**loc, 'accion': 'pendiente de revisión', 'motivos': q['motivos_revision'], 'campos_originales_repetidos': repeated})
            counts['pendientes'] += 1
        else:
            counts['listas'] += 1
        cleaned.append(q)
        counts['conservadas'] += 1
    path.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

(OUT / 'reparacion.json').write_text(json.dumps({'resumen': counts, 'cambios': changes}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(OUT / 'REPARACION.md').write_text(
    '# Limpieza del banco de preguntas\n\n'
    'Los originales están en preguntas_originales.zip. Los JSON actuales usan formato UTF-8 uniforme, sin claves repetidas.\n\n'
    + '\n'.join(f'- {key}: {value}' for key, value in counts.items())
    + '\n\nLos ítems con campos conflictivos o alternativas repetidas conservan el último valor que utilizaba el lector original, '
    'pero están marcados como pendientes y no se publican en la práctica. No se inventaron respuestas ni distractores. '
    'El archivo reparacion.json conserva motivos, ubicaciones originales y valores conflictivos. '
    'Los enunciados iguales con alternativas distintas se conservan como variantes.\n\n'
    '«Lista» indica que superó estas comprobaciones estructurales; no certifica corrección académica ni origen DEMRE. '
    'Para aprobar un ítem pendiente hay que validar enunciado, alternativas y solución; cambiar estado_revision a lista y retirar motivos_revision solo tras esa revisión.\n',
    encoding='utf-8',
)
print(json.dumps(counts, ensure_ascii=False))
