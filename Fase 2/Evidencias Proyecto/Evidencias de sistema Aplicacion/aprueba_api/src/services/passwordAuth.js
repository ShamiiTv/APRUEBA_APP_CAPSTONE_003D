// Firebase administra contraseñas y envía los correos de recuperación.
export async function passwordRequest(action, payload) {
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (process.env.NODE_ENV === 'production' && emulator) {
    throw Object.assign(new Error('El emulador de autenticación no puede usarse en producción'), { status: 503 });
  }
  const key = process.env.FIREBASE_WEB_API_KEY || (emulator ? 'emulator-key' : '');
  if (!key) throw Object.assign(new Error('Falta configurar FIREBASE_WEB_API_KEY'), { status: 503 });
  const base = emulator ? `http://${emulator}/identitytoolkit.googleapis.com/v1` : 'https://identitytoolkit.googleapis.com/v1';
  const response = await fetch(`${base}/accounts:${action}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Firebase-Locale': 'es' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error('No se pudo completar la autenticación'), { code: data.error?.message, status: 400 });
  }
  return data;
}

export function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}
