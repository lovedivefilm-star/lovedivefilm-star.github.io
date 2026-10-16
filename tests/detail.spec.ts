import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';
import { MAIN_WORKS, PROJECT_ROOT, assertNoProblems, settle, test, toCutStep, visit } from './helpers';

test('V-27. 중앙 영상 · 정점 전체와 장면 맥락 · 자료와 글 겹침 없음 · 기본 스크롤 · 전체 읽기 · 건너뛰기', async ({ page }, ti) => {
  const problems: string[] = [];
  const shots = path.join(process.env.QA_SHOTS_DIR ?? path.resolve(PROJECT_ROOT, '../_local/qa-detail/screenshots'), ti.project.name.replace(/^\D+-/, ''));
  fs.mkdirSync(shots, {recursive:true});
  for (const work of MAIN_WORKS) {
    await visit(page, `/works/${work.slug}/`);
    await settle(page, 2400);
    const center = await page.locator('.hero [data-video]').evaluate(el => {
      const r=el.getBoundingClientRect();
      return Math.abs(r.left+r.width/2-document.documentElement.clientWidth/2);
    });
    if (center>1) problems.push(`${work.slug}: 영상 중심이 화면 중심에서 ${center.toFixed(1)}px 벗어남`);
    await page.screenshot({path:path.join(shots, `${work.slug}_01_영상.png`)});
    await toCutStep(page, 1, 1200);
    const c5 = await page.locator('[data-cut5]').count() > 0;
    const paper = page.locator('[data-script-context]');
    const paperBody = paper.locator(c5 ? '[data-paper]' : '.cut-paper-lines');
    const text = await paper.textContent() ?? '';
    if (work.slug==='oneandonly') {
      for (const phrase of ['곧 가마에서 내리는 한 여인.', '정.. 정경부인!', '옆얼굴이 드러난다.', '커지는 동공.', '멈추어라!', '저 자는 내 것이다.']) {
        if (!text.includes(phrase)) problems.push(`오직: 정점/장면 맥락 「${phrase}」 누락`);
      }
      if (await paper.locator(c5 ? '[data-hit] > p' : '[data-focus]').count()!==3) problems.push('오직: 정점 원문 세 줄을 통째로 강조하지 않음');
    }
    // C5는 전체 원문을 큰 종이에 두고 정점으로 스크롤한다. 원문 보존/전체읽기/정밀 기하는 cut5.spec.ts도 검사한다.
    if (!c5) {
      const contextFits = await paperBody.evaluate(el => el.scrollHeight <= el.clientHeight + 1);
      if (!contextFits) problems.push(`${work.slug}: 전체 대본 쪽이 영역에서 잘림`);
    }
    const clipped = await paper.evaluate((el, c5) => {
      const area=el.querySelector(c5 ? '[data-paper]' : '.cut-paper-lines')!.getBoundingClientRect();
      return [...el.querySelectorAll(c5 ? '[data-hit] > p' : '[data-focus]')].some(p=>p.getBoundingClientRect().bottom>area.bottom+1 || p.getBoundingClientRect().top<area.top-1);
    }, c5);
    if (clipped) problems.push(`${work.slug}: 선택 대목이 대본 영역에서 잘림`);
    const start=await page.evaluate(()=>scrollY);
    await page.mouse.move(page.viewportSize().width-20, page.viewportSize().height/2);
    await page.mouse.wheel(0,100);
    await settle(page,600);
    const moved=await page.evaluate(()=>scrollY);
    if (Math.abs(moved-start-100)>10) problems.push(`${work.slug}: 휠 100px에서 문서 ${moved-start}px 이동`);
    await toCutStep(page, 1, 1200);
    const read=paper.locator('[data-read-script]');
    await read.press('Enter');
    await expect(read).toHaveAttribute('aria-pressed','true');
    const readable=await paper.locator(c5 ? '[data-paper] .dim' : '.is-context').first().evaluate(el=>getComputedStyle(el).filter==='none' && parseFloat(getComputedStyle(el).fontSize)>=16);
    if (!readable) problems.push(`${work.slug}: 전체 읽기에서 원문이 흐리거나 16px 미만`);
    if (c5 && !(await paperBody.evaluate(el=>getComputedStyle(el).overflowY==='auto'))) problems.push(`${work.slug}: 전체 읽기의 기본 스크롤이 열리지 않음`);
    await read.press('Enter');
    await page.mouse.click(page.viewportSize().width/2, 130);
    for (const step of [1,2,3,4]) {
      await toCutStep(page,step,1200);
      const caption = await page.locator(c5 ? `[data-cut5] [data-cap="${step}"]` : `[data-stage] [data-cap="${step-1}"]`).evaluate(el=>({opacity:Number(getComputedStyle(el).opacity),visibility:getComputedStyle(el).visibility,text:el.textContent.trim()}));
      if (caption.opacity<.9 || caption.visibility==='hidden' || !caption.text) problems.push(`${work.slug} 단계 ${step}: 연결 설명이 보이지 않음`);
      // 기존 무대의 위치 검증은 유지. C5의 새 열·선·그림 기하는 cut5.spec.ts가 담당한다.
      if (step>=2 && !c5) {
        const overlap=await page.locator('[data-stage]').evaluate(el=> {
          const text=el.querySelector('[data-script-context]').getBoundingClientRect();
          const intersects = r=>Math.min(text.right,r.right)-Math.max(text.left,r.left)>1 && Math.min(text.bottom,r.bottom)-Math.max(text.top,r.top)>1;
          return [...el.querySelectorAll('[data-sheet], [data-frame]')].some(media=>getComputedStyle(media).visibility!=='hidden' && Number(getComputedStyle(media).opacity)>.1 && intersects(media.getBoundingClientRect()));
        });
        if (overlap) problems.push(`${work.slug} 단계 ${step}: 대본과 제작 그림이 겹침`);
      }
      await page.screenshot({path:path.join(shots,`${work.slug}_0${step+1}_과정${step}.png`)});
    }
    await (c5 ? page.locator('[data-cut5] [data-skip]') : page.getByRole('link',{name:'과정 건너뛰기',exact:true})).click();
    await settle(page,700);
    await expect(page).toHaveURL(new RegExp(`#process-end-${work.slug}$`));
    const end=await page.locator(`#process-end-${work.slug}`).evaluate(el=>el.getBoundingClientRect().top);
    if (end>page.viewportSize().height) problems.push(`${work.slug}: 건너뛰기 후 과정 끝에 도착하지 못함`);
  }
  assertNoProblems(`상세 최신 결정 · ${ti.project.name}`, problems);
});

test('V-28. 기존 과정 무대(첫 인상·버터) — 창 크기를 왕복 변경해도 시트의 큰 자리와 연결선이 유지된다', {tag:'@once'}, async ({page},ti)=>{
  const problems: string[]=[];
  // 오직 당신의 것의 시트 격자/이중 연결선 resize 검증은 cut5.spec.ts로 이관했다.
  ti.annotations.push({type:'과정 구조',description:'기존 CutStage resize: 첫 인상·버터 / CutStage5 resize: cut5.spec.ts'});
  for (const work of MAIN_WORKS.filter(work=>work.slug!=='oneandonly')) {
    await page.setViewportSize({width:1440,height:900});
    await visit(page,`/works/${work.slug}/`);
    await settle(page,1600);
    for (const size of [{width:1440,height:900},{width:1280,height:800},{width:1440,height:900}]) {
      await page.setViewportSize(size);
      await settle(page,500);
      await toCutStep(page,2,1200);
      const placement=await page.locator('[data-stage]').evaluate(stage=>{
        const outer=stage.getBoundingClientRect();
        const sheet=stage.querySelector('[data-sheet]').getBoundingClientRect();
        const pad=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter'));
        return {right:Math.abs(sheet.right-(outer.right-pad)),top:Math.abs(sheet.top-(outer.top+outer.height*.16))};
      });
      if (placement.right>2 || placement.top>2) problems.push(`${work.slug} ${size.width}: 시트 오른쪽 ${placement.right.toFixed(1)}px · 위 ${placement.top.toFixed(1)}px 오차`);
      const endpoint=await page.locator('[data-stage]').evaluate(stage=>{
        const line=stage.querySelector('[data-line="1"]');
        const box=stage.querySelector('[data-box="sheet"]').getBoundingClientRect();
        const outer=stage.getBoundingClientRect();
        const x=Number(line.getAttribute('x2'))+outer.left;
        const y=Number(line.getAttribute('y2'))+outer.top;
        return x>=box.left-3 && x<=box.right+3 && y>=box.top-3 && y<=box.bottom+3;
      });
      if (!endpoint) problems.push(`${work.slug} ${size.width}: 연결선이 시트의 해당 영역에 닿지 않음`);
    }
  }
  assertNoProblems('창 크기 변경',problems);
});
