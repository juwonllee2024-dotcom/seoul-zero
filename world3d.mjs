import * as T from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const W=window.SeoulWorldModel;
const C={lime:0xd4fb78,cyan:0x6df7d2,blue:0x79bfff,pink:0xff80c8,dark:0x14252b};
const TAU=Math.PI*2,BUILD_DURATION=3.6;

export class World {
  constructor(root,callbacks){
    this.root=root;this.callbacks=callbacks;this.mode='city';this.selected='euljiro';this.expanded=false;
    this.state=null;this.facilities=new Map();this.animations=[];this.contractStreams=[];this.completionFlashes=[];this.keys=new Set();this.time=0;this.disposed=false;this.shadowState=null;this.shadowHeat=0;
    this.playerPosition={x:0,z:8};this.near=null;this.lastHUD=0;this.visible=true;this.lastFrame=0;
    this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.materials=[];this.textures=[];this.geometries=[];
    this.boxGeometry=new T.BoxGeometry(1,1,1);this.geometries.push(this.boxGeometry);
    root.innerHTML=`<div class="world-toolbar"><div class="world-brand"><span class="dot"></span><span>SEOUL <b>DIGITAL TWIN</b></span><small>LIVE 3D</small></div><div class="world-tabs"><button data-world="city" class="active">3D 도시</button><button data-world="office">회사 입장</button></div><button class="world-expand" data-world="expand">⛶ 크게 보기</button></div><div class="world-stage"><div class="world-canvas"></div><div class="world-labels"></div><div class="world-topnote"><span>SEOUL / 2087</span><small>실시간 도시 시뮬레이션</small></div><aside class="world-shadow-hud" aria-live="polite" aria-label="NEXUS 위협 상태"><div class="world-shadow-head"><span>NEXUS</span><b class="world-shadow-signal">SILENT</b></div><div class="world-heat-line"><i></i></div><div class="world-shadow-meta"><span class="world-heat-value">0%</span><small class="world-shadow-copy">그림자 신호 없음</small></div></aside><div class="world-build" role="status" aria-live="polite"></div><div class="world-camera"><button data-world="zoom-in" aria-label="3D 지도 확대">+</button><button data-world="zoom-out" aria-label="3D 지도 축소">−</button><button data-world="focus" aria-label="선택 지역 확대">◎</button><button data-world="reset" aria-label="카메라 초기화">⌖</button></div><div class="world-office-hud" hidden><span class="world-location">로비</span><span class="world-coordinates"></span><span class="world-team-status"></span><button data-world="interact" disabled>E · 단말 가까이 이동</button></div><div class="world-touch" hidden><button data-move="w" aria-label="캐릭터 앞으로 이동">↑</button><div><button data-move="a" aria-label="캐릭터 왼쪽 이동">←</button><button data-move="s" aria-label="캐릭터 뒤로 이동">↓</button><button data-move="d" aria-label="캐릭터 오른쪽 이동">→</button></div></div><div class="world-hint">드래그 회전 · 휠 확대 · 지역 클릭</div></div><div class="world-bottom"><div class="world-selection"></div><div class="world-actions"><button data-world="replay">건설 리플레이</button><button data-world="invest" class="world-invest"></button><button data-world="office" class="world-enter">본사 둘러보기 ↗</button></div></div><div class="world-districts" aria-label="3D 지역 선택">${Object.entries(W.names).map(([id,n])=>`<button data-world-district="${id}">${n}</button>`).join('')}</div>`;
    this.stage=root.querySelector('.world-stage');
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    const canvas=this.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','3D 도시 화면. 드래그로 회전하고 휠로 확대합니다.');
    root.querySelector('.world-canvas').append(canvas);
    this.camera=new T.PerspectiveCamera(45,1,.1,500);
    this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.1;this.controls.maxPolarAngle=Math.PI*.46;this.controls.minPolarAngle=.15;
    this.controls.enablePan=true;this.controls.screenSpacePanning=false;
    this.city=this.makeScene(0x0a1721);this.office=this.makeScene(0x0b1820);
    this.makeCity();this.makeOffice();this.resize();this.resetCamera();
    this.onClick=e=>this.handleClick(e);root.addEventListener('click',this.onClick);
    this.onKeyDown=e=>this.key(e,true);this.onKeyUp=e=>this.key(e,false);
    window.addEventListener('keydown',this.onKeyDown);window.addEventListener('keyup',this.onKeyUp);
    this.onBlur=()=>this.keys.clear();window.addEventListener('blur',this.onBlur);
    this.onVisibility=()=>{if(document.hidden)this.keys.clear();};document.addEventListener('visibilitychange',this.onVisibility);
    this.onPointerDown=e=>{if(e.target.dataset.move){e.preventDefault();this.keys.add(e.target.dataset.move);e.target.setPointerCapture(e.pointerId);}else if(e.target===canvas){canvas.focus({preventScroll:true});this.pointerStart={x:e.clientX,y:e.clientY};}};
    this.onPointerUp=e=>{if(e.target.dataset.move)this.keys.delete(e.target.dataset.move);else if(e.target===canvas&&this.pointerStart&&Math.hypot(e.clientX-this.pointerStart.x,e.clientY-this.pointerStart.y)<5)this.pick(e);this.pointerStart=null;};
    this.onPointerCancel=()=>{this.keys.clear();this.pointerStart=null;};
    root.addEventListener('pointerdown',this.onPointerDown);root.addEventListener('pointerup',this.onPointerUp);root.addEventListener('pointercancel',this.onPointerCancel);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.stage);
    this.intersection=new IntersectionObserver(entries=>{this.visible=entries[0]?.isIntersecting??true;},{threshold:0});this.intersection.observe(root);
    this.onContextLost=e=>{e.preventDefault();this.contextLost=true;this.keys.clear();const notice=root.querySelector('.world-build');notice.textContent='3D 연결이 중단됐습니다. 페이지를 새로고침해 주세요. 경영 기록은 자동 저장됩니다.';notice.classList.add('active');};canvas.addEventListener('webglcontextlost',this.onContextLost);
    this.frame=t=>this.tick(t);this.raf=requestAnimationFrame(this.frame);
  }
  mat(color,options={}){const m=new T.MeshStandardMaterial({color,roughness:.75,metalness:.2,...options});this.materials.push(m);return m;}
  box(parent,x,y,z,w,h,d,material){const o=new T.Mesh(this.boxGeometry,material);o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o);return o;}
  shape(parent,geometry,material,x=0,y=0,z=0){this.geometries.push(geometry);const o=new T.Mesh(geometry,material);o.position.set(x,y,z);parent.add(o);return o;}
  makeScene(color){
    const scene=new T.Scene();scene.background=new T.Color(color);scene.fog=new T.FogExp2(color,.003);
    scene.add(new T.HemisphereLight(0xbcecff,0x183228,2.1));
    const key=new T.DirectionalLight(0xecffcc,3.5);key.position.set(-25,55,30);scene.add(key);
    const fill=new T.DirectionalLight(0x729eff,1.5);fill.position.set(40,25,-40);scene.add(fill);return scene;
  }
  text(parent,text,x,y,z,width=8,color='#d4fb78'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(6,20,25,.85)';ctx.fillRect(0,0,512,128);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(2,2,508,124);
    ctx.font='bold 40px "Malgun Gothic", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,66,485);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;this.textures.push(tex);
    const material=new T.SpriteMaterial({map:tex,depthTest:true,transparent:true});this.materials.push(material);
    const sprite=new T.Sprite(material);sprite.position.set(x,y,z);sprite.scale.set(width,width/4,1);parent.add(sprite);return sprite;
  }
  makeCity(){
    const ground=this.mat(0x183034),road=this.mat(0x0c1c25),curb=this.mat(0x354b4d),line=this.mat(C.cyan,{emissive:C.cyan,emissiveIntensity:.5});
    this.box(this.city,0,-1.25,4,135,2,108,ground);
    const grid=new T.GridHelper(134,44,0x478f83,0x294951);grid.position.y=-.18;this.city.add(grid);
    for(const z of [-36,-4,42]){this.box(this.city,0,-.13,z,130,.1,3,road);this.box(this.city,0,-.05,z,125,.02,.12,curb);}
    for(const x of [-49,-22,22,50])this.box(this.city,x,-.14,3,2.6,.12,100,road);
    const riverVerts=[],riverIndices=[];
    for(let i=0;i<=65;i++){const x=-67.5+i*135/65,z=this.river(x);riverVerts.push(x,-.03,z-4.8,x,-.03,z+4.8);if(i<65){const k=i*2;riverIndices.push(k,k+2,k+1,k+1,k+2,k+3);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(riverVerts,3));geo.setIndex(riverIndices);geo.computeVertexNormals();
    this.waterMaterial=this.mat(0x137d86,{metalness:.8,roughness:.26,emissive:0x0b7b8c,emissiveIntensity:.25,side:T.DoubleSide});this.shape(this.city,geo,this.waterMaterial);
    for(const x of [-38,-2,38]){const z=this.river(x);this.box(this.city,x,.45,z,3,.55,13,curb);for(const side of [-1,1]){this.box(this.city,x+side*1.45,1.2,z,.12,1.1,13,line);for(const off of [-4,4])this.box(this.city,x+side*1.4,2,z+off,.25,3,.25,curb);}}
    let seed=717;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
    const facade=document.createElement('canvas');facade.width=64;facade.height=128;const ctx=facade.getContext('2d');ctx.fillStyle='#23434b';ctx.fillRect(0,0,64,128);
    for(let y=4;y<124;y+=10)for(let x=4;x<62;x+=9){ctx.fillStyle=random()>.48?['#82c9b5','#cbd7a2','#477083'][Math.floor(random()*3)]:'#182f3b';ctx.fillRect(x,y,4,5);}
    const texture=new T.CanvasTexture(facade);texture.colorSpace=T.SRGBColorSpace;this.textures.push(texture);
    const buildingMat=this.mat(0x739692,{map:texture,emissiveMap:texture,emissive:0x9fc8b4,emissiveIntensity:.4});
    const buildings=[];
    for(let z=-44;z<54;z+=6)for(let x=-62;x<64;x+=6){
      if(Math.abs(z-this.river(x))<8||[-36,-4,42].some(v=>Math.abs(z-v)<3)||[-49,-22,22,50].some(v=>Math.abs(x-v)<2)||Object.values(W.positions).some(p=>Math.hypot(p.x-x,p.z-z)<8)||(x>-16&&x<25&&z<-9&&z>-41)||random()<.18)continue;
      const h=2+random()*((z>25||z<-28)?18:11);buildings.push({x:x+random(),z:z+random(),h,w:2+random()*2});
    }
    const instance=new T.InstancedMesh(this.boxGeometry,buildingMat,buildings.length),dummy=new T.Object3D();
    buildings.forEach((b,i)=>{dummy.position.set(b.x,b.h/2,b.z);dummy.scale.set(b.w,b.h,b.w*.8);dummy.updateMatrix();instance.setMatrixAt(i,dummy.matrix);instance.setColorAt(i,new T.Color().setHSL(.42+random()*.13,.1+random()*.18,.46+random()*.22));});this.city.add(instance);
    const hill=this.mat(0x285a45);this.shape(this.city,new T.ConeGeometry(6,5,7),hill,4,1,1);
    const tower=this.mat(0xb2d2bc,{metalness:.65});this.shape(this.city,new T.CylinderGeometry(.18,.3,14,8),tower,4,10,1);this.shape(this.city,new T.CylinderGeometry(1.5,1.4,1,12),line,4,15.5,1);this.box(this.city,4,19,1,.08,5,.08,line);
    this.text(this.city,'N SEOUL TOWER',4,22,1,9,'#88d3be');
    this.text(this.city,'HAN RIVER',-17,.7,20,14,'#7dd9e5');
    this.pickTargets=[];this.labels=[];
    for(const [id,p] of Object.entries(W.positions)){
      const disc=this.shape(this.city,new T.CylinderGeometry(4.2,4.2,.15,32),this.mat(0x26575a,{emissive:0x163e43}),p.x,.1,p.z);disc.userData.district=id;this.pickTargets.push(disc);
      const label=document.createElement('button');label.dataset.worldDistrict=id;label.textContent=W.names[id];label.className='world-pin';rootAppend(this.root,'.world-labels',label);this.labels.push({id,element:label,position:new T.Vector3(p.x,2,p.z)});
    }
    this.selectionRing=this.shape(this.city,new T.TorusGeometry(4.8,.12,5,50),line);this.selectionRing.rotation.x=Math.PI/2;
    this.cars=[];
    const carMat=this.mat(0x75f4d3,{emissive:0x75f4d3,emissiveIntensity:1});
    for(let n=0;n<12;n++){const car=this.box(this.city,0,.45,0,1.1,.55,.65,carMat);this.cars.push({mesh:car,offset:n*10,lane:n%2?-36:-4});}
    this.drone=new T.Group();this.box(this.drone,0,0,0,1.3,.3,.6,this.mat(0xcceac9));this.box(this.drone,0,.1,0,2.5,.05,.12,line);this.city.add(this.drone);
    this.networkLayer=new T.Group();this.city.add(this.networkLayer);this.streamParticleGeometry=new T.SphereGeometry(.26,8,6);this.geometries.push(this.streamParticleGeometry);this.streamParticleMaterial=this.mat(C.lime,{emissive:C.lime,emissiveIntensity:1.8,roughness:.28,metalness:.18});
    this.hubMat=this.mat(0x456b71,{map:texture,emissiveMap:texture,emissive:0x7cebc6,emissiveIntensity:.6,metalness:.55});
    this.serverMat=this.mat(0x28495b,{emissive:0x12384c,emissiveIntensity:.7});this.researchMat=this.mat(0x5a4867,{emissive:0x452552,emissiveIntensity:.4});
    this.neonLime=line;this.neonCyan=this.mat(C.blue,{emissive:C.blue,emissiveIntensity:1});this.neonPink=this.mat(C.pink,{emissive:C.pink,emissiveIntensity:.8});
    this.makeShadowProtocol();
  }
  makeShadowProtocol(){
    const group=new T.Group();group.position.set(51,0,-29);this.city.add(group);
    const shell=this.mat(0x130f1a,{metalness:.86,roughness:.28}),edge=this.mat(0x5b193e,{emissive:0xe83578,emissiveIntensity:.35,metalness:.6,roughness:.25}),coreMat=this.mat(0x5d1749,{emissive:0xff4f9b,emissiveIntensity:.7,metalness:.45,roughness:.16}),beamMat=this.mat(0xf23485,{emissive:0xef3178,emissiveIntensity:1.3,transparent:true,opacity:.06,depthWrite:false,side:T.DoubleSide});
    this.box(group,0,9,0,5.4,18,5.4,shell);this.box(group,0,18.35,0,6,.45,6,edge);
    for(const x of [-2.2,2.2])this.box(group,x,9.3,-2.76,.13,17.4,.12,edge);
    for(const z of [-2.2,2.2])this.box(group,-2.76,9.3,z,.12,17.4,.13,edge);
    const core=this.shape(group,new T.IcosahedronGeometry(1.35,1),coreMat,0,20.1,0),beam=this.shape(group,new T.CylinderGeometry(.22,5.8,39,16,1,true),beamMat,0,27.5,0);
    const rings=[];for(const [radius,height] of [[4.6,18.8],[6.3,22.2],[8,26]]){const ring=this.shape(group,new T.TorusGeometry(radius,.07,5,56),edge,0,height,0);ring.rotation.x=Math.PI/2;rings.push(ring);}
    const target=this.shape(this.city,new T.TorusGeometry(5.9,.1,6,56),beamMat,0,.82,0);target.rotation.x=Math.PI/2;target.visible=false;
    const shardGeometry=new T.OctahedronGeometry(.52,0),shards=[];this.geometries.push(shardGeometry);
    for(let index=0;index<9;index++){const shard=new T.Mesh(shardGeometry,edge);shard.userData={angle:index/9*TAU,offset:index*.71};group.add(shard);shards.push(shard);}
    const label=this.text(group,'NEXUS // SHADOW PROTOCOL',0,24,-.2,9,'#ff86bc');
    const ambient=new T.PointLight(0xff3f85,.14,78);ambient.position.set(0,20,0);group.add(ambient);
    this.cityBaseColor=new T.Color(0x0a1721);this.cityThreatColor=new T.Color(0x351127);this.cityBaseFog=new T.Color(0x0a1721);this.cityThreatFog=new T.Color(0x3d172d);
    this.shadowProtocol={group,core,beam,rings,target,shards,label,ambient,edge,coreMat,beamMat};
  }
  shadowInfo(){
    const raw=Number(this.state?.rivalHeat),heat=Math.max(0,Math.min(100,Number.isFinite(raw)?raw:0));
    const engine=window.SeoulEngine||{};let pulse={};
    if(typeof engine.pulseForDay==='function'){try{const next=engine.pulseForDay(this.state);if(next&&typeof next==='object')pulse=next;}catch{pulse={};}}
    const known=['silent','trace','hunt','lockdown','breach'],derived=heat>=86?'breach':heat>=68?'lockdown':heat>=46?'hunt':heat>=24?'trace':'silent',signal=known.includes(this.state?.rivalSignal)?this.state.rivalSignal:known.includes(pulse.signal)?pulse.signal:derived;
    return {heat,signal,pulse};
  }
  powerInfo(id){
    const raw=this.state?.powerCooldowns,entry=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw[id]:0,possible=entry&&typeof entry==='object'?(entry.remaining??entry.cooldown??entry.days):entry,cooldown=Math.max(0,Math.min(99,Number.isFinite(Number(possible))?Math.ceil(Number(possible)):0));
    const powers=window.SeoulEngine?.districtPowers,detail=Array.isArray(powers)?powers.find(power=>power?.id===id):(powers&&typeof powers==='object'?powers[id]:null),owned=Array.isArray(this.state?.districts)&&this.state.districts.includes(id);
    return {cooldown,owned,ready:owned&&cooldown===0,name:typeof detail?.name==='string'?detail.name:'지역 펄스',description:typeof detail?.description==='string'?detail.description:''};
  }
  updateShadowHUD(){
    const info=this.shadowInfo(),hud=this.root.querySelector('.world-shadow-hud');this.shadowState=info;this.shadowHeat=info.heat/100;
    if(!hud)return info;
    const tier=info.heat>=86?'breach':info.heat>=68?'critical':info.heat>=46?'hunt':info.heat>=24?'trace':'quiet',delta=Number(info.pulse?.delta),warning=typeof info.pulse?.warning==='string'?info.pulse.warning:'',copy=warning||`${info.heat<24?'도시 외곽에서 약한 신호를 감지했습니다.':info.heat<46?'NEXUS가 도시망을 추적 중입니다.':info.heat<68?'NEXUS 사냥 프로토콜이 활성화됐습니다.':'NEXUS가 도시망을 봉쇄하려 합니다.'}${Number.isFinite(delta)?` · 내일 ${delta>0?'+':''}${delta}`:''}`;
    hud.dataset.tier=tier;hud.dataset.signal=info.signal;hud.style.setProperty('--heat',`${info.heat}%`);hud.querySelector('.world-shadow-signal').textContent=info.signal.toUpperCase();hud.querySelector('.world-heat-value').textContent=`${info.heat}%`;hud.querySelector('.world-shadow-copy').textContent=copy;hud.setAttribute('aria-label',`NEXUS ${info.signal}, 위협 열기 ${info.heat}%`);
    return info;
  }
  animateShadowProtocol(){
    const protocol=this.shadowProtocol,info=this.shadowState||this.shadowInfo();if(!protocol)return;
    const heat=Math.max(0,Math.min(1,info.heat/100)),motion=this.reducedMotion?0:this.time;
    protocol.group.visible=true;protocol.core.rotation.y=motion*.55;protocol.core.rotation.x=motion*.21;protocol.coreMat.emissiveIntensity=.18+heat*3.8;protocol.edge.emissiveIntensity=.12+heat*(this.reducedMotion?1.15:1.65+Math.sin(motion*3)*.22);protocol.beamMat.opacity=.025+heat*.22;
    protocol.beam.scale.set(1,1+(this.reducedMotion?0:Math.sin(motion*2.3)*.06+heat*.13),1);protocol.label.material.opacity=.22+heat*.78;protocol.ambient.intensity=.12+heat*3.4;
    protocol.rings.forEach((ring,index)=>{const pulse=this.reducedMotion?1:1+Math.sin(motion*(1.1+index*.18)+index)*(.025+heat*.07);ring.scale.setScalar(pulse);ring.rotation.z=motion*(.08+heat*.1)*(index%2?1:-1);});
    protocol.shards.forEach((shard,index)=>{const angle=shard.userData.angle+motion*(.2+heat*.5)*(index%2?1:-1),radius=4.8+heat*5.6+index%3*.65;shard.position.set(Math.cos(angle)*radius,11+(index%4)*2.4+Math.sin(motion+index)*heat*1.6,Math.sin(angle)*radius);shard.rotation.set(motion*.8+index,motion*1.2-index,0);shard.visible=heat>.04||index<2;shard.scale.setScalar(.56+heat*.72);});
    const position=W.positions[this.selected];if(position){protocol.target.visible=heat>=.24;protocol.target.position.set(position.x,.92,position.z);protocol.target.scale.setScalar(1+(this.reducedMotion?0:Math.sin(motion*3)*.06)+heat*.16);}
    if(this.city.background?.isColor)this.city.background.copy(this.cityBaseColor).lerp(this.cityThreatColor,heat*.68);
    if(this.city.fog?.color)this.city.fog.color.copy(this.cityBaseFog).lerp(this.cityThreatFog,heat*.58);
  }
  river(x){return 17+7*Math.sin(x/27);}
  facility(spec,animate){
    const group=new T.Group();group.position.set(spec.x,0,spec.z);this.city.add(group);
    const building=new T.Group();group.add(building);const h=spec.height,w=spec.w,d=spec.d;
    const material=spec.type==='hub'?this.hubMat:spec.type==='server'?this.serverMat:this.researchMat;
    const neon=spec.type==='hub'?this.neonLime:spec.type==='server'?this.neonCyan:this.neonPink;
    const body=this.box(building,0,h/2,0,w,h,d,material);body.userData.district=spec.district;this.pickTargets.push(body);
    for(let level=1;level<h;level+=2)this.box(building,0,level,0,w+.12,.08,d+.12,neon);
    this.box(building,0,h+.15,0,w+.4,.3,d+.4,neon);
    let halo,beacon;
    if(spec.type==='hub'){this.box(building,0,h+1.4,0,.15,2.5,.15,neon);this.text(building,spec.district==='euljiro'?'ZERO HQ':W.names[spec.district],0,h+3,0,6);halo=this.shape(group,new T.TorusGeometry(Math.max(w,d)*.86,.07,6,42),neon,0,.2,0);halo.rotation.x=Math.PI/2;beacon=this.shape(group,new T.CylinderGeometry(.05,.15,4.4,8),neon,0,h+3.5,0);beacon.visible=false;}
    const scaffold=new T.Group();group.add(scaffold);
    const steel=this.mat(0xd4df91,{wireframe:true,transparent:true,opacity:.5});this.box(scaffold,0,h/2,0,w+1,h+1,d+1,steel);
    const crane=new T.Group();crane.position.set(w/2+1,0,0);scaffold.add(crane);this.box(crane,0,(h+5)/2,0,.25,h+5,.25,this.neonLime);this.box(crane,-2,h+5,0,7,.22,.22,this.neonLime);this.box(crane,-4,h+3.5,0,.08,3,.08,this.neonLime);
    const obj={spec,group,building,scaffold,crane,elapsed:animate?0:BUILD_DURATION,body,halo,beacon,active:false};
    scaffold.visible=animate;building.scale.y=animate?.015:1;
    this.facilities.set(spec.id,obj);if(animate)this.animations.push(obj);return obj;
  }
  activeDistricts(state=this.state){return new Set((state?.jobs||[]).map(job=>job.district).filter(id=>state?.districts?.includes(id)&&W.positions[id]));}
  makeContractStream(district){
    const source=W.positions.euljiro,target=W.positions[district],group=new T.Group(),color=district==='euljiro'?C.lime:C.cyan;
    const material=this.mat(color,{emissive:color,emissiveIntensity:1.4,roughness:.28,metalness:.25,transparent:true,opacity:.62,depthWrite:false});
    const particles=[new T.Mesh(this.streamParticleGeometry,this.streamParticleMaterial),new T.Mesh(this.streamParticleGeometry,this.streamParticleMaterial)];
    this.networkLayer.add(group);particles.forEach(p=>group.add(p));
    let curve,ring;
    if(district==='euljiro'){ring=this.shape(group,new T.TorusGeometry(5.25,.06,6,52),material,source.x,1.15,source.z);ring.rotation.x=Math.PI/2;}
    else{
      const startHub=this.facilities.get('hub-euljiro'),endHub=this.facilities.get(`hub-${district}`),start=new T.Vector3(source.x,(startHub?.spec.height||12)+3,source.z),end=new T.Vector3(target.x,(endHub?.spec.height||10)+3,target.z),mid=start.clone().lerp(end,.5);mid.y=Math.max(start.y,end.y)+7;
      curve=new T.CatmullRomCurve3([start,mid,end]);this.shape(group,new T.TubeGeometry(curve,32,.055,6,false),material);
    }
    const stream={district,group,curve,ring,particles,material,source};this.contractStreams.push(stream);return stream;
  }
  syncNetwork(state){
    const active=this.activeDistricts(state);
    for(const district of active)if(!this.contractStreams.some(stream=>stream.district===district))this.makeContractStream(district);
    for(const stream of this.contractStreams)stream.group.visible=active.has(stream.district);
    for(const facility of this.facilities.values())if(facility.spec.type==='hub'){
      facility.connected=state.districts.includes(facility.spec.district);facility.active=active.has(facility.spec.district);
      if(facility.halo)facility.halo.visible=facility.connected;if(facility.beacon)facility.beacon.visible=facility.active;
    }
  }
  flashAt(district,color=C.lime){
    if(this.reducedMotion||!W.positions[district])return;
    const p=W.positions[district],material=this.mat(color,{emissive:color,emissiveIntensity:1.9,roughness:.2,metalness:.18,transparent:true,opacity:.8,depthWrite:false}),ring=this.shape(this.city,new T.TorusGeometry(4.9,.14,6,48),material,p.x,.75,p.z),beam=this.shape(this.city,new T.CylinderGeometry(.12,1.3,6.4,10,1,true),material,p.x,3.3,p.z);
    ring.rotation.x=Math.PI/2;this.completionFlashes.push({ring,beam,material,elapsed:0,duration:1.15});
  }
  animateNetwork(){
    const phase=this.reducedMotion?0:this.time*.27;
    for(const facility of this.facilities.values())if(facility.spec.type==='hub'){
      const pulse=facility.active&&!this.reducedMotion?1+Math.sin(this.time*4+facility.spec.x)*.12:1;
      if(facility.halo)facility.halo.scale.setScalar(pulse);if(facility.beacon&&facility.active)facility.beacon.scale.y=this.reducedMotion?1:1+Math.sin(this.time*5+facility.spec.z)*.18;
    }
    for(const stream of this.contractStreams)if(stream.group.visible){
      stream.material.emissiveIntensity=this.reducedMotion?1.1:1.15+Math.sin(this.time*3+stream.source.x)*.35;
      stream.particles.forEach((particle,index)=>{
        const progress=(phase+index*.5)%1;
        if(stream.curve)particle.position.copy(stream.curve.getPointAt(progress));
        else{const angle=progress*TAU;particle.position.set(stream.source.x+Math.cos(angle)*5.25,1.15,stream.source.z+Math.sin(angle)*5.25);}
        particle.scale.setScalar(this.reducedMotion?1:1+Math.sin(this.time*6+index)*.18);
      });
    }
  }
  animateFlashes(dt){
    for(const flash of this.completionFlashes){
      flash.elapsed=Math.min(flash.duration,flash.elapsed+dt);const p=flash.elapsed/flash.duration;
      flash.ring.scale.setScalar(1+p*1.8);flash.beam.scale.set(1,1+p*.45,1);flash.material.opacity=Math.max(0,.8*(1-p));
      if(p===1){this.city.remove(flash.ring);this.city.remove(flash.beam);flash.ring.geometry.dispose();flash.beam.geometry.dispose();flash.material.dispose();this.geometries=this.geometries.filter(geometry=>geometry!==flash.ring.geometry&&geometry!==flash.beam.geometry);this.materials=this.materials.filter(material=>material!==flash.material);}
    }
    this.completionFlashes=this.completionFlashes.filter(flash=>flash.elapsed<flash.duration);
  }
  makePerson(color,player=false){
    const g=new T.Group(),suit=this.mat(color),skin=this.mat(0xd6aa85),dark=this.mat(0x13212d),visor=this.mat(player?C.lime:C.cyan,{emissive:player?C.lime:C.cyan,emissiveIntensity:.6});
    const torso=this.box(g,0,1.3,0,.62,.85,.4,suit);this.box(g,0,1.55,.215,.38,.09,.02,visor);
    this.shape(g,new T.SphereGeometry(.28,10,8),skin,0,1.98,0);this.box(g,0,2.13,-.03,.48,.18,.41,dark);this.box(g,0,2,.245,.43,.1,.045,visor);
    const limbs=[];for(const side of [-1,1]){const leg=new T.Group();leg.position.set(side*.18,.92,0);g.add(leg);this.box(leg,0,-.42,0,.22,.83,.24,dark);this.box(leg,0,-.8,.06,.25,.16,.4,suit);limbs.push(leg);const arm=new T.Group();arm.position.set(side*.46,1.62,0);g.add(arm);this.box(arm,0,-.34,0,.2,.67,.22,suit);this.shape(arm,new T.SphereGeometry(.12,6,5),skin,0,-.7,0);limbs.push(arm);}
    g.userData={limbs,torso};return g;
  }
  makeOffice(){
    const floor=this.mat(0x304a50),wall=this.mat(0x264353),desk=this.mat(0x9aa89a),black=this.mat(0x15252d),light=this.mat(C.cyan,{emissive:C.cyan,emissiveIntensity:.8});
    this.box(this.office,0,-.3,0,31,.6,24,floor);const grid=new T.GridHelper(30,15,0x648487,0x415c60);grid.position.y=.015;this.office.add(grid);
    this.box(this.office,0,2.3,-12,31,4.6,.35,wall);this.box(this.office,-15.5,1.2,0,.3,2.4,24,wall);this.box(this.office,15.5,1.2,0,.3,2.4,24,wall);
    this.box(this.office,0,.08,11.6,31,.08,.1,light);this.box(this.office,0,4.4,-11.75,30,.08,.08,light);
    for(let x=-13;x<=13;x+=4){const glass=this.mat(0x18384c,{emissive:0x27546a,emissiveIntensity:.3});this.box(this.office,x,2.8,-11.78,3.3,2.5,.05,glass);}
    for(const o of W.obstacles){this.box(this.office,o.x,1.05,o.z,o.w,.16,o.d,desk);for(const dx of [-o.w/2+.3,o.w/2-.3])this.box(this.office,o.x+dx,.5,o.z,.12,1,.8,black);if(o.z>=0){for(const dx of [-.9,.9]){this.box(this.office,o.x+dx,1.6,o.z-.5,1.2,.85,.1,black);this.box(this.office,o.x+dx,1.6,o.z-.43,1,.63,.025,light);this.box(this.office,o.x+dx,1.18,o.z+.3,.7,.05,.3,black);}this.box(this.office,o.x,.55,o.z+1.8,1,.2,.8,black);this.box(this.office,o.x,1.05,o.z+2.1,1,.9,.15,black);}}
    this.text(this.office,'SEOUL ZERO / INDEPENDENT AI',0,4.6,-11.5,13);
    this.stationRings=[];
    for(const station of W.stations){this.text(this.office,station.name,station.x,3.2,station.z,4.8,station.id==='research'?'#ff9ede':'#b3f8cf');const ring=this.shape(this.office,new T.TorusGeometry(1.05,.035,5,40),light,station.x,.045,station.z);ring.rotation.x=Math.PI/2;this.stationRings.push(ring);}
    this.text(this.office,'RECEPTION',0,2.8,10.8,5,'#8bcbdf');
    this.officeRacks=new T.Group();this.office.add(this.officeRacks);
    for(const x of [-13,13]){const leaf=this.mat(0x63a773);this.shape(this.office,new T.CylinderGeometry(.5,.35,.7,8),black,x,.35,9);this.shape(this.office,new T.IcosahedronGeometry(.9,0),leaf,x,1.35,9);}
    this.player=this.makePerson(0xbbd570,true);this.player.position.set(0,0,8);this.office.add(this.player);this.text(this.player,'YOU',0,2.8,0,1.6);
    const staffColors=[0x5874a1,0x9b7796,0x698c82,0x86739f,0x5c8f94,0xa17d69,0x6d7da7,0x729466];
    this.staffSlots=[[-11,2],[-3,2],[5,2],[11,2],[-11,-4],[-3,-4],[5,-4],[11,-4]];
    this.staff=[];for(let n=0;n<staffColors.length;n++){const person=this.makePerson(staffColors[n]);this.office.add(person);this.staff.push({mesh:person,index:n});}
    this.customers=[];for(let n=0;n<8;n++){const person=this.makePerson([0x42b8ba,0xce835e,0xcc76c7,0xe1c879][n%4]);this.office.add(person);this.customers.push(person);}
    this.text(this.office,'CUSTOMERS / AI SERVICE',6,2.8,8,6,'#d4fb78');
  }
  update(state,selected){
    const fresh=!this.state||state.seed!==this.state.seed&&state.day===1||state.day<this.state.day;
    const previousActive=this.state?this.activeDistricts(this.state):new Set();
    const specs=W.buildings(state),wanted=new Set(specs.map(s=>s.id));
    for(const [id,f] of this.facilities){if(!wanted.has(id)){this.city.remove(f.group);this.pickTargets=this.pickTargets.filter(o=>o!==f.body);this.facilities.delete(id);this.animations=this.animations.filter(a=>a!==f);}}
    for(const spec of specs)if(!this.facilities.has(spec.id))this.facility(spec,!fresh);
    this.state=state;this.selected=selected||this.selected;
    this.customerForecast=globalThis.SeoulEngine?.forecast(state).commerce;
    if(fresh){for(const f of this.facilities.values()){f.elapsed=BUILD_DURATION;f.building.scale.y=1;f.scaffold.visible=false;}this.animations=[];this.playerPosition={x:0,z:8};}
    if(this.rackCount!==state.servers){this.officeRacks.clear();for(let n=0;n<state.servers;n++){const x=9+(n%4)*1.3,z=-10-Math.floor(n/4)*1.1;this.box(this.officeRacks,x,1.4,z,.95,2.8,.85,this.serverMat);for(let r=0;r<5;r++)this.box(this.officeRacks,x, .4+r*.46,z+.44,.7,.07,.025,this.neonCyan);}this.rackCount=state.servers;}
    this.syncNetwork(state);if(!fresh)for(const district of previousActive)if(!this.activeDistricts(state).has(district))this.flashAt(district,C.lime);
    this.updateHUD();
  }
  updateHUD(){
    if(!this.state)return;
    const d=window.SeoulEngine.districts.find(d=>d.id===this.selected),owned=this.state.districts.includes(this.selected);
    const difficulty=Math.max(1,Math.min(5,Number.isInteger(d.difficulty)?d.difficulty:Number.isInteger(d.level)?d.level:1));
    const staffCount=Math.max(1,Math.min(8,Number.isInteger(this.state.staff)?this.state.staff:3));
    const morale=Math.max(0,Math.min(100,Number.isInteger(this.state.morale)?this.state.morale:72));
    const mood=morale<35?'critical':morale<60?'low':'steady',power=this.powerInfo(this.selected),shadow=this.updateShadowHUD(),powerText=!owned?'PULSE · 연결 후 해금':power.cooldown?`${power.name} · 재충전 ${power.cooldown}일`:`${power.name} · READY`,powerClass=!owned?'locked':power.cooldown?'cooldown':'ready';
    this.root.dataset.shadowTier=shadow.heat>=86?'breach':shadow.heat>=68?'critical':shadow.heat>=46?'hunt':shadow.heat>=24?'trace':'quiet';
    this.root.querySelector('.world-selection').innerHTML=`<span>${this.mode==='office'?'을지로 본사':d.name}</span><small>${this.mode==='office'?`직원 ${staffCount}명 · 사기 ${morale} · 서버 ${this.state.servers}대`:`${owned?'● 연결됨':'○ 미연결'} · ${d.sector} · 난이도 ${difficulty}/5`}</small>${this.mode==='office'?'':`<small class="world-power-status ${powerClass}">⚡ ${powerText}</small>`}`;
    const officeHud=this.root.querySelector('.world-office-hud');officeHud.dataset.morale=mood;
    officeHud.querySelector('.world-team-status').textContent=`TEAM ${staffCount} · MORALE ${morale}%`;
    const invest=this.root.querySelector('[data-world="invest"]'),canSpend=cost=>typeof window.SeoulEngine.canAfford==='function'?window.SeoulEngine.canAfford(this.state,cost):this.state.cash>=cost;
    invest.textContent=owned?`서버 증설 · ${window.SeoulEngine.serverCost(this.state)} ₩C`:`지역 진출 · ${d.cost} ₩C`;
    const locked=!owned&&this.state.tech.language<d.tier,trustGate=Number.isFinite(d.trustGate)?d.trustGate:0,trustLocked=!owned&&this.state.trust<trustGate;
    if(locked)invest.textContent=`언어 모델 Lv.${d.tier} 필요`;else if(trustLocked)invest.textContent=`신뢰 ${trustGate} 필요`;
    invest.disabled=this.state.status!=='playing'||this.state.ap===0||!!this.state.event||locked||trustLocked||(owned?this.state.servers>=8||!canSpend(window.SeoulEngine.serverCost(this.state)):!canSpend(d.cost));
    invest.hidden=this.mode==='office';
    this.root.querySelector('.world-enter').hidden=this.mode==='office';this.root.querySelector('[data-world="replay"]').hidden=this.mode==='office';
    const active=this.activeDistricts();
    for(const el of this.root.querySelectorAll('[data-world-district]')){const id=el.dataset.worldDistrict,info=this.powerInfo(id);el.classList.toggle('selected',id===this.selected);el.classList.toggle('connected',this.state.districts.includes(id));el.classList.toggle('active-contract',active.has(id));el.classList.toggle('power-ready',info.ready);el.classList.toggle('power-cooldown',info.owned&&info.cooldown>0);el.setAttribute('aria-pressed',String(id===this.selected));}
    for(const label of this.labels){const facility=this.facilities.get(`hub-${label.id}`),district=window.SeoulEngine.districts.find(d=>d.id===label.id),level=Math.max(1,Math.min(5,Number.isInteger(district?.level)?district.level:Number.isInteger(district?.difficulty)?district.difficulty:1)),info=this.powerInfo(label.id);label.position.y=facility?facility.spec.height+5:2;label.element.dataset.difficulty=String(level);label.element.classList.toggle('power-ready',info.ready);label.element.classList.toggle('power-cooldown',info.owned&&info.cooldown>0);label.element.textContent=`${W.names[label.id]} · D${level}`;label.element.setAttribute('aria-label',`${W.names[label.id]} · 난이도 ${level}/5${info.owned?info.cooldown?` · 펄스 재충전 ${info.cooldown}일`:' · 펄스 사용 가능':''}`);}
    const p=W.positions[this.selected];this.selectionRing.position.set(p.x,.2,p.z);
    if(this.mode==='city')this.root.querySelector('.world-topnote small').textContent=active.size?`실시간 도시 시뮬레이션 · 데이터 스트림 ${active.size}`:'실시간 도시 시뮬레이션';
  }
  setMode(mode){
    this.mode=mode;this.keys.clear();this.root.dataset.mode=mode;
    for(const b of this.root.querySelectorAll('.world-tabs button'))b.classList.toggle('active',b.dataset.world===mode);
    this.root.querySelector('.world-labels').hidden=mode!=='city';this.root.querySelector('.world-districts').hidden=mode!=='city';
    this.root.querySelector('.world-shadow-hud').hidden=mode!=='city';
    this.root.querySelector('.world-office-hud').hidden=mode!=='office';this.root.querySelector('.world-touch').hidden=mode!=='office';
    this.root.querySelector('.world-hint').textContent=mode==='office'?'WASD / 방향키 이동 · 드래그 시점 · E 상호작용':'드래그 회전 · 휠 확대 · 지역 클릭';
    this.root.querySelector('.world-topnote small').textContent=mode==='office'?'을지로 본사 / FLOOR 01':'실시간 도시 시뮬레이션';
    this.root.querySelector('[data-world="focus"]').setAttribute('aria-label',mode==='office'?'캐릭터 따라보기':'선택 지역 확대');
    this.renderer.domElement.setAttribute('aria-label',mode==='office'?'회사 내부 3D 화면. WASD 또는 방향키로 캐릭터를 이동합니다.':'3D 도시 화면. 드래그로 회전하고 휠로 확대합니다.');
    this.resetCamera();this.updateHUD();this.renderer.domElement.focus({preventScroll:true});
  }
  resetCamera(){
    if(this.mode==='city'){const fit=Math.max(1,1.25/this.camera.aspect);this.camera.position.set(88,80,108).multiplyScalar(fit);this.controls.target.set(0,0,4);this.controls.minDistance=12;this.controls.maxDistance=480;this.controls.enablePan=true;}
    else{const p=this.playerPosition;this.camera.position.set(p.x+12,20,p.z+19);this.controls.target.set(p.x,1,p.z);this.controls.minDistance=6;this.controls.maxDistance=45;this.controls.enablePan=false;}
    this.controls.update();
  }
  setExpanded(value){this.expanded=value;this.root.classList.toggle('world-expanded',value);document.body.classList.toggle('world-open',value);this.root.querySelector('[data-world="expand"]').textContent=value?'✕ 축소하기':'⛶ 크게 보기';this.resize();this.renderer.domElement.focus({preventScroll:true});}
  handleClick(e){
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.move){const direction={w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]}[b.dataset.move];this.movePlayer(...direction,.08);this.renderer.domElement.focus({preventScroll:true});return;}
    if(b.dataset.worldDistrict){this.selected=b.dataset.worldDistrict;this.updateHUD();this.callbacks.select(this.selected);return;}
    const action=b.dataset.world;if(!action)return;
    if(action==='city'||action==='office')this.setMode(action);
    if(action==='expand')this.setExpanded(!this.expanded);
    if(action==='reset')this.resetCamera();
    if(action==='focus'){if(this.mode==='city'){const p=W.positions[this.selected];this.controls.target.set(p.x,5,p.z);this.camera.position.set(p.x+24,30,p.z+32);this.controls.update();}else this.resetCamera();}
    if(action==='zoom-in'||action==='zoom-out'){const offset=this.camera.position.clone().sub(this.controls.target);offset.multiplyScalar(action==='zoom-in'?.8:1.25);offset.setLength(T.MathUtils.clamp(offset.length(),this.controls.minDistance,this.controls.maxDistance));this.camera.position.copy(this.controls.target).add(offset);this.controls.update();}
    if(action==='invest')this.callbacks.action(this.state.districts.includes(this.selected)?'server':'expand',this.selected);
    if(action==='replay'){const f=this.facilities.get(`hub-${this.selected}`)||this.facilities.get('hub-euljiro');if(f){f.elapsed=0;f.replay=true;f.scaffold.visible=true;f.building.scale.y=.015;if(!this.animations.includes(f))this.animations.push(f);}}
    if(action==='interact')this.interact();
  }
  key(e,down){
    const key=e.key.toLowerCase();
    if(!down){this.keys.delete(key);return;}
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(!this.root.isConnected||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    if(key==='escape'&&this.expanded){this.setExpanded(false);return;}
    if(key==='tab'&&this.expanded){const items=[...this.root.querySelectorAll('button:not(:disabled),canvas[tabindex]')].filter(el=>el.getClientRects().length>0);const index=items.indexOf(document.activeElement);if(items.length){e.preventDefault();items[(index+(e.shiftKey?-1:1)+items.length)%items.length].focus();}return;}
    if(this.mode!=='office'||!this.root.contains(document.activeElement))return;
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){e.preventDefault();if(!e.repeat){const direction={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]}[key];this.movePlayer(...direction,.04);}this.keys.add(key);}
    if(key==='e'&&!e.repeat){e.preventDefault();this.interact();}
  }
  interact(){const station=W.nearStation(this.playerPosition);if(station){this.keys.clear();this.setExpanded(false);this.callbacks.navigate(station.page);}}
  pick(e){
    if(this.mode!=='city')return;
    const rect=this.renderer.domElement.getBoundingClientRect(),point=new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new T.Raycaster();ray.setFromCamera(point,this.camera);
    const hit=ray.intersectObjects(this.pickTargets,false)[0];if(hit){this.selected=hit.object.userData.district;this.updateHUD();this.callbacks.select(this.selected);}
  }
  resize(){if(!this.root.isConnected)return;const {width,height}=this.stage.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
  walking(dt){
    const held=(...keys)=>keys.some(k=>this.keys.has(k));let dx=Number(held('d','arrowright'))-Number(held('a','arrowleft')),dz=Number(held('s','arrowdown'))-Number(held('w','arrowup'));
    const moving=this.movePlayer(dx,dz,dt);
    this.animatePerson(this.player,moving?this.time*9:0,moving);
  }
  movePlayer(dx,dz,dt){
    const angle=Math.atan2(this.camera.position.x-this.controls.target.x,this.camera.position.z-this.controls.target.z);
    const direction={x:dx*Math.cos(angle)+dz*Math.sin(angle),z:-dx*Math.sin(angle)+dz*Math.cos(angle)};
    const old=this.playerPosition,p=W.move(old,direction,dt);this.playerPosition=p;this.player.position.set(p.x,0,p.z);
    const moving=Math.hypot(p.x-old.x,p.z-old.z)>.0001;
    if(moving)this.player.rotation.y=Math.atan2(p.x-old.x,p.z-old.z);
    const delta=new T.Vector3(p.x-this.controls.target.x,0,p.z-this.controls.target.z);this.controls.target.add(delta);this.camera.position.add(delta);
    this.near=W.nearStation(p);
    if(moving||this.time-this.lastHUD>.12){this.lastHUD=this.time;const interact=this.root.querySelector('[data-world="interact"]');interact.disabled=!this.near;interact.textContent=this.near?`E · ${this.near.name} 열기`:'E · 단말 가까이 이동';this.root.querySelector('.world-location').textContent=this.near?this.near.name:p.z>5?'로비 · RECEPTION':'업무 공간 · WORKSPACE';this.root.querySelector('.world-coordinates').textContent=`X ${p.x.toFixed(1)} · Z ${p.z.toFixed(1)}`;}
    return moving;
  }
  animatePerson(person,phase,moving){const limbs=person.userData.limbs;for(let i=0;i<limbs.length;i++)limbs[i].rotation.x=moving?Math.sin(phase+(i<2?0:Math.PI))*(i%2?.35:.5):0;}
  tick(timestamp){
    if(this.disposed)return;this.raf=requestAnimationFrame(this.frame);
    if(timestamp-this.lastFrame<1000/30)return;
    const dt=Math.min((timestamp-this.lastFrame)/1000,.08);this.lastFrame=timestamp;
    if(document.hidden||!this.root.isConnected||(!this.visible&&!this.expanded)||this.contextLost||document.querySelector('dialog[open]'))return;
    this.time+=dt;
    if(this.mode==='city'){
      for(const f of this.animations){f.elapsed=Math.min(BUILD_DURATION,f.elapsed+dt);const p=f.elapsed/BUILD_DURATION;f.building.scale.y=Math.max(.015,Math.floor(p*15)/15);f.crane.rotation.y=Math.sin(this.time)*.2;f.scaffold.visible=p<1;if(p===1){f.building.scale.y=1;f.replay=false;this.flashAt(f.spec.district,f.spec.type==='research'?C.pink:C.lime);}}
      this.animations=this.animations.filter(f=>f.elapsed<BUILD_DURATION);
      const f=this.animations[0],build=this.root.querySelector('.world-build');build.textContent=f?`${f.replay?'건설 리플레이':'건설 중'} / ${f.spec.name} · ${Math.floor(f.elapsed/BUILD_DURATION*100)}%`:'';build.classList.toggle('active',!!f);
      for(const car of this.cars)car.mesh.position.set((((this.reducedMotion?0:this.time)*5+car.offset)%125)-62,.5,car.lane);
      this.drone.position.set(Math.sin((this.reducedMotion?0:this.time)*.16)*34,18,-5+Math.cos((this.reducedMotion?0:this.time)*.16)*18);
      this.waterMaterial.emissiveIntensity=.25+(this.reducedMotion?0:Math.sin(this.time*.7)*.08)+this.shadowHeat*.14;
      this.animateShadowProtocol();
      this.animateNetwork();this.animateFlashes(dt);
      for(const label of this.labels){const v=label.position.clone().project(this.camera);label.element.style.left=`${(v.x*.5+.5)*100}%`;label.element.style.top=`${(-v.y*.5+.5)*100}%`;label.element.style.display=v.z>1||Math.abs(v.x)>.95||Math.abs(v.y)>.94?'none':'';}
    }else{
      this.walking(dt);this.root.querySelector('.world-build').classList.remove('active');
      const staffCount=Math.max(1,Math.min(8,Number.isInteger(this.state?.staff)?this.state.staff:3));
      const morale=Math.max(0,Math.min(100,Number.isInteger(this.state?.morale)?this.state.morale:72));
      for(const staff of this.staff){const phase=(this.reducedMotion?0:this.time)*.3+staff.index*2,mesh=staff.mesh,visible=staff.index<Math.min(this.staff.length,staffCount),slot=this.staffSlots[staff.index];mesh.visible=visible;if(!visible)continue;mesh.position.set(slot[0],0,slot[1]+Math.sin(phase)*1.4);mesh.rotation.y=Math.cos(phase)>0?0:Math.PI;const suit=mesh.userData.torso.material;if(suit.emissive){suit.emissive.setHex(morale<35?0x5b2020:morale<60?0x4b4321:0x111111);suit.emissiveIntensity=morale<60?.22:0;}this.animatePerson(mesh,this.time*6+staff.index,!this.reducedMotion);}
      const customerForecast=this.customerForecast;
      for(let n=0;n<this.customers.length;n++){const person=this.customers[n];person.visible=!!customerForecast&&n<Math.min(8,Math.ceil(customerForecast.visitors/4));if(!person.visible)continue;const phase=this.reducedMotion?n/8:((this.time*.055+n/8)%1);const x=phase<.35?-7+phase/.35*12:phase<.65?5:5-(phase-.65)/.35*12;person.position.set(x,0,phase<.35?10:phase<.65?8+(n%3)*.6:10);person.rotation.y=phase<.35?Math.PI/2:phase<.65?Math.PI:-Math.PI/2;this.animatePerson(person,this.time*5+n,!this.reducedMotion&&(phase<.35||phase>.65));}
      for(const ring of this.stationRings)ring.scale.setScalar(1+Math.sin(this.time*2)*.035);
    }
    this.controls.update();this.renderer.render(this.mode==='city'?this.city:this.office,this.camera);
  }
  suspend(){this.keys.clear();}
  dispose(){
    this.renderer.domElement.removeEventListener('webglcontextlost',this.onContextLost);
    this.disposed=true;cancelAnimationFrame(this.raf);this.setExpanded(false);this.resizeObserver.disconnect();this.intersection.disconnect();this.controls.dispose();this.renderer.dispose();
    this.root.removeEventListener('click',this.onClick);window.removeEventListener('keydown',this.onKeyDown);window.removeEventListener('keyup',this.onKeyUp);window.removeEventListener('blur',this.onBlur);document.removeEventListener('visibilitychange',this.onVisibility);
    this.root.removeEventListener('pointerdown',this.onPointerDown);this.root.removeEventListener('pointerup',this.onPointerUp);this.root.removeEventListener('pointercancel',this.onPointerCancel);
    for(const item of [...this.geometries,...this.materials,...this.textures])item.dispose();
  }
}
function rootAppend(root,selector,element){root.querySelector(selector).append(element);}
