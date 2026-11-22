import ApruebaIcon from '../components/ApruebaIcon';
import ContentSkeleton from '../components/ContentSkeleton';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { useTheme } from '../context/useTheme';
import './Practice.css';

export default function Practice() {
  const { user, updateUserState } = useAuth();
  const { t,lang } = useTheme();
  const navigate = useNavigate();

  const [params] = useSearchParams();
  const requestedTest = params.get('testId');
  const [similarTo,setSimilarTo]=useState(params.get('similarTo') || null);
  const requestedDifficulty = params.get('difficulty');
  const [testId, setTestId] = useState(['m1','m2','lectora','cien','hist'].includes(requestedTest) ? requestedTest : user?.selectedTests?.[0] || 'm1');
  const [difficulty, setDifficulty] = useState(['d1','d2','d3'].includes(requestedDifficulty) ? requestedDifficulty : user?.difficulty || 'd2');
  const [reload, setReload] = useState(0);
  const startedAt = useRef(0);
  const questionSurface = useRef(null);
  const [questionHeight,setQuestionHeight] = useState(0);

  const submission = useRef(false);
  const [question, setQuestion] = useState(null);
  useEffect(()=>{const node=questionSurface.current;if(!node)return;const observer=new ResizeObserver(()=>setQuestionHeight(node.getBoundingClientRect().height));observer.observe(node);return()=>observer.disconnect();},[question]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);
  const [noQuestions, setNoQuestions] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [error, setError] = useState(null);
  const [levels,setLevels]=useState([]);
  useEffect(()=>{const controller=new AbortController();apiFetch(`/practice/levels?testId=${testId}`,{signal:controller.signal}).then(res=>setLevels(res.data)).catch(()=>{});return()=>controller.abort();},[testId,reload]);

  const fetchNextQuestion = () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedOption(null);
    setAllCompleted(false);
    setNoQuestions(false);
    setQuotaExceeded(false);
    setQuestion(null);
    setReload(value => value + 1);
  };

  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`/practice/next?testId=${testId}&difficulty=${difficulty}${similarTo ? '&similarTo='+encodeURIComponent(similarTo) : ''}`, { signal: controller.signal })
      .then(res => {
        if (controller.signal.aborted) return;
        setAllCompleted(res.data?.allCompleted === true);
        setNoQuestions(res.data?.noQuestions === true);
        setQuestion(res.data?.question || null);
        if(similarTo && res.meta?.similarity){setTestId(res.meta.testId);setDifficulty(res.meta.difficulty);}
        if (res.data?.user) updateUserState(res.data.user);
        startedAt.current = Date.now();
      }).catch(err => {
        if (controller.signal.aborted) return;
        if (err.code === 'QUOTA_EXCEEDED') setQuotaExceeded(true);
        else setError(err.message);
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [testId, difficulty, similarTo, reload, updateUserState]);

  const handleSubmit = async () => {
    if (!selectedOption || submission.current || !question || result) return;
    submission.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch('/practice/answers', {
        method: 'POST',
        body: JSON.stringify({
          questionId: question.id,
          selectedOption,
          elapsedMs: Math.min(3600000, Math.max(0, Date.now() - startedAt.current)),
        }),
      });

      setResult(res.data);
      setSelectedOption(res.data.selectedOption);
      if (res.data?.user) {
        updateUserState(res.data.user);
        const curQuota = res.data.user.quota;
        if (!curQuota?.unlimited && curQuota?.used >= curQuota?.max) {
          setQuotaExceeded(true);
        }
      }
    } catch (err) {
      if (err.code === 'QUOTA_EXCEEDED') {
        setQuotaExceeded(true);
      } else {
        setError(err.message);
      }
    } finally {
      submission.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', position: 'relative' }}>
      {similarTo && <section role="status"><p>{lang==='en'?'Similar questions: same test, difficulty and topic.':'Preguntas similares: misma prueba, dificultad y eje temático.'}</p><button onClick={()=>{setSimilarTo(null);fetchNextQuestion();}}>{lang==='en'?'Return to general practice':'Volver a práctica general'}</button></section>}
      {/* Cabecera del Módulo */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontSize: '24px', fontWeight: 800, color: 'var(--brand-ink)' }}>
            {t.practice.title}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
            {t.practice.subtitle} · {lang==='en'?'10 base + 5 school + 5 address · 20 free max':'10 base + 5 colegio + 5 dirección · 20 máx gratis'}
          </p>
        </div>

        <select
          value={testId}
          disabled={submitting}
          onChange={(e) => { setSimilarTo(null); setTestId(e.target.value); fetchNextQuestion(); }}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid var(--line)',
            fontFamily: 'Montserrat',
            fontWeight: 700,
            fontSize: '13px',
            color: 'var(--ink)',
            backgroundColor: 'var(--panel)',
            outline: 'none',
            cursor: quotaExceeded ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="m1">{t.practice.selectM1}</option>
          <option value="m2">{t.practice.selectM2}</option>
          <option value="lectora">{t.practice.selectLectora}</option>
          <option value="cien">{t.practice.selectCiencias}</option>
          <option value="hist">{t.practice.selectHistoria}</option>
        </select>
        <select aria-label={lang==='en'?'Difficulty':'Dificultad'} value={difficulty} disabled={submitting} onChange={e => { setDifficulty(e.target.value); fetchNextQuestion(); }} style={{ padding: '10px', borderRadius: '10px', color: 'var(--ink)', background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <option value="d1">{lang==='en'?'Basic':'Básica'}</option><option value="d2">{lang==='en'?'Intermediate':'Intermedia'}</option><option value="d3">{lang==='en'?'Advanced':'Avanzada'}</option>
        </select>
      </div>

      <section className="facsimile-entry" ><ApruebaIcon name="book" size={32} /><div><h2>{lang==='en'?'Practice mock exam':'Facsímil de práctica'}</h2><p>{lang==='en'?'Choose a test, available difficulty and question count, in a fixed order. Included in Full access.':'Elige prueba, dificultad disponible y cantidad de preguntas en orden fijo. Incluido en Acceso completo.'}</p></div><button onClick={()=>navigate('/facsimil')}>{lang==='en'?'Open mock exams →':'Abrir Facsímil →'}</button></section>
      <section className="practice-levels"><h2>{lang==='en'?'Difficulty levels':'Niveles escalonados'}</h2><p>{lang==='en'?'20 correct answers in the previous level unlock the next one.':'20 aciertos en el nivel anterior desbloquean el siguiente.'}</p><div className="level-grid">{levels.map(level=><button className="level-button" aria-pressed={difficulty===level.id} key={level.id} disabled={submitting || loading || !level.unlocked || !level.available} onClick={()=>{setSimilarTo(null);setDifficulty(level.id);fetchNextQuestion();}}><strong>{level.unlocked?'🔓':'🔒'} {({d1:lang==='en'?'Basic':'Básica',d2:lang==='en'?'Intermediate':'Intermedia',d3:lang==='en'?'Advanced':'Avanzada'})[level.id] || level.id}</strong><span>{level.correct}/20 {lang==='en'?'correct':'aciertos'} · {level.available} {lang==='en'?'questions':'preguntas'}</span><progress value={Math.min(level.correct,20)} max="20"/><small>{!level.available ? (lang==='en'?'No questions yet':'Sin preguntas disponibles') : !level.unlocked ? (lang==='en'?'Locked':'Por desbloquear') : difficulty===level.id ? (lang==='en'?'Selected':'Seleccionado') : (lang==='en'?'Practice this level →':'Practicar este nivel →')}</small></button>)}</div></section>
      {error && !quotaExceeded && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          backgroundColor: 'rgba(239,68,68,0.1)',
          color: 'var(--danger)',
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '20px'
        }}>
          {error}
          <button onClick={fetchNextQuestion} disabled={submitting} style={{ display: 'block', marginTop: '12px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>{lang==='en'?'Retry':'Reintentar'}</button>
        </div>
      )}

      {/* Modal de Cuota Agotada */}
      {quotaExceeded && <p><button onClick={()=>navigate('/ajustes')}>{lang==='en'?'Complete school / address (+5 each)':'Completar colegio / dirección (+5 cada uno)'}</button> <button onClick={()=>navigate('/plan')}>{lang==='en'?'View monthly plans':'Ver planes mensuales'}</button></p>}
      {quotaExceeded && !result ? (
        <div style={{
          backgroundColor: 'var(--panel)',
          borderRadius: '20px',
          padding: '48px 32px',
          textAlign: 'center',
          border: '2px solid var(--cta)',
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(245, 176, 65, 0.15)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '30px',
            margin: '0 auto 20px'
          }}>
            ⚡
          </div>

          <h2 style={{
            fontFamily: 'Montserrat',
            fontSize: '22px',
            fontWeight: 800,
            color: 'var(--brand-ink)',
            marginBottom: '10px'
          }}>
            {t.practice.quotaTitle}
          </h2>

          <p style={{
            color: 'var(--muted)',
            fontSize: '14px',
            maxWidth: '520px',
            margin: '0 auto 28px',
            lineHeight: 1.6
          }}>
            {t.practice.quotaSubtitle}
          </p>

          <div style={{
            backgroundColor: 'var(--soft)',
            padding: '20px',
            borderRadius: '14px',
            maxWidth: '460px',
            margin: '0 auto 28px',
            textAlign: 'left',
            border: '1px solid var(--line)'
          }}>
            <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--brand-ink)', marginBottom: '8px' }}>
              {t.practice.proBenefits}
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--ink)', lineHeight: 1.6 }}>
              <li><strong>{t.practice.proB1.split(' ')[0]} {t.practice.proB1.split(' ')[1]}</strong> {t.practice.proB1.slice(t.practice.proB1.indexOf(' ', t.practice.proB1.indexOf(' ') + 1))}</li>
              <li>{t.practice.proB2}</li>
              <li>{t.practice.proB3}</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/plan')}
              style={{
                backgroundColor: 'var(--cta)',
                color: 'var(--cta-ink)',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 32px',
                fontFamily: 'Montserrat',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 176, 65, 0.4)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {t.practice.viewPlans}
            </button>
          </div>
        </div>
      ) : loading ? (
        <ContentSkeleton kind="question" minHeight={questionHeight || undefined} />
      ) : similarTo && !question ? (
          <section role="status"><h2>{lang==='en'?'No more similar questions available':'No hay más preguntas similares disponibles'}</h2><p>{lang==='en'?'There are no other unanswered questions with the same test, difficulty and topic.':'No quedan otras preguntas sin responder de la misma prueba, dificultad y eje temático.'}</p><button onClick={()=>{setSimilarTo(null);fetchNextQuestion();}}>{lang==='en'?'Continue general practice':'Continuar práctica general'}</button></section>
      ) : noQuestions ? (
        <div style={{ padding: '32px', background: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--line)', color: 'var(--muted)' }}>{lang==='en'?'There are no questions for this test and difficulty yet. Choose another option.':'Todavía no hay preguntas disponibles para esta prueba y dificultad. Selecciona otra opción.'}</div>
      ) : allCompleted ? (
        <div style={{
          backgroundColor: 'var(--panel)',
          borderRadius: '16px',
          padding: '48px 32px',
          textAlign: 'center',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
          <h2 style={{ fontFamily: 'Montserrat', fontSize: '20px', fontWeight: 800, color: 'var(--brand-ink)', marginBottom: '8px' }}>
            {t.practice.completedTitle}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '480px', margin: '0 auto' }}>
            {t.practice.completedSubtitle}
          </p>
        </div>
      ) : question ? (
        <div ref={questionSurface} className="question-surface" style={{
          backgroundColor: 'var(--panel)',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow)'
        }}>
          {/* Header del ítem */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 800,
              color: 'var(--brand-ink)',
              backgroundColor: 'var(--chip)',
              padding: '6px 12px',
              borderRadius: '20px'
            }}>
              {question.axis || 'PAES'}
            </span>

            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold-ink)' }}>
              {t.practice.rewardNotice}
            </span>
          </div>

          {/* Enunciado */}
          <div className="question-statement-space" style={{
            fontSize: '16px',
            lineHeight: 1.6,
            color: 'var(--ink)',
            fontWeight: 500,
            marginBottom: '24px',whiteSpace:'pre-wrap',overflowWrap:'anywhere'
          }}>
            {question.statement}
          </div>

          {/* Alternativas A-E */}
          <div className="question-options-space" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
            {question.options?.map((opt) => {
              const isSelected = selectedOption === opt.id;
              let borderCol = isSelected ? 'var(--brand)' : 'var(--line)';
              let bgCol = isSelected ? 'var(--chip)' : 'var(--panel)';

              if (result) {
                if (opt.id === result.correctAnswer) {
                  borderCol = 'var(--accent)';
                  bgCol = 'rgba(16,185,129,0.12)';
                } else if (isSelected && !result.isCorrect) {
                  borderCol = 'var(--danger)';
                  bgCol = 'rgba(239,68,68,0.12)';
                }
              }

              return (
                <button
                  key={opt.id}
                  aria-pressed={isSelected}
                  disabled={Boolean(result) || submitting}
                  onClick={() => setSelectedOption(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: `1.5px solid ${borderCol}`,
                    backgroundColor: bgCol,
                    cursor: result ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    outline: 'none'
                  }}
                >
                  <span style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'var(--brand)' : 'var(--soft)',
                    color: isSelected ? '#FFFFFF' : 'var(--ink)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontSize: '13px',
                    flexShrink: 0
                  }}>
                    {opt.id}
                  </span>
                  <span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 500,whiteSpace:'pre-wrap',overflowWrap:'anywhere' }}>
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Retroalimentación */}
          {result && (
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: result.isCorrect ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${result.isCorrect ? 'var(--accent)' : 'var(--danger)'}`,
              marginBottom: '24px'
            }}>
              <div style={{
                fontWeight: 800,
                fontSize: '15px',
                color: result.isCorrect ? 'var(--accent)' : 'var(--danger)',
                marginBottom: '8px'
              }}>
                {result.alreadyAnswered ? (lang==='en'?'This question was already answered; this is your first attempt.':'Esta pregunta ya estaba respondida; se muestra tu intento anterior.') : result.isCorrect ? t.practice.correctFeedback : t.practice.incorrectFeedback}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                {result.explanation}
              </p>
              {result.keyConcept && (
                <div style={{
                  fontSize: '12px',
                  color: 'var(--brand-ink)',
                  backgroundColor: 'var(--soft)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)'
                }}>
                  <strong>{t.practice.skillKey}</strong> {result.keyConcept}
                </div>
              )}
            </div>
          )}

          {result && <button disabled={submitting} onClick={()=>{setSimilarTo(question.id);fetchNextQuestion();}}>{lang==='en'?'Practice similar questions':'Practicar similares'}</button>}
          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
            {result && <div className="practice-share-actions"><button className="practice-share-button" onClick={() => navigate(`/grupos?questionId=${encodeURIComponent(question.id)}&testId=${encodeURIComponent(testId)}`)}><span className="practice-share-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1"/></svg></span>{lang==='en'?'Share with group':'Compartir al grupo'}<svg className="practice-share-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button><button className="practice-share-button practice-share-button--community" onClick={() => navigate(`/comunidad?questionId=${encodeURIComponent(question.id)}`)}><span className="practice-share-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H5l-3 2V11.5a9.5 9.5 0 0 1 19 0Z"/><path d="M7 11h10m-10 4h6"/></svg></span>{lang==='en'?'Share with community':'Compartir a la comunidad'}<svg className="practice-share-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button></div>}
            {!result ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedOption || submitting}
                style={{
                  backgroundColor: 'var(--brand)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 28px',
                  fontFamily: 'Montserrat',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: (!selectedOption || submitting) ? 'not-allowed' : 'pointer',
                  opacity: (!selectedOption || submitting) ? 0.6 : 1
                }}
              >
                {submitting ? t.practice.verifying : t.practice.checkAnswer}
              </button>
            ) : (
              <button
                onClick={fetchNextQuestion}
                style={{
                  backgroundColor: 'var(--cta)',
                  color: 'var(--cta-ink)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 28px',
                  fontFamily: 'Montserrat',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {quotaExceeded ? (lang==='en'?'View daily quota':'Ver cuota diaria') : t.practice.nextQuestion}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
