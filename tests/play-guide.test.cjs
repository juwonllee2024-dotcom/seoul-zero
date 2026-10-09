const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');
const G = require('../play-guide.js');

test('guided choices are executable, reveal exact costs and never mutate the campaign', () => {
  let s = E.createGame(42);
  assert.ok(G.choices(s, E).length > 0);
  for (let day = 0; day < 15 && s.status === 'playing'; day++) {
    if (s.event) s = E.act(s, {type:'event', id:0}).state;
    const original = JSON.stringify(s);
    const choices = G.choices(s, E);
    assert.ok(choices.length <= 3);
    assert.equal(JSON.stringify(s), original);
    for (const c of choices) {
      const r = E.act(s, c.action);
      assert.ok(r.ok, r.message);
      assert.equal(s.cash - r.state.cash, c.cost);
      assert.equal(s.ap - r.state.ap, 1);
    }
    if (choices.length) s = E.act(s, choices[0].action).state;
    s = E.act(s, {type:'next'}).state;
  }
});

test('guide prioritizes company survival and does not offer spending when blocked', () => {
  const s = E.createGame(42);
  s.rivalHeat = 82;
  assert.equal(G.choices(s, E)[0]?.action.type, 'countermeasure');
  s.rivalHeat = 18; s.morale = 24;
  assert.equal(G.choices(s, E)[0]?.action.type, 'care');
  for (const change of [{ap:0}, {event:'blackout'}, {status:'lost'}]) {
    assert.deepEqual(G.choices({...s,...change}, E), []);
  }
  s.cash = -580;
  for (const c of G.choices(s, E)) assert.equal(c.cost, 0);
});

test('first steps follow actual contracts and goal progress cannot exceed its target', () => {
  let s = E.createGame(42);
  assert.equal(G.chapter(s).step, 0);
  s = E.act(s,{type:'accept',id:'euljiro',variant:'standard'}).state;
  assert.equal(G.chapter(s).step, 1);
  s = E.act(E.act(s,{type:'next'}).state,{type:'next'}).state;
  assert.equal(G.chapter(s).step, 2);
  s.cash = 9000; s.trust = 100; s.districts = E.districts.map(d=>d.id);
  assert.deepEqual(G.goals(s).map(g=>g.percent), [100,100,100]);
  s.cash = -300;
  assert.equal(G.goals(s)[0].percent, 0);
});

test('day highlights reflect settled cash and only newly resolved consequence stories', () => {
  const before = E.act(E.createGame(42),{type:'business',id:'product'}).state;
  const after = E.act(before,{type:'next'}).state;
  const d = G.digest(before, after);
  assert.equal(d.cash, after.cash - before.cash);
  assert.equal(d.visitors, 27);
  assert.equal(d.orders, 18);
  assert.equal(d.sales, 216);
  assert.deepEqual(d.stories, []);
  assert.equal(d.completed, 0);
  assert.equal(d.morale, after.morale - before.morale);
});

test('daily highlights do not replay yesterday’s evaluation as a new outcome', () => {
  let s = E.act(E.createGame(42),{type:'business',id:'product'}).state;
  while (s.day < 4) {
    if (s.event) s = E.act(s,{type:'event',id:0}).state;
    s = E.act(s,{type:'next'}).state;
  }
  if(s.event)s=E.act(s,{type:'event',id:0}).state;
  assert.ok(s.business.stories.length > 0);
  const next=E.act(s,{type:'next'}).state,d=G.digest(s,next);
  assert.ok(d.stories.length>0);
  assert.ok(d.stories.every(x=>x.day===4 && !s.business.stories.some(old=>old.id===x.id)));
});
