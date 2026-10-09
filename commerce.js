(function(root){
  'use strict';
  const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
  const policies=Object.freeze({budget:{name:'골목 대중형',price:7,conversion:.82},balanced:{name:'균형 요금',price:12,conversion:.62},premium:{name:'프리미엄',price:22,conversion:.38}});
  const decisions=Object.freeze([
    {id:'campaign',name:'네온 캠페인',cost:120,detail:'유입 +28. 입소문이 터질 수도, 고객이 몰려 서비스가 붕괴할 수도 있습니다.',risk:12},
    {id:'product',name:'새 AI 출시',cost:160,detail:'품질 +9. 히트 상품 또는 치명적 모델 결함. 출시 후 평가가 도착합니다.',risk:16},
    {id:'service',name:'컨시어지 서비스',cost:90,detail:'만족 +12. 고객 경험에 투자합니다. 단골 확보 또는 기대치 과열.',risk:5},
    {id:'blitz',name:'전 도시 무료 체험',cost:210,detail:'유입 +70. 초대박 성장과 환불 폭탄 사이의 고위험 승부.',risk:24},
    ...Object.entries(policies).map(([id,p])=>({id,name:p.name,cost:0,detail:`건당 ${p.price} ₩C. 낮은 가격은 높은 전환율, 높은 가격은 높은 품질을 요구합니다.`,risk:id==='premium'?12:5}))
  ]);
  const chains={
    hire:{label:'온보딩',stage:'새 직원의 팀 적응',axis:'morale',good:'신입의 빠른 적응',bad:'온보딩 지연',worst:'팀 문화 충돌',jackpot:'숨은 에이스 발견'},
    care:{label:'팀 회복',stage:'회복 이후 업무 복귀',axis:'morale',good:'휴식 후 생산성 회복',bad:'복귀 일정 차질',worst:'휴식 이후에도 번아웃',jackpot:'팀의 자발적 혁신'},
    server:{label:'인프라',stage:'증설 이후 안정성 점검',axis:'quality',good:'응답 지연 개선',bad:'장비 튜닝 비용 발생',worst:'새 장비 장애',jackpot:'대형 고객의 성능 인증'},
    research:{label:'모델 검증',stage:'연구 기술의 현장 적용',axis:'quality',good:'모델 정확도 개선',bad:'실전 데이터와 불일치',worst:'모델 결함 노출',jackpot:'독자 기술 라이선스 문의'},
    expand:{label:'지역 정착',stage:'새 지역의 상권 반응',axis:'loyalty',good:'지역 상인 단골 확보',bad:'지역 수요 예측 실패',worst:'현지 경쟁사의 가격 공세',jackpot:'상인 연합 단체 주문'},
    accept:{label:'계약 검증',stage:'납품 이후 고객의 재평가',axis:'quality',good:'고객의 중간 검수 통과',bad:'추가 요구사항 발생',worst:'까다로운 검수와 보상 청구',jackpot:'후속 대형 프로젝트 추천'},
    outreach:{label:'시민 관계',stage:'지원받은 시민의 입소문',axis:'loyalty',good:'시민의 자발적 추천',bad:'지원 대상 선정에 불만',worst:'지원 프로그램 논란',jackpot:'시민 커뮤니티의 전폭 지지'},
    countermeasure:{label:'보안 대응',stage:'방어 이후 공격자 반응',axis:'heat',good:'경쟁사 추적 경로 차단',bad:'공격자의 우회 접속',worst:'방어 패턴 노출',jackpot:'경쟁사의 취약점 역발견'},
    power:{label:'비밀 작전',stage:'작전 흔적과 경쟁사 대응',axis:'heat',good:'작전 흔적 은폐',bad:'도시 감시망의 의심',worst:'경쟁사의 역공',jackpot:'비밀 네트워크의 추가 지원'},
    event:{label:'사건 여파',stage:'대응 이후 시민과 직원의 반응',axis:'satisfaction',good:'선택에 대한 지지',bad:'예상 못 한 이해관계 충돌',worst:'대응 방식에 대한 집단 반발',jackpot:'위기 대응의 도시 모범 사례'},
    campaign:{label:'마케팅',stage:'광고 유입 고객의 재방문',axis:'buzz',good:'캠페인의 안정적 전환',bad:'광고비 대비 낮은 반응',worst:'광고 약속에 대한 항의',jackpot:'서울 피드의 폭발적 공유'},
    blitz:{label:'무료 체험',stage:'체험 고객의 유료 전환',axis:'buzz',good:'체험 고객 유료 전환',bad:'무료 이용 후 이탈',worst:'체험 폭주와 보상 요구',jackpot:'체험 고객의 단체 구독'},
    product:{label:'제품 출시',stage:'출시 모델의 실제 사용 평가',axis:'quality',good:'새 제품의 호평',bad:'사용성 문제 제기',worst:'치명적 모델 결함',jackpot:'올해의 AI 제품 선정'},
    service:{label:'고객 경험',stage:'서비스 이용 고객의 추천',axis:'satisfaction',good:'고객 응대의 호평',bad:'상승한 기대치에 못 미침',worst:'VIP 고객의 공개 항의',jackpot:'단골 고객의 추천 릴레이'},
    budget:{label:'대중 요금',stage:'가격 변경 이후 고객 유지',axis:'loyalty',good:'골목 고객의 유입',bad:'저가 이미지 고착',worst:'가격 경쟁 심화',jackpot:'지역 전체의 기본 AI 서비스'},
    balanced:{label:'균형 요금',stage:'변경 요금의 수익성 평가',axis:'satisfaction',good:'요금에 대한 고객 수용',bad:'요금 비교 후 이탈',worst:'가격 대비 품질 논란',jackpot:'높은 가치로 장기 구독 확보'},
    premium:{label:'프리미엄 요금',stage:'고급 고객의 품질 재평가',axis:'quality',good:'고급 고객의 구매',bad:'높은 요금에 대한 불만',worst:'품질 미달로 VIP 이탈',jackpot:'기업 고객의 프리미엄 계약'},
    overload:{label:'주문 폭주',stage:'대기 고객의 다음 평가',axis:'satisfaction',good:'대기 주문의 안정화',bad:'긴 대기열에 항의',worst:'서비스 붕괴와 보상 폭탄',jackpot:'대기 고객까지 단골 전환'}
  };
  function family(kind){const parts=kind.split(':');return parts[0]==='followup'?parts[1]:parts[0]==='growth'?'overload':parts[0]==='recovery'?'service':parts[0];}
  function actionKind(action,s){
    if(action.type==='business')return action.id;
    if(action.type==='event')return `event:${s.event}:${action.id}`;
    if(action.type==='accept')return `accept:${action.id}:${action.variant||'standard'}`;
    return action.id?`${action.type}:${action.id}`:action.type;
  }
  function fresh(seed){let rng=Math.imul((seed>>>0)^0xa5c31e27,0x85ebca6b);rng=Math.imul(rng^(rng>>>16),0xc2b2ae35);rng=(rng^(rng>>>16))>>>0;return {policy:'balanced',quality:62,satisfaction:70,loyalty:12,buzz:0,rng,serial:0,pending:[],stories:[],receipts:[],cooldowns:{}};}
  function normalize(s){if(!s.business)s.business=fresh(s.seed);if(!s.business.transactions)s.business.transactions=[];if(!s.business.responses)s.business.responses=[];return s.business;}
  const interventions=Object.freeze({protect:{name:'안전망 투자',cost:60,detail:'최악·악재 확률을 낮추고 성공 확률을 높입니다.'},gamble:{name:'승부 확대',cost:80,detail:'초대박과 최악 확률이 모두 상승합니다. 해당 보상·손실은 1.5배.'}});
  function responsePreview(q,mode){
    if(!q?.odds||!Object.prototype.hasOwnProperty.call(interventions,mode))return null;
    const o={...q.odds};
    if(mode==='protect'){
      const worst=Math.max(0,o.worst-1)>10?10:Math.max(0,o.worst-1),bad=Math.min(8,Math.max(0,o.bad-5));
      o.worst-=worst;o.bad-=bad;o.good+=worst+bad;
    }else{
      const transfer=Math.min(20,o.good),fromBad=Math.min(5,o.bad),worst=Math.floor(transfer/2);
      o.good-=transfer;o.bad-=fromBad;o.worst+=worst;o.jackpot+=transfer-worst+fromBad;
    }
    return {odds:o,multiplier:mode==='gamble'?1.5:1};
  }
  function respond(s,id,mode){
    const b=normalize(s),q=b.pending.find(x=>x.id===Number(id)),choice=interventions[mode];
    if(!q||!Object.prototype.hasOwnProperty.call(interventions,mode))return '대응할 평가 또는 대응 방식이 없습니다.';
    if(q.intervention)return '이 평가는 이미 대응했습니다. 다음 평가에서 다시 선택하세요.';
    if(s.cash-choice.cost < -600)return '대응 비용이 신용 한도를 넘습니다.';
    const preview=responsePreview(q,mode),root=q.root||q.id,origin=q.origin||q.source,title=choice.name;
    const response={id:++b.serial,day:s.day,root,origin,parent:q.parent,pending:q.id,label:title,cash:-choice.cost,depth:q.depth};
    b.responses.unshift(response);b.responses=b.responses.slice(0,96);s.cash-=choice.cost;
    q.odds=preview.odds;q.multiplier=preview.multiplier;q.intervention=mode;q.root=root;q.origin=origin;q.parent=response.id;q.path=[...(q.path||[origin]),title];
    return null;
  }
  function forecast(s){
    const b=s.business||fresh(s.seed),p=policies[b.policy],morale=s.morale??72,staff=s.staff??3;
    const weekend=s.day%7===5||s.day%7===6,weather=(Math.imul(s.seed^s.day,2654435761)>>>0)%5;
    const visitors=Math.max(1,Math.round((12+s.districts.length*7+b.loyalty*.25+b.buzz+s.trust*.08)*(weekend?1.2:1)*(weather===0?.8:1)));
    const capacity=Math.max(2,Math.floor((staff*6+s.servers*4-s.jobs.length*3)*(.45+morale/180)));
    const willingness=clamp(p.conversion+(b.quality-60)*.003+(b.satisfaction-65)*.002-(b.policy==='premium'&&b.quality<75?.17:0),.12,.95);
    const demand=Math.round(visitors*willingness),orders=Math.min(capacity,demand),lost=Math.max(0,demand-capacity);
    const refundCount=Math.min(orders,Math.floor(orders*clamp((55-b.quality)*.005+(45-b.satisfaction)*.003+(morale<30?.12:0),0,.65)));
    const sales=orders*p.price,refunds=refundCount*p.price,fulfilment=orders*4;
    return {visitors,capacity,orders,lost,refundCount,price:p.price,sales,refunds,fulfilment,net:sales-refunds-fulfilment,weekend,weather:weather===0?'산성비':'정상',conversion:Math.round(willingness*100)};
  }
  function odds(s,id){
    const b=s.business||fresh(s.seed),d=decisions.find(x=>x.id===id),risk=d?.risk??5;
    if(id==='overload'||id==='growth'){
      const f=forecast(s);return f.lost>f.capacity/2?{good:20,bad:40,worst:32,jackpot:8}:{good:70,bad:15,worst:5,jackpot:10};
    }
    const strain=Math.max(0,55-b.quality)+Math.max(0,50-(s.morale??72));
    const worst=clamp(Math.round(risk/2+strain/7+(s.rivalHeat??18)/25),3,30),bad=clamp(Math.round(15+risk/2+strain/10),15,35),jackpot=clamp(Math.round(7+b.quality/20+(b.satisfaction>80?3:0)),8,16);
    return {good:100-worst-bad-jackpot,bad,worst,jackpot};
  }
  function queue(s,kind,source,depth=0,parent=null,probabilities=null,ancestry=null){
    const b=normalize(s);if(b.pending.length>=96)return;
    const id=++b.serial,origin=ancestry?.origin||source.slice(0,160),root=ancestry?.root||id,path=ancestry?.path||[origin];
    b.pending.push({id,kind,source:source.slice(0,160),due:Math.min(30,s.day+(depth?1:2)),depth,parent,odds:probabilities||odds(s,family(kind)),origin,root,path});
  }
  function apply(s,id){
    const b=normalize(s),d=decisions.find(x=>x.id===id);if(!d)return '알 수 없는 경영 선택입니다.';
    if(b.cooldowns[id]>0)return `평가가 진행 중입니다. ${b.cooldowns[id]}일 뒤 다시 선택하세요.`;
    if(policies[id]&&b.policy===id)return '이미 적용 중인 요금입니다.';
    if(s.cash-d.cost < -600)return '신용 한도를 넘어서는 투자입니다.';
    s.cash-=d.cost;b.cooldowns[id]=3;
    if(policies[id])b.policy=id;
    if(id==='campaign')b.buzz=clamp(b.buzz+28,0,240);
    if(id==='blitz')b.buzz=clamp(b.buzz+70,0,240);
    if(id==='product')b.quality=clamp(b.quality+9);
    if(id==='service')b.satisfaction=clamp(b.satisfaction+12);
    return null;
  }
  function settle(s){
    const b=normalize(s),due=b.pending.filter(x=>x.due<=s.day);b.pending=b.pending.filter(x=>x.due>s.day);let cash=0;
    for(const q of due){
      b.rng=(Math.imul(b.rng,1664525)+1013904223)>>>0;
      const draw=Math.floor(b.rng/4294967296*100),o=q.odds,tier=draw<o.worst?'worst':draw<o.worst+o.bad?'bad':draw<o.worst+o.bad+o.jackpot?'jackpot':'good';
      const key=family(q.kind),profile=chains[key]||chains.service,major=q.depth===0&&['campaign','blitz','product'].includes(key),baseMoney=tier==='jackpot'?(major?380:q.depth?60:100):tier==='worst'?(major?-220:q.depth?-30:-45):tier==='bad'?(q.depth?-12:-25):q.depth?10:20,money=Math.round(baseMoney*((tier==='jackpot'||tier==='worst')?(q.multiplier||1):1));
      const prefixes={good:'성공',bad:'악재',worst:'최악',jackpot:'초대박'},stage=q.depth===1?`${profile.stage} · `:q.depth===2?`${profile.label}의 장기 영향 · `:'',title=`${prefixes[tier]} · ${stage}${profile[tier]}`;
      const beforeAxis=profile.axis==='morale'?(s.morale??72):profile.axis==='heat'?(s.rivalHeat??18):b[profile.axis];
      b.satisfaction=clamp(b.satisfaction+({good:3,bad:-4,worst:-9,jackpot:7}[tier]));
      b.buzz=clamp(b.buzz+({good:3,bad:-3,worst:-12,jackpot:major?65:12}[tier]),0,240);
      b.loyalty=clamp(b.loyalty+({good:2,bad:-1,worst:-4,jackpot:8}[tier]),0,500);
      const impact=({good:2,bad:-2,worst:-4,jackpot:5}[tier]);
      if(profile.axis==='morale')s.morale=clamp((s.morale??72)+impact);
      else if(profile.axis==='heat')s.rivalHeat=clamp((s.rivalHeat??18)-impact);
      else b[profile.axis]=clamp(b[profile.axis]+impact,0,profile.axis==='loyalty'?500:profile.axis==='buzz'?240:100);
      if(key==='product'&&tier==='worst')b.quality=clamp(b.quality-14);
      const afterAxis=profile.axis==='morale'?s.morale:profile.axis==='heat'?s.rivalHeat:b[profile.axis],axisDelta=afterAxis-beforeAxis;
      const axisName={morale:'팀 사기',heat:'경쟁사 추적',quality:'제품 품질',loyalty:'단골',buzz:'유입 관심',satisfaction:'고객 만족'}[profile.axis];
      s.cash+=money;cash+=money;
      const origin=q.origin||q.source,root=q.root||q.id,path=[...(q.path||[origin]),title];
      const story={id:q.id,day:s.day,source:q.source,title,tier,cash:money,depth:q.depth,parent:q.parent,origin,root,path,impact:`${axisName} ${axisDelta>=0?'+':''}${axisDelta}`};b.stories.unshift(story);
      if(s.day<30 && q.depth<2)queue(s,`followup:${key}`,q.depth===0?profile.stage:`${profile.label}의 장기 영향`,q.depth+1,q.id,null,{origin,root,path});
    }
    b.stories=b.stories.slice(0,420);return cash;
  }
  function close(s,f,ledger){
    const b=normalize(s),c=f.commerce;
    b.satisfaction=clamp(b.satisfaction+(c.lost>c.capacity/2?-5:c.refundCount?-3:1));
    b.loyalty=clamp(b.loyalty+(b.satisfaction>=70&&c.orders?2:b.satisfaction<40?-2:0),0,500);
    b.buzz=Math.max(0,Math.floor(b.buzz*.72));for(const id of Object.keys(b.cooldowns))b.cooldowns[id]=Math.max(0,b.cooldowns[id]-1);
    if(s.day<30 && c.lost>c.capacity && !b.pending.some(q=>q.kind==='overload'))queue(s,'overload','주문 폭증 → 처리 용량 초과');
    b.receipts.unshift({...ledger,...c,customerNet:c.net,net:ledger.net});b.receipts=b.receipts.slice(0,30);
  }
  function transaction(s,amount,label){const b=normalize(s);if(!amount)return;b.transactions.unshift({day:s.day,amount,label:label.slice(0,160)});b.transactions=b.transactions.slice(0,60);}
  function valid(b){
    const int=(x,a,z)=>Number.isSafeInteger(x)&&x>=a&&x<=z,txt=x=>typeof x==='string'&&x.length<=160;
    if(!b||!Object.prototype.hasOwnProperty.call(policies,b.policy)||!int(b.quality,0,100)||!int(b.satisfaction,0,100)||!int(b.loyalty,0,500)||!int(b.buzz,0,240)||!int(b.rng,0,4294967295)||!int(b.serial,0,10000))return false;
    if(!Array.isArray(b.pending)||b.pending.length>96||!Array.isArray(b.stories)||b.stories.length>420||!Array.isArray(b.receipts)||b.receipts.length>30||!b.cooldowns||typeof b.cooldowns!=='object'||Array.isArray(b.cooldowns))return false;
    const lineage=q=>(q.root===undefined||int(q.root,1,b.serial))&&(q.origin===undefined||txt(q.origin))&&(q.impact===undefined||txt(q.impact))&&(q.path===undefined||(Array.isArray(q.path)&&q.path.length>=1&&q.path.length<=7&&q.path.every(txt)));
    if([...b.pending,...b.stories].some(q=>!q||!lineage(q)))return false;
    if(Object.entries(b.cooldowns).some(([id,n])=>!decisions.some(d=>d.id===id)||!int(n,0,3)))return false;
    if(new Set(b.pending.map(q=>q?.id)).size!==b.pending.length)return false;
    if(b.pending.some(q=>(q.intervention!==undefined&&!Object.prototype.hasOwnProperty.call(interventions,q.intervention))||(q.multiplier!==undefined&&![1,1.5].includes(q.multiplier))))return false;
    if(b.responses!==undefined&&(!Array.isArray(b.responses)||b.responses.length>96||b.responses.some(r=>!r||!int(r.id,1,b.serial)||!int(r.root,1,b.serial)||!int(r.pending,1,b.serial)||!int(r.day,1,30)||!int(r.depth,0,2)||!txt(r.origin)||!txt(r.label)||!int(r.cash,-80,-60))))return false;
    if(b.pending.some(q=>!q||!int(q.id,1,b.serial)||!txt(q.kind)||!txt(q.source)||!int(q.due,1,34)||!int(q.depth,0,2)||!(q.parent===null||int(q.parent,1,b.serial))||!q.odds||['good','bad','worst','jackpot'].some(k=>!int(q.odds[k],0,100))||Object.values(q.odds).reduce((a,n)=>a+n,0)!==100))return false;
    if(b.stories.some(q=>!q||!txt(q.source)||!txt(q.title)||!['good','bad','worst','jackpot'].includes(q.tier)||!int(q.day,1,30)||!int(q.cash,-10000,10000)||!int(q.id,1,b.serial)||!int(q.depth,0,2)))return false;
    if(b.transactions!==undefined&&(!Array.isArray(b.transactions)||b.transactions.length>60||b.transactions.some(t=>!t||!int(t.day,1,30)||!int(t.amount,-10000,10000)||!txt(t.label))))return false;
    if(b.receipts.some(r=>!r||['opening','closing','network','operating','rival','contracts','reactionCash','customerNet','net','visitors','capacity','orders','lost','refundCount','price','sales','refunds','fulfilment','conversion'].some(k=>!int(r[k],-1000000,100000000))||!int(r.day,1,30)||!int(r.sales,0,100000)||!int(r.refunds,0,r.sales)||r.closing-r.opening!==r.net||r.sales-r.refunds-r.fulfilment!==r.customerNet||r.customerNet+r.network-r.operating-r.rival+r.contracts+r.reactionCash!==r.net))return false;
    return true;
  }
  const api={fresh,normalize,forecast,odds,queue,apply,settle,close,transaction,valid,decisions,policies,chains,actionKind,family,interventions,responsePreview,respond};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SeoulCommerce=api;
})(typeof globalThis!=='undefined'?globalThis:this);
