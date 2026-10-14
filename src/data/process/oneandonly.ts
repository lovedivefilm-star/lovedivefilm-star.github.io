/**
 * 오직 당신의 것 EP.01 — 작품 방 데이터(docs/work-room.md 4절). 원문 대조 문서 = `_분석/작품과정/oneandonly.md`.
 * 개요: 소개 = 1-1 작품 설명(작가 집필) 앞 두 문단(통째 — 문단 단위로만 뺐다) · 사양 = 2-0 · 2-9 · 3절 · 역할 = 「대본 김영건 · 생성/편집 팀 공동」.
 * 과정: S6-D 가마에서 정경부인 — 재료 `_분석/작품과정/oneandonly_장면과정.md`(데이터 에이전트) 그대로 옮김.
 *  메인 판단(10-13): 01 = 칩 + 작품 설명 K17 · K18, 그림 없음 · 03 = 장옷 시트 · 콘티 칸 · 블로킹맵(캡션에 의상 이야기 없음)
 *  · 06 = Premiere Pro · 자막 + 컷 띠만(Lyria 는 소리로 확인 못 해 뺌) · 「▶ 이 장면 보기」 start=150(149 면 앞 컷이 0.6초 보인다).
 *  01 의 구조 막대는 장면과정.md 01 의 위치 값(S#6 2:07.5 ~ 2:57.1 · 이 장면 2:29.6 ~ 2:37.2 · 타이틀 2:57.1)으로 그린다.
 */
import type { WorkRoom } from './types';

const M = '/media/process/oneandonly';
const K = (n: number) => `1-2 K${n}`;
// 완성본 컷 경계(초 — 프레임 ÷ 24)
const CUT = { a: 149.583, c2: 155.917, end: 157.167 };

export const ONEANDONLY: WorkRoom = {
  slug: 'oneandonly',
  doc: 'oneandonly.md',
  overview: {
    intro: [
      {
        t: '열광하는 관중, 피 튀기는 난투. 덥다 못해 뜨거운 격투기 현장의 케이지 바닥은 생각보다 차갑다. 그건 결국, 그 바닥에 내동댕이쳐진 패자들만이 알 수 있는 것. 만년 파이터 지망생 차도윤처럼.',
        src: '1-1 작품 설명 1문단',
      },
      {
        t: '글러브를 내려놓기로 한 밤. 옥상 난간 위에 선 도윤에게 코치의 전화 한 통이 도착한다. "그 새끼 약물했어. 선발 취소야. 네가 데뷔하는 거라고!" 운명의 장난이 여기까지였다면 얼마나 좋았을까. 미끄러지는 발, 손에 꼭 쥔 반지와 함께 낙하하는 도윤. 그 순간, 반지에서 찬란한 빛이 퍼졌다.',
        src: '1-1 작품 설명 2문단',
      },
    ],
    spec: [
      { k: '형식', v: 'AI 숏드라마 1화 · 9:16' },
      { k: '길이', v: '3:00' },
      { k: '제작 기간', v: '2026.09.21 – 10.11 · 21일' },
      { k: '역할', v: '대본 김영건 · 생성/편집 팀 공동', key: 'role' },
    ],
    tools: [
      { k: 'Image', v: 'Seedream 5.0 Pro · GPT Image 2.5' },
      { k: 'Video', v: 'Seedance 2.5 (Higgsfield)' },
      { k: 'Previs', v: 'Blender 5.2' },
      { k: 'Edit', v: 'Premiere Pro · After Effects' },
      { k: 'Sound', v: 'Suno v6 · ElevenLabs Music 2.5' },
    ],
  },
  process: {
    title: 'S6-D 가마에서 정경부인',
    script: '대본 3고 · 4쪽 · S#6',
    src: '5 후보 1 ①',
    range: [CUT.a, CUT.end],
    excerpt: [
      /* 0 */ { t: 'scene', s: 'EXT. 외진 길 / D' },
      /* 1 */ { t: 'act', s: '곧 가마에서 내리는 한 여인. 장옷 때문에 얼굴이 잘 보이지 않는다. 장옷을 걷으면 – 웅성이는 포졸들. 남주도 올려다보는데, 역광 때문에 옆모습의 실루엣만 보이고.' },
      /* 2 */ { t: 'dia', who: '장수1(!)', s: '(급하게 말에서 내려 엎드리며) 정.. 정경부인!' },
      /* 3 */ { t: 'act', s: '일제히 엎드려 인사를 올리는 포졸과 장수.' },
    ],
    stages: [
      {
        key: 'plan',
        chips: ['EP.01 · 6씬 · 2:59.9', 'S#6 외진 길 · 완성본 2:07.5 ~ 2:57.1', '이 장면 2:29.6 ~ 2:37.2 · 7.6초'],
        lit: [0],
        text: {
          label: '작품 설명 · 작가 집필',
          lines: [
            { t: '그 순간, 가마의 문이 열리고 일제히 엎드리는 장수와 포졸들.', src: K(17) },
            { t: '그 끝에 선 정경부인.', src: K(18) },
          ],
        },
        bar: {
          label: '완성본 3:00 · 대본 6씬',
          segs: [
            { a: 0, b: 127.54, time: '0:00–2:07', name: 'S#1 ~ S#5' },
            { a: 127.54, b: CUT.a, time: '2:07–2:29', name: 'S#6 · A ~ C' },
            { a: CUT.a, b: CUT.end, time: '2:29.6–2:37.2', name: 'S#6 · D', here: true },
            { a: CUT.end, b: 177.125, time: '2:37–2:57', name: 'S#6 · E ~ G' },
            { a: 177.125, b: 179.875, time: '2:57–3:00', name: '타이틀' },
          ],
          mark: 'S6-D · 완성본 2:29.6 – 2:37.2 · 전체의 83% 지점',
        },
      },
      {
        key: 'script',
        chips: ['대본 3고 · 4쪽 · S#6', '6씬 · 4쪽 · 약 2,010자', '집필 2026-09-21 ~ 09-28'],
        lit: [0, 1, 2, 3],
        pics: [{ src: `${M}/oo_02_1.jpg`, cap: '대본 3고 4쪽 — S#6 외진 길', w: 1132, h: 1600, kind: 'script' }],
      },
      {
        key: 'sheet',
        chips: ['시트 10장 — 인물 6 · 소품 3 · 장소 1', '콘티 S6-D 4칸 · Blender 구도 + GPT Image 2.5', '블로킹맵 4장 · Python'],
        lit: [1, 2, 3],
        pics: [
          { src: `${M}/oo_03_1.jpg`, cap: '여주 의상 시트 — 팀 제작(툴 기록 없음)', w: 1600, h: 904, kind: 'sheet' },
          { src: `${M}/oo_03_2.jpg`, cap: '콘티 칸 — Blender 로 세운 구도를 GPT Image 2.5 Sunburst(WaveSpeed)로 스케치', w: 576, h: 1024, kind: 'conti' },
          { src: `${M}/oo_03_3.jpg`, cap: '블로킹맵 — Python 스크립트로 그린 윤곽선 · 영상 생성에 참조로 넣음', w: 1594, h: 700, kind: 'blocking' },
        ],
      },
      {
        key: 'segment',
        chips: ['세그먼트 마스터 · S#6 의 D', '컷 2개 · 완성본 7.6초'],
        lit: [1, 2, 3],
        segments: [
          { cut: '컷 1', size: '꽃신 · 치맛단 클로즈업 → 어깨 위 뒷모습 · 틸트 업', at: [CUT.a, CUT.c2], lines: [1] },
          { cut: '컷 2', size: '풀 샷 · 로우 앵글', at: [CUT.c2, CUT.end], lines: [2, 3] },
        ],
      },
      {
        key: 'generate',
        chips: ['Seedance 2.5 (ByteDance · reference-to-video) · Higgsfield API', '시트 10장 + 블로킹맵 4장 + 대본 → 컷 2개 (11초)', '720p · 9:16 · 24fps · 소리 켬'],
        lit: [1, 2, 3],
        pics: [
          { src: `${M}/oo_05_1.jpg`, cap: '완성본 2:29.8 · 컷 1', w: 720, h: 1280, kind: 'frame' },
          { src: `${M}/oo_05_2.jpg`, cap: '완성본 2:34.0 · 컷 1', w: 720, h: 1280, kind: 'frame' },
        ],
      },
      {
        key: 'edit',
        chips: ['Premiere Pro', '자막 · Pretendard SemiBold'],
        lit: [1, 2, 3],
        strip: {
          a: CUT.a,
          b: CUT.end,
          cuts: [CUT.c2],
          labels: ['컷 1', '컷 2'],
          frames: [1, 2].map((k) => `/media/process/strips/oneandonly_${k}.jpg`),
        },
      },
    ],
    pairs: [
      { lines: [1], t: 154.83, pic: { src: `${M}/oo_end_1.jpg`, cap: '완성본 2:34.8', w: 720, h: 1280, kind: 'frame' } },
      { lines: [2], t: 155.67, pic: { src: `${M}/oo_end_2.jpg`, cap: '완성본 2:35.7', w: 720, h: 1280, kind: 'frame' } },
      { lines: [3], t: 156.75, pic: { src: `${M}/oo_end_3.jpg`, cap: '완성본 2:36.8', w: 720, h: 1280, kind: 'frame' } },
    ],
    play: 150,
  },
};
