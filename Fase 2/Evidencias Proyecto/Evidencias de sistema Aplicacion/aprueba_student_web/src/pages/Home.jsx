import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Home() {
  const { user } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const quotaUsed = user?.quota?.used || 0;
  const quotaMax = user?.quota?.unlimited ? '∞' : (user?.quota?.max || 20);
  const streak = user?.streak || 1;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Montserrat', fontSize: '26px', fontWeight: 800, color: 'var(--ink)' }}>
          {t.home.greeting.replace('{name}', user?.name || 'Estudiante')}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
          {t.home.subtitle}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Cuota Diaria */}
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            {t.home.dailyQuota}
          </div>
          <div style={{ fontFamily: 'Montserrat', fontSize: '28px', fontWeight: 800, color: 'var(--brand)', marginTop: '8px' }}>
            {quotaUsed} / {quotaMax}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            {user?.quota?.unlimited ? 'Sin límites diarios' : t.home.questionsAnswered}
          </div>
        </div>

        {/* Racha */}
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            {t.home.studyStreak}
          </div>
          <div style={{ fontFamily: 'Montserrat', fontSize: '28px', fontWeight: 800, color: 'var(--brand)', marginTop: '8px' }}>
            {streak} {t.nav.streak.split(' ')[0]} 🔥
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, marginTop: '4px' }}>
            {t.home.streakActive}
          </div>
        </div>

        {/* Medallas acumuladas */}
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            {t.home.totalMedals}
          </div>
          <div style={{ fontFamily: 'Montserrat', fontSize: '28px', fontWeight: 800, color: 'var(--cta)', marginTop: '8px' }}>
            {user?.medals?.bronze || 0} 🥉
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            {t.home.silversAndGolds.replace('{silver}', user?.medals?.silver || 0).replace('{gold}', user?.medals?.gold || 0)}
          </div>
        </div>
      </div>

      {/* Banner de acceso directo a practicar */}
      <div style={{
        background: 'linear-gradient(135deg, var(--brand) 0%, #2A4365 100%)',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: 'var(--shadow)'
      }}>
        <div>
          <h2 style={{ fontFamily: 'Montserrat', fontSize: '20px', fontWeight: 800 }}>
            {t.home.readyTitle}
          </h2>
          <p style={{ fontSize: '13px', opacity: 0.85, marginTop: '6px' }}>
            {t.home.readyDesc}
          </p>
        </div>
        <button
          onClick={() => navigate('/practicar')}
          style={{
            backgroundColor: 'var(--cta)',
            color: 'var(--cta-ink)',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 22px',
            fontFamily: 'Montserrat',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(245, 176, 65, 0.4)'
          }}
        >
          {t.home.startPractice}
        </button>
      </div>
    </div>
  );
}