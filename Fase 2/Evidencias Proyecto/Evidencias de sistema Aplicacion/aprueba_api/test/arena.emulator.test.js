import { test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const project = process.env.ARENA_TEST_PROJECT_ID;
if (!project?.startsWith('demo-')) throw Error('Arena tests require an isolated demo- project');
Object.assign(process.env, {
  FIREBASE_PROJECT_ID: project,
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099'
});
const {
  db
} = await import('../src/config/firebase.js');
const {
  createArenaService,
  publicMatch,
  elo
} = await import('../src/services/arena.js');
const {
  readBank
} = await import('../src/data/seedData.js');
const {
  ARENA_REVIEWED
} = await import('../src/services/arenaQuestions.js');
const bank = [...readBank()].map(([id, question]) => ({
  id,
  question
}));
let t = Date.now();
const arena = createArenaService({
  now: () => t,
  loadBank: async () => bank
});
const users = [];
async function user(bronze = 10) {
  const id = 'arena-' + randomUUID();
  users.push(id);
  await db.collection('users').doc(id).set({
    medals: {
      bronze
    },
    quota: {
      date: 'unchanged',
      used: 7
    }
  });
  return id;
}
async function match() {
  const a = await user(),
    b = await user();
  await arena.search(a, 'm1');
  const {
    matchId
  } = await arena.search(b, 'm1');
  assert.ok(matchId);
  await arena.command(a, matchId, 'accept');
  await arena.command(b, matchId, 'accept');
  return {
    a,
    b,
    id: matchId
  };
}
async function m(id) {
  return (await db.collection('arenaMatches').doc(id).get()).data();
}
async function bronze(uid) {
  return (await db.collection('users').doc(uid).get()).data().medals.bronze;
}
async function heart(a, b, id, ms = 5000) {
  t += ms;
  await arena.advance(id);
  await arena.advance(id, {
    heartbeatUid: a
  });
  await arena.advance(id, {
    heartbeatUid: b
  });
}
beforeEach(async () => {
  for (const c of ['arenaSeats', 'arenaQueues', 'arenaMatches', 'arenaPairs']) await db.recursiveDelete(db.collection(c));
});
after(async () => {
  for (const uid of users) await db.recursiveDelete(db.collection('users').doc(uid));
  for (const c of ['arenaSeats', 'arenaQueues', 'arenaMatches', 'arenaPairs']) await db.recursiveDelete(db.collection(c));
});
test('curated pool contains fifty published intermediate questions and balanced valid explanations', () => {
  assert.equal(ARENA_REVIEWED.length, 50);
  for (const id of ARENA_REVIEWED) {
    const q = bank.find(q => q.id === id)?.question;
    assert.ok(q, id);
    assert.equal(q.status, 'published');
    assert.equal(q.difficulty, 'd2');
    assert.ok(q.explanation.steps.length);
  }
});
test('matching costs nothing, same immutable question/options, no answer/future leaks, outsiders denied', async () => {
  const a = await user(),
    b = await user();
  await arena.search(a, 'm1');
  const {
    matchId
  } = await arena.search(b, 'm1');
  const ready = await m(matchId);
  assert.equal(await bronze(a), 10);
  assert.equal(publicMatch(ready, a, t).question, null);
  assert.throws(() => publicMatch(ready, 'outsider', t), {
    code: 'ARENA_FORBIDDEN'
  });
  await arena.command(a, matchId, 'accept');
  await arena.command(b, matchId, 'accept');
  t += 3000;
  const live = await m(matchId),
    pa = publicMatch(live, a, t),
    pb = publicMatch(live, b, t);
  assert.deepEqual(pa.question, pb.question);
  assert.equal(JSON.stringify(pa).includes('correctAnswer'), false);
  assert.equal(pa.review, undefined);
  assert.equal((await bronze(a)) + (await bronze(b)) + live.escrow, 20);
  await arena.cancel(a);
});
test('atomic accept concurrent replays charge only once and escrow cannot be spent again', async () => {
  const a = await user(1),
    b = await user(1);
  await arena.search(a, 'm1');
  const {
    matchId
  } = await arena.search(b, 'm1');
  await Promise.all([arena.command(a, matchId, 'accept'), arena.command(b, matchId, 'accept'), arena.command(a, matchId, 'accept')]);
  assert.equal(await bronze(a), 0);
  assert.equal(await bronze(b), 0);
  assert.equal((await m(matchId)).escrow, 2);
  const other = await user();
  await arena.search(other, 'm1');
  await arena.search(a, 'm2');
  assert.equal((await db.collection('arenaSeats').doc(a).get()).data().matchId, matchId);
  await arena.cancel(a);
  assert.equal(await bronze(b), 2);
});
test('insufficient funds of either player cancels before charging the other', async () => {
  const a = await user(),
    b = await user();
  await arena.search(a, 'm1');
  const {
    matchId
  } = await arena.search(b, 'm1');
  await db.collection('users').doc(a).update({
    'medals.bronze': 0
  });
  await arena.command(a, matchId, 'accept');
  await arena.command(b, matchId, 'accept');
  assert.equal((await m(matchId)).reason, 'unavailable');
  assert.equal(await bronze(b), 10);
  assert.deepEqual(publicMatch(await m(matchId), b, t).review, []);
});
test('five rounds settle one winner, exact conservation, Elo and practice quota untouched', async () => {
  const {
    a,
    b,
    id
  } = await match();
  for (let round = 0; round < 5; round++) {
    await heart(a, b, id, 3000);
    const current = await m(id),
      q = current.questions[round],
      wrong = q.options.find(o => o.id !== q.correctAnswer).id;
    await arena.command(a, id, 'answer', {
      round,
      questionId: q.id,
      option: q.correctAnswer
    });
    await arena.command(a, id, 'answer', {
      round,
      questionId: q.id,
      option: q.correctAnswer
    });
    await arena.command(b, id, 'answer', {
      round,
      questionId: q.id,
      option: wrong
    });
  }
  const result = await m(id);
  assert.equal(result.phase, 'finished');
  assert.deepEqual(result.scores, [5, 0]);
  assert.equal(await bronze(a), 11);
  assert.equal(await bronze(b), 9);
  assert.equal(result.escrow, 0);
  assert.deepEqual(result.deltas, [20, -20]);
  assert.equal(publicMatch(result, a, t).review.length, 5);
  await Promise.all([arena.advance(id), arena.cancel(a), arena.cancel(b)]);
  assert.equal((await bronze(a)) + (await bronze(b)), 20);
  assert.deepEqual((await db.collection('users').doc(a).get()).data().quota, {
    date: 'unchanged',
    used: 7
  });
  assert.equal((await db.collection('users').doc(a).collection('medalLedger').get()).size, 2);
});
test('draw refunds both entries and leaves Elo unchanged', async () => {
  const {
    a,
    b,
    id
  } = await match();
  for (let round = 0; round < 5; round++) {
    await heart(a, b, id, 3000);
    const q = (await m(id)).questions[round];
    await arena.command(a, id, 'answer', {
      round,
      questionId: q.id,
      option: q.correctAnswer
    });
    await arena.command(b, id, 'answer', {
      round,
      questionId: q.id,
      option: q.correctAnswer
    });
  }
  assert.equal((await m(id)).winner, null);
  assert.deepEqual((await m(id)).deltas, [0, 0]);
  assert.equal(await bronze(a), 10);
  assert.equal(await bronze(b), 10);
});
test('timeouts, wrong-round, invalid option, changed answer and foreign commands rejected', async () => {
  const {
    a,
    b,
    id
  } = await match();
  const q = (await m(id)).questions[0];
  await assert.rejects(arena.command(a, id, 'answer', {
    round: 0,
    questionId: q.id,
    option: 'A'
  }), {
    code: 'ARENA_ANSWER_EXPIRED'
  });
  await heart(a, b, id, 3000);
  await assert.rejects(arena.command('outsider', id, 'leave'), {
    code: 'ARENA_FORBIDDEN'
  });
  await assert.rejects(arena.command(a, id, 'answer', {
    round: 1,
    questionId: q.id,
    option: 'A'
  }), {
    code: 'ARENA_ANSWER_EXPIRED'
  });
  await assert.rejects(arena.command(a, id, 'answer', {
    round: 0,
    questionId: q.id,
    option: 'Z'
  }), {
    code: 'ARENA_BAD_INPUT'
  });
  await arena.command(a, id, 'answer', {
    round: 0,
    questionId: q.id,
    option: 'A'
  });
  await assert.rejects(arena.command(a, id, 'answer', {
    round: 0,
    questionId: q.id,
    option: 'B'
  }), {
    code: 'ARENA_ALREADY_ANSWERED'
  });
  for (let i = 0; i < 12; i++) await heart(a, b, id, 5000);
  assert.equal((await m(id)).round, 1);
  await assert.rejects(arena.command(a, id, 'answer', {
    round: 0,
    questionId: q.id,
    option: 'A'
  }), {
    code: 'ARENA_ANSWER_EXPIRED'
  });
  await arena.cancel(a);
});
test('server continuity gap refunds escrow and daily allowance even with a fresh request', async () => {
  const {
    a,
    b,
    id
  } = await match();
  t += 16000;
  await arena.advance(id, {
    heartbeatUid: a
  });
  const result = await m(id);
  assert.equal(result.reason, 'server_failure');
  assert.equal(await bronze(a), 10);
  assert.equal(await bronze(b), 10);
  assert.equal((await arena.state(a)).dailyUsed, 0);
});
test('single disconnect forfeits and both disconnect refund without creating currency', async () => {
  for (const both of [false, true]) {
    const {
      a,
      b,
      id
    } = await match();
    for (let i = 0; i < 7; i++) {
      t += 5000;
      if (!both) await arena.advance(id, {
        heartbeatUid: b
      });
      await arena.advance(id);
    }
    const result = await m(id);
    assert.equal(result.reason, both ? 'both_disconnected' : 'disconnect');
    assert.equal((await bronze(a)) + (await bronze(b)), 20);
    assert.equal(result.escrow, 0);
    assert.equal((await arena.state(a)).dailyUsed, 1);
  }
});
test('queue expires, cancellation is free, same pair cannot farm medals within 24h', async () => {
  const {
    a,
    b,
    id
  } = await match();
  await arena.cancel(a);
  await arena.search(a, 'm1');
  await arena.search(b, 'm1');
  assert.equal((await arena.state(b)).seat.phase, 'queue');
  t += 31000;
  assert.equal((await arena.state(a)).seat, null);
  await arena.cancel(b);
  assert.equal((await m(id)).phase, 'finished');
});
test('newly created service recovers persisted state and account deletion settles before anonymizing', async () => {
  const {
    a,
    b,
    id
  } = await match();
  const recovered = createArenaService({
    now: () => t,
    loadBank: async () => bank
  });
  assert.equal((await recovered.state(a)).match.id, id);
  await recovered.removeAccount(a);
  const result = await m(id);
  assert.equal(result.phase, 'finished');
  assert.equal(result.winner, 1);
  assert.equal(result.participants.includes(a), false);
  assert.equal(result.players[0].uid, null);
  assert.equal(await bronze(b), 11);
  assert.equal(publicMatch(result, b, t).players[0].alias, 'deleted');
});
test('daily competitive limit blocks all plans and rankings never go below zero', async () => {
  const a = await user();
  await db.collection('users').doc(a).collection('arenaDays').doc((await import('../src/services/practice.js')).practiceDate(new Date(t))).set({
    count: 5
  });
  await assert.rejects(arena.search(a, 'm1'), {
    code: 'ARENA_DAILY_LIMIT'
  });
  await assert.rejects(arena.search(a, 'lectora'), {
    code: 'ARENA_NO_QUESTIONS'
  });
  assert.ok(elo({
    rating: 0,
    games: 0
  }, {
    rating: 1000,
    games: 0
  }, 1)[0] >= 0);
});
test('concurrent searches cannot assign one account to two matches', async () => {
  const a = await user(),
    b = await user(),
    c = await user(),
    d = await user();
  await Promise.all([arena.search(a, 'm1'), arena.search(a, 'm2')]);
  const active = (await db.collection('arenaSeats').doc(a).get()).data();
  assert.equal(active.phase, 'queue');
  const queued = await Promise.all(['m1', 'm2'].map(id => db.collection('arenaQueues').doc(id).get()));
  assert.equal(queued.flatMap(x => x.data()?.queue || []).filter(p => p.uid === a).length, 1);
  await arena.cancel(a);
  await Promise.all([a, b, c, d].map(uid => arena.search(uid, 'm1')));
  const matches = await db.collection('arenaMatches').where('phase', '==', 'ready').get();
  assert.equal(matches.size, 2);
  assert.equal(new Set(matches.docs.flatMap(d => d.data().participants)).size, 4);
});
test('last entry acceptance races a real medal exchange without spending escrow twice', async () => {
  const a = await user(5),
    b = await user(1);
  await arena.search(a, 'm1');
  const {
    matchId
  } = await arena.search(b, 'm1');
  await arena.command(a, matchId, 'accept');
  const {
    exchangeMedals
  } = await import('../src/controllers/medalsController.js');
  const exchange = new Promise(resolve => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({
          status: this.statusCode,
          body
        });
      }
    };
    void exchangeMedals({
      user: {
        sub: a
      },
      body: {
        fromTier: 'bronze',
        requestId: randomUUID()
      }
    }, res);
  });
  await Promise.all([exchange, arena.command(b, matchId, 'accept')]);
  let game = await m(matchId);
  if (game.phase === 'live') await arena.cancel(a);
  game = await m(matchId);
  const profiles = await Promise.all([a, b].map(uid => db.collection('users').doc(uid).get()));
  const value = profiles.reduce((sum, p) => sum + p.data().medals.bronze + 5 * (p.data().medals.silver || 0), 0);
  assert.equal(value + game.escrow, 6);
});
test('practice and previous Arena content are deprioritized when five unseen items remain', async () => {
  const a = await user(),
    b = await user();
  const first = bank.filter(q => ARENA_REVIEWED.includes(q.id) && q.question.testId === 'm1').slice(0, 5);
  for (const q of first) await db.collection('users').doc(a).collection('answeredQuestions').doc(q.id).set({
    contentId: q.id,
    questionId: q.id
  });
  await arena.search(a, 'm1');
  const {
    matchId
  } = await arena.search(b, 'm1');
  const result = await m(matchId);
  assert.equal(result.questions.some(q => first.some(old => old.id === q.id)), false);
});
test('account deletion lock prevents a concurrent join and only its owner can release it', async () => {
  const a = await user();
  const token = await arena.lockDeletion(a);
  await assert.rejects(arena.search(a, 'm1'), {
    code: 'ARENA_ACCOUNT_DELETING'
  });
  await arena.unlockDeletion(a, 'wrong');
  await assert.rejects(arena.search(a, 'm1'), {
    code: 'ARENA_ACCOUNT_DELETING'
  });
  await arena.unlockDeletion(a, token);
  await arena.search(a, 'm1');
  assert.equal((await arena.state(a)).seat.phase, 'queue');
});
test('waiting opponents match after both rating windows expand, without requiring a new arrival', async () => {
  const a = await user(),
    b = await user();
  await db.collection('users').doc(b).collection('arenaRatings').doc('m1').set({
    rating: 1200,
    games: 6
  });
  await arena.search(a, 'm1');
  await arena.search(b, 'm1');
  assert.equal((await arena.state(a)).seat.phase, 'queue');
  for (let i = 0; i < 4; i++) {
    t += 5000;
    await arena.state(a);
    await arena.state(b);
  }
  await arena.sweep();
  const sa = (await db.collection('arenaSeats').doc(a).get()).data(),
    sb = (await db.collection('arenaSeats').doc(b).get()).data();
  assert.ok(sa.matchId);
  assert.equal(sa.matchId, sb.matchId);
  assert.equal(await bronze(a), 10);
  assert.equal(await bronze(b), 10);
});
