const startupTimeout = window.setTimeout(() => {
  const message = document.getElementById('startup-message');
  if (message) message.textContent = 'La aplicación está tardando en abrir. Puedes continuar en la versión web.';
}, 12000);
window.addEventListener('flutter-first-frame', () => {
  window.clearTimeout(startupTimeout);
  document.getElementById('startup')?.remove();
}, { once: true });
