import { db } from '../config/firebase.js';

// Both clients use the catalog derived from the reviewed canonical bank.
export async function getTests(req,res) {
  try {
    const snapshot=await db.collection('tests').get();
    return res.success(snapshot.docs.map(doc=>({id:doc.id,label:doc.data().label,hasQuestions:doc.data().active===true,availableQuestions:doc.data().availableQuestions || 0})));
  }catch {return res.fail('No se pudo consultar el catálogo de pruebas.',null,503);}
}
