import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';

// Keep the exact body when a response is lost, including across a tab reload.
export function useSocialMutation(endpoint, scope) {
  const { user } = useAuth();
  const key = `social-pending:${user?.uid}:${scope}`;
  const [pending, setPending] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const guard = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async body => {
    if (guard.current) return null;
    guard.current = true; setBusy(true); setError('');
    const input = pending || { ...body, requestId: crypto.randomUUID() };
    setPending(input);
    try {
      sessionStorage.setItem(key, JSON.stringify(input));
      const response = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(input) });
      sessionStorage.removeItem(key);
      if (!mounted.current) return null;
      setPending(null);
      return response;
    } catch (cause) {
      if (!mounted.current) return null;
      if ([400,403,404,409].includes(cause.status)) {
        sessionStorage.removeItem(key); setPending(null);
        setError(cause.message);
      } else setError(`${cause.message} Reintenta la misma solicitud; no se duplicará.`);
      return null;
    } finally {
      guard.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return { pending, busy, error, run };
}
