/** Tools confirmed by the author on 2026-10-16. Short flows approved as broadly accurate.
 * MV planning/storyboard and re-editing are supported by the existing production evidence.
 * Research paths and internal production instructions are intentionally kept out of this data. */
export type TechnicalWorkflow={tools:string[];steps:string[]};
export const TECHNICAL_WORKFLOWS:Record<string,TechnicalWorkflow>={
 kinetic:{tools:['After Effects','Photoshop','Premiere Pro'],steps:['그래픽 소스','타이포 애니메이션','편집']},
 mindhunter:{tools:['Illustrator','After Effects','Premiere Pro','Photoshop','Midjourney'],steps:['이미지·그래픽 소스','타이틀 모션','편집']},
 curlyshyll:{tools:['ComfyUI','GPT Image','Seedance','Premiere Pro'],steps:['이미지 생성','Seedance 영상 생성','편집']},
 musicvideo:{tools:['Premiere Pro','Photoshop'],steps:['기획·스토리보드','장면 선별·편집']},
};
