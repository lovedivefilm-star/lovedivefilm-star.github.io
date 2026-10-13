/**
 * 첫 인상은 백점, 첫 마디는 엎드려 EP.01 — 작품 방 데이터(docs/work-room.md 4절). 원문 대조 문서 = `_분석/작품과정/firstimpression.md`.
 * 개요: 소개 = 1-1 작품 설명(작가 줄거리에서 문장을 통째로 남긴 간추림) 전문 · 사양 = 1-2 · 2-0 · 3절 · 역할 = 「대본 김영건 · 생성/편집 팀 공동」
 *       (3D 은행 세트 · 프리비즈 = 팀 제작 — 결정로그 10-13).
 * 과정: S2-A → S2-B — 재료 `_분석/작품과정/firstimpression_장면과정.md`(데이터 에이전트) 그대로 옮김.
 *  메인 판단(10-13): 01 은 그림 없이 칩 + 작가 원문(기획안 4쪽 그림 fi_plan_1 은 제출 양식 문구가 보여 안 씀) · 대본 쪽 그림 fi_script_1 은 씀
 *  · 04 의 작가 연출 메모 인용은 md 의 「우선 2개」만 · 03 프리비즈 캡션은 md 그대로(「팀」 표기 없이).
 *  01 의 구조 막대는 장면과정.md 의 위치 값(완성본 4:47.3 중 0:16.25 ~ 0:34.71 · 뒤로 S#4(회상) ~ S#7)으로 그린다.
 */
import type { WorkRoom } from './types';

const S = '1-1 작품 설명';
const M = '/media/process/firstimpression';
// 완성본 컷 경계(초) — 장면과정.md 06
const CUT = { a: 16.25, k: 23.917, b1: 25.125, b2: 26.625, b3: 27.833, b4: 31.042, b5: 33.083, end: 34.708 };

export const FIRSTIMPRESSION: WorkRoom = {
  slug: 'firstimpression',
  doc: 'firstimpression.md',
  overview: {
    intro: [
      { t: '1986년 서울.', src: S },
      { t: '신국은행을 지나는 리무진 한 대. 그 안에는 신국그룹의 회장, 젊은 투자자인 피에르 장, 그리고 그의 비서인 한 여성. 은행 앞에 도착하자, 틈틈이 훔쳐보던 비서의 맨 다리를 쓰윽 흝으며 내리는 회장.', src: S },
      { t: '그리고 총성.', src: S },
      { t: "투자자와 비서가 외투를 벗자 같은 문신이 보인다. 'MISS ME' 그들의 진정한 본모습. 한서진, 그리고 3년전까지만 해도, 이곳의 은행원이었던 홍선희.", src: S },
      { t: '3년전, 은행을 털러 들어온 서진과 일당.', src: S },
      { t: '서진은 선희를 인질로 잡고 탈출을 시도한다. 경관이 트리거를 당기기 직전, 서진이 선희를 밀쳐내고 다리에 총을 맞는다. 그 순간 울리는 총성. 권총을 든 채 떨고 있는 선희. 쓰러지는건 서진이 아닌 경관이다.', src: S },
      { t: '그 이후 아침 신문 1면을 매일 차지하며, 서울의 악몽이 된 연인 강도 서진과 선희. 오래 준비한 작전인 만큼 성공적으로 신국 은행을 털고 바깥으로 나서는데, 서진이 회장의 시체 옆에 놓인 피 묻은 사진 한 장을 발견한다. 서진이 올려다보면 총을 겨눈 선희다.', src: S },
      { t: '총알은 서진을 지나 회장의 시체에 박힌다. "내 사진을 왜 갖고 있어. 더러워."', src: S },
      { t: '서진은 아무것도 묻지 못한다.', src: S },
      { t: '그러던 어느날, 서진은 시체 앞에서 사진을 태우고 있던 선희를 마주하는데..', src: S },
    ],
    spec: [
      { k: '형식', v: 'AI 숏드라마 1화 · 9:16' },
      { k: '길이', v: '4:47' },
      { k: '장르', v: '범죄 느와르 로맨스 (1980년대 시대극)' },
      { k: '제작 기간', v: '2026.09.01 – 09.13 · 13일' },
      { k: '역할', v: '대본 김영건 · 생성/편집 팀 공동', key: 'role' },
    ],
    tools: [
      { k: 'Image', v: 'Midjourney V8.2 · Nano Banana Pro · Seedream 5.0 Pro · GPT Image 2' },
      { k: 'Video', v: 'Seedance 2.5 (Higgsfield · WaveSpeed · SeeGen)' },
      { k: 'Previs', v: 'Blender 5.2 · 3D 은행 세트(팀 제작)' },
      { k: 'Edit', v: 'Premiere Pro · Topaz' },
      { k: 'Sound', v: 'Suno v6 · Epidemic Sound' },
    ],
  },
  process: {
    title: 'S2-A → S2-B 통로',
    script: '대본 개고본 · 1쪽 · S#2 끝 → S#3',
    src: '5 후보 A',
    range: [CUT.a, CUT.end],
    excerpt: [
      /* 0 */ { t: 'act', s: '정차하는 리무진. 문이 열리면 회장이 비서의 다리를 손으로 흩으며 내린다.' },
      /* 1 */ { t: 'act', s: '그 모습을 발견한 서진. 잠시 회장의 뒷모습을 보다가 따라 내리고 -' },
      /* 2 */ { t: 'scene', s: 'INT. 은행 통로 / D' },
      /* 3 */ { t: 'act', s: '청원 경찰들이 문을 열어주면 – 안으로 향하는 셋.' },
      /* 4 */ { t: 'dia', who: '회장', s: '한강의 기적? 그거 다 우리가 만든 거야. 나머지는 그냥 따라온 거고...' },
      /* 5 */ { t: 'act', s: '그 순간, 손이 뒷주머니로 향하는 서진. 곧바로 울리는 총성. 쓰러지는 회장. 총성에 놀란 청원 경찰들이 달려오는데, 서진이 옆에 있던 비상 버튼을 누르자 문이 폐쇄되고 -' },
      /* 6 */ { t: 'dia', who: '선희(아무렇지 않은)', s: '인질로 쓰는 거 아니었어?' },
      /* 7 */ { t: 'act', s: '선희가 긴 생머리의 가발을 벗으면 칼단발, 외투를 벗으면, 검은 나시 사이로 문신이 보인다. 서진은 선희에게 키스하고 -' },
      /* 8 */ { t: 'dia', who: '서진(미소)', s: '그냥, 짜증 나서.' },
      /* 9 */ { t: 'act', s: '그들이 가방에서 장비를 챙겨, 은행 안으로 들어가면 -' },
    ],
    stages: [
      {
        key: 'plan',
        chips: ['EP.1 의 S#2 · S#3', '1986 현재 구간의 끝 → 「3년 전」 회상 진입', '완성본 4:47 중 0:16 ~ 0:35 (첫 1분 안)'],
        lit: [0, 7, 8],
        text: {
          label: '작품 설명 · 인물 소개(한서진) — 작가 집필',
          lines: [
            { t: '투자자와 비서가 외투를 벗자 같은 문신이 보인다.', src: '1-1 작품 설명' },
            { t: '회장은 인질로 쓸 대상이었는데, 차에서 내리던 회장의 손이 선희의 다리를 훑었다.', src: '1-4 인물 소개 · 한서진' },
            { t: '왜 쐈냐고 묻는 선희에게 준 답은 한 줄이었다.', src: '1-4 인물 소개 · 한서진' },
          ],
        },
        bar: {
          label: '완성본 4:47 · EP.1',
          segs: [
            { a: 0, b: CUT.a, time: '0:00–0:16', name: 'S#1 · S#2' },
            { a: CUT.a, b: CUT.end, time: '0:16–0:35', name: 'S#2 끝 · S#3', here: true },
            { a: CUT.end, b: 287.333, time: '0:35–4:47', name: 'S#4 (회상) ~ S#7' },
          ],
          mark: 'S2-A → S2-B · 완성본 0:16.3 – 0:34.7',
        },
      },
      {
        key: 'script',
        chips: ['2026-09-13 개고본 · 5쪽 중 1쪽', 'S#2 끝 + S#3 전부', '한글(HWP) 작가 집필'],
        lit: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        pics: [{ src: `${M}/fi_script_1.jpg`, cap: '대본 — S#2 끝 · S#3 · S#4 머리', w: 1132, h: 1600, kind: 'script' }],
      },
      {
        key: 'sheet',
        chips: ['변장 · 본모습 인물 시트 4장', 'Midjourney V8.2 → Nano Banana Pro · Seedream 5.0 Pro', 'Blender 프리비즈 · 구도 가이드 영상'],
        lit: [0, 1, 3, 4, 5, 7],
        pics: [
          { src: `${M}/fi_img_1.jpg`, cap: '홍선희 · 비서 변장 시트 — Nano Banana Pro', w: 1600, h: 893, kind: 'sheet' },
          { src: `${M}/fi_img_2.jpg`, cap: '한서진 · 투자자 변장 시트 — Nano Banana Pro', w: 1600, h: 893, kind: 'sheet' },
          { src: `${M}/fi_img_3.jpg`, cap: 'S2-A 프리비즈 스틸(구도 가이드, 문턱 통과 5.3초) — Blender', w: 540, h: 960, kind: 'previs' },
        ],
      },
      {
        key: 'segment',
        chips: ['컷 6개 + 암전 · 18.5초', '9:16 · 720×1280 · 24fps'],
        lit: [0, 1, 3, 4, 5, 6, 7, 8, 9],
        text: {
          label: '작가 연출 메모 · S2-B 컷1 · 컷2 (2026-09-04)',
          lines: [
            { t: '선희 mcu, 선희가 대사 치는데 서진이 다가와서 키스함', src: '1-7 메모 ①', to: 'B1 · B3' },
            { t: '아이앵글로 서진 쪽에서 나란히 통로를 걸어가는 둘 모습', src: '1-7 메모 ①', to: 'B5' },
          ],
        },
        segments: [
          { cut: 'A', size: '와이드 → 백뷰 풀샷 · 원테이크', at: [CUT.a, CUT.k], lines: [0, 1, 3, 4, 5] },
          { cut: '암전', size: '검정', at: [CUT.k, CUT.b1], lines: [] },
          { cut: 'B1', size: '허리 위 단독 · 하이앵글', at: [CUT.b1, CUT.b2], lines: [6] },
          { cut: 'B2', size: 'INS · 하이앵글', at: [CUT.b2, CUT.b3], lines: [7] },
          { cut: 'B3', size: '클로즈업', at: [CUT.b3, CUT.b4], lines: [7, 8] },
          { cut: 'B4', size: '백뷰 투샷 풀샷', at: [CUT.b4, CUT.b5], lines: [7] },
          { cut: 'B5', size: '측면 트래킹 풀샷', at: [CUT.b5, CUT.end], lines: [9] },
        ],
      },
      {
        key: 'generate',
        chips: ['Seedance 2.5 · Higgsfield · WaveSpeed API', 'S2-A — 시트 9장 + 가이드 영상 1 + 대본 → 원테이크 1컷 · 8초', 'S2-B — 시트 8장 + 대본 → 컷 5개 · 10초 한 번에'],
        lit: [0, 1, 3, 4, 5, 6, 7, 8, 9],
        pics: [
          { src: `${M}/fi_gen_1.jpg`, cap: '완성본 0:21.0 · S2-A', w: 720, h: 1280, kind: 'frame' },
          { src: `${M}/fi_gen_2.jpg`, cap: '완성본 0:28.5 · S2-B', w: 720, h: 1280, kind: 'frame' },
        ],
      },
      {
        key: 'edit',
        chips: ['Premiere Pro', '음악 — Suno v6 「Heist in Motion」 · 0:31.9 부터', '효과음 — Epidemic Sound · 철문 셔터 0:23.1 · 문 닫힘 0:34.8'],
        lit: [5, 7, 9],
        strip: {
          a: CUT.a,
          b: CUT.end,
          cuts: [CUT.k, CUT.b1, CUT.b2, CUT.b3, CUT.b4, CUT.b5],
          labels: ['A', '암전', 'B1', 'B2', 'B3', 'B4', 'B5'],
          frames: [1, 2, 3, 4, 5, 6, 7].map((k) => `/media/process/strips/firstimpression_${k}.jpg`),
        },
        capture: '프리미어 프로 · 마스터 시퀀스 화면',
      },
    ],
    pairs: [
      { lines: [5], t: 22.625, pic: { src: `${M}/fi_done_1.jpg`, cap: '완성본 0:22.6', w: 720, h: 1280, kind: 'frame' } },
      { lines: [6], t: 25.75, pic: { src: `${M}/fi_done_2.jpg`, cap: '완성본 0:25.8', w: 720, h: 1280, kind: 'frame' } },
      { lines: [7], t: 33.0, pic: { src: `${M}/fi_done_3.jpg`, cap: '완성본 0:33.0', w: 720, h: 1280, kind: 'frame' } },
    ],
    play: 16,
  },
};
