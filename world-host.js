(function(){
  'use strict';
  const root=document.createElement('section');root.id='world-root';root.className='world-root';root.dataset.mode='city';
  let world=null,promise=null,latest=null,slot=null,failed=false;
  function fallback(){
    failed=true;if(slot)slot.innerHTML='<div class="world-unavailable"><b>3D 화면을 연결할 수 없습니다.</b><span>WebGL 2를 지원하는 브라우저에서 로컬 서버 주소로 실행하세요. 아래 2D 지도에서 계속 플레이할 수 있습니다.</span></div>';
    const detail=document.querySelector('.world-fallback');if(detail)detail.open=true;
  }
  function sync(state,selected,callbacks){
    latest={state,selected,callbacks};if(world){world.callbacks=callbacks;world.update(state,selected);}
  }
  function mount(target){
    slot=target;if(!slot){world?.suspend();return;}
    if(failed){fallback();return;}
    if(world){slot.replaceChildren(root);world.resize();return;}
    if(promise)return;
    promise=import('./world3d.mjs').then(({World})=>{
      if(!slot||!slot.isConnected){promise=null;return;}
      slot.replaceChildren(root);
      try{world=new World(root,latest.callbacks);world.update(latest.state,latest.selected);world.resize();}
      catch(error){console.warn('3D unavailable:',error.message);fallback();}
    }).catch(error=>{console.warn('3D assets unavailable:',error.message);fallback();});
  }
  function detach(){if(world){world.suspend();root.remove();}slot=null;}
  function leave(){world?.setExpanded(false);world?.suspend();}
  window.Seoul3D={sync,mount,detach,leave};
  window.addEventListener('pagehide',event=>{if(!event.persisted)world?.dispose();});
})();
