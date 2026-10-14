/**
 * 404 격자의 장면 12장 — 완성본 프레임(장면 에이전트 10-14 의 public/media/wall/ 에서 404 에 쓰는 것만 남김).
 * v5 에서 작업 벽(DomeGallery)을 걷어 내며 나머지 벽 장면 · wall.json · wall-sources.json 은 저장소 밖 보관 폴더로 옮겼다.
 * 출처: src/data/media-sources.json 의 wall/*.
 */
export type WallTile = { slug: string; src: string; avif: string };

export const WALL_404: WallTile[] = [
  { slug: 'oneandonly', src: '/media/wall/oneandonly_1_720.jpg', avif: '/media/wall/oneandonly_1_360.avif 360w, /media/wall/oneandonly_1_720.avif 720w' },
  { slug: 'firstimpression', src: '/media/wall/firstimpression_1_720.jpg', avif: '/media/wall/firstimpression_1_360.avif 360w, /media/wall/firstimpression_1_720.avif 720w' },
  { slug: 'butter', src: '/media/wall/butter_1_720.jpg', avif: '/media/wall/butter_1_360.avif 360w, /media/wall/butter_1_720.avif 720w' },
  { slug: 'kinetic', src: '/media/wall/kinetic_1_720.jpg', avif: '/media/wall/kinetic_1_360.avif 360w, /media/wall/kinetic_1_720.avif 720w' },
  { slug: 'mindhunter', src: '/media/wall/mindhunter_1_720.jpg', avif: '/media/wall/mindhunter_1_360.avif 360w, /media/wall/mindhunter_1_720.avif 720w' },
  { slug: 'curlyshyll', src: '/media/wall/curlyshyll_1_720.jpg', avif: '/media/wall/curlyshyll_1_360.avif 360w, /media/wall/curlyshyll_1_720.avif 720w' },
  { slug: 'musicvideo', src: '/media/wall/musicvideo_4_720.jpg', avif: '/media/wall/musicvideo_4_360.avif 360w, /media/wall/musicvideo_4_720.avif 720w' },
  { slug: 'oneandonly', src: '/media/wall/oneandonly_2_720.jpg', avif: '/media/wall/oneandonly_2_360.avif 360w, /media/wall/oneandonly_2_720.avif 720w' },
  { slug: 'firstimpression', src: '/media/wall/firstimpression_2_720.jpg', avif: '/media/wall/firstimpression_2_360.avif 360w, /media/wall/firstimpression_2_720.avif 720w' },
  { slug: 'butter', src: '/media/wall/butter_2_720.jpg', avif: '/media/wall/butter_2_360.avif 360w, /media/wall/butter_2_720.avif 720w' },
  { slug: 'kinetic', src: '/media/wall/kinetic_2_720.jpg', avif: '/media/wall/kinetic_2_360.avif 360w, /media/wall/kinetic_2_720.avif 720w' },
  { slug: 'mindhunter', src: '/media/wall/mindhunter_2_720.jpg', avif: '/media/wall/mindhunter_2_360.avif 360w, /media/wall/mindhunter_2_720.avif 720w' },
];
