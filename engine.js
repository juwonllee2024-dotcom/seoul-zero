(function (root) {
  'use strict';
  const commerce = typeof module !== 'undefined' && module.exports ? require('./commerce.js') : root.SeoulCommerce;
  const districts = [
    { id: 'euljiro', name: '을지로', en: 'EULJIRO', sector: '제조 · 자동화', description: '낡은 인쇄 골목 아래, 서울의 새로운 연산망이 깨어납니다.', cost: 0, income: 48, upkeep: 8, reward: 260, duration: 2, compute: 2, trust: 3, tier: 0, level: 1, trustGate: 0, pressure: 0, job: '인쇄 골목 자동화', x: 52, y: 35 },
    { id: 'hongdae', name: '홍대', en: 'HONGDAE', sector: '문화 · 생성형 AI', description: '독립 창작자와 홀로그램 클럽이 밤새 데이터를 만듭니다.', cost: 350, income: 45, upkeep: 12, reward: 310, duration: 2, compute: 3, trust: 3, tier: 0, level: 1, trustGate: 52, pressure: 0, job: '네온 페스티벌 생성 엔진', x: 24, y: 39 },
    { id: 'yongsan', name: '용산', en: 'YONGSAN', sector: '인프라 · 물류', description: '한강 북쪽의 거대한 서버 지대. 도시를 연결할 다음 거점입니다.', cost: 450, income: 62, upkeep: 17, reward: 410, duration: 3, compute: 2, trust: 4, tier: 0, level: 2, trustGate: 56, pressure: 1, job: '자율 배송 경로 최적화', x: 43, y: 55 },
    { id: 'seongsu', name: '성수', en: 'SEONGSU', sector: '로보틱스 · 디자인', description: '오래된 공장이 인간과 기계의 공동 작업실로 바뀌었습니다.', cost: 600, income: 85, upkeep: 22, reward: 560, duration: 3, compute: 4, trust: 5, tier: 1, level: 3, trustGate: 65, pressure: 1, job: '협동 로봇 행동 모델', x: 74, y: 48 },
    { id: 'gangnam', name: '강남', en: 'GANGNAM', sector: '금융 · 예측 모델', description: '메가코프의 유리 탑 사이, 독립 AI를 위한 작은 틈이 열립니다.', cost: 850, income: 120, upkeep: 35, reward: 760, duration: 3, compute: 5, trust: 4, tier: 2, level: 4, trustGate: 74, pressure: 2, job: '금융 이상 거래 탐지', x: 63, y: 78 },
    { id: 'songpa', name: '송파', en: 'SONGPA', sector: '도시 · 디지털 트윈', description: '수직 도시의 마지막 노드. 서울 전체를 하나의 지능으로 연결하세요.', cost: 1000, income: 150, upkeep: 40, reward: 920, duration: 4, compute: 6, trust: 6, tier: 3, level: 5, trustGate: 84, pressure: 3, job: '수직 도시 디지털 트윈', x: 84, y: 68 }
  ];
  const research = [
    { id: 'language', name: '서울 언어 모델', en: 'SEOUL LANGUAGE MODEL', description: '계약 보상 단계마다 +15%. 고급 지역 진출을 위한 AI 등급 상승.', base: 250, max: 3 },
    { id: 'efficiency', name: '뉴럴 압축', en: 'NEURAL COMPRESSION', description: '서버 유지비 단계마다 20% 감소. 총 연산 용량 +1.', base: 220, max: 3 },
    { id: 'ethics', name: '신뢰 프로토콜', en: 'TRUST PROTOCOL', description: '계약 완료 시 시민 신뢰 추가 +2. 연구 즉시 신뢰 +4.', base: 180, max: 3 }
  ];
  const contractProfiles = [
    { id: 'rapid', name: '스프린트', en: 'FLASH RUN', description: '속도로 시장을 선점합니다. 보상과 신뢰는 조금 낮지만 하루를 앞당깁니다.', rewardMultiplier: .8, durationDelta: -1, computeDelta: 1, trustDelta: -1 },
    { id: 'standard', name: '균형 계약', en: 'BALANCED LINK', description: '수익, 연산, 신뢰의 균형을 맞춘 기본 운영 경로입니다.', rewardMultiplier: 1, durationDelta: 0, computeDelta: 0, trustDelta: 0 },
    { id: 'civic', name: '시민 동행', en: 'CIVIC LINK', description: '시민 검증을 함께 진행합니다. 더 오래 걸리지만 연산 부담과 신뢰 리스크를 낮춥니다.', rewardMultiplier: .9, durationDelta: 1, computeDelta: -1, trustDelta: 3 }
  ];
  const districtPowers = Object.freeze({
    euljiro: Object.freeze({ id: 'euljiro', name: '고스트 프레스', en: 'GHOST PRESS', description: '숨은 제조망을 밤새 가동해 현금을 만들지만, 시민의 눈과 경쟁사의 추적을 부릅니다.', effect: '크레딧 +150 · 신뢰 −3', cooldown: 2, heat: 15, cash: 150, trust: -3 }),
    hongdae: Object.freeze({ id: 'hongdae', name: '바이럴 노이즈', en: 'VIRAL NOISE', description: '도시의 피드를 점령해 지지를 끌어올립니다. 팀은 과열되고 흔적은 남습니다.', effect: '신뢰 +12 · 사기 −8', cooldown: 3, heat: 14, trust: 12, morale: -8 }),
    yongsan: Object.freeze({ id: 'yongsan', name: '스위치백 라우팅', en: 'SWITCHBACK', description: '물류망을 우회시켜 진행 중인 계약을 하루 앞당깁니다. 모든 노드가 경쟁사 레이더에 잡힙니다.', effect: '모든 계약 −1일 · 사기 −6', cooldown: 3, heat: 19, advance: 1, morale: -6, requiresJobs: true }),
    seongsu: Object.freeze({ id: 'seongsu', name: '스웜 리파이낸싱', en: 'SWARM REFINANCE', description: '로봇 협동망으로 재고를 현금화해 숨통을 틉니다. 팀은 버티지만 추적 강도는 급상승합니다.', effect: '크레딧 +180 · 사기 +16', cooldown: 3, heat: 20, cash: 180, morale: 16 }),
    gangnam: Object.freeze({ id: 'gangnam', name: '다크 풀 미라지', en: 'DARK POOL MIRAGE', description: '거대 금융망의 가격 신호를 역이용합니다. 큰 돈을 얻지만 신뢰와 익명성의 대가를 치릅니다.', effect: '크레딧 +340 · 신뢰 −10', cooldown: 4, heat: 27, cash: 340, trust: -10 }),
    songpa: Object.freeze({ id: 'songpa', name: '미러 시티 오버라이드', en: 'MIRROR CITY', description: '도시 쌍둥이 모델을 강제 동기화해 모든 계약을 이틀 앞당깁니다. 서울 전체가 당신을 주시합니다.', effect: '모든 계약 −2일 · 신뢰 +7 · 사기 +10', cooldown: 4, heat: 30, advance: 2, trust: 7, morale: 10, requiresJobs: true })
  });
  const civicEvents = [
    { id: 'blackout', tag: 'INFRASTRUCTURE', title: '한강 전력망 과부하', text: '폭우로 냉각 시설이 멈췄습니다. 도시의 비상 전력을 함께 부담할까요?', choices: [{ label: '비상 전력 지원', detail: '크레딧 −120 · 신뢰 +8', cash: -120, trust: 8 }, { label: '절전 모드 가동', detail: '신뢰 −4 · 추가 비용 없음', cash: 0, trust: -4 }] },
    { id: 'data', tag: 'DATA ETHICS', title: '골목의 목소리', text: '을지로 상인들이 학습 데이터 사용에 대한 설명을 요구합니다. 투명성이 곧 경쟁력일까요?', choices: [{ label: '공개 설명회 개최', detail: '크레딧 −80 · 신뢰 +10', cash: -80, trust: 10 }, { label: '익명 통계만 공개', detail: '크레딧 +40 · 신뢰 −3', cash: 40, trust: -3 }] },
    { id: 'offer', tag: 'CORPORATE OFFER', title: '메가코프의 제안', text: '한울 다이내믹스가 시민 행동 데이터를 사고 싶어 합니다. 조건은 비공개 거래입니다.', choices: [{ label: '데이터 판매 거절', detail: '신뢰 +7 · 독립성 유지', cash: 0, trust: 7 }, { label: '데이터 라이선스 판매', detail: '크레딧 +230 · 신뢰 −14', cash: 230, trust: -14 }] },
    { id: 'festival', tag: 'CITY CULTURE', title: '잠들지 않는 서울', text: '한강 야간 축제의 AI 운영사를 찾습니다. 시민과 함께하는 밤을 만들 수 있습니다.', choices: [{ label: '축제 운영 후원', detail: '크레딧 −100 · 신뢰 +9', cash: -100, trust: 9 }, { label: '유료 기술 자문', detail: '크레딧 +90 · 신뢰 −2', cash: 90, trust: -2 }] },
    { id: 'audit', tag: 'SYSTEM SECURITY', title: '낯선 접속 흔적', text: '외부 노드에서 비정상 트래픽이 감지됐습니다. 선제 점검 비용을 집행하세요.', choices: [{ label: '전체 보안 감사', detail: '크레딧 −90 · 신뢰 +6', cash: -90, trust: 6 }, { label: '해당 노드만 차단', detail: '신뢰 −5 · 추가 비용 없음', cash: 0, trust: -5 }] }
  ];
  const staffEvents = [
    { id: 'resignation', tag: 'PEOPLE OPS', title: '핵심 엔지니어의 퇴사 통보', text: '야간 온콜이 누적된 엔지니어가 이직 의사를 밝혔습니다. 팀을 붙잡거나, 조용히 인수인계할 수 있습니다.', choices: [{ label: '유지 보너스 제안', detail: '크레딧 −140 · 사기 +18 · 신뢰 +2', cash: -140, trust: 2, morale: 18 }, { label: '인수인계 후 퇴사 수락', detail: '직원 −1 · 사기 −10 · 신뢰 −1', cash: 0, trust: -1, staff: -1, morale: -10 }] },
    { id: 'burnout', tag: 'PEOPLE OPS', title: '번아웃 경보', text: '세 명의 팀원이 동시에 휴가를 요청했습니다. 단기 매출과 팀의 회복 중 하나를 골라야 합니다.', choices: [{ label: '회복 주간 운영', detail: '크레딧 −90 · 사기 +24 · 신뢰 +2', cash: -90, trust: 2, morale: 24 }, { label: '초과 근무 유지', detail: '크레딧 +75 · 사기 −24 · 신뢰 −5', cash: 75, trust: -5, morale: -24 }] },
    { id: 'referral', tag: 'PEOPLE OPS', title: '동료 추천 신호', text: '신뢰할 만한 자동화 엔지니어가 팀 합류를 원합니다. 온보딩 비용을 들여 지금 확보할까요?', choices: [{ label: '추천 채용 진행', detail: '크레딧 −120 · 직원 +1 · 사기 +6', cash: -120, trust: 0, staff: 1, morale: 6 }, { label: '후보 풀에 보관', detail: '사기 −3 · 비용 없음', cash: 0, trust: 0, morale: -3 }] }
  ];
  const events = civicEvents.concat(staffEvents);
  const clone = s => JSON.parse(JSON.stringify(s));
  const clamp = n => Math.max(0, Math.min(100, n));
  const district = id => districts.find(d => d.id === id);
  const contractProfile = id => contractProfiles.find(p => p.id === id);
  const staffOf = s => Number.isSafeInteger(s && s.staff) ? Math.max(1, Math.min(8, s.staff)) : 3;
  const moraleOf = s => Number.isSafeInteger(s && s.morale) ? clamp(s.morale) : 72;
  const debtLimit = -600;
  const canAfford = (s, cost) => Number.isFinite(cost) && cost >= 0 && Number.isFinite(s && s.cash) && s.cash - cost >= debtLimit;
  const debtInterest = s => Math.ceil(Math.max(0, -(Number.isFinite(s && s.cash) ? s.cash : 0)) * .05);
  const powerFor = id => Object.prototype.hasOwnProperty.call(districtPowers, id) ? districtPowers[id] : null;
  const rivalHeat = s => Number.isSafeInteger(s && s.rivalHeat) ? clamp(s.rivalHeat) : 18;
  const rivalSignalFor = heat => heat >= 100 ? 'breach' : heat >= 75 ? 'lockdown' : heat >= 50 ? 'hunt' : heat >= 30 ? 'trace' : 'silent';
  const countermeasureCost = s => 110 + (rivalHeat(s) >= 75 ? 20 : 0);
  const countermeasureReduction = 28;
  function powerCooldownsFor(s) {
    const source = s && s.powerCooldowns && typeof s.powerCooldowns === 'object' && !Array.isArray(s.powerCooldowns) ? s.powerCooldowns : {};
    return districts.reduce((cooldowns, d) => {
      const value = source[d.id];
      cooldowns[d.id] = Number.isSafeInteger(value) && value >= 0 && value <= powerFor(d.id).cooldown ? value : 0;
      return cooldowns;
    }, {});
  }
  function pulseForDay(s) {
    const jobs = Array.isArray(s && s.jobs) ? s.jobs : [];
    const active = jobs.length > 0, heat = rivalHeat(s);
    const pressure = active ? Math.min(2, Math.floor(jobs.reduce((total, job) => total + (district(job && job.district)?.pressure || 0), 0) / 3)) : 0;
    const rapid = active && jobs.some(job => job && job.variant === 'rapid') ? 1 : 0;
    const network = active && Array.isArray(s && s.districts) && s.districts.length >= 5 && jobs.length >= 2 ? 1 : 0;
    const seed = Number.isSafeInteger(s && s.seed) ? s.seed >>> 0 : 0;
    const day = Number.isSafeInteger(s && s.day) ? s.day : 1;
    const noise = active && ((Math.imul(seed ^ Math.imul(day, 2654435761), 1103515245) + 12345) >>> 0) % 7 === 0 ? 1 : 0;
    const escalation = active && heat >= 75 ? 1 : 0;
    const base = active ? 1 : -2;
    const delta = base + pressure + rapid + network + noise + escalation;
    const nextHeat = clamp(heat + delta);
    const penalty = heat >= 75 ? 70 + Math.floor((heat - 75) / 10) * 20 : 0;
    const moralePenalty = heat >= 85 ? 3 : 0;
    const signal = rivalSignalFor(nextHeat);
    const warning = signal === 'breach' ? '경쟁사가 서울 노드를 장악했습니다.' : signal === 'lockdown' ? '경쟁사가 현금 흐름을 차단하고 있습니다.' : signal === 'hunt' ? '경쟁사의 추적 팀이 당신의 노드를 사냥합니다.' : signal === 'trace' ? '경쟁사가 당신의 신호를 추적 중입니다.' : '경쟁사 추적 신호가 낮습니다.';
    return { heat, delta, base, pressure, rapid, network, noise, escalation, nextHeat, signal, warning, penalty, moralePenalty };
  }
  function normalizeShadow(s) {
    s.rivalHeat = rivalHeat(s);
    s.powerCooldowns = powerCooldownsFor(s);
    s.rivalSignal = rivalSignalFor(s.rivalHeat);
    return s;
  }
  function tickPowerCooldowns(s) {
    for (const d of districts) s.powerCooldowns[d.id] = Math.max(0, s.powerCooldowns[d.id] - 1);
  }
  const researchCost = (s, id) => { const r = research.find(r => r.id === id); return r ? r.base * (s.tech[id] + 1) : Infinity; };
  const serverCost = s => 200 + (s.servers - 1) * 110;
  const hireCost = s => 180 + Math.max(0, staffOf(s) - 3) * 90;
  const teamCareCost = s => 70 + staffOf(s) * 5;
  function moralePressure(s) {
    const staff = staffOf(s), active = Array.isArray(s && s.jobs) ? s.jobs.length : 0;
    if (!active) return 0;
    const rush = s.jobs.some(j => j && j.variant === 'rapid') ? 1 : 0;
    const districtLoad = s.jobs.reduce((total, job) => {
      const d = district(job && job.district);
      return total + (d && Number.isSafeInteger(d.pressure) ? d.pressure : 0);
    }, 0);
    return (active >= staff ? 4 : active === staff - 1 ? 2 : 1) + rush + districtLoad;
  }
  function normalizePeople(s) {
    s.staff = staffOf(s); s.morale = moraleOf(s);
    commerce.normalize(s);
    return normalizeShadow(s);
  }
  function contractOption(s, id, variant = 'standard') {
    const d = district(id), profile = contractProfile(variant);
    if (!d || !profile || !s || !s.tech || !Number.isSafeInteger(s.tech.language)) return null;
    return {
      id: profile.id, name: profile.name, en: profile.en, description: profile.description,
      job: `${d.job} · ${profile.name}`,
      reward: Math.round(d.reward * profile.rewardMultiplier * (100 + s.tech.language * 15) / 100),
      duration: Math.max(1, d.duration + profile.durationDelta),
      compute: Math.max(1, d.compute + profile.computeDelta),
      trust: Math.max(0, d.trust + profile.trustDelta), level: d.level, trustGate: d.trustGate, pressure: d.pressure
    };
  }
  const contractOptions = (s, id) => contractProfiles.map(profile => contractOption(s, id, profile.id)).filter(Boolean);
  const contractReward = (s, id, variant = 'standard') => {
    const option = contractOption(s, id, variant);
    return option ? option.reward : 0;
  };
  function log(s, text, type = 'info') { s.logs.unshift({ day: s.day, text, type }); s.logs = s.logs.slice(0, 60); }
  function createGame(seed = 2087) {
    return { business: {...commerce.fresh((seed >>> 0) || 2087),transactions:[],responses:[]}, version: 1, seed: (seed >>> 0) || 2087, day: 1, ap: 3, cash: 1000, trust: 58, servers: 1,
      tech: { language: 0, efficiency: 0, ethics: 0 }, districts: ['euljiro'], jobs: [], completed: 0,
      staff: 3, morale: 72, rivalHeat: 18, powerCooldowns: powerCooldownsFor(), rivalSignal: 'silent', earned: 0, status: 'playing', event: null, history: [{ day: 0, cash: 1000 }],
      logs: [{ day: 1, text: '을지로 노드 온라인. 당신의 서울을 시작하세요.', type: 'good' }] };
  }
  function forecast(s) {
    const income = s.districts.reduce((n, id) => n + district(id).income, 0);
    const fixedCost = 20 + s.districts.reduce((n, id) => n + district(id).upkeep, 0) + Math.round(s.servers * 24 * (1 - s.tech.efficiency * .2));
    const payroll = staffOf(s) * 8, interest = debtInterest(s), cost = fixedCost + payroll + interest;
    const staff = staffOf(s), staffUsed = s.jobs.length, staffCapacity = Math.min(8, 2 + s.servers * 2);
    const debt = Math.max(0, -s.cash), districtPressure = s.jobs.reduce((total, job) => {
      const d = district(job && job.district);
      return total + (d && Number.isSafeInteger(d.pressure) ? d.pressure : 0);
    }, 0);
    const pulse = pulseForDay(s), heat = rivalHeat(s), cooldowns = powerCooldownsFor(s), customer = commerce.forecast(s);
    return { commerce: customer, income, fixedCost, payroll, debt, debtLimit, debtInterest: interest, creditAvailable: Math.max(0, s.cash - debtLimit), cost, net: income - cost + customer.net, capacity: s.servers * 4 + s.tech.efficiency,
      used: s.jobs.reduce((n, j) => n + j.compute, 0), staffCapacity, staff: staff, staffUsed, staffAvailable: Math.max(0, staff - staffUsed),
      districtPressure, moralePressure: moralePressure(s), payout: s.jobs.filter(j => j.remaining === 1).reduce((n, j) => n + j.reward, 0),
      rivalHeat: heat, rivalSignal: rivalSignalFor(heat), heatDelta: pulse.delta, nextRivalHeat: pulse.nextHeat, rivalPenalty: pulse.penalty, rivalMoralePenalty: pulse.moralePenalty, rivalWarning: pulse.warning,
      powerCooldowns: cooldowns, countermeasureCost: countermeasureCost(s), countermeasureReduction };
  }
  function evaluate(s) {
    if (s.cash < debtLimit || s.trust <= 0 || s.morale <= 0 || rivalHeat(s) >= 100) {
      s.status = 'lost';
      log(s, s.cash < debtLimit ? '신용 한도를 초과했습니다. 독립 운영이 종료됐습니다.' : s.trust <= 0 ? '시민 신뢰 붕괴. 도시 연결 권한이 회수됐습니다.' : s.morale <= 0 ? '팀 사기가 붕괴했습니다. 서울 노드가 멈춥니다.' : '경쟁사가 서울 노드를 장악했습니다. 섀도 프로토콜이 노출됐습니다.', 'bad');
    }
  }
  function scheduleEvent(s) {
    const pool = s.day % 9 === 0 ? (s.staff <= 1 ? staffEvents.filter(e => e.id !== 'resignation') : staffEvents) : s.day % 3 === 0 ? civicEvents : null;
    if (!pool) return;
    s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
    s.event = pool[s.seed % pool.length].id;
  }
  function act(input, action) {
    const fail = message => ({ ok: false, state: input, message });
    if (!input || !action || input.status !== 'playing') return fail('종료된 캠페인입니다. 새 게임을 시작하세요.');
    const { type, id, variant } = action, s = normalizePeople(clone(input)), d = district(id), f = forecast(s);
    if (s.event && type !== 'event') return fail('도시 사건에 먼저 대응하세요.');
    if (!['respond', 'business', 'accept', 'expand', 'research', 'server', 'outreach', 'hire', 'care', 'power', 'countermeasure', 'next', 'event'].includes(type)) return fail('알 수 없는 명령입니다.');
    if (!['next', 'event'].includes(type) && s.ap <= 0) return fail('오늘의 행동력을 모두 사용했습니다. 다음 날로 진행하세요.');
    let message;
    if (type === 'respond') {
      const error=commerce.respond(s,id,variant);if(error)return fail(error);
      const choice=commerce.interventions[variant];message=`${choice.name} · −${choice.cost} ₩C · 평가 #${id} 확률 변경`;
    } else if (type === 'business') {
      const error = commerce.apply(s,id); if(error) return fail(error);
      const choice = commerce.decisions.find(x=>x.id===id);
      message = `${choice.name} · −${choice.cost} ₩C · D${Math.min(30,s.day+2)} 결산 후속 평가`;
    } else if (type === 'accept') {
      if (!d || !s.districts.includes(id)) return fail('먼저 해당 지역에 진출하세요.');
      if (s.jobs.some(j => j.district === id)) return fail('이 지역 계약을 이미 수행 중입니다.');
      if (s.trust < d.trustGate) return fail(`${d.name} 계약에는 시민 신뢰 ${d.trustGate} 이상이 필요합니다.`);
      const option = contractOption(s, id, variant === undefined ? 'standard' : variant);
      if (!option) return fail('유효하지 않은 계약 방식입니다.');
      if (s.jobs.length >= s.staff) return fail('배정 가능한 직원이 없습니다. 팀을 채용하거나 계약을 완료하세요.');
      if (f.used + option.compute > f.capacity) return fail('연산 용량 부족. 서버를 증설하세요.');
      s.jobs.push({ district: id, variant: option.id, remaining: option.duration, duration: option.duration, compute: option.compute, reward: option.reward, trust: option.trust });
      message = `${d.name} · ${option.name} 계약 체결`;
    } else if (type === 'expand') {
      if (!d || s.districts.includes(id)) return fail('진출할 수 없는 지역입니다.');
      if (s.tech.language < d.tier) return fail(`서울 언어 모델 Lv.${d.tier} 연구가 필요합니다.`);
      if (s.trust < d.trustGate) return fail(`${d.name} 연결에는 시민 신뢰 ${d.trustGate} 이상이 필요합니다.`);
      if (!canAfford(s, d.cost)) return fail('신용 한도 안의 진출 자금이 부족합니다.');
      s.cash -= d.cost; s.districts.push(id); message = `${d.name} 노드 연결 완료 · −${d.cost} 크레딧`;
    } else if (type === 'research') {
      const r = research.find(r => r.id === id);
      if (!r || s.tech[id] >= r.max) return fail('진행할 수 없는 연구입니다.');
      const price = researchCost(s, id);
      if (!canAfford(s, price)) return fail('신용 한도 안의 연구 자금이 부족합니다.');
      s.cash -= price; s.tech[id]++;
      if (id === 'ethics') s.trust = clamp(s.trust + 4);
      message = `${r.name} Lv.${s.tech[id]} 연구 완료`;
    } else if (type === 'server') {
      if (s.servers >= 8) return fail('서버를 최대로 확장했습니다.');
      const price = serverCost(s);
      if (!canAfford(s, price)) return fail('신용 한도 안의 서버 증설 자금이 부족합니다.');
      s.cash -= price; s.servers++; message = '서버 증설 완료 · 연산 용량 +4';
    } else if (type === 'outreach') {
      if (!canAfford(s, 100)) return fail('신용 한도 안의 시민 지원 자금이 부족합니다.');
      if (s.trust >= 100) return fail('시민 신뢰가 이미 최고입니다.');
      s.cash -= 100; s.trust = clamp(s.trust + 9); message = '시민 지원 프로그램 가동 · 신뢰 +9';
    } else if (type === 'hire') {
      if (s.staff >= f.staffCapacity) return fail('현재 서버 인사 슬롯이 가득합니다. 서버를 증설하세요.');
      const price = hireCost(s);
      if (!canAfford(s, price)) return fail('신용 한도 안의 채용 자금이 부족합니다.');
      s.cash -= price; s.staff++; s.morale = clamp(s.morale + 4);
      message = `신규 직원 합류 · 직원 ${s.staff}명 · 사기 +4`;
    } else if (type === 'care') {
      if (s.morale >= 100) return fail('팀 사기가 이미 최고입니다.');
      const price = teamCareCost(s);
      if (!canAfford(s, price)) return fail('신용 한도 안의 팀 케어 예산이 부족합니다.');
      s.cash -= price; s.morale = clamp(s.morale + 28);
      message = `팀 케어 완료 · 사기 +28`;
    } else if (type === 'power') {
      const power = powerFor(id);
      if (!d || !power || !s.districts.includes(id)) return fail('연결한 지역의 섀도 프로토콜만 실행할 수 있습니다.');
      if (s.powerCooldowns[id] > 0) return fail(`${power.name} 재충전에 ${s.powerCooldowns[id]}일이 더 필요합니다.`);
      if (power.requiresJobs && !s.jobs.length) return fail(`${power.name}은 진행 중인 계약이 있을 때만 실행할 수 있습니다.`);
      if (power.advance) for (const job of s.jobs) job.remaining = Math.max(1, job.remaining - power.advance);
      s.cash += power.cash || 0;
      s.trust = clamp(s.trust + (power.trust || 0));
      s.morale = clamp(s.morale + (power.morale || 0));
      s.rivalHeat = clamp(s.rivalHeat + power.heat);
      s.rivalSignal = rivalSignalFor(s.rivalHeat);
      s.powerCooldowns[id] = power.cooldown;
      message = `${d.name} · ${power.name} 실행 · 경쟁사 추적 +${power.heat}`;
      evaluate(s);
    } else if (type === 'countermeasure') {
      if (s.rivalHeat <= 0) return fail('차단할 경쟁사 추적 신호가 없습니다.');
      const price = countermeasureCost(s);
      if (!canAfford(s, price)) return fail('신용 한도 안의 역추적 예산이 부족합니다.');
      const reduced = Math.min(countermeasureReduction, s.rivalHeat);
      s.cash -= price; s.rivalHeat -= reduced; s.rivalSignal = rivalSignalFor(s.rivalHeat);
      message = `역추적 반격 완료 · 경쟁사 추적 −${reduced}`;
    } else if (type === 'event') {
      const event = events.find(e => e.id === s.event);
      if (!event || !Number.isInteger(Number(id))) return fail('대응할 사건이 없습니다.');
      const choice = event.choices[Number(id)];
      if (!choice) return fail('유효하지 않은 선택입니다.');
      const cash = Number.isSafeInteger(choice.cash) ? choice.cash : 0;
      const trust = Number.isSafeInteger(choice.trust) ? choice.trust : 0;
      const staff = Number.isSafeInteger(choice.staff) ? choice.staff : 0;
      const morale = Number.isSafeInteger(choice.morale) ? choice.morale : 0;
      if (!canAfford(s, Math.max(0, -cash))) return fail('이 선택에 필요한 신용 한도가 부족합니다.');
      if (staff > 0 && s.staff + staff > f.staffCapacity) return fail('추천 인원을 받을 서버 인사 슬롯이 부족합니다.');
      if (staff < 0 && s.jobs.length && s.staff + staff < s.jobs.length) return fail('진행 중인 계약을 맡을 직원이 부족합니다.');
      s.cash += cash; s.trust = clamp(s.trust + trust); s.staff = Math.max(1, Math.min(8, s.staff + staff)); s.morale = clamp(s.morale + morale); s.event = null;
      message = `${event.title} · ${choice.label}`; evaluate(s);
    } else if (type === 'next') {
      const openingCash = s.cash, oldStories = new Set(s.business.stories.map(x=>x.id));
      const pressure = f.moralePressure, pulse = pulseForDay(s);
      s.cash += f.net - pulse.penalty; s.earned += f.income + f.commerce.sales - f.commerce.refunds; s.morale = clamp(s.morale - pressure - pulse.moralePenalty);
      s.rivalHeat = pulse.nextHeat; s.rivalSignal = pulse.signal; tickPowerCooldowns(s);
      for (const j of s.jobs) {
        j.remaining--;
        if (j.remaining === 0) {
          s.cash += j.reward; s.earned += j.reward; s.completed++;
          s.trust = clamp(s.trust + (Number.isSafeInteger(j.trust) ? j.trust : district(j.district).trust) + s.tech.ethics * 2);
          log(s, `${district(j.district).name} 계약 완료 · +${j.reward} 크레딧`, 'good');
        }
      }
      s.jobs = s.jobs.filter(j => j.remaining > 0);
      const reactionCash = commerce.settle(s);
      normalizeShadow(s);
      commerce.close(s,f,{day:s.day,opening:openingCash,closing:s.cash,network:f.income,operating:f.cost,rival:pulse.penalty,contracts:f.payout,reactionCash,net:s.cash-openingCash});
      for(const story of s.business.stories.filter(x=>!oldStories.has(x.id))) log(s,`${story.source} → ${story.title} · ${story.cash>=0?'+':''}${story.cash} ₩C`,['bad','worst'].includes(story.tier)?'bad':'good');
      log(s,`고객 ${f.commerce.visitors}명 → 결제 ${f.commerce.orders}건 · 매출 ${f.commerce.sales} · 환불 ${f.commerce.refunds} · 처리비 ${f.commerce.fulfilment} · 놓친 주문 ${f.commerce.lost}`,f.commerce.net>=0?'good':'bad');
      s.history.push({ day: s.day, cash: s.cash });
      log(s, `일일 결산 · 수입 ${f.income} / 운영비 ${f.cost} · 급여 ${f.payroll}${pressure ? ` · 사기 −${pressure}` : ''}${pulse.moralePenalty ? ` · 침투 사기 −${pulse.moralePenalty}` : ''}${pulse.penalty ? ` · 경쟁사 차단 −${pulse.penalty}` : ''} · 추적 ${s.rivalHeat}${pulse.delta >= 0 ? ` (+${pulse.delta})` : ` (${pulse.delta})`}`, f.net - pulse.penalty >= 0 ? 'good' : 'info');
      evaluate(s);
      if (s.status === 'playing' && s.day === 30) {
        s.status = s.cash >= 1500 && s.trust >= 65 && s.districts.length >= 3 ? 'won' : 'finished';
      } else if (s.status === 'playing') {
        s.day++; s.ap = 3;
        scheduleEvent(s);
      }
      return { ok: true, state: s, message: s.status === 'playing' ? `${s.day}일차 시작 · 행동력 회복` : '캠페인 결산 완료' };
    }
    if (!['event', 'next'].includes(type)) s.ap--;
    commerce.transaction(s,s.cash-input.cash,message);
    if(type!=='respond')commerce.queue(s,commerce.actionKind(action,input),type==='business'?commerce.decisions.find(x=>x.id===id).name:message,0,null,commerce.odds(input,type==='business'?id:type));
    log(s, message, 'good');
    return { ok: true, state: s, message };
  }
  function restore(raw) {
    try {
      if (typeof raw !== 'string' || raw.length > 750000) return null;
      const s = JSON.parse(raw), integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
      const hasStaff = s && Object.prototype.hasOwnProperty.call(s, 'staff');
      const hasMorale = s && Object.prototype.hasOwnProperty.call(s, 'morale');
      const hasRivalHeat = s && Object.prototype.hasOwnProperty.call(s, 'rivalHeat');
      const hasPowerCooldowns = s && Object.prototype.hasOwnProperty.call(s, 'powerCooldowns');
      if (!s || s.version !== 1 || !integer(s.seed, 0, 4294967295) || !integer(s.day, 1, 30) || !integer(s.ap, 0, 3) || !integer(s.cash, -1000000, 100000000) || !integer(s.trust, 0, 100) || !integer(s.servers, 1, 8)) return null;
      if (Object.prototype.hasOwnProperty.call(s,'business') && !commerce.valid(s.business)) return null;
      commerce.normalize(s);
      if ((hasStaff && !integer(s.staff, 1, 8)) || (hasMorale && !integer(s.morale, 0, 100))) return null;
      if (hasRivalHeat && !integer(s.rivalHeat, 0, 100)) return null;
      if (hasPowerCooldowns && (!s.powerCooldowns || typeof s.powerCooldowns !== 'object' || Array.isArray(s.powerCooldowns))) return null;
      if (hasPowerCooldowns) for (const d of districts) {
        if (Object.prototype.hasOwnProperty.call(s.powerCooldowns, d.id) && !integer(s.powerCooldowns[d.id], 0, powerFor(d.id).cooldown)) return null;
      }
      if (!['playing', 'won', 'lost', 'finished'].includes(s.status) || !s.tech || research.some(r => !integer(s.tech[r.id], 0, 3))) return null;
      if (!Array.isArray(s.districts) || !s.districts.includes('euljiro') || s.districts.length > 6 || new Set(s.districts).size !== s.districts.length || s.districts.some(id => !district(id))) return null;
      if (!Array.isArray(s.jobs) || s.jobs.length > 6 || new Set(s.jobs.map(j => j && j.district)).size !== s.jobs.length) return null;
      for (const j of s.jobs) {
        if (!j || !s.districts.includes(j.district) || !integer(j.reward, 1, 10000)) return null;
        const legacy = !Object.prototype.hasOwnProperty.call(j, 'variant');
        const variant = legacy ? 'standard' : j.variant;
        const option = contractOption(s, j.district, variant);
        if (!option || !integer(j.remaining, 1, 5) || j.duration !== option.duration || j.remaining > j.duration || j.compute !== option.compute) return null;
        if (legacy) { j.variant = 'standard'; j.trust = option.trust; }
        else if (!integer(j.trust, 0, 100) || j.trust !== option.trust) return null;
      }
      if (!hasStaff) s.staff = Math.max(3, s.jobs.length);
      if (!hasMorale) s.morale = 72;
      if (!hasRivalHeat) s.rivalHeat = 18;
      s.powerCooldowns = powerCooldownsFor(s);
      s.rivalSignal = rivalSignalFor(s.rivalHeat);
      if (s.jobs.length > s.staff) return null;
      if (s.status === 'playing' && s.rivalHeat >= 100) return null;
      if (forecast(s).used > forecast(s).capacity || !integer(s.completed, 0, 1000) || !integer(s.earned, 0, 100000000)) return null;
      if (s.event !== null && !events.some(e => e.id === s.event)) return null;
      if (!Array.isArray(s.history) || !s.history.length || s.history.length > 31 || s.history.some(h => !h || !integer(h.day, 0, 30) || !integer(h.cash, -1000000, 100000000))) return null;
      if (!Array.isArray(s.logs) || s.logs.length > 60 || s.logs.some(l => !l || !integer(l.day, 1, 30) || typeof l.text !== 'string' || l.text.length > 300 || !['info', 'good', 'bad'].includes(l.type))) return null;
      return clone(s);
    } catch { return null; }
  }
  const api = { commerce, createGame, act, forecast, restore, districts, research, events, staffEvents, contractProfiles, contractOption, contractOptions, districtPowers, researchCost, serverCost, hireCost, teamCareCost, moralePressure, debtLimit, canAfford, debtInterest, contractReward, rivalHeat, pulseForDay, countermeasureCost, countermeasureReduction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SeoulEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
