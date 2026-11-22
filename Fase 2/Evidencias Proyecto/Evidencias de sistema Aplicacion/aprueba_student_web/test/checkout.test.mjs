import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {uiText} from '../src/i18n/uiText.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {skeletonForPath} from '../src/components/routeSkeleton.js';
const source=readFileSync(new URL('../public/paypal-checkout.js',import.meta.url),'utf8');
function setup(blocked=false){
 let callback,dispatched=0;
 const popup={closed:false,location:{href:''},focus(){},close(){this.closed=true;}};
 const window={open:()=>blocked?null:popup,addEventListener:(name,fn)=>{callback=fn;},dispatchEvent:()=>{dispatched++;}};
 class CustomEvent{constructor(type,options){this.type=type;this.detail=options.detail;}}
 runInNewContext(source,{window,location:{origin:'https://aprueba.example'},screen:{availHeight:900},screenX:0,screenY:0,outerWidth:1280,outerHeight:900,URL,CustomEvent});
 return {window,popup,callback,get dispatched(){return dispatched;}};
}
test('checkout popup preserves the parent and only navigates to PayPal Sandbox',()=>{
 const env=setup();assert.equal(env.window.apruebaCheckout.prepare(),true);
 assert.equal(env.window.apruebaCheckout.navigate('https://www.sandbox.paypal.com/checkout'),true);
 assert.equal(env.popup.location.href,'https://www.sandbox.paypal.com/checkout');
 for(const url of ['https://www.paypal.com/','https://evil.example/','javascript:alert(1)'])assert.equal(env.window.apruebaCheckout.navigate(url),false);
});
test('blocked popups return a recoverable result',()=>{const env=setup(true);assert.equal(env.window.apruebaCheckout.open('https://www.sandbox.paypal.com/checkout'),false);});
test('return notifications require the exact parent origin and popup source',()=>{
 const env=setup();env.window.apruebaCheckout.prepare();
 env.callback({origin:'https://evil.example',source:env.popup,data:{type:'aprueba:paypal-return'}});assert.equal(env.dispatched,0);
 env.callback({origin:'https://aprueba.example',source:{},data:{type:'aprueba:paypal-return'}});assert.equal(env.dispatched,0);
 env.callback({origin:'https://aprueba.example',source:env.popup,data:{type:'aprueba:paypal-return'}});assert.equal(env.dispatched,1);
});
test('route skeletons match the destination instead of always showing home',()=>{
 for(const [path,kind] of [['/arena','arena'],['/plan','plans'],['/comunidad','feed'],['/tutores','tutors'],['/plan-estudio','study-plan'],['/ajustes','form'],['/notificaciones','notifications']])assert.equal(skeletonForPath(path),kind);
});

test('literal API validation errors have English interface translations',()=>{
 function files(directory){return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(directory,entry.name)):[join(directory,entry.name)]);}
 const messages=new Set();
 for(const file of files(fileURLToPath(new URL('../../aprueba_api/src/',import.meta.url))).filter(file=>file.endsWith('.js'))){
   const source=readFileSync(file,'utf8');
   for(const match of source.matchAll(/(?:\.fail|problem)\(\s*'([^'\n]+)'/g))messages.add(match[1]);
 }
 assert.ok(messages.size>90);
 for(const message of messages)assert.notEqual(uiText('en',message),message,'Missing translation: '+message);
});
