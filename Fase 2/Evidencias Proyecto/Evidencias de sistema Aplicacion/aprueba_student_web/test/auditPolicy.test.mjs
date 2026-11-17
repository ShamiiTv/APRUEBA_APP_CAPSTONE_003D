import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../tools/auditDependencies.mjs',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replaceAll('import.meta.url',JSON.stringify(import.meta.url));
const advisory={name:'picomatch',url:'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',range:'<=4.0.7'};
const clean={metadata:{vulnerabilities:{total:0}},vulnerabilities:{}};
const known={metadata:{vulnerabilities:{total:2}},vulnerabilities:{picomatch:{via:[advisory]},vite:{via:['picomatch']}}};
function check(production=clean,full=known,{expired=false,version='4.0.7',registryError=false}={}){
 const process={execPath:'node',env:{npm_execpath:'fixture'},exitCode:0};
 let calls=0;
 class Clock extends Date {static now(){return Date.parse(expired?'2026-12-03T00:00:00Z':'2026-11-17T00:00:00Z');}}
 runInNewContext(source,{URL,Date:Clock,process,console:{log(){},warn(){},error(){}},readFileSync:()=>JSON.stringify({packages:{'node_modules/picomatch':{version}}}),spawnSync:()=>{const data=calls++===0?production:full;return registryError?{status:1,stdout:JSON.stringify({error:{code:'UNAVAILABLE'}})}:{status:data.metadata.vulnerabilities.total?1:0,stdout:JSON.stringify(data)};}});
 return process.exitCode;
}
test('audit exception accepts only the documented development chain',()=>assert.equal(check(),0));
test('audit exception never accepts a production finding',()=>assert.equal(check(known),1));
test('audit exception rejects other advisories and unknown dependency versions',()=>{
 assert.equal(check(clean,{...known,vulnerabilities:{...known.vulnerabilities,other:{via:[{name:'other',url:'https://github.com/advisories/GHSA-other',range:'*'}]}}}),1);
 assert.equal(check(clean,known,{version:'4.0.6'}),1);
});
test('audit exception expires and fails closed when the registry cannot be audited',()=>{
 assert.equal(check(clean,known,{expired:true}),1);
 assert.equal(check(clean,known,{registryError:true}),1);
});
