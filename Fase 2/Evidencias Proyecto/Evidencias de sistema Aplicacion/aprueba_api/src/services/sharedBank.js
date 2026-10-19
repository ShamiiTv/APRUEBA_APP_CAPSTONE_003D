import { db } from '../config/firebase.js';
import { createBankCache } from './bankCache.js';
export const loadSharedBank = createBankCache(async () => {
  const snapshot = await db.collection('questions').get();
  console.info('Banco compartido cargado: %d preguntas; caché de 6 horas', snapshot.size);
  return snapshot.docs.map(doc => ({ id: doc.id, question: doc.data() }));
}, { ttlMs: 6 * 60 * 60 * 1000 });
