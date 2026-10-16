import { fluidMiniPlayer } from './vendor/fluid-miniplayer';
import { connectFilmMedia, type FilmPlayback, type FilmMediaElement } from './youtube-player';
/** Fluid Player's same-wrapper/placeholder mode with our work-page lifecycle.
 * Both local videos and official YouTube players keep the same DOM element.
 * Visibility observes the stable anchor (fixing upstream sibling-placeholder lookup).
 */
for(const root of document.querySelectorAll<HTMLElement>('[data-film-follow]')){
  const anchor=root.querySelector<HTMLElement>('[data-film-anchor]')!;
  const surface=root.querySelector<HTMLElement>('[data-film-surface]')!;
  const frame=root.querySelector<HTMLElement>('[data-film-frame]')!;
  const bar=root.querySelector<HTMLElement>('[data-film-mini-bar]')!;
  const toggle=root.querySelector<HTMLButtonElement>('[data-film-mini-toggle]')!;
  const back=root.querySelector<HTMLButtonElement>('[data-film-mini-return]')!;
  const close=root.querySelector<HTMLButtonElement>('[data-film-mini-close]')!;
  const mini=fluidMiniPlayer(root,surface);
  let playback:FilmPlayback|null=null,unsubscribe:(()=>void)|null=null,dismissed=false;
  let scheduled=0;
  function reserveSpace(){
    if(!mini.isOn())return;
    mini.refresh();
    const box=surface.getBoundingClientRect();
    if(innerWidth<=900){document.body.style.setProperty('--film-dock-height',Math.ceil(box.height+12)+'px');document.body.style.removeProperty('--film-aside-reserve');}
    else{
      const workspace=document.querySelector('.pipeline-workspace')?.getBoundingClientRect();
      document.body.style.setProperty('--film-aside-reserve',Math.max(0,(workspace?.right??0)-box.left+24)+'px');
      document.body.style.removeProperty('--film-dock-height');
    }
  }
  function floating(on:boolean){
    if(on){mini.on();bar.hidden=false;document.body.classList.add('has-floating-film');reserveSpace();}
    else{mini.off();bar.hidden=true;document.body.classList.remove('has-floating-film');document.body.style.removeProperty('--film-dock-height');document.body.style.removeProperty('--film-aside-reserve');}
  }
  function paint(){const state=playback?.snapshot();const playing=!!state&&!state.paused&&!state.ended;toggle.textContent=playing?'멈춤':'재생';toggle.setAttribute('aria-label',playing?'풀영상 일시정지':'풀영상 재생');}
  function sync(){
    const state=playback?.snapshot();
    const past=anchor.getBoundingClientRect().bottom<=0;
    const external=!!document.pictureInPictureElement||!!document.fullscreenElement;
    const allowed=!!playback&&playback.element.isConnected&&!!state?.started&&!state.ended&&!state.error&&!state.blocked&&!dismissed&&!document.hidden&&!external;
    // Pause in the mini stays docked; an inline paused/unstarted/blocked film does not dock.
    floating(allowed&&past&&(!state!.paused||mini.isOn()));paint();
  }
  function reset(){unsubscribe?.();unsubscribe=null;playback=null;dismissed=false;floating(false);}
  function bind(){
    const current=frame.querySelector<FilmMediaElement>(':scope > video,:scope > iframe[data-youtube-player]');
    if(current===playback?.element)return;
    reset();if(!current)return;playback=connectFilmMedia(current,root);
    let wasPaused=playback.snapshot().paused;
    unsubscribe=playback.subscribe(()=>{const paused=playback!.snapshot().paused;if(wasPaused&&!paused)dismissed=false;wasPaused=paused;sync();});
  }
  function focusVisibleControl(){
    const controls=[...document.querySelectorAll<HTMLElement>('.pipeline-step[aria-selected=true]'),...document.querySelectorAll<HTMLElement>('button,a,summary')];
    const control=controls.find(node=>{const b=node.getBoundingClientRect();return!surface.contains(node)&&node.checkVisibility()&&b.top>=0&&b.bottom<=innerHeight&&b.height>0;});
    control?.focus({preventScroll:true});
  }
  function dismiss(){dismissed=true;playback?.pause();floating(false);focusVisibleControl();}
  close.addEventListener('click',dismiss);
  toggle.addEventListener('click',()=>{if(!playback)return;if(playback.snapshot().paused){dismissed=false;playback.play();}else playback.pause();});
  back.addEventListener('click',()=>{floating(false);anchor.scrollIntoView({block:'center',behavior:'auto'});playback?.element.focus({preventScroll:true});});
  root.addEventListener('portfolio:film-reset',reset);
  new MutationObserver(bind).observe(frame,{childList:true});
  new IntersectionObserver(sync,{threshold:[0,1]}).observe(anchor);
  new ResizeObserver(()=>{if(mini.isOn())reserveSpace();}).observe(surface);
  window.addEventListener('resize',()=>{cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(()=>{reserveSpace();sync();});});
  document.addEventListener('visibilitychange',sync);document.addEventListener('fullscreenchange',sync);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mini.isOn()&&!document.querySelector('dialog[open]')){event.preventDefault();dismiss();}});
  document.addEventListener('focusin',event=>{
    if(!mini.isOn()||!(event.target instanceof HTMLElement)||surface.contains(event.target)||!event.target.matches(':focus-visible'))return;
    const a=event.target.getBoundingClientRect(),b=surface.getBoundingClientRect();
    if(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top))event.target.scrollIntoView({block:'center',behavior:'auto'});
  });
  // Playback in another media source is different from pausing this mini player.
  function otherPlayback(element:unknown){if(playback&&element!==playback.element){dismissed=true;playback.pause();floating(false);}}
  document.addEventListener('play',event=>{if(event.target instanceof HTMLVideoElement)otherPlayback(event.target);},true);
  document.addEventListener('portfolio:film-media-play',event=>otherPlayback((event as CustomEvent<{element:FilmMediaElement}>).detail?.element));
  window.addEventListener('pagehide',()=>{playback?.pause();floating(false);});bind();
}
