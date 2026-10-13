/**
 * 작품 방 최종 구조 시험 — docs/work-room.md 4절 · docs/contract.md 4절 「W」.
 * 실패하면 사이트를 고친다. 시험을 느슨하게 고치지 않는다.
 *
 * (a) 작가 원문(data-src)은 공백 정규화 후 `_분석/작품과정/<slug>.md` 안에 그대로 있다
 * (b) 개요 사양표의 역할 · 툴 칸이 보인다
 * (c) 과정 패널 6 ↔ 목차 6칸 · 스크롤하면 aria-current 이동 · 왼쪽 종이의 밝은 줄이 그 패널의 줄로 바뀐다
 * (d) 「▶ 이 장면 보기」 → 풀영상 iframe 이 페이지 안에 생기고 src 에 start=<초>
 * (e) [data-confirm] 0
 * (f) 화면 글자에 공모전 · 출품 · 서울드라마어워즈 · 비글루 · OYE 없음
 * (g) 과정 패널 높이 ≤ 화면 높이 × 1.15
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  MAIN_WORKS,
  PROCESS_DOC_DIR,
  PROCESS_READY,
  ROOMS,
  SEL,
  STEPS,
  assertNoProblems,
  pageTexts,
  scrollToStep,
  settle,
  test,
  visit,
} from './helpers';
import type { Page } from '@playwright/test';

const norm = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();

/** 과정 데이터가 없는 작품은 (c) (d) (g) 를 건너뛰고 기록만 남긴다 */
const processWorks = MAIN_WORKS.filter((w) => PROCESS_READY.includes(w.slug));

async function litOf(page: Page) {
  return page.evaluate((sel) => {
    const lines = Array.from(document.querySelectorAll<HTMLElement>(sel));
    const lit = lines.filter((l) => l.classList.contains('is-lit')).map((l) => Number(l.dataset.ppLine));
    // 어둡게 물러난 줄의 실제 불투명도(.38 규칙이 걸렸는지)
    const dim = lines.filter((l) => !l.classList.contains('is-lit')).map((l) => parseFloat(getComputedStyle(l).opacity));
    return { lit: lit.sort((a, b) => a - b), dim, total: lines.length };
  }, SEL.paperLine);
}

test.describe('작품 방 최종 구조(work-room.md 4절)', () => {
  test('W-a. 작가 원문(data-src)은 공백 정규화 후 _분석/작품과정/<slug>.md 안에 그대로 있다', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      const doc = path.join(PROCESS_DOC_DIR, `${w.slug}.md`);
      if (!fs.existsSync(doc)) {
        problems.push(`${p}: 대조 문서 ${doc} 가 없음`);
        continue;
      }
      const md = norm(fs.readFileSync(doc, 'utf8'));
      const st = await visit(page, p);
      if (st !== 200) {
        problems.push(`${p} → HTTP ${st}`);
        continue;
      }
      const items = await page.locator(SEL.verbatim).evaluateAll((els) => els.map((e) => ({ t: e.textContent ?? '', src: e.getAttribute('data-src') ?? '' })));
      if (items.length === 0) problems.push(`${p}: 작가 원문 표시(${SEL.verbatim})가 하나도 없음`);
      if (!items.some((i) => i.src) || (await page.locator(`${SEL.overview} [data-src]`).count()) === 0) problems.push(`${p}: 개요 작품 소개에 원문 표시가 없음`);
      let n = 0;
      for (const i of items) {
        const t = norm(i.t);
        if (!t) {
          problems.push(`${p}: 빈 원문 표시(data-src="${i.src}")`);
          continue;
        }
        n++;
        if (!md.includes(t)) problems.push(`${p}: 「${t.slice(0, 40)}${t.length > 40 ? '…' : ''}」 (data-src="${i.src}") 가 ${w.slug}.md 에 그대로 없음`);
      }
      test.info().annotations.push({ type: '원문 대조', description: `${w.slug} — ${n}개` });
    }
    assertNoProblems('작가 원문 대조', problems);
  });

  test('W-b. 개요 사양표의 역할 · 툴 칸이 보인다', async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      if ((await visit(page, p)) !== 200) {
        problems.push(`${p} → HTTP 오류`);
        continue;
      }
      for (const key of ['role', 'tools']) {
        const cell = page.locator(`${SEL.overview} [data-spec="${key}"]`);
        if ((await cell.count()) !== 1) {
          problems.push(`${p}: ${SEL.overview} [data-spec="${key}"] ${await cell.count()}개 (1개여야 함)`);
          continue;
        }
        await cell.scrollIntoViewIfNeeded();
        const r = await cell.evaluate((el) => {
          const b = el.getBoundingClientRect();
          const vis = el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true } as CheckVisibilityOptions);
          const dd = el.querySelector('dd');
          return { vis, top: b.top, bottom: b.bottom, h: b.height, vh: innerHeight, text: (dd?.textContent ?? '').replace(/\s+/g, ' ').trim() };
        });
        if (!r.vis || r.h < 10) problems.push(`${p}: ${key} 칸이 숨겨짐 · 크기 ${Math.round(r.h)}px`);
        else if (r.top < 0 || r.bottom > r.vh + 1) problems.push(`${p}: ${key} 칸이 화면 밖(y ${Math.round(r.top)}~${Math.round(r.bottom)})`);
        if (r.text.length < 2) problems.push(`${p}: ${key} 칸 값이 비어 있음`);
        if (key === 'tools' && !/Video:/.test(r.text)) problems.push(`${p}: 툴 칸에 「Video:」 접두 줄이 없음 (${r.text.slice(0, 60)})`);
      }
    }
    assertNoProblems(`개요 역할 · 툴 · ${testInfo.project.name}`, problems);
  });

  test('W-c. 과정 패널 6 ↔ 목차 6칸 · 스크롤하면 aria-current 이동 · 왼쪽 종이의 밝은 줄이 그 패널의 줄로 바뀐다', async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const w of MAIN_WORKS.filter((x) => !PROCESS_READY.includes(x.slug))) testInfo.annotations.push({ type: '과정 데이터 없음', description: w.slug });
    for (const w of processWorks) {
      const p = `/works/${w.slug}/`;
      if ((await visit(page, p)) !== 200) {
        problems.push(`${p} → HTTP 오류`);
        continue;
      }
      await settle(page, 400);
      const shape = await page.evaluate(
        ([tocSel, itemSel, stepSel]) => ({
          items: Array.from(document.querySelectorAll<HTMLElement>(`${tocSel} ${itemSel}`)).map((e) => e.dataset.tocItem ?? ''),
          steps: Array.from(document.querySelectorAll<HTMLElement>(`[data-process] ${stepSel}`)).map((e) => ({ key: e.dataset.step ?? '', lit: e.dataset.lit ?? '' })),
        }),
        [SEL.toc, SEL.tocItem, SEL.step],
      );
      if (shape.items.length !== 6 || JSON.stringify(shape.items) !== JSON.stringify([...STEPS])) problems.push(`${p}: 목차 칸 [${shape.items.join(', ')}] (6칸 · ${STEPS.join(' → ')} 여야 함)`);
      if (shape.steps.length !== 6 || JSON.stringify(shape.steps.map((s) => s.key)) !== JSON.stringify([...STEPS])) problems.push(`${p}: 과정 패널 [${shape.steps.map((s) => s.key).join(', ')}] (6개여야 함)`);
      if (shape.steps.length !== 6) continue;

      const seen = new Set<string>();
      for (const s of [...shape.steps, ...[...shape.steps].reverse()]) {
        await page.evaluate(scrollToStep, s.key);
        const want = s.lit.split(',').filter(Boolean).map(Number).sort((a, b) => a - b);
        const end = Date.now() + 2_500;
        let cur: string[] = [];
        let got = { lit: [] as number[], dim: [] as number[], total: 0 };
        let ok = false;
        while (Date.now() < end) {
          await page.waitForTimeout(150);
          cur = await page.evaluate((sel) => Array.from(document.querySelectorAll<HTMLElement>(sel)).filter((e) => e.getAttribute('aria-current') === 'step').map((e) => e.dataset.tocItem ?? ''), `${SEL.toc} ${SEL.tocItem}`);
          got = await litOf(page);
          if (cur.length === 1 && cur[0] === s.key && JSON.stringify(got.lit) === JSON.stringify(want)) {
            ok = true;
            break;
          }
        }
        if (!ok) problems.push(`${p}: 패널 ${s.key} 를 보는데 aria-current=[${cur.join(', ') || '없음'}] · 밝은 줄 [${got.lit.join(',')}] (기대 [${want.join(',')}])`);
        else {
          seen.add(got.lit.join(','));
          // 밝지 않은 줄은 물러난다(.38 — 후킹 종이와 같은 규칙). 바뀌는 데 .35s 전환이 있어 끝난 뒤에 잰다
          await page.waitForTimeout(500);
          const settled = await litOf(page);
          if (settled.dim.some((o) => o > 0.5)) problems.push(`${p}: 패널 ${s.key} — 밝지 않은 줄의 불투명도 ${Math.max(...settled.dim)} (물러나야 함)`);
        }
      }
      if (seen.size < 2) problems.push(`${p}: 패널을 넘겨도 왼쪽 종이의 밝은 줄이 바뀌지 않음(${[...seen].join(' | ')})`);
    }
    assertNoProblems(`과정 목차 · 종이 밝힘 · ${testInfo.project.name}`, problems);
  });

  test('W-d. 「▶ 이 장면 보기」를 누르면 풀영상 iframe 이 페이지 안에 생기고 src 에 start=<초>', async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const w of processWorks) {
      const p = `/works/${w.slug}/`;
      if ((await visit(page, p)) !== 200) {
        problems.push(`${p} → HTTP 오류`);
        continue;
      }
      await settle(page, 400);
      const btn = page.locator(SEL.playScene).first();
      if ((await btn.count()) === 0) {
        problems.push(`${p}: ${SEL.playScene} 없음`);
        continue;
      }
      const at = Number(await btn.getAttribute('data-play-at'));
      const urlBefore = page.url();
      let popups = 0;
      const onPopup = () => popups++;
      page.on('popup', onPopup);
      try {
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ timeout: 5_000 });
        const iframe = page.locator(`${SEL.video} iframe[src*="youtube-nocookie.com"]`).first();
        await iframe.waitFor({ state: 'attached', timeout: 3_000 }).catch(() => {});
        if ((await iframe.count()) === 0) problems.push(`${p}: 누른 뒤 ${SEL.video} 안에 youtube-nocookie iframe 이 생기지 않음`);
        else {
          const src = (await iframe.getAttribute('src')) ?? '';
          if (!new RegExp(`[?&]start=${Math.floor(at)}(&|$)`).test(src)) problems.push(`${p}: iframe src 에 start=${Math.floor(at)} 가 없음 (${src})`);
          if (!src.includes(`/embed/${w.yt}`)) problems.push(`${p}: iframe 이 이 작품 영상(${w.yt})이 아님 (${src})`);
          // 영상 자리로 올라온다 — 화면 안에 보인다
          await page.waitForTimeout(900);
          const r = await iframe.evaluate((e) => {
            const b = e.getBoundingClientRect();
            return { top: b.top, bottom: b.bottom, vh: innerHeight };
          });
          if (r.bottom < 0 || r.top > r.vh) problems.push(`${p}: 누른 뒤 풀영상이 화면 밖(y ${Math.round(r.top)}~${Math.round(r.bottom)})`);
        }
        if (page.url() !== urlBefore) problems.push(`${p}: 주소가 바뀜 ${urlBefore} → ${page.url()}`);
        if (popups) problems.push(`${p}: 새 탭/창이 열림`);
      } finally {
        page.off('popup', onPopup);
      }
    }
    assertNoProblems(`이 장면 보기 · ${testInfo.project.name}`, problems);
  });

  test('W-e. [data-confirm](작가 확인 전 표식)이 어느 방에도 없다', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    for (const room of ROOMS) {
      if ((await visit(page, room.path)) !== 200) {
        problems.push(`${room.path} → HTTP 오류`);
        continue;
      }
      const n = await page.locator(SEL.confirm).count();
      if (n) problems.push(`${room.path}: ${SEL.confirm} ${n}개`);
    }
    assertNoProblems('작가 확인 전 표식', problems);
  });

  test('W-f. 화면 글자에 공모전 · 출품 · 서울드라마어워즈 · 비글루 · OYE 가 없다', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    const KO = ['공모전', '출품', '서울드라마어워즈', '비글루'];
    for (const room of ROOMS) {
      if ((await visit(page, room.path)) !== 200) {
        problems.push(`${room.path} → HTTP 오류`);
        continue;
      }
      const texts = await page.evaluate(pageTexts);
      const joined = texts.join('\n');
      const squeezed = joined.replace(/\s+/g, '');
      for (const k of KO) if (squeezed.includes(k)) problems.push(`${room.path}: 「${k}」 — ${texts.find((t) => t.replace(/\s+/g, '').includes(k))?.slice(0, 60)}`);
      if (/(?<![A-Za-z])OYE(?![A-Za-z])/i.test(joined)) problems.push(`${room.path}: 「OYE」`);
    }
    assertNoProblems('공모전 · 출품 낱말', problems);
  });

  test('W-g. 과정 패널 하나의 높이 ≤ 화면 높이 × 1.15', async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const w of processWorks) {
      const p = `/works/${w.slug}/`;
      if ((await visit(page, p)) !== 200) {
        problems.push(`${p} → HTTP 오류`);
        continue;
      }
      // 그림(lazy)을 다 불러 놓고 잰다 — 패널마다 화면으로 데려와 기다림
      for (const key of STEPS) {
        await page.evaluate(scrollToStep, key);
        await page.waitForTimeout(250);
      }
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
      const hs = await page.evaluate((sel) => Array.from(document.querySelectorAll<HTMLElement>(`[data-process] ${sel}`)).map((e) => ({ key: e.dataset.step, h: e.getBoundingClientRect().height, vh: innerHeight })), SEL.step);
      if (hs.length !== 6) problems.push(`${p}: 과정 패널 ${hs.length}개`);
      for (const h of hs) if (h.h > h.vh * 1.15) problems.push(`${p}: 패널 ${h.key} 높이 ${Math.round(h.h)}px > 화면 ${h.vh} × 1.15 = ${Math.round(h.vh * 1.15)}`);
      testInfo.annotations.push({ type: '패널 높이', description: `${w.slug}: ${hs.map((h) => `${h.key} ${Math.round(h.h)}`).join(' · ')}` });
    }
    assertNoProblems(`과정 패널 높이 · ${testInfo.project.name}`, problems);
  });
});
