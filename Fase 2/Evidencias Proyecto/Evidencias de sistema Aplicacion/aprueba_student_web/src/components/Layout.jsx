import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, lang, setLang, t } = useTheme();
  const navigate = useNavigate();

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'E';
  const planLabel = user?.plan === 'all'
    ? 'Todas las Pruebas'
    : (user?.plan === 'uni' ? '1 Prueba Ilimitada' : 'Plan Gratis');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NAV_ITEMS = [
    { path: '/', label: t.nav.home, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/practicar', label: t.nav.practice, icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
    { path: '/medallas', label: t.nav.medals, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { path: '/grupos', label: t.nav.groups, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { path: '/tutores', label: t.nav.tutors, icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
    { path: '/comunidad', label: t.nav.community, icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { path: '/plan', label: t.nav.plan, icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { path: '/ajustes', label: t.nav.settings, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Sidebar Oficial con tokens semánticos */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--side)',
        color: 'var(--side-ink)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxShadow: 'var(--shadow)',
        flexShrink: 0
      }}>
        <div style={{
          padding: '24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
            <polygon points="3,27 9,6 13,6 8,27" fill="#ffffff" />
            <polygon points="27,27 21,6 17,6 22,27" fill="#ffffff" />
            <rect x="7" y="14" width="16" height="4" rx="1" fill="#ffffff" />
            <rect x="12" y="14" width="6" height="10" rx="1" fill="var(--cta)" />
            <polygon points="15,5 12,10 18,10" fill="var(--cta)" />
          </svg>
          <span style={{
            fontFamily: 'Montserrat',
            fontWeight: 800,
            fontSize: '20px',
            color: '#FFFFFF',
            letterSpacing: '-0.5px'
          }}>
            Aprueba
          </span>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--side-mut)',
            fontWeight: 700,
            padding: '8px 12px',
            fontFamily: 'Montserrat'
          }}>
            {t.nav.principal}
          </div>

          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                color: isActive ? '#FFFFFF' : 'var(--side-ink)',
                backgroundColor: isActive ? 'var(--side-act)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--cta)' : '3px solid transparent',
                marginBottom: '4px',
                transition: 'all 0.15s ease'
              })}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer del usuario en el sidebar */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--cta)',
              color: 'var(--cta-ink)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontFamily: 'Montserrat',
              flexShrink: 0
            }}>
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user?.name || 'Estudiante'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--side-mut)' }}>
                {planLabel}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title={t.nav.logout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--side-mut)',
              cursor: 'pointer',
              padding: '6px',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '6px'
            }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: 'var(--bg)' }}>
        <header style={{
          height: '64px',
          padding: '0 32px',
          backgroundColor: 'var(--panel)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
            Ecosistema Digital PAES 2026
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Selector de Idioma */}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                backgroundColor: 'var(--soft)',
                color: 'var(--ink)',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>

            {/* Alternador Modo Claro / Oscuro */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
              style={{
                background: 'var(--soft)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Racha */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--chip)',
              border: '1px solid var(--line)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '13px',
              color: 'var(--ink)'
            }}>
              🔥 {user?.streak ?? 1} {t.nav.streak}
            </span>
          </div>
        </header>

        <main style={{ padding: '32px', maxWidth: '1100px', width: '100%', margin: '0 auto', flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}