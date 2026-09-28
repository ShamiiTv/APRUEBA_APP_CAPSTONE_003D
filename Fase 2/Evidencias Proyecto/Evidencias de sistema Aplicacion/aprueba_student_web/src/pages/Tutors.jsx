import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function Tutors() {
  const { t } = useTheme();
  const [tutors, setTutors] = useState([]);
  const [filterTest, setFilterTest] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchTutors = async (testId) => {
    try {
      const endpoint = testId && testId !== 'all' ? `/tutors?testId=${testId}` : '/tutors';
      const res = await apiFetch(endpoint);
      setTutors(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutors(filterTest);
  }, [filterTest]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      await apiFetch('/tutors/request', {
        method: 'POST',
        body: JSON.stringify({
          tutorId: selectedTutor.id,
          topic,
          message,
        }),
      });

      setFeedback({
        type: 'ok',
        text: `¡Solicitud de tutoría enviada a ${selectedTutor.name}!`,
      });
      setSelectedTutor(null);
      setTopic('');
      setMessage('');
    } catch (err) {
      setFeedback({ type: 'err', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>
            {t.tutors.title}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
            {t.tutors.subtitle}
          </p>
        </div>

        {/* Filtros dinámicos */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: t.tutors.all },
            { id: 'm1', label: t.tutors.m1 },
            { id: 'lectora', label: t.tutors.lectora },
            { id: 'cien', label: t.tutors.ciencias },
            { id: 'hist', label: t.tutors.historia },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterTest(f.id)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: filterTest === f.id ? 'var(--brand)' : 'var(--panel)',
                color: filterTest === f.id ? '#FFFFFF' : 'var(--ink)',
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 18px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          background: feedback.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: feedback.type === 'ok' ? 'var(--accent)' : 'var(--danger)',
        }}>
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--muted)' }}>{t.tutors.loading}</div>
      ) : tutors.length === 0 ? (
        <div style={{ background: 'var(--panel)', padding: '32px', textAlign: 'center', borderRadius: '14px', border: '1px solid var(--line)', color: 'var(--muted)' }}>
          {t.tutors.emptyList}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
          {tutors.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'var(--panel)',
                borderRadius: '16px',
                padding: '22px',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: item.avatarColor || 'var(--brand)',
                    color: '#FFFFFF',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontFamily: 'Montserrat',
                    fontSize: '16px',
                    flexShrink: 0,
                  }}>
                    {item.name.split(' ')[1]?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'Montserrat', fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                      {item.name}
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {item.university}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <span style={{
                    display: 'inline-block',
                    backgroundColor: 'var(--chip)',
                    color: 'var(--brand)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}>
                    {item.subjectLabel}
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', lineHeight: '1.5' }}>
                  {item.specialty}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                  <span style={{ color: 'var(--cta)', fontSize: '14px' }}>★</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>{item.rating}</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>({item.reviewsCount} {t.tutors.reviews})</span>
                </div>
              </div>

              <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'Montserrat', color: 'var(--ink)' }}>
                    ${Number(item.hourlyRate).toLocaleString('es-CL')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{t.tutors.perSession}</div>
                </div>

                <button
                  onClick={() => setSelectedTutor(item)}
                  style={{
                    backgroundColor: 'var(--cta)',
                    color: 'var(--cta-ink)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 14px',
                    fontFamily: 'Montserrat',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {t.tutors.contactBtn}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Contactar */}
      {selectedTutor && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 100,
          padding: '20px',
        }}>
          <div style={{ background: 'var(--panel)', width: '100%', maxWidth: '440px', borderRadius: '16px', padding: '24px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ fontFamily: 'Montserrat', fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
              {t.tutors.contactTitle.replace('{name}', selectedTutor.name)}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              {t.tutors.contactSub.replace('{subject}', selectedTutor.subjectLabel).replace('{rate}', Number(selectedTutor.hourlyRate).toLocaleString('es-CL'))}
            </p>

            <form onSubmit={handleSendRequest} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                  {t.tutors.topicLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.tutors.topicPlaceholder}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', backgroundColor: 'var(--soft)', color: 'var(--ink)', outline: 'none', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                  {t.tutors.messageLabel}
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder={t.tutors.messagePlaceholder}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', backgroundColor: 'var(--soft)', color: 'var(--ink)', outline: 'none', fontSize: '13px', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedTutor(null)}
                  style={{ padding: '9px 14px', borderRadius: '8px', border: 'none', background: 'var(--soft)', color: 'var(--ink)', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                >
                  {t.tutors.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--brand)',
                    color: '#FFFFFF',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontFamily: 'Montserrat',
                    fontSize: '12px',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? t.tutors.sendingBtn : t.tutors.sendBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}