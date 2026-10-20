import { CASE_STUDIES } from './case-studies';
import { applyEdits } from './edits';
import type { PageLine } from './pages';

export type PipelineImage = { src:string; w:number; h:number; alt:string; caption:string };
/** A real editing-tool screen (Premiere / After Effects) captured from a working copy of the
 *  project, shown as-is. `title` + `body` explain how to read it in plain words. */
export type PipelineScreen = { label:string; src:string; w:number; h:number; alt:string; title:string; body:string };
/** 02 · 03 material views, one shown at a time (toggle buttons). Every image is a real file from the
 *  work's folders (sheet, still, storyboard, previz) or a frame of the final film / generated take. */
type Pic = { src:string; w:number; h:number; alt:string };
type Named = Pic & { name:string; note?:string; thumb?:string };
type ViewText = { label:string; title?:string; body?:string };
export type PipelineView = ViewText & (
  | { kind:'row'; items:Named[] }
  | { kind:'grid'; items:Named[]; extra?:{ items:Named[]; note:string } }
  | { kind:'process'; items:{ name:string; before:Pic; crop:[number,number,number,number]; arrow:string; after:Pic }[] }
  | { kind:'beats'; items:(Pic & { no:string; time:string; place:string; action:string })[] }
  | { kind:'wipe'; before:Named; after:Named }
  | { kind:'duo'; left:{ src:string; poster:string; name:string; alt:string }; right:{ src:string; poster:string; name:string; alt:string }; cuts:{ t:number; end:number; name:string; note:string }[] }
  | { kind:'pair'; plan:Pic; result:Pic; heading:string; when:string; rows:{ term:string; text:string; strong?:boolean }[] }
);
export type PipelineStep = {
  key:'script'|'sheet'|'segment'|'generate'|'edit'; label:string; decision:string;
  thumbnail?:{src:string;w:number;h:number}; note?:string;
  script?:{label:string;lines:PageLine[];focus:number[]}; images?:PipelineImage[];
  sequence?:{title:string;items:{label:string;detail:string}[];focus?:number;connection?:string};
  segmentLabel?:string; segmentUnit?:string; segments?:{cut:string;size:string;action:string}[];
  generated?:{src:string;poster:string;w:number;h:number;label:string;note?:string};
  guide?:{src:string;poster:string;w:number;h:number;label:string};
  screens?:PipelineScreen[];
  views?:PipelineView[];
};
export type ProductionPipelineData = {slug:string;title:string;role:string;steps:PipelineStep[]};

function scriptExcerpt(slug:string):NonNullable<PipelineStep['script']>{
  const study=CASE_STUDIES[slug];
  if(slug==='butter'){
    const indexes=study.script.lines.map((_,i)=>i).filter(i=>i!==0&&i!==13);
    return {label:study.script.label,lines:indexes.map(i=>({...study.script.lines[i]})),focus:indexes.map((sourceIndex,i)=>study.script.focus.includes(sourceIndex)?i:-1).filter(i=>i>=0)};
  }
  const panel=study.panels[0];
  const start=panel.contextStart;
  const preceding=study.script.lines.slice(0,start+1).reverse().find(line=>line.t==='scene');
  const prepend=study.script.lines[start]?.t!=='scene'&&preceding?[preceding]:[];
  const lines=[...prepend,...study.script.lines.slice(start,panel.contextEnd)].map(line=>({...line,s:applyEdits(slug,line.s)}));
  return {label:study.script.label,lines,focus:lines.map((_,index)=>index).filter(index=>(panel.focus??study.script.focus).includes(index-prepend.length+start))};
}

// Public facts only. The source audit, paths, prompts and project IDs stay private.
export const PRODUCTION_PIPELINES:Record<string,ProductionPipelineData>={
  oneandonly:{
    slug:'oneandonly',title:'신분에서 얼굴 공개까지',role:'대본·장면 연출 방향 김영건 · 생성·편집 팀 공동',
    steps:[
      {key:'script',label:'대본',decision:'얼굴을 숨긴 등장 → 신분을 알아보는 반응 → 얼굴 공개.',
       thumbnail:{src:'/media/process/oneandonly/oo_02_1.jpg',w:1132,h:1600},script:scriptExcerpt('oneandonly')},
      {key:'sheet',label:'인물·장소',decision:'인물과 장소를 시트로 고정하고, 한 번의 생성에 14장을 함께 넣었습니다.',
       thumbnail:{src:'/media/process/oneandonly/sheet_jangot_t.jpg',w:480,h:271},
       views:[
         {label:'정경부인',kind:'row',
          title:'정경부인 · 얼굴을 숨길 때와 드러낼 때, 시트를 나눔',
          body:'얼굴을 감춘 채 등장하는 컷에는 장옷 시트를, 얼굴이 드러나는 컷에는 한복 시트를 넣었습니다. 장옷 시트는 클로즈업 칸까지 두 손으로 얼굴을 가린 모습이라, 등장 내내 얼굴이 새지 않게 합니다.',
          items:[
            {src:'/media/process/oneandonly/sheet_jangot.jpg',w:1800,h:1016,alt:'정경부인 장옷 시트. 장옷을 쓴 전신, 뒷모습, 두 손으로 얼굴을 가린 클로즈업.',name:'장옷',note:'얼굴을 가린 등장용'},
            {src:'/media/process/oneandonly/sheet_hanbok.jpg',w:1360,h:768,alt:'정경부인 한복 시트. 앞, 뒤(쪽머리 · 비녀), 얼굴 클로즈업.',name:'한복',note:'얼굴이 드러나는 컷용'},
          ]},
         {label:'장소 · 해 질 녘 산길',kind:'row',
          title:'장소 · 가마가 멈추는 해 질 녘 산길 — 같은 길을 두 방향에서',
          body:'바위벽 쪽과 낭떠러지 쪽, 두 방향의 장소판을 만들어 컷의 방향에 맞게 넣었습니다. 장소를 배경으로 통째로 박지 않고 「장소를 이해시켜」 카메라가 그 안에서 자유롭게 움직이게 했습니다. 두 판은 해의 방향을 맞춘 짝이라, 등장의 역광과 얼굴 공개의 빛이 같은 해에서 옵니다.',
          items:[
            {src:'/media/process/oneandonly/sheet_loc_cliff.jpg',w:1672,h:941,alt:'해 질 녘 산길, 낭떠러지 쪽을 본 판. 소나무 줄기와 골짜기, 해가 왼쪽.',name:'낭떠러지 쪽',note:'등장 · 신분 컷에 넣음'},
            {src:'/media/process/oneandonly/sheet_loc_3600k.jpg',w:1800,h:1013,alt:'해 질 녘 산길, 바위벽 쪽을 본 판. 흙길이 내리막으로 멀어지고 해가 소나무 뒤 오른쪽.',name:'바위벽 쪽',note:'얼굴 공개 컷에 넣음'},
          ]},
         {label:'한 번에 넣은 14장',kind:'grid',
          title:'등장 · 신분 확인 컷을 뽑은 한 번의 생성에 넣은 14장',
          body:'인물 · 말 · 가마 · 소품 시트 9장, 장소판 1장, 윤곽선 4장(+ 장군 목소리). 시트로 「누가 · 무엇이」를, 장소판으로 「어디서」를, 윤곽선으로 「화면 어디에」를 나눠 맡겼습니다.',
          items:[
            {src:'/media/process/oneandonly/sheet_jangot.jpg',thumb:'/media/process/oneandonly/sheet_jangot_t.jpg',w:1800,h:1016,alt:'장옷 시트',name:'정경부인 · 장옷'},
            {src:'/media/process/oneandonly/sheet_hanbok.jpg',thumb:'/media/process/oneandonly/sheet_hanbok_t.jpg',w:1360,h:768,alt:'한복 시트',name:'정경부인 · 한복'},
            {src:'/media/process/oneandonly/sheet_general.jpg',thumb:'/media/process/oneandonly/sheet_general_t.jpg',w:1800,h:1016,alt:'장수 시트',name:'장수'},
            {src:'/media/process/oneandonly/sheet_general_wear.jpg',thumb:'/media/process/oneandonly/sheet_general_wear_t.jpg',w:1800,h:1018,alt:'장수 복장 시트',name:'장수 · 복장'},
            {src:'/media/process/oneandonly/sheet_horse.jpg',thumb:'/media/process/oneandonly/sheet_horse_t.jpg',w:1800,h:1018,alt:'장수의 말 시트',name:'장수의 말'},
            {src:'/media/process/oneandonly/sheet_crew.jpg',thumb:'/media/process/oneandonly/sheet_crew_t.jpg',w:1800,h:766,alt:'포졸 무리 시트',name:'포졸 8인'},
            {src:'/media/process/oneandonly/sheet_bow.jpg',thumb:'/media/process/oneandonly/sheet_bow_t.jpg',w:1672,h:941,alt:'활 시트',name:'활'},
            {src:'/media/process/oneandonly/sheet_gama.jpg',thumb:'/media/process/oneandonly/sheet_gama_t.jpg',w:1800,h:1013,alt:'가마 외형 시트',name:'가마 · 외형'},
            {src:'/media/process/oneandonly/sheet_gama_door.jpg',thumb:'/media/process/oneandonly/sheet_gama_door_t.jpg',w:1672,h:941,alt:'가마 문 시트',name:'가마 · 문'},
            {src:'/media/process/oneandonly/sheet_loc_cliff.jpg',thumb:'/media/process/oneandonly/sheet_loc_cliff_t.jpg',w:1672,h:941,alt:'장소판 낭떠러지 쪽',name:'장소 · 낭떠러지 쪽'},
          ],
          extra:{note:'윤곽선 4장 — 컷의 처음과 끝에 누가 화면 어디에 서는지만 그린 선 그림. 콘티 대신 생성에 직접 넣었습니다.',items:[
            {src:'/media/process/oneandonly/plan_map_d1_start.jpg',thumb:'/media/process/oneandonly/plan_map_d1_start_t.jpg',w:720,h:1280,alt:'윤곽선 · 등장 처음',name:'등장 · 처음'},
            {src:'/media/process/oneandonly/plan_map_d1_end.jpg',thumb:'/media/process/oneandonly/plan_map_d1_end_t.jpg',w:720,h:1280,alt:'윤곽선 · 등장 끝',name:'등장 · 끝'},
            {src:'/media/process/oneandonly/plan_map_d3e1_start.jpg',thumb:'/media/process/oneandonly/plan_map_d3e1_start_t.jpg',w:720,h:1280,alt:'윤곽선 · 신분 처음',name:'신분 · 처음'},
            {src:'/media/process/oneandonly/plan_map_d3e1_end.jpg',thumb:'/media/process/oneandonly/plan_map_d3e1_end_t.jpg',w:720,h:1280,alt:'윤곽선 · 신분 끝',name:'신분 · 끝'},
          ]}},
       ]},
      {key:'segment',label:'장면 설계',decision:'얼굴을 숨긴 등장 → 신분 → 얼굴 → 알아보는 눈, 네 컷의 공개 순서를 콘티로 먼저 그렸습니다.',
       thumbnail:{src:'/media/process/oneandonly/plan_conti_3.jpg',w:576,h:1024},
       views:[
         {label:'① 등장',kind:'pair',heading:'① 등장',when:'완성본 2:29.6–2:35.9 · 6.3초 · 한 테이크',
          plan:{src:'/media/process/oneandonly/plan_conti_1.jpg',w:576,h:1024,alt:'콘티: 가마 옆 낮은 시점, 꽃신이 흙을 딛는다.'},
          result:{src:'/media/process/oneandonly/plan_final_1.jpg',w:720,h:1280,alt:'완성본 2:29.6. 가마 옆, 꽃신이 땅을 딛는다.'},
          rows:[
            {term:'계획',text:'가마 옆 낮은 자리에서 꽃신이 흙을 딛고, 카메라가 발에서 뒷머리까지 천천히 올라간다.',strong:true},
            {term:'왜',text:'얼굴은 ③까지 숨긴다 — 등 뒤에서 잡고, 해를 정면에 두어 역광 실루엣으로. 작가 「여기는 역광이어야 해. 빛이 중요해.」'},
            {term:'바뀐 것',text:'콘티 그림의 면사는 회의에서 장옷으로 바뀌었습니다. 발 → 뒷머리로 올라가는 한 테이크는 그대로.'},
          ]},
         {label:'② 신분 확인',kind:'pair',heading:'② 신분 확인',when:'완성본 2:35.9–2:37.2 · 1.3초',
          plan:{src:'/media/process/oneandonly/plan_conti_2.jpg',w:576,h:1024,alt:'콘티: 급히 말에서 내리는 무신.'},
          result:{src:'/media/process/oneandonly/plan_final_2.jpg',w:720,h:1280,alt:'완성본 2:36.5. 말 옆에 엎드린 장수와 포졸들, 자막 「정경부인..!」'},
          rows:[
            {term:'계획',text:'장군이 그녀를 알아보고 급히 말에서 내려 엎드린다 — 「정.. 정경부인!」',strong:true},
            {term:'왜',text:'얼굴보다 신분이 먼저. 그녀가 누구인지는 사람들의 반응으로 먼저 알리고, 얼굴은 다음 컷으로 미룹니다.'},
            {term:'바뀐 것',text:'말에서 내리는 동작은 줄이고, 장수가 이미 돌아보고 엎드린 모습에서 시작합니다(작가 「이후 씬에서는 이미 장수는 돌아보고 있던 상태여야 해」).'},
          ]},
         {label:'③ 얼굴 공개',kind:'pair',heading:'③ 얼굴 공개',when:'완성본 2:37.2–2:40.5 · 3.3초',
          plan:{src:'/media/process/oneandonly/plan_conti_3.jpg',w:576,h:1024,alt:'콘티: 약간 낮은 시점, 처음 떠오르는 옆얼굴.'},
          result:{src:'/media/process/oneandonly/plan_final_3.jpg',w:720,h:1280,alt:'완성본 2:39.4. 해 쪽으로 돌아선 정경부인의 옆얼굴.'},
          rows:[
            {term:'계획',text:'약간 낮은 시점에서, 처음으로 옆얼굴이 떠오른다.',strong:true},
            {term:'왜',text:'그녀가 빛 쪽으로 돌아서는 순간이 폭로가 되게 — 앞 컷을 해 쪽으로 고개를 조금 돌린 채 끝내고, 여기서 더 돌아 얼굴에 해가 듭니다.'},
            {term:'바뀐 것',text:'콘티 그림의 면사는 장옷 · 한복으로 바뀌었고, 옆얼굴이 해 쪽으로 떠오르는 구도는 그대로입니다.'},
          ]},
         {label:'④ 알아보는 눈',kind:'pair',heading:'④ 알아보는 눈',when:'완성본 2:40.5–2:42.9 · 2.4초',
          plan:{src:'/media/process/oneandonly/plan_conti_4.jpg',w:576,h:1024,alt:'콘티: 동공 익스트림 클로즈업.'},
          result:{src:'/media/process/oneandonly/plan_final_4.jpg',w:720,h:1280,alt:'완성본 2:41.9. 남주의 눈 클로즈업.'},
          rows:[
            {term:'계획',text:'남주의 눈을 가까이 — 동공이 커진다.',strong:true},
            {term:'왜',text:'이 장면은 대부분 옆 · 뒤에서 잡지만, 정면이 곧 사건인 컷만 예외로 둡니다. 그가 그 얼굴을 알아보는 눈에서 회상으로 바로 넘어갑니다(05의 흰 섬광).'},
            {term:'바뀐 것',text:'옆얼굴 1.3초 → 눈 1.1초, 두 컷으로 나눠 들어갔습니다.'},
          ]},
       ]},
      {key:'generate',label:'영상 생성',decision:'한복 시트를 참조해 옆얼굴 영상을 생성했습니다.',
       thumbnail:{src:'/media/process/oneandonly/pipeline_generated.jpg',w:1080,h:1920},
       generated:{src:'/media/process/oneandonly/pipeline_generated.mp4',poster:'/media/process/oneandonly/pipeline_generated.jpg',w:1080,h:1920,label:'실제 생성 소스 · 옆얼굴 4.04초',note:'설계 2초 → 생성 4.04초 → 저장된 편집에서 3.33초 사용'}},
      {key:'edit',label:'후반 작업',decision:'생성 소스를 잘라 영상·오디오 트랙에 배치했습니다.',
       thumbnail:{src:'/media/process/oneandonly/edit_thumb.jpg',w:320,h:240},
       screens:[
         {label:'전체 · 영상 편집',src:'/media/process/oneandonly/edit_cut_full.png',w:1760,h:820,
          alt:'Premiere Pro 「컷편집」 시퀀스 3분 전체. V1에 생성 클립 42개가 이어져 있고 V2·V3에 덧댄 클립, A1–A4에 소리 클립이 있다. 2:29.6–2:57.1 구간이 밝은 띠로 표시되어 있다.',
          title:'프리미어 프로 · 「컷편집」 시퀀스, 처음부터 끝까지(3분)',
          body:'가로는 시간, 가로줄 한 칸이 층 하나입니다. 위쪽 V1–V3은 화면, 아래쪽 A1–A4는 소리입니다. V1에 생성 클립 42개를 잘라 잇고, 그 위 V2·V3에 덧댈 화면을, 아래 소리 줄에 대사와 효과음을 나눠 얹었습니다. 오른쪽의 밝은 띠가 위에서 본 대본 장면(2:29.6–2:57.1)입니다.'},
         {label:'전체 · 자막과 소리',src:'/media/process/oneandonly/edit_main_full.png',w:1760,h:875,
          alt:'Premiere Pro 「메인」 시퀀스 3분 전체. V2에 자막 클립이 촘촘하고, A2–A7에 음악 · 공간 소리 · 움직임 소리 클립과 볼륨 선이 층층이 있다. 맨 아래 V1은 「컷편집」 시퀀스 한 덩어리다.',
          title:'프리미어 프로 · 「메인」 시퀀스(3분) — 편집한 영상 위에 자막과 소리를 얹은 층',
          body:'맨 아래 영상 한 줄(V1)은 첫 번째 화면의 「컷편집」을 통째로 올린 것이고, 그 위 V2의 보라색 조각들이 자막입니다. 아래 A2–A7에는 음악, 바람·숲 같은 공간의 소리, 옷자락·나무·칼이 가르는 바람 같은 움직임 소리를 줄마다 나눠 깔았고, 클립 위의 가는 선은 볼륨을 올리고 내린 자리입니다.'},
         {label:'이 장면',src:'/media/process/oneandonly/edit_cut_scene.png',w:1920,h:820,
          alt:'Premiere Pro 「컷편집」 2분 18초–3분 10초 확대. 2:43 컷 위에 흰 화면(V2)과 필름번(V3)이 겹쳐 있고, 소리 트랙 사이에 크로스페이드가 보인다. 끝에 애프터 이펙트 타이틀 클립이 있다.',
          title:'같은 「컷편집」에서 이 장면만 크게(2:18–3:10)',
          body:'2:43, 눈동자에서 회상으로 넘어가는 컷 위에 흰 화면(V2)과 필름이 타는 효과(V3)를 겹쳐 한순간 번쩍이게 했습니다. 소리 줄에서 대각선이 그어진 작은 칸은 앞뒤 소리를 서서히 섞은 자리이고, 끝의 보라색 클립은 애프터 이펙트로 만든 타이틀입니다.'},
       ]},
    ],
  },
  firstimpression:{
    slug:'firstimpression',title:'변장 해제에서 키스·문신 공개까지',role:'대본·장면 연출 방향 김영건 · 생성·편집 팀 공동',
    steps:[
      {key:'script',label:'대본',decision:'가발·외투를 벗는 인물과 키스를 S#3에 담았습니다.',
       thumbnail:{src:'/media/process/firstimpression/fi_script_1.jpg',w:1132,h:1600},script:scriptExcerpt('firstimpression')},
      {key:'sheet',label:'인물·장소',decision:'변장 전후 두 벌의 인물 시트와, 다섯 컷이 모두 일어나는 빈 복도 시트를 준비했습니다.',
       thumbnail:{src:'/media/process/firstimpression/pipeline_sheet_2.png',w:2752,h:1536},
       views:[
         {label:'선희',kind:'row',
          title:'선희 · 한 사람을 두 벌로 — 변장 시트와 본모습 시트',
          body:'이 장면은 변장을 벗는 순간이라, 변장 시트와 본모습(문신) 시트를 함께 넣어 같은 사람이 머리와 옷만 바뀌게 했습니다. 시트는 전신 앞 · 뒤와 얼굴 클로즈업 세 칸으로, 문신 위치를 뒷모습 칸에서 고정합니다.',
          items:[
            {src:'/media/process/firstimpression/pipeline_sheet_1.png',w:1679,h:937,alt:'홍선희 비서 변장 시트. 곱슬 가발과 안경, 네이비 정장.',name:'비서 변장',note:'가발 · 안경 · 정장'},
            {src:'/media/process/firstimpression/pipeline_sheet_2.png',w:2752,h:1536,alt:'홍선희 본모습 시트. 단발, 검정 나시, 팔과 등의 문신.',name:'본모습',note:'단발 · 문신'},
          ]},
         {label:'서진',kind:'row',
          title:'서진 · 재킷을 벗는 순간을 경계로 시트를 나눔',
          body:'서진은 키스하는 동안 재킷을 입고 있다가 걸어가며 벗습니다. 그래서 재킷을 벗기 전까지는 투자자 시트의 재킷을, 벗은 뒤로는 본모습 시트의 나시와 문신을 따르게 옷의 출처를 컷 중간에서 갈랐습니다.',
          items:[
            {src:'/media/process/firstimpression/pipeline_sheet_3.jpg',w:2752,h:1536,alt:'한서진 투자자 변장 시트. 크림색 정장.',name:'투자자 변장',note:'크림색 재킷'},
            {src:'/media/process/firstimpression/pipeline_sheet_4.png',w:1536,h:1024,alt:'한서진 본모습 시트. 검정 나시와 문신.',name:'본모습',note:'나시 · 문신'},
          ]},
         {label:'장소 · 은행 통로',kind:'wipe',
          title:'은행 통로 · 인물 없는 빈 복도 한 장',
          body:'다섯 컷이 모두 이 복도 안에서 일어나도록, 인물 없는 복도를 장소 시트로 넣었습니다. 시트에는 「분위기만」 맡겼습니다 — 공간이나 구도로 쓰라고 하면 그 판이 배경으로 통째로 박히고 인물이 밀려났기 때문입니다. 원본은 작품 전체의 색에 맞춰 톤을 보정해 썼습니다.',
          before:{src:'/media/process/firstimpression/sheet_corridor_src.jpg',w:1600,h:893,alt:'통로 시트 보정 전. 밝은 대리석 복도.',name:'보정 전'},
          after:{src:'/media/process/firstimpression/sheet_corridor.jpg',w:1600,h:903,alt:'통로 시트 보정 후. 작품 색에 맞춰 어둡고 차갑게.',name:'보정 후 · 생성에 넣은 판'}},
       ]},
      {key:'segment',label:'장면 설계',decision:'글로는 잡히지 않는 구도를, 블렌더 회색 가이드로 먼저 잡았습니다.',
       thumbnail:{src:'/media/process/firstimpression/plan_previz.jpg',w:720,h:1280},
       views:[
         {label:'프리비즈 · 완성본',kind:'duo',
          title:'왜 프리비즈였나',
          body:'카메라가 움직이고 인물이 셋 이상인 장면은 글만으로 구도가 잡히지 않습니다. 그래서 블렌더에 회색 상자로 인물 위치 · 카메라 · 컷 지점만 잡은 10초 가이드를 만들어 생성에 함께 넣었습니다. 연기 · 질감 · 표정은 생성 모델에 맡기고, 가이드는 구도만 쥡니다. 가이드를 빼 보자 두 사람이 걷는 방향이 반대로 바뀌어, 방향을 가이드가 혼자 쥐고 있었다는 것도 확인했습니다.',
          left:{src:'/media/process/firstimpression/plan_previz.mp4',poster:'/media/process/firstimpression/plan_previz.jpg',name:'블렌더 프리비즈',alt:'블렌더 회색 상자로 짠 구도 가이드'},
          right:{src:'/media/process/firstimpression/pipeline_generated.mp4',poster:'/media/process/firstimpression/pipeline_generated.jpg',name:'완성본 0:25.1–0:34.8',alt:'완성본 0:25.1–0:34.8'},
          cuts:[
            {t:0,end:1.5,name:'선희 · 하이앵글',note:'안경에 손 — 가이드의 구가 머리 자리'},
            {t:1.5,end:2.708,name:'바닥의 시체',note:'벗은 가발 · 재킷이 옆으로 떨어짐'},
            {t:2.708,end:5.917,name:'키스',note:'서진이 화면 왼쪽에서 들어와 겹침'},
            {t:5.917,end:7.958,name:'뒷모습 · 두 문신',note:'걸어가며 재킷을 벗고 같은 문신이 드러남'},
            {t:7.958,end:9.708,name:'옆에서 따라가기',note:'기둥을 지나며 화면 왼쪽으로 걸어 나감'},
          ]},
       ]},
      {key:'generate',label:'영상 생성',decision:'키스 뒤, 같은 문신이 함께 드러나는 생성 장면 소스입니다.',
       thumbnail:{src:'/media/process/firstimpression/pipeline_generated.jpg',w:720,h:1280},
       generated:{src:'/media/process/firstimpression/pipeline_generated.mp4',poster:'/media/process/firstimpression/pipeline_generated.jpg',w:720,h:1280,label:'생성 영상 소스 · 9.71초',note:'편집에 사용한 변환본'}},
      {key:'edit',label:'후반 작업',decision:'생성 장면과 음악·효과음을 별도 트랙에 배치했습니다.',
       thumbnail:{src:'/media/process/firstimpression/edit_thumb.jpg',w:320,h:240},
       screens:[
         {label:'전체',src:'/media/process/firstimpression/edit_s1_full.png',w:1760,h:820,
          alt:'Premiere Pro 「S1」 시퀀스 56초 전체. V1에 컷 15개, V2에 덧댄 클립, V3에 조정 레이어, A1–A3에 소리 클립. 0:25.1–0:34.8 구간이 밝은 띠로 표시되어 있다.',
          title:'프리미어 프로 · 「S1」 시퀀스, 처음부터 끝까지(56초)',
          body:'가로는 시간, 가로줄 한 칸이 층 하나입니다. 위쪽 V1에 컷 15개를 잇고, V2에 겹칠 화면을, V3에 아래 화면 전체에 효과를 거는 조정 레이어를 얹었습니다. 아래쪽 A1–A3은 대사와 효과음입니다. 가운데 밝은 띠가 위에서 본 대본 장면(0:25.1–0:34.8)입니다.'},
         {label:'이 장면',src:'/media/process/firstimpression/edit_s1_scene.png',w:1920,h:820,
          alt:'Premiere Pro 「S1」 0:14–0:45 확대. 0:24 무렵 영상이 빈 검은 구간 아래로 A2 셔터 소리가 이어지고, 0:25.1부터 0:34.8까지 이 장면의 클립 하나가 놓여 있다.',
          title:'같은 「S1」에서 이 장면만 크게(0:14–0:45)',
          body:'0:24 무렵 화면이 잠깐 까맣게 비는 동안에도 A2의 셔터 소리는 끊기지 않고 다음 컷까지 이어집니다. 그 뒤 V1의 긴 클립 하나(9.7초)에 이 장면의 다섯 컷이 모두 들어 있고, 끝에서는 차 문이 미끄러지는 소리로 다음 장면에 넘어갑니다.'},
       ]},
    ],
  },
  butter:{
    slug:'butter',title:'세계 붕괴에서 고백까지',role:'기획·대본·연출·생성·합성·편집·사운드 김영건',
    steps:[
      {key:'script',label:'대본',decision:'인물은 남고 세계가 바뀌는 붕괴에서, 둘만의 고백으로 이어집니다.',script:scriptExcerpt('butter')},
      {key:'sheet',label:'인물·장소',decision:'얼굴과 옷, 세 개의 세계, 세계가 무너지는 방식을 각각 시트로 고정했습니다.',
       thumbnail:{src:'/media/process/butter/sheet_jihyeon_cu_t.jpg',w:261,h:480},
       views:[
         {label:'지현',kind:'row',
          title:'지현 · 정본 시트 — 옷과 얼굴을 따로',
          body:'옷은 네 면에 목 위를 비워 그리고, 얼굴은 클로즈업 한 칸으로 따로 두었습니다. 장면의 샷 크기에 맞는 쪽을 골라 넣으려는 것입니다 — 전신 시트를 클로즈업에 넣으면 얼굴이 100px 남짓으로 작아져 모델이 나머지를 지어냈고, 그것이 얼굴의 AI 티의 원인이었습니다.',
          items:[
            {src:'/media/process/butter/sheet_jihyeon_wardrobe.jpg',w:1800,h:1193,alt:'지현 의상 시트. 하늘색 셔츠와 검정 바지를 앞 · 사선 · 옆 · 뒤 네 면으로, 목 위는 비워 두었다.',name:'의상 4면',note:'앞 · 사선 · 옆 · 뒤(목 위는 비움)'},
            {src:'/media/process/butter/sheet_jihyeon_cu.jpg',w:835,h:1536,alt:'지현 얼굴 클로즈업 시트 한 칸.',name:'얼굴',note:'클로즈업 한 칸'},
          ]},
         {label:'한주 · 가상 세계',kind:'row',
          title:'한주 · 가상 세계의 모습 — 얼굴이 셀 조각으로 흩어진다',
          body:'가상 세계 속 한주는 얼굴이 픽셀 조각(셀)으로 흩어져 누구인지 보이지 않습니다. 네 면에 그 흩어진 상태를 그려, 얼굴 대신 「얼굴이 가려지는 방식」을 고정했습니다. 얼굴 블러는 처음부터 「선명하게 생성한 뒤 후반에서 단계별로 덮는다」로 설계했습니다.',
          items:[
            {src:'/media/process/butter/sheet_hanju_blur.jpg',w:1800,h:1016,alt:'한주 블러 시트 4칸. 정면 얼굴은 셀 조각으로 흩어져 있고, 사선 상반신(검정 재킷 · 터틀넥), 옆, 뒤.',name:'블러 시트',note:'정면 · 사선 · 옆 · 뒤'},
          ]},
         {label:'세 세계',kind:'row',
          title:'세 세계 · 장소 원본 스틸(Midjourney)',
          body:'붕괴 장면에서 두 사람이 다투는 동안 배경이 놀이공원 → 성당 → 해변 순서로 바뀝니다. 각 세계의 원본 스틸입니다. 이 원본을 그대로 넣지 않고 가공해서 넣었는데, 그 이유는 다음 단계(03)에서 보여 드립니다.',
          items:[
            {src:'/media/process/butter/sheet_world_park.jpg',w:1680,h:720,alt:'놀이공원 원본 스틸. 관람차와 크림색 지붕, 한낮의 해.',name:'① 놀이공원'},
            {src:'/media/process/butter/sheet_world_cathedral.jpg',w:1456,h:816,alt:'성당 원본 스틸. 촛불이 양쪽으로 늘어선 긴 통로 끝에 석상.',name:'② 성당'},
            {src:'/media/process/butter/sheet_world_sea.jpg',w:1456,h:816,alt:'해변 원본 스틸. 버터처럼 녹아 흐르는 금빛 물결과 공중에 뜬 프라이팬.',name:'③ 해변'},
          ]},
         {label:'무너지는 방식',kind:'row',
          title:'무너지는 방식 · 상태 시트 — 세계는 「렌더가 풀리듯」 무너진다',
          body:'이 작품의 가상 세계는 폭발하거나 부서지지 않고, 렌더가 덜 된 그물망 → 셀 조각 → 떨어져 나가는 셀 → 녹아내림 순서로 풀립니다. 그 단계를 한 장에 그려 기준으로 삼았고, 한주의 얼굴을 덮는 셀 조각도 같은 어휘입니다.',
          items:[
            {src:'/media/process/butter/sheet_state.jpg',w:1800,h:1018,alt:'상태 시트. 1 미렌더 곡면, 2 미렌더 모서리, 3 셀 필드 굵게, 4 셀 필드 잘게, 5 떨어져 나가는 셀, 6 녹아내림 단계.',name:'상태 시트',note:'미렌더 곡면 · 모서리 → 셀 필드 → 떨어지는 셀 → 녹아내림'},
          ]},
       ]},
      {key:'segment',label:'장면 설계',decision:'세계 붕괴 15초를 한 번에 생성했습니다 — 무엇을 넣었고, 왜 가공했고, 결과가 계획과 얼마나 맞았는지.',
       thumbnail:{src:'/media/process/butter/plan_world_cathedral_far_t.jpg',w:480,h:243},
       views:[
         {label:'넣은 참조 8장',kind:'grid',
          title:'이 15초 한 번의 생성에 넣은 참조 8장 — 얼굴은 시트, 빛은 장면 프레임',
          body:'얼굴은 정본 시트에서 가져왔지만, 빛(칠흑 속 조명 하나)은 시트가 아니라 앞 장면의 실제 프레임에서 잘라 넣었습니다. 회색 스튜디오 배경의 시트를 이 검은 무대 장면에 걸었더니 결과가 「하이라이트 영상이 아니라 증명사진」처럼 나왔기 때문입니다. 시트에는 생김새를, 장면 프레임에는 빛을 맡겼습니다.',
          items:[
            {src:'/media/process/butter/sheet_jihyeon_cu.jpg',thumb:'/media/process/butter/sheet_jihyeon_cu_t.jpg',w:835,h:1536,alt:'지현 얼굴 시트 클로즈업',name:'① 지현 얼굴',note:'정본 시트의 클로즈업'},
            {src:'/media/process/butter/plan_jihyeon_light.jpg',thumb:'/media/process/butter/plan_jihyeon_light_t.jpg',w:1024,h:1212,alt:'어둠 속 지현 옆모습. 앞 장면 프레임에서 자른 빛 참조.',name:'② 지현 · 빛',note:'앞 장면 프레임에서 자름'},
            {src:'/media/process/butter/plan_hanju_cellface.jpg',thumb:'/media/process/butter/plan_hanju_cellface_t.jpg',w:1024,h:1182,alt:'셀 조각으로 덮인 한주 얼굴.',name:'③ 한주 얼굴',note:'얼굴 전체가 셀 조각'},
            {src:'/media/process/butter/plan_hanju_light.jpg',thumb:'/media/process/butter/plan_hanju_light_t.jpg',w:1024,h:1356,alt:'어둠 속 한주 옆모습과 재킷. 앞 장면 프레임에서 자른 빛 참조.',name:'④ 한주 · 재킷과 빛',note:'앞 장면 프레임'},
            {src:'/media/process/butter/plan_mesh.jpg',thumb:'/media/process/butter/plan_mesh_t.jpg',w:443,h:564,alt:'회색 구에 그물망 선이 그려진 미렌더 곡면 요소.',name:'⑤ 미렌더 그물망',note:'세계가 지어지는 결'},
            {src:'/media/process/butter/plan_world_park_far.jpg',thumb:'/media/process/butter/plan_world_park_far_t.jpg',w:1280,h:330,alt:'흐리고 어둡게 가공한 놀이공원.',name:'⑥ 놀이공원',note:'가공본'},
            {src:'/media/process/butter/plan_world_cathedral_far.jpg',thumb:'/media/process/butter/plan_world_cathedral_far_t.jpg',w:1280,h:648,alt:'흐리고 어둡게 가공한 성당.',name:'⑦ 성당',note:'가공본'},
            {src:'/media/process/butter/plan_world_sea_far.jpg',thumb:'/media/process/butter/plan_world_sea_far_t.jpg',w:1280,h:1004,alt:'흐리고 어둡게 가공한 해변.',name:'⑧ 해변',note:'가공본'},
          ]},
         {label:'세계 참조 가공',kind:'process',
          title:'세계 참조 — 원본을 그대로 넣지 않고 흐리고 어둡게 해서 넣었다',
          body:'원본을 그대로 넣었던 판에서는 엔진이 성당의 한가운데 소실점과 놀이공원의 한낮 해까지 베껴, 배경이 두 사람의 조명이 되고 인물이 배경을 의식했습니다. 그래서 빨간 틀만 잘라 소실점과 해를 화면 밖으로 밀고, 흐림(σ7)과 밝기 상한(약 37%)을 걸어 「세계의 색과 재질만」 넘겼습니다. 글로 막는 대신, 그대로 베껴도 괜찮은 참조를 만든 것입니다.',
          items:[
            {name:'① 놀이공원',crop:[11.9,52.8,76.2,45.8],arrow:'하늘과 해를 잘라 내고 · 흐림 · 어둡게',
             before:{src:'/media/process/butter/sheet_world_park.jpg',w:1680,h:720,alt:'놀이공원 원본, 빨간 틀이 잘라 쓴 부분'},
             after:{src:'/media/process/butter/plan_world_park_far.jpg',w:1280,h:330,alt:'놀이공원 가공본'}},
            {name:'② 성당',crop:[29.5,30.6,70.5,63.7],arrow:'가운데 소실점을 옆으로 밀고 · 흐림 · 어둡게',
             before:{src:'/media/process/butter/sheet_world_cathedral.jpg',w:1456,h:816,alt:'성당 원본, 빨간 틀이 잘라 쓴 부분'},
             after:{src:'/media/process/butter/plan_world_cathedral_far.jpg',w:1280,h:648,alt:'성당 가공본'}},
            {name:'③ 해변',crop:[0,40.4,42.6,59.6],arrow:'공중의 프라이팬 · 해를 빼고 · 흐림 · 어둡게',
             before:{src:'/media/process/butter/sheet_world_sea.jpg',w:1456,h:816,alt:'해변 원본, 빨간 틀이 잘라 쓴 부분'},
             after:{src:'/media/process/butter/plan_world_sea_far.jpg',w:1280,h:1004,alt:'해변 가공본'}},
          ]},
         {label:'15초 계획 → 생성 결과',kind:'beats',
          title:'15초 한 테이크 — 위는 계획, 그림은 같은 시점의 생성 결과',
          body:'두 사람의 다툼은 컷 없이 이어 가고, 세계만 그물망으로 지어졌다 허물어지게 여덟 박자로 계획했습니다. 결과는 순서는 지켰지만 세계가 계획보다 1~2초씩 늦게 바뀌었습니다(4번에 아직 놀이공원, 6번에 아직 성당). 생성에서 덮이지 않은 남자의 얼굴은 완성본에서 애프터 이펙트로 다시 덮었습니다(05 후반 작업).',
          items:[
            {no:'1',time:'0–2.2초',place:'검은 공간',action:'그가 말을 건넴',src:'/media/process/butter/plan_gen_1.jpg',w:1280,h:720,alt:'생성본 1.0초. 검은 공간에 두 사람.'},
            {no:'2',time:'2.2–4.4초',place:'놀이공원',action:'그녀가 말을 막음',src:'/media/process/butter/plan_gen_2.jpg',w:1280,h:720,alt:'생성본 3.2초. 놀이공원이 그물망으로 지어지기 시작.'},
            {no:'3',time:'4.4–6.2초',place:'놀이공원',action:'다가갔다가 멈춤',src:'/media/process/butter/plan_gen_3.jpg',w:1280,h:720,alt:'생성본 5.2초. 놀이공원에서 그녀가 손을 뻗는다.'},
            {no:'4',time:'6.2–8.2초',place:'성당',action:'그가 등을 돌림',src:'/media/process/butter/plan_gen_4.jpg',w:1280,h:720,alt:'생성본 7.2초. 아직 놀이공원.'},
            {no:'5',time:'8.2–10.6초',place:'성당',action:'그녀가 몰아붙임',src:'/media/process/butter/plan_gen_5.jpg',w:1280,h:720,alt:'생성본 9.2초. 청색 그물망 성당.'},
            {no:'6',time:'10.6–12.6초',place:'해변',action:'그가 돌아옴',src:'/media/process/butter/plan_gen_6.jpg',w:1280,h:720,alt:'생성본 11.4초. 아직 성당.'},
            {no:'7',time:'12.6–14초',place:'해체되는 바다',action:'세계가 지워짐',src:'/media/process/butter/plan_gen_7.jpg',w:1280,h:720,alt:'생성본 13.2초. 해변, 그녀가 웅크림.'},
            {no:'8',time:'14–15초',place:'검은 공간',action:'둘만 남음',src:'/media/process/butter/plan_gen_8.jpg',w:1280,h:720,alt:'생성본 14.6초. 검은 공간에 둘만.'},
          ]},
       ]},
      {key:'generate',label:'영상 생성',decision:'인물이 다투는 동안 공간이 전환되는 실제 생성본입니다.',
       thumbnail:{src:'/media/process/butter/pipeline_generated.jpg',w:1920,h:1080},
       generated:{src:'/media/process/butter/pipeline_generated.mp4',poster:'/media/process/butter/pipeline_generated.jpg',w:1920,h:1080,label:'세계 붕괴 생성본 · 15초'}},
      {key:'edit',label:'후반 작업',decision:'붕괴 장면의 얼굴 블러 합성과 고백의 생성형 확장을 편집에 연결했습니다.',
       thumbnail:{src:'/media/process/butter/edit_thumb.jpg',w:320,h:240},
       screens:[
         {label:'전체',src:'/media/process/butter/edit_pr_full.png',w:1440,h:877,
          alt:'Premiere Pro 본 시퀀스 1분 51초 전체. 영상 V1–V6과 소리 A1–A10에 이름이 붙어 있고, 클립은 하는 일별로 색이 같다. 1:24.0–1:43.9 구간이 밝은 띠로 표시되어 있다.',
          title:'프리미어 프로 · 본 시퀀스, 처음부터 끝까지(1분 51초)',
          body:'가로는 시간, 가로줄 한 칸이 층 하나입니다(위 V1–V6은 화면, 아래 A1–A10은 소리). 색은 하는 일별로 맞췄습니다 — 파랑 생성 클립과 원음·내레이션, 분홍 애프터 이펙트 합성, 황갈색 위아래 검은 띠, 보라 자막, 초록 공간의 소리, 주황 효과음, 청록 음악. 오른쪽 밝은 띠가 위에서 본 대본 장면(1:24.0–1:43.9)입니다.'},
         {label:'이 장면',src:'/media/process/butter/edit_pr_scene.png',w:1920,h:877,
          alt:'Premiere Pro 1분 17초–1분 56초 확대. V1의 분홍 막대가 애프터 이펙트 컴포지션으로 연결되어 있고 끝에서 사라진다. 짧은 검은 화면 뒤 고백 장면이 이어지고, A10 음악에 볼륨 선이 있다.',
          title:'같은 시퀀스에서 이 장면만 크게(1:17–1:56)',
          body:'V1의 분홍 막대는 애프터 이펙트 합성을 프리미어로 바로 불러온 클립입니다. 붕괴 장면이 서서히 사라지고 0.5초 검은 화면 뒤 고백 장면이 떠오르며, 고백 장면의 마지막 1초는 생성형 확장으로 늘렸습니다. 아래 A10 음악의 볼륨 선이 이 흐름을 따라 내려갑니다.'},
         {label:'애프터 이펙트',src:'/media/process/butter/edit_ae_full.png',w:1920,h:1012,
          alt:'After Effects 작업 화면. 왼쪽 Effect Controls에 Fractal Noise(Noise Type Block)와 Posterize, 가운데 뷰어에 얼굴이 모자이크된 해변 장면, 아래 타임라인에 조정 레이어 · 흰 솔리드 · 원본 클립 등 여덟 레이어와 프레임마다 찍힌 마스크 키프레임.',
          title:'애프터 이펙트 · 그 분홍 막대의 컴포지션 전체(16초 · 레이어 8개)',
          body:'흰 판에 블록 모양 노이즈(Fractal Noise)를 깔고 흑과 백 두 단계(Posterize)로 나눈 뒤, 그 무늬를 매트로 써서 모자이크가 칸 단위로 켜졌다 꺼지게 했습니다. 얼굴을 덮는 마스크는 프레임마다 다시 맞췄습니다(타임라인의 촘촘한 점). 가운데 화면이 1:36.5의 결과입니다.'},
       ]},
    ],
  },
};
