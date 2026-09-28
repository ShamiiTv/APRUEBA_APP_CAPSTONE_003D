import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../api/client';

export default function Settings() {
  const { user, updateUserState } = useAuth();
  const { theme, setTheme, lang, setLang, t } = useTheme();

  const [dailyReminder, setDailyReminder] = useState(user?.dailyReminder ?? true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          theme,
          lang,
          dailyReminder,
        }),
      });

      if (res.data) {
        updateUserState(res.data);
      }
      setSuccess(true);
    } catch (err) {
      console.error('Error guardando ajustes:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand)' }}>
          {t.settings.title}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
          {t.settings.subtitle}
        </p>
      </div>

      {success && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          backgroundColor: 'rgba(16,185,129,0.1)',
          color: 'var(--exito)',
          fontWeight: 700,
          fontSize: '13px',
          marginBottom: '20px',
        }}>
          {t.settings.savedSuccess}
        </div>
      )}

      <form onSubmit={handleSave} style={{
        backgroundColor: 'var(--panel)',
        padding: '32px',
        borderRadius: '16px',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* Selector de Modo Claro / Oscuro */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
            {t.settings.themeLabel}
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setTheme('light')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: `2px solid ${theme === 'light' ? 'var(--brand)' : 'var(--line)'}`,
                backgroundColor: theme === 'light' ? 'var(--chip)' : 'var(--bg)',
                color: 'var(--ink)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ☀️ {t.settings.light}
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: `2px solid ${theme === 'dark' ? 'var(--cta)' : 'var(--line)'}`,
                backgroundColor: theme === 'dark' ? 'var(--chip)' : 'var(--bg)',
                color: 'var(--ink)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              🌙 {t.settings.dark}
            </button>
          </div>
        </div>

        {/* Idioma */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
            {t.settings.languageLabel}
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid var(--line)',
              backgroundColor: 'var(--bg)',
              color: 'var(--ink)',
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="es">Español (Chile / PAES)</option>
            <option value="en">English (International)</option>
          </select>
        </div>

        {/* Recordatorio diario */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
              {t.settings.dailyReminder}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              Mantén tu racha diaria activa para acumular medallas.
            </div>
          </div>
          <input
            type="checkbox"
            checked={dailyReminder}
            onChange={(e) => setDailyReminder(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: 'var(--brand)', cursor: 'pointer' }}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            backgroundColor: 'var(--brand)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '14px',
            fontFamily: 'Montserrat',
            fontWeight: 800,
            fontSize: '14px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            marginTop: '8px',
          }}
        >
          {saving ? 'Guardando...' : t.settings.saveChanges}
        </button>
      </form>
    </div>
  );
}