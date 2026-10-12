import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAuthLimiters } from '../src/middleware/authRateLimiters.js';
test('Successful logins and another account do not consume the failed-login budget', async () => {
  const app=express();app.use(express.json());
  const {loginLimiter,registerLimiter}=createAuthLimiters(true);
  app.post('/login',loginLimiter,(req,res)=>res.status(req.body.fail?401:200).json({ok:!req.body.fail}));
  app.post('/register',registerLimiter,(req,res)=>res.json({ok:true}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=async(path,email,fail=false)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,fail})});await r.text();return r.status;};
  try{
    for(let i=0;i<12;i++)assert.equal(await post('/login','test@example.com'),200);
    for(let i=0;i<10;i++)assert.equal(await post('/login','test@example.com',true),401);
    assert.equal(await post('/login','TEST@example.com',true),429);
    assert.equal(await post('/login','other@example.com'),200);
    assert.equal(await post('/register','new@example.com'),200);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
