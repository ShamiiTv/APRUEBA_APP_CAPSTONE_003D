export const TIERS = ['bronze', 'silver', 'gold', 'diamond', 'platinum'];
export function medalError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
export function balances(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw medalError('Saldo de medallas inválido', 409);
  return Object.fromEntries(TIERS.map(tier => {
    const amount = raw[tier] ?? 0;
    if (!Number.isSafeInteger(amount) || amount < 0) throw medalError('Saldo de medallas inválido', 409);
    return [tier, amount];
  }));
}
export function operation(body, type) {
  const fields = type === 'exchange' ? ['requestId', 'fromTier'] : ['requestId', 'benefitId'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !fields.includes(key))) throw medalError('Solicitud inválida');
  if (typeof body.requestId !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/.test(body.requestId)) throw medalError('Identificador de solicitud inválido');
  if (type === 'exchange' && !TIERS.slice(0, -1).includes(body.fromTier)) throw medalError('Nivel de canje inválido');
  if (type === 'benefit' && (typeof body.benefitId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(body.benefitId))) throw medalError('Beneficio inválido');
  return { ...body, type };
}
export function benefitTerms(benefit) {
  if (!Number.isSafeInteger(benefit.costPlatinum) || benefit.costPlatinum < 1 || !Number.isSafeInteger(benefit.stock) || benefit.stock < 0) throw medalError('El beneficio no tiene condiciones válidas de canje', 409);
  return { cost: benefit.costPlatinum, stock: benefit.stock };
}
