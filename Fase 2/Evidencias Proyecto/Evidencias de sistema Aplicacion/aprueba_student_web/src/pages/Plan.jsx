import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Plan() {
  const { user, updateUserState } = useAuth();
  const { t } = useTheme();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [subscribingId, setSubscribingId] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    apiFetch('/plans')
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : (res.data?.plans || []);
        setPlans(items);
      })
      .catch((err) => {
        console.error('Error cargando planes:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId) => {
    setSubscribingId(planId);
    setMsg(null);

    try {
      const res = await apiFetch('/plans/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId, billingCycle })
      });

      if (res.data?.user) {
        updateUserState(res.data.user);
        setMsg({ text: res.data.message || 'Plan actualizado con éxito', type: 'success' });
      }
    } catch (err) {
      setMsg({ text: err.message || 'Error al procesar el cambio de plan', type: 'error' });
    } finally {
      setSubscribingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Montserrat', fontSize: '28px', fontWeight: 800, color: 'var(--ink)' }}>
          {t.plan.title}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px', marginTop: '8px' }}>
          {t.plan.subtitle}
        </p>

        {/* Selector de ciclo de facturación */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: 'var(--soft)',
          border: '1px solid var(--line)',
          padding: '4px',
          borderRadius: '12px',
          marginTop: '20px'
        }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              fontFamily: 'Montserrat',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: billingCycle === 'monthly' ? 'var(--panel)' : 'transparent',
              color: billingCycle === 'monthly' ? 'var(--ink)' : 'var(--muted)',
              boxShadow: billingCycle === 'monthly' ? 'var(--shadow)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {t.plan.monthlyBilling}
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              fontFamily: 'Montserrat',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: billingCycle === 'yearly' ? 'var(--panel)' : 'transparent',
              color: billingCycle === 'yearly' ? 'var(--ink)' : 'var(--muted)',
              boxShadow: billingCycle === 'yearly' ? 'var(--shadow)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {t.plan.yearlyBilling}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '14px 20px',
          borderRadius: '12px',
          backgroundColor: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: msg.type === 'success' ? 'var(--accent)' : 'var(--danger)',
          fontWeight: 700,
          fontSize: '13px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
          {t.plan.loading}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          alignItems: 'stretch'
        }}>
          {plans.map((p) => {
            const isCurrent = user?.plan === p.id;
            const isPopular = p.popular;
            const isProcessing = subscribingId === p.id;
            const price = billingCycle === 'yearly' ? p.price?.yearly : p.price?.monthly;

            return (
              <div
                key={p.id}
                style={{
                  backgroundColor: 'var(--panel)',
                  borderRadius: '20px',
                  padding: '32px 24px',
                  border: isPopular ? '2.5px solid var(--cta)' : '1px solid var(--line)',
                  boxShadow: 'var(--shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {isPopular && (
                  <span style={{
                    position: 'absolute',
                    top: '-13px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--cta)',
                    color: 'var(--cta-ink)',
                    fontSize: '11px',
                    fontFamily: 'Montserrat',
                    fontWeight: 800,
                    padding: '4px 14px',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {t.plan.popularTag}
                  </span>
                )}

                <h3 style={{ fontFamily: 'Montserrat', fontSize: '20px', fontWeight: 800, color: 'var(--ink)', marginBottom: '8px' }}>
                  {p.name}
                </h3>

                <div style={{ margin: '16px 0 24px 0' }}>
                  <span style={{ fontFamily: 'Montserrat', fontSize: '32px', fontWeight: 800, color: 'var(--ink)' }}>
                    ${price?.toLocaleString('es-CL')}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
                    {billingCycle === 'yearly' ? t.plan.yearUnit : t.plan.monthUnit}
                  </span>
                </div>

                <div style={{ flex: 1, marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
                    {t.plan.featuresIncluded}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {p.featureDetails?.map((f, i) => {
                      const translatedFeature = t.plan.features[f.name] || f.name;
                      return (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)' }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 800 }}>✓</span>
                          {translatedFeature}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <button
                  disabled={isCurrent || isProcessing}
                  onClick={() => handleSubscribe(p.id)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    fontFamily: 'Montserrat',
                    fontWeight: 800,
                    fontSize: '13px',
                    backgroundColor: isCurrent ? 'var(--soft)' : (isPopular ? 'var(--cta)' : 'var(--brand)'),
                    color: isCurrent ? 'var(--muted)' : (isPopular ? 'var(--cta-ink)' : '#FFFFFF'),
                    cursor: (isCurrent || isProcessing) ? 'default' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isProcessing ? t.plan.processingBtn : (isCurrent ? t.plan.currentPlanBtn : t.plan.selectPlanBtn)}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}