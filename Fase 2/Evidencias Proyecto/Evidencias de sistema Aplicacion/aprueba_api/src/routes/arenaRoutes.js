import { waitArena } from '../services/arenaEvents.js';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { arena, publicMatch } from '../services/arena.js';
const router = Router();
const messages = {
  ARENA_ACCOUNT_DELETING: 'Esta cuenta está en proceso de eliminación.',
  ARENA_DISABLED: 'Arena está cerrada para nuevas búsquedas.',
  ARENA_FORBIDDEN: 'No puedes acceder a este duelo.',
  ARENA_NOT_FOUND: 'El duelo no existe.',
  ARENA_BALANCE: 'Necesitas una medalla de bronce disponible.',
  ARENA_DAILY_LIMIT: 'Alcanzaste las cinco partidas de hoy.',
  ARENA_NO_QUESTIONS: 'Esta prueba todavía no está disponible en Arena.',
  ARENA_BAD_INPUT: 'Revisa los datos de la solicitud.',
  ARENA_ANSWER_EXPIRED: 'La ronda terminó. Tu respuesta no fue enviada.',
  ARENA_ALREADY_ANSWERED: 'Ya confirmaste otra respuesta en esta ronda.',
  ARENA_QUEUE_FULL: 'La cola está completa. Intenta en unos minutos.',
  ARENA_INCONSISTENT: 'La partida necesita revisión. Tus medallas siguen registradas.'
};
router.use(rateLimit({
  windowMs: 60000,
  limit: 90,
  keyGenerator: req => req.user.sub,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    error: {
      message: 'Demasiadas solicitudes. Espera un momento.',
      details: {
        code: 'ARENA_RATE_LIMIT'
      }
    }
  }
}));
const run = fn => async (req, res) => {
  try {
    if (process.env.ARENA_ENABLED !== 'true') return res.fail('Arena estará disponible próximamente.', {
      code: 'ARENA_DISABLED'
    }, 503);
    return res.success(await fn(req));
  } catch (e) {
    if (!messages[e.code]) console.error('Arena request failed', e.code || 'unavailable');
    return res.fail(messages[e.code] || 'No se pudo conectar con Arena. Intenta nuevamente.', {
      code: messages[e.code] ? e.code : 'ARENA_UNAVAILABLE'
    }, e.status || 503);
  }
};
function body(req, keys) {
  if (!req.body || Array.isArray(req.body) || Object.keys(req.body).some(k => !keys.includes(k))) throw Object.assign(new Error('ARENA_BAD_INPUT'), {
    code: 'ARENA_BAD_INPUT',
    status: 400
  });
  return req.body;
}
router.get('/updates', run(async req => {
  const controller = new AbortController();
  const closed = () => controller.abort();
  req.res.once('close', closed);
  try {
    return await waitArena(req.user.sub, String(req.query.cursor || '').slice(0, 100), controller.signal);
  } finally {
    req.res.removeListener('close', closed);
  }
}));
router.get('/', run(req => arena.state(req.user.sub)));
router.post('/search', run(req => {
  if (process.env.ARENA_ACCEPTING === 'false') throw Object.assign(new Error('ARENA_DISABLED'), {
    code: 'ARENA_DISABLED',
    status: 503
  });
  return arena.search(req.user.sub, body(req, ['testId']).testId);
}));
router.post('/cancel', run(async req => {
  body(req, []);
  await arena.cancel(req.user.sub);
  return {
    cancelled: true
  };
}));
router.get('/matches/:id', run(async req => publicMatch(await arena.advance(req.params.id, {
  heartbeatUid: req.user.sub
}), req.user.sub)));
for (const action of ['accept', 'leave', 'answer']) router.post('/matches/:id/' + action, run(async req => {
  const payload = body(req, action === 'answer' ? ['option', 'questionId', 'round'] : []);
  await arena.command(req.user.sub, req.params.id, action, payload);
  return {
    accepted: true
  };
}));
export default router;
