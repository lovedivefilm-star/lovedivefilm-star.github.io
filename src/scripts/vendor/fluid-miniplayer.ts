/*!
 * Adapted from Fluid Player v3.60.0, src/modules/miniplayer.js, lines123–176,193–200,338–354.
 * Commit026a61c8be3a58a5a0d38af5ca2fd4ff65ac1811.
 * Copyright(c)2020 Fluid Player and contributors. MIT license: /licenses/fluid-player-MIT.txt.
 * Kept: same-wrapper fixed mode, captured size, real placeholder, restoration.
 * Adapted: our DOM/classes/CSS-native ratios; responsive placeholder; no ad/display-mode dependencies.
 */
export function fluidMiniPlayer(root:HTMLElement, videoWrapper:HTMLElement) {
  const FLUID_PLAYER_WRAPPER_CLASS='is-film-floating';
  let originalWidth:number|null=null,originalHeight:number|null=null;
  let placeholderElement:HTMLDivElement|null=null;
  function extractSizeFromElement(element:HTMLElement,styleProperty:'width'|'height',htmlProperty:'clientWidth'|'clientHeight'){
    if(element.style[styleProperty]&&element.style[styleProperty].match('px'))return parseFloat(element.style[styleProperty]);
    return element[htmlProperty];
  }
  function createPlayerPlaceholder(placeholderWidth:number,placeholderHeight:number){
    placeholderElement=document.createElement('div');
    placeholderElement.classList.add('fluidplayer-miniplayer-player-placeholder');
    placeholderElement.style.height=`${placeholderHeight}px`;
    placeholderElement.style.width=`${placeholderWidth}px`;
    placeholderElement.setAttribute('aria-hidden','true');
    videoWrapper.parentElement!.insertBefore(placeholderElement,videoWrapper);
  }
  function removePlayerPlaceholder(){placeholderElement?.remove();placeholderElement=null;videoWrapper.parentElement!.style.removeProperty('height');}
  function toggleMiniPlayerOn(){
    if(root.classList.contains(FLUID_PLAYER_WRAPPER_CLASS))return;
    originalWidth=extractSizeFromElement(videoWrapper,'width','clientWidth');
    originalHeight=extractSizeFromElement(videoWrapper,'height','clientHeight');
    root.classList.add(FLUID_PLAYER_WRAPPER_CLASS);
    createPlayerPlaceholder(originalWidth,originalHeight);
  }
  function toggleMiniPlayerOff(){
    removePlayerPlaceholder();root.classList.remove(FLUID_PLAYER_WRAPPER_CLASS);
    originalWidth=null;originalHeight=null;
  }
  // Fluid's captured pixel placeholder is refreshed for responsive window rotation.
  function refresh(){
    if(!placeholderElement)return;
    const anchor=videoWrapper.parentElement!,style=getComputedStyle(anchor);
    const [x,y]=style.aspectRatio.split('/').map(Number),ratio=x/(y||1);
    const width=anchor.clientWidth,maxHeight=parseFloat(style.maxHeight);
    const height=Math.min(width/ratio,Number.isFinite(maxHeight)?maxHeight:Infinity);
    placeholderElement.style.width=width+'px';placeholderElement.style.height=height+'px';anchor.style.height=height+'px';
  }
  return{on:toggleMiniPlayerOn,off:toggleMiniPlayerOff,refresh,isOn:()=>root.classList.contains(FLUID_PLAYER_WRAPPER_CLASS)};
}
