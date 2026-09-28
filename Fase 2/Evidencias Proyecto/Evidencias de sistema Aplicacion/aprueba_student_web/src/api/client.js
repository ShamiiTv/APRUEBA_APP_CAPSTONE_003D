const API_BASE_URL = 'http://localhost:4000/api/v1';

export async function apiFetch(endpoint, options = {}) {
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

  const json = await response.json();

  if (!response.ok || json.error) {
    const errorMsg = json.error?.message || json.error || 'Error en la petición al servidor';
    throw new Error(errorMsg);
  }

  return json;
}