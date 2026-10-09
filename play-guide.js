(function(root) {
  'use strict';
  function choices(s, E) {
    if (s.status !== 'playing' || s.event || s.ap === 0) return [];
    const f = E.forecast(s), b = s.business, result = [];
    const add = (action, title, benefit, risk, tag = '성장') => {
      if (result.length >= 3 || result.some(c=>c.action.type===action.type && c.action.id===action.id)) return;
      // Engine validation keeps guides in sync with capacity, credit and district gates.
      const check = E.act(s, action);
      if (!check.ok) return;
      result.push({action,title,benefit,risk,tag,cost:s.cash-check.state.cash});
    };
    if (s.rivalHeat >= 55) add({type:'countermeasure'}, '라이벌 추적 끊기', `추적 열기 ${Math.max(0,s.rivalHeat-E.countermeasureReduction)}까지 감소`, '2일 뒤 공격자의 반응이 도착합니다.', '위기 대응');
    if (s.morale < 55) add({type:'care'}, '직원에게 숨 돌릴 시간', `팀 사기 +${Math.min(28,100-s.morale)} · 퇴사 위험 완화`, '비용이 들고 회복 후 평가가 이어집니다.', '직원 회복');
    if (f.commerce.lost > 0 && s.cash >= E.hireCost(s)) add({type:'hire'}, '주문을 받을 직원 채용', '직원 +1 · 고객 처리 여력 증가', '매일 급여가 늘고 팀 적응이 필요합니다.', '병목 해결');
    if (f.commerce.lost > 0 && s.cash >= E.serverCost(s)) add({type:'server'}, '회사 처리 용량 늘리기', '연산 +4 · 고객 처리 한도 증가', '매일 서버 유지비가 늘어납니다.', '병목 해결');
    if (b.satisfaction < 55) add({type:'business',id:'service'}, '불만 고객 마음 돌리기', '고객 만족 +12', '기대가 높아져 후속 평가가 나빠질 수도 있습니다.', '고객 회복');
    if (s.trust < 65) {
      // Always leave the first card for the opening contract unless survival is at risk.
      if (s.completed || s.jobs.length) add({type:'outreach'}, '시민 편으로 돌아서기', '시민 신뢰 +9 · 지역 진출 조건에 도움', '지원 프로그램의 여파가 2일 뒤 평가됩니다.', '신뢰 쌓기');
    }
    for (const d of E.districts.filter(d=>s.districts.includes(d.id) && !s.jobs.some(j=>j.district===d.id))) {
      const offer = E.contractOptions(s,d.id).find(o=>o.id==='standard');
      add({type:'accept',id:d.id,variant:'standard'}, `${d.name} 계약 받기`, `${offer.duration}일 뒤 +${offer.reward} · 신뢰 +${offer.trust+s.tech.ethics*2}`, '직원 1명 배정 · 고객 처리 여력이 줄고 재평가가 이어집니다.', '꾸준한 수익');
    }
    const next = E.districts.find(d=>!s.districts.includes(d.id) && d.tier<=s.tech.language && d.trustGate<=s.trust && d.cost<=s.cash);
    if (next) add({type:'expand',id:next.id}, `${next.name}에 회사 연결`, `지역 수입 +${next.income}/일 · 새 계약 개방`, `유지비 +${next.upkeep}/일 · 지역 반응은 아직 미정입니다.`, '서울 확장');
    if (b.quality < 80 && s.cash >= 160) add({type:'business',id:'product'}, '새로운 AI 제품 출시', '제품 품질 +9 · 고객 전환 개선', '출시 성공·결함·초대박 중 무엇이 올지 모릅니다.', '새로운 승부');
    if (s.morale < 85 && s.cash >= E.teamCareCost(s)) add({type:'care'}, '팀 컨디션 챙기기', `팀 사기 +${Math.min(28,100-s.morale)} · 고객 처리 여력 개선`, '회복 비용이 들고 후속 평가가 이어집니다.', '직원 회복');
    const pending = b.pending.find(q=>!q.intervention);
    if (pending && pending.odds.worst >= 8) add({type:'respond',id:pending.id,variant:'protect'}, '다음 평가에 안전망', `${pending.source} · 실패 확률 감소`, '이번 평가 한 번에만 적용됩니다.', '연쇄 대응');
    if (f.commerce.lost === 0 && s.cash >= 120) add({type:'business',id:'campaign'}, '서울에 우리 회사 알리기', '고객 유입 +28', '처리 한도를 넘으면 만족이 떨어질 수 있습니다.', '새로운 승부');
    return result;
  }
  function goals(s) {
    return [{name:'운영 자금',value:s.cash,target:1500,unit:'크레딧'}, {name:'시민 신뢰',value:s.trust,target:65,unit:'점'}, {name:'서울 연결',value:s.districts.length,target:3,unit:'곳'}].map(g=>({...g,percent:Math.max(0,Math.min(100,Math.round(g.value/g.target*100))),done:g.value>=g.target}));
  }
  function chapter(s) {
    const steps = ['첫 계약 받기','첫 계약 완료하기','두 번째 지역 연결','서울 3곳 연결','독립 기업의 조건 달성'];
    const step = !s.jobs.length && !s.completed ? 0 : !s.completed ? 1 : s.districts.length<2 ? 2 : s.districts.length<3 ? 3 : 4;
    return {step,steps,title:steps[step],name:step<2?'골목 스타트업':step<4?'서울로 성장':'독립을 향한 마지막 승부'};
  }
  function digest(before, after) {
    const r = after.business.receipts[0], known = new Set(before.business.stories.map(x=>x.id));
    return {day:before.day,cash:after.cash-before.cash,trust:after.trust-before.trust,morale:after.morale-before.morale,staff:after.staff-before.staff,completed:after.completed-before.completed,visitors:r?.visitors??0,orders:r?.orders??0,sales:r?.sales??0,stories:after.business.stories.filter(x=>!known.has(x.id)),earned:after.earned-before.earned};
  }
  const api = {choices,chapter,goals,digest};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SeoulPlayGuide = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
