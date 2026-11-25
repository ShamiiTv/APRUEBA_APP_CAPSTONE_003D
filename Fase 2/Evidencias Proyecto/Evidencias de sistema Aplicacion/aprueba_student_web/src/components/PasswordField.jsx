import { useState } from 'react';
import { useTheme } from '../context/useTheme';

export default function PasswordField({ style, ...props }) {
  const [visible, setVisible] = useState(false);
  const { lang } = useTheme();
  const action = lang === 'en'
    ? (visible ? 'Hide password' : 'Show password')
    : (visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  return (
    <div style={{ position: 'relative' }}>
      <input {...props} type={visible ? 'text' : 'password'}
        style={{ ...style, boxSizing: 'border-box', paddingRight: 48 }} />
      <button type="button" aria-label={action} title={action} aria-controls={props.id}
        onClick={() => setVisible(value => !value)}
        style={{ position: 'absolute', right: 3, top: 2, bottom: 2, width: 42,
          display: 'grid', placeItems: 'center', background: 'transparent', color: 'var(--ink)',
          border: 0, borderRadius: 8, padding: 0, cursor: 'pointer' }}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  );
}
