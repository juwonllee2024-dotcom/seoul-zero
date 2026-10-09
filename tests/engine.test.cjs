const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');
const fresh = () => E.createGame(42);
const step = (s, type, id, variant) => E.act(s, { type, id, ...(variant === undefined ? {} : { variant }) });
function day(s) {
  if (s.event) s = step(s, 'event', 0).state;
  return step(s, 'next').state;
}

test('starts a playable campaign with one district and resources', () => {
  const s = fresh();
  assert.equal(s.day, 1); assert.equal(s.ap, 3);
  assert.deepEqual(s.districts, ['euljiro']); assert.equal(s.status, 'playing');
  assert.equal(s.staff, 3); assert.equal(s.morale, 72);
});
test('actions do not mutate the previous state', () => {
  const s = fresh(), before = JSON.stringify(s);
  const r = step(s, 'accept', 'euljiro');
  assert.equal(r.ok, true); assert.equal(JSON.stringify(s), before);
  assert.equal(r.state.jobs.length, 1); assert.equal(r.state.ap, 2);
});
test('completed contracts pay once and release compute', () => {
  let s = step(fresh(), 'accept', 'euljiro').state;
  const cash = s.cash;
  s = day(s); assert.equal(s.jobs.length, 1);
  s = day(s); assert.equal(s.jobs.length, 0); assert.equal(s.completed, 1);
  assert.ok(s.cash > cash); assert.equal(E.forecast(s).used, 0);
});
test('every district exposes three contract routes with real tradeoffs', () => {
  for (const d of E.districts) {
    const options = E.contractOptions(fresh(), d.id);
    assert.deepEqual(options.map(o => o.id), ['rapid', 'standard', 'civic']);
    const rapid = options[0], standard = options[1], civic = options[2];
    assert.ok(rapid.reward < standard.reward && rapid.duration < standard.duration && rapid.compute > standard.compute && rapid.trust < standard.trust);
    assert.ok(civic.reward < standard.reward && civic.duration > standard.duration && civic.compute < standard.compute && civic.trust > standard.trust);
  }
});
test('selected contract variant is stored and settles using its reward and trust', () => {
  const s = fresh(), option = E.contractOptions(s, 'euljiro').find(o => o.id === 'rapid');
  const accepted = step(s, 'accept', 'euljiro', 'rapid');
  assert.equal(accepted.ok, true);
  assert.deepEqual(accepted.state.jobs[0], { district: 'euljiro', variant: 'rapid', remaining: option.duration, duration: option.duration, compute: option.compute, reward: option.reward, trust: option.trust });
  const f = E.forecast(accepted.state);
  assert.equal(f.payout, option.reward);
  const settled = step(accepted.state, 'next').state;
  assert.equal(settled.cash, accepted.state.cash + f.net + option.reward);
  assert.equal(settled.trust, accepted.state.trust + option.trust);
});
test('invalid contract variants do not consume AP or mutate the campaign', () => {
  const s = fresh(), before = JSON.stringify(s);
  const r = step(s, 'accept', 'euljiro', 'unknown-route');
  assert.equal(r.ok, false); assert.equal(JSON.stringify(s), before); assert.equal(r.state, s);
});
test('duplicate district contracts cannot be accepted', () => {
  const s = step(fresh(), 'accept', 'euljiro').state;
  const r = step(s, 'accept', 'euljiro'); assert.equal(r.ok, false); assert.deepEqual(r.state, s);
});
test('staffing limits contracts even when compute is available', () => {
  let s = { ...fresh(), staff: 1, servers: 3, districts: ['euljiro', 'hongdae'] };
  s = step(s, 'accept', 'euljiro').state;
  const blocked = step(s, 'accept', 'hongdae');
  assert.equal(blocked.ok, false); assert.match(blocked.message, /직원/);
  assert.deepEqual(blocked.state, s);
});
test('forecast separates fixed operations, payroll, and server hiring capacity', () => {
  const s = fresh(), f = E.forecast(s);
  assert.equal(f.cost, f.fixedCost + f.payroll);
  assert.equal(f.payroll, s.staff * 8); assert.equal(f.staffCapacity, 4);
  assert.equal(f.staffAvailable, s.staff - s.jobs.length);
  const hired = step(s, 'hire');
  assert.equal(hired.ok, true); assert.equal(hired.state.staff, 4); assert.equal(hired.state.ap, 2);
  assert.equal(hired.state.cash, s.cash - E.hireCost(s)); assert.equal(hired.state.morale, 76);
  assert.equal(step(hired.state, 'hire').ok, false);
  const server = step({ ...fresh(), staff: 4 }, 'server').state;
  assert.equal(E.forecast(server).staffCapacity, 6);
  assert.equal(step(server, 'hire').ok, true);
});
test('team care counters work pressure, while zero morale loses the campaign', () => {
  const s = { ...fresh(), morale: 30 }, price = E.teamCareCost(s), cared = step(s, 'care');
  assert.equal(cared.ok, true); assert.equal(cared.state.cash, s.cash - price);
  assert.equal(cared.state.morale, 58); assert.equal(cared.state.ap, 2);
  const loaded = step({ ...fresh(), staff: 1, morale: 4 }, 'accept', 'euljiro').state;
  assert.equal(E.forecast(loaded).moralePressure, 4);
  const exhausted = step(loaded, 'next').state;
  assert.equal(exhausted.morale, 0); assert.equal(exhausted.status, 'lost');
});
test('credit line permits debt-funded actions but blocks spending beyond its floor', () => {
  const funded = step({ ...fresh(), cash: 0 }, 'expand', 'hongdae');
  assert.equal(funded.ok, true); assert.equal(funded.state.cash, -350);
  assert.equal(E.debtLimit, -600); assert.equal(E.canAfford({ cash: -550 }, 50), true); assert.equal(E.canAfford({ cash: -550 }, 51), false);
  const s = { ...fresh(), cash: E.debtLimit };
  for (const action of ['expand', 'server', 'research', 'outreach']) {
    const r = step(s, action, action === 'expand' ? 'hongdae' : 'language');
    assert.equal(r.ok, false); assert.deepEqual(r.state, s);
  }
});
test('AP exhaustion blocks management actions but permits next day', () => {
  const s = { ...fresh(), ap: 0 };
  assert.equal(step(s, 'accept', 'euljiro').ok, false);
  const r = step(s, 'next'); assert.equal(r.ok, true); assert.equal(r.state.ap, 3);
});
test('expansion charges cash and unlocks a contract', () => {
  const s = fresh(), r = step(s, 'expand', 'hongdae');
  assert.equal(r.ok, true); assert.ok(r.state.cash < s.cash);
  assert.ok(r.state.districts.includes('hongdae'));
  assert.equal(step(r.state, 'accept', 'hongdae').ok, true);
});
test('locked research requirements prevent advanced expansion', () => {
  assert.equal(step({ ...fresh(), cash: 5000 }, 'expand', 'gangnam').ok, false);
});
test('district levels gate access and add deterministic morale pressure', () => {
  assert.deepEqual(E.districts.map(d => [d.level, d.trustGate, d.pressure]), [[1, 0, 0], [1, 52, 0], [2, 56, 1], [3, 65, 1], [4, 74, 2], [5, 84, 3]]);
  const base = { ...fresh(), cash: 5000, tech: { language: 3, efficiency: 0, ethics: 0 }, trust: 64 };
  assert.equal(step(base, 'expand', 'seongsu').ok, false);
  const connected = step({ ...base, trust: 65 }, 'expand', 'seongsu');
  assert.equal(connected.ok, true);
  assert.equal(step({ ...connected.state, trust: 64 }, 'accept', 'seongsu').ok, false);
  const songpa = step({ ...fresh(), trust: 84, tech: { language: 3, efficiency: 0, ethics: 0 }, servers: 8, districts: ['euljiro', 'songpa'] }, 'accept', 'songpa');
  assert.equal(songpa.ok, true); assert.equal(E.forecast(songpa.state).districtPressure, 3); assert.equal(E.forecast(songpa.state).moralePressure, 4);
  assert.equal(E.contractOption(fresh(), 'songpa').trustGate, 84);
});
test('research and server upgrades affect capabilities', () => {
  let s = step(fresh(), 'research', 'language').state;
  assert.equal(s.tech.language, 1);
  const old = E.forecast(s).capacity;
  s = step(s, 'server').state; assert.ok(E.forecast(s).capacity > old);
});
test('compute capacity prevents overbooking', () => {
  const s = { ...fresh(), districts: ['euljiro', 'hongdae', 'yongsan'], servers: 1 };
  let next = step(s, 'accept', 'euljiro').state;
  next = step(next, 'accept', 'yongsan').state;
  assert.equal(step(next, 'accept', 'hongdae').ok, false);
});
test('15 percent research bonus rounds half credits correctly', () => {
  const s = { ...fresh(), tech: {language:1,efficiency:0,ethics:0}, districts:['euljiro','yongsan'] };
  const r = step(s,'accept','yongsan');
  assert.equal(r.state.jobs[0].reward,472);
});
test('events block settlement until resolved and can only resolve once', () => {
  let s = day(day(fresh())); assert.ok(s.event);
  assert.equal(step(s, 'next').ok, false);
  const r = step(s, 'event', 0); assert.equal(r.ok, true); assert.equal(r.state.event, null);
  assert.equal(step(r.state, 'event', 0).ok, false);
});
test('event selection rejects nonexistent options', () => {
  const s = day(day(fresh())); assert.equal(step(s, 'event', 99).ok, false);
});
test('staff events are deterministic and apply optional team effects safely', () => {
  let s = fresh();
  while (s.day < 9) {
    if (s.event) s = step(s, 'event', 0).state;
    s = step(s, 'next').state;
  }
  assert.ok(E.staffEvents.some(event => event.id === s.event));
  const referral = step({ ...fresh(), event: 'referral' }, 'event', 0);
  assert.equal(referral.ok, true); assert.equal(referral.state.staff, 4); assert.equal(referral.state.morale, 78);
  const lastWorker = step({ ...fresh(), staff: 1, morale: 20, event: 'resignation' }, 'event', 1);
  assert.equal(lastWorker.ok, true); assert.equal(lastWorker.state.staff, 1); assert.equal(lastWorker.state.morale, 10);
  const assigned = step({ ...fresh(), staff: 1 }, 'accept', 'euljiro').state;
  assert.equal(step({ ...assigned, event: 'resignation' }, 'event', 1).ok, false);
});
test('forecast reconciles next day cash without event effects', () => {
  const s = fresh(), f = E.forecast(s), next = day(s);
  assert.equal(next.cash, s.cash + f.income + f.commerce.net - f.cost);
});
test('debt interest appears in forecast and credit loss occurs below the limit', () => {
  const s = { ...fresh(), cash: -200 }, f = E.forecast(s);
  assert.equal(E.debtInterest(s), 10); assert.equal(f.debt, 200); assert.equal(f.debtInterest, 10);
  assert.equal(f.cost, f.fixedCost + f.payroll + f.debtInterest);
  assert.equal(day(s).status, 'playing');
  const overLimit = day({ ...fresh(), cash: -590, servers: 20 });
  assert.equal(overLimit.status, 'lost'); assert.ok(overLimit.cash < E.debtLimit);
});
test('shadow protocol starts safe, applies owned powers immutably, and respects cooldowns', () => {
  const s = fresh(), before = JSON.stringify(s);
  assert.equal(s.rivalHeat, 18); assert.equal(s.rivalSignal, 'silent');
  assert.deepEqual(Object.keys(s.powerCooldowns), E.districts.map(d => d.id));
  assert.deepEqual(Object.keys(E.districtPowers), E.districts.map(d => d.id));
  const powered = step(s, 'power', 'euljiro');
  assert.equal(powered.ok, true); assert.equal(JSON.stringify(s), before);
  assert.equal(powered.state.ap, 2); assert.equal(powered.state.cash, s.cash + 150); assert.equal(powered.state.trust, s.trust - 3);
  assert.equal(powered.state.rivalHeat, 33); assert.equal(powered.state.rivalSignal, 'trace'); assert.equal(powered.state.powerCooldowns.euljiro, 2);
  assert.equal(step(powered.state, 'power', 'euljiro').ok, false);
  let cooled = day(powered.state); assert.equal(cooled.powerCooldowns.euljiro, 1);
  cooled = day(cooled); assert.equal(cooled.powerCooldowns.euljiro, 0);
  const invalid = step(s, 'power', 'songpa');
  assert.equal(invalid.ok, false); assert.equal(invalid.state, s);
});
test('district powers have distinct local effects and only accelerate live contracts', () => {
  let work = step(fresh(), 'accept', 'euljiro').state;
  work = { ...work, districts: ['euljiro', 'yongsan'] };
  const noWork = step({ ...work, jobs: [] }, 'power', 'yongsan');
  assert.equal(noWork.ok, false);
  const routed = step(work, 'power', 'yongsan');
  assert.equal(routed.ok, true); assert.equal(routed.state.jobs[0].remaining, 1);
  assert.equal(routed.state.morale, work.morale - 6); assert.equal(routed.state.rivalHeat, work.rivalHeat + 19);
  assert.equal(routed.state.powerCooldowns.yongsan, E.districtPowers.yongsan.cooldown);
});
test('countermeasures use credit, heat pulses are deterministic, and exposure has a real consequence', () => {
  const stressed = { ...fresh(), cash: 0, rivalHeat: 75, rivalSignal: 'lockdown' }, f = E.forecast(stressed);
  assert.equal(f.rivalHeat, 75); assert.equal(f.rivalPenalty, 70); assert.equal(f.countermeasureCost, 130);
  const countered = step(stressed, 'countermeasure');
  assert.equal(countered.ok, true); assert.equal(countered.state.cash, -130); assert.equal(countered.state.rivalHeat, 47); assert.equal(countered.state.ap, 2);
  assert.equal(countered.state.rivalSignal, 'trace');
  assert.equal(step({ ...fresh(), rivalHeat: 0 }, 'countermeasure').ok, false);
  const active = step(fresh(), 'accept', 'euljiro').state;
  assert.deepEqual(E.pulseForDay(active), E.pulseForDay(active));
  let exposed = step({ ...fresh(), rivalHeat: 99, rivalSignal: 'lockdown' }, 'accept', 'euljiro').state;
  exposed = day(exposed);
  assert.equal(exposed.rivalHeat, 100); assert.equal(exposed.status, 'lost');
  assert.match(exposed.logs[0].text, /경쟁사가 서울 노드를 장악/);
});
test('trust is capped at 100', () => {
  const r = step({ ...fresh(), trust: 99 }, 'outreach'); assert.equal(r.state.trust, 100);
});
test('credit-limit breach and trust collapse end the campaign', () => {
  let s = { ...fresh(), cash: -590, servers: 20 };
  assert.equal(day(s).status, 'lost');
  s = { ...fresh(), trust: 0 }; assert.equal(day(s).status, 'lost');
});
test('day 30 evaluates victory and rejects further actions', () => {
  const s = { ...fresh(), day: 30, cash: 2000, trust: 80, districts: ['euljiro', 'hongdae', 'yongsan'] };
  const r = step(s, 'next'); assert.equal(r.state.status, 'won'); assert.equal(r.state.day, 30);
  assert.equal(step(r.state, 'server').ok, false);
  assert.equal(day({ ...fresh(), day: 30 }).status, 'finished');
});
test('save round trip preserves valid state', () => {
  const s = step(fresh(), 'accept', 'euljiro').state;
  assert.deepEqual(E.restore(JSON.stringify(s)), s);
});
test('legacy contract saves restore as standard contracts', () => {
  const s = step(fresh(), 'accept', 'euljiro').state;
  const legacy = JSON.parse(JSON.stringify(s));
  delete legacy.jobs[0].variant; delete legacy.jobs[0].trust;
  const restored = E.restore(JSON.stringify(legacy));
  assert.equal(restored.jobs[0].variant, 'standard');
  assert.equal(restored.jobs[0].trust, E.districts.find(d => d.id === 'euljiro').trust);
  assert.equal(step(restored, 'next').ok, true);
});
test('legacy v1 saves migrate team fields without invalidating active work', () => {
  const legacy = JSON.parse(JSON.stringify(fresh()));
  delete legacy.staff; delete legacy.morale;
  const restored = E.restore(JSON.stringify(legacy));
  assert.equal(restored.staff, 3); assert.equal(restored.morale, 72);
  assert.deepEqual(E.restore(JSON.stringify(restored)), restored);
  const active = { ...fresh(), servers: 8, districts: ['euljiro', 'hongdae', 'yongsan', 'seongsu'] };
  active.jobs = active.districts.map(district => {
    const option = E.contractOption(active, district);
    return { district, variant: option.id, remaining: option.duration, duration: option.duration, compute: option.compute, reward: option.reward, trust: option.trust };
  });
  delete active.staff; delete active.morale;
  const migrated = E.restore(JSON.stringify(active));
  assert.equal(migrated.staff, 4); assert.equal(migrated.morale, 72);
  assert.equal(migrated.jobs.length, 4);
});
test('legacy saves gain shadow fields while unknown cooldown ids stay inert', () => {
  const legacy = JSON.parse(JSON.stringify(fresh()));
  delete legacy.rivalHeat; delete legacy.powerCooldowns; delete legacy.rivalSignal;
  const migrated = E.restore(JSON.stringify(legacy));
  assert.equal(migrated.rivalHeat, 18); assert.equal(migrated.rivalSignal, 'silent');
  assert.deepEqual(Object.keys(migrated.powerCooldowns), E.districts.map(d => d.id));
  const noisy = JSON.parse(JSON.stringify(fresh()));
  noisy.rivalHeat = 50; noisy.rivalSignal = 'forged'; noisy.powerCooldowns = { euljiro: 2, unknown: 99 };
  const sanitized = E.restore(JSON.stringify(noisy));
  assert.equal(sanitized.rivalSignal, 'hunt'); assert.equal(sanitized.powerCooldowns.euljiro, 2);
  assert.deepEqual(Object.keys(sanitized.powerCooldowns), E.districts.map(d => d.id));
  assert.equal(E.restore(JSON.stringify({ ...fresh(), rivalHeat: 101 })), null);
  assert.equal(E.restore(JSON.stringify({ ...fresh(), powerCooldowns: { euljiro: 99 } })), null);
});
test('malformed and incompatible saves are rejected', () => {
  for (const bad of ['{', '{}', 'null', JSON.stringify({ ...fresh(), cash: '999' }), JSON.stringify({ ...fresh(), districts: ['bad'] }), JSON.stringify({ ...fresh(), ap: 500 }), JSON.stringify({ ...fresh(), staff: 0 }), JSON.stringify({ ...fresh(), morale: 101 })]) {
    assert.equal(E.restore(bad), null);
  }
});
test('unknown actions and district names leave state unchanged', () => {
  const s = fresh();
  for (const [type, id] of [['hack'], ['accept', 'bad'], ['expand', '__proto__'], ['research', 'bad']]) {
    const r = step(s, type, id); assert.equal(r.ok, false); assert.deepEqual(r.state, s);
  }
});
