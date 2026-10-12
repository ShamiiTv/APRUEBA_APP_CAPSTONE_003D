import { db } from '../config/firebase.js';
import { createBankCache } from './bankCache.js';
export const loadSharedBank = createBankCache(async () => {
  const snapshot = await db.collection('questions').get();
  return snapshot.docs.map(doc => ({ id: doc.id, question: doc.data() }));
});
