import type { CaseStudy } from './types';
import { PAGES } from '../pages';

const source = PAGES.firstimpression;
const origin = 'G:/내 드라이브/ai 단편 영화/OYE_숏드라마_챌린지';

const scene: CaseStudy['scene'] = {
    start: 25.125,
    end: 34.708,
    clip: '/media/process/firstimpression/scene_disguise.mp4',
    poster: '/media/process/firstimpression/scene_disguise.jpg',
    w: 720,
    h: 1280,
    caption: '쓰러진 회장을 보여 주는 컷을 사이에 두고 키스와 두 문신 공개로 이어지는 완성 장면입니다.',
    // Absolute positions in the full final film; subtract scene.start for the local clip.
    beats: [
      { t: 25.125, label: '선희의 대사' },
      { t: 27.25, label: '회장과 변장 소품', note:'변장을 벗는 동작을 이 컷 사이에서 생략합니다.' },
      { t: 28.75, label: '재킷을 입은 키스', note:'두 문신을 아직 함께 보여주지 않습니다.' },
      { t: 31.042, label: '재킷을 벗기 시작' },
      { t: 32.5, label: '두 문신 공개', note:'재킷이 벗겨지며 같은 문신이 한 화면에 드러납니다.' },
      { t: 33.083, label: '나란히 걷는 두 사람' },
    ],
  };
export const firstimpression: CaseStudy = {
  id: 'firstimpression',
  title: '변장 해제 → 키스 → 문신 공개',
  summary: '변장이 풀리는 과정은 생략하고, 키스 뒤 두 문신이 함께 드러나도록 구성한 장면입니다.',
  role: '대본과 장면 연출 방향은 김영건, 생성과 편집은 팀 공동 작업입니다.',
  script: {
    label: '대본 · S#3 은행 통로',
    src: source.src,
    lines: source.lines.slice(8),
    // PAGES index 13: the complete authored paragraph, including the kiss.
    focus: [5],
  },
  choices: [
    {
      heading: '벗는 동작은 생략',
      at: 27.25,
      text: '선희의 가발과 겉옷을 벗는 동작은 쓰러진 회장을 보여 주는 컷에서 생략하고 키스 장면으로 이었습니다.',
      basis: `${origin}/결정로그_OYE_완료.md L85, L96–98; ${origin}/04_영상/2026-09-05_S2-B_통로_v5_투입표_변경점.md L23–44. 작가가 화면 밖 생략을 지시한 기록. v5 자체는 미생성 설계이며, 최종 편집의 정확한 생성 판 번호는 미확정.`,
    },
    {
      heading: '키스 뒤에 두 문신을 공개',
      at: 32.5,
      text: '서진의 흰 재킷은 키스 장면에 남겨 두고, 이어지는 뒷모습에서 벗어 두 사람의 같은 문신이 함께 보이게 했습니다.',
      basis: `${origin}/04_영상/2026-09-05_S2-B_통로_v6_투입표_변경점.md L8–11, L37–53; ${origin}/결정로그_OYE_완료.md L85, L118. 작가의 재킷 제거 시점·동일 문신 공개·보행 방향 지시. 이 설계와 최종 편집본의 판 번호를 동일하다고 단정하지 않음.`,
    },
  ],
  material: {
    title: '두 사람의 문신 시트',
    note: '두 사람의 뒷모습에 같은 문신을 배치한 인물 시트입니다.',
    images: [
      {
        img: '/media/process/firstimpression/fi_sunhee_tattoo_back.jpg',
        w: 834,
        h: 1536,
        alt: '홍선희 뒷모습 문신 시트',
        caption: '홍선희 · 뒷모습',
      },
      {
        img: '/media/process/firstimpression/fi_seojin_tattoo_back.jpg',
        w: 441,
        h: 1024,
        alt: '한서진 뒷모습 문신 시트',
        caption: '한서진 · 뒷모습',
      },
    ],
  },
  scene,
  panels: [{ id: 'disguise-tattoo', title: '변장 해제에서 두 문신 공개까지', contextStart: 3, contextEnd: 8, choiceIndexes: [0, 1], scene }],
  basis: [
    `${origin}/02_대본/2026-09-13_1화_대본_개고_정본.md L24–38; 로컬 _분석/대본/firstimpression_대본.txt L100–114. S#3 전체 맥락을 PAGES.firstimpression.lines[8..15]에서 그대로 참조하고, 원래 index13 문단 전체만 focus.`,
    `${origin}/99_보관/작가_연출메모/2026-09-04_작가메모_S2-B_컷1컷2_연출의도.txt L1–14, L21–29, L44–47; 결정로그_OYE_완료.md L1495–1496. 작가의 직접 촬영 지시 기록이며 프롬프트 문장 작성·계측·3D 제작 전체를 개인 작업으로 주장하는 근거가 아님.`,
    `${origin}/결정로그_OYE_완료.md L200–205. S2-B는 S#3 후반부 대응. 공유 폴더의 S#2는 옛 폴더 번호이며, 최종 S2-B의 생성 판 번호는 미확정. 역할 표기는 기존 확정 크레딧의 생성/편집 팀 공동을 유지.`,
    `${origin}/03_인물/여주/홍선희 (여주인공)/홍선희_백뷰(문신v2).png — 원본 834×1536, 1,020,532 bytes; 공개용 JPG는 원본 비율 보존 변환.`,
    `${origin}/03_인물/남주/한서진 (남주인공)/한서진_백뷰(문신v2).png — 원본 441×1024, 483,713 bytes; 공개용 JPG는 원본 비율 보존 변환.`,
    'C:/Users/wheni/Documents/Codex/Projects/포폴 웹사이트 만들기/작업물 완성본/AI 숏드라마/첫 인상은 백점, 첫 마디는 엎드려.mp4 — 265,216,870 bytes, 4:47.333, 720×1280. scene은 이 완성본에서만 추출, poster는 33초.',
    '로컬 _분석/작품과정/firstimpression.md L584–598; firstimpression_장면과정.md 04 세그먼트·06 편집의 기존 실측 기록: 25.125/26.625/27.833/31.042/33.083/34.708초. 이번 데이터 작성에서 새로 재측정하지 않았으며 최종 영상 대조는 통합 담당이 수행. 내부 로그·경로·프롬프트와 이 basis는 공개 화면에 출력하지 않음.',
  ],
};
