export function subscriptionEnd(user) {
  const raw=user?.currentPeriodEnd;
  if(raw && typeof raw==='object' && ('_seconds' in raw || 'seconds' in raw)) return new Date((raw._seconds ?? raw.seconds)*1000);
  return new Date(raw || 0);
}
export function hasTutorAccess(user, now=new Date()) {
  return user?.plan==='all' && user?.quota?.unlimited===true && subscriptionEnd(user)>now;
}
export const SUBJECTS=[['m1','Matemática M1'],['m2','Matemática M2'],['lectora','Competencia Lectora'],['cien','Ciencias'],['hist','Historia']];
