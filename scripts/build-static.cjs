const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
const files=["index.html","style.css","commerce.js","engine.js","play-guide.js","city.js","app.js","world.css","world-model.js","world-host.js","world3d.mjs","vendor/three.module.js","vendor/three.core.min.js","vendor/OrbitControls.js","vendor/LICENSE.three.txt"];
function walk(d,prefix=''){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name),prefix+e.name+'/'):[prefix+e.name]);}
if(fs.existsSync(out))for(const file of walk(out))if(!files.includes(file))throw new Error('Unexpected file in static output; refusing to publish');
for(const file of files){
  const source=path.join(root,file),target=path.join(out,file);
  if(fs.lstatSync(source).isSymbolicLink()||!fs.realpathSync(source).startsWith(fs.realpathSync(root)+path.sep))throw new Error('Asset escapes project root');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(source,target);
}
console.log('Static game built: '+files.length+' reviewed public assets');
