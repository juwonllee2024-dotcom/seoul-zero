const test=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
test('server serves only application assets and rejects other paths and writes',async()=>{
  const child=spawn(process.execPath,[path.join(__dirname,'../server.cjs')],{env:{...process.env,PORT:'4189'},stdio:['ignore','pipe','pipe'],windowsHide:true});
  try{
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('server startup timeout')),15000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{if(code){clearTimeout(timer);reject(new Error(`exit ${code}`));}});});
    for(const file of ['','index.html','commerce.js','engine.js','app.js','style.css','city.js','world.css','world-model.js','world-host.js','world3d.mjs','vendor/three.module.js','vendor/three.core.min.js','vendor/OrbitControls.js']){
      const response=await fetch(`http://127.0.0.1:4189/${file}`);assert.equal(response.status,200);assert.ok((await response.text()).length>100);
    }
    for(const file of ['server.cjs','package.json','../README.md','%2e%2e%2fREADME.md'])assert.equal((await fetch(`http://127.0.0.1:4189/${file}`)).status,404);
    assert.equal((await fetch('http://127.0.0.1:4189/',{method:'POST'})).status,405);
    assert.equal((await fetch('http://127.0.0.1:4189/',{method:'HEAD'})).status,200);
  }finally{child.kill();}
});
