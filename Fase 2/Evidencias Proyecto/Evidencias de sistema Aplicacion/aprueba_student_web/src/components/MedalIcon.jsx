const COLORS = { bronze: '#CD7F32', silver: '#94A3B8', gold: '#F5B041', diamond: '#38BDF8', platinum: '#A78BFA' };

export default function MedalIcon({ tier, className = '' }) {
  const color = COLORS[tier] || COLORS.bronze;
  return <svg className={`medal-icon ${className}`} width="64" height="72" viewBox="0 0 64 72" fill="none" aria-hidden="true" focusable="false">
    {tier === 'diamond' ? <><path d="M14 18h36l10 16-28 30L4 34z" fill={color} /><path d="M14 18l8 16 10-16 10 16 8-16M4 34h56M22 34l10 30 10-30" stroke="white" strokeOpacity=".65" strokeWidth="2" /></> : tier === 'platinum' ? <><path d="M32 8l22 12v28L32 62 10 48V20z" fill={color} /><path d="M32 17l14 8v18l-14 9-14-9V25z" stroke="white" strokeOpacity=".7" strokeWidth="2" /><path d="m32 24 3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="white" /></> : <><path d="m15 3 17 5-9 28-12-9z" fill="#1A365D" /><path d="m49 3-17 5 9 28 12-9z" fill="#42678F" /><circle cx="32" cy="44" r="23" fill={color} /><circle cx="32" cy="44" r="18" stroke="white" strokeOpacity=".55" strokeWidth="2" /><path d="m32 31 4 8 9 1-7 7 2 9-8-5-8 5 2-9-7-7 9-1z" fill="white" fillOpacity=".9" /></>}
  </svg>;
}
