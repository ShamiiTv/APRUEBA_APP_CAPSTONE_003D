"""Final editorial checks, with changes appended to the existing review history."""
import json
from review_bank import ROOT, bank, outside_math

report_path=ROOT/'Fase 2/Evidencias Proyecto/Evidencias de documentación/Revisión banco de preguntas/revision_contenido.json'
report=json.loads(report_path.read_text(encoding='utf-8'))
decisions={r['id_revision']:r for r in report['preguntas']}
data=bank()
updates={
    'v3:15': {'pregunta': "Lee el texto: 'El candidato prometió bajar los impuestos, pero después de las elecciones hizo todo lo contrario.' ¿Qué relación existe entre su promesa y su actuación posterior?", 'alternativas':['Contradicción entre lo prometido y lo realizado','Cumplimiento de lo prometido','Explicación de las razones del cambio','Repetición de una misma conducta','Comparación entre dos candidatos'], 'respuesta_correcta':'A', 'explicacion_respuesta':'La promesa era bajar los impuestos y la actuación fue hacer lo contrario. El conector pero introduce el contraste. El fragmento no permite afirmar que el candidato hablara con intención irónica.', 'habilidad_requerida':'Interpretar la relación entre dos afirmaciones de un texto e identificar la oposición señalada por un conector.'},
    'm9:29': {},
    'm9:42': {},
    'm12:36': {'alternativas':['−4 cos(2x) sen(2x)','−2 cos(2x)','−4 sen²(2x)','−2 sen(2x)','−sen(4x)']},
    'm10:27': {'alternativas':['e^(x²)(2x ln(x)+1/x)','e^(x²)(2x ln(x)−1/x)','e^(x²)(x ln(x)+1/x)','e^(x²)(2x+1/x)']},
    'm12:21': {'alternativas':['2/(1+(2x+1)²)','−2/(1+(2x+1)²)','1/(1+(2x+1)²)','2/(1+2x+1)']},
    'm7:35': {'alternativas':['e^x/(1+e^x)','1/(1+e^x)','−e^x/(1+e^x)','e^x/(1−e^x)']},
    'm9:45': {'alternativas':['6 tan²(2x) sec²(2x)','3 tan²(2x) sec²(2x)','2 tan²(2x) sec²(2x)','6 tan(2x) sec²(2x)']},
    'm6:19': {'alternativas':['x²/2 + 2x + C','x²/2 + 2 ln|x| + C','x + 2 + C','x²/2 − 2x + C','x² + 2 ln|x| + C']},
    'm4:20': {'alternativas':['3 ln|x| + C','ln|x| + C','−3 ln|x| + C','3/x² + C']},
    'm8:4': {'alternativas':['xe^{3x}(2+3x)','2xe^{3x}','3x²e^{3x}','xe^{3x}(3x−2)','x²e^{3x}(2+3x)']},
}
for ref,fields in updates.items():
    key,index=ref.split(':'); q=data[key][1][int(index)-1]; r=decisions[ref]
    fields={**fields,'estado_revision':'lista'}
    for field,value in fields.items():
        if q.get(field)==value: continue
        before=r['cambios'].get(field,{}).get('antes',q.get(field))
        r['cambios'][field]={'antes':before,'despues':value}; q[field]=value
    if 'motivos_revision' in q:
        before=r['cambios'].get('motivos_revision',{}).get('antes',q['motivos_revision'])
        r['cambios']['motivos_revision']={'antes':before,'despues':None}
        q.pop('motivos_revision')
    r['notas'].append('Comprobación final: clave verificada independientemente y alternativas distintas.')
    r['estado']='lista'; r['motivos_pendientes']=[]
for key,(_,questions) in data.items():
    for index,q in enumerate(questions,1):
        if not key.startswith('m') or not outside_math(q) or q['uso_pedagogico']=='complementario': continue
        r=decisions[f'{key}:{index}']
        for field,value in {'uso_pedagogico':'complementario','motivo_alcance':'Contenido de cálculo, complejos, matrices, geometría analítica de cónicas, trigonometría inversa o vectores avanzados fuera del temario M1/M2 consultado.'}.items():
            before=r['cambios'].get(field,{}).get('antes',q.get(field))
            r['cambios'][field]={'antes':before,'despues':value}; q[field]=value
        r['uso']='complementario'
        r['notas'].append('Se excluye de práctica PAES por alcance curricular, conservando el ejercicio como material complementario.')
for path,questions in data.values():
    path.write_text(json.dumps(questions,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
rs=report['preguntas']
for r in rs: r['notas']=list(dict.fromkeys(r['notas']))
report['resumen']={'total':len(rs),'correcciones_editoriales':sum(bool(r['notas']) for r in rs),'pendientes':sum(r['estado']=='pendiente' for r in rs),'complementarias':sum(r['uso']=='complementario' for r in rs),'habilitables':sum(r['uso']=='practica' and r['estado']=='lista' for r in rs),'pendientes_iniciales_revisadas':sum(r['estado_anterior']=='pendiente' for r in rs),'preguntas_con_contenido_corregido':sum(any(k in r['cambios'] for k in ['pregunta','alternativas','respuesta_correcta','explicacion_respuesta','habilidad_requerida']) for r in rs)}
report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report['resumen']))
