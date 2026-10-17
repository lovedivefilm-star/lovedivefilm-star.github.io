import interact from 'interactjs';
/** Handle-only drag + an external resize handle use interact.js 1.10.28 (MIT).
 * https://interactjs.io/docs/draggable/ · https://interactjs.io/docs/resizable/
 * Pointer capture, keyboard arrows and bounded values also follow OriginKit's
 * retrieved Compare Slider interaction pattern; no React component is embedded.
 */
type Rect = { x:number; y:number; width:number; height:number };
type WindowOptions = {root:HTMLElement;surface:HTMLElement;frame:HTMLElement;bar:HTMLElement;footer:HTMLElement;onChange:()=>void};
export function createFilmWindow({root,surface,frame,bar,footer,onChange}:WindowOptions){
 const move=root.querySelector<HTMLButtonElement>('[data-film-drag]')!;
 const resize=root.querySelector<HTMLButtonElement>('[data-film-resize]')!;
 const options=root.querySelector<HTMLElement>('[data-film-window-options]')!;
 const margin=12,border=2;
 // Mobile innerWidth can temporarily include a previously wider fixed window.
 const viewWidth=()=>Math.min(innerWidth,document.documentElement.clientWidth||innerWidth);
 const viewHeight=()=>Math.min(innerHeight,document.documentElement.clientHeight||innerHeight,window.visualViewport?.height??innerHeight);
 let active=false,manual=false,box:Rect|null=null,gestureDistance=0,suppressClick=false;
 const bounded=(value:number,min:number,max:number)=>Math.min(Math.max(value,min),Math.max(min,max));
 const chrome=()=>bar.getBoundingClientRect().height+footer.getBoundingClientRect().height+border;
 const canFit=()=>viewWidth()>=226&&viewHeight()>=Math.max(300,200+chrome()+margin*2);
 function clamp(next:Rect):Rect{
  const minW=200+border,minH=200+chrome();
  const width=bounded(next.width,minW,viewWidth()-margin*2),height=bounded(next.height,minH,viewHeight()-margin*2);
  return{x:bounded(next.x,margin,viewWidth()-width-margin),y:bounded(next.y,margin,viewHeight()-height-margin),width,height};
 }
 function defaults():Rect{
  const compact=viewWidth()<=900,portrait=root.dataset.ratio==='9:16',bars=chrome();
  let height=portrait&&compact?Math.min(340,Math.max(200,viewHeight()*.48-bars)):0;
  let width=portrait?(compact?Math.min(256,Math.max(200,height*.75)):304):(compact?Math.min(360,viewWidth()-26):480);
  if(!portrait||!compact)height=portrait?width*16/9:Math.max(200,width*9/16);
  if(!compact&&height>viewHeight()*.68){height=viewHeight()*.68;width=portrait?height*9/16:height*16/9;}
  width=Math.max(200,width);height=Math.max(200,height);
  const next=clamp({x:viewWidth()-width-border-margin,y:viewHeight()-height-bars-margin,width:width+border,height:height+bars});
  next.x=viewWidth()-next.width-margin;next.y=viewHeight()-next.height-margin;return next;
 }
 function closeOptions(){options.hidden=true;move.setAttribute('aria-expanded','false');resize.setAttribute('aria-expanded','false');}
 function apply(next:Rect,user=false){
  if(!active)return;
  manual=manual||user;box=clamp(next);root.toggleAttribute('data-film-window-free',manual);
  surface.style.setProperty('--film-window-x',box.x+'px');surface.style.setProperty('--film-window-y',box.y+'px');
  surface.style.setProperty('--film-window-width',box.width+'px');surface.style.setProperty('--film-window-height',box.height+'px');
  onChange();
 }
 function preset(corner:string){
  if(!box)return;
  const next={...box,x:corner.endsWith('right')?viewWidth()-box.width-margin:margin,y:corner.startsWith('bottom')?viewHeight()-box.height-margin:margin};
  apply(next,true);closeOptions();move.focus({preventScroll:true});
 }
 function sizeBy(factor:number){
  if(!box)return;
  const bars=chrome(),mediaH=box.height-bars;
  apply({...box,width:(box.width-border)*factor+border,height:mediaH*factor+bars},true);
 }
 function reset(){manual=false;apply(defaults());closeOptions();move.focus({preventScroll:true});}
 function showOptions(){
  if(!active||!box)return;
  if(!options.hidden){closeOptions();return;}
  options.hidden=false;move.setAttribute('aria-expanded','true');resize.setAttribute('aria-expanded','true');
  const width=Math.min(280,viewWidth()-margin*2);options.style.width=width+'px';
  const h=options.offsetHeight;
  const worldLeft=bounded(box.x,margin,viewWidth()-width-margin);
  const worldTop=bounded(box.y>h+margin+8?box.y-h-8:box.y+44,margin,viewHeight()-h-margin);
  options.style.left=worldLeft-box.x+'px';options.style.top=worldTop-box.y+'px';
 }
 function started(){gestureDistance=0;closeOptions();surface.classList.add('is-manipulating');}
 function ended(){suppressClick=gestureDistance>3;surface.classList.remove('is-manipulating');}
 const drag=interact(surface).draggable({
  enabled:false,allowFrom:'[data-film-drag]',inertia:false,
  modifiers:[interact.modifiers.restrictRect({restriction:()=>({left:scrollX+margin,top:scrollY+margin,right:scrollX+viewWidth()-margin,bottom:scrollY+viewHeight()-margin}),endOnly:false})],
  listeners:{start:started,move(event){if(!box)return;gestureDistance+=Math.abs(event.dx)+Math.abs(event.dy);apply({...box,x:box.x+event.dx,y:box.y+event.dy},true);},end:ended}
 });
 const resizable=interact(frame).resizable({
  enabled:false,manualStart:true,edges:{right:true,bottom:true},inertia:false,
  modifiers:[interact.modifiers.restrictSize({min:{width:200,height:200},max:()=>({width:viewWidth()-margin*2-border,height:viewHeight()-margin*2-chrome()})})],
  listeners:{start:started,move(event){if(!box)return;gestureDistance+=Math.abs(event.dx)+Math.abs(event.dy);apply({...box,width:event.rect.width+border,height:event.rect.height+chrome()},true);},end:ended}
 });
 // External handles are supported through Interaction.start, as documented by interact.js.
 interact(resize).on('down',(event:any)=>{
  if(!active)return;
  event.preventDefault();event.interaction.start({name:'resize',edges:{right:true,bottom:true}},resizable,frame);
 });
 for(const handle of [move,resize]){
  handle.addEventListener('pointerdown',event=>{if(active&&event.button===0){suppressClick=false;handle.setPointerCapture(event.pointerId);}});
  handle.addEventListener('pointercancel',()=>{ended();suppressClick=false;});
  handle.addEventListener('click',event=>{if(suppressClick){event.preventDefault();suppressClick=false;return;}showOptions();});
 }
 move.addEventListener('keydown',event=>{
  if(!active||!box||!event.key.startsWith('Arrow'))return;event.preventDefault();const step=event.shiftKey?48:16;
  apply({...box,x:box.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),y:box.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0)},true);
 });
 resize.addEventListener('keydown',event=>{
  if(!active||!event.key.startsWith('Arrow'))return;event.preventDefault();sizeBy(['ArrowRight','ArrowDown'].includes(event.key)?1.08:1/1.08);
 });
 root.querySelectorAll<HTMLButtonElement>('[data-film-position]').forEach(button=>button.addEventListener('click',()=>preset(button.dataset.filmPosition!)));
 root.querySelectorAll<HTMLButtonElement>('[data-film-size]').forEach(button=>button.addEventListener('click',()=>sizeBy(Number(button.dataset.filmSize)>0?1.16:1/1.16)));
 root.querySelector('[data-film-window-reset]')?.addEventListener('click',reset);
 document.addEventListener('pointerdown',event=>{if(!options.hidden&&event.target instanceof Node&&!options.contains(event.target)&&!move.contains(event.target)&&!resize.contains(event.target))closeOptions();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!options.hidden){event.preventDefault();event.stopImmediatePropagation();closeOptions();move.focus({preventScroll:true});}},true);
 function avoid(rect:DOMRect){
  if(!box)return;
  const overlap=(candidate:Rect)=>Math.max(0,Math.min(candidate.x+candidate.width,rect.right)-Math.max(candidate.x,rect.left))*Math.max(0,Math.min(candidate.y+candidate.height,rect.bottom)-Math.max(candidate.y,rect.top));
  if(overlap(box)===0)return;
  const candidates=['top-left','top-right','bottom-left','bottom-right'].map(corner=>({...box!,x:corner.endsWith('right')?viewWidth()-box!.width-margin:margin,y:corner.startsWith('bottom')?viewHeight()-box!.height-margin:margin}));
  const best=candidates.sort((a,b)=>overlap(a)-overlap(b))[0];if(overlap(best)<overlap(box))apply(best,true);
 }
 return{
  canFit,
  show(){if(active)return;active=true;surface.getAnimations().forEach(animation=>animation.cancel());drag.draggable({enabled:true});resizable.resizable({enabled:true});apply(box??defaults());},
  hide(){if(!active)return;active=false;closeOptions();surface.classList.remove('is-manipulating');drag.draggable({enabled:false});resizable.resizable({enabled:false});},
  refresh(){if(active&&box){closeOptions();apply(manual?box:defaults());}},
  isManual:()=>manual,
  avoid,
 };
}