import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Practice() {
  const { user, updateUserState } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const [testId, setTestId] = useState('m1');
  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [error, setError] = useState(null);

  const fetchNextQuestion = async (subject = testId) => {
    if (quotaExceeded) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedOption(null);
    setAllCompleted(false);

    try {
      const res = await apiFetch(`/practice/next?testId=${subject}`);
      if (res.data?.allCompleted) {
        setAllCompleted(true);
        setQuestion(null);
      } else {
        setQuestion(res.data?.question || null);
      }
    } catch (err) {
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('cuota') || msg.includes('límite') || msg.includes('quota') || msg.includes('403')) {
        setQuotaExceeded(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextQuestion(testId);
  }, [testId]);

  const handleSubmit = async () => {
    if (!selectedOption || submitting || !question) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch('/practice/answers', {
        method: 'POST',
        body: JSON.stringify({
          questionId: question.id,
          selectedOption,
        }),
      });

      setResult(res.data);
      if (res.data?.user) {
        updateUserState(res.data.user);
        const curQuota = res.data.user.quota;
        if (!curQuota?.unlimited && curQuota?.used >= curQuota?.max) {
          setQuotaExceeded(true);
        }
      }
    } catch (err) {
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('cuota') || msg.includes('límite') || msg.includes('quota')) {
        setQuotaExceeded(true);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', position: 'relative' }}>
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
          <h1 style={{ fontFamily: 'Montserrat', fontSize: '24px', fontWeight: 800, color: 'var(--brand)' }}>
            {t.practice.title}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
            {t.practice.subtitle}
          </p>
        </div>

        <select
          value={testId}
          disabled={quotaExceeded}
          onChange={(e) => setTestId(e.target.value)}
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
      </div>

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
        </div>
      )}

      {/* Modal de Cuota Agotada */}
      {quotaExceeded ? (
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
            color: 'var(--brand)',
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
            <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--brand)', marginBottom: '8px' }}>
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
        <div style={{
          backgroundColor: 'var(--panel)',
          borderRadius: '16px',
          padding: '60px',
          textAlign: 'center',
          color: 'var(--muted)',
          border: '1px solid var(--line)'
        }}>
          {t.practice.loadingQuestions}
        </div>
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
          <h2 style={{ fontFamily: 'Montserrat', fontSize: '20px', fontWeight: 800, color: 'var(--brand)', marginBottom: '8px' }}>
            {t.practice.completedTitle}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '480px', margin: '0 auto' }}>
            {t.practice.completedSubtitle}
          </p>
        </div>
      ) : question ? (
        <div style={{
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
              color: 'var(--brand)',
              backgroundColor: 'var(--chip)',
              padding: '6px 12px',
              borderRadius: '20px'
            }}>
              {question.axis || 'PAES'}
            </span>

            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cta)' }}>
              {t.practice.rewardNotice}
            </span>
          </div>

          {/* Enunciado */}
          <div style={{
            fontSize: '16px',
            lineHeight: 1.6,
            color: 'var(--ink)',
            fontWeight: 500,
            marginBottom: '24px'
          }}>
            {question.statement}
          </div>

          {/* Alternativas A-E */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
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
                  disabled={Boolean(result)}
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
                  <span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 500 }}>
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
                {result.isCorrect ? t.practice.correctFeedback : t.practice.incorrectFeedback}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                {result.explanation}
              </p>
              {result.keyConcept && (
                <div style={{
                  fontSize: '12px',
                  color: 'var(--brand)',
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

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
                onClick={() => fetchNextQuestion(testId)}
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
                {t.practice.nextQuestion}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}