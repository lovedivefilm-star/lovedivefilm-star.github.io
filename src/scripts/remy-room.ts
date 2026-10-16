import { destroyFilmMedia, pauseFilmMedia, type FilmMediaElement } from './youtube-player';
// A grouped room keeps one viewing surface and direct work selection.
const room = document.querySelector<HTMLElement>('[data-technical-room]');
if (room) {
  const panels = Array.from(room.querySelectorAll<HTMLElement>('[data-tool-panel]'));
  const links = Array.from(room.querySelectorAll<HTMLAnchorElement>('[data-tool-select]'));
  const show = (key:string,update=false) => {
    const selected=panels.some(panel=>panel.dataset.toolPanel===key)?key:panels[0]?.dataset.toolPanel;
    panels.forEach(panel=>{const active=panel.dataset.toolPanel===selected;if(!active){panel.querySelectorAll<FilmMediaElement>('iframe,video').forEach(media=>{destroyFilmMedia(media);if(media instanceof HTMLVideoElement)media.pause();media.remove();});const poster=panel.querySelector<HTMLButtonElement>('.film-poster');if(poster)poster.hidden=false;}panel.hidden=!active;});
    document.querySelectorAll<HTMLAnchorElement>('[data-room-return]').forEach(link=>{link.href='/?work=technical&item='+encodeURIComponent(selected??'kinetic');});
    links.forEach(link=>{if(link.dataset.toolSelect===selected)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});
    if(update){const url=new URL(location.href);url.hash='';url.searchParams.set('work',selected??'kinetic');history.replaceState(history.state,'',url);}
  };
  const fromUrl=()=>new URLSearchParams(location.search).get('work')??location.hash.slice(1);
  show(fromUrl());
  links.forEach(link=>link.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();show(link.dataset.toolSelect??'',true);}));
  window.addEventListener('hashchange',()=>show(fromUrl()));
  window.addEventListener('popstate',()=>show(fromUrl()));
}
function capNativeMedia(){
  const density=Math.max(1,window.devicePixelRatio||1);
  room?.style.setProperty('--technical-cap',1280/density+'px');
  document.querySelectorAll<HTMLImageElement|HTMLVideoElement>('[data-native-cap]').forEach(media=>{const width=media instanceof HTMLImageElement?media.naturalWidth:media.videoWidth;if(width>0)media.style.setProperty('--native-cap',width/density+'px');});
  document.querySelectorAll<HTMLImageElement>('.film-poster img').forEach(image=>{if(image.naturalWidth>0)image.closest<HTMLElement>('.film-player')?.style.setProperty('--poster-cap',image.naturalWidth/density+'px');});
  document.querySelectorAll<HTMLVideoElement>('.film-frame>video').forEach(video=>{if(video.videoWidth>0)video.closest<HTMLElement>('.film-player')?.style.setProperty('--poster-cap',video.videoWidth/density+'px');});
}
document.querySelectorAll<HTMLImageElement>('img').forEach(image=>{if(!image.complete)image.addEventListener('load',capNativeMedia,{once:true});});
document.querySelectorAll<HTMLVideoElement>('[data-native-cap]').forEach(video=>video.addEventListener('loadedmetadata',capNativeMedia));
document.addEventListener('loadedmetadata',capNativeMedia,true);
window.addEventListener('resize',capNativeMedia);capNativeMedia();
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseFilmMedia();document.querySelectorAll<HTMLVideoElement>('video').forEach(video=>video.pause());}});
window.addEventListener('pagehide',()=>document.querySelectorAll<HTMLVideoElement>('video').forEach(video=>video.pause()));
export {};
