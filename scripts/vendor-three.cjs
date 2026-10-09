// Explicit, reproducible local asset download. No npm install or system changes.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const version='0.184.0';
const assets=[['build/three.module.min.js','three.module.js'],['build/three.core.min.js','three.core.min.js'],['examples/jsm/controls/OrbitControls.js','OrbitControls.js'],['LICENSE','LICENSE.three.txt']];
(async()=>{
  const dir=path.join(__dirname,'../vendor');await fs.mkdir(dir,{recursive:true});
  const records=[];
  for(const [source,target] of assets){
    const url=`https://cdn.jsdelivr.net/npm/three@${version}/${source}`;
    const response=await fetch(url);if(!response.ok)throw new Error(`${response.status}: ${source}`);
    let data=await response.text();
    if(target==='OrbitControls.js')data=data.replace("from 'three'","from './three.module.js'");
    await fs.writeFile(path.join(dir,target),data);
    records.push({file:target,source:url,sha256:crypto.createHash('sha256').update(data).digest('hex')});
    console.log(`${target}: ${Buffer.byteLength(data)} bytes`);
  }
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({package:'three',version,assets:records},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
