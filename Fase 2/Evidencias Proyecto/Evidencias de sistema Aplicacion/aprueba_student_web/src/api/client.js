import {uiText} from '../i18n/uiText';
const API_BASE_URL=import.meta.env.VITE_API_BASE_URL||'/api/v1';
const marker='aprueba:session';
let accessToken, legacyRefresh, refreshPending,revision=0;
export const hasSession=()=>localStorage.getItem(marker)==='1'||!!localStorage.getItem('token');
export const readAccessToken=()=>accessToken;
export function clearSession(){revision++;accessToken=undefined;legacyRefresh=undefined;for(const key of [marker,'token','refreshToken'])localStorage.removeItem(key);}
export function saveTokens(tokens){accessToken=tokens.accessToken;legacyRefresh=tokens.refreshToken;localStorage.setItem(marker,'1');localStorage.removeItem('token');localStorage.removeItem('refreshToken');}
const headers={'Content-Type':'application/json','X-Aprueba-Client':'browser'};
const publicRoutes=['/auth/login','/auth/register','/auth/forgot-password','/auth/reset-password'];
async function renew(){
 if(refreshPending)return refreshPending;
 const started=revision,oldRefresh=legacyRefresh||localStorage.getItem('refreshToken');
 refreshPending=(async()=>{
  const res=await fetch(`${API_BASE_URL}/auth/refresh`,{method:'POST',credentials:'include',headers,body:JSON.stringify(oldRefresh?{refreshToken:oldRefresh}:{})});
  if(!res.ok){if(res.status===401){clearSession();window.dispatchEvent(new Event('aprueba:session-ended'));}throw new Error(res.status===401?'Tu sesión expiró. Inicia sesión nuevamente.':'No se pudo renovar la sesión. Intenta nuevamente.');}
  const json=await res.json();if(started!==revision)throw new Error('La sesión cambió');saveTokens(json.data.tokens);
 })().finally(()=>{refreshPending=undefined;});
 return refreshPending;
}
export async function logoutRemote(){
 const token=accessToken,refresh=legacyRefresh||localStorage.getItem('refreshToken');
 return fetch(`${API_BASE_URL}/auth/logout`,{method:'POST',credentials:'include',headers:{...headers,...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(refresh?{refreshToken:refresh}:{})});
}
export async function apiFetch(endpoint,options={},retry=true){
 const isPublic=publicRoutes.includes(endpoint);
 if(!isPublic&&hasSession()&&!accessToken)await renew();
 const token=isPublic?null:accessToken;
 const res=await fetch(`${API_BASE_URL}${endpoint}`,{...options,credentials:'include',headers:{...headers,...(token?{Authorization:`Bearer ${token}`}:{}) ,...options.headers}});
 const json=await res.json(),credentialRejected=(json.error?.code||json.error?.details?.code)==='AUTH_INVALID_CREDENTIALS';
 if(res.status===401&&!credentialRejected&&token&&!isPublic){
  if(retry){await renew();return apiFetch(endpoint,options,false);}
  clearSession();window.dispatchEvent(new Event('aprueba:session-ended'));
 }
 if(!res.ok||json.error){const message=json.error?.message||json.error||'Error en la petición al servidor';throw Object.assign(new Error(uiText(localStorage.getItem('lang'),message)),{status:res.status,code:json.error?.code||json.error?.details?.code});}
 return json;
}
