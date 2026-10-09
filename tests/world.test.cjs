const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const W=require('../world-model.js');
test('world reflects connected districts and server/research investment',()=>{
  const s=E.createGame();const first=W.buildings(s);
  assert.ok(first.some(b=>b.id==='hub-euljiro'));
  assert.equal(first.filter(b=>b.type==='server').length,1);
  const after={...s,districts:[...s.districts,'hongdae'],servers:2,tech:{...s.tech,language:1}};
  const added=W.additions(first,W.buildings(after));
  assert.deepEqual(added.map(b=>b.id).sort(),['hub-hongdae','research-language-1','server-2']);
  assert.deepEqual(W.additions(W.buildings(after),W.buildings(after)),[]);
});
test('building layout is deterministic and does not mutate campaign',()=>{
  const s=E.createGame(),before=JSON.stringify(s);
  assert.deepEqual(W.buildings(s),W.buildings(s));assert.equal(JSON.stringify(s),before);
  const ids=W.buildings({...s,servers:8,districts:E.districts.map(d=>d.id),tech:{language:3,efficiency:3,ethics:3}}).map(b=>b.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.equal(ids.length,23);
});
test('walking respects bounds and cannot tunnel through furniture',()=>{
  const bounds={minX:-10,maxX:10,minZ:-10,maxZ:10};
  const blocks=[{x:2,z:0,w:2,d:4}];
  const p=W.move({x:0,z:0},{x:1,z:0},10,bounds,blocks);
  assert.ok(p.x<.7);assert.ok(p.x>=0);
  assert.ok(p.x>0);
  const q=W.move({x:9.9,z:9.9},{x:1,z:1},.1,bounds,[]);
  assert.ok(q.x<=10&&q.z<=10);
});
test('diagonal walking is no faster than straight walking',()=>{
  const bounds={minX:-100,maxX:100,minZ:-100,maxZ:100};
  const a=W.move({x:0,z:0},{x:1,z:0},.05,bounds,[]);
  const b=W.move({x:0,z:0},{x:1,z:1},.05,bounds,[]);
  assert.ok(a.x>0);
  assert.ok(Math.abs(Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))<1e-8);
});
test('station interaction is offered only when nearby',()=>{
  for(const st of W.stations)assert.equal(W.nearStation({x:st.x,z:st.z}).id,st.id);
  assert.equal(W.nearStation({x:100,z:100}),null);
});
test('repeated movement cannot cross furniture or the office perimeter',()=>{
  let p={x:0,z:0};const b={minX:-10,maxX:10,minZ:-10,maxZ:10},blocks=[{x:2,z:0,w:2,d:4}];
  for(let n=0;n<100;n++)p=W.move(p,{x:1,z:0},.1,b,blocks);
  assert.ok(p.x<=.58&&p.x>0);
  p={x:0,z:0};for(let n=0;n<100;n++)p=W.move(p,{x:0,z:1},.1,b,[]);
  assert.equal(p.z,10);
});
test('walking slides along obstacles and rejects nonfinite frame inputs',()=>{
  const b={minX:-10,maxX:10,minZ:-10,maxZ:10};
  const p=W.move({x:0,z:0},{x:1,z:1},.1,b,[{x:1,z:0,w:1,d:6}]);
  assert.ok(p.x<=.08);assert.ok(p.z>0);
  assert.deepEqual(W.move({x:0,z:0},{x:1,z:0},NaN,b,[]),{x:0,z:0});
});
