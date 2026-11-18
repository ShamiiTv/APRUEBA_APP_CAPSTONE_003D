/* Shared by the web and Flutter web. A return event only triggers server verification. */
(() => {
  let popup;
  const allowed = value => { try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'www.sandbox.paypal.com' && !u.username && !u.password; } catch { return false; } };
  window.apruebaCheckout = {
    prepare(locale) {
      try{localStorage.setItem('aprueba:checkout-locale',['en','es'].includes(locale)?locale:document.documentElement.lang==='en'?'en':'es');}catch{ /* Storage may be unavailable; the payment popup still works. */ }
      if (popup && !popup.closed) { popup.focus(); return true; }
      const width = 500, height = Math.min(760, screen.availHeight - 60);
      popup = window.open('/paypal-return.html?result=opening', 'aprueba-paypal', `popup=yes,width=${width},height=${height},left=${Math.max(0, Math.round(screenX + (outerWidth - width) / 2))},top=${Math.max(0, Math.round(screenY + (outerHeight - height) / 2))}`);
      return !!popup;
    },
    navigate(url) { if (!allowed(url) || !popup || popup.closed) return false; popup.location.href = url; popup.focus(); return true; },
    open(url) { return this.prepare() && this.navigate(url); },
    close() { if (popup && !popup.closed) popup.close(); popup = null; },
  };
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== popup || event.data?.type !== 'aprueba:paypal-return') return;
    window.dispatchEvent(new CustomEvent('aprueba:checkout-return', {detail: {cancelled: event.data.cancelled === true}}));
  });
})();
