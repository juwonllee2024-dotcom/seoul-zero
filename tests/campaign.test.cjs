const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');
function play(seed) {
  let s=E.createGame(seed), turns=0;
  const act=(type,id)=>{const r=E.act(s,{type,id});if(r.ok)s=r.state;return r.ok;};
  while(s.status==='playing'&&turns++<31){
    if(s.event){const e=E.events.find(e=>e.id===s.event);if(!act('event',s.cash+e.choices[0].cash>=200?0:1))act('event',1);}
    if(s.status!=='playing')break;
    if(s.morale<=48&&E.canAfford(s,E.teamCareCost(s)))act('care');
    const trustTarget=E.districts.find(d=>!s.districts.includes(d.id)&&s.tech.language>=d.tier&&s.trust<d.trustGate);
    if(trustTarget&&E.canAfford(s,100))act('outreach');
    if(!s.districts.includes('hongdae')&&s.cash>=550)act('expand','hongdae');
    if(!s.districts.includes('yongsan')&&s.cash>=650)act('expand','yongsan');
    if(s.servers<2&&s.cash>=400)act('server');
    for(const id of s.districts)act('accept',id);
    if(s.trust<65&&s.cash>1800)act('outreach');
    act('next');
    assert.ok(s.ap>=0&&s.ap<=3); assert.ok(s.trust>=0&&s.trust<=100); assert.ok(s.staff>=1&&s.staff<=8); assert.ok(s.morale>=0&&s.morale<=100);
    assert.ok(s.rivalHeat>=0&&s.rivalHeat<=100); assert.deepEqual(Object.keys(s.powerCooldowns),E.districts.map(d=>d.id));
    assert.ok(E.forecast(s).used<=E.forecast(s).capacity);
    assert.deepEqual(E.restore(JSON.stringify(s)),s,'every real state must be restorable');
  }
  return s;
}
test('100 seeded campaigns can win using a sustainable strategy',()=>{
  for(let seed=1;seed<=100;seed++){
    const s=play(seed);assert.equal(s.status,'won',`seed ${seed}`);assert.equal(s.day,30);
    assert.ok(s.completed>=20);assert.ok(s.cash>=1500);assert.ok(s.trust>=65);
  }
});
test('same seed and player choices give identical outcomes',()=>{
  assert.deepEqual(play(2087),play(2087));
});
test('all research levels and districts can be unlocked in a real campaign',()=>{
  let s=E.createGame(2087),turns=0;
  const act=(type,id)=>{const r=E.act(s,{type,id});if(r.ok)s=r.state;return r.ok;};
  while(s.status==='playing'&&turns++<31){
    if(s.event){if(!act('event',0))act('event',1);}
    if(s.status!=='playing')break;
    if(s.morale<=48&&E.canAfford(s,E.teamCareCost(s)))act('care');
    const trustTarget=E.districts.find(d=>!s.districts.includes(d.id)&&s.tech.language>=d.tier&&s.trust<d.trustGate);
    if(trustTarget&&E.canAfford(s,100))act('outreach');
    for(const d of E.districts){if(!s.districts.includes(d.id)&&s.trust>=d.trustGate&&s.cash>d.cost+150)act('expand',d.id);}
    if(s.servers<4&&s.districts.length>s.servers&&s.cash>E.serverCost(s)+150)act('server');
    for(const id of s.districts)act('accept',id);
    if(s.cash>E.researchCost(s,'language')+350)act('research','language');
    act('next');
  }
  assert.ok(turns<=31);
  assert.equal(s.tech.language,3);assert.equal(s.districts.length,6);assert.equal(s.status,'won');
});
test('hostile save content is either rejected or kept as inert text',()=>{
  const s=E.createGame();
  for(const field of ['jobs','logs','history','districts'])assert.equal(E.restore(JSON.stringify({...s,[field]:[null]})),null);
  for(const patch of [{servers:0},{tech:{language:Infinity}},{event:'invented'},{version:2},{status:'unknown'},{jobs:[{district:'euljiro',compute:-1}]}])assert.equal(E.restore(JSON.stringify({...s,...patch})),null);
});
