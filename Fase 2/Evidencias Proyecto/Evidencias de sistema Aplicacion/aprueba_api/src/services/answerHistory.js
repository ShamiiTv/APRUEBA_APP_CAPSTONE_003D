import { db } from '../config/firebase.js';
import { createHistoryCache } from './historyCache.js';
export const loadAnswerHistory = createHistoryCache(uid => db.collection('users').doc(uid).collection('answeredQuestions').get());
