const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const expected=["index.html","style.css","commerce.js","engine.js","play-guide.js","city.js","app.js","world.css","world-model.js","world-host.js","world3d.mjs","vendor/three.module.js","vendor/three.core.min.js","vendor/OrbitControls.js","vendor/LICENSE.three.txt"];
function walk(d,prefix=''){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name),prefix+e.name+'/'):[prefix+e.name]);}
test('public build exports exactly playable assets, never source documentation or local state',()=>{
  assert.doesNotThrow(()=>require(path.join(root,'scripts/build-static.cjs')),'static build must succeed');
  assert.deepEqual(walk(path.join(root,'dist')).sort(),[...expected].sort());
  for(const file of expected)assert.deepEqual(fs.readFileSync(path.join(root,'dist',file)),fs.readFileSync(path.join(root,file)),file+' must preserve original bytes');
});
