/**
 * GlyphMorph — 작가 대본의 음절 수천 자로 짠 오브제. 만년필 → 장면 → 인물 → 인물 → 만년필로 글자가 흩어졌다 모인다. Canvas 2D(WebGL 없음).
 *
 * 따온 곳(docs/sources.md 7절) — 수치는 정밀 분석(_분석/레퍼런스/정밀/*.md)에서:
 *  · zkPass 히어로 「글자로 짠 손」 — 밝기 4층(36.8 : 33.0 : 24.6 : 5.5) · 굵기 400/500/500/600 · 위 두 층 광채(1px .3 / 3px .35 + 7px .4)
 *    · 칸의 일부만 글자(나머지 빈칸이 결) · 오브제 영역 스캔라인. 바꾼 점: 라틴 ASCII 대신 대본 한글 음절, 색은 변수.
 *  · EddyOS 초상 — 커서 밀어내기(반경 120px · smoothstep² · push 0.8×(1−e^(−v/700)) · 오를 때 18/s 내릴 때 5/s · 변위 (8+난수×14)px/max(거리,28))
 *    · 커서 렌즈(가우시안 1/e 54px · 컷 2.5배 · 지나간 자리에 원본 프레임) · 포즈 전환 power2.inOut · 등장 power1.out · 좌우 흔들림 · 30fps 스텝.
 *  · Aaru 「Start with the world」 점 필드 재편성 — 퍼졌다(≈450ms) 다음 형태로 정돈. 점 대신 글자.
 *  · 오리진킷 Vector Wordmark 3 — 지연된 포인터의 앵커 9×9 · 양쪽 핸들(오브제 폭 7.5%, 점 지름 7 · 선 2px) · 각도 = 이동 방향 6/s 최단 호 + ±20° 흔들림(약 7초)
 *    · 숫자 「x%, y%」(mono 11px · .08em · .6, 앵커에서 22px 수직 아래쪽) · 각도 「n°」(오른쪽 핸들 +10, −16).
 *
 * 성능: 음절은 한 번 「층 × 글자」 판(오프스크린 캔버스, 광채 포함)에 찍어 두고 drawImage 로만 찍는다(fillText 없음).
 *       머무는 동안은 정지 그림(형태마다 미리 그린 판) — 커서가 닿은 칸 · 글자 교체 칸만 다시 그린다.
 *       전환 중엔 「떠나는 형태 판(파도처럼 지워짐) + 나는 글자(최대 6.5천) + 도착하는 형태 판(파도처럼 드러남)」 — 전체 칸을 매 프레임 찍지 않는다.
 * 색: 하드코딩 없음 — --glyph-ink(글자색 하나) · --glyph-alphas(4층 투명도, zkPass 실측 .55 .80 .97 1) · --glyph-accent(한 점: 촉 끝 · 앵커 · 핸들) · --glyph-label(숫자).
 */

const ORDER = ['pen', 'sea', 'hanseol', 'smile'];
const LAYER_W = [0, 1, 1, 2];                 // 층 → 굵기 판(400 · 500 · 500 · 600)
const CFG = {
  hold: 2800, holdPen: 3400, morph: 1300, appear: 1250,
  dep: 0.30, arr0: 0.62, arr: 0.30, band: 0.13,   // 떠남 파도 · 도착 파도(전환 진행 비율)
  tick: 1000 / 30, flicker: 0.003,
  cellMin: 4, cellMax: 6,
  maxFly: { xl: 6500, l: 5000, s: 3000 },
  push: { R: 120, up: 18, down: 5, max: 0.8, v0: 700, minD: 28, base: 8, rnd: 14 },
  lens: { r: 54, cut: 2.5, decay: 2.3, step: 10, max: 18 },
  vw: { follow: 6, turn: 6, wob: 20, wobW: 0.9, len: 0.075, anchor: 9, dot: 7, line: 2, label: 22, fadeIn: 150, fadeOut: 300 },
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const inOut2 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);   // GSAP power2.inOut
const out1 = (t) => 1 - (1 - t) * (1 - t);                                           // GSAP power1.out
const out2 = (t) => 1 - Math.pow(1 - t, 3);                                          // GSAP power2.out
function hash(a) {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
}
const rnd01 = (a) => hash(a) / 4294967296;
function hilbert(n, x, y) {
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (!ry) { if (rx) { x = n - 1 - x; y = n - 1 - y; } const t = x; x = y; y = t; }
  }
  return d;
}
function b64(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function loadImage(src) {
  return new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
}
let _cc;
function parseColor(str, fb) {
  _cc = _cc || document.createElement('canvas').getContext('2d');
  _cc.fillStyle = fb; _cc.fillStyle = (str || '').trim() || fb;
  const v = _cc.fillStyle;
  if (v[0] === '#') return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 1];
  const m = v.match(/[\d.]+/g) || [0, 0, 0, 1];
  return [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]];
}
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${(a * c[3]).toFixed(3)})`;
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

export function mountGlyphMorph(root, opts = {}) {
  if (root.glyphMorph) return root.glyphMorph;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const base = opts.base ?? root.dataset.src ?? '';
  const frameUrl = opts.frameUrl ?? ((f) => base + f);

  const stage = root.querySelector('.gm-stage') || root.appendChild(Object.assign(document.createElement('div'), { className: 'gm-stage' }));
  const cvG = stage.querySelector('.gm-glyphs') || stage.appendChild(Object.assign(document.createElement('canvas'), { className: 'gm-glyphs' }));
  const cvO = stage.querySelector('.gm-over') || stage.appendChild(Object.assign(document.createElement('canvas'), { className: 'gm-over' }));
  cvG.setAttribute('aria-hidden', 'true'); cvO.setAttribute('aria-hidden', 'true');
  const g = cvG.getContext('2d');
  const o = cvO.getContext('2d');

  let D = null, atlasImg = null, theme = null;
  let lvKey = '', cols = 0, rows = 0, cell = 5, dpr = 1, cellDev = 5, ts = 5, pad = 2, sz = 9;
  let L = null, sprites = null;
  const statics = new Map();
  let tmpA = null, tmpB = null;
  let cur = 0, prev = -1, mode = 'idle', mt = 0, auto = !reduce;
  let running = false, raf = 0, lastNow = 0, visible = true, onscreen = true, tickN = 0, lastTick = -1;
  let needFull = true, prevRegion = null, tSec = 0;
  const tr = { from: -1, to: 0, dur: CFG.morph, origin: [0, 0], maxD: 1 };
  const stats = { level: '', cell: 0, glyphs: 0, fly: 0, fps: 0, frames: 0, ms: 0 };
  const P = { x: 0, y: 0, in: false, lx: 0, ly: 0, lt: 0, speed: 0, push: 0, moved: false };
  const V = { x: 0, y: 0, px: 0, py: 0, ang: 0, pres: 0, presFrom: 0, presT: 1, presTo: 0, init: false };
  const blobs = []; let lensAcc = 0;
  const frames = {};

  /* ── 색 · 글자 판 ── */
  function readTheme() {
    const cs = getComputedStyle(root);
    const v = (n, fb) => parseColor(cs.getPropertyValue(n), fb);
    const names = ['--glyph-ink', '--glyph-alphas', '--glyph-accent', '--glyph-label', '--glyph-bg'];
    const ink = v('--glyph-ink', '#F0EFE9');
    const al = (cs.getPropertyValue('--glyph-alphas').trim() || '.55 .80 .97 1').split(/[\s,]+/).map(Number);
    return {
      layer: [0, 1, 2, 3].map((i) => [ink[0], ink[1], ink[2], ink[3] * clamp(al[i] ?? 1, 0, 1)]),
      accent: v('--glyph-accent', '#0090FF'),
      label: v('--glyph-label', 'rgba(240,239,233,.64)'),
      bg: v('--glyph-bg', '#050505'),
      key: names.map((n) => cs.getPropertyValue(n)).join('|'),
    };
  }
  function buildSprites() {
    const AC = D.atlasCols, AR = D.atlasRows, T = D.tile, n = D.glyphs.length;
    ts = Math.max(3, Math.round(cellDev));
    const k = cell / 7;                                    // zkPass 글자 7px 기준 광채를 우리 칸 크기로
    pad = Math.ceil(7 * k * dpr) + 1;
    sz = ts + 2 * pad;
    const bases = D.weights.map((_, w) => {
      const c = canvas(AC * ts, AR * ts), x = c.getContext('2d');
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(atlasImg, 0, w * AR * T, AC * T, AR * T, 0, 0, AC * ts, AR * ts);
      return c;
    });
    sprites = canvas(AC * sz, 4 * AR * sz);
    const sc = sprites.getContext('2d');
    const OFF = sprites.width + sz * 2;
    for (let ly = 0; ly < 4; ly++) {
      const tint = canvas(AC * ts, AR * ts), tc = tint.getContext('2d');
      tc.drawImage(bases[LAYER_W[ly]], 0, 0);
      tc.globalCompositeOperation = 'source-in';
      tc.fillStyle = rgba(theme.layer[ly]); tc.fillRect(0, 0, tint.width, tint.height);
      const glows = ly === 3 ? [[7, 0.4], [3, 0.35]] : ly === 2 ? [[1, 0.3]] : [];
      const lite = theme.layer[3];
      for (let i = 0; i < n; i++) {
        const sx = (i % AC) * ts, sy = ((i / AC) | 0) * ts;
        const dx = (i % AC) * sz + pad, dy = (ly * AR + ((i / AC) | 0)) * sz + pad;
        for (const [r, a] of glows) {                     // 광채만 — 글자는 캔버스 밖에 그리고 그림자만 제자리에
          sc.save();
          sc.shadowColor = `rgba(${lite[0] | 0},${lite[1] | 0},${lite[2] | 0},${a})`;
          sc.shadowBlur = r * k * dpr; sc.shadowOffsetX = OFF;
          sc.drawImage(tint, sx, sy, ts, ts, dx - OFF, dy, ts, ts);
          sc.restore();
        }
        sc.drawImage(tint, sx, sy, ts, ts, dx, dy, ts, ts);
      }
    }
  }
  const sprite = (ctx, gid, ly, x, y) => {
    const AC = D.atlasCols;
    ctx.drawImage(sprites, (gid % AC) * sz, (ly * D.atlasRows + ((gid / AC) | 0)) * sz, sz, sz, x - pad, y - pad, sz, sz);
  };

  /* ── 격자 크기별 구조 ── */
  function buildLevel(key) {
    const [C, R] = D.grids[key];
    const S = D.shapes.length;
    const lv = { key, C, R, cg: [], cl: [], clv: [], list: [], pmap: [], pools: [], M: 0 };
    let maxC = 0;
    for (let s = 0; s < S; s++) {
      const sh = D.shapes[s];
      const cells = b64(sh.cells[key]);
      const pools = D.pools[sh.pool];
      const cg = new Int16Array(C * R).fill(-1), cl = new Uint8Array(C * R), clv = new Uint8Array(C * R);
      const list = [];
      for (let k = 0; k < cells.length; k++) {
        const v = cells[k]; if (!v) continue;
        const l = v >> 4, grp = pools[l - 1];
        cg[k] = grp[(v & 3) % grp.length]; cl[k] = (v >> 2) & 3; clv[k] = l;
        list.push(k);
      }
      const hk = new Map(); for (const k of list) hk.set(k, hilbert(256, k % C, (k / C) | 0));
      list.sort((a, b) => hk.get(a) - hk.get(b));
      lv.cg.push(cg); lv.cl.push(cl); lv.clv.push(clv); lv.list.push(Int32Array.from(list)); lv.pools.push(pools);
      maxC = Math.max(maxC, list.length);
    }
    const M = Math.min(CFG.maxFly[key] || 4000, maxC);
    lv.M = M;
    for (let s = 0; s < S; s++) {
      const list = lv.list[s], c = list.length, pm = new Int32Array(M);
      for (let i = 0; i < M; i++) pm[i] = list[Math.floor((i * c) / M)];
      lv.pmap.push(pm);
    }
    // 나는 글자
    lv.ax = new Float32Array(M); lv.ay = new Float32Array(M); lv.bx = new Float32Array(M); lv.by = new Float32Array(M);
    lv.cx = new Float32Array(M); lv.cy = new Float32Array(M); lv.pd = new Float32Array(M); lv.pa = new Float32Array(M);
    lv.la = new Uint8Array(M); lv.lb = new Uint8Array(M); lv.ga = new Int16Array(M); lv.gb = new Int16Array(M); lv.lvb = new Uint8Array(M);
    stats.fly = M;
    return lv;
  }
  function staticOf(s) {
    let c = statics.get(s);
    if (c) return c;
    c = canvas(cvG.width, cvG.height);
    const x = c.getContext('2d');
    const list = L.list[s], cg = L.cg[s], cl = L.cl[s];
    for (let n = 0; n < list.length; n++) {
      const k = list[n];
      sprite(x, cg[k], cl[k], Math.round((k % cols) * cellDev), Math.round(((k / cols) | 0) * cellDev));
    }
    statics.set(s, c);
    if (statics.size > 3) for (const key of statics.keys()) { if (key !== s && key !== cur && key !== tr.to) { statics.delete(key); break; } }
    return c;
  }

  /* ── 크기 ── */
  function layout() {
    const w = root.clientWidth, h = root.clientHeight;
    if (!w || !h || !D) return false;
    let pick = 's';
    for (const k of ['xl', 'l', 's']) { const [C, R] = D.grids[k]; if (Math.min(w / C, h / R) >= CFG.cellMin) { pick = k; break; } }
    const [C, R] = D.grids[pick];
    const c = Math.min(CFG.cellMax, Math.min(w / C, h / R));
    const nd = Math.min(2, window.devicePixelRatio || 1);
    if (L && pick === lvKey && Math.abs(c - cell) < 0.01 && nd === dpr) return false;
    const levelChanged = pick !== lvKey;
    lvKey = pick; cols = C; rows = R; cell = c; dpr = nd; cellDev = c * nd;
    stats.level = pick; stats.cell = +c.toFixed(2);
    const W = Math.round(C * cellDev), H = Math.round(R * cellDev);
    for (const cv of [cvG, cvO]) { cv.width = W; cv.height = H; }
    tmpA = canvas(W, H); tmpB = canvas(W, H);
    stage.style.width = `${W / dpr}px`; stage.style.height = `${H / dpr}px`;
    if (levelChanged || !L) L = buildLevel(pick);
    statics.clear();
    buildSprites();
    if (mode === 'morph' || mode === 'appear') { mode = auto ? 'hold' : 'idle'; mt = 0; }
    stats.glyphs = L.list[cur].length;
    needFull = true;
    return true;
  }

  /* ── 머무는 동안 ── */
  const tmp = [0, 0];
  function pushOf(k, gx, gy, out) {
    out[0] = 0; out[1] = 0;
    if (P.push < 0.002) return;
    const dx = (gx + 0.5) * cell - P.x, dy = (gy + 0.5) * cell - P.y, d = Math.hypot(dx, dy);
    if (d >= CFG.push.R) return;
    const f = smooth(CFG.push.R, 0, d);
    const m = (f * f * P.push * (CFG.push.base + rnd01(k) * CFG.push.rnd)) / Math.max(d, CFG.push.minD);
    out[0] = (dx * m) / cell; out[1] = (dy * m) / cell;
  }
  function drawHold() {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cvG.width, cvG.height);
    g.drawImage(staticOf(cur), 0, 0);
    needFull = false;
  }
  function drawRegion(c0, r0, c1, r1, withPush) {
    const x0 = Math.round(c0 * cellDev), y0 = Math.round(r0 * cellDev), x1 = Math.round(c1 * cellDev), y1 = Math.round(r1 * cellDev);
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    g.clearRect(x0, y0, x1 - x0, y1 - y0);
    const pc = Math.ceil(pad / cellDev) + 1;
    const cg = L.cg[cur], cl = L.cl[cur];
    for (let r = Math.max(0, r0 - pc); r < Math.min(rows, r1 + pc); r++) {
      for (let c = Math.max(0, c0 - pc); c < Math.min(cols, c1 + pc); c++) {
        const k = r * cols + c;
        if (cg[k] < 0) continue;
        if (withPush) pushOf(k, c, r, tmp); else { tmp[0] = 0; tmp[1] = 0; }
        sprite(g, cg[k], cl[k], Math.round((c + tmp[0]) * cellDev), Math.round((r + tmp[1]) * cellDev));
      }
    }
    g.restore();
  }
  function regionAround(x, y) {
    const r = (CFG.push.R + 24) / cell, gx = x / cell, gy = y / cell;
    return [Math.max(0, Math.floor(gx - r)), Math.max(0, Math.floor(gy - r)), Math.min(cols, Math.ceil(gx + r)), Math.min(rows, Math.ceil(gy + r))];
  }
  function flickerStep() {
    const list = L.list[cur], cg = L.cg[cur], cl = L.cl[cur], clv = L.clv[cur], pools = L.pools[cur];
    const n = Math.ceil(list.length * CFG.flicker);
    for (let m = 0; m < n; m++) {
      const k = list[hash(tickN * 977 + m * 131) % list.length];
      if (cl[k] === 3) continue;                     // 광채 층은 그대로(이웃 광채가 잘리지 않게)
      const grp = pools[clv[k] - 1];
      if (grp.length < 2) continue;
      cg[k] = grp[hash(k + tickN) % grp.length];
      const c = k % cols, r = (k / cols) | 0;
      drawRegion(c, r, c + 1, r + 1, false);
    }
    statics.delete(cur);                              // 다음 전환 때 바뀐 글자로 다시 그림(머무는 동안 보이는 건 위에서 고친 화면)
  }

  /* ── 전환 ── */
  function startMorph(to, dur = CFG.morph, fromDust = false) {
    const from = fromDust ? -1 : cur;
    if (!fromDust && mode === 'morph') { /* 전환 중 다시 부르면 도착 형태부터 */ }
    tr.from = from; tr.to = to; tr.dur = dur;
    const keyF = from >= 0 ? D.shapes[from].key : '', keyT = D.shapes[to].key;
    const O = keyF === 'pen' || keyT === 'pen' ? [D.rig.tip[0] * cols, D.rig.tip[1] * rows] : [cols / 2, rows / 2];
    tr.origin = O;
    tr.maxD = Math.max(...[[0, 0], [cols, 0], [0, rows], [cols, rows]].map(([x, y]) => Math.hypot(x - O[0], y - O[1])));
    const M = L.M, diag = Math.hypot(cols, rows);
    const pmT = L.pmap[to], pmF = from >= 0 ? L.pmap[from] : null;
    for (let i = 0; i < M; i++) {
      const kb = pmT[i];
      const bx = kb % cols, by = (kb / cols) | 0;
      let ax, ay;
      if (pmF) { const ka = pmF[i]; ax = ka % cols; ay = (ka / cols) | 0; L.la[i] = L.cl[from][ka]; L.ga[i] = L.cg[from][ka]; }
      else {
        const a = rnd01(i * 7 + 1) * Math.PI * 2, r = (0.45 + 0.4 * rnd01(i * 13 + 5)) * diag;
        ax = O[0] + Math.cos(a) * r; ay = O[1] + Math.sin(a) * r * 0.8; L.la[i] = 0; L.ga[i] = L.cg[to][kb];
      }
      L.ax[i] = ax; L.ay[i] = ay; L.bx[i] = bx; L.by[i] = by;
      L.lb[i] = L.cl[to][kb]; L.gb[i] = L.cg[to][kb]; L.lvb[i] = L.clv[to][kb];
      const fS = pmF ? Math.hypot(ax - O[0], ay - O[1]) / tr.maxD : 0.15 * rnd01(i * 3 + 7);
      const fT = Math.hypot(bx - O[0], by - O[1]) / tr.maxD;
      L.pd[i] = CFG.dep * fS;
      L.pa[i] = CFG.arr0 + CFG.arr * fT;
      // 휘어 지나가는 점 — 원점에서 바깥쪽 + 난수(Aaru 처럼 한 번 퍼졌다 모인다)
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      let ox = mx - O[0], oy = my - O[1]; const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
      const a = (rnd01(i * 17 + 3) - 0.5) * 2.4, ca = Math.cos(a), sa = Math.sin(a);
      const amp = (0.08 + 0.24 * rnd01(i * 31 + 9)) * diag;
      L.cx[i] = mx + (ox * ca - oy * sa) * amp; L.cy[i] = my + (ox * sa + oy * ca) * amp;
    }
    prev = from; cur = to; mode = fromDust ? 'appear' : 'morph'; mt = 0;
    stats.frames = 0; stats.ms = 0;
    staticOf(to); if (from >= 0) staticOf(from);
    root.dataset.phase = mode;
  }
  function waveMask(ctx, src, r, keepInside) {
    // keepInside=false: 원점에서 r 까지 지움(떠남) · true: r 안쪽만 남김(도착)
    const W = cvG.width, H = cvG.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'copy'; ctx.drawImage(src, 0, 0);
    const ox = tr.origin[0] * cellDev, oy = tr.origin[1] * cellDev, R = Math.max(1, r * cellDev), band = CFG.band * tr.maxD * cellDev;
    const gr = ctx.createRadialGradient(ox, oy, 0, ox, oy, R + band);
    const edge = clamp(R / (R + band), 0, 1);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(edge, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = keepInside ? 'destination-in' : 'destination-out';
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawMorph() {
    const p = clamp(mt / tr.dur, 0, 1);
    const appear = mode === 'appear';
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cvG.width, cvG.height);
    // ① 떠나는 형태 — 원점에서부터 지워진다
    if (tr.from >= 0) {
      const rS = (p / CFG.dep) * tr.maxD - CFG.band * tr.maxD;
      const ta = tmpA.getContext('2d');
      waveMask(ta, staticOf(tr.from), rS, false);
      g.drawImage(tmpA, 0, 0);
    }
    // ② 나는 글자
    const M = L.M, pools = L.pools[cur];
    let lastA = -1;
    for (let i = 0; i < M; i++) {
      const pd = L.pd[i], pa = L.pa[i];
      if (p <= pd || p >= pa + 0.02) continue;
      const u = clamp((p - pd) / (pa - pd), 0, 1);
      const e = appear ? out1(u) : inOut2(u);
      const q = 1 - e;
      const x = q * q * L.ax[i] + 2 * q * e * L.cx[i] + e * e * L.bx[i];
      const y = q * q * L.ay[i] + 2 * q * e * L.cy[i] + e * e * L.by[i];
      let a = 1 - smooth(0.9, 1.0, u);                    // 도착 직전 — 도착 판이 드러나며 넘겨받는다
      if (appear) a *= smooth(0, 0.35, u);
      else a *= 0.55 + 0.45 * Math.abs(Math.cos(Math.PI * u)); // 날아가는 동안 조금 옅어짐
      if (a <= 0.02) continue;
      const qa = Math.round(a * 8) / 8;
      if (qa !== lastA) { g.globalAlpha = qa; lastA = qa; }
      let gid, ly;
      if (u > 0.14 && u < 0.86) {                        // 가운데 구간: 30fps 스텝으로 음절이 뒤섞인다
        const grp = pools[Math.max(0, L.lvb[i] - 1)];
        gid = grp[hash(i * 3 + tickN) % grp.length];
        ly = Math.min(L.la[i], L.lb[i]);
      } else if (u <= 0.14) { gid = L.ga[i]; ly = L.la[i]; } else { gid = L.gb[i]; ly = L.lb[i]; }
      sprite(g, gid, ly, Math.round(x * cellDev), Math.round(y * cellDev));
    }
    g.globalAlpha = 1;
    // ③ 도착하는 형태 — 원점에서부터 드러난다
    const rT = ((p - CFG.arr0) / CFG.arr) * tr.maxD + CFG.band * tr.maxD * 0.5;
    if (rT > 0) {
      const tb = tmpB.getContext('2d');
      waveMask(tb, staticOf(cur), rT, true);
      g.drawImage(tmpB, 0, 0);
    }
    if (p >= 1) arrive();
  }
  function arrive() {
    mode = auto ? 'hold' : 'idle'; mt = 0; needFull = true;
    stats.glyphs = L.list[cur].length;
    if (stats.ms > 200) stats.fps = Math.round((stats.frames * 1000) / stats.ms);
    const sh = D.shapes[cur];
    root.dataset.shape = sh.key; root.dataset.phase = mode;
    root.dispatchEvent(new CustomEvent('glyphmorph:shape', { bubbles: true, detail: { key: sh.key, kind: sh.kind, label: sh.label, source: sh.source, time: sh.time || null } }));
    for (const k of statics.keys()) if (k !== cur) statics.delete(k);
    const next = (cur + 1) % D.shapes.length;
    setTimeout(() => { if (L && mode !== 'morph') staticOf(next); }, 120);   // 다음 형태 판은 머무는 동안 미리
  }

  /* ── 덧그림: 렌즈(장면 · 인물) · 펜 툴 리그(만년필) · 촉 끝 한 점 ── */
  const penIdx = () => D.shapes.findIndex((s) => s.key === 'pen');
  function penness() {
    const pi = penIdx();
    if (mode === 'hold' || mode === 'idle') return cur === pi ? 1 : 0;
    const p = clamp(mt / tr.dur, 0, 1);
    if (cur === pi) return smooth(0.62, 0.95, p);
    if (tr.from === pi) return 1 - smooth(0, 0.25, p);
    return 0;
  }
  function frameFor(s) {
    const sh = D.shapes[s];
    if (!sh.frame) return null;
    if (!frames[sh.frame]) { frames[sh.frame] = { img: null }; loadImage(frameUrl(sh.frame)).then((im) => { frames[sh.frame].img = im; }).catch(() => {}); }
    return frames[sh.frame].img;
  }
  let maskC = null;
  function drawOver() {
    const W = cvO.width, H = cvO.height;
    o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H);
    o.setTransform(dpr, 0, 0, dpr, 0, 0);
    const GW = cols * cell, GH = rows * cell;
    const holding = mode === 'hold' || mode === 'idle';
    // EddyOS 렌즈 — 지나간 자리에 원본 프레임
    const img = holding ? frameFor(cur) : null;
    if (img && blobs.length) {
      if (!maskC) maskC = canvas(W, H);
      if (maskC.width !== W || maskC.height !== H) { maskC.width = W; maskC.height = H; }
      const m = maskC.getContext('2d');
      m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, W, H); m.setTransform(dpr, 0, 0, dpr, 0, 0);
      m.globalCompositeOperation = 'lighter';
      const R = CFG.lens.r, cut = R * CFG.lens.cut;
      for (const b of blobs) {
        const a = smooth(0.02, 0.7, b.d);
        if (a <= 0.003) continue;
        const gr = m.createRadialGradient(b.x, b.y, 0, b.x, b.y, cut);
        for (let s = 0; s <= 6; s++) { const x = s / 6; gr.addColorStop(x, `rgba(255,255,255,${(a * Math.exp(-Math.pow((x * cut) / R, 2))).toFixed(4)})`); }
        m.fillStyle = gr; m.fillRect(b.x - cut, b.y - cut, cut * 2, cut * 2);
      }
      m.globalCompositeOperation = 'source-over';
      const bx = D.shapes[cur].box || [0, 0, 1, 1];
      o.drawImage(img, bx[0] * GW, bx[1] * GH, (bx[2] - bx[0]) * GW, (bx[3] - bx[1]) * GH);
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.globalCompositeOperation = 'destination-in'; o.drawImage(maskC, 0, 0);
      o.globalCompositeOperation = 'source-over';
      o.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const pn = penness();
    if (pn > 0.01) {                                       // 촉 끝 잉크 한 점
      const r = Math.max(2.2, cell * 0.8);
      o.fillStyle = rgba(theme.accent, pn);
      const dot = D.rig.dot || D.rig.tip;
      o.beginPath(); o.arc(dot[0] * GW, dot[1] * GH, r, 0, Math.PI * 2); o.fill();
    }
    if (pn > 0.01 && V.pres > 0.003) drawRig(GW, GH, pn * V.pres);
  }
  // 오리진킷 Vector Wordmark 3 — 앵커 · 핸들 · 좌표 · 각도
  function drawRig(GW, GH, a) {
    const vw = CFG.vw;
    const len = vw.len * GW;
    const ang = V.ang + (vw.wob * Math.PI / 180) * Math.sin(vw.wobW * tSec);
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const x = V.x, y = V.y;
    const h1 = [x - ux * len, y - uy * len], h2 = [x + ux * len, y + uy * len];
    o.save();
    o.globalAlpha = a;
    o.strokeStyle = rgba(theme.accent, 0.85); o.fillStyle = rgba(theme.accent, 0.85);
    o.lineWidth = vw.line; o.lineCap = 'round';
    o.beginPath(); o.moveTo(h1[0], h1[1]); o.lineTo(h2[0], h2[1]); o.stroke();
    for (const h of [h1, h2]) { o.beginPath(); o.arc(h[0], h[1], vw.dot / 2, 0, Math.PI * 2); o.fill(); }
    o.fillRect(Math.round(x - vw.anchor / 2), Math.round(y - vw.anchor / 2), vw.anchor, vw.anchor);
    // 숫자 — 글자 결 위에서도 읽히게 바탕색 칩을 깐다
    o.font = '400 11px "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    if ('letterSpacing' in o) o.letterSpacing = '0.88px';
    o.textBaseline = 'middle';
    const chip = (txt, cx, cy, align) => {
      const w = o.measureText(txt).width;
      const x0 = align === 'center' ? cx - w / 2 : cx;
      o.fillStyle = rgba(theme.bg, 0.82);
      o.fillRect(Math.round(x0 - 3), Math.round(cy - 8), Math.ceil(w + 6), 16);
      o.fillStyle = rgba(theme.label);
      o.textAlign = 'left';
      o.fillText(txt, x0, cy + 0.5);
    };
    let nx = -uy, ny = ux; if (ny < 0) { nx = -nx; ny = -ny; }        // 직선에 수직 — 화면 아래쪽
    const xp = Math.round(clamp(x / GW, 0, 1) * 100), yp = Math.round(clamp(1 - y / GH, 0, 1) * 100);
    chip(`${xp}, ${yp}`, x + nx * vw.label, y + ny * vw.label, 'center');
    const deg = Math.round(((-ang * 180) / Math.PI) % 360 + 360) % 360;
    const right = h2[0] >= h1[0] ? h2 : h1;
    chip(`${deg}°`, right[0] + 10, right[1] - 16 + 6, 'left');
    o.restore();
  }

  /* ── 커서 ── */
  function stageAngle() {
    const t = getComputedStyle(stage).transform;
    const m = t && t !== 'none' ? t.match(/matrix\(([^)]+)\)/) : null;
    if (!m) return 0;
    const v = m[1].split(',').map(Number);
    return Math.atan2(v[1], v[0]);
  }
  function toLocal(e) {
    const r = root.getBoundingClientRect();
    const w = stage.offsetWidth, h = stage.offsetHeight;
    const scx = r.left + stage.offsetLeft + w / 2, scy = r.top + stage.offsetTop + h / 2;
    const a = -stageAngle(), dx = e.clientX - scx, dy = e.clientY - scy;
    return [dx * Math.cos(a) - dy * Math.sin(a) + w / 2, dx * Math.sin(a) + dy * Math.cos(a) + h / 2];
  }
  function onMove(e) {
    if (e.pointerType === 'touch') return;
    const now = performance.now();
    const [x, y] = toLocal(e);
    if (!P.in) { P.in = true; P.lx = x; P.ly = y; P.lt = now; setPres(1); if (!V.init) { V.x = x; V.y = y; V.px = x; V.py = y; V.init = true; } }
    const dt = Math.max(8, now - P.lt), dist = Math.hypot(x - P.lx, y - P.ly);
    P.speed = (dist / dt) * 1000; P.x = x; P.y = y; P.moved = true;
    if (!reduce && penness() < 0.5) {
      lensAcc += dist;
      if (lensAcc >= CFG.lens.step) { lensAcc = 0; blobs.push({ x, y, d: 0.84 }); if (blobs.length > CFG.lens.max) blobs.shift(); }
    }
    P.lx = x; P.ly = y; P.lt = now;
    kick();
  }
  function onLeave() { P.in = false; P.speed = 0; setPres(0); kick(); }
  function setPres(to) { V.presFrom = V.pres; V.presTo = to; V.presT = 0; }

  /* ── 시간 ── */
  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(50, lastNow ? now - lastNow : 16);
    lastNow = now; tSec += dt / 1000;
    tickN = Math.floor(now / CFG.tick);
    let over = false;
    // EddyOS 밀어내기 세기
    const want = P.in && !reduce ? CFG.push.max * (1 - Math.exp(-P.speed / CFG.push.v0)) : 0;
    const prevPush = P.push;
    P.push += (want - P.push) * (1 - Math.exp(-(want > P.push ? CFG.push.up : CFG.push.down) * dt / 1000));
    if (P.push < 0.002) P.push = 0;
    P.speed *= Math.exp(-dt / 60);
    // VW3 리그: 지연 추종 · 이동 방향 · 나타남/사라짐
    if (V.presT < 1) {
      const d = V.presTo > V.presFrom ? CFG.vw.fadeIn : CFG.vw.fadeOut;
      V.presT = Math.min(1, V.presT + dt / d);
      V.pres = V.presFrom + (V.presTo - V.presFrom) * out2(V.presT);
      over = true;
    }
    if (V.init && P.in) {
      const k = Math.min(1, CFG.vw.follow * dt / 1000);
      V.px = V.x; V.py = V.y;
      V.x += (P.x - V.x) * k; V.y += (P.y - V.y) * k;
      const vx = (V.x - V.px) / (dt / 1000), vy = (V.y - V.py) / (dt / 1000);
      if (Math.hypot(vx, vy) > 20) {
        let dA = Math.atan2(vy, vx) - V.ang;
        dA = Math.atan2(Math.sin(dA), Math.cos(dA));
        V.ang += dA * Math.min(1, CFG.vw.turn * dt / 1000);
      }
    }
    if (penness() > 0 && V.pres > 0.003) over = true;      // 흔들림은 늘 움직인다
    for (let k = blobs.length - 1; k >= 0; k--) { blobs[k].d *= Math.exp(-CFG.lens.decay * dt / 1000); if (blobs[k].d < 0.02) blobs.splice(k, 1); }
    if (blobs.length || P.moved) over = true;

    if (mode === 'morph' || mode === 'appear') {
      mt += dt; stats.frames++; stats.ms += dt;
      drawMorph(); over = true;
    } else {
      if (needFull) { drawHold(); prevRegion = null; }
      if (P.push > 0 || prevPush > 0) {
        const rg = regionAround(P.x, P.y);
        const u = prevRegion ? [Math.min(rg[0], prevRegion[0]), Math.min(rg[1], prevRegion[1]), Math.max(rg[2], prevRegion[2]), Math.max(rg[3], prevRegion[3])] : rg;
        drawRegion(u[0], u[1], u[2], u[3], true);
        prevRegion = P.push > 0 ? rg : null;
      }
      if (mode === 'hold') {
        if (tickN !== lastTick && tickN % 3 === 0 && P.push === 0) flickerStep();
        mt += dt;
        if (auto && mt >= (D.shapes[cur].key === 'pen' ? CFG.holdPen : CFG.hold)) { startMorph((cur + 1) % D.shapes.length); over = true; }
      }
    }
    lastTick = tickN;
    if (over) drawOver();
    P.moved = false;
    raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (running && !raf) { lastNow = 0; raf = requestAnimationFrame(frame); }
    else if (!running && L) { if (needFull) drawHold(); V.pres = V.presTo; if (P.in && V.init) { V.x = P.x; V.y = P.y; } drawOver(); }
  }
  function setRunning() {
    const want = visible && onscreen && !!L && !reduce;
    root.classList.toggle('gm-paused', !want);
    if (want === running) return;
    running = want;
    if (running) { lastNow = 0; raf = raf || requestAnimationFrame(frame); }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  async function init() {
    D = opts.data && typeof opts.data === 'object' ? opts.data : await (await fetch(opts.data || base + 'glyph-data.json')).json();
    atlasImg = await loadImage(opts.atlas || base + 'atlas.png');
    D.shapes.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
    theme = readTheme();
    cur = 0;
    layout();
    if (reduce) {                                         // 움직임 줄이기: 만년필 한 장으로 정지
      mode = 'idle'; drawHold(); drawOver();
      root.dataset.shape = D.shapes[0].key; root.dataset.phase = 'still';
    } else startMorph(0, CFG.appear, true);
    root.classList.add('gm-ready');
    new ResizeObserver(() => { if (layout() && !running) { drawHold(); drawOver(); } }).observe(root);
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; setRunning(); });
    new IntersectionObserver((es) => { onscreen = es[es.length - 1].isIntersecting; setRunning(); }).observe(root);
    const mo = new MutationObserver(() => retheme());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-palette'] });
    if (fine) {
      root.addEventListener('pointermove', onMove, { passive: true });
      root.addEventListener('pointerleave', onLeave, { passive: true });
    }
    setRunning();
  }
  function retheme(force) {
    if (!D || !L) return;
    const t = readTheme();
    if (!force && theme && t.key === theme.key) return;
    theme = t; statics.clear(); buildSprites(); needFull = true;
    if (!running) { drawHold(); drawOver(); }
  }

  const api = {
    stats,
    retheme: () => retheme(true),
    pause() { auto = false; },
    play() { if (!reduce) { auto = true; if (mode === 'idle') { mode = 'hold'; mt = 0; } } },
    goto(key) {
      const s = D ? D.shapes.findIndex((x) => x.key === key) : -1;
      if (s < 0 || reduce || (s === cur && mode !== 'morph')) return;
      startMorph(s); kick();
    },
    get shape() { return D ? D.shapes[cur].key : null; },
    ready: null,
  };
  api.ready = init().catch((err) => { console.warn('[GlyphMorph]', err); root.classList.add('gm-failed'); });
  root.glyphMorph = api;
  return api;
}

export function mountAll(sel = '[data-glyph-morph]') {
  document.querySelectorAll(sel).forEach((el) => mountGlyphMorph(el));
}
