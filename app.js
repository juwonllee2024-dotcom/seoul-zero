(function () {
  'use strict';
  const E = window.SeoulEngine, $ = id => document.getElementById(id);
  const SAVE = 'seoul-zero-save-v1', PREF = 'seoul-zero-prefs-v1';
  let storageOK = true, saved = null, sound = false, guided = true, lastMove = null;
  try { saved = localStorage.getItem(SAVE); const prefs=JSON.parse(localStorage.getItem(PREF) || '{}'); sound = prefs.sound === true; guided = prefs.guided !== false; } catch { storageOK = false; }
  let state = E.restore(saved) || E.createGame(), page = 'city', selected = 'euljiro', mode = 'district', zoom = 1, toastTimer, audio, lastSettlement = null;
  const art = window.SeoulCity().replace('<svg ', '<svg preserveAspectRatio="none" ');
  const paths = {
    city: '<path d="M3 20V9l6-3v14M9 20V3h7v17M16 20V11h5v9M1 20h22M12 7h1M12 11h1M12 15h1M5 11v1M18 14v2"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 1v5m6-5v5M9 18v5m6-5v5M1 9h5m-5 6h5m12-6h5m-5 6h5"/><rect x="9" y="9" width="6" height="6"/>',
    contract: '<path d="M5 3h11l3 3v15H5Z M15 3v5h4M8 11h8M8 15h8M8 18h4"/>',
    flask: '<path d="M9 3h6M10 3v6L4 19q-1 2 2 2h12q3 0 2-2L14 9V3M7 15h10"/>',
    server: '<rect x="3" y="3" width="18" height="7" rx="1"/><rect x="3" y="14" width="18" height="7" rx="1"/><path d="M7 6h.1M7 17h.1M12 6h5M12 17h5"/>',
    log: '<path d="M4 5h16M4 10h10M4 15h16M4 20h10"/>',
    settings: '<path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z"/><circle cx="12" cy="12" r="3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 5M12 17h.01"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8H9v8h6M7 11h7"/>',
    heart: '<path d="M12 20L4 12C-2 5 7 0 12 7 17 0 26 5 20 12Z"/>',
    network: '<circle cx="12" cy="5" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M11 8l-5 7M13 8l5 7M8 18h8"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    check: '<path d="M5 12l4 4L19 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    volume: '<path d="M3 9h4l5-4v14l-5-4H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>',
    leaf: '<path d="M20 3C7 2 2 9 6 15s14 1 14-12ZM4 21L16 8"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 10-13h-8Z"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.chip}</svg>`;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const num = n => n.toLocaleString('ko-KR');
  const sign = n => `${n >= 0 ? '+' : '−'}${num(Math.abs(n))}`;
  const disabled = condition => condition ? ' disabled' : '';
  const actionDisabled = () => state.ap === 0 || state.status !== 'playing' || !!state.event;
  const getDistrict = () => E.districts.find(d => d.id === selected);
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const staffCount = (snapshot = state) => Math.max(1, Math.floor(finite(snapshot?.staff, 1)));
  const morale = (snapshot = state) => Math.max(0, Math.min(100, Math.round(finite(snapshot?.morale, 70))));
  const forecastFor = (snapshot = state) => E.forecast(snapshot) || {};
  const payrollFor = (snapshot = state, forecast = forecastFor(snapshot)) => Math.max(0, finite(forecast.payroll, 0));
  const fixedCostFor = (snapshot = state, forecast = forecastFor(snapshot)) => {
    const total = Math.max(0, finite(forecast.cost, 0));
    return Math.max(0, finite(forecast.fixedCost, total - payrollFor(snapshot, forecast)));
  };
  const debtFloorFor = (snapshot = state) => {
    const limit = typeof E.debtLimit === 'function' ? E.debtLimit(snapshot) : E.debtLimit;
    const value = finite(limit, 0);
    return value > 0 ? -value : Math.min(0, value);
  };
  const canAfford = (cost, snapshot = state) => {
    const price = Math.max(0, finite(cost, 0));
    return typeof E.canAfford === 'function' ? E.canAfford(snapshot, price) : finite(snapshot?.cash, 0) - price >= debtFloorFor(snapshot);
  };
  const debtInterestFor = (snapshot = state, forecast = forecastFor(snapshot)) => {
    const interest = Number.isFinite(Number(forecast.debtInterest)) ? forecast.debtInterest : (typeof E.debtInterest === 'function' ? E.debtInterest(snapshot) : E.debtInterest);
    return Math.max(0, finite(interest, 0));
  };
  function creditLine(snapshot = state, forecast = forecastFor(snapshot)) {
    const cash = finite(snapshot?.cash, 0), floor = debtFloorFor(snapshot), debt = Math.max(0, finite(forecast.debt, Math.max(0, -cash)));
    const available = Math.max(0, finite(forecast.creditAvailable, cash - floor));
    return { active: cash < 0, cash, floor, debt, available, interest: debtInterestFor(snapshot, forecast) };
  }
  const districtLevel = district => Math.max(1, Math.floor(finite(district?.level, finite(district?.difficulty, finite(district?.tier, 0) + 1))));
  const districtTrustGate = district => Math.max(0, Math.round(finite(district?.trustGate, 0)));
  const districtPressure = district => Math.max(0, Math.round(finite(district?.pressure, Math.max(0, districtLevel(district) - 1))));
  const districtDifficulty = district => {
    const level = districtLevel(district);
    return { level, label: level <= 1 ? '입문' : level === 2 ? '주의' : level === 3 ? '고압' : level === 4 ? '위험' : '극한' };
  };
  const staffCapacity = (snapshot = state, forecast = forecastFor(snapshot)) => Math.max(1, Math.floor(finite(forecast.staffCapacity, Math.min(8, 2 + finite(snapshot?.servers, 1) * 2))));
  const hireCost = () => {
    const cost = typeof E.hireCost === 'function' ? E.hireCost(state) : E.hireCost;
    return Math.max(0, finite(cost, 0));
  };
  const teamCareCost = () => {
    const cost = typeof E.teamCareCost === 'function' ? E.teamCareCost(state) : E.teamCareCost;
    return Math.max(0, finite(cost, 0));
  };
  const personnelReady = () => typeof E.hireCost === 'function' && (typeof E.teamCareCost === 'function' || Number.isFinite(Number(E.teamCareCost)));
  const moraleState = value => value >= 76 ? '집중 상태' : value >= 51 ? '안정 운영' : value >= 31 ? '피로 누적' : '이탈 위험';
  const offersFor = d => E.contractOptions ? E.contractOptions(state, d.id) : [{ id: 'standard', name: '표준 실행', en: 'STANDARD RUN', description: d.job, job: d.job, reward: E.contractReward(state, d.id), duration: d.duration, compute: d.compute, trust: d.trust }];
  const has = (object, key) => !!object && Object.prototype.hasOwnProperty.call(object, key);
  const shadowText = (value, fallback = '') => {
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value)) return value.filter(item => typeof item === 'string' && item.trim()).join(' · ') || fallback;
    return fallback;
  };
  const shadowNumber = (value, fallback = 0) => Math.max(0, Math.round(finite(value, fallback)));
  function shadowReady(snapshot = state) {
    return !!(E?.districtPowers && typeof E.pulseForDay === 'function' && has(snapshot, 'rivalHeat') && has(snapshot, 'powerCooldowns') && snapshot.powerCooldowns && typeof snapshot.powerCooldowns === 'object');
  }
  function rivalStatus(snapshot = state) {
    const heat = Math.min(100, shadowNumber(snapshot?.rivalHeat, 0));
    const stages = [
      { key: 'silent', at: 0, name: 'SILENT TRACE', label: '잠복', copy: 'NEXUS가 도시 가장자리에서 신호를 모읍니다.' },
      { key: 'trace', at: 25, name: 'TRACE ACTIVE', label: '추적', copy: '시장 신호에 간섭이 감지됩니다.' },
      { key: 'hunt', at: 50, name: 'HUNT MODE', label: '사냥', copy: '연결 노드를 겨냥한 압박이 시작됐습니다.' },
      { key: 'lockdown', at: 75, name: 'LOCKDOWN', label: '봉쇄', copy: '도시망이 NEXUS의 우선 목표가 됐습니다.' },
      { key: 'breach', at: 90, name: 'BREACH IMMINENT', label: '침투 임박', copy: '즉시 대응하지 않으면 운영권을 잃을 수 있습니다.' }
    ];
    const requested = shadowText(snapshot?.rivalSignal).toLowerCase();
    const bySignal = stages.find(stage => stage.key === requested);
    const byHeat = stages.filter(stage => heat >= stage.at).at(-1) || stages[0];
    return { heat, ...(bySignal || byHeat) };
  }
  function pulseInfo(snapshot = state) {
    let raw = null;
    try { raw = typeof E.pulseForDay === 'function' ? E.pulseForDay(snapshot) : null; } catch { raw = null; }
    const fallback = [
      { name: 'GHOST TRAFFIC', label: '유령 교통', description: '도시 파동 모듈 동기화 대기', warning: '규칙 효과 없음' },
      { name: 'NIGHT FREIGHT', label: '야간 물류', description: '서울 데이터 흐름을 관측 중', warning: '규칙 효과 없음' },
      { name: 'NEON WEATHER', label: '네온 기상', description: '신호층이 아직 잠복 상태입니다.', warning: '규칙 효과 없음' }
    ][Math.max(0, (Math.floor(finite(snapshot?.day, 1)) - 1) % 3)];
    if (!raw || typeof raw !== 'object') return { ...fallback, live: false, delta: 0, pressure: 0, penalty: 0, noise: 0 };
    const signal = shadowText(raw.name || raw.title || raw.signal, fallback.name);
    const signalLabel = { silent: '저소음 잠복', trace: '추적 파동', hunt: '사냥 파동', lockdown: '봉쇄 파동', breach: '침투 직전' }[String(raw.signal || '').toLowerCase()] || signal;
    const delta = finite(raw.delta, 0), pressure = shadowNumber(raw.pressure, 0), penalty = shadowNumber(raw.penalty, 0);
    const detail = shadowText(raw.description || raw.copy || raw.effect, Number.isFinite(Number(raw.nextHeat)) ? `다음 열기 예측 ${raw.nextHeat} · 기본 신호 ${finite(raw.base, 0)} · 네트워크 ${finite(raw.network, 0)}` : '도시 신호가 이번 결산의 흐름을 바꿉니다.');
    const warning = shadowText(raw.warning || raw.risk || raw.penaltyLabel, penalty ? `운영 압박 ${penalty}` : 'NEXUS 감시 중');
    return { name: signal.toUpperCase(), label: shadowText(raw.label, signalLabel), description: detail, warning, live: true, delta, pressure, penalty, noise: shadowNumber(raw.noise, 0) };
  }
  function districtPowerRaw(id) {
    const library = E?.districtPowers;
    if (Array.isArray(library)) return library.find(power => power && (power.id === id || power.district === id)) || null;
    if (library && typeof library === 'object') return library[id] || Object.values(library).find(power => power && typeof power === 'object' && (power.id === id || power.district === id)) || null;
    return null;
  }
  function powerCooldown(id, snapshot = state) {
    const raw = snapshot?.powerCooldowns?.[id];
    if (raw && typeof raw === 'object') return shadowNumber(raw.remaining ?? raw.days ?? raw.value ?? raw.cooldown, 0);
    return shadowNumber(raw, 0);
  }
  function countermeasureCost(snapshot = state) {
    try { return Math.max(0, finite(typeof E.countermeasureCost === 'function' ? E.countermeasureCost(snapshot) : E.countermeasureCost, 110)); }
    catch { return 110; }
  }
  function districtPower(d, snapshot = state) {
    const raw = districtPowerRaw(d.id) || {};
    const defaults = {
      euljiro: ['Ghost Forge', '생산 라인을 오버클럭합니다.'], hongdae: ['Viral Echo', '도시 관심도를 순간 증폭합니다.'],
      yongsan: ['Aegis Mesh', '연결 노드를 보호합니다.'], seongsu: ['Maker Swarm', '창작 네트워크를 가속합니다.'],
      gangnam: ['Market Mirage', '시장의 시선을 교란합니다.'], songpa: ['Orbit Link', '광역 신호를 재배열합니다.']
    }[d.id] || ['Local Protocol', '지역 신호에 개입합니다.'];
    const heat = shadowNumber(raw.heat ?? raw.heatCost ?? raw.riskHeat, 0);
    return {
      name: shadowText(raw.name || raw.title || raw.label, defaults[0]),
      en: shadowText(raw.en || raw.code || raw.id, d.en),
      description: shadowText(raw.description || raw.copy, defaults[1]),
      effect: shadowText(raw.effectLabel || raw.effect || raw.reward || raw.benefit, '도시 파동에 개입'),
      risk: shadowText(raw.riskLabel || raw.risk, heat ? `NEXUS 열기 +${heat}` : '열기 데이터 동기화 중'),
      heat,
      cooldown: Math.max(1, shadowNumber(raw.cooldown ?? raw.cooldownDays, 1)),
      remaining: powerCooldown(d.id, snapshot),
      requiresJobs: raw.requiresJobs === true
    };
  }
  function shadowProtocol() {
    const live = shadowReady(), rival = rivalStatus(), pulse = pulseInfo(), connected = E.districts.filter(d => state.districts.includes(d.id));
    const counterCost = countermeasureCost(), counterReady = live && rival.heat > 0 && !actionDisabled() && canAfford(counterCost);
    const counterText = !live ? 'NEXUS 모듈 동기화 중' : rival.heat === 0 ? '위협 신호 없음' : actionDisabled() ? '행동력 또는 사건 확인 필요' : !canAfford(counterCost) ? '대응 크레딧 부족' : `대응 프로토콜 · ${num(counterCost)} ₩C`;
    const cards = connected.map(d => {
      const power = districtPower(d), needsJobs = power.requiresJobs && !state.jobs.length, ready = live && power.remaining === 0 && !actionDisabled() && !needsJobs;
      const stateLabel = !live ? 'MODULE LOCKED' : power.remaining > 0 ? `RECHARGE · ${power.remaining}일` : needsJobs ? 'LIVE JOB REQUIRED' : actionDisabled() ? 'ACTION LOCKED' : 'READY TO FIRE';
      const action = live ? ` data-action="power" data-id="${esc(d.id)}"` : '';
      return `<article class="shadow-power ${ready ? 'ready' : ''} ${power.remaining > 0 ? 'cooling' : ''}"><div class="power-top"><span>${esc(d.name)}</span><small>${esc(d.en)}</small></div><div class="power-mark" aria-hidden="true">${icon('bolt')}</div><h3>${esc(power.name)}</h3><p>${esc(power.description)}</p><div class="power-impact"><span><small>REWARD</small><b>${esc(power.effect)}</b></span><span><small>EXPOSURE</small><b class="${power.heat ? 'danger' : 'muted'}">${esc(power.risk)}</b></span></div><button class="button shadow-power-action"${action}${disabled(!ready)}>${stateLabel} ${ready ? icon('bolt') : ''}</button></article>`;
    }).join('');
    const counterAction = live ? ' data-action="countermeasure"' : '';
    const pulseDelta = pulse.delta === 0 ? '±0' : `${pulse.delta > 0 ? '+' : '−'}${num(Math.abs(pulse.delta))}`;
    return `<section class="shadow-protocol ${live ? 'live' : 'dormant'} signal-${rival.key}" aria-label="Shadow Protocol 전술 레이어"><header class="shadow-head"><div><span class="eyebrow">SHADOW PROTOCOL // CITYWAR LAYER</span><h2>NEXUS 감시망</h2></div><span class="shadow-status"><i></i>${live ? 'LIVE LINK' : 'STANDBY LINK'}</span></header><div class="shadow-grid"><article class="nexus-card"><div class="nexus-ring" style="--heat:${rival.heat}%"><div><b>${rival.heat}</b><small>HEAT</small></div></div><div class="nexus-copy"><span>${rival.name}</span><strong>${rival.label}</strong><p>${rival.copy}</p></div><div class="heat-scale" aria-label="NEXUS rival heat ${rival.heat} percent"><i style="width:${rival.heat}%"></i><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div><button class="button shadow-counter"${counterAction}${disabled(!counterReady)}>${counterText} ${counterReady ? icon('target') : ''}</button></article><article class="pulse-card"><div class="pulse-top"><span>SEOUL PULSE</span><b>${esc(pulse.name)}</b></div><h3>${esc(pulse.label)}</h3><p>${esc(pulse.description)}</p><div class="pulse-stats"><span><small>HEAT SHIFT</small><b class="${pulse.delta > 0 ? 'danger' : pulse.delta < 0 ? 'lime' : 'muted'}">${pulseDelta}</b></span><span><small>PRESSURE</small><b>${pulse.pressure || '—'}</b></span><span><small>NOISE</small><b>${pulse.noise || '—'}</b></span></div><div class="pulse-warning">${icon('target')} ${esc(pulse.warning)}</div></article></div><div class="shadow-deck"><div class="deck-heading"><div><span>CONNECTED SIGNATURES</span><b>${connected.length}개 노드가 응답합니다</b></div><small>능력은 행동력 1을 사용하며, NEXUS 열기를 높일 수 있습니다.</small></div><div class="shadow-powers">${cards}</div></div></section>`;
  }
  function toast(text, error = false) {
    $('toast').textContent = text; $('toast').className = `visible${error ? ' error' : ''}`;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').className = '', 3400);
  }
  function beep() {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => {});
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(480, audio.currentTime); osc.frequency.exponentialRampToValueAtTime(720, audio.currentTime + .08);
      gain.gain.setValueAtTime(.025, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .13);
      osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + .14);
    } catch { /* Audio is optional. */ }
  }
  function save() {
    try { localStorage.setItem(SAVE, JSON.stringify(state)); storageOK = true; }
    catch { storageOK = false; }
  }
  function savePreferences() {
    try {localStorage.setItem(PREF,JSON.stringify({sound,guided}));} catch { /* Gameplay works without storage. */ }
  }
  function playStats() {
    const f=forecastFor(), c=f.commerce;
    return `<section class="play-stats" aria-label="회사 한눈에 보기"><div><small>회사 잔액</small><b class="${state.cash<0?'danger':'lime'}">${num(state.cash)} <em>₩C</em></b><span>오늘 예상 ${sign(f.net-f.rivalPenalty+f.payout)} · 연쇄 결과 별도</span></div><div><small>찾아오는 손님</small><b>${c.visitors}<em>명</em></b><span>${c.orders}건 결제 예상 · ${c.lost?`놓칠 주문 ${c.lost}건`:'주문 처리 여유 있음'}</span></div><div><small>우리 직원</small><b>${state.staff}<em>명</em></b><span>팀 사기 ${state.morale}/100 · ${moraleState(state.morale)}</span></div><div><small>라이벌 추적</small><b class="${state.rivalHeat>=55?'danger':''}">${state.rivalHeat}<em>/100</em></b><span>${state.rivalHeat>=55?'대응이 필요합니다':'조용히 성장할 시간'}</span></div></section>`;
  }
  function playDeck() {
    const G=window.SeoulPlayGuide, chapter=G.chapter(state), choices=G.choices(state,E), f=forecastFor();
    const chapterCopy=chapter.step===0?'을지로의 작은 AI 회사를 맡았습니다. 계약 하나부터 시작하세요.':chapter.step===1?'첫 계약이 진행 중입니다. 다른 투자를 하거나 하루를 마무리해 보상을 받으세요.':chapter.step<4?'회사가 자랐습니다. 새 지역을 연결하면 거리와 계약이 함께 열립니다.':'이제 자금·신뢰·서울 3곳을 지키며 30일차 결산을 준비하세요.';
    const move=lastMove?`<div class="move-receipt" role="status"><span>선택 완료</span><b>${esc(lastMove.message)}</b><small>잔액 ${sign(lastMove.cash)} · ${lastMove.ap?`행동력 −${lastMove.ap}`:'행동력 소모 없음'}${lastMove.due?` · D${lastMove.due}에 첫 반응`:''}</small><p>${lastMove.followup?'대응한 평가의 확률을 바꿨습니다. 원래 선택의 경로에서 결과가 이어집니다.':'선택은 여기서 끝나지 않습니다. 이후 반응은 아래 연쇄 기록에 남습니다.'}</p></div>`:'';
    return `<section class="play-deck"><header><div><span class="eyebrow">오늘의 플레이 · ${esc(chapter.name)}</span><h2>${esc(chapter.title)}</h2><p>${chapterCopy}</p></div><div class="play-energy" aria-label="오늘 남은 행동 ${state.ap}번">${[1,2,3].map(n=>`<i class="${n<=state.ap?'charged':''}">${n<=state.ap?'◆':'◇'}</i>`).join('')}<small>오늘 ${state.ap}번 더 선택</small></div></header><ol class="play-steps" aria-label="회사 성장 단계">${chapter.steps.map((name,i)=>`<li class="${i<chapter.step?'complete':i===chapter.step?'current':''}"><span>${i<chapter.step?'✓':i+1}</span>${name}</li>`).join('')}</ol>${dailyHighlights()}${move}<div class="quick-choice-head"><h3>${state.event?'도시 사건이 당신을 기다립니다':state.ap===0?'오늘의 선택을 모두 마쳤습니다':'지금, 어떤 회사를 만들까요?'}</h3><span>추천 ${choices.length}개 · 다른 선택도 자유롭게 가능</span></div><div class="quick-choices">${choices.map((c,i)=>`<article class="quick-choice"><span class="choice-tag">${i===0?'아리의 추천 · ':''}${esc(c.tag)}</span><h3>${esc(c.title)}</h3><p class="choice-benefit">${esc(c.benefit)}</p><p class="choice-risk">${esc(c.risk)}</p><footer><b>${c.cost?`−${num(c.cost)} ₩C`:'선불 비용 없음'}</b><small>행동 1번</small></footer><button class="button ${i===0?'primary':''}" data-action="${c.action.type}"${c.action.id!==undefined?` data-id="${esc(c.action.id)}"`:''}${c.action.variant?` data-variant="${esc(c.action.variant)}"`:''}>${esc(c.title)} ${icon('arrow')}</button></article>`).join('')||`<div class="play-idle"><b>${state.status!=='playing'?'이번 서울의 이야기가 끝났습니다.':state.event?'사건의 선택부터 확인하세요.':state.ap===0?'하루를 마무리하면 행동 3번이 다시 충전됩니다.':'오늘은 기다리는 것도 전략입니다.'}</b><p>계약·직원·연구·요금·도시 작전은 메뉴와 아래 상세 화면에서도 선택할 수 있습니다.</p></div>`}</div><div class="play-day-end"><div><b>${state.event?'사건을 먼저 해결하세요':state.status!=='playing'?'캠페인 결과를 확인하세요':state.day===30?'서울의 최종 결산':'오늘 마무리하고 결과 보기'}</b><small>${state.event?'도시의 반응을 직접 선택합니다.':`결산 예상 ${sign(f.net-f.rivalPenalty+f.payout)} ₩C · 대기 중인 평가 ${state.business.pending.filter(q=>q.due<=state.day).length}건${state.ap>0?' · 남은 행동은 다음 날로 이월되지 않음':''}`}</small></div><button class="button primary" data-ui="next">${state.event?'사건 선택하기':state.status!=='playing'?'결산 결과':state.day===30?'최종 결과 보기':'하루 마무리'} ${icon('arrow')}</button></div></section>`;
  }
  function dailyHighlights() {
    const r=state.business.receipts[0],d=lastSettlement;
    if(!r)return `<div class="first-play-note"><b>플레이는 간단합니다.</b> 선택 최대 3번 → 하루 마무리 → 결과 확인. 모든 결산과 선택 비용은 실제 잔액에 반영됩니다.</div>`;
    const stories=d?.stories||state.business.stories.filter(x=>x.day===r.day);
    const priority={worst:0,bad:1,jackpot:2,good:3};
    const highlights=[...stories].sort((a,b)=>priority[a.tier]-priority[b.tier]).slice(0,3);
    return `<section class="day-highlights" aria-label="하루 결과"><div class="daily-result-title"><span>D${r.day} 하루 결과</span><b class="${r.net>=0?'lime':'danger'}">${sign(r.net)} <small>₩C</small></b><small>결산 전 ${num(r.opening)} · 결산 후 ${num(r.closing)}</small></div><div class="daily-result-facts"><span>방문 <b>${r.visitors}명</b></span><span>결제 <b>${r.orders}건</b></span><span>매출 <b>${num(r.sales)}</b></span><span>계약 지급 <b>${sign(r.contracts)}</b></span>${d?`<span>시민 신뢰 <b>${sign(d.trust)}</b></span><span>팀 사기 <b>${sign(d.morale)}</b></span>`:''}</div>${highlights.map(x=>`<div class="daily-story ${x.tier}"><span>${x.tier==='jackpot'?'초대박!':x.tier==='worst'?'큰 위기':x.tier==='bad'?'예상 밖 악재':'좋은 소식'}</span><b>${esc(x.title)}</b><em>${sign(x.cash)} ₩C</em></div>`).join('')}<small class="daily-ledger-note">투자·사건 대응 비용은 선택할 때 별도 반영. 상세 장부에서 확인 가능합니다.</small></section>`;
  }
  function playCity() {
    const d=getDistrict(),job=state.jobs.find(j=>j.district===d.id);
    return `<div class="play-layout"><div class="play-main">${playDeck()}${map()}<details class="play-details"><summary><span>고객 · 투자 · 모든 선택의 연쇄 기록</span><small>요금 변경 · 마케팅 · 제품 출시 · 안전망 · 승부 확대</small></summary>${businessPanel()}</details><details class="play-details" ${state.rivalHeat>=55?'open':''}><summary><span>도시 작전 · 라이벌 대응</span><small>지역 특수 능력과 NEXUS 감시망</small></summary>${shadowProtocol()}</details><details class="play-details"><summary><span>진행 계약 · 회사 활동</span><small>완료일까지 남은 시간과 최근 기록</small></summary><div class="below">${jobs()}${logsPanel()}</div></details></div><aside class="play-sidebar"><div class="play-map-note"><b>서울을 직접 둘러보세요</b><p>지도에서 지역 선택. 3D 화면을 확대하거나 회사 안을 걸어볼 수 있습니다.</p></div><div class="play-neighborhood"><small>지금 보고 있는 동네</small><h3>${d.name}<span>${state.districts.includes(d.id)?'연결됨':'미연결'}</span></h3><p>${d.sector} · 난이도 ${d.level}/5</p><b>${job?`계약 완료까지 ${job.remaining}일 · +${num(job.reward)}`:`연결 시 지역 수입 +${d.income}/일`}</b></div><details class="play-details district-inspector"><summary><span>지역 상세 · 계약 선택</span><small>다른 계약 방식과 진출 조건 확인</small></summary>${districtPanel()}</details>${advisor()}</aside></div>`;
  }
  function metrics() {
    const f = forecastFor();
    const team = staffCount(), teamMorale = morale(), capacity = staffCapacity(state, f), payroll = payrollFor(state, f), credit = creditLine(state, f);
    const bars = [6,10,7,14,10,16,12,19,16,22].map(h => `<i style="height:${h}px"></i>`).join('');
    const cashMetric = credit.active
      ? `<div class="metric credit-metric"><div class="metric-label">신용 한도 사용 ${icon('coin')}</div><div class="metric-number danger">−${num(credit.debt)} <small>₩C</small></div><div class="metric-foot"><span class="lime">신용 잔여 ${num(credit.available)} ₩C</span><span>일일 이자 −${num(credit.interest)} ₩C</span></div></div>`
      : `<div class="metric"><div class="metric-label">보유 크레딧 ${icon('coin')}</div><div class="metric-number" id="cash">${num(state.cash)} <small>₩C</small></div><div class="metric-foot"><span class="${f.net >= 0 ? 'lime' : 'danger'}">${sign(f.net)} / 일</span><span>예상 순수익</span><div class="mini-bars" aria-hidden="true">${bars}</div></div></div>`;
    return `<div class="metrics">
      ${cashMetric}
      <div class="metric"><div class="metric-label">연산 자원 ${icon('chip')}</div><div class="metric-number">${f.used}<small>/ ${f.capacity} CU</small></div><div class="metric-foot"><span>가용 용량 ${f.capacity-f.used} CU</span><div class="progress"><i style="width:${f.used/f.capacity*100}%"></i></div></div></div>
      <div class="metric"><div class="metric-label">시민 신뢰 ${icon('heart')}</div><div class="metric-number">${state.trust}<small>/ 100</small></div><div class="metric-foot"><span class="${state.trust >= 65 ? 'lime' : state.trust < 30 ? 'danger' : ''}">${state.trust >= 65 ? '안정적인 파트너십' : state.trust < 30 ? '신뢰 회복 필요' : '신뢰를 쌓는 중'}</span><div class="progress"><i style="width:${state.trust}%"></i></div></div></div>
      <div class="metric team-metric"><div class="metric-label">운영 인원 ${icon('network')}</div><div class="metric-number">${String(team).padStart(2,'0')}<small>/ ${String(capacity).padStart(2,'0')} 명</small></div><div class="metric-foot"><span class="${finite(f.staffAvailable,Math.max(0,team-state.jobs.length)) > 0 ? 'lime' : 'danger'}">계약 배정 여유 ${finite(f.staffAvailable,Math.max(0,team-state.jobs.length))}명</span><span>급여 −${num(payroll)} / 일</span></div></div>
      <div class="metric team-metric"><div class="metric-label">팀 사기 ${icon('heart')}</div><div class="metric-number">${teamMorale}<small>/ 100</small></div><div class="metric-foot"><span class="${teamMorale >= 51 ? 'lime' : 'danger'}">${moraleState(teamMorale)}</span><div class="progress"><i style="width:${teamMorale}%"></i></div></div></div>
      <div class="metric"><div class="metric-label">연결된 지역 ${icon('network')}</div><div class="metric-number">0${state.districts.length}<small>/ 06 DISTRICTS</small></div><div class="metric-foot"><span class="lime">●</span><span>서울 언어 모델 Lv.${state.tech.language}</span></div></div>
    </div>`;
  }
  function cityRank() {
    const score = state.completed * 4 + state.districts.length * 5 + Math.floor(state.trust / 15) + Object.values(state.tech).reduce((sum, level) => sum + level * 2, 0);
    if (score >= 45) return { name: '서울 설계자', en: 'CITY ARCHITECT', score, next: null };
    if (score >= 27) return { name: '메트로 싱크', en: 'METRO SYNC', score, next: 45 };
    if (score >= 13) return { name: '네트워크 러너', en: 'NETWORK RUNNER', score, next: 27 };
    return { name: '골목 오퍼레이터', en: 'ALLEY OPERATOR', score, next: 13 };
  }
  function citySignal() {
    const rank = cityRank();
    const f = forecastFor(), credit = creditLine(state, f);
    const trustLockedDistrict = E.districts.filter(d => !state.districts.includes(d.id) && districtTrustGate(d) > state.trust).sort((a,b) => districtTrustGate(a) - districtTrustGate(b))[0];
    const rival = rivalStatus();
    if (!state.event && shadowReady() && rival.heat >= 75) return { rank, tag: 'NEXUS LOCKDOWN', title: '라이벌이 도시망을 봉쇄하려 합니다.', copy: `현재 열기 ${rival.heat}/100 · Shadow Protocol에서 대응하거나 안전한 지역 능력으로 판을 뒤집으세요.`, page: 'city', cta: 'NEXUS 대응' };
    if (state.event) return { rank, tag: 'URGENT CITY SIGNAL', title: '도시에서 응답을 기다립니다.', copy: '이번 선택은 자금과 시민 신뢰를 바꿉니다. 관제실에서 지금 대응하세요.', page: 'city', cta: '사건 대응' };
    if (credit.active) return { rank, tag: 'CREDIT LINE ACTIVE', title: '신용 한도를 사용 중입니다.', copy: `남은 신용은 ${num(credit.available)} ₩C, 일일 이자는 ${num(credit.interest)} ₩C입니다. 다음 결산 전 수익 경로를 확보하세요.`, page: 'operations', cta: '재정 상태 확인' };
    if (morale() < 40) return { rank, tag: 'TEAM DISTRESS', title: '팀 사기가 위험 수준입니다.', copy: '피로가 누적된 직원은 회사를 떠날 수 있습니다. 운영 센터에서 팀 케어를 실행하세요.', page: 'operations', cta: '팀 상태 확인' };
    if (state.jobs.length && finite(f.staffAvailable, Math.max(0,staffCount()-state.jobs.length)) < 1 && staffCount() < staffCapacity() && canAfford(hireCost()) && personnelReady()) return { rank, tag: 'TEAM WINDOW', title: '다음 계약을 위한 인력을 확보하세요.', copy: `현재 ${staffCount()}명이 ${state.jobs.length}개 계약을 모두 맡고 있습니다. 채용 여석 ${staffCapacity()-staffCount()}명을 활용할 수 있습니다.`, page: 'operations', cta: '인사 운영 열기' };
    if (!state.jobs.length) return { rank, tag: 'NEXT BEST MOVE', title: '첫 수익 신호를 연결하세요.', copy: '계약 유형마다 속도, 보상, 신뢰의 균형이 다릅니다. 현재 연산 여유를 보고 하나를 고르세요.', page: 'contracts', cta: '계약 마켓 열기' };
    if (trustLockedDistrict) return { rank, tag: 'TRUST GATE', title: `${trustLockedDistrict.name} 진출에는 신뢰가 더 필요합니다.`, copy: `필요 신뢰 ${districtTrustGate(trustLockedDistrict)} · 현재 ${state.trust}. 시민 지원과 투명한 사건 대응으로 진출 조건을 맞추세요.`, page: 'operations', cta: '신뢰 운영 열기' };
    if (state.districts.length < 3) return { rank, tag: 'NETWORK WINDOW', title: '새 지역을 연결할 시간입니다.', copy: '연결 지역은 매일 기본 수입을 만들고 더 많은 계약 선택지를 엽니다.', page: 'city', cta: '지도 확인' };
    if (state.trust < 65) return { rank, tag: 'TRUST WINDOW', title: '시민의 신뢰가 다음 성장 자산입니다.', copy: '시민 지원과 투명한 사건 대응은 독립 AI 기업의 장기 수입을 지킵니다.', page: 'operations', cta: '운영 센터 열기' };
    if (state.cash < 1500) return { rank, tag: 'CASH WINDOW', title: '결산 목표까지 수익을 쌓으세요.', copy: '계약 만료일과 다음 결산의 예상 수입을 함께 보고 가용 연산을 채우세요.', page: 'contracts', cta: '계약 살펴보기' };
    return { rank, tag: 'INDEPENDENCE WINDOW', title: '독립 운영권이 가까워졌습니다.', copy: '서로 다른 지역의 계약을 이어 서울 전역의 신호를 하나의 네트워크로 만드세요.', page: 'city', cta: '도시 관제 열기' };
  }
  function signalPanel() {
    const signal = citySignal();
    return `<section class="city-signal ${state.event ? 'urgent' : ''}"><div class="signal-orb" aria-hidden="true">✦</div><div class="signal-copy"><span>${signal.tag}</span><strong>${signal.title}</strong><p>${signal.copy}</p></div><div class="signal-rank"><span>${signal.rank.en}</span><b>${signal.rank.name}</b><small>INFLUENCE ${signal.rank.score}${signal.rank.next ? ` / ${signal.rank.next}` : ' · MAX'}</small></div><button class="button signal-cta" data-page="${signal.page}">${signal.cta} ${icon('arrow')}</button></section>`;
  }
  function settlementRecap() {
    if (!lastSettlement) return '';
    const { cash, trust, completed, earned, day, payroll, debtInterest } = lastSettlement;
    const contractText = completed > 0 ? `계약 ${completed}건 완료 · +${num(earned)} ₩C` : '진행 중인 계약 신호 유지';
    return `<section class="settlement-recap" aria-live="polite"><div class="recap-kicker">NIGHTLY LEDGER / DAY ${String(day).padStart(2, '0')}</div><div class="recap-item"><span>순자산 변화</span><b class="${cash >= 0 ? 'lime' : 'danger'}">${sign(cash)} ₩C</b></div><div class="recap-item"><span>직원 급여</span><b class="${payroll > 0 ? 'danger' : 'muted'}">−${num(payroll || 0)} ₩C</b></div>${debtInterest>0?`<div class="recap-item"><span>신용 이자</span><b class="danger">−${num(debtInterest)} ₩C</b></div>`:''}<div class="recap-item"><span>시민 신뢰</span><b class="${trust >= 0 ? 'lime' : 'danger'}">${sign(trust)}</b></div><div class="recap-contract">${contractText}</div></section>`;
  }
  function mission() {
    return `<section class="play-goals" aria-label="30일차 승리 목표"><div><b>30일차, 독립 기업으로 살아남기</b><small>세 조건을 마지막 결산에서 모두 달성하세요.</small></div>${window.SeoulPlayGuide.goals(state).map(g=>`<div class="play-goal ${g.done?'done':''}"><span>${g.done?'✓ ':''}${g.name} <b>${num(g.value)} / ${num(g.target)} ${g.unit}</b></span><div class="progress"><i style="width:${g.percent}%"></i></div></div>`).join('')}</section>`;
  }
  function map() {
    return `<section class="world-panel"><div id="world-slot"><div class="world-loading">서울의 3D 디지털 트윈을 연결하는 중…</div></div><details class="world-fallback"><summary>2D 지도 보기 · 호환 모드</summary>${map2d()}</details></section>`;
  }
  function map2d() {
    const pins=E.districts.map(d => {
      const connected=state.districts.includes(d.id), languageLocked=state.tech.language<d.tier, trustLocked=state.trust<districtTrustGate(d), locked=languageLocked||trustLocked;
      const status=mode==='infra' ? `<small>${d.compute} CU</small>` : languageLocked ? icon('lock') : trustLocked ? icon('heart') : connected ? '<small>ONLINE</small>' : '';
      const gate=trustLocked?` · 신뢰 ${districtTrustGate(d)} 필요`:'';
      return `<button class="district-pin ${connected?'connected':''} ${selected===d.id?'selected':''} ${locked?'locked':''}" style="left:${d.x}%;top:${d.y}%" data-district="${d.id}" aria-label="${d.name} 지역 선택${gate}" aria-pressed="${selected===d.id}"><span class="pin-dot"></span>${d.name}${status}</button>`;
    }).join('');
    return `<div class="panel"><div class="panel-head"><div class="panel-title">${icon('city')} 서울 네트워크 <span class="subtle">/ LIVE MAP</span></div><div class="tabs" aria-label="지도 표시"><button class="tab ${mode==='district'?'active':''}" data-mode="district" aria-pressed="${mode==='district'}">지역 현황</button><button class="tab ${mode==='infra'?'active':''}" data-mode="infra" aria-pressed="${mode==='infra'}">연산 인프라</button></div></div>
      <div class="map ${mode==='infra'?'infra-mode':''}"><div class="map-overlay"><div class="eyebrow">SEOUL METROPOLITAN GRID</div><p>2087.11.${String(state.day).padStart(2,'0')} / NIGHT CYCLE</p></div><div class="compass">N</div>${mode==='infra'?'<span class="screen-tag">노드별 계약 연산 요구량 · CU</span>':''}<div class="map-scene" style="transform:scale(${zoom})">${art}${pins}</div><div class="coords">37°33′59.0″N &nbsp; 126°58′41.0″E</div><div class="map-controls"><button data-zoom="out" aria-label="지도 축소"${disabled(zoom<=1)}>−</button><span>${Math.round(zoom*100)}%</span><button data-zoom="in" aria-label="지도 확대"${disabled(zoom>=1.4)}>+</button></div></div>
      <div class="map-legend"><span><i class="legend-point"></i> 연결된 지역</span><span><i class="legend-point empty"></i> 미연결 지역</span><span>${icon('lock').replace('class="icon"','class="icon" style="width:10px;height:10px"')} 연구 · 신뢰 필요</span><span class="map-signal">● NETWORK STABLE</span></div></div>`;
  }
  function contractChoices(d, f, compact = false) {
    return `<div class="contract-choices ${compact ? 'compact' : ''}">${offersFor(d).map(offer => {
      const noCapacity = f.used + offer.compute > f.capacity;
      const noStaff = finite(f.staffAvailable, Math.max(0, staffCount()-state.jobs.length)) < 1;
      const trustGate = districtTrustGate(d), noTrust = state.trust < trustGate;
      const trust = offer.trust + state.tech.ethics * 2;
      const blockNote = [noCapacity ? '연산 용량 부족' : '', noStaff ? '배정 가능한 직원 없음' : '', noTrust ? `신뢰 ${trustGate} 필요` : ''].filter(Boolean).join(' · ');
      return `<button class="contract-choice" data-action="accept" data-id="${d.id}" data-variant="${offer.id}"${disabled(actionDisabled() || noCapacity || noStaff || noTrust)}><span class="choice-top"><strong>${offer.name}</strong><small>${offer.en}</small></span><span class="choice-copy">${offer.description}</span><span class="choice-stats"><i>${offer.duration}일 · ${offer.compute} CU · 신뢰 +${trust}</i><b>+${num(offer.reward)} ₩C</b></span>${blockNote ? `<em>${blockNote}</em>` : ''}</button>`;
    }).join('')}</div>`;
  }
  function districtPanel() {
    const d = getDistrict(), connected = state.districts.includes(d.id), job = state.jobs.find(j=>j.district===d.id), f=forecastFor();
    const languageLocked=state.tech.language<d.tier, trustGate=districtTrustGate(d), trustLocked=state.trust<trustGate, affordable=canAfford(d.cost), difficulty=districtDifficulty(d), pressure=districtPressure(d);
    const blocked=languageLocked||trustLocked;
    const expansionCopy=languageLocked ? `서울 언어 모델 Lv.${d.tier} 연구가 필요합니다.` : trustLocked ? `시민 신뢰 ${trustGate}가 필요합니다. 현재 ${state.trust}.` : !affordable ? '신용 한도 기준으로 진출 자금이 부족합니다.' : '행동력 1 소모 · 연결 후 계약 수락 가능';
    return `<div class="panel district-detail"><div class="overline"><span>DISTRICT ${String(E.districts.indexOf(d)+1).padStart(2,'0')}</span><span>${connected?'● ONLINE':'○ OFFLINE'}</span></div><h2>${d.name} <span class="subtle">${d.en}</span></h2><div class="sector">${d.sector}</div><p class="description">${d.description}</p><div class="district-data"><div><label>노드 기본 수입</label><strong class="lime">+${d.income} <small>₩C / 일</small></strong></div><div><label>지역 유지비</label><strong>${d.upkeep} <small>₩C / 일</small></strong></div></div><div class="district-risk"><div><span>난이도</span><b class="risk-lv-${Math.min(5,difficulty.level)}">${difficulty.label} <small>LV.${difficulty.level}</small></b></div><div><span>진출 신뢰</span><b class="${trustLocked?'danger':'lime'}">${trustGate ? `${state.trust} / ${trustGate}` : '제한 없음'}</b></div><div><span>운영 압박</span><b class="${pressure>1?'danger':pressure?'cyan':'lime'}">${pressure ? `사기 −${pressure}/일` : '안정'}</b></div></div>
      ${connected ? (job ? `<div class="job-offer"><span class="eyebrow" style="font-size:9px">ACTIVE CONTRACT · ${difficulty.label.toUpperCase()}</span><h3>${job.job || d.job}</h3><footer><span>${job.duration}일 · ${job.compute} CU · ${job.remaining}일 남음${pressure?` · 사기 −${pressure}/일`:''}</span><span class="lime">+${num(job.reward)} ₩C</span></footer></div><button class="button full" disabled>계약 진행 중 ${icon('check')}</button><p class="detail-hint">다음 결산에서 도시의 반응을 확인하세요.</p>` : `<div class="offer-heading"><span class="eyebrow">LOCAL CONTRACT BOARD</span><p>난이도와 운영 압박을 보고 계약 방식을 선택하세요.</p></div>${contractChoices(d, f, true)}<p class="detail-hint">행동력 1 소모 · 선불 비용 없음${pressure?` · 계약 중 사기 −${pressure}/일`:''}</p>`) : `<button class="button ${blocked?'':'primary'} full" data-action="expand" data-id="${d.id}"${disabled(actionDisabled()||blocked||!affordable)}>${languageLocked?`${icon('lock')} 언어 모델 Lv.${d.tier} 필요`:trustLocked?`${icon('heart')} 신뢰 ${trustGate} 필요`:`지역 진출 · ${num(d.cost)} ₩C ${icon('arrow')}`}</button><p class="detail-hint">${expansionCopy}</p>`}</div>`;
  }
  function advice() {
    if(guided&&page==='city'){
      if(state.event)return '도시 사건에 먼저 답해주세요. 비용과 신뢰 변화를 읽고 직접 선택하면 됩니다.';
      if(state.ap===0)return '오늘의 선택을 마쳤습니다. 하루를 마무리해 손님과 도시의 반응을 확인하세요.';
      const choice=window.SeoulPlayGuide.choices(state,E)[0];
      if(choice)return `추천: ${choice.title}. ${choice.benefit}. ${choice.risk}`;
    }
    const f=forecastFor(), team=staffCount(), teamMorale=morale(), capacity=staffCapacity(state,f), credit=creditLine(state,f);
    const pressuredJob=state.jobs.map(j=>E.districts.find(d=>d.id===j.district)).find(d=>districtPressure(d)>=2);
    const trustLocked=E.districts.filter(d=>!state.districts.includes(d.id)&&districtTrustGate(d)>state.trust).sort((a,b)=>districtTrustGate(a)-districtTrustGate(b))[0];
    if(!state.event&&shadowReady()&&rivalStatus().heat>=75) return `NEXUS 열기가 ${rivalStatus().heat}입니다. 대응 프로토콜은 ${num(countermeasureCost())} 크레딧으로 열기를 낮추고, 지역 능력은 더 큰 보상과 노출을 함께 만듭니다.`;
    if(!state.event&&shadowReady()&&E.districts.some(d=>state.districts.includes(d.id)&&powerCooldown(d.id)===0)) return '지역 시그니처 능력이 준비됐습니다. 보상과 NEXUS 노출을 읽고, 이번 행동력을 어디에 쓸지 결정하세요.';
    if(state.event) return '새 도시 사건이 도착했습니다. 선택에 따라 자금과 시민 신뢰가 바뀝니다.';
    if(credit.active) return `신용 한도 사용 중입니다. 잔여 ${num(credit.available)} 크레딧, 일일 이자 ${num(credit.interest)}입니다. 다음 결산 전 계약 수입을 확보하세요.`;
    if(teamMorale<40) return `팀 사기가 ${teamMorale}입니다. 지금 팀 케어를 실행하지 않으면 퇴사 사건이 더 위험해집니다.`;
    if(state.jobs.length && finite(f.staffAvailable,Math.max(0,team-state.jobs.length))<1 && team>=capacity) return state.servers<3 ? `현재 서버 인사 슬롯이 가득 찼습니다. 서버를 증설하면 직원 정원이 2명 늘어납니다.` : `직원 ${team}명이 현재 인력 한도에 도달했습니다. 진행 중 계약이 끝날 때까지 새 계약은 배정할 수 없습니다.`;
    if(state.jobs.length && finite(f.staffAvailable,Math.max(0,team-state.jobs.length))<1 && team<capacity && canAfford(hireCost()) && personnelReady()) return `활성 계약 ${state.jobs.length}건을 ${team}명이 모두 맡고 있습니다. 채용 여석 ${capacity-team}명이 남아 있습니다.`;
    if(pressuredJob && teamMorale<60) return `${pressuredJob.name} 계약의 운영 압박이 사기를 빠르게 낮춥니다. 팀 케어 또는 낮은 압박 계약을 고려하세요.`;
    if(!canAfford(180)) return '새 투자에 쓸 신용 여유가 거의 없습니다. 진행 중인 계약 보상과 다음 결산을 먼저 확보하세요.';
    if(state.trust<40) return '시민 신뢰가 낮습니다. 운영 센터의 시민 지원과 책임 있는 사건 대응이 필요합니다.';
    if(trustLocked) return `${trustLocked.name} 진출에는 신뢰 ${districtTrustGate(trustLocked)}가 필요합니다. 시민 지원과 신뢰 프로토콜을 먼저 준비하세요.`;
    if(state.jobs.length===0) return state.completed===0 ? '을지로에서 첫 계약을 수락하세요. 선불 비용 없이 2일 뒤 보상을 받습니다. 도시가 당신의 AI를 기다립니다.' : '완료한 지역의 계약을 다시 수락할 수 있습니다. 가용 연산 자원을 활용해 꾸준한 수입을 만드세요.';
    if(state.districts.length<3) return '홍대와 용산은 연구 없이 진출할 수 있습니다. 지역 연결은 매일 기본 수입을 늘려줍니다.';
    if(f.used>=f.capacity) return '서버가 가득 찼습니다. 증설로 더 많은 계약을 동시에 처리하거나 완료를 기다리세요.';
    return '좋은 흐름입니다. 계약을 꾸준히 수행하고, 30일 결산 전 크레딧 1,500과 신뢰 65를 확보하세요.';
  }
  function advisor() {return `<div class="panel advisor"><div class="advisor-head"><div class="ai-orb">✳</div><div><h3>아리 <span class="muted">/ AI 운영 파트너</span></h3><small>ARI · ADVISORY SYSTEM</small></div><span class="dot" style="margin-left:auto"></span></div><p>“${advice()}”</p><small>로컬 규칙 기반 전략 가이드</small></div>`;}
  function jobs() {
    return `<div class="panel"><div class="panel-head"><div class="panel-title">${icon('contract')} 진행 중인 계약 <span class="pill">${String(state.jobs.length).padStart(2,'0')}</span></div><button class="tab" data-page="contracts">전체 보기 ↗</button></div><div class="jobs-body">${state.jobs.length?state.jobs.map(j=>{const d=E.districts.find(d=>d.id===j.district);return `<div class="job-row"><div class="row between"><div><h3>${j.job || d.job}</h3><small>${d.name} · ${j.compute} CU${j.variant ? ` · ${j.variant.toUpperCase()}` : ''}</small></div><div style="text-align:right"><span class="lime mono" style="font-size:12px">+${j.reward}</span><br><small>${j.remaining}일 남음</small></div></div><div class="progress"><i style="width:${(j.duration-j.remaining)/j.duration*100}%"></i></div></div>`;}).join(''):`<div class="empty">${icon('contract')}<br>첫 연결이, 새로운 가능성이 됩니다.<br><span style="font-size:10px">지도에서 지역을 선택하고 계약을 수락하세요.</span></div>`}</div></div>`;
  }
  function logItems(count) {return state.logs.slice(0,count).map(l=>`<div class="log-item"><time>D${String(l.day).padStart(2,'0')}</time><i></i><span>${esc(l.text)}</span></div>`).join('');}
  function logsPanel() {return `<div class="panel"><div class="panel-head"><div class="panel-title">${icon('log')} 도시 활동 로그</div><button class="tab" data-page="logs">기록 보기 ↗</button></div><div class="log-list">${logItems(3)}</div></div>`;}
  function contracts() {
    const f=forecastFor();
    return `<section class="full-view"><div class="section-heading"><div><h2>계약 마켓</h2><p>같은 지역도 서로 다른 방식으로 운영할 수 있습니다. 계약을 고를 때 속도, 신뢰, 보상을 함께 판단하세요.</p></div><span class="pill">${state.completed} COMPLETED</span></div><div class="card-grid">${E.districts.map(d=>{
      const connected=state.districts.includes(d.id),job=state.jobs.find(j=>j.district===d.id),difficulty=districtDifficulty(d),trustGate=districtTrustGate(d),pressure=districtPressure(d),trustLocked=state.trust<trustGate;
      return `<article class="panel action-card contract-card"><div class="row between"><span class="eyebrow">${d.en}</span><span class="pill">${job?'진행 중':connected?'제안 3건':'지역 미연결'}</span></div><h3>${job ? (job.job || d.job) : d.job}</h3><p>${d.description}</p><div class="contract-risk"><span class="risk-lv-${Math.min(5,difficulty.level)}">난이도 ${difficulty.label} · LV.${difficulty.level}</span><span class="${trustLocked?'danger':'muted'}">신뢰 ${trustGate ? `${state.trust}/${trustGate}` : '제한 없음'}</span><span class="${pressure>1?'danger':pressure?'cyan':'lime'}">압박 ${pressure ? `사기 −${pressure}/일` : '안정'}</span></div>${connected ? (job ? `<div class="contract-active"><span>${job.duration}일 · ${job.compute} CU · ${job.remaining}일 남음</span><b class="lime mono">+${num(job.reward)} ₩C</b></div><button class="button" disabled>계약 진행 중</button>` : contractChoices(d, f)) : `<button class="button" data-district="${d.id}">지도에서 지역 확인 ${icon('arrow')}</button>`}</article>`;
    }).join('')}</div></section>`;
  }
  function research() {
    return `<section class="full-view"><div class="section-heading"><div><h2>AI 연구소</h2><p>모델을 고도화하고, 더 넓은 서울로 진출하세요. 연구는 즉시 적용됩니다.</p></div><span class="pill">R&D LAB</span></div><div class="card-grid">${E.research.map((r,i)=>`<article class="panel action-card"><div class="card-icon">${icon(['chip','bolt','heart'][i])}</div><span class="eyebrow" style="font-size:9px">${r.en}</span><h3>${r.name}</h3><p>${r.description}</p><div class="row between"><span class="muted">현재 레벨</span><span class="lime mono">LV. ${state.tech[r.id]} / ${r.max}</span></div><div class="levels">${[1,2,3].map(n=>`<i class="${state.tech[r.id]>=n?'on':''}"></i>`).join('')}</div><button class="button primary" data-action="research" data-id="${r.id}"${disabled(actionDisabled()||state.tech[r.id]>=r.max||!canAfford(E.researchCost(state,r.id)))}>${state.tech[r.id]>=r.max?'연구 완료':`연구 · ${num(E.researchCost(state,r.id))} ₩C`} ${icon(state.tech[r.id]>=r.max?'check':'arrow')}</button><p class="detail-hint" style="margin:10px 0 0;flex:0">행동력 1 소모</p></article>`).join('')}</div><div style="margin-top:20px">${advisor()}</div></section>`;
  }
  function chart() {
    const vals=state.history.map(h=>h.cash), min=Math.min(0,...vals), max=Math.max(1500,...vals), range=max-min||1;
    const points=vals.map((v,i)=>`${i/Math.max(1,vals.length-1)*500},${140-(v-min)/range*120}`).join(' ');
    return `<svg class="chart" viewBox="0 0 500 160" role="img" aria-label="일별 보유 크레딧 추이: ${vals.map(num).join(', ')}"><path d="M0 20H500M0 80H500M0 140H500" stroke="#36432d" stroke-dasharray="3 5" fill="none"/><polygon points="0,140 ${points} 500,140" fill="#d4fb7810"/><polyline points="${points}" fill="none" stroke="#d4fb78" stroke-width="2"/><text x="0" y="158" fill="#89987b" font-size="9" font-family="monospace">DAY 01</text><text x="450" y="158" fill="#89987b" font-size="9" font-family="monospace">DAY ${String(state.day).padStart(2,'0')}</text></svg>`;
  }
  function operations() {
    const forecast=forecastFor(), f={...forecast,net:forecast.net-forecast.rivalPenalty}, team=staffCount(), teamMorale=morale(), capacity=staffCapacity(state,f), payroll=payrollFor(state,f), fixedCost=fixedCostFor(state,f), totalCost=Math.max(0,finite(f.cost,fixedCost+payroll)), teamReady=personnelReady(), staffAvailable=finite(f.staffAvailable,Math.max(0,team-state.jobs.length)), credit=creditLine(state,f);
    const atStaffLimit=team>=capacity, staffTone=teamMorale>=51?'lime':'danger';
    return `<section class="full-view"><div class="section-heading"><div><h2>운영 센터</h2><p>서버, 직원, 신용 한도, 시민 신뢰를 함께 관리하세요. 급여와 이자는 매일 결산 시 차감됩니다.</p></div><span class="pill">OPERATIONS</span></div><div class="ops-grid"><div class="panel ledger"><span class="eyebrow">DAILY SETTLEMENT</span><h3 style="font-weight:500">다음 결산 미리 보기</h3><div class="ledger-row"><span>연결 지역 기본 수입</span><b class="lime mono">+${f.income}</b></div><div class="ledger-row"><span>본사 · 서버 · 지역 운영비</span><b class="mono">−${fixedCost}</b></div><div class="ledger-row"><span>직원 급여 <small class="muted">${team}명</small></span><b class="mono">−${payroll}</b></div>${credit.active||credit.interest>0?`<div class="ledger-row credit-ledger"><span>신용 한도 이자 <small>잔여 ${num(credit.available)} ₩C</small></span><b class="danger mono">−${credit.interest}</b></div>`:''}<div class="ledger-row"><span>다음 결산에 완료될 계약</span><b class="lime mono">+${f.payout}</b></div><div class="ledger-row total"><span>예상 보유 크레딧</span><b class="mono">${num(state.cash+finite(f.net,finite(f.income,0)-totalCost)+finite(f.payout,0))} ₩C</b></div><p class="muted" style="font-size:10px">${credit.active?`신용 한도 하한 ${num(credit.floor)} ₩C · 한도를 넘기면 즉시 지급 불능입니다.`:'도시 사건 선택에 따른 자금 변동은 별도입니다.'}</p>${chart()}</div><div class="side-stack"><article class="panel action-card team-card" style="min-height:0"><div class="row between"><h3>${icon('network')} 인사 운영</h3><span class="pill">${team} / ${capacity} STAFF</span></div><div class="team-readout"><div><span>현재 직원</span><b>${team}<small>명</small></b></div><div><span>계약 배정</span><b class="${staffAvailable ? 'lime' : 'danger'}">${team-state.jobs.length}<small>명 여유</small></b></div><div><span>팀 사기</span><b class="${staffTone}">${teamMorale}<small>/ 100</small></b></div></div><div class="team-morale"><span><i class="${staffTone}"></i>${moraleState(teamMorale)} · 일일 급여 −${payroll} ₩C</span><div class="progress"><i style="width:${teamMorale}%"></i></div></div><p>${teamMorale<51?'피로가 쌓이면 퇴사 사건이 발생할 수 있습니다. 팀 케어로 사기를 회복하세요.':'채용은 계약 배정 여력과 급여를 함께 늘립니다. 사기를 유지하면 위기에도 팀이 버팁니다.'}</p><div class="team-actions"><button class="button primary" data-action="hire"${disabled(actionDisabled()||!teamReady||atStaffLimit||!canAfford(hireCost()))}>${!teamReady?'인사 모듈 동기화 중':atStaffLimit?'채용 여석 없음':`직원 채용 · ${num(hireCost())} ₩C`}</button><button class="button" data-action="care"${disabled(actionDisabled()||!teamReady||teamMorale>=100||!canAfford(teamCareCost()))}>${!teamReady?'팀 케어 동기화 중':teamMorale>=100?'사기 최대':`팀 케어 · ${num(teamCareCost())} ₩C`}</button></div><p class="detail-hint">행동력 1 소모 · 계약 여유 ${staffAvailable}명 · 최소 1명의 직원은 항상 유지됩니다.</p></article><article class="panel action-card" style="min-height:0"><div class="row between"><h3>${icon('server')} 서버 클러스터</h3><span class="lime mono">${state.servers} / 8</span></div><p>증설마다 연산 용량 +4 CU. 3대까지는 인사 슬롯도 +2명씩 늘고, 이후 직원 정원은 8명입니다.</p><button class="button primary" data-action="server"${disabled(actionDisabled()||state.servers>=8||!canAfford(E.serverCost(state)))}>${state.servers>=8?'최대 용량 도달':`서버 증설 · ${num(E.serverCost(state))} ₩C`}</button></article><article class="panel action-card" style="min-height:0"><h3>${icon('leaf')} 시민 지원 프로그램</h3><p>시민을 위한 무료 AI 교육과 접근성 지원. 즉시 신뢰 +9, 행동력 1 소모.</p><button class="button" data-action="outreach"${disabled(actionDisabled()||state.trust>=100||!canAfford(100))}>시민 지원 · 100 ₩C</button></article></div></div></section>`;
  }
  function businessPanel() {
    const C=E.commerce,b=state.business,c=forecastFor().commerce,r=b.receipts[0],o=C.odds(state,'default');
    const oddsText=x=>`성공 ${x.good}% · 악재 ${x.bad}% · 최악 ${x.worst}% · 초대박 ${x.jackpot}%`;
    const receipt=r?`<div class="business-receipt"><div class="row between"><span>D${r.day} 실제 결산</span><b class="${r.net>=0?'lime':'danger'}">${r.net>=0?'+':''}${num(r.net)} ₩C</b></div><div class="register-grid"><span>고객 매출 <b>+${r.sales}</b></span><span>환불 <b>−${r.refunds}</b></span><span>처리비 <b>−${r.fulfilment}</b></span><span>지역 수입 <b>+${r.network}</b></span><span>운영·급여·이자 <b>−${r.operating}</b></span><span>경쟁사 차단 <b>−${r.rival}</b></span><span>계약 지급 <b>+${r.contracts}</b></span><span>연쇄 사건 <b>${r.reactionCash>=0?'+':''}${r.reactionCash}</b></span></div><small>기초 ${num(r.opening)} → 기말 ${num(r.closing)} ₩C · 당일 투자 비용은 별도</small></div>`:'';
    return `<section class="panel business-panel"><div class="panel-head"><div class="panel-title">${icon('coin')} 오늘의 회사 · 고객과 현금 흐름</div><span class="pill">${c.weather} · ${c.weekend?'주말 특수':'평일'}</span></div><div class="business-body"><div class="business-flow"><div><small>방문 예상</small><b>${c.visitors}<em>명</em></b></div><span>→</span><div><small>유료 주문</small><b>${c.orders}<em>건</em></b></div><span>→</span><div><small>고객 매출</small><b class="lime">${c.sales}<em>₩C</em></b></div><div><small>못 받은 주문</small><b class="${c.lost?'danger':''}">${c.lost}</b></div></div><div class="customer-lobby" aria-label="회사로 들어오는 고객 애니메이션"><span>SEOUL STREET</span><div class="customer-path">${Array.from({length:Math.min(10,c.visitors)},(_,i)=>`<i style="--i:${i}" aria-hidden="true">♟</i>`).join('')}</div><span class="checkout">AI SERVICE<br><b>결제 → ${c.price} ₩C</b></span></div><div class="business-health"><span>품질 <b>${b.quality}</b></span><span>만족 <b>${b.satisfaction}</b></span><span>단골 <b>${b.loyalty}명</b></span><span>처리 한도 <b>${c.capacity}건</b></span><span>전환율 <b>${c.conversion}%</b></span><span>고객 순수익 <b class="${c.net>=0?'lime':'danger'}">${c.net>=0?'+':''}${c.net}</b></span></div><p class="detail-hint">직원·서버·사기가 처리 한도를 결정합니다. 계약 배정은 고객 서비스 여력을 줄입니다. 과도한 유입 → 놓친 주문 → 만족 하락 → 재방문 감소. 품질이 낮으면 실제 환불이 발생합니다.</p>${receipt}<details class="business-decisions" open><summary>다음 승부를 선택하세요 <small>행동력 1 · 2일 뒤 후속 평가</small></summary><div class="business-choice-grid">${C.decisions.map(d=>{const odds=C.odds(state,d.id),cool=b.cooldowns[d.id]||0,active=b.policy===d.id;return `<article><div class="row between"><b>${d.name}</b><span class="mono">${d.cost?`−${d.cost} ₩C`:'요금 변경'}</span></div><p>${d.detail}</p><div class="outcome-odds">${oddsText(odds)}</div><button class="button ${d.id==='blitz'?'':'primary'}" data-action="business" data-id="${d.id}"${disabled(actionDisabled()||!canAfford(d.cost)||cool>0||active)}>${active?'현재 요금':cool?`${cool}일 뒤 재선택`:'이 선택에 투자'}</button></article>`;}).join('')}</div></details><div class="chain-heading"><b>선택의 나비효과</b><small>일반 경영 선택 후속 평가 · ${oddsText(o)}</small></div><div class="chain-feed">${b.stories.slice(0,4).map(x=>`<article class="chain-story ${x.tier}"><span>D${x.day} · ${x.depth?'연쇄 '+x.depth+'단계':'선택 결과'}</span><b>${esc(x.title)} <em>${x.cash>=0?'+':''}${x.cash} ₩C</em></b><p>${esc(x.source)} → ${x.tier==='jackpot'?'주문 유입 증가. 처리 여력과 후속 평가를 확인하세요.':x.tier==='worst'?'고객 만족과 단골 감소. 서비스 회복이 필요합니다.':x.tier==='bad'?'기대치 미달로 만족도 하락.':'만족과 단골 증가.'}</p></article>`).join('')||'<p class="muted">지금의 선택이 이틀 뒤 결과로 돌아옵니다. 평가 전까지 품질과 처리 여력을 준비하세요.</p>'}</div><div class="pending-reactions">${b.pending.slice(0,6).map(q=>`<span>D${q.due} 평가 · ${esc(q.source)}<small>${oddsText(q.odds)}</small></span>`).join('')}${b.pending.length>6?`<span>추가 ${b.pending.length-6}건 평가 대기</span>`:''}</div></div></section>`;
  }
  function responseControls(q) {
    const C=E.commerce;
    if(q.intervention)return `<p class="response-done">${C.interventions[q.intervention].name} 적용됨 · 다음 평가에서 다시 대응 가능</p>`;
    return `<div class="response-options">${Object.entries(C.interventions).map(([mode,d])=>{
      const p=C.responsePreview(q,mode),o=p.odds;
      return `<button class="button ${mode==='protect'?'primary':''}" data-action="respond" data-id="${q.id}" data-variant="${mode}"${disabled(actionDisabled()||!canAfford(d.cost))}><b>${d.name} · ${d.cost} ₩C</b><small>${d.detail}</small><small>변경 후 성공 ${o.good}% · 악재 ${o.bad}% · 최악 ${o.worst}% · 초대박 ${o.jackpot}%</small><small>행동력 1 · 이번 평가에만 적용</small></button>`;
    }).join('')}</div>`;
  }
  function consequenceTimeline() {
    const b=state.business,C=E.commerce,groups=new Map();
    for(const q of [...b.pending,...b.stories]){
      const id=q.root||q.id;if(!groups.has(id))groups.set(id,{id,origin:q.origin||q.source,stories:[],pending:[]});
    }
    for(const x of b.stories)groups.get(x.root||x.id).stories.push(x);
    for(const q of b.pending)groups.get(q.root||q.id).pending.push(q);
    const journeys=[...groups.values()].sort((a,b)=>b.id-a.id);
    const oddsText=o=>`성공 ${o.good}% · 악재 ${o.bad}% · 최악 ${o.worst}% · 초대박 ${o.jackpot}%`;
    return `<div class="chain-overview"><b>모든 선택의 연쇄 기록</b><span>${journeys.length}개 선택 · 평가 대기 ${b.pending.length}건</span><p>선택마다 첫 결과와 후속 평가 두 번이 이어집니다. 대기 중인 평가에 안전망을 투자하거나 승부를 확대할 수 있습니다. 비용과 행동력을 쓰면 이번 평가의 확률이 바뀝니다.</p></div>${journeys.length?journeys.map((g,i)=>{
      const history=[...g.stories.map(x=>({...x,response:false})),...(b.responses||[]).filter(x=>x.root===g.id).map(x=>({...x,response:true}))].sort((a,b)=>a.day-b.day||a.depth-b.depth||Number(b.response)-Number(a.response));
      return `<details class="chain-journey" ${i<2?'open':''}><summary><span>#${g.id} ${esc(g.origin)}</span><small>${g.stories.length}단계 완료 · ${g.pending.length?'평가 대기':'완결'}</small></summary><ol class="journey-steps"><li><b>최초 선택</b><p>${esc(g.origin)}</p></li>${history.map(x=>x.response?`<li class="player-response"><small>D${x.day} · 직접 대응</small><b>${esc(x.label)} <em>${x.cash} ₩C</em></b><p>이 선택의 다음 평가에 적용 · 비용은 선택 즉시 반영</p></li>`:`<li class="${x.tier}"><small>D${x.day} · ${x.depth+1}번째 결과</small><b>${esc(x.title)} <em>${x.cash>=0?'+':''}${x.cash} ₩C</em></b><p>${esc(x.impact||'고객 반응과 현금 흐름에 반영됨')}</p></li>`).join('')}${g.pending.map(q=>`<li class="waiting"><small>D${q.due} 결산 예정</small><b>${esc(q.source)}</b><p>${oddsText(q.odds)}</p>${responseControls(q)}</li>`).join('')}</ol></details>`;
    }).join(''):'<p class="muted">계약·채용·연구·투자·사건 대응을 선택하면 이곳에 연결 경로가 생깁니다.</p>'}`;
  }
  function render() {
    const focus = document.activeElement?.closest('button');
    const focusKey = focus ? ['page','district','mode','zoom','action','ui'].find(key => focus.dataset[key]) : null;
    const focusValue = focusKey ? focus.dataset[focusKey] : null;
    const focusId = focus?.dataset.id;
    window.Seoul3D?.detach();
    const titles={city:['도시 관제실','도시는 잠들지 않습니다. 당신의 AI도.'],contracts:['계약 마켓','가능성을 연결하고, 가치를 만드세요.'],research:['AI 연구소','다음 세대의 지능을 설계하세요.'],operations:['운영 센터','지속 가능한 성장이 가장 강한 전략입니다.'],logs:['활동 기록','당신이 바꾼 서울의 모든 순간.']};
    const nav=[['city','city','도시 관제'],['contracts','contract','계약'],['research','flask','AI 연구'],['operations','server','운영'],['logs','log','기록']];
    const title=page==='city'&&guided?['오늘의 플레이','작은 선택으로, 서울에 큰 변화를.']:titles[page];
    $('app').innerHTML=`<header class="topbar"><div class="brand"><div class="brandmark">Z</div><div><div class="brand-name">SEOUL ZERO<span class="lime">.</span></div><div class="brand-sub">서울 제로 · AI TYCOON</div></div></div><div class="top-center"><span>SEOUL, 2087</span><span style="color:#536249">/</span><span>INDEPENDENT INTELLIGENCE</span></div><div class="top-right"><span class="row online" style="font:10px var(--mono);color:var(--lime);letter-spacing:1px"><i class="dot"></i> SYSTEM ONLINE</span><span class="divider"></span><button class="icon-btn" data-ui="help" aria-label="게임 도움말">${icon('help')}</button><span class="avatar">OP</span><span class="user-name" style="font-size:11px">운영자</span></div></header>
    <div class="layout"><nav class="rail" aria-label="주 메뉴">${nav.map(([id,ico,label])=>`<button class="nav-button ${page===id?'active':''}" data-page="${id}" aria-label="${label}" ${page===id?'aria-current="page"':''}>${icon(ico)}<span>${label}</span></button>`).join('')}<div class="rail-bottom"><button class="nav-button" data-ui="settings" aria-label="설정">${icon('settings')}<span>설정</span></button></div></nav>
    <main class="main ${guided&&page==='city'?'guided-play':''}"><div class="heading"><div><div class="eyebrow">COMMAND CENTER <span style="color:#526047">/</span> ${page.toUpperCase()}</div><h1>${title[0]}</h1><p>${title[1]}</p></div><div class="day-block"><div><div class="day-label"><b>${String(state.day).padStart(2,'0')}</b> / 30 <span style="font-size:9px">DAY</span></div><div class="day-track"><i style="width:${state.day/30*100}%"></i></div></div><button class="button primary" data-ui="next">${state.status!=='playing'?'결산 결과':state.event?'도시 사건 대응':state.day===30?'최종 결산':'다음 날'} ${icon('arrow')}<span class="key">N</span></button></div></div>${guided&&page==='city'?playStats():metrics()}${mission()}${guided&&page==='city'?'':signalPanel()+settlementRecap()}
    ${page==='city'?(guided?playCity():`<div class="workspace"><div>${map()}${businessPanel()}${shadowProtocol()}<div class="below">${jobs()}${logsPanel()}</div></div><aside class="side-stack">${districtPanel()}${advisor()}</aside></div>`):page==='contracts'?contracts():page==='research'?research():page==='operations'?businessPanel()+operations():`<section class="full-view panel"><div class="panel-head"><div class="panel-title">${icon('log')} 전체 활동 기록</div><span class="subtle">최근 ${state.logs.length}개 / 최대 60개</span></div><div class="full-logs">${logItems(60)}</div></section>`}
    <footer class="footer"><div class="row"><span class="dot" style="width:4px;height:4px;background:${storageOK?'var(--lime)':'var(--danger)'}"></span><span id="save-status">${storageOK?'AUTO-SAVE ENABLED':'저장소 사용 불가 · 파일로 내보내세요'}</span></div><span>SEOUL ZERO OS v1.0 · OFFLINE SIMULATION</span><button class="tab" data-ui="settings" style="padding:0">행동력 <span class="lime">${'●'.repeat(state.ap)}${'○'.repeat(3-state.ap)}</span> ${state.ap}/3</button></footer></main></div>`;
    document.querySelector('.heading p').insertAdjacentHTML('beforeend', `<span class="action-budget">행동력 <b>${'●'.repeat(state.ap)}${'○'.repeat(3-state.ap)}</b> ${state.ap}/3</span>`);
    document.querySelector('.heading').insertAdjacentHTML('beforebegin',`<div class="play-view-switch"><span>기능은 그대로 · 보기만 바꿉니다</span><button class="button small ${guided?'primary':''}" data-ui="guided" aria-pressed="${guided}">쉽게 플레이</button><button class="button small ${guided?'':'primary'}" data-ui="advanced" aria-pressed="${!guided}">전체 관제</button></div>`);
    if(page==='city'&&guided){
      document.querySelector('.play-deck').insertAdjacentHTML('beforeend',`<div class="play-shortcuts"><button class="tab" data-ui="decisions">모든 투자·요금 보기</button><button class="tab" data-ui="chains">내 선택의 이후 보기 <b>${state.business.pending.length}</b></button><button class="tab" data-page="operations">직원·지출 관리</button><button class="tab" data-page="research">AI 연구</button></div>`);
      const count=(lastSettlement?.stories||state.business.stories.filter(x=>x.day===state.business.receipts[0]?.day)).length;
      if(count>3)document.querySelector('.day-highlights')?.insertAdjacentHTML('beforeend',`<button class="tab" data-ui="chains">이번 반응 ${count}건 모두 보기 · 주요 3건을 위에 표시</button>`);
      if(actionDisabled())document.querySelector('.quick-choice-head>span').textContent=state.event?'사건 대응 후 다른 선택 가능':state.status!=='playing'?'결산 결과에서 이번 도전을 돌아보세요':'남은 행동 없음 · 하루 마무리로 충전';
    }
    if(page==='city'||page==='operations'){
      document.querySelector('.chain-feed').innerHTML=consequenceTimeline();
      document.querySelector('.business-decisions summary small').textContent=`행동력 1 · D${Math.min(30,state.day+2)} 첫 평가 · 이후 2회 후속 평가`;
      document.querySelector('.chain-heading small').textContent='채용 · 계약 · 확장 · 연구 · 요금 · 투자 · 사건 대응 모두 연결';
      document.querySelector('.pending-reactions').remove();
      for(const button of document.querySelectorAll('#app [data-action]')){
        const type=button.dataset.action;if(button.closest('.quick-choice')||type==='business'||!['hire','care','server','research','accept','expand','outreach','power','countermeasure'].includes(type))continue;
        const C=E.commerce,kind=C.actionKind({type,id:button.dataset.id,variant:button.dataset.variant},state),profile=C.chains[C.family(kind)];
        const hint=document.createElement('small');hint.className='choice-consequence-hint';hint.textContent=`선택 이후: ${profile.stage}`;button.append(hint);
      }
    }
    if(page==='operations'){
      const f=forecastFor(),c=f.commerce;
      document.querySelector('.ledger h3').insertAdjacentHTML('afterend',`<div class="ledger-row"><span>고객 매출</span><b class="lime mono">+${c.sales}</b></div><div class="ledger-row"><span>환불 · 고객 처리비</span><b class="mono">−${c.refunds+c.fulfilment}</b></div>${f.rivalPenalty?`<div class="ledger-row"><span>경쟁사 차단 비용</span><b class="danger mono">−${f.rivalPenalty}</b></div>`:''}<p class="detail-hint">예상액에 확정된 고객 흐름을 반영합니다. 대기 중인 연쇄 평가의 보상·손실은 별도입니다.</p>`);
    }
    if(page==='city'||page==='operations'){
      const b=state.business,day=(b.transactions||[]).some(t=>t.day===state.day)?state.day:(b.receipts[0]?.day??state.day),entries=(b.transactions||[]).filter(t=>t.day===day);
      if(entries.length)document.querySelector('.business-receipt,.business-health').insertAdjacentHTML('afterend',`<div class="business-receipt"><div class="row between"><b>D${day} 투자 · 특별 입출금</b><span class="mono">${entries.reduce((n,t)=>n+t.amount,0)} ₩C</span></div>${entries.map(t=>`<div class="ledger-row"><span>${esc(t.label)}</span><b class="${t.amount>=0?'lime':'danger'} mono">${t.amount>=0?'+':''}${t.amount}</b></div>`).join('')}<small>선택 즉시 반영된 거래입니다. 일일 운영 결산과 중복 차감하지 않습니다.</small></div>`);
    }
    document.querySelector('.top-right').insertAdjacentHTML('beforeend', `<button class="icon-btn mobile-settings" data-ui="settings" aria-label="모바일 설정">${icon('settings')}</button>`);
    window.Seoul3D?.sync(state,selected,{
      select(id){selected=id;render();if(guided)document.querySelector('.district-inspector')?.setAttribute('open','');},
      action(type,id){doAction(type,id);},
      navigate(target){page=target;render();}
    });
    window.Seoul3D?.mount(document.getElementById('world-slot'));
    if (focusKey) {
      const nextFocus = [...document.querySelectorAll('#app button')].find(b => b.dataset[focusKey] === focusValue && b.dataset.id === focusId && !b.disabled);
      nextFocus?.focus({ preventScroll: true });
    }
  }
  function modal(title, body, actions = '', close = true) {
    const dialog=$('dialog');
    dialog.innerHTML=`<div class="dialog-top"><h2 id="dialog-title">${title}</h2>${close?`<button class="icon-btn" data-ui="close" aria-label="닫기">${icon('close')}</button>`:''}</div>${body}${actions?`<div class="dialog-actions">${actions}</div>`:''}`;
    if(!dialog.open) dialog.showModal();
  }
  function help() {
    modal('서울의 내일은, 당신의 선택.',`<div class="event-tag">WELCOME TO SEOUL ZERO</div><div class="dialog-copy">2087년, 거대 기업이 장악한 서울. 당신은 을지로의 작은 독립 AI 기업을 이끕니다.<ol><li><b>계약 수락</b>: 지도에서 을지로를 선택하세요. 선불 비용 없이 2일 뒤 보상을 받습니다.</li><li><b>하루 행동력 3점</b>: 계약·진출·연구·채용·팀 케어·서버 증설·시민 지원에 각각 1점. 다음 날마다 회복됩니다.</li><li><b>직원과 사기</b>: 직원은 매일 급여를 받습니다. 사기가 낮으면 퇴사 사건이 생길 수 있으니 운영 센터에서 팀을 돌보세요.</li><li><b>지역 난이도</b>: 각 지역은 난이도, 진출 신뢰, 운영 압박이 다릅니다. 높은 압박 계약은 매일 사기를 더 낮춥니다.</li><li><b>신용 한도</b>: 크레딧이 음수가 되어도 신용 한도 안에서는 운영할 수 있습니다. 다만 매일 이자가 붙고 한도를 넘기면 지급 불능입니다.</li><li><b>매일 결산</b>: 기본 수입에서 운영비·급여·신용 이자를 차감합니다. 계약 보상은 완료일에 지급됩니다. 사건은 3일마다 도착합니다.</li><li><b>30일차 최종 결산</b>: 크레딧 1,500 이상, 신뢰 65 이상, 지역 3곳 이상이면 승리. 신용 한도 초과, 신뢰 또는 사기 0이면 즉시 종료됩니다.</li></ol>단축키 <b>N</b>: 다음 날 · <b>1–5</b>: 메뉴 이동 · <b>?</b>: 도움말<br>진행 상황 자동 저장. 설정에서 파일 저장·불러오기 가능.<br><span class="muted">게임 속 AI와 크레딧은 로컬 시뮬레이션입니다.</span></div>`,`<button class="button primary" data-ui="close">도시로 돌아가기 ${icon('arrow')}</button>`);
  }
  function settings() {
    modal('시스템 설정',`<div class="event-tag">SYSTEM PREFERENCES</div><div class="setting-row"><span>인터페이스 효과음</span><button class="button small" data-ui="sound">${sound?'켜짐':'꺼짐'}</button></div><div class="setting-row"><span>진행 상황 파일 저장</span><button class="button small" data-ui="export">JSON 내보내기</button></div><div class="setting-row"><span>저장 파일 불러오기</span><button class="button small" data-ui="import">파일 선택</button></div><div class="setting-row"><span>플레이 방법</span><button class="button small" data-ui="help">도움말</button></div><div class="setting-row"><span>새 캠페인</span><button class="button small danger-button" data-ui="restart">새 게임</button></div><p class="muted" style="font-size:11px;margin-top:20px">${storageOK?'이 브라우저에 자동 저장됩니다. 다른 브라우저나 주소에서는 내보낸 파일로 이어서 플레이하세요.':'브라우저 저장소를 사용할 수 없습니다. JSON 내보내기로 진행 상황을 보관하세요.'}</p>`);
  }
  function eventDialog() {
    let e=E.events.find(e=>e.id===state.event); if(!e)return;
    if(shadowReady()) { const rival=rivalStatus(); e={...e,text:`${e.text}<div class="event-shadow-readout"><span>NEXUS WATCH</span><b>${rival.name} · 열기 ${rival.heat}/100</b><small>${rival.heat>=75?'사건 선택 후 대응 프로토콜을 준비하세요.':'도시 사건은 NEXUS 열기와 별개로 먼저 해결해야 합니다.'}</small></div>`}; }
    modal(e.title,`<div class="event-tag">CITY EVENT / ${e.tag}</div><div class="dialog-copy">${e.text}</div>${e.choices.map((c,i)=>{
      const cash=finite(c.cash,0), staff=finite(c.staff,0), moraleShift=finite(c.morale,0), cashSafe=cash>=0||canAfford(-cash), minimumStaff=Math.max(1,state.jobs.length), staffSafe=staffCount()+staff>=minimumStaff;
      const impacts=[staff ? `직원 ${staff>0?'+':''}${staff}명` : '', moraleShift ? `사기 ${moraleShift>0?'+':''}${moraleShift}` : ''].filter(Boolean).join(' · ');
      const blocked=[!cashSafe?'신용 한도 부족':'',!staffSafe?(minimumStaff>1?'진행 계약 인력 부족':'최소 1명 유지 필요'):''].filter(Boolean).join(' · ');
      return `<button class="event-choice" data-action="event" data-id="${i}"${disabled(!cashSafe||!staffSafe)}><strong>${c.label} ↗</strong><small>${c.detail}${impacts?` · ${impacts}`:''}${blocked?` · ${blocked}`:''}</small><small class="choice-consequence-hint">대응 이후 시민·직원 반응과 두 번의 후속 평가가 이어집니다.</small></button>`;
    }).join('')}`, '', false);
  }
  function ending() {
    const won=state.status==='won', lost=state.status==='lost';
    const credit=creditLine(), insolvent=state.cash<credit.floor;
    const score=Math.max(0,Math.round(state.cash/10+state.trust*5+state.districts.length*150+state.completed*30));
    modal(won?'서울은, 당신과 연결됐습니다.':lost?'하나의 연결이 끊겼습니다.':'아직 끝나지 않은 가능성.',`<div class="event-tag">${won?'INDEPENDENCE ACHIEVED':lost?'CONNECTION TERMINATED':'CAMPAIGN COMPLETE'}</div><div class="score">${num(score)}<span class="subtle"> POINTS</span></div><div class="dialog-copy">${won?'거대 기업 사이에서 독립 AI의 자리를 만들었습니다. 도시와 시민이 당신의 다음 30일을 기다립니다.':lost?insolvent?'신용 한도를 넘겨 지급 불능 상태가 됐습니다. 다음 도전에서는 계약 수입과 일일 이자를 함께 살펴보세요.':shadowReady()&&rivalStatus().heat>=100?'NEXUS가 서울 노드의 운영권을 장악했습니다. 다음 도전에서는 열기 75 이전에 역추적하거나, 지역 능력의 노출을 분산하세요.':state.trust<=0?'시민의 신뢰를 잃었습니다. 다음 도전에서는 투명한 데이터 사용과 시민 지원에 투자하세요.':'팀의 운영 여력이 붕괴했습니다. 다음 도전에서는 사기와 지역 운영 압박을 함께 관리하세요.':'30일의 운영을 마쳤습니다. 다음 도전에서는 부족했던 목표에 집중해 독립 운영권을 확보하세요.'}</div><div class="goal-list"><div><span>보유 크레딧 ≥ 1,500</span><b class="${state.cash>=1500?'lime':''}">${num(state.cash)} ${state.cash>=1500?'✓':''}</b></div><div><span>시민 신뢰 ≥ 65</span><b class="${state.trust>=65?'lime':''}">${state.trust} ${state.trust>=65?'✓':''}</b></div><div><span>연결 지역 ≥ 3</span><b class="${state.districts.length>=3?'lime':''}">${state.districts.length} ${state.districts.length>=3?'✓':''}</b></div></div>`,`<button class="button" data-ui="close">도시 돌아보기</button><button class="button primary" data-ui="restart">다시 도전 ${icon('arrow')}</button>`);
    if(shadowReady()) { const rival=rivalStatus(); $('dialog').querySelector('.goal-list')?.insertAdjacentHTML('beforeend',`<div class="ending-shadow-goal"><span>NEXUS 열기</span><b class="${rival.heat<50?'lime':'danger'}">${rival.heat} / 100 · ${rival.label}</b></div>`); }
  }
  function doAction(type,id,variant) {
    const before=state;
    const quickChoice=document.activeElement?.closest('.quick-choices');
    const beforeForecast=type==='next'?forecastFor(before):null;
    const result=E.act(state,{type,id:type==='event'?Number(id):id,variant});
    if(!result.ok){toast(result.message,true);return;}
    state=result.state;
    if(type==='next') {lastMove=null;lastSettlement={...window.SeoulPlayGuide.digest(before,state),earned:state.business.receipts[0]?.contracts||0,payroll:payrollFor(before,beforeForecast),debtInterest:debtInterestFor(before,beforeForecast)};}
    else if(type!=='event') lastSettlement=null;
    if(type!=='next'){
      const q=type==='respond'?state.business.pending.find(q=>q.id===Number(id)):state.business.pending.find(q=>!before.business.pending.some(old=>old.id===q.id));
      lastMove={message:result.message,cash:state.cash-before.cash,ap:before.ap-state.ap,due:q?.due,followup:type==='respond'};
    }
    save();beep();render();toast(result.message);
    if(guided&&page==='city'&&!state.event&&state.status==='playing'){
      const feedback=type==='next'?document.querySelector('.day-highlights'):quickChoice?document.querySelector('.move-receipt'):null;
      feedback?.scrollIntoView({block:'start',behavior:'instant'});
    }
    if(type==='event')$('dialog').close();
    if(state.status!=='playing')ending();else if(state.event)eventDialog();
  }
  function ui(action) {
    if(action==='close'){$('dialog').close();return;}
    if(action==='next'){if(state.status!=='playing')ending();else if(state.event)eventDialog();else doAction('next');}
    if(action==='help')help();
    if(action==='settings')settings();
    if(action==='decisions'||action==='chains'){
      const panel=document.querySelector('.business-panel');panel?.closest('.play-details')?.setAttribute('open','');
      const target=document.querySelector(action==='chains'?'.chain-feed':'.business-decisions');
      if(action==='decisions')target?.setAttribute('open','');
      target?.scrollIntoView({block:'start',behavior:'instant'});return;
    }
    if(action==='guided'||action==='advanced'){guided=action==='guided';page='city';savePreferences();render();window.scrollTo({top:0,behavior:'instant'});}
    if(action==='sound'){sound=!sound;savePreferences();beep();settings();}
    if(action==='restart')modal('새로운 서울을 시작할까요?',`<div class="dialog-copy">현재 캠페인을 새 게임으로 교체합니다. 남겨두려면 먼저 설정에서 JSON 파일을 내보내세요.</div>`,`<button class="button" data-ui="close">취소</button><button class="button primary" data-ui="reset">새 게임 시작</button>`);
    if(action==='reset'){state=E.createGame(Date.now());selected='euljiro';page='city';zoom=1;lastSettlement=null;lastMove=null;$('dialog').close();save();render();toast('새 캠페인 시작. 을지로 노드 온라인.');}
    if(action==='export'){
      const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=`seoul-zero-day-${state.day}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('저장 파일을 내보냈습니다.');
    }
    if(action==='import')$('import-file').click();
    if(action==='apply-import'&&pendingImport){state=pendingImport;pendingImport=null;selected='euljiro';page='city';lastSettlement=null;lastMove=null;save();$('dialog').close();render();toast('저장 파일을 불러왔습니다.');if(state.status!=='playing')ending();else if(state.event)eventDialog();}
  }
  let pendingImport=null;
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.page){window.Seoul3D?.leave();page=b.dataset.page;render();window.scrollTo({top:0,behavior:'instant'});}
    else if(b.dataset.district){selected=b.dataset.district;page='city';render();if(guided)document.querySelector('.district-inspector')?.setAttribute('open','');}
    else if(b.dataset.mode){mode=b.dataset.mode;render();}
    else if(b.dataset.zoom){zoom=Math.max(1,Math.min(1.4,Math.round((zoom+(b.dataset.zoom==='in'?.2:-.2))*10)/10));render();}
    else if(b.dataset.action)doAction(b.dataset.action,b.dataset.id,b.dataset.variant);
    else if(b.dataset.ui)ui(b.dataset.ui);
  });
  $('dialog').addEventListener('cancel',event=>{if(state.event)event.preventDefault();});
  $('import-file').addEventListener('change',async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try {
      if(file.size>100000)throw new Error('size');
      const restored=E.restore(await file.text());if(!restored)throw new Error('format');
      pendingImport=restored;
      modal('저장 파일을 불러올까요?',`<div class="dialog-copy">${restored.day}일차 · ${num(restored.cash)} 크레딧 · 지역 ${restored.districts.length}곳<br>현재 캠페인을 이 기록으로 교체합니다.</div>`,`<button class="button" data-ui="close">취소</button><button class="button primary" data-ui="apply-import">불러오기</button>`);
    }catch{pendingImport=null;toast('유효한 서울 제로 저장 파일이 아닙니다. 현재 게임은 유지됩니다.',true);}
  });
  document.addEventListener('keydown',event=>{
    if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||$('dialog').open)return;
    if(event.key.toLowerCase()==='n'){event.preventDefault();ui('next');}
    else if(event.key==='?')help();
    else if(/^[1-5]$/.test(event.key)){window.Seoul3D?.leave();page=['city','contracts','research','operations','logs'][Number(event.key)-1];render();window.scrollTo({top:0,behavior:'instant'});}
  });
  save();render();
  if(saved&&!E.restore(saved))toast('이전 저장 기록을 읽을 수 없어 새 캠페인을 시작했습니다.',true);
  if(state.status!=='playing')ending();else if(state.event)eventDialog();
})();
