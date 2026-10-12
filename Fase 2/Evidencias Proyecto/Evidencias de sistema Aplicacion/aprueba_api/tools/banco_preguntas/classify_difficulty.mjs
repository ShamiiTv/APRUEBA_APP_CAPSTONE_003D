// Generates review proposals only. Does not alter the question bank or Firestore.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
let root=path.dirname(fileURLToPath(import.meta.url));
while(!fs.existsSync(path.join(root,'Fase 2'))) { const parent=path.dirname(root); if(parent===root)throw new Error('No se encontró la raíz del proyecto'); root=parent; }
const bank=path.join(root,'Fase 2/Evidencias Proyecto/Evidencias de sistema Aplicacion/aprueba_api/src/data/questions');
const output=path.join(root,'Fase 2/Evidencias Proyecto/Evidencias de documentación/Revisión banco de preguntas/dificultad');
const rules={
  m1:[
    ['d1','Aplicación directa de una operación o ecuación lineal',/ecuaci[oó]n(?:es)? lineal|primer grado|porcentaje directo|media aritm[eé]tica|per[ií]metro/i],
    ['d2','Relacionar representaciones o encadenar procedimientos',/cuadr[aá]tic|sistema de ecuaciones|factoriz|probabilidad|funci[oó]n|semejanza|proporcionalidad/i],
    ['d3','Modelar restricciones o justificar un razonamiento',/modelar|optimizar|demostrar|justificar.*(?:condici[oó]n|restricci[oó]n)|combinar.*(?:conceptos|procedimientos)/i],
  ],
  m2:[
    ['d1','Aplicación explícita de una propiedad conocida',/identificar.*propiedad|evaluar.*funci[oó]n|sustituir/i],
    ['d2','Procedimiento algebraico o interpretación de funciones',/logarit|exponencial|trigonom[eé]tric|cuadr[aá]tic|probabilidad|funci[oó]n/i],
    ['d3','Integración de condiciones y modelación',/modelar|optimizar|demostrar|par[aá]metro|combinatoria|condicional/i],
  ],
  lectora:[
    ['d1','Localizar información explícita',/localizar|informaci[oó]n expl[ií]cita|identificar.*(?:dato|informaci[oó]n expl[ií]cita)/i],
    ['d2','Interpretar relaciones o inferir información',/inferir|inferencia|interpretar|idea principal|prop[oó]sito|relacionar/i],
    ['d3','Evaluar argumentos y perspectiva del texto',/evaluar|validez|argumentaci[oó]n|perspectiva|sesgo|credibilidad/i],
  ],
  cien:[
    ['d1','Reconocer una estructura, definición o función directa',/identificar|reconocer|definir/i],
    ['d2','Relacionar procesos y explicar mecanismos',/relacionar|comparar|explicar|mecanismo|consecuencia|predecir/i],
    ['d3','Analizar evidencia o diseño experimental',/dise[nñ]o experimental|variable.*(?:control|independiente|dependiente)|evaluar.*(?:evidencia|hip[oó]tesis)|interpretar.*(?:experimento|resultados experimentales)/i],
  ],
};
const rows=[];
for(const file of fs.readdirSync(bank).filter(file=>file.endsWith('.json')).sort()){
  const questions=JSON.parse(fs.readFileSync(path.join(bank,file),'utf8').replace(/^\uFEFF/,''));
  questions.forEach((q,index)=>{
    if(q.estado_revision!=='lista')return;
    // Skill descriptors are an indicator; keyword matches never approve a level.
    const evidence=q.habilidad_requerida || '';
    const matches=(rules[q.prueba]||[]).filter(([, ,pattern])=>pattern.test(evidence));
    const levels=[...new Set(matches.map(([level])=>level))];
    const candidate=levels.length===1?levels[0]:null;
    rows.push({file,index:index+1,testId:q.prueba,statement:q.pregunta,skill:evidence,sourceHash:createHash('sha256').update(JSON.stringify(q)).digest('hex'),currentLevel:q.dificultad||'d2',currentLevelOrigin:q.dificultad?'explicit':'fallback',proposedLevel:candidate,reviewStatus:'pending_teacher_review',confidence:'indicative_only',reasons:matches.map(([,reason])=>reason),reviewNote:levels.length>1?'Indicadores de distintos niveles: revisar el ítem completo.':candidate?'Revisar enunciado, distractores y solución antes de aprobar.':'Sin indicadores suficientes: clasificar manualmente.',approvedLevel:null});
  });
}
fs.mkdirSync(output,{recursive:true});
const summary={total:rows.length,proposed:Object.fromEntries(['d1','d2','d3','unclassified'].map(level=>[level,rows.filter(row=>(row.proposedLevel||'unclassified')===level).length])),approved:0};
fs.writeFileSync(path.join(output,'propuestas.json'),JSON.stringify({rubricVersion:1,summary,questions:rows},null,2)+'\n');
const columns=['file','index','testId','statement','skill','currentLevel','proposedLevel','reviewStatus','reviewNote'];
const cell=value=>'"'+String(value??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(output,'propuestas.csv'),'\uFEFF'+[columns.map(cell).join(';'),...rows.map(row=>columns.map(key=>cell(row[key])).join(';'))].join('\n')+'\n');
console.log(JSON.stringify(summary));
