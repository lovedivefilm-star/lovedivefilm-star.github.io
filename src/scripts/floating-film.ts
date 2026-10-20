import { fluidMiniPlayer } from './vendor/fluid-miniplayer';
import { createFilmWindow } from './film-window';
import { connectFilmMedia, type FilmPlayback, type FilmMediaElement } from './youtube-player';
/** Keep the same playback element in Fluid Player's placeholder wrapper.
 * interact.js supplies the handle-only movable/resizable window; page and media
 * scrolling remain native outside those explicit handles.
 */
for(const root of document.querySelectorAll<HTMLElement>('[data-film-follow]')){
 const anchor=root.querySelector<HTMLElement>('[data-film-anchor]')!;
 const surface=root.querySelector<HTMLElement>('[data-film-surface]')!;
 const frame=root.querySelector<HTMLElement>('[data-film-frame]')!;
 const bar=root.querySelector<HTMLElement>('[data-film-mini-bar]')!;
 const footer=root.querySelector<HTMLElement>('[data-film-mini-footer]')!;
 const toggle=root.querySelector<HTMLButtonElement>('[data-film-mini-toggle]')!;
 const back=root.querySelector<HTMLButtonElement>('[data-film-mini-return]')!;
 const close=root.querySelector<HTMLButtonElement>('[data-film-mini-close]')!;
 const mini=fluidMiniPlayer(root,surface);
 let playback:FilmPlayback|null=null,unsubscribe:(()=>void)|null=null,dismissed=false,scheduled=0;
 const windowControl=createFilmWindow({root,surface,frame,bar,footer,onChange:reserveSpace});
 function reserveSpace(){
  if(!mini.isOn())return;
  mini.refresh();const box=surface.getBoundingClientRect(),free=windowControl.isManual();
  document.body.classList.toggle('has-free-floating-film',free);
  document.body.style.setProperty('--film-scroll-space',Math.ceil(box.height+24)+'px');
  if(free){document.body.style.setProperty('--film-dock-height','0px');document.body.style.removeProperty('--film-aside-reserve');return;}
  if(innerWidth<=900){document.body.style.setProperty('--film-dock-height',Math.ceil(box.height+24)+'px');document.body.style.removeProperty('--film-aside-reserve');}
  else{
   const workspace=document.querySelector('.pipeline-workspace')?.getBoundingClientRect();
   const reserve=Math.max(0,Math.min(box.width+24,(workspace?.width??innerWidth)-420));
   document.body.style.setProperty('--film-aside-reserve',reserve+'px');document.body.style.removeProperty('--film-dock-height');
  }
 }
 function floating(on:boolean){
  if(on){
   const opening=!mini.isOn();mini.on();bar.hidden=false;footer.hidden=false;document.body.classList.add('has-floating-film');
   if(opening)windowControl.show();reserveSpace();
  }else{
   windowControl.hide();mini.off();bar.hidden=true;footer.hidden=true;
   document.body.classList.remove('has-floating-film','has-free-floating-film');
   for(const key of ['--film-dock-height','--film-aside-reserve','--film-scroll-space'])document.body.style.removeProperty(key);
  }
 }
 function paint(){const state=playback?.snapshot();const playing=!!state&&!state.paused&&!state.ended;toggle.textContent=playing?'멈춤':'재생';toggle.setAttribute('aria-label',playing?'풀영상 일시정지':'풀영상 재생');}
 function sync(){
  const state=playback?.snapshot(),past=anchor.getBoundingClientRect().bottom<=0;
  const external=!!document.pictureInPictureElement||!!document.fullscreenElement;
  const allowed=!!playback&&playback.element.isConnected&&!!state?.started&&!state.ended&&!state.error&&!state.blocked&&!dismissed&&!document.hidden&&!external&&windowControl.canFit();
  floating(allowed&&past&&(!state!.paused||mini.isOn()));paint();
 }
 function reset(){unsubscribe?.();unsubscribe=null;playback=null;dismissed=false;floating(false);}
 function bind(){
  const current=frame.querySelector<FilmMediaElement>(':scope > video,:scope > iframe[data-youtube-player]');
  if(current===playback?.element)return;
  reset();if(!current)return;playback=connectFilmMedia(current,root);let wasPaused=playback.snapshot().paused;
  unsubscribe=playback.subscribe(()=>{const paused=playback!.snapshot().paused;if(wasPaused&&!paused)dismissed=false;wasPaused=paused;sync();});
 }
 function focusVisibleControl(){
  const controls=[...document.querySelectorAll<HTMLElement>('.pipeline-step[aria-selected=true]'),...document.querySelectorAll<HTMLElement>('button,a,summary')];
  controls.find(node=>{const b=node.getBoundingClientRect();return!surface.contains(node)&&node.checkVisibility()&&b.top>=0&&b.bottom<=innerHeight&&b.height>0;})?.focus({preventScroll:true});
 }
 function dismiss(){dismissed=true;playback?.pause();floating(false);focusVisibleControl();}
 close.addEventListener('click',dismiss);
 toggle.addEventListener('click',()=>{if(!playback)return;if(playback.snapshot().paused){dismissed=false;playback.play();}else playback.pause();});
 back.addEventListener('click',()=>{floating(false);anchor.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});playback?.element.focus({preventScroll:true});});
 root.addEventListener('portfolio:film-reset',reset);
 new MutationObserver(bind).observe(frame,{childList:true});
 new IntersectionObserver(sync,{threshold:[0,1]}).observe(anchor);
 new ResizeObserver(()=>{if(mini.isOn())reserveSpace();}).observe(surface);
 const viewportChanged=()=>{cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(()=>{windowControl.refresh();reserveSpace();sync();});};
 window.addEventListener('resize',viewportChanged);window.visualViewport?.addEventListener('resize',viewportChanged);
 document.addEventListener('visibilitychange',sync);document.addEventListener('fullscreenchange',sync);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mini.isOn()&&!document.querySelector('dialog[open]')){event.preventDefault();dismiss();}});
 document.addEventListener('focusin',event=>{
  if(!mini.isOn()||!(event.target instanceof HTMLElement)||surface.contains(event.target)||!event.target.matches(':focus-visible'))return;
  const a=event.target.getBoundingClientRect(),b=surface.getBoundingClientRect();
  if(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top))windowControl.avoid(a);
 });
 function otherPlayback(element:unknown){if(playback&&element!==playback.element){dismissed=true;playback.pause();floating(false);}}
 document.addEventListener('play',event=>{if(event.target instanceof HTMLVideoElement&&!event.target.matches('[data-pv-ambient]'))otherPlayback(event.target);},true);
 document.addEventListener('portfolio:film-media-play',event=>otherPlayback((event as CustomEvent<{element:FilmMediaElement}>).detail?.element));
 window.addEventListener('pagehide',()=>{playback?.pause();floating(false);});bind();
}