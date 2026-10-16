/** Production evidence/attribution safeguards; these are not human comprehension tests. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';
const sources=JSON.parse(fs.readFileSync(path.resolve('src/data/media-sources.json'),'utf8'));

const mediaRoot=path.resolve('public/media');
const required={
  oneandonly:['process/oneandonly/test_initial_face.jpg','process/oneandonly/test_revised_back.jpg'],
  firstimpression:['process/firstimpression/test_tattoo_before_kiss.jpg','process/firstimpression/test_kiss_after_tattoo.jpg'],
  butter:['process/butter/world_cathedral_original.jpg','process/butter/world_cathedral_reference.jpg'],
};

test('D-1. 실제 제작 자료의 출처·비율과 지시문 비노출·문제에서 완성본까지 기본 접근',async({page},testInfo)=>{
  testInfo.annotations.push({type:'검증 범위',description:'실제 파일 SHA, 이미지 해상도, 공개 문구와 기본 링크의 관찰. 방문자 이해도나 인과 효과를 입증하는 사람 대상 시험이 아님.'});
  for(const [slug,files] of Object.entries(required)){
    await page.goto(`/works/${slug}/`,{waitUntil:'load'});
    const process=page.locator('#process');
    await expect(process.locator('blockquote,[data-author-judgment]')).toHaveCount(0);
    const text=await process.textContent();
    expect(text).not.toMatch(/제작 당시.*지시|수정 지시|김영건의.*지시|자꾸만 서진이가|이러면 무조건/);
    await expect(process.locator('[data-decision-stage]')).toHaveCount(3);
    for(const [index,target] of ['decision-problem','decision-change','decision-result'].entries()){
      const link=process.locator(`.decision-overview a[href="#${target}"]`);
      await expect(link).toHaveCount(1);
      await link.click();
      expect(new URL(page.url()).hash).toBe('#'+target);
      const stage=process.locator('#'+target);
      await expect(stage).toHaveAttribute('data-decision-stage',String(index+1));
      expect((await stage.boundingBox())!.y).toBeLessThan(page.viewportSize()!.height);
    }
    for(const file of files){
      const record=(sources as Record<string,{sha256:string;source:string;w?:number;h?:number;source_sha256:string}>)[file];
      expect(record?.source).toBeTruthy();
      expect(record.source_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(crypto.createHash('sha256').update(fs.readFileSync(path.join(mediaRoot,file))).digest('hex')).toBe(record.sha256);
      const image=process.locator(`[data-production-image] img[src="/media/${file}"]`);
      await expect(image).toHaveCount(1);
      await image.scrollIntoViewIfNeeded();
      await expect.poll(()=>image.evaluate(n=>(n as HTMLImageElement).complete&&(n as HTMLImageElement).naturalWidth>0)).toBe(true);
      const shape=await image.evaluate(n=>{const img=n as HTMLImageElement,r=img.getBoundingClientRect(),b=img.closest('button')!.getBoundingClientRect();return {w:img.naturalWidth,h:img.naturalHeight,ratio:r.width/r.height,inside:r.left>=b.left-1&&r.right<=b.right+1&&r.top>=b.top-1&&r.bottom<=b.bottom+1,hidden:!!img.closest('details:not([open])')}});
      if(record.w)expect(shape.w).toBe(record.w);
      if(record.h)expect(shape.h).toBe(record.h);
      expect(Math.abs(shape.ratio/(shape.w/shape.h)-1)).toBeLessThan(.02);
      expect(shape.inside).toBe(true);
      expect(shape.hidden,'제작 판단의 실제 근거는 기본 화면에서 바로 보임').toBe(false);
    }
    if(slug==='firstimpression'){
      const video=process.locator('[data-process-video]');
      const tattoo=process.getByRole('button',{name:/0:32.*두 문신 공개/});
      await expect(tattoo).toHaveAttribute('data-process-seek','32.5');
      // Absolute final-film time was independently selected from actual frames.
      expect(Number(await video.getAttribute('data-scene-start'))).toBe(25.125);
      await expect(process.locator('[data-choice-seek]')).toHaveCount(0);
    }
  }
});
