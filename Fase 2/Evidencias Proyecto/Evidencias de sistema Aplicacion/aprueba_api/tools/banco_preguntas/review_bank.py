"""Read-only review helpers. Editorial decisions live in review_bank_edits.py."""
import json
import re
import sys
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'Fase 2').is_dir())
BANK = ROOT / 'Fase 2/Evidencias Proyecto/Evidencias de sistema Aplicacion/aprueba_api/src/data/questions'

def code(path):
    name = path.stem.lower()
    subject = 'm' if 'matematic' in name else 'b' if 'biologia' in name else 'v'
    return subject + re.search(r'\d+', name).group()

def bank():
    return {code(p): (p, json.loads(p.read_text(encoding='utf-8'))) for p in BANK.glob('*.json')}

def outside_math(q):
    s = q['pregunta'] + ' ' + q['explicacion_respuesta']
    return bool(re.search(r'derivad|integral|∫|f\s*\x27|límite|lim_|convergencia|producto escalar|producto cruz|determinante|matriz|complej|\bi\b|R³|recta tangente|costo marginal|elipse|hipérbola|focos de|tridimensional|arcsen|arccos|arctan|ley del coseno|ley del seno|parábola.*foco|módulo del vector', s, re.I) or re.search(r'\([-\d\s]+,[-\d\s]+,[-\d\s]+\)',q['pregunta']))

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    mode = sys.argv[1]
    for target in sys.argv[2:]:
        parts = target.split(':')
        key = parts[0]
        first = int(parts[1]) if len(parts) > 1 else 1
        last = int(parts[2]) if len(parts) > 2 else 10000
        path, data = bank()[key]
        print('\nFILE', key, path.name)
        for i, q in enumerate(data, 1):
            if not first <= i <= last:
                continue
            if mode == 'math' and outside_math(q):
                continue
            print(f"{key}:{i}", q['pregunta'])
            print(json.dumps(q['alternativas'], ensure_ascii=False), q['respuesta_correcta'])
            if mode != 'stems':
                print('SOL:', q['explicacion_respuesta'])
