// Sandbox only. There is deliberately no configurable live API hostname.
const BASE = 'https://api-m.sandbox.paypal.com';
let cachedToken;
export const paypalEnabled = () => process.env.PAYMENTS_MODE === 'paypal-sandbox';
const unavailable = () => Object.assign(new Error('No se pudo conectar con PayPal. Intenta nuevamente.'), {status:503});

export function sandboxApprovalUrl(value) {
  try { const url=new URL(value); return url.protocol==='https:' && url.hostname==='www.sandbox.paypal.com' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

export async function paypalRequest(path, {method='GET',body,requestId}={}) {
  if(!paypalEnabled() || !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) throw unavailable();
  if(!path.startsWith('/v1/') || path.includes('://'))throw unavailable();
  if(!cachedToken || cachedToken.until<Date.now()) {
    const result=await fetch(`${BASE}/v1/oauth2/token`,{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
    if(!result.ok)throw unavailable();
    const token=await result.json();
    cachedToken={value:token.access_token,until:Date.now()+(Number(token.expires_in)-60)*1000};
  }
  const response=await fetch(BASE+path,{method,headers:{Authorization:`Bearer ${cachedToken.value}`,'Content-Type':'application/json',...(requestId?{'PayPal-Request-Id':requestId}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  if(!response.ok){if(response.status===401)cachedToken=null;throw unavailable();}
  return response.status===204 ? null : response.json();
}

export function paypalCatalog() {
  return {
    uni:{providerPlanId:process.env.PAYPAL_PLAN_UNI,amount:'0.99',currency:'USD'},
    all:{providerPlanId:process.env.PAYPAL_PLAN_ALL,amount:'4.99',currency:'USD'},
  };
}

// Verify a completed payment, not merely approval or the browser return URL.
export function paidPeriod(subscription,transactions,record,now=new Date()) {
  if(subscription.id!==record.id || subscription.plan_id!==record.providerPlanId || subscription.custom_id!==record.uid)throw unavailable();
  if(!['ACTIVE','CANCELLED','SUSPENDED','EXPIRED'].includes(subscription.status))return null;
  const payments=(transactions.transactions||[]).filter(p=>p.status==='COMPLETED' && p.amount_with_breakdown?.gross_amount?.currency_code===record.currency && p.amount_with_breakdown.gross_amount.value===record.amount && typeof p.id==='string' && /^[A-Za-z0-9-]+$/.test(p.id) && Number.isFinite(Date.parse(p.time)) && new Date(p.time)<=now).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
  const payment=payments[0];if(!payment)return null;
  const start=new Date(payment.time),end=new Date(start),day=end.getUTCDate();
  end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+1);
  end.setUTCDate(Math.min(day,new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate()));
  return end>now ? {paymentId:payment.id,start,end} : null;
}
