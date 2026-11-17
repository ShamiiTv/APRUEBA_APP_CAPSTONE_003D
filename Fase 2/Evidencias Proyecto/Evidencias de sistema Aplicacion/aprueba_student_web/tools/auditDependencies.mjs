import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// Temporary, narrowly scoped exception; see DEPENDENCY_EXCEPTION_2026-11-17.md.
const advisory='https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
function audit(extra=[]){
 const run=spawnSync(process.execPath,[process.env.npm_execpath,'audit','--json',...extra],{encoding:'utf8'});
 if(run.error||![0,1].includes(run.status))throw Error('Dependency audit could not complete');
 const result=JSON.parse(run.stdout);
 if(result.error||!result.metadata?.vulnerabilities)throw Error('Dependency audit returned an invalid response');
 return result;
}
function verify(){
 const production=audit(['--omit=dev']);
 if(production.metadata.vulnerabilities.total!==0)throw Error('Production dependency vulnerabilities found; inspect npm audit --omit=dev');
 const full=audit();
 if(full.metadata.vulnerabilities.total===0){console.log('All dependency audits passed.');return;}
 const vulnerabilities=full.vulnerabilities||{};
 const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
 if(Date.now()>Date.parse('2026-12-02T00:00:00Z')||lock.packages?.['node_modules/picomatch']?.version!=='4.0.7')throw Error('Temporary development-only exception requires review');
 function covered(name,seen=new Set()){
   if(seen.has(name))return false;
   seen.add(name);
   const item=vulnerabilities[name];
   return item?.via?.length>0&&item.via.every(cause=>typeof cause==='string'?covered(cause,new Set(seen)):cause.name==='picomatch'&&cause.url===advisory&&cause.range==='<=4.0.7');
 }
 if(!Object.keys(vulnerabilities).every(name=>covered(name)))throw Error('Unaccepted dependency vulnerability found; inspect npm audit');
 console.warn('::warning title=Unpatched development dependency::GHSA-fc5q-39xc-vjpf affects build-time picomatch 4.0.7. Production audit passed. Exception expires 2026-12-02; see the documented assessment.');
}
try{verify();}catch(error){console.error(error.message);process.exitCode=1;}
