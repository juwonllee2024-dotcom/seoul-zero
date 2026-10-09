const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');
test('customer register reconciles settlement and forecasts never draw outcomes', () => {
  const s=E.createGame(42), original=JSON.stringify(s), f=E.forecast(s);
  assert.ok(f.commerce.visitors>0);
  assert.deepEqual(E.forecast(s),f); assert.equal(JSON.stringify(s),original);
  const n=E.act(s,{type:'next'}).state, r=n.business.receipts[0];
  assert.equal(n.cash-s.cash,r.net); assert.equal(r.sales-r.refunds-r.fulfilment,r.customerNet);
  assert.equal(r.net,r.customerNet+r.network-r.operating-r.rival+r.contracts+r.reactionCash);
});
test('campaign costs money and causes a saved delayed reaction exactly once', () => {
  const s=E.createGame(42), r=E.act(s,{type:'business',id:'campaign'});
  assert.ok(r.ok);assert.equal(r.state.cash,s.cash-120);assert.equal(r.state.ap,2);
  assert.equal(s.business.pending.length,0);assert.equal(r.state.business.pending.length,1);
  assert.deepEqual(E.restore(JSON.stringify(r.state)),r.state);
  let n=r.state; for(let i=0;i<3;i++){if(n.event)n=E.act(n,{type:'event',id:0}).state;n=E.act(n,{type:'next'}).state;}
  assert.equal(n.business.stories.filter(x=>x.source==='네온 캠페인').length,1);
});
test('all four consequence tiers occur and choices affect demand and service overload', () => {
  const C=E.commerce, tiers=new Set();
  for(let seed=1;seed<=300;seed++){const s=E.createGame(seed);C.queue(s,'campaign','네온 캠페인');s.day=3;C.settle(s);tiers.add(s.business.stories[0].tier);}
  assert.deepEqual([...tiers].sort(),['bad','good','jackpot','worst']);
  const s=E.createGame(5), normal=C.forecast(s);s.business.buzz=200;
  const busy=C.forecast(s);assert.ok(busy.visitors>normal.visitors);assert.ok(busy.lost>0);
  s.business.quality=10;assert.ok(C.forecast(s).refunds>0);
  const failed=E.act(s,{type:'business',id:'invalid'});assert.equal(failed.ok,false);assert.equal(failed.state,s);
});
test('old saves migrate; malformed commerce saves are rejected',()=>{
  const s=E.createGame(7);delete s.business;assert.ok(E.restore(JSON.stringify(s)).business);
  s.business={policy:'oops'};assert.equal(E.restore(JSON.stringify(s)),null);
});
test('responding changes the pending branch, costs AP and cash, and stays linked to its origin',()=>{
  const s=E.act(E.createGame(91),{type:'business',id:'product'}).state;
  const q=s.business.pending[0],old=structuredClone(q.odds);
  const r=E.act(s,{type:'respond',id:q.id,variant:'protect'});assert.ok(r.ok);
  assert.equal(r.state.cash,s.cash-60);assert.equal(r.state.ap,s.ap-1);
  assert.ok(r.state.business.pending[0].odds.worst<old.worst);
  assert.equal(r.state.business.responses[0].root,q.root);
  assert.equal(r.state.business.pending.length,s.business.pending.length);
  assert.deepEqual(E.restore(JSON.stringify(r.state)),r.state);
  const repeat=E.act(r.state,{type:'respond',id:q.id,variant:'gamble'});assert.equal(repeat.ok,false);assert.equal(repeat.state,r.state);
});
test('high-risk response raises jackpot and catastrophe odds without spending RNG; invalid responses are inert',()=>{
  const s=E.act(E.createGame(92),{type:'business',id:'campaign'}).state,q=s.business.pending[0];
  const preview=E.commerce.responsePreview(q,'gamble');assert.equal(s.business.rng,E.commerce.fresh(92).rng);
  assert.ok(preview.odds.jackpot>q.odds.jackpot);assert.ok(preview.odds.worst>q.odds.worst);
  const r=E.act(s,{type:'respond',id:q.id,variant:'gamble'});assert.ok(r.ok);assert.deepEqual(r.state.business.pending[0].odds,preview.odds);
  for(const action of [{type:'respond',id:999,variant:'protect'},{type:'respond',id:q.id,variant:'invalid'}])assert.equal(E.act(s,action).state,s);
  const noAP={...s,ap:0};assert.equal(E.act(noAP,{type:'respond',id:q.id,variant:'protect'}).state,noAP);
});
test('risk amplification settles real cash and responding through all stages preserves a valid save',()=>{
  const C=E.commerce,s=E.createGame(13);C.queue(s,'campaign','광고 승부',0,null,{good:0,bad:0,worst:0,jackpot:100});s.business.pending[0].due=1;
  const chosen=E.act(s,{type:'respond',id:1,variant:'gamble'}).state,f=E.forecast(chosen),paid=E.act(chosen,{type:'next'}).state;
  assert.equal(paid.cash,chosen.cash+f.net+570);assert.equal(paid.business.receipts[0].reactionCash,570);
  let n=paid;
  for(let depth=1;depth<=2;depth++){
    if(n.event)n=E.act(n,{type:'event',id:0}).state;
    const q=n.business.pending.find(x=>x.root===1);assert.ok(q);
    n=E.act(n,{type:'respond',id:q.id,variant:'protect'}).state;
    assert.deepEqual(E.restore(JSON.stringify(n)),n);
    n=E.act(n,{type:'next'}).state;
  }
  assert.equal(n.business.stories.find(x=>x.root===1&&x.depth===2).path.length,7);
  assert.equal(n.business.responses.filter(x=>x.root===1).length,3);
  assert.deepEqual(E.restore(JSON.stringify(n)),n);
});
test('every outcome continues its own causal chain and retains the original decision',()=>{
  const C=E.commerce;
  for(const tier of ['good','bad','worst','jackpot']){
    const s=E.createGame(51);C.queue(s,'hire','직원 채용',0,null,{good:0,bad:0,worst:0,jackpot:0,[tier]:100});s.day=3;C.settle(s);
    assert.equal(s.business.pending.length,1);const q=s.business.pending[0];
    assert.equal(q.root,1);assert.equal(q.origin,'직원 채용');assert.equal(q.depth,1);assert.equal(q.parent,1);
    s.day=4;C.settle(s);s.day=5;C.settle(s);
    assert.equal(s.business.pending.length,0);assert.equal(s.business.stories.length,3);
    assert.ok(s.business.stories.every(x=>x.origin==='직원 채용'&&x.root===1));
    assert.equal(s.business.stories[0].path.length,4);
    assert.ok(E.restore(JSON.stringify(s)));
  }
});
test('hiring, research and pricing have distinct consequences and preserve action context',()=>{
  const C=E.commerce,states=['hire','research:language','premium'].map(kind=>{
    const s=E.createGame(7);C.queue(s,kind,kind,0,null,{good:100,bad:0,worst:0,jackpot:0});s.day=3;C.settle(s);return s;
  });
  assert.equal(new Set(states.map(s=>s.business.stories[0].title)).size,3);
  assert.ok(states[0].morale>72);assert.ok(states[1].business.quality>62);
  const e=E.createGame(20);e.event='offer';const r=E.act(e,{type:'event',id:1});assert.equal(r.state.business.pending[0].kind,'event:offer:1');
});
test('displayed odds match queued odds and late choices settle before the finale',()=>{
  const s=E.createGame(80),odds=E.commerce.odds(s,'product'),n=E.act(s,{type:'business',id:'product'}).state;
  assert.deepEqual(n.business.pending[0].odds,odds);
  n.day=30;n.ap=3;const chosen=E.act(n,{type:'business',id:'service'}).state;
  assert.equal(chosen.business.pending.at(-1).due,30);
  const final=E.act(chosen,{type:'next'}).state;
  assert.ok(final.business.stories.some(x=>x.source==='컨시어지 서비스'));
  assert.equal(final.business.pending.length,0);
});
test('overload risk is greater, choices are causal, and repeated saving cannot reroll',()=>{
  const s=E.createGame(19);s.business.buzz=70;
  const busy=E.commerce.odds(s,'growth');s.servers=8;s.staff=8;
  assert.ok(E.commerce.odds(s,'growth').worst<busy.worst);
  let n=E.act(E.createGame(19),{type:'business',id:'blitz'}).state;
  for(let i=0;i<3;i++){
    if(n.event)n=E.act(n,{type:'event',id:0}).state;
    const restored=E.restore(JSON.stringify(n));assert.ok(restored);
    assert.deepEqual(E.act(n,{type:'next'}),E.act(restored,{type:'next'}));n=E.act(n,{type:'next'}).state;
  }
  const r=structuredClone(n);r.business.receipts[0].closing++;assert.equal(E.restore(JSON.stringify(r)),null);
  r.business=structuredClone(n.business);r.business.policy='__proto__';assert.equal(E.restore(JSON.stringify(r)),null);
});
