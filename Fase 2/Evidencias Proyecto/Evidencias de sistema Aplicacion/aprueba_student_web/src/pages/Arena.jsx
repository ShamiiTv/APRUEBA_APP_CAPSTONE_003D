import ContentSkeleton from '../components/ContentSkeleton';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client';
import { useTheme } from '../context/useTheme';
import './Arena.css';
const labels = {
  m1: 'Matemática M1',
  m2: 'Matemática M2'
};
export default function Arena() {
  const navigate = useNavigate();
  const {
      lang
    } = useTheme(),
    en = lang === 'en',
    tr = (es, english) => en ? english : es;
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [testId, setTestId] = useState('m1'),
    [choice, setChoice] = useState(''),
    [clock, setClock] = useState(Date.now),
    [offset, setOffset] = useState(0),
    [hiddenMatch, setHiddenMatch] = useState(null),
    [view, setView] = useState(null),
    [confirm, setConfirm] = useState(false);
  const running = useRef(false),
    mounted = useRef(true),
    lastQuestion = useRef(''),
    dialog = useRef(null),
    destination = useRef(null);
  const errors = {
    ARENA_FORBIDDEN: tr('Este duelo pertenece a otros jugadores.', 'This match belongs to other players.'),
    ARENA_NOT_FOUND: tr('El duelo no está disponible.', 'This match is not available.'),
    ARENA_QUEUE_FULL: tr('La cola está completa. Intenta en unos minutos.', 'The queue is full. Try again in a few minutes.'),
    ARENA_ACCOUNT_DELETING: tr('Tu cuenta está en proceso de eliminación.', 'Your account is being deleted.'),
    ARENA_INCONSISTENT: tr('La partida requiere revisión. No vuelvas a reservar una entrada.', 'This match needs review. Do not reserve another entry.'),
    ARENA_BALANCE: tr('Necesitas una medalla de bronce disponible.', 'You need one available bronze medal.'),
    ARENA_DAILY_LIMIT: tr('Ya jugaste las cinco partidas de hoy. Vuelve mañana.', 'You have played today’s five matches. Come back tomorrow.'),
    ARENA_ANSWER_EXPIRED: tr('La ronda terminó. Tu respuesta no fue enviada.', 'The round ended. Your answer was not submitted.'),
    ARENA_DISABLED: tr('Arena estará disponible pronto.', 'Arena will be available soon.'),
    ARENA_NO_QUESTIONS: tr('Esta prueba todavía no está disponible.', 'This test is not available yet.'),
    ARENA_ALREADY_ANSWERED: tr('Ya enviaste una respuesta.', 'You have already submitted an answer.'),
    ARENA_RATE_LIMIT: tr('Espera un momento antes de continuar.', 'Please wait a moment before continuing.')
  };
  const message = e => errors[e.code] || tr('No se pudo actualizar Arena. Estamos recuperando el estado de tu partida.', 'Could not refresh Arena. We are recovering your match state.');
  const refresh = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const {
        data: next
      } = await apiFetch('/arena');
      if (mounted.current) {
        const q = next.match?.question?.id || '';
        if (q !== lastQuestion.current) {
          lastQuestion.current = q;
          setChoice('');
        }
        setData(next);
        setOffset(next.serverNow - Date.now());
        setError('');
      }
    } catch (e) {
      if (mounted.current) setError(e);
    } finally {
      running.current = false;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    let cursor = '';
    const listen = async () => {
      await refresh();
      while (!controller.signal.aborted) {
        try {
          const reply = await apiFetch('/arena/updates?cursor=' + encodeURIComponent(cursor), {
            signal: controller.signal
          });
          cursor = reply.data.cursor;
          await refresh();
        } catch (e) {
          if (controller.signal.aborted) break;
          setError(e);
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }
    };
    void Promise.resolve().then(listen);
    const clockTimer = setInterval(() => setClock(Date.now()), 250);
    return () => {
      mounted.current = false;
      controller.abort();
      clearInterval(clockTimer);
    };
  }, [refresh]);
  const match = view || (data?.match?.id !== hiddenMatch ? data?.match : null),
    active = data?.match && data.match.phase !== 'finished',
    queued = data?.seat?.phase === 'queue',
    now = clock + offset;
  useEffect(() => {
    if (!active && !queued) return;
    const protect = e => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [active, queued]);
  const act = useCallback(async (path, body = {}) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch('/arena' + path, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      setView(null);
      await refresh();
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }, [busy, refresh]);
  useEffect(() => {
    if (confirm) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
  }, [confirm]);
  useEffect(() => {
    if (!active && !queued) return;
    const protect = e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const link = e.target.closest?.('a[href]');
      if (!link || link.target === '_blank') return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname === '/arena') return;
      e.preventDefault();
      e.stopPropagation();
      if (data?.match?.phase === 'live') {
        destination.current = url.pathname + url.search + url.hash;
        setConfirm(true);
      } else {
        void act('/cancel').then(ok => {
          if (ok) navigate(url.pathname + url.search + url.hash);
        });
      }
    };
    document.addEventListener('click', protect, true);
    return () => document.removeEventListener('click', protect, true);
  }, [active, queued, data?.match?.phase, act, navigate]);
  const rank = (value, games) => games < 5 ? tr('En clasificación', 'Provisional') : {
    aspirant: tr('Aspirante', 'Aspirant'),
    explorer: tr('Explorador', 'Explorer'),
    strategist: tr('Estratega', 'Strategist'),
    master: tr('Maestro', 'Master')
  }[value] || tr('Aspirante', 'Aspirant');
  const reason = r => ({
    completed: tr('Partida completada', 'Match completed'),
    abandon: tr('Partida resuelta por abandono', 'Match decided by forfeit'),
    disconnect: tr('Partida resuelta por desconexión', 'Match decided by disconnect'),
    both_disconnected: tr('Ambos jugadores se desconectaron. Entradas devueltas.', 'Both players disconnected. Entries refunded.'),
    server_failure: tr('Interrupción del servidor. Entradas y cupo diario devueltos.', 'Server interruption. Entries and daily allowance refunded.'),
    not_ready: tr('No confirmaron ambos jugadores. No se cobraron entradas.', 'Both players did not confirm. No entries charged.'),
    unavailable: tr('No se pudo reservar ambas entradas. No se cobró a nadie.', 'Both entries could not be reserved. Nobody was charged.'),
    cancelled: tr('Partida cancelada sin coste.', 'Match cancelled at no cost.')
  })[r] || '';
  const names = {
    m1: tr('Matemática M1', 'Mathematics M1'),
    m2: tr('Matemática M2', 'Mathematics M2')
  };
  return <div className="arena-page"><header className="arena-hero"><div><span className="arena-eyebrow">ARENA APRUEBA</span><h1>{tr('Tu conocimiento entra en juego.', 'Put your knowledge in play.')}</h1><p>{tr('Un rival real. Las mismas cinco preguntas. Una oportunidad para superarte.', 'A real opponent. The same five questions. A chance to challenge yourself.')}</p></div><div className="arena-emblem" aria-hidden="true">⚔</div></header>
 {error && <div className="arena-alert" role="alert">{message(error)} <button onClick={() => void refresh()} disabled={busy}>{tr('Reintentar', 'Retry')}</button></div>}
 {!data ? <ContentSkeleton kind="arena-lobby" /> : <>
 <section className="arena-stats" aria-label={tr('Tu estado', 'Your status')}><div><span>{tr('Bronce disponible', 'Available bronze')}</span><strong>◉ {data.balance}</strong></div><div><span>{tr('Partidas de hoy', 'Today’s matches')}</span><strong>{data.dailyUsed} / 5</strong></div><div><span>{tr('Pozo por duelo', 'Pot per duel')}</span><strong>◉ 2</strong></div></section>
 {match ? <section className="arena-card arena-match"><div className="arena-section-title"><h2>{names[match.testId] || labels[match.testId]}</h2><span className="arena-pill">{tr('Entrada', 'Entry')} ◉ 1 · {tr('Pozo', 'Pot')} ◉ 2</span></div><div className="arena-players">{match.players.map((p, i) => <div key={i} className={i === match.me ? 'arena-player me' : 'arena-player'}><span className="arena-avatar">{p.alias === 'deleted' ? '—' : p.alias.slice(-2)}</span><strong>{p.alias === 'deleted' ? tr('Cuenta eliminada', 'Deleted account') : p.alias}{i === match.me ? tr(' · Tú', ' · You') : ''}</strong><span>{rank(p.rank, p.games)} · {p.rating}</span>{match.phase === 'live' && <small>{p.answered ? tr('Respuesta enviada', 'Answer submitted') : p.connected ? tr('En juego', 'Playing') : tr('Reconectando…', 'Reconnecting…')}</small>}</div>)}</div>
 {match.phase === 'ready' && <div className="arena-center"><h2>{tr('¡Rival encontrado!', 'Opponent found!')}</h2><p>{tr('Ambos deben confirmar. Solo entonces se reserva una medalla de cada jugador.', 'Both players must confirm. Only then is one medal reserved from each player.')}</p><strong className="arena-countdown">{Math.max(0, Math.ceil((match.deadline - now) / 1000))} s</strong><button className="arena-primary" disabled={busy || match.players[match.me].ready} onClick={() => act('/matches/' + match.id + '/accept')}>{match.players[match.me].ready ? tr('Esperando al rival…', 'Waiting for opponent…') : tr('Estoy listo · Entrada ◉ 1', 'I’m ready · Entry ◉ 1')}</button><button className="arena-secondary" disabled={busy} onClick={() => act('/cancel')}>{tr('Cancelar sin coste', 'Cancel at no cost')}</button></div>}
 {match.phase === 'live' && <><div className="arena-round"><span>{tr('Ronda', 'Round')} {match.round + 1} / 5</span><strong>{Math.max(0, Math.ceil(((now < match.roundStartsAt ? match.roundStartsAt : match.deadline) - now) / 1000))} s</strong></div><progress max="60" value={Math.max(0, (match.deadline - now) / 1000)} />{!match.question ? <div className="arena-center"><h2>{tr('Prepárate…', 'Get ready…')}</h2></div> : <div className="arena-question"><h3>{match.question.statement}</h3><div className="arena-options">{match.question.options.map((o, i) => <button key={o.id} aria-pressed={(match.selectedOption || choice) === o.id} disabled={busy || !!match.selectedOption || now >= match.deadline} onClick={() => setChoice(o.id)}><b>{'ABCDE'[i]}</b>{o.text}</button>)}</div><button className="arena-primary" disabled={busy || !choice || !!match.selectedOption || now >= match.deadline} onClick={() => act('/matches/' + match.id + '/answer', {
              option: choice,
              questionId: match.question.id,
              round: match.round
            })}>{match.selectedOption ? tr('Respuesta enviada · Esperando al rival', 'Answer submitted · Waiting for opponent') : tr('Confirmar respuesta', 'Confirm answer')}</button></div>}<button className="arena-danger" disabled={busy} onClick={() => {
            destination.current = null;
            setConfirm(true);
          }}>{tr('Abandonar duelo', 'Forfeit match')}</button></>}
 {match.phase === 'finished' && <div className="arena-result"><span className="arena-result-icon">{match.winner === null ? '🤝' : match.winner === match.me ? '🏆' : '🎯'}</span><h2>{match.winner === null ? match.reason === 'completed' ? tr('Empate', 'Draw') : tr('Partida cerrada', 'Match ended') : match.winner === match.me ? tr('¡Victoria!', 'Victory!') : tr('Derrota', 'Defeat')}</h2><p>{reason(match.reason)}</p>{match.review?.length > 0 && <><strong className="arena-score">{match.scores[match.me]} — {match.scores[1 - match.me]}</strong><p>{tr('Balance neto', 'Net change')}: <b>{match.net[match.me] > 0 ? '+' : ''}{match.net[match.me]} ◉</b> · {tr('Rango', 'Rating')}: {match.deltas[match.me] > 0 ? '+' : ''}{match.deltas[match.me]}</p><details><summary>{tr('Revisar respuestas y explicaciones', 'Review answers and explanations')}</summary>{match.review.map((q, i) => <article key={q.id} className="arena-review"><h3>{i + 1}. {q.statement}</h3><p>{tr('Tu respuesta', 'Your answer')}: {q.options.find(o => o.id === q.selectedOption)?.text || tr('Sin respuesta', 'No answer')}</p><p><b>{tr('Respuesta correcta', 'Correct answer')}: {q.options.find(o => o.id === q.correctAnswer)?.text}</b></p>{q.explanation.steps?.map((step, j) => <p key={j}>{step}</p>)}</article>)}</details></>}<button className="arena-primary" disabled={busy} onClick={() => {
            setHiddenMatch(match.id);
            setView(null);
          }}>{tr('Volver a Arena', 'Back to Arena')}</button></div>}
 </section> : queued ? <section className="arena-card arena-center"><div className="arena-radar" aria-hidden="true">⚔</div><h2>{tr('Buscando rival…', 'Finding an opponent…')}</h2><p>{names[data.seat.testId]} · {tr('Entrada', 'Entry')} ◉ 1</p><p>{tr('Buscar es gratis. Aún no se ha descontado ninguna medalla.', 'Searching is free. No medals have been deducted.')}</p><p>{Math.max(0, Math.floor((now - data.seat.joinedAt) / 1000))} s</p>{now - data.seat.joinedAt > 60000 && <p>{tr('Todavía no hay un rival compatible. Puedes seguir esperando o cancelar.', 'No compatible opponent yet. You can keep waiting or cancel.')}</p>}<button className="arena-secondary" disabled={busy} onClick={() => act('/cancel')}>{tr('Cancelar búsqueda', 'Cancel search')}</button></section> : <section className="arena-card arena-lobby"><div><span className="arena-eyebrow">1 VS 1</span><h2>{tr('Elige tu desafío', 'Choose your challenge')}</h2><p>{tr('Cinco preguntas · 60 segundos por ronda · Sin desempates por velocidad', 'Five questions · 60 seconds per round · No speed tiebreakers')}</p></div><div className="arena-test-list">{data.tests.map(test => <button key={test.id} aria-pressed={testId === test.id} disabled={!test.available || busy} onClick={() => setTestId(test.id)}><strong>{names[test.id]}</strong><span>{test.rating} · {test.games < 5 ? tr('En clasificación', 'Provisional') : rank(test.rating < 1100 ? 'aspirant' : test.rating < 1300 ? 'explorer' : test.rating < 1600 ? 'strategist' : 'master', test.games)}</span>{!test.available && <small>{tr('Próximamente', 'Coming soon')}</small>}</button>)}</div><p className="arena-stakes">{tr('Cada jugador aporta', 'Each player contributes')} <b>◉ 1</b>. {tr('El ganador recibe', 'The winner receives')} <b>◉ 2</b>.</p><p>{tr('Si pierdes, pierdes tu entrada. En empate se devuelve a ambos. Las medallas no se compran.', 'If you lose, you lose your entry. A draw refunds both players. Medals cannot be purchased.')}</p><button className="arena-primary" disabled={busy || data.balance < 1 || data.dailyUsed >= 5 || !data.tests.find(t => t.id === testId)?.available} onClick={() => act('/search', {
          testId
        })}>{busy ? tr('Conectando…', 'Connecting…') : tr('Buscar rival · Entrada ◉ 1', 'Find opponent · Entry ◉ 1')}</button>{data.balance < 1 && <p>{tr('Gana una medalla de bronce en la app para participar.', 'Earn a bronze medal in the app to enter.')}</p>}<p className="arena-note">{tr('Otras pruebas y entradas mayores se habilitarán después de validar su banco y disponibilidad de rivales.', 'Other tests and higher entries will open after validating their question pools and opponent availability.')}</p></section>}
 <details className="arena-card arena-rules"><summary>{tr('Cómo funciona Arena', 'How Arena works')}</summary><p>{tr('Buscamos un nivel competitivo similar y evitamos repetir rival en la misma prueba durante 24 horas.', 'We look for a similar competitive rating and avoid repeat opponents in the same test for 24 hours.')}</p><p>{tr('Tu rival recibe las mismas preguntas y opciones. Un acierto suma un punto; un error o una ronda sin responder suma cero. No se revelan soluciones durante el duelo.', 'Your opponent receives the same questions and options. A correct answer scores one point; a wrong or missing answer scores zero. Solutions stay hidden during the match.')}</p><p>{tr('Tienes hasta 30 segundos para reconectarte. El reloj continúa. Abandonar o no volver cuenta como derrota. Si ambos se desconectan, se devuelven las entradas y la partida cuenta en el límite diario.', 'You have up to 30 seconds to reconnect. The clock keeps running. Forfeiting or not returning is a loss. If both players disconnect, entries are refunded and the match counts toward the daily limit.')}</p><p>{tr('Máximo cinco partidas al día, con cambio de día en Chile. El rango es competitivo; no es puntaje PAES. Las preguntas de Arena no alteran tu cuota, tu meta ni tu historial de práctica. Se priorizan preguntas no vistas; pueden aparecer preguntas del banco ya conocidas.', 'Up to five matches a day, resetting at midnight in Chile. The rating is competitive, not a PAES score. Arena questions do not affect your practice quota, goal or history. Unseen questions are preferred; familiar bank questions may appear.')}</p></details>
 {data.history.length > 0 && <section className="arena-card"><h2>{tr('Tus últimos duelos', 'Your recent matches')}</h2><div className="arena-history">{data.history.map(h => <button key={h.matchId} disabled={busy || active || queued} onClick={async () => {
            try {
              const r = await apiFetch('/arena/matches/' + h.matchId);
              setView(r.data);
            } catch (e) {
              setError(e);
            }
          }}><span>{names[h.testId]} · {h.opponent === 'deleted' ? tr('Cuenta eliminada', 'Deleted account') : h.opponent}<small>{new Intl.DateTimeFormat(en ? 'en-GB' : 'es-CL', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                }).format(new Date(h.finishedAt))}</small></span><b>{h.net > 0 ? '+' : ''}{h.net} ◉</b></button>)}</div></section>}
 </>}<dialog ref={dialog} aria-labelledby="arena-leave-title" className="arena-modal" onCancel={() => setConfirm(false)}><section className="arena-card"><h2 id="arena-leave-title">{tr('¿Abandonar el duelo?', 'Forfeit this match?')}</h2><p>{tr('Perderás tu entrada y el rival recibirá el pozo.', 'You will lose your entry and your opponent will receive the pot.')}</p><button autoFocus className="arena-secondary" onClick={() => setConfirm(false)}>{tr('Seguir jugando', 'Keep playing')}</button><button className="arena-danger" disabled={busy} onClick={async () => {
          const ok = await act('/matches/' + data.match.id + '/leave');
          if (ok && destination.current) navigate(destination.current);
        }}>{tr('Sí, abandonar', 'Yes, forfeit')}</button></section></dialog></div>;
}
