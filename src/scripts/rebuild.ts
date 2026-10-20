import { createYouTubeFrame, connectFilmMedia, pauseFilmMedia, destroyFilmMedia, type FilmMediaElement } from './youtube-player';
// Interaction serves choosing, watching and inspecting the work.
const dialog = document.querySelector<HTMLDialogElement>('[data-media-dialog]');
const stage = dialog?.querySelector<HTMLElement>('[data-media-stage]');
const modalTitle = dialog?.querySelector<HTMLElement>('[data-media-title]');
let returnFocus: HTMLElement | null = null;
const filmRoots = () => Array.from(document.querySelectorAll<HTMLElement>('[data-film-root]'));
function resetFilm(root: HTMLElement) {
  root.dispatchEvent(new CustomEvent('portfolio:film-reset'));
  root.querySelectorAll<FilmMediaElement>('iframe,video').forEach(media => { destroyFilmMedia(media); media.remove(); });
  const error = root.querySelector<HTMLElement>('[data-film-error]'); if(error)error.hidden=true;
  delete root.dataset.youtubeState; delete root.dataset.youtubeError;
  const poster = root.querySelector<HTMLButtonElement>('.film-poster');
  if (poster) poster.hidden = false;
}
function announceFilm() {
  pauseFilmMedia();
  document.dispatchEvent(new CustomEvent('portfolio:film-play'));
  document.querySelectorAll<HTMLVideoElement>('video:not([data-pv-ambient])').forEach(v => v.pause());
}
function makeFrame(root: HTMLElement, start = 0) {
  const local = root.dataset.localSrc;
  if (local && /^\/media\/[A-Za-z0-9_/-]+\.mp4$/.test(local)) {
    const video = document.createElement('video');
    video.src = local;
    video.controls = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'metadata';
    video.setAttribute('aria-label', `${root.dataset.videoTitle || '작품'} 풀영상`);
    if(start>0)video.currentTime=start;
    return video;
  }
  const id = root.dataset.youtubeId || '';
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return createYouTubeFrame({ id, title: `${root.dataset.videoTitle || '작품'} 풀영상`, start });
}
function expandFilmInline(root:HTMLElement,expanded:boolean,align=true){
  const surface=root.querySelector<HTMLElement>('[data-film-surface]')!;
  const before=surface.getBoundingClientRect();const changed=root.classList.contains('is-film-expanded')!==expanded;
  root.classList.toggle('is-film-expanded',expanded);
  const control=root.querySelector<HTMLButtonElement>('[data-film-large]');
  if(control){control.textContent=expanded?'작게 보기':'크게 보기';control.setAttribute('aria-expanded',String(expanded));control.setAttribute('aria-label',`${root.dataset.videoTitle||'작품'} 영상 ${expanded?'작게':'크게'} 보기`);}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(changed&&!reduced&&!root.classList.contains('is-film-floating')){
    const after=surface.getBoundingClientRect();surface.getAnimations().forEach(animation=>animation.cancel());
    surface.animate([{transform:`scale(${before.width/after.width},${before.height/after.height})`},{transform:'none'}],{duration:280,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  if(align&&changed)requestAnimationFrame(()=>root.scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'}));
}
function playFilm(root: HTMLElement, start = Number(root.dataset.start || 0)) {
  filmRoots().forEach(resetFilm);
  announceFilm();
  if(root.dataset.ratio==='9:16')expandFilmInline(root,true);
  const frame = makeFrame(root,start);
  if (!frame) return;
  const poster = root.querySelector<HTMLButtonElement>('.film-poster');
  if (poster) poster.hidden = true;
  root.querySelector('[data-film-frame]')?.append(frame);
  connectFilmMedia(frame,root).play();
}
function resetStage() {
  stage?.querySelectorAll<FilmMediaElement>('iframe,video').forEach(media => { destroyFilmMedia(media); media.remove(); });
  stage?.replaceChildren();
}
// API state changes include playback initiated inside YouTube's own controls.
document.addEventListener('portfolio:film-media-play', event => {
  const element = (event as CustomEvent<{element:FilmMediaElement}>).detail?.element;
  if (!(element instanceof HTMLVideoElement || element instanceof HTMLIFrameElement)) return;
  pauseFilmMedia(element);
  document.dispatchEvent(new CustomEvent('portfolio:film-play'));
  document.querySelectorAll<HTMLVideoElement>('video:not([data-pv-ambient])').forEach(video => { if(video!==element)video.pause(); });
});
// A process clip takes over the full player, including an API request still loading.
document.addEventListener('play', event => {
  const video=event.target;
  if(!(video instanceof HTMLVideoElement)||video.matches('[data-pv-ambient]'))return; // muted loops never stop the film
  if(video.matches('[data-process-video],[data-pipeline-video]')){filmRoots().forEach(resetFilm);resetStage();}
  pauseFilmMedia(video);
},true);
function openModal(title:string, opener:HTMLElement) {
  if (!dialog || !stage || !modalTitle) return false;
  returnFocus = opener;
  resetStage();
  modalTitle.textContent = title;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector<HTMLButtonElement>('[data-media-close]')?.focus({preventScroll:true});
  return true;
}
dialog?.querySelector('[data-media-close]')?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('click', event => {if (event.target === dialog) {const r=dialog.getBoundingClientRect(); const e=event as MouseEvent;if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog?.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || !dialog.open) return;
  const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], iframe, video[controls], [tabindex]:not([tabindex="-1"])')).filter(node => node.checkVisibility());
  const first = controls[0], last = controls[controls.length - 1];
  if (!first) { event.preventDefault(); return; }
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !dialog.contains(active))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (active === last || !dialog.contains(active))) { event.preventDefault(); first.focus(); }
});
dialog?.addEventListener('close', () => { resetStage(); stage?.removeAttribute('data-ratio'); delete dialog.dataset.native; returnFocus?.focus({preventScroll:true}); returnFocus = null; });

document.addEventListener('click', async event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const seek = target.closest<HTMLElement>('[data-process-seek], [data-choice-seek]');
  if(seek){const video=seek.closest('[data-evidence-panel]')?.querySelector<HTMLVideoElement>('[data-process-video]');if(video){video.currentTime=Math.max(0,Number(seek.dataset.processSeek??seek.dataset.choiceSeek??0)-Number(video.dataset.sceneStart||0));video.scrollIntoView({block:'nearest',behavior:'auto'});void video.play().catch(()=>{});}return;}
  const play = target.closest<HTMLElement>('[data-film-play]');
  if (play) {const root=play.closest<HTMLElement>('[data-film-root]');if(root)playFilm(root);return;}
  const jump = target.closest<HTMLElement>('[data-film-start]');
  if(jump){const root=document.querySelector<HTMLElement>('[data-full-film] [data-film-root]');if(root){playFilm(root,Number(jump.dataset.filmStart||0));root.scrollIntoView({block:'center',behavior:'auto'});}return;}
  const large = target.closest<HTMLElement>('[data-film-large]');
  if(large){const root=large.closest<HTMLElement>('[data-film-root]');if(root)expandFilmInline(root,!root.classList.contains('is-film-expanded'));return;}
  const image = target.closest<HTMLElement>('[data-enlarge-src]');
  if(image){filmRoots().forEach(resetFilm);announceFilm();if(openModal(image.dataset.enlargeTitle||image.dataset.enlargeAlt||'제작 자료',image)){const img=document.createElement('img');img.src=image.dataset.enlargeSrc!;img.alt=image.dataset.enlargeAlt||'제작 자료';
    // Tool screens open at their captured size (1:1) and scroll, so track names stay readable.
    if(image.hasAttribute('data-enlarge-native'))dialog!.dataset.native='';else delete dialog!.dataset.native;
    stage!.append(img);}return;}
  const copy=target.closest<HTMLElement>('[data-copy]');
  if(copy){const status=document.querySelector<HTMLElement>('[data-copy-status]');const label=copy.querySelector<HTMLElement>('[data-copy-label]');try{await navigator.clipboard.writeText(copy.dataset.copy||'');if(label)label.textContent='복사됨';if(status)status.textContent='메일 주소를 복사했어요.';window.setTimeout(()=>{if(label)label.textContent='주소 복사';},2000);}catch{if(status)status.textContent='메일 주소를 길게 눌러 복사해 주세요.';}return;}
});

const viewButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-view-choice]'));
function setView(view:string, updateUrl=false){const index=view==='index';document.querySelectorAll<HTMLElement>('[data-work-view]').forEach(el=>el.hidden=el.dataset.workView!==(index?'index':'previews'));viewButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.viewChoice===(index?'index':'previews'))));try{sessionStorage.setItem('portfolio-work-view',index?'index':'previews');}catch{}if(updateUrl){const url=new URL(location.href);if(index)url.searchParams.set('view','index');else url.searchParams.delete('view');history.replaceState(history.state,'',url);}}
if(viewButtons.length){let remembered='previews';try{remembered=sessionStorage.getItem('portfolio-work-view')||'previews';}catch{}setView(new URLSearchParams(location.search).get('view')||remembered);viewButtons.forEach(button=>button.addEventListener('click',()=>setView(button.dataset.viewChoice||'previews',true)));window.addEventListener('popstate',()=>setView(new URLSearchParams(location.search).get('view')||'previews'));}

window.addEventListener('pagehide',()=>{filmRoots().forEach(resetFilm);resetStage();});

const preview=document.querySelector<HTMLVideoElement>('[data-preview-video]');
const previewToggle=document.querySelector<HTMLButtonElement>('[data-preview-toggle]');
if(preview&&previewToggle){let userPaused=false;let visible=false;let filmPlaying=false;const reduce=matchMedia('(prefers-reduced-motion: reduce)');function sync(){if(preview&&visible&&!userPaused&&!document.hidden&&!filmPlaying&&!reduce.matches){preview.play().then(()=>{if(previewToggle)previewToggle.textContent='미리보기 멈춤';}).catch(()=>{});}else{preview?.pause();if(previewToggle)previewToggle.textContent='미리보기 재생';}}previewToggle.hidden=false;previewToggle.addEventListener('click',()=>{if(preview.paused){userPaused=false;filmPlaying=false;preview.play().catch(()=>{});previewToggle.textContent='미리보기 멈춤';}else{userPaused=true;sync();}});new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.15}).observe(preview);document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',sync);document.addEventListener('portfolio:film-play',()=>{filmPlaying=true;sync();});}

// Watching an excerpt stops the full film, the hook and other clips. It never auto-resumes.
document.querySelectorAll<HTMLVideoElement>('[data-process-video]').forEach(video=>{
  video.addEventListener('play',()=>{
    filmRoots().forEach(resetFilm);
    document.dispatchEvent(new CustomEvent('portfolio:film-play'));
    document.querySelectorAll<HTMLVideoElement>('video:not([data-pv-ambient])').forEach(other=>{if(other!==video)other.pause();});
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)video.pause();},{threshold:0}).observe(video);
});
