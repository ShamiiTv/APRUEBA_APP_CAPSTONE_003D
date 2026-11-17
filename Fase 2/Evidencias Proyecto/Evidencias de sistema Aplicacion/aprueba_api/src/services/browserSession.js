export const isBrowser=req=>['browser','mobile-browser'].includes(req.get?.('X-Aprueba-Client')||req.headers?.['x-aprueba-client']);
const cookieName=req=>(req.get?.('X-Aprueba-Client')||req.headers?.['x-aprueba-client'])==='mobile-browser'?'aprueba_refresh_mobile':'aprueba_refresh_web';
const options=()=>({httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/v1/auth'});
export function cookieRefresh(req){
 const name=cookieName(req);
 const item=(req.headers?.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='));
 if(!item)return null;
 try{return decodeURIComponent(item.slice(name.length+1));}catch{return null;}
}
export function clientTokens(req,res,tokens){
 if(!isBrowser(req))return tokens;
 res.cookie(cookieName(req),tokens.refreshToken,{...options(),maxAge:30*86400000});
 return {accessToken:tokens.accessToken};
}
export function clearBrowserSession(req,res){res.clearCookie(cookieName(req),options());}
export function refreshCredential(req){return cookieRefresh(req)||(typeof req.body?.refreshToken==='string'&&req.body.refreshToken.length<=4096?req.body.refreshToken:null);}
