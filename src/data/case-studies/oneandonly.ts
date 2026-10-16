import { PAGES } from '../pages';
import { CUT5 } from '../cut5';
import type { CaseStudy } from './types';
const page = PAGES.oneandonly;
const first = page.lines.findIndex(line => line.s.startsWith(CUT5.oneandonly.block.from));
const scene: CaseStudy['scene'] = {
    start:149.583333, end:177, clip:'/media/process/oneandonly/scene_reveal.mp4', poster:'/media/process/oneandonly/scene_reveal.jpg', w:720,h:1280,
    caption:'완성본 2:29.6–2:57.0. 등장부터 신분·얼굴 공개와 남주의 반응까지 이어서 봅니다.',
    beats:[{t:154.833333,label:'얼굴을 숨긴 뒷모습',note:'가까운 어깨 뒤 구도로 얼굴 공개를 늦춥니다.'},{t:156.75,label:'신분을 알아보고 엎드림',note:'얼굴보다 주변 사람의 반응으로 신분을 먼저 알립니다.'},{t:159.5,label:'옆얼굴 공개'},{t:161.833333,label:'남주의 반응'}],
  };
export const oneandonly: CaseStudy = {
  id: 'oneandonly',
  title: '신분에서 얼굴로, 차례로 드러내기',
  summary: '뒷모습과 엎드리는 사람들을 먼저 보여준 뒤, 옆얼굴과 남주의 반응으로 이어지는 S#6을 살펴봅니다.',
  role: '대본과 장면 연출 방향은 김영건, 생성과 편집은 팀 공동 작업입니다.',
  script: { label: '대본 · S#6', src: page.src, lines: page.lines, focus: [first, first + 1, first + 2] },
  choices: [
    { heading: '얼굴보다 신분을 먼저 알리기', at: 156.75, text: '여인의 뒷모습과 엎드리는 사람들을 먼저 보여주고, 옆얼굴과 남주의 반응을 뒤에 배치했습니다.', basis: '결정로그_조선파이터_완료.md 항목370·378·380; 완성본154.83→156.75→159.5→161.8초' },
    { heading: '역광에만 기대지 않고 얼굴을 숨기기', at: 154.833333, text: '얼굴을 가리는 방법을 어깨 뒤 구도로 바꾸고, 낮고 가까운 카메라의 각도를 조정했습니다.', basis: '원본 결정로그 항목370(역광/얼굴 일관성 문제)·378(낮고 가까운 각도 수정)·380(작가 픽스). G 로우 앵글 성공 주장과 구분.' },
  ],
  material: {
    title: '공개 순서를 계획한 콘티',
    note: '인물의 반응과 얼굴 공개를 나눈 연출 계획입니다. 의상과 세부 구도는 완성 영상에서 달라졌습니다.',
    images: CUT5.oneandonly.conti.cells.map((image,index) => ({ img: image.img, w:image.w, h:image.h, alt:image.alt || ['장수의 반응을 계획한 콘티','일제히 엎드리는 사람들을 계획한 콘티','옆얼굴을 공개하는 콘티','남주의 동공 반응을 계획한 콘티'][index], caption:['신분을 알아보는 반응','엎드리는 사람들','옆얼굴 공개','남주의 반응'][index] })),
  },
  scene,
  panels: [{ id: 'identity-face', title: '신분과 얼굴을 차례로 공개한 장면', contextStart: 5, contextEnd: 12, choiceIndexes: [0, 1], scene }],
  basis:[
    'G:/내 드라이브/ai 단편 영화/조선파이터_비글루/결정로그_조선파이터_완료.md 항목165·361(역할),370·378·380(연출·판정)',
    'G:/내 드라이브/ai 단편 영화/조선파이터_비글루/02_대본/대본v5.pdf 4쪽. 본문은 HWP 추출 2010자와 일치; 너울→장옷 승인 치환만 허용.',
    '_분석/작품과정/oneandonly_장면과정.md 81~88·117~119행; 최종 영상 직접 프레임 대조',
  ],
};
