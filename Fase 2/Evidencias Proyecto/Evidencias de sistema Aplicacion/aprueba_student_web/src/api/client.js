const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';
let refreshPending;

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
}

export function saveTokens(tokens) {
  localStorage.setItem('token', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
}

export async function apiFetch(endpoint, options = {}, retry = true) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  // Corregido: antes buscaba 'access_token', debe ser 'token'
  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (response.status === 401 && token && retry && !['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'].includes(endpoint)) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      refreshPending ||= fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
      }).then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) { clearSession(); window.dispatchEvent(new Event('aprueba:session-ended')); }
          throw new Error(res.status === 401 ? 'Tu sesión expiró. Inicia sesión nuevamente.' : 'No se pudo renovar la sesión. Intenta nuevamente.');
        }
        const json = await res.json();
        // No restaurar una sesión si el usuario cerró sesión durante la petición.
        if (localStorage.getItem('refreshToken') !== refreshToken) throw new Error('La sesión cambió');
        saveTokens(json.data.tokens);
      }).finally(() => { refreshPending = undefined; });
      await refreshPending;
      return apiFetch(endpoint, options, false);
    }
    clearSession();
    window.dispatchEvent(new Event('aprueba:session-ended'));
  }
  if (response.status === 401 && token && !retry) {
    clearSession();
    window.dispatchEvent(new Event('aprueba:session-ended'));
  }
  const json = await response.json();

  if (!response.ok || json.error) {
    const errorMsg = json.error?.message || json.error || 'Error en la petición al servidor';
    throw Object.assign(new Error(errorMsg), { status: response.status, code: json.error?.code || json.error?.details?.code });
  }

  return json;
}
