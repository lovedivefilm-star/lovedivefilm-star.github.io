import { CASE_STUDIES } from './case-studies';
import { applyEdits } from './edits';
import type { PageLine } from './pages';

export type PipelineImage = { src:string; w:number; h:number; alt:string; caption:string };
/** A real editing-tool screen (Premiere / After Effects) captured from a working copy of the
 *  project, shown as-is. `title` + `body` explain how to read it in plain words. */
export type PipelineScreen = { label:string; src:string; w:number; h:number; alt:string; title:string; body:string };
export type PipelineStep = {
  key:'script'|'sheet'|'segment'|'generate'|'edit'; label:string; decision:string;
  thumbnail?:{src:string;w:number;h:number}; note?:string;
  script?:{label:string;lines:PageLine[];focus:number[]}; images?:PipelineImage[];
  sequence?:{title:string;items:{label:string;detail:string}[];focus?:number;connection?:string};
  segmentLabel?:string; segmentUnit?:string; segments?:{cut:string;size:string;action:string}[];
  generated?:{src:string;poster:string;w:number;h:number;label:string;note?:string};
  guide?:{src:string;poster:string;w:number;h:number;label:string};
  screens?:PipelineScreen[];
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
      {key:'sheet',label:'인물·의상',decision:'등장하는 뒷모습은 장옷 시트, 옆얼굴 생성은 한복 시트로 연결했습니다.',
       thumbnail:{src:'/media/process/oneandonly/oo_03_4.jpg',w:1360,h:768},
       images:[{src:'/media/process/oneandonly/oo_03_1.jpg',w:1600,h:904,alt:'정경부인의 장옷 앞·뒤·얼굴 시트',caption:'얼굴을 감춘 등장 · 장옷 시트'},{src:'/media/process/oneandonly/oo_03_4.jpg',w:1360,h:768,alt:'정경부인의 한복 앞·뒤·얼굴 시트',caption:'옆얼굴 생성에 사용 · 한복 시트'}]},
      {key:'segment',label:'장면 설계',decision:'얼굴을 숨긴 등장부터 정체와 얼굴이 드러나는 순서를 네 컷으로 정했습니다.',
       sequence:{title:'네 컷의 공개 순서',focus:2,items:[
         {label:'등장',detail:'얼굴을 감춘 뒷모습'},
         {label:'신분 확인',detail:'고개를 숙이는 장수'},
         {label:'얼굴 공개',detail:'옆얼굴을 가까이'},
         {label:'알아보는 반응',detail:'남주의 눈을 가까이'},
       ],connection:'얼굴 공개 컷의 초기 콘티를 보고, 다음 단계에서 실제 생성 영상을 확인할 수 있습니다.'},
       thumbnail:{src:'/media/process/oneandonly/oo_reveal_board.jpg',w:576,h:1024},
       images:[{src:'/media/process/oneandonly/oo_reveal_board.jpg',w:576,h:1024,alt:'초기 옆얼굴 콘티',caption:'초기 옆얼굴 콘티 · 의상은 이후 변경'}],
       segmentLabel:'당시 네 컷의 카메라 설계 · 길이는 생성 전 계획값',segmentUnit:'컷',
       segments:[
         {cut:'등장',size:'꽃신·치맛단 → 허리 위 뒷모습',action:'팬 · 틸트 업 / 설계 3.9초'},
         {cut:'신분',size:'말 위 상반신 → 엎드린 등',action:'틸트 다운 / 설계 3.2초'},
         {cut:'얼굴',size:'옆얼굴 CU · 화면 왼쪽 1/3',action:'고정 · 로우 앵글 / 설계 2.0초'},
         {cut:'반응',size:'눈 ECU',action:'고정 · 하이 앵글 / 설계 1.8초'},
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
      {key:'sheet',label:'인물·의상',decision:'두 사람의 변장과 문신이 드러나는 본모습을 따로 준비했습니다.',
       thumbnail:{src:'/media/process/firstimpression/pipeline_sheet_2.png',w:2752,h:1536},
       images:[
         {src:'/media/process/firstimpression/pipeline_sheet_1.png',w:1679,h:937,alt:'홍선희 비서 변장 시트',caption:'선희 · 비서 변장'},
         {src:'/media/process/firstimpression/pipeline_sheet_2.png',w:2752,h:1536,alt:'홍선희 본모습과 문신 시트',caption:'선희 · 본모습과 문신'},
         {src:'/media/process/firstimpression/pipeline_sheet_3.jpg',w:2752,h:1536,alt:'한서진 투자자 변장 시트',caption:'서진 · 투자자 변장'},
         {src:'/media/process/firstimpression/pipeline_sheet_4.png',w:1536,h:1024,alt:'한서진 본모습과 문신 시트',caption:'서진 · 본모습과 문신'},
       ]},
      {key:'segment',label:'장면 설계',decision:'두 사람의 크기와 거리, 이동 방향을 3D로 확인했습니다.',
       sequence:{title:'3D로 검토한 구도',items:[
         {label:'선희 단독',detail:'인물의 크기'},
         {label:'키스',detail:'두 사람의 거리'},
         {label:'함께 걷기',detail:'이동과 카메라'},
       ],connection:'다음 자료는 키스 뒤 같은 문신이 드러나는 생성 장면입니다.'},
       thumbnail:{src:'/media/process/firstimpression/pipeline_guide_2.png',w:1080,h:1920},
       images:[
         {src:'/media/process/firstimpression/pipeline_guide_1.png',w:1080,h:1920,alt:'선희 단독 카메라 구도 프리비즈',caption:'선희 단독 · 구도 가이드'},
         {src:'/media/process/firstimpression/pipeline_guide_2.png',w:1080,h:1920,alt:'키스하는 두 사람의 크기와 거리 프리비즈',caption:'키스 · 인물의 크기와 거리'},
         {src:'/media/process/firstimpression/pipeline_guide_3.png',w:1080,h:1920,alt:'두 사람이 보행하는 카메라 구도 프리비즈',caption:'보행 · 구도 가이드'},
       ],
       guide:{src:'/media/process/firstimpression/pipeline_guide.mp4',poster:'/media/process/firstimpression/pipeline_guide.jpg',w:1080,h:1920,label:'전체 3D 구도 가이드 · 5컷 · 10초'}},
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
          alt:'Premiere Pro 「S1」 0:14–0:45 확대. 0:24 무렵 영상이 빈 검은 구간 아래로 A2 셔터 소리가 이어지고, 0:25.1부터 자르지 않은 원테이크 클립 하나가 0:34.8까지 놓여 있다.',
          title:'같은 「S1」에서 이 장면만 크게(0:14–0:45)',
          body:'0:24 무렵 화면이 잠깐 까맣게 비는 동안에도 A2의 셔터 소리는 끊기지 않고 다음 컷까지 이어집니다. 그 뒤 V1의 긴 클립 하나가 자르지 않은 9.7초 원테이크이고, 끝에서는 차 문이 미끄러지는 소리로 다음 장면에 넘어갑니다.'},
       ]},
    ],
  },
  butter:{
    slug:'butter',title:'세계 붕괴에서 고백까지',role:'기획·대본·연출·생성·합성·편집·사운드 김영건',
    steps:[
      {key:'script',label:'대본',decision:'인물은 남고 세계가 바뀌는 붕괴에서, 둘만의 고백으로 이어집니다.',script:scriptExcerpt('butter')},
      {key:'sheet',label:'인물·의상',decision:'장소가 바뀌어도 인물이 이어지도록 얼굴·의상·광질 참조를 준비했습니다.',
       thumbnail:{src:'/media/process/butter/pipeline_sheet_2.jpg',w:1024,h:1212},
       images:[
         {src:'/media/process/butter/pipeline_sheet_1.png',w:835,h:1536,alt:'지현 얼굴 참조',caption:'지현 · 얼굴'},
         {src:'/media/process/butter/pipeline_sheet_2.jpg',w:1024,h:1212,alt:'지현 의상과 광질 참조',caption:'지현 · 의상과 광질'},
         {src:'/media/process/butter/pipeline_sheet_3.jpg',w:1024,h:1182,alt:'한주 얼굴 참조',caption:'한주 · 얼굴'},
         {src:'/media/process/butter/pipeline_sheet_4.jpg',w:1024,h:1356,alt:'한주 재킷과 헤어 광질 참조',caption:'한주 · 재킷과 광질'},
       ]},
      {key:'segment',label:'장면 설계',decision:'다투는 두 사람은 남겨 두고, 공간이 바뀌는 순서를 15초 안에 계획했습니다.',
       thumbnail:{src:'/media/process/butter/pipeline_world_2.jpg',w:1280,h:648},
       images:[
         {src:'/media/process/butter/pipeline_world_1.jpg',w:1280,h:330,alt:'놀이공원 세계 전환용 배경 자산',caption:'놀이공원 · 배경 자산'},
         {src:'/media/process/butter/pipeline_world_2.jpg',w:1280,h:648,alt:'성당 세계 전환용 배경 자산',caption:'성당 · 배경 자산'},
         {src:'/media/process/butter/pipeline_world_3.jpg',w:1280,h:1004,alt:'해변 세계 전환용 배경 자산',caption:'해변 · 배경 자산'},
       ],segmentLabel:'15초 원테이크의 시간별 공간 전환 계획',segmentUnit:'구간',
       segments:[
         {cut:'1',size:'0–2.2초 · 검은 공간',action:'그가 말을 건넴'},
         {cut:'2',size:'2.2–4.4초 · 놀이공원',action:'그녀가 말을 막음'},
         {cut:'3',size:'4.4–6.2초 · 놀이공원',action:'다가갔다가 멈춤'},
         {cut:'4',size:'6.2–8.2초 · 성당',action:'그가 등을 돌림'},
         {cut:'5',size:'8.2–10.6초 · 성당',action:'그녀가 몰아붙임'},
         {cut:'6',size:'10.6–12.6초 · 해변',action:'그가 돌아옴'},
         {cut:'7',size:'12.6–14초 · 해체되는 바다',action:'세계가 지워짐'},
         {cut:'8',size:'14–15초 · 검은 공간',action:'둘만 남음'},
       ],note:'당시 설계 자료이며, 완성 영상의 공간과 타이밍은 달라졌습니다.'},
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
