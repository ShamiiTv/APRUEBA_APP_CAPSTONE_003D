import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';

const TIERS = [
  { key: 'bronze', label: 'Bronce', color: 'var(--bronze)', emoji: '🥉' },
  { key: 'silver', label: 'Plata', color: 'var(--silver)', emoji: '🥈' },
  { key: 'gold', label: 'Oro', color: 'var(--gold)', emoji: '🥇' },
  { key: 'diamond', label: 'Diamante', color: 'var(--diamond)', emoji: '💎' },
  { key: 'platinum', label: 'Platino', color: 'var(--platinum)', emoji: '⬡' }
];

export default function Medals() {
  const { user, updateUserState } = useAuth();
  const { t } = useTheme();
  const [medals, setMedals] = useState(user?.medals || {});
  const [history, setHistory] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState(false);
  const [msg, setMsg] = useState(null);

  const loadData = async () => {
    try {
      const [resSummary, resBenefits] = await Promise.all([
        apiFetch('/medals'),
        apiFetch('/medals/benefits')
      ]);
      setMedals(resSummary.data.medals);
      setHistory(resSummary.data.history);
      setBenefits(resBenefits.data || []);
      updateUserState({ medals: resSummary.data.medals });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExchange = async (fromTier) => {
    setExchanging(true);
    setMsg(null);
    try {
      const res = await apiFetch('/medals/exchange', {
        method: 'POST',
        body: JSON.stringify({ fromTier })
      });
      setMedals(res.data.medals);
      updateUserState({ medals: res.data.medals });
      setMsg({ type: 'ok', text: `¡Canje exitoso! Obtuviste 1 medalla de ${res.data.upgradedTier}.` });
      loadData();
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setExchanging(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--muted)' }}>Cargando saldos y beneficios...</div>;
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Montserrat', fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>
        {t.medals.title}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
        {t.medals.subtitle}
      </p>

      {msg && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          background: msg.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: msg.type === 'ok' ? 'var(--accent)' : 'var(--danger)'
        }}>
          {msg.text}
        </div>
      )}

      {/* Saldo de medallas actual */}
      <div style={{
        marginTop: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '14px',
        background: 'var(--panel)',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow)'
      }}>
        {TIERS.map(item => (
          <div key={item.key} style={{ textAlign: 'center', opacity: medals[item.key] > 0 ? 1 : 0.45 }}>
            <div style={{
              width: '54px',
              height: '54px',
              margin: '0 auto',
              borderRadius: '50%',
              background: item.color,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '22px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
            }}>
              {item.emoji}
            </div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '20px', color: 'var(--ink)', marginTop: '8px' }}>
              {medals[item.key] || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Secciones de Canjes y Beneficios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginTop: '24px' }}>
        {/* Canjes 5 a 1 */}
        <div style={{ background: 'var(--panel)', padding: '24px', borderRadius: '16px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
          <h2 style={{ fontFamily: 'Montserrat', fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
            {t.medals.exchangeTitle}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
            {t.medals.exchangeSubtitle}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { from: 'bronze', to: 'silver', label: t.medals.bronzeToSilver },
              { from: 'silver', to: 'gold', label: t.medals.silverToGold },
              { from: 'gold', to: 'diamond', label: t.medals.goldToDiamond },
              { from: 'diamond', to: 'platinum', label: t.medals.diamondToPlatinum }
            ].map(pair => {
              const canExchange = (medals[pair.from] || 0) >= 5;
              return (
                <div key={pair.from} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: 'var(--soft)',
                  borderRadius: '10px',
                  border: '1px solid var(--line)'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{pair.label}</span>
                  <button
                    disabled={!canExchange || exchanging}
                    onClick={() => handleExchange(pair.from)}
                    style={{
                      background: canExchange ? 'var(--cta)' : 'var(--line)',
                      color: canExchange ? 'var(--cta-ink)' : 'var(--muted)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: canExchange ? 'pointer' : 'not-allowed',
                      fontFamily: 'Montserrat',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {t.medals.exchangeBtn}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Beneficios de Platino */}
        <div style={{ background: 'var(--panel)', padding: '24px', borderRadius: '16px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
          <h2 style={{ fontFamily: 'Montserrat', fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
            {t.medals.brandBenefits}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
            {t.medals.benefitsSubtitle}
          </p>

          {benefits.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              No hay beneficios activos en este momento.
            </div>
          ) : (
            benefits.map(b => (
              <div key={b.id} style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1.5px dashed var(--platinum)',
                background: 'rgba(167, 139, 250, 0.08)',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{b.name || b.title}</strong>
                  <span style={{ fontSize: '11px', fontWeight: 800, background: 'var(--platinum)', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>
                    {b.costPlatinum || b.costMedals?.amount || 5} ⬡ Platino
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 600, marginTop: '2px' }}>{b.sponsorName}</div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>{b.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}