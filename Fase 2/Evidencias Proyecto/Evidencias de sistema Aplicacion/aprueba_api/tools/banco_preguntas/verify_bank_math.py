"""Independent symbolic checks. Unsupported notation is reported, never guessed.

Install optional tooling: python -m pip install --target .review-tools sympy
"""
import json
import re
import sys
from review_bank import ROOT, bank

sys.path.insert(0,str(ROOT / '.review-tools'))
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor

x,b=sp.symbols('x b', positive=True)
y,a,z,C=sp.symbols('y a z C', real=True)
LOCAL=dict(x=x,y=y,a=a,b=b,z=z,C=C,e=sp.E,pi=sp.pi,ln=sp.log,log=sp.log,exp=sp.exp,
           sin=sp.sin,cos=sp.cos,tan=sp.tan,sec=sp.sec,csc=sp.csc,cot=sp.cot,
           asin=sp.asin,acos=sp.acos,atan=sp.atan,sqrt=sp.sqrt,Abs=sp.Abs)
SUP=str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺','0123456789-+')

def expression(s):
    s=s.strip().rstrip('.').replace('−','-').replace('–','-').replace('π','pi').replace('·','*').replace('×','*').replace('½','(1/2)')
    s=re.sub(r'(?<=\d),(?=\d)', '.', s)
    s=s.replace('{','(').replace('}',')').replace('arcsen','asin').replace('arccos','acos').replace('arctan','atan').replace('sen','sin')
    s=s.replace('tan⁻¹','atan')
    s=re.sub(r'[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+',lambda m:'^('+m.group().translate(SUP)+')',s)
    s=re.sub(r'\b(sin|cos|tan|sec|csc|cot)\^\((\d+)\)\s*(\([^()]*\)|[xyz])',r'\1(\3)^\2',s)
    s=re.sub(r'√\s*\(', 'sqrt(', s)
    s=re.sub(r'√\s*([a-z]|\d+(?:\.\d+)?)', r'sqrt(\1)',s)
    s=re.sub(r'ln\s*\|([^|]+)\|',r'ln(Abs(\1))',s)
    s=re.sub(r'e\^\(([^()]+)\)',r'exp(\1)',s)
    s=re.sub(r'\b(sin|cos|tan|sec|csc|cot|ln)\s+((?:\d+)?[xyz])\b',r'\1(\2)',s)
    s=re.sub(r'\|([^|]+)\|',r'Abs(\1)',s)
    if not re.fullmatch(r'[a-zA-Z0-9+*/^().\s-]+',s): raise ValueError('unsupported characters')
    s=re.sub(r'([xyz])(?=exp)',r'\1*',s)
    names=re.findall(r'[A-Za-z]+',s)
    # Strict name allow-list prevents calls or access to arbitrary Python objects.
    if any(name not in LOCAL and not all(c in 'xyzab' for c in name) for name in names): raise ValueError('unsupported names')
    return parse_expr(s,local_dict={**LOCAL,'exp':sp.exp},transformations=standard_transformations+(implicit_multiplication_application,convert_xor))

def equal(left,right):
    return sp.simplify(sp.trigsimp(left-right))==0

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    results=[]
    for key,(_,questions) in bank().items():
        if not key.startswith('m'): continue
        for number,q in enumerate(questions,1):
            ref=f'{key}:{number}'
            statement=q['pregunta']
            record={'id':ref,'tipo':None}
            target=None
            try:
                match=re.search(r'f\(x\)\s*=\s*(.+)',statement)
                if 'derivada' in statement.lower() and match:
                    source=match[1].split('. ¿')[0].split(' en x=')[0].rstrip('.')
                    source=re.sub(r'\s+en x\s*=.*','',source)
                    target=sp.diff(expression(source),x)
                    at=re.search(r'en x\s*=\s*([0-9-]+)',statement)
                    if at: target=target.subs(x,int(at[1]))
                    record['tipo']='derivada'
                elif 'simplifica' in statement.lower():
                    source=statement.split(':',1)[1] if ':' in statement else statement.split('racional',1)[-1]
                    source=re.sub(r'^\s*(?:la expresión(?: racional)?\s*)','',source)
                    source=re.split(r'\s+para\s+|,\s*para|\s+con\s+',source)[0].rstrip('.')
                    target=expression(source)
                    record['tipo']='simplificación'
                elif '∫' in statement and not re.search(r'∫_|desde| de \d|definida|entre',statement,re.I):
                    source=statement.split('∫',1)[1].split('dx',1)[0].strip()
                    target=expression(source)
                    record['tipo']='integral_indefinida'
                else: continue
                valid=[]
                parsed=[]
                for letter,option in zip('ABCDE',q['alternativas']):
                    try:
                        value=expression(option)
                        parsed.append((letter,value))
                        if equal(sp.diff(value,x) if record['tipo']=='integral_indefinida' else value,target):
                            if record['tipo']!='integral_indefinida' or 'C' in option:
                                valid.append(letter)
                    except (ValueError,TypeError,SyntaxError,AttributeError): pass
                record.update(respuestas_validas=valid,clave=q['respuesta_correcta'],correcta=q['respuesta_correcta'] in valid,
                              respuesta_unica=len(valid)==1,objetivo=str(target))
                equivalents=[]
                for i,(letter,value) in enumerate(parsed):
                    for other,other_value in parsed[i+1:]:
                        if equal(value,other_value): equivalents.append([letter,other])
                record['alternativas_equivalentes']=equivalents
            except (ValueError,TypeError,SyntaxError,AttributeError,IndexError) as error:
                record['no_verificable']=str(error)
            results.append(record)
    report={'alcance':'Comprobación auxiliar en región x>0 y b>0; no demuestra dominios completos ni reemplaza revisión manual. Notación no reconocida se informa.', 'verificadas':sum('correcta' in r for r in results),'no_verificables':sum('no_verificable' in r for r in results),'resultados':results}
    (ROOT/'Fase 2/Evidencias Proyecto/Evidencias de documentación/Revisión banco de preguntas/verificacion_matematica.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='resultados'}))
    for r in results:
        if 'correcta' in r and (not r['correcta'] or not r['respuesta_unica'] or r['alternativas_equivalentes']): print(json.dumps(r,ensure_ascii=False))

if __name__=='__main__': main()
