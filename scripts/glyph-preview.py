r"""
글자 오브제 미리보기 한 파일 만들기 — 사이트 부품(src/scripts/glyph-morph.js)과 같은 엔진 + 데이터를 한 HTML 에 넣는다.
더블클릭(file://)으로도 돈다(데이터 · 글자 판 · 프레임을 data: 로 내장).

실행: python scripts/glyph-preview.py  [출력 경로]
기본 출력: G:\내 드라이브\포폴 웹사이트 만들기\시안\글자오브제\index.html
색: 작가 확정 색(_분석/디자인리서치/색_확정.css)의 :root 변수를 그대로 싣는다(색 바꾸기 단추 없음).
"""
import base64, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA = os.path.join(ROOT, "public", "media", "glyph")
OUT = sys.argv[1] if len(sys.argv) > 1 else r"G:\내 드라이브\포폴 웹사이트 만들기\시안\글자오브제\index.html"
COLORS = r"G:\내 드라이브\포폴 웹사이트 만들기\_분석\디자인리서치\색_확정.css"   # 바탕 #050505 · 글자 #F0EFE9 · 포인트 #0090FF

def b64file(p, mime):
    return f"data:{mime};base64," + base64.b64encode(open(p, "rb").read()).decode()

def main():
    data = json.load(open(os.path.join(MEDIA, "glyph-data.json"), encoding="utf-8"))
    frames = {s["frame"]: b64file(os.path.join(MEDIA, s["frame"]), "image/jpeg") for s in data["shapes"] if s.get("frame")}
    atlas = b64file(os.path.join(MEDIA, "atlas.png"), "image/png")
    engine = open(os.path.join(ROOT, "src", "scripts", "glyph-morph.js"), encoding="utf-8").read()
    engine = re.sub(r"^export\s+", "", engine, flags=re.M)
    tokens = re.search(r":root\s*\{(.*?)\}", open(COLORS, encoding="utf-8").read(), re.S).group(1)
    html = TEMPLATE.replace("/*TOKENS*/", tokens).replace("/*ENGINE*/", engine) \
        .replace("/*DATA*/", json.dumps(data, ensure_ascii=False, separators=(",", ":"))) \
        .replace("/*ATLAS*/", json.dumps(atlas)).replace("/*FRAMES*/", json.dumps(frames))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(html)
    print("미리보기:", OUT, f"{os.path.getsize(OUT) / 1024:.0f}KB")

TEMPLATE = r"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>글자 오브제 — 미리보기</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root {/*TOKENS*/}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { background: var(--curtain); color: var(--light); font-family: "Pretendard Variable", Pretendard, system-ui, sans-serif; overflow: hidden; }
.wrap { position: fixed; inset: 0; display: grid; grid-template-rows: 44px 1fr 56px; }
.bar { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid var(--rule); font: 500 11px/1 "IBM Plex Mono", ui-monospace, monospace; letter-spacing: .08em; color: var(--seat-low); }
.bar b { color: var(--light); font-weight: 500; }
.center { position: relative; display: grid; place-items: center; min-height: 0; }
.slot { width: min(92vw, 900px); height: min(74vh, 700px); }
.foot { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; font: 400 11px/1.4 "IBM Plex Mono", ui-monospace, monospace; color: var(--seat-low); letter-spacing: .04em; }
.cap b { color: var(--light); font-weight: 500; }
.keys kbd { font: inherit; color: var(--light); border: 1px solid var(--rule-strong); padding: 0 4px; }

/* ── 부품(사이트 GlyphMorph.astro 와 같은 규칙) ── */
.glyph-morph {
  --glyph-ink: var(--light); --glyph-alphas: .55 .80 .97 1;   /* 글자 4층 = 글자색 하나의 투명도 단계(zkPass 실측) */
  --glyph-accent: var(--lamp); --glyph-label: var(--seat-text); --glyph-bg: var(--curtain);
  position: relative; width: 100%; height: 100%; min-height: 240px; display: grid; place-items: center; overflow: visible;
}
.glyph-morph .gm-stage { position: relative; transform-origin: 50% 50%; }
.glyph-morph canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.glyph-morph .gm-over { pointer-events: none; }
/* zkPass 오브제 영역 스캔라인(1px 선 · 3px 간격, 2.4%) */
.glyph-morph .gm-stage::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(to bottom, color-mix(in srgb, var(--glyph-ink) 2.4%, transparent) 0 1px, transparent 1px 3px); -webkit-mask-image: radial-gradient(closest-side, #000 55%, transparent); mask-image: radial-gradient(closest-side, #000 55%, transparent); }
@media (prefers-reduced-motion: no-preference) {
  .glyph-morph.gm-ready .gm-stage { animation: gm-breathe 10s ease-in-out infinite alternate; }
  .glyph-morph.gm-paused .gm-stage { animation-play-state: paused; }
}
@keyframes gm-breathe { from { transform: rotate(-3.5deg); } to { transform: rotate(3.5deg); } }
html.no-breathe .glyph-morph .gm-stage { animation: none !important; }
</style>
</head>
<body>
<div class="wrap">
  <div class="bar"><span><b>글자 오브제</b> · 대본 음절로 짠 만년필 → 장면 → 인물</span><span id="stat">—</span></div>
  <div class="center"><div class="slot"><div class="glyph-morph" id="gm" role="img" aria-label="작가의 대본 글자로 짠 만년필 — 글자가 흩어졌다 모여 작품의 장면과 인물이 된다"><div class="gm-stage"><canvas class="gm-glyphs"></canvas><canvas class="gm-over"></canvas></div></div></div></div>
  <div class="foot"><span class="cap" id="cap">—</span><span class="keys"><kbd>→</kbd> 다음 형태 · <kbd>Space</kbd> 멈춤/재생 · 만년필일 때 커서를 올리면 펜 툴 앵커 · 핸들</span></div>
</div>
<script>
/*ENGINE*/

const DATA = /*DATA*/;
const ATLAS = /*ATLAS*/;
const FRAMES = /*FRAMES*/;
const root = document.getElementById('gm');
const api = mountGlyphMorph(root, { data: DATA, atlas: ATLAS, frameUrl: (f) => FRAMES[f] });
const cap = document.getElementById('cap'), stat = document.getElementById('stat');
root.addEventListener('glyphmorph:shape', (e) => {
  const d = e.detail;
  cap.innerHTML = d.time ? `<b>${d.label}</b> · ${d.source} · ${d.time}` : `<b>${d.label}</b> · ${d.source}`;
});
setInterval(() => { const s = api.stats; stat.textContent = `격자 ${s.level.toUpperCase()} · 칸 ${s.cell}px · 글자 ${s.glyphs.toLocaleString()} · 나는 글자 ${s.fly.toLocaleString()}` + (s.fps ? ` · 전환 ${s.fps}fps` : ''); }, 500);
const q = new URLSearchParams(location.search);
if (q.has('still')) document.documentElement.classList.add('no-breathe');
let paused = false;
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { const keys = DATA.shapes.map((s) => s.key); api.goto(keys[(keys.indexOf(api.shape) + 1) % keys.length]); }
  else if (e.key === ' ') { e.preventDefault(); paused = !paused; paused ? api.pause() : api.play(); }
});
window.__gm = api;
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
