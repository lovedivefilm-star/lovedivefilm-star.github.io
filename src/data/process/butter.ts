/**
 * 버터! [VirTer!] — 작품 방 데이터(docs/work-room.md 4절). 원문 대조 문서 = `_분석/작품과정/butter.md`.
 * 따라가는 장면 = S#7 (가상) 놀이공원(butter.md 5절 후보 A) · 완성본 1:02.2 ~ 1:09.5.
 *
 * 사실의 근거:
 *  · 개요 사양 · 툴 = butter.md 0 · 2 · 3절(역할 = 단독, 결정로그 10-13)
 *  · 발췌 = [1차] 예고편 대본 3쪽(butter.md 1-3 ①). 추출본은 줄바꿈이 없어 문장 경계에서만 나눴고,
 *    문단은 대본 실물(PDF 3쪽 — public/media/process/butter/script_p3.jpg)의 두 문단을 따랐다(join).
 *  · 세그먼트 = 원본 `01_대본/2026-08-06_버터_세그먼트_S7_놀이공원.md` 의 컷 구성 표에서 컷 · 크기만(서술 문장은 안 씀).
 *    컷마다 맡는 대본 문장은 발췌 번호로 가리킨다(글은 발췌에서 통째로).
 *  · 완성본 컷 경계 = 완성본 mp4 를 ffmpeg 로 잰 값(scene 0.15 + 밝기 — 1:02.2 은 검정을 거친 디졸브의 바닥).
 *    C-05(멈춘 낙하 INS)는 완성본에 없다.
 */
import type { WorkRoom } from './types';

const DOC = '1-1';
const P = (n: number, extra = '') => `${DOC} PDF ${n}쪽${extra}`;
const M = '/media/process/butter';

// 완성본 컷 경계(초)
const CUT = { c1: 62.167, c2: 62.875, c3: 63.792, c4: 65.208, k1: 66.5, k2: 68.125, end: 69.542 };

export const BUTTER: WorkRoom = {
  slug: 'butter',
  doc: 'butter.md',
  overview: {
    intro: [
      { t: '내 애인의 목소리가, 다른 사람의 데이트에서 들린다.', src: P(10), lead: true },
      {
        t: '버터(Virtual Dater — 가상현실 데이트 어플)의 1호 커플이자 창립 멤버인 지현은, 임원 승진이 걸린 프로젝트를 완수하기 위해 뛰어든 버터에서 자신의 애인인 한주와 매칭된다.',
        src: P(4, ' 로그라인'),
      },
      { t: '“얼굴을 볼 수 없다면, 나는 무엇을 사랑한 것인가.”', src: P(8) },
    ],
    spec: [
      { k: '형식', v: 'AI 트레일러 · 16:9 (2.39:1 레터박스)' },
      { k: '길이', v: '1:51' },
      { k: '원작', v: '단막극 70분 (1회 완결) · 각본 김영건' },
      { k: '장르', v: '로맨스릴러 / SF' },
      { k: '제작 기간', v: '2026.07.16 – 08.31 · 46일' },
      { k: '역할', v: '기획 · 대본 · 연출 · 생성 · 합성 · 편집 · 사운드 — 단독', key: 'role' },
    ],
    tools: [
      { k: 'Image', v: 'Midjourney V8.2 · Seedream 5.0 Pro · GPT Image 2' },
      { k: 'Video', v: 'Seedance 2.0 → 2.5 (Higgsfield)' },
      { k: 'Edit', v: 'Premiere Pro · After Effects' },
      { k: 'Sound', v: 'ElevenLabs Music v2 · Seed Audio 1.0' },
    ],
  },
  process: {
    title: 'S#7 놀이공원',
    script: '예고편 대본 [1차] · 3쪽',
    src: '1-3 ①',
    range: [CUT.c1, CUT.end],
    excerpt: [
      /* 0 */ { t: 'scene', s: 'S#7.(가상) 놀이공원 / D' },
      /* 1 */ { t: 'act', s: '홀로 분주해보이는 지현.' },
      /* 2 */ { t: 'act', s: 'UI 창을 띄우더니 관리자로 접근하려는데 – 자꾸만 접근에 실패한다.', join: true },
      /* 3 */ { t: 'act', s: '그 사이에 도착하는 남자.', join: true },
      /* 4 */ { t: 'act', s: '급하게 UI 창을 끈다.', join: true },
      /* 5 */ { t: 'act', s: '남자는 지현 너머에서 무언가를 발견하고.', join: true },
      /* 6 */ { t: 'act', s: '버터의 마스코트.', join: true },
      /* 7 */ { t: 'act', s: '남자가 다가가 마스코트와 눈높이를 맞춰 놀아주는데 -', join: true },
      /* 8 */ { t: 'act', s: '지현을 빤히보고 있는 버터의 마스코트.' },
      /* 9 */ { t: 'act', s: '지현 그 시선을 느끼고 힐끗 마스코트를 보는데 – 순간 무언가를 느낀 듯, 굳은 얼굴로 멈추고.', join: true },
      /* 10 */ { t: 'act', s: '마스코트는 지현을 보고 싱긋 웃는데 -', join: true },
    ],
    stages: [
      {
        key: 'plan',
        chips: ['피칭 기획안 · 2026-07-28', '1분 30초 구조 7구간'],
        lit: [0],
        text: {
          label: '기획의도 · 기획안 5쪽',
          lines: [
            { t: '“있는 그대로의 나로 사랑받고 싶다”', src: P(5) },
            { t: '진심이 없기에 더 쉽게 혐오하고 더 쉽게 사랑하는 시대.', src: P(5) },
            { t: '우리에게 정말 진심이 없는 걸까 — 혹은 두려운 것일까.', src: P(5) },
          ],
        },
        bar: {
          label: '기획안 9쪽 · 1분 30초 구조',
          segs: [
            { a: 0, b: 18, time: '0:00–0:18', name: { t: '섬 — 사랑', src: P(9) }, sc: 'S#1' },
            { a: 18, b: 34, time: '0:18–0:34', name: { t: '강당 — 상품', src: P(9) }, sc: 'S#2' },
            { a: 34, b: 42, time: '0:34–0:42', name: { t: '발견과 잠입', src: P(9) }, sc: 'S#3–4' },
            { a: 42, b: 56, time: '0:42–0:56', name: { t: '두 개의 데이트', src: P(9) }, sc: 'S#5–8', here: true },
            { a: 56, b: 70, time: '0:56–1:10', name: { t: '파편들 — 가상과 현실이 뒤섞인다', src: P(9) }, sc: '—' },
            { a: 70, b: 82, time: '1:10–1:22', name: { t: '붕괴', src: P(9) }, sc: 'S#9' },
            { a: 82, b: 90, time: '1:22–1:30', name: { t: '고백', src: P(9) }, sc: 'S#10' },
          ],
          mark: 'S#7 · [1차] 대본 기준 S#5–8 구간 · 완성본에서는 1:02',
        },
        pics: [
          { src: '/media/plan/bt_p10_t.jpg', full: '/media/plan/bt_p10.jpg', cap: '기획안 10쪽 · 예고편 대본 요약 — 전반부', w: 480, h: 270, kind: 'plan' },
        ],
      },
      {
        key: 'script',
        chips: ['예고편 대본 [1차] · 김영건 · 2026-08-02', '6쪽 중 3쪽 · S#7', '지문 2문단'],
        lit: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        pics: [{ src: `${M}/script_p3.jpg`, cap: '예고편 대본 [1차] 3쪽 — S#5 ~ S#8', w: 1100, h: 1555, kind: 'script' }],
      },
      {
        key: 'sheet',
        chips: ['투입 시트 8장 — 장소 1 · 인물 4 · 마스코트 1 · 소품 2', 'Midjourney V8.2 · Seedream 5.0 Pro i2i'],
        lit: [0, 1, 6],
        pics: [
          { src: `${M}/sheet_park.jpg`, cap: '놀이공원 로케이션 시트 · Midjourney V8.2', w: 1600, h: 686, kind: 'sheet' },
          { src: `${M}/sheet_jihyeon.jpg`, cap: '지현 S#7 얼굴 레퍼런스 · Seedream i2i (머리 길이 정정판)', w: 1600, h: 904, kind: 'sheet' },
          { src: `${M}/sheet_mascot.jpg`, cap: '버터 마스코트 시트', w: 1600, h: 900, kind: 'sheet' },
        ],
      },
      {
        key: 'segment',
        chips: ['세그먼트 문서 · 2026-08-06 ~ 08-07', '신규 5컷(한 생성 13초) + 확정 2컷'],
        lit: [1, 2, 7, 8, 9, 10],
        segments: [
          { cut: 'C-01', size: 'MS · 어깨 너머', at: [CUT.c1, CUT.c2], lines: [7] },
          { cut: 'C-02', size: 'CU', at: [CUT.c2, CUT.c3], lines: [1] },
          { cut: 'C-03', size: 'MS · 백뷰', at: [CUT.c3, CUT.c4], lines: [2] },
          { cut: 'C-04', size: 'MCU · 백뷰', at: [CUT.c4, CUT.k1], lines: [2] },
          { cut: 'C-05 INS', size: 'CU 매크로', lines: [] },
          { cut: '확정 ①', size: '—', at: [CUT.k1, CUT.k2], lines: [9] },
          { cut: '확정 ②', size: '—', at: [CUT.k2, CUT.end], lines: [8, 10] },
        ],
      },
      {
        key: 'generate',
        chips: ['Seedance 2.0 → 2.5 · Higgsfield', '시트 8장 + 대본 → 5컷 · 13초 한 생성', '확정 컷 머리 길이 정정 · v2v'],
        lit: [1, 2, 7],
        pics: [
          { src: `${M}/f_0625.jpg`, cap: '완성본 1:02.5 · C-01', w: 1600, h: 670, kind: 'frame' },
          { src: `${M}/f_0632.jpg`, cap: '완성본 1:03.3 · C-02', w: 1600, h: 670, kind: 'frame' },
        ],
      },
      {
        key: 'edit',
        chips: ['Premiere Pro · 6컷 7.4초', 'After Effects · 관리자 모드 UI 합성 — Keylight · 코너핀'],
        lit: [1, 2, 7, 8, 9, 10],
        strip: {
          a: CUT.c1,
          b: CUT.end,
          cuts: [CUT.c2, CUT.c3, CUT.c4, CUT.k1, CUT.k2],
          labels: ['C-01', 'C-02', 'C-03', 'C-04', '확정 ①', '확정 ②'],
          frames: [1, 2, 3, 4, 5, 6].map((k) => `/media/process/strips/butter_${k}.jpg`),
        },
        pics: [{ src: `${M}/plate_admin.jpg`, cap: '관리자 모드 UI 플레이트(그린스크린) · GPT Image 2 — 합성 소스', w: 1600, h: 905, kind: 'plate' }],
        capture: '애프터 이펙트 · #7 패널 합성 화면',
      },
    ],
    pairs: [
      { lines: [2], t: 65.9, pic: { src: `${M}/f_0659.jpg`, cap: '완성본 1:05.9', w: 1600, h: 670, kind: 'frame' } },
      { lines: [9], t: 67.25, pic: { src: `${M}/f_0672.jpg`, cap: '완성본 1:07.3', w: 1600, h: 670, kind: 'frame' } },
      { lines: [10], t: 68.8, pic: { src: `${M}/f_0688.jpg`, cap: '완성본 1:08.8', w: 1600, h: 670, kind: 'frame' } },
    ],
    play: 62,
  },
};
