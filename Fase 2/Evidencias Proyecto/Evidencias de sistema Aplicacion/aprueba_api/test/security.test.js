import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {allowedOrigin,mutationLimiter} from '../src/middleware/security.js';
import {clientTokens,cookieRefresh,isBrowser} from '../src/services/browserSession.js';
import {profileView} from '../src/services/profileView.js';
test('production CORS allows only approved origins and native clients',()=>{
 assert.equal(allowedOrigin(undefined,true),true);assert.equal(allowedOrigin('https://aprueba.shamiiplay.com',true),true);
 for(const origin of ['null','https://evil.example','https://aprueba.shamiiplay.com.evil.example','http://localhost:5179'])assert.equal(allowedOrigin(origin,true),false);
 assert.equal(allowedOrigin('http://localhost:5179',false),true);
});
test('browser cookies are Secure HttpOnly host-only Strict and never return refresh in JSON',()=>{
 const env=process.env.NODE_ENV;process.env.NODE_ENV='production';try{
 let cookie;const req={headers:{'x-aprueba-client':'browser'}},res={cookie:(...args)=>cookie=args};
 assert.deepEqual(clientTokens(req,res,{accessToken:'a',refreshToken:'secret'}),{accessToken:'a'});
 assert.equal(cookie[0],'aprueba_refresh_web');assert.equal(cookie[2].secure,true);assert.equal(cookie[2].httpOnly,true);assert.equal(cookie[2].sameSite,'strict');assert.equal(cookie[2].domain,undefined);assert.equal(cookie[2].path,'/api/v1/auth');
 assert.equal(isBrowser({headers:{'x-aprueba-client':'mobile-browser'}}),true);
 assert.equal(cookieRefresh({headers:{cookie:'aprueba_refresh_web=%invalid','x-aprueba-client':'browser'}}),null);
 assert.deepEqual(clientTokens({headers:{}},res,{accessToken:'a',refreshToken:'native'}),{accessToken:'a',refreshToken:'native'});
 }finally{process.env.NODE_ENV=env;}
});
test('profile projection excludes legacy credentials and unknown internal fields',()=>{
 const result=profileView({name:'Fixture',email:'fixture@example.test',plan:'free',password:'x',passwordHash:'hash',refreshToken:'secret',roles:['admin'],privateNotes:'internal'});
 assert.deepEqual(result,{name:'Fixture',email:'fixture@example.test',plan:'free'});
});
test('write throttling isolates users and leaves reads available',async()=>{
 const app=express();app.use((req,res,next)=>{req.user={sub:req.get('X-Fixture-User')||'a'};next();},mutationLimiter(true));app.all('/',(req,res)=>res.json({ok:true}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url=`http://127.0.0.1:${server.address().port}/`;
 try{for(let i=0;i<60;i++)assert.equal((await fetch(url,{method:'POST'})).status,200);assert.equal((await fetch(url,{method:'POST'})).status,429);assert.equal((await fetch(url)).status,200);assert.equal((await fetch(url,{method:'POST',headers:{'X-Fixture-User':'b'}})).status,200);}finally{await new Promise(r=>server.close(r));}
});
