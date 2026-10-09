(function(root){
  'use strict';
  const positions={euljiro:{x:0,z:-18},hongdae:{x:-32,z:-12},yongsan:{x:-15,z:3},seongsu:{x:28,z:-8},gangnam:{x:15,z:36},songpa:{x:44,z:28}};
  const names={euljiro:'을지로',hongdae:'홍대',yongsan:'용산',seongsu:'성수',gangnam:'강남',songpa:'송파'};
  const stations=[{id:'contracts',name:'계약 단말',x:0,z:-8,page:'contracts'},{id:'research',name:'AI 연구실',x:-11,z:-6,page:'research'},{id:'operations',name:'서버 관제',x:11,z:-6,page:'operations'}];
  const bounds={minX:-14.3,maxX:14.3,minZ:-10.3,maxZ:10.3};
  const obstacles=[{x:-7,z:0,w:4,d:2.2},{x:7,z:0,w:4,d:2.2},{x:-7,z:5,w:4,d:2.2},{x:7,z:5,w:4,d:2.2},{x:0,z:-10,w:5,d:1.6},{x:-11,z:-8.8,w:4,d:1.8},{x:11,z:-8.8,w:4,d:1.8}];
  function buildings(s){
    const result=s.districts.map((id,i)=>({id:`hub-${id}`,type:'hub',district:id,name:`${names[id]} AI 허브`,...positions[id],height:id==='euljiro'?14:11+Object.keys(positions).indexOf(id)*2,w:5,d:5}));
    for(let n=1;n<=s.servers;n++)result.push({id:`server-${n}`,type:'server',district:'euljiro',name:`서버 센터 ${n}`,x:-10+((n-1)%4)*5,z:-28-Math.floor((n-1)/4)*6,height:4+n*.5,w:3.7,d:4});
    for(const [i,id] of ['language','efficiency','ethics'].entries())for(let n=1;n<=s.tech[id];n++)result.push({id:`research-${id}-${n}`,type:'research',district:'euljiro',name:`${['언어 모델','뉴럴 압축','신뢰 프로토콜'][i]} 연구동 ${n}`,x:10+i*4,z:-16-(n-1)*5,height:4+n*2,w:2.7,d:3.5});
    return result;
  }
  function additions(before,after){const ids=new Set(before.map(b=>b.id));return after.filter(b=>!ids.has(b.id));}
  function move(position,direction,dt,limit=bounds,blocks=obstacles){
    if(!Number.isFinite(dt)||dt<=0||!Number.isFinite(direction.x)||!Number.isFinite(direction.z))return {...position};
    const length=Math.hypot(direction.x,direction.z);if(!length)return {...position};
    const distance=Math.min(dt,.1)*5.5,steps=Math.max(1,Math.ceil(distance/.1)),dx=direction.x/length*distance/steps,dz=direction.z/length*distance/steps;
    let {x,z}=position;const collides=(px,pz)=>blocks.some(b=>Math.abs(px-b.x)<b.w/2+.42&&Math.abs(pz-b.z)<b.d/2+.42);
    for(let n=0;n<steps;n++){const nx=Math.max(limit.minX,Math.min(limit.maxX,x+dx));if(!collides(nx,z))x=nx;const nz=Math.max(limit.minZ,Math.min(limit.maxZ,z+dz));if(!collides(x,nz))z=nz;}
    return {x,z};
  }
  function nearStation(p){return stations.find(s=>Math.hypot(s.x-p.x,s.z-p.z)<2.7)||null;}
  const api={buildings,additions,move,nearStation,stations,positions,names,bounds,obstacles};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SeoulWorldModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
