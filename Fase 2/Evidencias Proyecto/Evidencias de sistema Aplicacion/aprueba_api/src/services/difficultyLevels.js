import { canPractice,contentId } from './questionBank.js';
export function difficultyLevels(testId, history, bank) {
  const byId=new Map(bank.map(entry=>[entry.id,entry.question]));
  const available={d1:0,d2:0,d3:0},correct={d1:0,d2:0,d3:0};
  for(const {question} of bank) if(question.testId===testId && canPractice(question) && question.difficulty in available) available[question.difficulty]++;
  const seen=new Set();
  for(const doc of history.docs) {
    const answer=doc.data(),question=byId.get(answer.questionId || doc.id);
    const identity=answer.contentId || (question ? contentId(question) : answer.questionId || doc.id);
    if(seen.has(identity))continue;
    seen.add(identity);
    const difficulty=answer.difficulty || question?.difficulty;
    if(answer.testId===testId && answer.isCorrect===true && difficulty in correct) correct[difficulty]++;
  }
  const first=['d1','d2','d3'].find(level=>available[level]>0) || 'd1';
  return ['d1','d2','d3'].map((id,index)=>({id,available:available[id],correct:correct[id],requiredCorrect:index?20:0,unlocked:index===0 || id===first || correct[['d1','d2','d3'][index-1]]>=20}));
}
