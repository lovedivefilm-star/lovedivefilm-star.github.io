import { WheelGestureGate } from './wheel-gesture-gate';
type PreviewWork={slug:string;kind:'film'|'image'|'script';href:string;title:string;format:string;duration:string;credit:string;poster:string;cover:string;preview:string;width:number;height:number;rasterCapHeight?:number};
type TechnicalClip={id:string;title:string;src:string;poster:string;start:number;window:number};
type ScriptCard={id:string;title:string};
const root=document.querySelector<HTMLElement>('[data-remy-root]');
if(root){
 const works:PreviewWork[]=JSON.parse(root.querySelector('[data-remy-data]')?.textContent||'[]');
 const technical:TechnicalClip[]=JSON.parse(root.querySelector('[data-remy-technical-data]')?.textContent||'[]');
 const scripts:ScriptCard[]=JSON.parse(root.querySelector('[data-remy-script-data]')?.textContent||'[]');
 const count=works.length;
 const mod=(value:number)=>(value%count+count)%count;
 const cards=Array.from(root.querySelectorAll<HTMLAnchorElement>('.remy-card'));
 const visuals=cards.map(card=>card.querySelector<HTMLElement>('.remy-card-visual')!);
 const focusValues=cards.map(()=>-1);
 const heading=root.querySelector<HTMLElement>('.remy-work-heading')!;
 let focusFrame=0,focusUntil=0;
 const choices=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-work-select]'));
 const videos=cards.map(card=>card.querySelector<HTMLVideoElement>('video'));
 const stage=root.querySelector<HTMLElement>('[data-remy-stage]')!;
 const strip=root.querySelector<HTMLElement>('[data-remy-strip]')!;
 const auto=root.querySelector<HTMLButtonElement>('[data-remy-autoplay]')!;
 const progress=root.querySelector<HTMLInputElement>('[data-remy-progress]')!;
 const wheelGate=new WheelGestureGate(600);
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 const initialSlug=new URL(window.location.href).searchParams.get('work');
 const initialIndex=Math.max(0,works.findIndex(work=>work.slug===initialSlug));
 const initialItem=new URL(window.location.href).searchParams.get('item');
 let selected=initialIndex,visualCenter=initialIndex+count,autoEnabled=!reduce.matches&&works[initialIndex].kind==='film',inView=true,hovered=false,focused=false,timer:ReturnType<typeof setTimeout>|undefined;
 let rebaseTimer:ReturnType<typeof setTimeout>|undefined;
 let geometryKey='',geometry:Array<{width:number;height:number}>=[];
 let innerGroup:'technical'|'scripts'|null=null,innerIndex=0,innerPaused=false,innerTimer:ReturnType<typeof setTimeout>|undefined,restoredInner=false;
 let techVideo:HTMLVideoElement|null=null,techLoadedIndex=-1,snapshot:HTMLCanvasElement|null=null;
 let drag:{id:number;x:number;y:number;dx:number;offset:number;horizontal:boolean;start:number}|null=null,suppressClick=false;
 const setText=(selector:string,text:string)=>{const node=root.querySelector(selector);if(node)node.textContent=text;};
 // Remy module14935 derives tone from the continuous slot position, not selection.
 // Interpolate that position between actual translated centers to support our
 // mixed native widths, CSS easing, reversals and direct pointer dragging.
 function syncCardFocus(){
  const stageBox=stage.getBoundingClientRect(),center=stageBox.left+stageBox.width/2;
  const centers=cards.map(card=>{const box=card.getBoundingClientRect();return box.left+box.width/2;});
  const right=centers.findIndex(value=>value>=center);
  let position=visualCenter;
  if(right===0)position=0;
  else if(right<0)position=cards.length-1;
  else{const left=right-1,span=centers[right]-centers[left];if(span>.01)position=left+(center-centers[left])/span;}
  visuals.forEach((visual,slot)=>{
   const value=Math.max(0,Math.min(1,1-Math.abs(slot-position)));
   const focus=value<.00001?0:value>.99999?1:value;
   // Hold the last decoded picture throughout its exit; restore the still only
   // at zero focus. Incoming video replaces its cover only after a real frame is ready.
   const video=videos[slot],ready=!!video&&video.readyState>=2&&!video.seeking;
   cards[slot].classList.toggle('has-preview-frame',!reduce.matches&&focus>0&&(ready||cards[slot].classList.contains('has-preview-frame')));
   if(Math.abs(focus-focusValues[slot])<.00001)return;
   focusValues[slot]=focus;visual.style.setProperty('--remy-focus',String(focus));
  });
  // Remy PC title alpha; compact uses the same gate to keep the incoming label in sync.
  const titleAlpha=reduce.matches?1:Math.max(0,Math.min(1,(focusValues[visualCenter]-.55)/.45));
  heading.style.setProperty('--remy-heading-opacity',String(titleAlpha));
 }
 function stopFocusMotion(){cancelAnimationFrame(focusFrame);focusFrame=0;}
 function trackFocusMotion(){
  syncCardFocus();
  if(reduce.matches||document.hidden||root!.classList.contains('is-rebasing')||drag?.horizontal||Math.abs(activeOffset())<.001){stopFocusMotion();return;}
  // One finite RAF chain follows the existing 600ms positional transition.
  // Pointer moves update synchronously; settled or hidden pages keep no loop.
  focusUntil=performance.now()+650;
  if(focusFrame)return;
  const tick=()=>{syncCardFocus();if(performance.now()<focusUntil&&!document.hidden){focusFrame=requestAnimationFrame(tick);}else focusFrame=0;};
  focusFrame=requestAnimationFrame(tick);
 }
 function sizeCards(offset=0){
  const firstLayout=geometryKey==='';
  if(firstLayout)root!.classList.add('is-rebasing');
  const dpr=window.devicePixelRatio||1,compact=window.innerWidth<=760,r=stage.getBoundingClientRect();
  // Reflow user text-spacing/zoom overrides without covering the work selector.
  const caption=root.querySelector<HTMLElement>('.remy-meta')!;
  const captionReserve=Math.max(parseFloat(getComputedStyle(stage).getPropertyValue('--remy-caption-base')),caption.offsetHeight+8);
  stage.style.setProperty('--remy-caption-reserve',captionReserve+'px');
  const key=[r.width,r.height,dpr,compact,captionReserve].join(':');
  if(key!==geometryKey){
   geometryKey=key;
   const availableWidth=r.width-2*parseFloat(getComputedStyle(root!).getPropertyValue('--remy-gutter'));
   // Each source has its own DPR ceiling. A 720p technical clip must not limit
   // a 1280px portrait or an HTML screenplay. Selection never changes geometry.
   geometry=works.map(work=>{
    const height=Math.max(1,Math.min(r.height-captionReserve,work.kind==='script'?Infinity:(work.rasterCapHeight??work.height)/dpr,availableWidth*work.height/work.width));
    return{height,width:height*work.width/work.height};
   });
   cards.forEach((card,slot)=>{const box=geometry[slot%count];card.style.width=`${box.width}px`;card.style.height=`${box.height}px`;});
  }
  stage.style.setProperty('--remy-active-height',`${geometry[selected].height}px`);
  const widths=geometry.map(box=>box.width);
  const gap=window.innerWidth<=760?14:Math.max(24,window.innerWidth*.018);
  cards.forEach((card,slot)=>{
   const index=slot%works.length,center=visualCenter,distance=slot-center;
   let x=0;
   if(distance!==0){const direction=Math.sign(distance);for(let at=center;at!==slot;at+=direction)x+=direction*(widths[mod(at)]/2+widths[mod(at+direction)]/2+gap);}
   card.style.transform=`translate(calc(-50% + ${x+offset}px),-50%)`;
  });
  trackFocusMotion();
  if(firstLayout){strip.getBoundingClientRect();root!.classList.remove('is-rebasing');root!.classList.add('is-layout-ready');}
  const list=root.querySelector<HTMLElement>('.remy-work-list')!,choice=choices[selected].getBoundingClientRect(),listRect=list.getBoundingClientRect();
  list.style.setProperty('--remy-selection-x',`${choice.left+choice.width/2-listRect.left}px`);
  list.style.setProperty('--remy-selection-y',`${Math.max(0,choice.top-listRect.top-20)}px`);
 }
 function renderCardSelection(){
  let restoreVisibleFocus=false;
  cards.forEach((card,slot)=>{
   const active=slot===visualCenter;
   if(!active&&card===document.activeElement)restoreVisibleFocus=true;
   card.classList.toggle('is-active',active);
   card.setAttribute('aria-hidden',String(!active));card.tabIndex=active?0:-1;
   if(active)card.setAttribute('aria-current','true');else card.removeAttribute('aria-current');
  });
  // Native focus must not scroll the transformed strip away from its caption.
  strip.scrollLeft=0;
  if(restoreVisibleFocus)choices[selected].focus({preventScroll:true});
 }
 function activeOffset(){const card=cards[visualCenter].getBoundingClientRect(),r=stage.getBoundingClientRect();return card.left+card.width/2-r.left-r.width/2;}
 function rebase(preservePosition=false){
  clearTimeout(rebaseTimer);rebaseTimer=undefined;
  const canonical=selected+count;if(canonical===visualCenter)return;
  const offset=preservePosition?activeOffset():0;
  // Reparent the playing element instead of restarting another decoder. Both
  // slots represent the same work, so its time and buffered frames survive.
  const activeVideo=videos[visualCenter],idleVideo=videos[canonical];
  if(activeVideo&&idleVideo){const marker=document.createComment('video-rebase');activeVideo.replaceWith(marker);idleVideo.replaceWith(activeVideo);marker.replaceWith(idleVideo);videos[visualCenter]=idleVideo;videos[canonical]=activeVideo;}
  root.classList.add('is-rebasing');visualCenter=canonical;
  renderCardSelection();sizeCards(offset);strip.getBoundingClientRect();root.classList.remove('is-rebasing');
  if(innerGroup)renderInner();
 }
 function stopTimer(){clearTimeout(timer);timer=undefined;}
 function updateProgress(){
  const video=videos[visualCenter],duration=video?.duration??0,ready=!!video&&Number.isFinite(duration)&&duration>0;
  progress.disabled=!ready;progress.max=String(ready?duration:1);progress.value=String(ready?Math.min(duration,video!.currentTime):0);
  progress.style.setProperty('--remy-progress',`${ready?video!.currentTime/duration*100:0}%`);
  if(ready)progress.setAttribute('aria-valuetext',`${video!.currentTime.toFixed(1)}초 / ${duration.toFixed(1)}초`);else progress.removeAttribute('aria-valuetext');
 }
 function renderAuto(){
  const grouped=works[selected].kind!=='film',running=grouped?!innerPaused&&!reduce.matches:autoEnabled;
  const label=grouped?(running?'미리보기 멈춤':'미리보기 재생'):(running?'자동 넘김 멈춤':'자동 넘김 시작');
  auto.textContent=label;auto.setAttribute('aria-label',label);auto.title=label;auto.setAttribute('aria-pressed',String(running));auto.hidden=false;auto.setAttribute('aria-hidden','false');auto.disabled=false;
  root.querySelector('.remy-work-heading')?.setAttribute('aria-live',running?'off':'polite');
 }
 function updatePlayback(){
  videos.forEach((video,i)=>{if(!video)return;if(i===visualCenter&&!reduce.matches&&inView&&!document.hidden){video.preload='auto';video.play().catch(()=>{});}else video.pause();});
  stopTimer();const current=videos[visualCenter];
  if(current)current.preload=reduce.matches?'metadata':'auto';updateProgress();
  if(current&&autoEnabled&&inView&&!document.hidden&&!hovered&&!focused&&!reduce.matches&&Number.isFinite(current.duration))timer=setTimeout(()=>{
   let next=mod(selected+1);while(works[next].kind!=='film')next=mod(next+1);select(next,false,true);
  },Math.max(1000,(current.duration-current.currentTime)*1000+250));
  syncInnerPlayback();
 }
 function clearInnerTimer(){clearTimeout(innerTimer);innerTimer=undefined;}
 function canRunInner(){return !!innerGroup&&!innerPaused&&!reduce.matches&&inView&&!document.hidden&&!cards[visualCenter].contains(document.activeElement);}
 function innerItems(){return innerGroup==='technical'?technical:scripts;}
 function resetInner(){
  clearInnerTimer();techVideo?.pause();if(techVideo){techVideo.removeAttribute('src');techVideo.load();techVideo.remove();}techLoadedIndex=-1;snapshot?.remove();snapshot=null;
  root.querySelectorAll<HTMLElement>('[data-remy-inner-group]').forEach(stack=>stack.querySelectorAll<HTMLElement>('[data-inner-index]').forEach((layer,i)=>layer.classList.toggle('is-inner-active',i===0)));
  cards.forEach(card=>{const work=works[Number(card.dataset.index)];if(work.kind!=='film')card.href=work.href;});
  innerGroup=null;innerIndex=0;delete root.dataset.innerWork;
 }
 function renderInner(){
  if(!innerGroup)return;
  const items=innerItems(),item=items[innerIndex],host=cards[visualCenter].querySelector<HTMLElement>(`[data-remy-inner-group="${innerGroup}"]`);
  if(!host||!item)return;
  host.querySelectorAll<HTMLElement>('[data-inner-index]').forEach((layer,i)=>layer.classList.toggle('is-inner-active',i===innerIndex));
  if(innerGroup==='technical'&&techVideo){host.querySelector(`[data-inner-index="${innerIndex}"]`)?.append(techVideo);}
  setText('[data-remy-inner-status]',`${item.title} · ${innerIndex+1}/${items.length}`);
  cards[visualCenter].href=innerGroup==='technical'?`/tools/?work=${encodeURIComponent(item.id)}`:`/scripts/#${encodeURIComponent(item.id)}`;
  root.dataset.innerWork=item.id;
  const url=new URL(location.href);url.searchParams.set('work',works[selected].slug);url.searchParams.set('item',item.id);history.replaceState(history.state,'',url);
 }
 function rememberTechFrame(){
  if(!techVideo||techVideo.readyState<2||!techVideo.videoWidth)return;
  const host=cards[visualCenter].querySelector<HTMLElement>('[data-remy-inner-group="technical"]');if(!host)return;
  snapshot?.remove();snapshot=document.createElement('canvas');snapshot.width=techVideo.videoWidth;snapshot.height=techVideo.videoHeight;snapshot.className='remy-inner-snapshot';snapshot.setAttribute('aria-hidden','true');
  try{snapshot.getContext('2d')?.drawImage(techVideo,0,0);host.append(snapshot);const saved=snapshot;requestAnimationFrame(()=>requestAnimationFrame(()=>{saved.classList.add('is-fading');setTimeout(()=>saved.remove(),350);}));}catch{snapshot.remove();}
 }
 function scheduleInner(delay:number){clearInnerTimer();if(canRunInner())innerTimer=setTimeout(()=>{innerTimer=undefined;advanceInner();},delay);}
 function advanceInner(){
  if(!canRunInner())return;
  if(innerGroup==='technical')rememberTechFrame();
  innerIndex=(innerIndex+1)%innerItems().length;renderInner();
  if(innerGroup==='technical')loadTechnical();else scheduleInner(4500);
 }
 function loadTechnical(){
  if(innerGroup!=='technical')return;
  const clip=technical[innerIndex];if(!clip)return;
  if(!techVideo){
   techVideo=document.createElement('video');techVideo.className='remy-inner-video';techVideo.muted=true;techVideo.playsInline=true;techVideo.preload='none';techVideo.setAttribute('aria-hidden','true');
   techVideo.addEventListener('loadedmetadata',()=>{if(innerGroup==='technical'&&techLoadedIndex===innerIndex)techVideo!.currentTime=technical[innerIndex].start;});
   techVideo.addEventListener('seeked',()=>{if(innerGroup!=='technical'||techLoadedIndex!==innerIndex)return;techVideo!.classList.add('is-ready');if(canRunInner()){techVideo!.play().catch(()=>{});scheduleInner(Math.max(100,(technical[innerIndex].start+technical[innerIndex].window-techVideo!.currentTime)*1000));}});
  }
  techLoadedIndex=innerIndex;techVideo.pause();techVideo.classList.remove('is-ready');techVideo.poster=clip.poster;techVideo.src=clip.src;techVideo.preload='auto';renderInner();techVideo.load();scheduleInner(6000);
 }
 function syncInnerPlayback(){
  const slug=works[selected].slug,isGroup=slug==='technical'||slug==='scripts';
  root.querySelector<HTMLElement>('[data-remy-format]')!.hidden=isGroup;
  root.querySelector<HTMLElement>('[data-remy-inner-status]')!.hidden=!isGroup;
  if(!isGroup){if(innerGroup)resetInner();renderAuto();return;}
  if(innerGroup!==slug){
   resetInner();innerGroup=slug;innerPaused=reduce.matches;innerIndex=0;
   if(!restoredInner&&initialSlug===slug&&initialItem){const index=innerItems().findIndex(item=>item.id===initialItem);if(index>=0)innerIndex=index;}restoredInner=true;renderInner();
  }
  if(!canRunInner()){clearInnerTimer();techVideo?.pause();renderAuto();return;}
  if(innerGroup==='technical'){
   if(techLoadedIndex!==innerIndex)loadTechnical();else{renderInner();techVideo?.play().catch(()=>{});if(!innerTimer&&techVideo?.readyState&&techVideo.readyState>=2)scheduleInner(Math.max(100,(technical[innerIndex].start+technical[innerIndex].window-techVideo.currentTime)*1000));}
  }else if(!innerTimer)scheduleInner(4500);
  renderAuto();
 }
 function pauseAuto(){autoEnabled=false;renderAuto();stopTimer();}
 function select(index:number,user=true,forward=false){
  clearTimeout(rebaseTimer);rebase(true);
  const previous=selected,next=mod(index);
  let distance=mod(next-previous);if(!forward&&distance>count/2)distance-=count;
  visualCenter+=distance;selected=next;const work=works[selected];if(previous!==selected&&videos[visualCenter])videos[visualCenter]!.currentTime=0;
  if(user||work.kind!=='film')pauseAuto();
  root.dataset.hasPreview=String(work.kind==='film');root.dataset.work=work.slug;
  const progressRail=root.querySelector<HTMLElement>('.remy-clip-progress')!;progressRail.hidden=false;progressRail.setAttribute('aria-hidden',String(work.kind!=='film'));
  root.querySelector<HTMLElement>('[data-remy-duration-wrap]')!.hidden=!work.duration;
  root.querySelector<HTMLElement>('[data-remy-credit-wrap]')!.hidden=work.kind!=='film'||!work.credit;
  renderAuto();
  renderCardSelection();
  choices.forEach((choice,i)=>{choice.classList.toggle('is-active',i===selected);choice.setAttribute('aria-pressed',String(i===selected));});
  setText('[data-remy-index]',String(selected+1).padStart(2,'0'));setText('[data-remy-title]',work.title);setText('[data-remy-credit]',work.credit);setText('[data-remy-format]',work.format);setText('[data-remy-duration]',work.duration);
  sizeCards();updatePlayback();
  const url=new URL(window.location.href);url.searchParams.set('work',work.slug);if(work.kind==='film')url.searchParams.delete('item');history.replaceState(history.state,'',url);
  if(visualCenter!==selected+count)rebaseTimer=setTimeout(()=>{rebase();updatePlayback();},reduce.matches?0:650);
  root.dispatchEvent(new CustomEvent('remy:select',{detail:{index:selected,slug:work.slug}}));
 }
 // A direct control is a separate user action; it must not inherit a prior
 // wheel burst's lock. Wheel-driven select() deliberately does not reset it.
 function selectFromControl(index:number){wheelGate.reset();select(index);}
 strip.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}},true);
 strip.addEventListener('dragstart',event=>event.preventDefault());
 cards.forEach(card=>card.addEventListener('click',event=>{if(!event.defaultPrevented){selectFromControl(Number(card.dataset.index));const slot=Number(card.dataset.slot);if(slot<count||slot>=2*count)choices[selected].focus({preventScroll:true});}}));
 choices.forEach((choice,i)=>choice.addEventListener('click',()=>selectFromControl(i)));
 progress.addEventListener('input',()=>{pauseAuto();const video=videos[visualCenter];if(video&&Number.isFinite(video.duration)){video.currentTime=Math.min(video.duration,Math.max(0,Number(progress.value)));updateProgress();}});
 root.querySelector('[data-remy-prev]')?.addEventListener('click',()=>selectFromControl(selected-1));
 root.querySelector('[data-remy-next]')?.addEventListener('click',()=>selectFromControl(selected+1));
 auto.addEventListener('click',()=>{if(works[selected].kind!=='film'){innerPaused=!innerPaused;}else{autoEnabled=!autoEnabled;if(autoEnabled){hovered=false;focused=false;}}renderAuto();updatePlayback();});
 root.addEventListener('keydown',event=>{if(!(event.target instanceof HTMLElement)||event.target.closest('input,textarea,select'))return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();selectFromControl(selected+(event.key==='ArrowRight'?1:-1));choices[selected].focus({preventScroll:true});}});
 strip.addEventListener('pointerdown',event=>{if(event.button!==0)return;pauseAuto();rebase(true);drag={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,offset:activeOffset(),horizontal:false,start:performance.now()};});
 strip.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.horizontal&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.2){drag.horizontal=true;strip.setPointerCapture(event.pointerId);root.classList.add('is-dragging');}if(drag.horizontal){drag.dx=dx;sizeCards(dx+drag.offset);}});
 function release(event:PointerEvent){if(!drag||event.pointerId!==drag.id)return;const current=drag;drag=null;root.classList.remove('is-dragging');if(current.horizontal){suppressClick=true;const width=cards[visualCenter].getBoundingClientRect().width;const threshold=Math.max(24,Math.min(width*.1,72));if(Math.abs(current.dx)>threshold)selectFromControl(selected+(current.dx<0?1:-1));else sizeCards();setTimeout(()=>suppressClick=false,0);}}
 strip.addEventListener('pointerup',release);strip.addEventListener('pointercancel',release);
 // Wheel events have no gesture ID: rearm only after 600ms of no valid input.
 // Large deltas, inertia and a reversal within a burst never add extra steps.
 root.addEventListener('wheel',event=>{
  const target=event.target instanceof Element?event.target:null;
  if(event.ctrlKey||event.metaKey||!inView||target?.closest('input,textarea,select,[contenteditable=true]'))return;
  if(Math.abs(event.deltaY)>=Math.abs(event.deltaX)&&document.documentElement.scrollHeight>innerHeight+1&&!stage.contains(target))return;
  const scale=event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1;
  const delta=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*scale;
  if(!Number.isFinite(delta)||Math.abs(delta)<.1)return;
  event.preventDefault();pauseAuto();
  const direction=wheelGate.consume(delta,performance.now());
  if(direction)select(selected+direction);
 },{passive:false});

 const pauseZones=[stage,root.querySelector<HTMLElement>('.remy-work-list')!];
 pauseZones.forEach(zone=>{
  zone.addEventListener('pointerenter',()=>{hovered=true;pauseAuto();});
  zone.addEventListener('pointerleave',()=>{hovered=false;updatePlayback();});
  zone.addEventListener('focusin',()=>{if(innerGroup&&cards[visualCenter].contains(document.activeElement))innerPaused=true;focused=true;pauseAuto();updatePlayback();});
  zone.addEventListener('focusout',()=>{queueMicrotask(()=>{focused=pauseZones.some(item=>item.contains(document.activeElement));updatePlayback();});});
 });
 document.addEventListener('visibilitychange',()=>{updatePlayback();if(document.hidden)stopFocusMotion();else trackFocusMotion();});
 const observer=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??false;updatePlayback();},{threshold:.15});observer.observe(stage);
 videos.forEach(video=>{
  if(!video)return;
  video.addEventListener('loadedmetadata',()=>{if(video===videos[visualCenter])updatePlayback();});
  video.addEventListener('loadeddata',syncCardFocus);
  video.addEventListener('seeked',syncCardFocus);
  video.addEventListener('timeupdate',()=>{if(video===videos[visualCenter])updateProgress();});
 });
 const layoutObserver=new ResizeObserver(()=>sizeCards());
 layoutObserver.observe(stage);layoutObserver.observe(root.querySelector('.remy-meta')!);
 window.addEventListener('resize',()=>sizeCards());reduce.addEventListener('change',()=>{if(reduce.matches){pauseAuto();if(innerGroup){innerPaused=true;innerIndex=0;techLoadedIndex=-1;if(techVideo){techVideo.pause();techVideo.classList.remove('is-ready');techVideo.removeAttribute('src');techVideo.load();}renderInner();}}stopFocusMotion();trackFocusMotion();updatePlayback();});
 document.fonts.ready.then(()=>sizeCards());
 renderAuto();select(initialIndex,false);
}
