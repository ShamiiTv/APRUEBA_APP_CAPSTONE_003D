import cors from 'cors';
import rateLimit from 'express-rate-limit';

export function allowedOrigin(origin, production=process.env.NODE_ENV==='production') {
 if(!origin)return true; // Native apps have no browser Origin header.
 const configured=(process.env.ALLOWED_ORIGINS||'https://aprueba.shamiiplay.com').split(',').map(v=>v.trim());
 if(configured.includes(origin))return true;
 if(!production){try{const u=new URL(origin);return ['http:','https:'].includes(u.protocol)&&['localhost','127.0.0.1','[::1]'].includes(u.hostname);}catch{return false;}}
 return false;
}
export const restrictedCors=()=>cors({credentials:true,origin:(origin,done)=>allowedOrigin(origin)?done(null,true):done(Object.assign(new Error('Origen no autorizado'),{status:403})),methods:['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],allowedHeaders:['Authorization','Content-Type','X-Aprueba-Client'],maxAge:600});
export function privateResponses(req,res,next){res.set('Cache-Control','no-store');res.set('Pragma','no-cache');next();}
export function rejectUnsupportedContent(req,res,next){
 if(['POST','PUT','PATCH','DELETE'].includes(req.method)&&Number(req.headers['content-length']||0)>0&&!req.is('application/json'))return res.status(415).json({data:null,error:{message:'Usa contenido JSON'},meta:null});
 next();
}
export function mutationLimiter(production=process.env.NODE_ENV==='production'){
 return rateLimit({windowMs:60000,limit:production?60:10000,standardHeaders:true,legacyHeaders:false,keyGenerator:req=>req.user.sub,skip:req=>!['POST','PUT','PATCH','DELETE'].includes(req.method),message:{data:null,error:{code:'WRITE_RATE_LIMITED',message:'Demasiadas operaciones. Espera un minuto.'},meta:null}});
}
export function safeError(err,req,res,next){
 const status=err.type==='entity.too.large'?413:err.type==='encoding.unsupported'?415:err instanceof SyntaxError&&'body' in err?400:[400,403,415].includes(err.status)?err.status:500;
 if(status===500)console.error(JSON.stringify({event:'request_failed',method:req.method,code:'INTERNAL_ERROR'}));
 res.status(status).json({data:null,error:{message:status===413?'Solicitud demasiado grande':status===400?'JSON o solicitud inválida':status===403?'Origen no autorizado':status===415?'Formato no permitido':'Error interno del servidor'},meta:null});
}
