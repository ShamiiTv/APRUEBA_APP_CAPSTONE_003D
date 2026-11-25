import { notifyArena } from './arenaEvents.js';
import { randomUUID, randomInt, createHash } from 'node:crypto';
import { db } from '../config/firebase.js';
import { loadSharedBank } from './sharedBank.js';
import { canPractice, optionsOf, contentId } from './questionBank.js';
import { balances } from './medals.js';
import { practiceDate } from './practice.js';
import { ARENA_REVIEWED } from './arenaQuestions.js';
let wakeWorker = () => {};
export const ARENA_RULES = Object.freeze({
  entry: 1,
  pot: 2,
  rounds: 5,
  roundMs: 60000,
  readyMs: 20000,
  reconnectMs: 30000,
  dailyLimit: 5
});
const fail = (code, status = 409) => {
  throw Object.assign(new Error(code), {
    code,
    status
  });
};
const ref = (name, id) => db.collection(name).doc(id);
const userRef = uid => ref('users', uid);
const seatRef = uid => ref('arenaSeats', uid);
const dailyRef = (uid, date) => userRef(uid).collection('arenaDays').doc(date);
const ratingRef = (uid, test) => userRef(uid).collection('arenaRatings').doc(test);
const pairId = (a, b, test) => createHash('sha256').update(JSON.stringify([test, ...[a, b].sort()])).digest('hex');
const rank = r => r < 1100 ? 'aspirant' : r < 1300 ? 'explorer' : r < 1600 ? 'strategist' : 'master';
const rating = d => ({
  rating: Number.isSafeInteger(d?.rating) ? d.rating : 1000,
  games: Number.isSafeInteger(d?.games) ? d.games : 0
});
const shuffle = items => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
const alias = uid => 'Aprueba #' + createHash('sha256').update(uid).digest('hex').slice(0, 6).toUpperCase();
const poolFor = (bank, test) => bank.filter(({
  question: q
}) => q.testId === test && q.difficulty === 'd2' && canPractice(q) && ARENA_REVIEWED.includes(contentId(q)));
function snapshotQuestion({
  id,
  question: q
}) {
  const original = optionsOf(q),
    correct = original.find(o => o.id === q.correctAnswer);
  const options = shuffle(original).map((o, i) => ({
    id: 'ABCDE'[i],
    text: o.text
  }));
  return {
    id,
    contentId: contentId(q),
    statement: q.statement,
    options,
    correctAnswer: options.find(o => o.text === correct.text).id,
    explanation: q.explanation || {
      steps: []
    }
  };
}
export function elo(a, b, winner) {
  if (winner === null) return [0, 0];
  return [a, b].map((p, i) => {
    const expected = 1 / (1 + 10 ** (([b, a][i].rating - p.rating) / 400));
    return Math.max(-p.rating, Math.round((p.games < 5 ? 40 : 24) * ((winner === i ? 1 : 0) - expected)));
  });
}
export function publicMatch(m, uid, now = Date.now()) {
  const me = m.players.findIndex(p => p.uid === uid);
  if (me < 0) fail('ARENA_FORBIDDEN', 403);
  const finished = m.phase === 'finished',
    q = m.questions?.[m.round];
  return {
    id: m.id,
    testId: m.testId,
    phase: m.phase,
    version: m.version,
    serverNow: now,
    entry: 1,
    pot: m.escrow || 0,
    round: m.round,
    totalRounds: 5,
    deadline: m.deadline || null,
    roundStartsAt: m.roundStartsAt || null,
    reason: m.reason || null,
    winner: m.winner ?? null,
    me,
    players: m.players.map((p, i) => ({
      alias: p.alias,
      ready: p.ready,
      rating: p.rating,
      games: p.games,
      rank: rank(p.rating),
      connected: now - p.lastSeen < 15000,
      answered: !!m.answers?.[m.round]?.[i]
    })),
    question: m.phase === 'live' && now >= m.roundStartsAt && q ? {
      id: q.id,
      statement: q.statement,
      options: q.options
    } : null,
    selectedOption: m.answers?.[m.round]?.[me]?.option || null,
    ...(finished ? {
      scores: m.scores,
      deltas: m.deltas,
      net: m.net,
      finishedAt: m.finishedAt,
      review: (m.date ? m.questions : []).map((item, i) => ({
        ...item,
        selectedOption: m.answers?.[i]?.[me]?.option || null,
        opponentOption: m.answers?.[i]?.[1 - me]?.option || null
      }))
    } : {})
  };
}
export function createArenaService({
  now = Date.now,
  loadBank = loadSharedBank
} = {}) {
  async function settle(tx, m, winner, reason, {
    serverFailure = false
  } = {}) {
    if (m.phase === 'finished') return m;
    const funded = m.escrow === 2,
      users = await Promise.all(m.players.map(p => tx.get(userRef(p.uid))));
    if (funded && users.some(u => !u.exists)) fail('ARENA_INCONSISTENT');
    const days = serverFailure && funded ? await Promise.all(m.players.map(p => tx.get(dailyRef(p.uid, m.date)))) : [];
    const scores = m.players.map((_, i) => m.questions?.reduce((n, q, j) => n + (m.answers?.[j]?.[i]?.option === q.correctAnswer ? 1 : 0), 0) || 0);
    const deltas = funded && winner !== null && !serverFailure ? elo(m.players[0], m.players[1], winner) : [0, 0];
    const net = funded ? m.players.map((_, i) => winner === null ? 0 : winner === i ? 1 : -1) : [0, 0];
    m = {
      ...m,
      phase: 'finished',
      escrow: 0,
      winner,
      reason,
      scores,
      deltas,
      net,
      finishedAt: now(),
      version: m.version + 1
    };
    for (let i = 0; i < 2; i++) {
      const p = m.players[i],
        credit = funded ? winner === null ? 1 : winner === i ? 2 : 0 : 0;
      if (credit) {
        const medals = balances(users[i].data().medals);
        if (!Number.isSafeInteger(medals.bronze + credit)) fail('ARENA_INCONSISTENT');
        medals.bronze += credit;
        tx.update(users[i].ref, {
          medals,
          updatedAt: new Date(now())
        });
        tx.set(users[i].ref.collection('medalLedger').doc('arena-' + m.id + '-credit'), {
          event: 'arena',
          tier: 'bronze',
          amount: credit,
          reason: winner === null ? 'Arena: devolución' : 'Arena: victoria',
          matchId: m.id,
          createdAt: new Date(now())
        });
      }
      tx.set(seatRef(p.uid), {
        phase: 'finished',
        matchId: m.id,
        testId: m.testId
      });
      if (funded) {
        tx.set(ratingRef(p.uid, m.testId), {
          rating: p.rating + deltas[i],
          games: p.games + (winner !== null && !serverFailure ? 1 : 0)
        }, {
          merge: true
        });
        tx.set(userRef(p.uid).collection('arenaHistory').doc(m.id), {
          matchId: m.id,
          testId: m.testId,
          opponent: m.players[1 - i].alias,
          result: winner === null ? 'draw' : winner === i ? 'win' : 'loss',
          reason,
          entry: 1,
          net: net[i],
          ratingDelta: deltas[i],
          score: scores[i],
          questionContents: m.questions.map(q => q.contentId),
          finishedAt: m.finishedAt
        });
      }
      if (serverFailure && funded) tx.set(dailyRef(p.uid, m.date), {
        count: Math.max(0, (days[i].data()?.count || 0) - 1)
      }, {
        merge: true
      });
    }
    tx.set(ref('arenaMatches', m.id), m);
    return m;
  }
  async function advance(id, {
    heartbeatUid,
    action,
    option,
    questionId,
    round
  } = {}) {
    const result = await db.runTransaction(async tx => {
      const doc = await tx.get(ref('arenaMatches', id));
      if (!doc.exists) fail('ARENA_NOT_FOUND', 404);
      let m = doc.data();
      const index = heartbeatUid ? m.players.findIndex(p => p.uid === heartbeatUid) : -1;
      if (heartbeatUid && index < 0) fail('ARENA_FORBIDDEN', 403);
      if (m.phase === 'finished') return m;
      const t = now();
      if (m.phase === 'live' && t - m.serverSeenAt > 15000) return settle(tx, m, null, 'server_failure', {
        serverFailure: true
      });
      // Check the previous presence before accepting a heartbeat; a late reconnect cannot erase a forfeit.
      if (m.phase === 'live') {
        const gone = m.players.map(p => t - p.lastSeen >= 30000);
        if (gone[0] || gone[1]) return settle(tx, m, gone[0] && gone[1] ? null : gone[0] ? 1 : 0, gone[0] && gone[1] ? 'both_disconnected' : 'disconnect');
      }
      if (m.phase === 'ready' && t >= m.deadline) return settle(tx, m, null, 'not_ready');
      if (action === 'leave') return settle(tx, m, m.phase === 'live' ? 1 - index : null, m.phase === 'live' ? 'abandon' : 'cancelled');
      if (m.phase === 'ready' && action === 'accept') {
        m.players[index].ready = true;
        if (m.players.every(p => p.ready)) {
          const profiles = await Promise.all(m.players.map(p => tx.get(userRef(p.uid))));
          const date = practiceDate(new Date(t)),
            days = await Promise.all(m.players.map(p => tx.get(dailyRef(p.uid, date))));
          if (m.players.some(p => t - p.lastSeen >= 15000) || profiles.some(p => !p.exists || p.data().arenaDeletion || balances(p.data().medals).bronze < 1) || days.some(d => (d.data()?.count || 0) >= 5)) return settle(tx, m, null, 'unavailable');
          m.phase = 'live';
          m.escrow = 2;
          m.date = date;
          m.round = 0;
          m.roundStartsAt = t + 3000;
          m.deadline = m.roundStartsAt + 60000;
          m.serverSeenAt = t;
          for (let i = 0; i < 2; i++) {
            const medals = balances(profiles[i].data().medals);
            medals.bronze--;
            tx.update(profiles[i].ref, {
              medals,
              updatedAt: new Date(t)
            });
            tx.set(dailyRef(m.players[i].uid, date), {
              count: (days[i].data()?.count || 0) + 1
            });
            tx.set(seatRef(m.players[i].uid), {
              phase: 'live',
              matchId: m.id,
              testId: m.testId
            });
            tx.set(profiles[i].ref.collection('medalLedger').doc('arena-' + m.id + '-entry'), {
              event: 'arena',
              tier: 'bronze',
              amount: -1,
              reason: 'Arena: entrada',
              matchId: m.id,
              createdAt: new Date(t)
            });
          }
          tx.set(ref('arenaPairs', pairId(m.players[0].uid, m.players[1].uid, m.testId)), {
            playedAt: t
          });
        }
      }
      if (m.phase === 'live' && action === 'answer') {
        if (round !== m.round || questionId !== m.questions[m.round].id || t < m.roundStartsAt || t >= m.deadline) fail('ARENA_ANSWER_EXPIRED');
        if (!m.questions[m.round].options.some(o => o.id === option)) fail('ARENA_BAD_INPUT', 400);
        if (m.answers[m.round][index]) {
          if (m.answers[m.round][index].option !== option) fail('ARENA_ALREADY_ANSWERED');
        } else m.answers[m.round][index] = {
          option,
          at: t
        };
      }
      if (m.phase === 'live' && (t >= m.deadline || m.answers[m.round].every(Boolean))) {
        if (m.round === 4) {
          const scores = [0, 1].map(i => m.questions.reduce((n, q, j) => n + (m.answers[j][i]?.option === q.correctAnswer ? 1 : 0), 0));
          return settle(tx, m, scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1, 'completed');
        }
        m.round++;
        m.roundStartsAt = t + 2000;
        m.deadline = m.roundStartsAt + 60000;
      }
      if (index >= 0) m.players[index].lastSeen = t;
      // Only the server worker proves continuity, never the client.
      if (!heartbeatUid) m.serverSeenAt = t;
      m.version++;
      tx.set(doc.ref, m);
      return m;
    });
    if (action || !heartbeatUid) for (const p of result.players) notifyArena(p.uid);
    return result;
  }
  async function search(uid, testId, {
    rematch = false
  } = {}) {
    if (!['m1', 'm2', 'lectora', 'cien', 'hist'].includes(testId)) fail('ARENA_NO_QUESTIONS', 409);
    const bank = await loadBank(),
      pool = poolFor(bank, testId);
    if (pool.length < 5) fail('ARENA_NO_QUESTIONS');
    const id = randomUUID();
    const result = await db.runTransaction(async tx => {
      const [seat, profile, r, day, lobby] = await Promise.all([tx.get(seatRef(uid)), tx.get(userRef(uid)), tx.get(ratingRef(uid, testId)), tx.get(dailyRef(uid, practiceDate(new Date(now())))), tx.get(ref('arenaQueues', testId))]);
      if (!profile.exists) fail('ARENA_FORBIDDEN', 403);
      if (profile.data().arenaDeletion) fail('ARENA_ACCOUNT_DELETING');
      if (['ready', 'live'].includes(seat.data()?.phase) || !rematch && seat.data()?.phase === 'queue' || rematch && (seat.data()?.phase !== 'queue' || seat.data()?.testId !== testId)) return {
        active: true
      };
      if (balances(profile.data().medals).bronze < 1) fail('ARENA_BALANCE');
      if ((day.data()?.count || 0) >= 5) fail('ARENA_DAILY_LIMIT');
      const t = now(),
        mine = (lobby.data()?.queue || []).find(p => p.uid === uid),
        joinedAt = rematch ? mine?.joinedAt : t,
        mySpread = t - joinedAt < 20000 ? 150 : 300,
        myRating = rating(r.data()),
        queue = (lobby.data()?.queue || []).filter(p => t - p.lastSeen < 30000 && p.uid !== uid);
      if (rematch && (!mine || t - mine.lastSeen >= 30000)) return {
        active: true
      };
      let candidate = null,
        candidateSeat;
      for (const p of queue) {
        const spread = Math.min(mySpread, t - p.joinedAt < 20000 ? 150 : 300);
        if (Math.abs(p.rating - myRating.rating) > spread) continue;
        const [pair, ps] = await Promise.all([tx.get(ref('arenaPairs', pairId(uid, p.uid, testId))), tx.get(seatRef(p.uid))]);
        if (t - (pair.data()?.playedAt || 0) < 86400000 || ps.data()?.phase !== 'queue' || ps.data()?.testId !== testId) continue;
        candidate = p;
        candidateSeat = ps;
        break;
      }
      if (candidate) {
        // Copy a single immutable question set; no future question or key is exposed by publicMatch.
        const recent = await Promise.all([tx.get(userRef(uid).collection('answeredQuestions').limit(2000)), tx.get(userRef(candidate.uid).collection('answeredQuestions').limit(2000)), tx.get(userRef(uid).collection('arenaHistory').orderBy('finishedAt', 'desc').limit(100)), tx.get(userRef(candidate.uid).collection('arenaHistory').orderBy('finishedAt', 'desc').limit(100))]);
        const seen = new Set(recent.flatMap(s => s.docs.flatMap(d => [d.id, d.data().contentId, d.data().questionId, ...(d.data().questionContents || [])]).filter(Boolean)));
        const fresh = shuffle(pool.filter(q => !seen.has(q.id) && !seen.has(contentId(q.question))));
        const remaining = shuffle(pool.filter(q => !fresh.includes(q)));
        const chosen = [...fresh, ...remaining].slice(0, 5).map(snapshotQuestion);
        const m = {
          id,
          testId,
          phase: 'ready',
          version: 1,
          createdAt: t,
          serverSeenAt: t,
          deadline: t + 20000,
          round: 0,
          roundStartsAt: null,
          escrow: 0,
          questions: chosen,
          answers: Object.fromEntries(Array.from({
            length: 5
          }, (_, i) => [i, [null, null]])),
          participants: [candidate.uid, uid],
          players: [{
            uid: candidate.uid,
            alias: alias(candidate.uid),
            rating: candidate.rating,
            games: candidate.games,
            ready: false,
            lastSeen: t
          }, {
            uid,
            alias: alias(uid),
            ...myRating,
            ready: false,
            lastSeen: t
          }]
        };
        tx.set(ref('arenaMatches', id), m);
        tx.set(candidateSeat.ref, {
          phase: 'ready',
          matchId: id,
          testId
        });
        tx.set(seatRef(uid), {
          phase: 'ready',
          matchId: id,
          testId
        });
        tx.set(lobby.ref, {
          queue: queue.filter(p => p.uid !== candidate.uid)
        });
        return {
          matchId: id
        };
      }
      if (queue.length >= 50) fail('ARENA_QUEUE_FULL');
      queue.push({
        uid,
        ...myRating,
        joinedAt,
        lastSeen: rematch ? mine.lastSeen : t
      });
      tx.set(lobby.ref, {
        queue
      });
      tx.set(seatRef(uid), {
        phase: 'queue',
        testId,
        joinedAt
      });
      return {
        queued: true
      };
    });
    if (!rematch || result.matchId) notifyArena(uid);
    if (!rematch) wakeWorker();
    if (result.matchId) {
      const found = await ref('arenaMatches', result.matchId).get();
      for (const p of found.data().players) notifyArena(p.uid);
    }
    return result;
  }
  async function cancel(uid) {
    const seat = await seatRef(uid).get(),
      s = seat.data();
    if (s?.matchId && ['ready', 'live'].includes(s.phase)) return advance(s.matchId, {
      heartbeatUid: uid,
      action: 'leave'
    });
    if (s?.phase === 'queue') {
      const moved = await db.runTransaction(async tx => {
        const current = await tx.get(seatRef(uid));
        if (current.data()?.phase !== 'queue') return current.data()?.matchId;
        const q = await tx.get(ref('arenaQueues', current.data().testId));
        tx.set(q.ref, {
          queue: (q.data()?.queue || []).filter(p => p.uid !== uid)
        });
        tx.delete(current.ref);
      });
      if (moved) await advance(moved, {
        heartbeatUid: uid,
        action: 'leave'
      });
    }
  }
  async function state(uid) {
    let seat = (await seatRef(uid).get()).data(),
      match = null;
    if (seat?.phase === 'queue') await db.runTransaction(async tx => {
      const s = await tx.get(seatRef(uid));
      if (s.data()?.phase !== 'queue') return;
      const q = await tx.get(ref('arenaQueues', s.data().testId)),
        t = now(),
        queue = (q.data()?.queue || []).filter(p => t - p.lastSeen < 30000 || p.uid === uid);
      const p = queue.find(p => p.uid === uid);
      if (!p || t - p.lastSeen >= 30000) {
        tx.set(q.ref, {
          queue: queue.filter(p => p.uid !== uid)
        });
        tx.delete(s.ref);
        seat = null;
      } else {
        p.lastSeen = t;
        tx.set(q.ref, {
          queue
        });
      }
    });
    seat = (await seatRef(uid).get()).data();
    if (seat?.matchId) {
      const m = await advance(seat.matchId, {
        heartbeatUid: uid
      });
      match = publicMatch(m, uid, now());
    }
    const [u, ratings, day, history, bank] = await Promise.all([userRef(uid).get(), userRef(uid).collection('arenaRatings').get(), dailyRef(uid, practiceDate(new Date(now()))).get(), userRef(uid).collection('arenaHistory').orderBy('finishedAt', 'desc').limit(10).get(), loadBank()]);
    return {
      serverNow: now(),
      rules: ARENA_RULES,
      balance: balances(u.data()?.medals).bronze,
      dailyUsed: day.data()?.count || 0,
      seat: seat || null,
      match,
      tests: ['m1', 'm2', 'lectora', 'cien', 'hist'].map(testId => ({
        id: testId,
        available: poolFor(bank, testId).length >= 5,
        ...rating(ratings.docs.find(d => d.id === testId)?.data())
      })),
      history: history.docs.map(d => d.data())
    };
  }
  async function command(uid, id, action, payload = {}) {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) fail('ARENA_BAD_INPUT', 400);
    await advance(id, {
      heartbeatUid: uid,
      action,
      ...payload
    });
  }
  let rotation = 0;
  async function sweep() {
    const active = await db.collection('arenaMatches').where('phase', 'in', ['ready', 'live']).get();
    for (const doc of active.docs) {
      try {
        await advance(doc.id);
      } catch (e) {
        console.error('Arena match recovery failed', e.code || 'unavailable');
      }
    }
    const queues = await Promise.all(['m1', 'm2', 'lectora', 'cien', 'hist'].map(id => ref('arenaQueues', id).get()));
    let waiting = false;
    for (const q of queues) {
      const fresh = (q.data()?.queue || []).filter(p => now() - p.lastSeen < 30000);
      if (!fresh.length) continue;
      waiting = true;
      const eligible = fresh.filter(p => fresh.some(other => other.uid !== p.uid && Math.abs(other.rating - p.rating) <= Math.min(now() - p.joinedAt < 20000 ? 150 : 300, now() - other.joinedAt < 20000 ? 150 : 300)));
      const candidates = eligible.length ? eligible : fresh;
      const start = rotation % candidates.length,
        deadline = Date.now() + 1500;
      for (let i = 0; i < Math.min(4, candidates.length); i++) {
        const p = candidates[(start + i) % candidates.length];
        try {
          const found = await search(p.uid, q.id, {
            rematch: true
          });
          if (found.matchId) break;
        } catch (e) {
          if (['ARENA_BALANCE', 'ARENA_DAILY_LIMIT', 'ARENA_ACCOUNT_DELETING', 'ARENA_FORBIDDEN'].includes(e.code)) await db.runTransaction(async tx => {
            const seat = await tx.get(seatRef(p.uid));
            if (seat.data()?.phase !== 'queue' || seat.data()?.testId !== q.id) return;
            const current = await tx.get(q.ref);
            tx.set(q.ref, {
              queue: (current.data()?.queue || []).filter(x => x.uid !== p.uid)
            });
            tx.delete(seat.ref);
            notifyArena(p.uid);
          });else console.error('Arena queue recovery failed', e.code || 'unavailable');
        }
        if (Date.now() > deadline) break;
      }
    }
    rotation++;
    return active.size > 0 || waiting;
  }
  async function lockDeletion(uid) {
    const token = randomUUID();
    return db.runTransaction(async tx => {
      const profile = await tx.get(userRef(uid));
      if (!profile.exists) return null;
      const old = profile.data().arenaDeletion;
      if (old && now() - old.at < 120000) fail('ARENA_ACCOUNT_DELETING', 503);
      tx.update(profile.ref, {
        arenaDeletion: {
          token,
          at: now()
        }
      });
      return token;
    });
  }
  async function unlockDeletion(uid, token) {
    if (!token) return;
    await db.runTransaction(async tx => {
      const profile = await tx.get(userRef(uid));
      if (profile.data()?.arenaDeletion?.token === token) tx.update(profile.ref, {
        arenaDeletion: null
      });
    });
  }
  async function removeAccount(uid) {
    await cancel(uid);
    const all = await db.collection('arenaMatches').where('participants', 'array-contains', uid).get();
    for (const doc of all.docs) await db.runTransaction(async tx => {
      const current = await tx.get(doc.ref),
        m = current.data();
      if (m.phase !== 'finished') fail('ARENA_INCONSISTENT');
      const other = m.players.find(p => p.uid && p.uid !== uid);
      const history = other ? await tx.get(userRef(other.uid).collection('arenaHistory').doc(m.id)) : null;
      if (history?.exists) tx.update(history.ref, {
        opponent: 'deleted'
      });
      m.participants = m.participants.filter(x => x !== uid);
      for (const p of m.players) if (p.uid === uid) {
        p.uid = null;
        p.alias = 'deleted';
      }
      tx.set(doc.ref, m);
    });
    await seatRef(uid).delete();
  }
  return {
    search,
    state,
    cancel,
    command,
    advance,
    sweep,
    removeAccount,
    lockDeletion,
    unlockDeletion
  };
}
export const arena = createArenaService();
export function startArenaWorker(){
 let running=false,due=0,stopped=false,pending=false;
 const tick=async()=>{if(stopped||running||Date.now()<due)return;running=true;pending=false;try{const active=await arena.sweep();due=Date.now()+(active?0:30000);}catch(e){console.error('Arena sweep failed',e.code||'unavailable');due=Date.now()+5000;}finally{running=false;if(pending&&!stopped){due=0;queueMicrotask(tick);}}};
 wakeWorker=()=>{pending=true;due=0;void tick();};void tick();const timer=setInterval(tick,5000);timer.unref();
 return()=>{stopped=true;wakeWorker=()=>{};clearInterval(timer);};
}
