import { CASE_STUDIES } from './case-studies';
import { applyEdits } from './edits';
import type { PageLine } from './pages';

export type PipelineImage = { src:string; w:number; h:number; alt:string; caption:string };
export type PipelineTimeline = {
  label:string; start:number; end:number; note?:string;
  tracks:{label:string;layer:string;items:{label:string;start:number;end:number}[]}[];
};
export type PipelineStep = {
  key:'script'|'sheet'|'segment'|'generate'|'edit'; label:string; decision:string;
  thumbnail?:{src:string;w:number;h:number}; note?:string;
  script?:{label:string;lines:PageLine[];focus:number[]}; images?:PipelineImage[];
  sequence?:{title:string;items:{label:string;detail:string}[];focus?:number;connection?:string};
  segmentLabel?:string; segmentUnit?:string; segments?:{cut:string;size:string;action:string}[];
  generated?:{src:string;poster:string;w:number;h:number;label:string;note?:string};
  guide?:{src:string;poster:string;w:number;h:number;label:string};
  timeline?:PipelineTimeline;
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

const OO_TIMELINE:PipelineTimeline={
  "label": "실제 편집 데이터로 재구성한 타임라인",
  "start": 149.5833333333,
  "end": 177.125,
  "tracks": [
    {
      "label": "영상 1",
      "layer": "마스터",
      "items": [
        {
          "label": "영상 1",
          "start": 155,
          "end": 157.16666666666666
        },
        {
          "label": "영상 2",
          "start": 165.58333333333334,
          "end": 167.41666666666666
        },
        {
          "label": "영상 3",
          "start": 173.33333333333334,
          "end": 175.625
        }
      ]
    },
    {
      "label": "오디오 1",
      "layer": "마스터",
      "items": [
        {
          "label": "오디오 1",
          "start": 146.25,
          "end": 176
        },
        {
          "label": "오디오 2",
          "start": 176,
          "end": 179.29166666666666
        }
      ]
    },
    {
      "label": "오디오 2",
      "layer": "마스터",
      "items": [
        {
          "label": "오디오 1",
          "start": 127.875,
          "end": 150.375
        }
      ]
    },
    {
      "label": "오디오 3",
      "layer": "마스터",
      "items": [
        {
          "label": "오디오 1",
          "start": 149.08333333333334,
          "end": 150.58333333333334
        },
        {
          "label": "오디오 2",
          "start": 156.41666666666666,
          "end": 157.66666666666666
        }
      ]
    },
    {
      "label": "영상 2",
      "layer": "컷 편집",
      "items": [
        {
          "label": "영상 1",
          "start": 142.66666666666666,
          "end": 149.58333333333334
        },
        {
          "label": "영상 2",
          "start": 149.58333333333334,
          "end": 155.25
        },
        {
          "label": "영상 3",
          "start": 155.25,
          "end": 157.16666666666666
        },
        {
          "label": "영상 4",
          "start": 157.16666666666666,
          "end": 160.5
        },
        {
          "label": "영상 5",
          "start": 160.5,
          "end": 163.16666666666666
        },
        {
          "label": "영상 6",
          "start": 163.16666666666666,
          "end": 170.20833333333334
        },
        {
          "label": "영상 7",
          "start": 170.20833333333334,
          "end": 175.125
        },
        {
          "label": "영상 8",
          "start": 175.125,
          "end": 177.125
        }
      ]
    },
    {
      "label": "영상 3",
      "layer": "컷 편집",
      "items": [
        {
          "label": "영상 1",
          "start": 149.58333333333334,
          "end": 155.91666666666666
        },
        {
          "label": "영상 2",
          "start": 160.5,
          "end": 161.83333333333334
        },
        {
          "label": "영상 3",
          "start": 162.875,
          "end": 163.625
        }
      ]
    },
    {
      "label": "영상 4",
      "layer": "컷 편집",
      "items": [
        {
          "label": "영상 1",
          "start": 162.95833333333334,
          "end": 163.83333333333334
        }
      ]
    },
    {
      "label": "오디오 4",
      "layer": "컷 편집",
      "items": [
        {
          "label": "오디오 1",
          "start": 148.08333333333334,
          "end": 149.75
        },
        {
          "label": "오디오 2",
          "start": 160.5,
          "end": 162.91666666666666
        },
        {
          "label": "오디오 3",
          "start": 162.91666666666666,
          "end": 163.16666666666666
        },
        {
          "label": "오디오 4",
          "start": 163.16666666666666,
          "end": 170.20833333333334
        },
        {
          "label": "오디오 5",
          "start": 170.20833333333334,
          "end": 171.125
        },
        {
          "label": "오디오 6",
          "start": 171.125,
          "end": 172.95833333333334
        },
        {
          "label": "오디오 7",
          "start": 172.95833333333334,
          "end": 175.125
        },
        {
          "label": "오디오 8",
          "start": 175.125,
          "end": 177.33333333333334
        }
      ]
    },
    {
      "label": "오디오 5",
      "layer": "컷 편집",
      "items": [
        {
          "label": "오디오 1",
          "start": 149.58333333333334,
          "end": 155.25
        },
        {
          "label": "오디오 2",
          "start": 157.16666666666666,
          "end": 160.5
        },
        {
          "label": "오디오 3",
          "start": 160.5,
          "end": 161.83333333333334
        },
        {
          "label": "오디오 4",
          "start": 162.91666666666666,
          "end": 163.41666666666666
        },
        {
          "label": "오디오 5",
          "start": 177.04166666666666,
          "end": 180.04166666666666
        }
      ]
    },
    {
      "label": "오디오 6",
      "layer": "컷 편집",
      "items": [
        {
          "label": "오디오 1",
          "start": 154.20833333333334,
          "end": 157.79166666666666
        }
      ]
    }
  ]
};

const FI_TIMELINE:PipelineTimeline={
  "label": "실제 편집 데이터로 재구성한 타임라인",
  "start": 25.125,
  "end": 34.7083333333,
  "tracks": [
    {
      "label": "영상 1",
      "layer": "마스터",
      "items": [
        {
          "label": "영상 1",
          "start": 34.375,
          "end": 36.75
        }
      ]
    },
    {
      "label": "오디오 1",
      "layer": "마스터",
      "items": [
        {
          "label": "오디오 1",
          "start": 31.875,
          "end": 64.58333333333333
        }
      ]
    },
    {
      "label": "오디오 2",
      "layer": "마스터",
      "items": [
        {
          "label": "오디오 1",
          "start": 34.375,
          "end": 36.041666666666664
        }
      ]
    },
    {
      "label": "영상 2",
      "layer": "컷 편집",
      "items": [
        {
          "label": "영상 1",
          "start": 25.125,
          "end": 34.833333333333336
        }
      ]
    },
    {
      "label": "오디오 3",
      "layer": "컷 편집",
      "items": [
        {
          "label": "오디오 1",
          "start": 25.125,
          "end": 32.625
        }
      ]
    },
    {
      "label": "오디오 4",
      "layer": "컷 편집",
      "items": [
        {
          "label": "오디오 1",
          "start": 23.083333333333332,
          "end": 26.125
        },
        {
          "label": "오디오 2",
          "start": 33.666666666666664,
          "end": 35.125
        }
      ]
    }
  ]
};

const BUTTER_TIMELINE:PipelineTimeline={
  "label": "실제 편집 데이터로 재구성한 타임라인",
  "start": 84,
  "end": 103.875,
  "tracks": [
    {
      "label": "영상 1",
      "layer": "컷 편집",
      "items": [
        {
          "label": "영상 1",
          "start": 84,
          "end": 98.29166666666667
        },
        {
          "label": "영상 2",
          "start": 98.29166666666667,
          "end": 98.83333333333333
        },
        {
          "label": "영상 3",
          "start": 98.83333333333333,
          "end": 103.875
        }
      ]
    },
    {
      "label": "영상 2",
      "layer": "컷 편집",
      "items": [
        {
          "label": "영상 1",
          "start": 0,
          "end": 104.75
        }
      ]
    },
    {
      "label": "영상 3",
      "layer": "컷 편집",
      "items": [
        {
          "label": "영상 1",
          "start": 0,
          "end": 104.75
        }
      ]
    },
    {
      "label": "오디오 1",
      "layer": "컷 편집",
      "items": [
        {
          "label": "오디오 1",
          "start": 84,
          "end": 98.29166666666667
        },
        {
          "label": "오디오 2",
          "start": 98.83333333333333,
          "end": 103.95833333333333
        }
      ]
    },
    {
      "label": "오디오 2",
      "layer": "컷 편집",
      "items": [
        {
          "label": "오디오 1",
          "start": 70.45833333333333,
          "end": 100.95833333333333
        },
        {
          "label": "오디오 2",
          "start": 100.95833333333333,
          "end": 111.25
        }
      ]
    },
    {
      "label": "영상 4",
      "layer": "고백 확장",
      "items": [
        {
          "label": "영상 1",
          "start": 98.8333333333,
          "end": 102.87499999996668
        }
      ]
    },
    {
      "label": "영상 5",
      "layer": "고백 확장",
      "items": [
        {
          "label": "영상 1",
          "start": 102.87499999996668,
          "end": 103.875
        }
      ]
    },
    {
      "label": "오디오 3",
      "layer": "고백 확장",
      "items": [
        {
          "label": "오디오 1",
          "start": 98.8333333333,
          "end": 102.87499999996668
        }
      ]
    },
    {
      "label": "오디오 4",
      "layer": "고백 확장",
      "items": [
        {
          "label": "오디오 1",
          "start": 102.3749895833,
          "end": 103.875
        }
      ]
    }
  ]
};

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
      {key:'edit',label:'후반 작업',decision:'생성 소스를 잘라 영상·오디오 트랙에 배치했습니다.',timeline:OO_TIMELINE},
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
      {key:'edit',label:'후반 작업',decision:'생성 장면과 음악·효과음을 별도 트랙에 배치했습니다.',timeline:FI_TIMELINE},
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
      {key:'edit',label:'후반 작업',decision:'붕괴 장면의 얼굴 블러 합성과 고백의 생성형 확장을 편집에 연결했습니다.',timeline:BUTTER_TIMELINE},
    ],
  },
};
