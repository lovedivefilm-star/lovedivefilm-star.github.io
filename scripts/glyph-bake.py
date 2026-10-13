"""
글자 오브제(GlyphMorph) 데이터 굽기 — 형태 넷(만년필 · 장면 · 인물 · 인물)을 「대본 음절 격자」로.

따온 기법(docs/sources.md 7절):
  · zkPass 히어로 「글자로 짠 손」(정밀 분석 `_분석/레퍼런스/정밀/zkPass.md`) — 작은 고정폭 글자 격자 · 글자 종류(잉크 농도)로 명암 ·
    **밝기 4층**(층 비율 36.8 : 33.0 : 24.6 : 5.5, 알파 .55 → .80 → .97 → 1, 굵기 400 → 500 → 500 → 600, 위 두 층에 광채) ·
    **칸의 일부만 글자**(zkPass 전체 22% — 나머지 빈칸이 결을 만든다).
  · EddyOS 글자 · 점 초상 — 사진 밝기를 칸 단위 점/글자로.
  · Aaru 점 필드 재편성 — (움직임은 src/scripts/glyph-morph.js).
  바꾼 점: 라틴 ASCII 램프(. : - = + * # % @) 대신 **작가 대본 원문의 한글 음절**을 잉크 면적으로 줄 세워 쓴다.

출력(public/media/glyph/):
  glyph-data.json  — 격자 크기별 형태 칸(base64) · 음절 램프 · 펜 툴 리그 좌표 · 출처
  atlas.png        — 쓰는 음절을 Pretendard(이 PC 글꼴)로 그린 흰 글자 판(투명 바탕, 칸 TILE px, 굵기 WEIGHTS 마다 한 벌)
  pen.png          — 직접 그린 만년필 그레이스케일(형태 ①의 원본)
  frame_*.jpg      — 완성본 mp4 에서 ffmpeg 로 뽑아 자른 프레임(형태 ② ③ ④ 의 원본)

칸 값 1바이트: 0 = 빈칸, 그 밖 = (밝기 단계 1..15) << 4 | (층 0..3) << 2 | (그 단계 안 음절 번호 0..3)
  → 글자 = pools[풀][단계-1][번호], 층 = zkPass 4층(색 · 굵기 · 광채). 칸 위치 = 값의 순서(행 우선).
  글자를 놓을지(빈칸인지)는 밝기에 비례한 확률을 플로이드-스타인버그 오차 확산으로 정한다(뭉치지 않고 고르게 성긴 결).

실행: python scripts/glyph-bake.py            (완성본이 있으면 프레임부터 다시 뽑는다)
      python scripts/glyph-bake.py --no-extract (저장된 frame_*.jpg 로)
      python scripts/glyph-bake.py --preview DIR   (파이썬으로 그린 확인용 PNG 도 DIR 에)
필요: Python 3 · Pillow · numpy · ffmpeg(프레임 뽑을 때만) · C:\\Windows\\Fonts\\PretendardVariable.ttf
"""
import argparse, base64, collections, json, math, os, random, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "media", "glyph")
DRIVE = r"G:\내 드라이브\포폴 웹사이트 만들기"
SCRIPTS = os.path.join(DRIVE, "_분석", "대본")
FINISHED = os.path.join(DRIVE, "작업물 완성본", "AI 숏드라마")
FONT = r"C:\Windows\Fonts\PretendardVariable.ttf"

# 격자 — 칸은 정사각(한글 음절이 네모라서). 화면에서 칸 4~6px 이 되도록 부품이 크기를 고른다.
GRIDS = {"xl": (176, 144), "l": (128, 105), "s": (72, 59)}
TILE, FSIZE = 20, 18                 # 글자 판 한 칸 · 글자 크기
WEIGHTS = (400, 500, 600)            # 층별 굵기(zkPass 400 · 500 · 500 · 600) — 글자 판을 굵기마다 한 벌씩
MEASURE_W = 500                      # 잉크 농도는 가운데 굵기로 잰다
LEVELS = 15                          # 밝기 단계(값 4비트)
PER_LEVEL = 4                        # 단계마다 음절 몇 개(빈도순)
PUNCT_LEVELS = 2                     # 가장 어두운 단계 = 대본의 문장부호
LAYER_CUM = (0.368, 0.698, 0.944)    # zkPass 층 비율 36.8 : 33.0 : 24.6 : 5.5 의 누적
PUNCT = ".,·…-'\"!?"
T0 = 0.07                            # 이보다 어두운 칸 = 빈칸

# ───────────────────────────── 대본 음절 · 잉크 농도
def read_script(name):
    lines = open(os.path.join(SCRIPTS, name), encoding="utf-8").read().splitlines()
    return "\n".join(l for l in lines if not l.startswith("#"))    # 맨 위 추출 메모(#) 줄은 뺀다

def load_font(w=MEASURE_W):
    f = ImageFont.truetype(FONT, FSIZE)
    f.set_variation_by_axes([w])
    return f

def render_tile(ch, f):
    im = Image.new("L", (TILE, TILE), 0)
    bx = f.getbbox("가")
    oy = (TILE - (bx[3] - bx[1])) / 2 - bx[1]          # 한글 상자를 칸 가운데 — 문장부호는 글줄 위치 그대로
    ImageDraw.Draw(im).text(((TILE - f.getlength(ch)) / 2, oy), ch, fill=255, font=f)
    return im

def build_pools():
    f = load_font()
    texts = {
        "oneandonly": read_script("oneandonly_대본.txt"),
        "butter": read_script("butter_트레일러대본.txt"),
        "firstimpression": read_script("firstimpression_대본.txt"),
    }
    texts["all"] = texts["oneandonly"] + texts["firstimpression"] + texts["butter"]
    counts = {k: collections.Counter(c for c in t if ("\uac00" <= c <= "\ud7a3") or c in PUNCT) for k, t in texts.items()}
    chars = sorted(set().union(*counts.values()))
    dens = {c: float(np.asarray(render_tile(c, f), np.float32).mean() / 255) for c in chars}
    pools = {}
    for k, cnt in counts.items():
        pun = sorted([c for c in cnt if c in PUNCT], key=lambda c: dens[c])
        han = sorted([c for c in cnt if c not in PUNCT], key=lambda c: dens[c])
        levels = []
        for i in range(PUNCT_LEVELS):                   # 어두운 단계: 문장부호를 농도순으로 나눔
            grp = pun[i * len(pun) // PUNCT_LEVELS:(i + 1) * len(pun) // PUNCT_LEVELS] or pun[:1]
            levels.append(sorted(grp, key=lambda c: -cnt[c])[:PER_LEVEL])
        n = LEVELS - PUNCT_LEVELS                       # 나머지: 한글 음절을 농도 분위로 나눠 단계마다 빈도 높은 것부터
        for i in range(n):
            grp = han[i * len(han) // n:(i + 1) * len(han) // n]
            levels.append(sorted(grp, key=lambda c: -cnt[c])[:PER_LEVEL])
        pools[k] = levels
    used = sorted({c for lv in pools.values() for g in lv for c in g}, key=lambda c: dens[c])
    return pools, used, dens, f

def make_atlas(used, cols=32):
    """굵기마다 한 벌 — 위에서부터 WEIGHTS 순서로 rows 줄씩."""
    rows = math.ceil(len(used) / cols)
    at = Image.new("LA", (cols * TILE, rows * TILE * len(WEIGHTS)), (255, 0))
    for wi, w in enumerate(WEIGHTS):
        f = load_font(w)
        for i, c in enumerate(used):
            t = render_tile(c, f)
            tile = Image.merge("LA", (Image.new("L", t.size, 255), t))
            at.paste(tile, ((i % cols) * TILE, (wi * rows + i // cols) * TILE))
    return at, cols, rows

# ───────────────────────────── ① 만년필 — 직접 그림(세로 로컬 좌표에서 그리고 돌려 놓는다)
# 로컬: x 오른쪽, y 아래, 촉 끝 = (0, 0), 몸통은 -y 쪽. 촉 윤곽 = 3차 베지어(오른쪽 반, 왼쪽은 거울) — 명암 그림의 마스크로만 쓴다(윤곽선은 그리지 않는다).
NIB_RIGHT = [
    ((0, 0), (14, -40), (62, -130), (96, -215)),          # 촉 끝 → 배
    ((96, -215), (124, -285), (152, -360), (152, -428)),  # 배 → 어깨
    ((152, -428), (152, -452), (130, -458), (128, -476)), # 어깨 → 목(그립 아래로 들어감)
]
HOLE = ((0, -322), 28)
SLIT_W = 11
SEC, RING, BARREL = (470, 770), (770, 812), 812
SEC_HW = lambda t: 150 - 16 * math.sin(t * math.pi * 0.9) + 14 * t ** 3
PEN_CANVAS = (1408, 1152)                 # 격자 xl 의 8배
PEN_PLACE = dict(tip=(250, 1095), angle=47, scale=1.42)

def bez(p0, p1, p2, p3, n=40):
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2, p3 = map(np.array, (p0, p1, p2, p3))
    return ((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * p1 + 3 * (1 - t) * (t ** 2) * p2 + (t ** 3) * p3

def nib_polygon():
    right = np.vstack([np.concatenate([bez(*s) for s in NIB_RIGHT]), [[128, -560]]])
    left = right[::-1].copy(); left[:, 0] *= -1
    return np.vstack([right, left])

def pen_local():
    W, H = 640, 1560
    ox, oy = W / 2, 1440
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    x = xx - ox; s = -(yy - oy)
    img = np.zeros((H, W), np.float32)
    L = np.array([-0.62, -0.30, 0.72]); L /= np.linalg.norm(L)       # 빛: 왼쪽 위 앞
    Hh = L + np.array([0, 0, 1.0]); Hh /= np.linalg.norm(Hh)

    def cyl(hw, curv=1.0):
        u = np.clip(x / np.maximum(hw, 1) / curv, -0.999, 0.999)
        nz = np.sqrt(1 - u * u)
        return u, np.clip(u * L[0] + nz * L[2], 0, 1), np.clip(u * Hh[0] + nz * Hh[2], 0, 1)

    hw = np.full_like(x, 176.0)                                       # 몸통 — 중간 톤 + 긴 반사줄
    m = (s >= BARREL) & (np.abs(x) <= hw); u, d, sp = cyl(hw)
    img[m] = (0.10 + 0.42 * d + 0.95 * sp ** 60 + 0.22 * np.clip(u, 0, 1) ** 6)[m]
    hw = np.full_like(x, 170.0)                                       # 장식 고리 — 밝은 금속
    m = (s >= RING[0]) & (s < RING[1]) & (np.abs(x) <= hw); u, d, sp = cyl(hw)
    band = 0.85 + 0.15 * np.cos((s - RING[0]) / (RING[1] - RING[0]) * 2 * math.pi)
    img[m] = ((0.30 + 0.55 * d + 0.6 * sp ** 12) * band)[m]
    t = np.clip((s - SEC[0]) / (SEC[1] - SEC[0]), 0, 1)               # 그립 — 어두운 수지, 오목한 허리
    hw = 150 - 16 * np.sin(t * math.pi * 0.9) + 14 * t ** 3
    m = (s >= SEC[0]) & (s < SEC[1]) & (np.abs(x) <= hw); u, d, sp = cyl(hw)
    img[m] = (0.05 + 0.20 * d + 0.9 * sp ** 45 + 0.18 * np.clip(u, 0, 1) ** 5)[m]

    pim = Image.new("L", (W, H), 0)                                    # 촉 — 휘어진 금속판
    ImageDraw.Draw(pim).polygon([(px + ox, py + oy) for px, py in nib_polygon()], fill=255)
    nibm = (np.asarray(pim) > 127) & (s < SEC[0] + 6)
    hwrow = np.zeros(H, np.float32)
    for r in range(H):
        c = np.where(nibm[r])[0]
        if len(c): hwrow[r] = (c.max() - c.min()) / 2
    u, d, sp = cyl(np.broadcast_to(hwrow[:, None], (H, W)), curv=1.25)
    v = 0.16 + 0.50 * d + 1.0 * sp ** 16
    v *= 0.78 + 0.22 * np.clip(1 - s / 480, 0, 1)
    v -= 0.22 * np.clip((s - 400) / 70, 0, 1)
    dd = np.hypot(x, s - 520)
    v = np.where((np.sin(dd / 9.0) > 0.55) & (s > 300) & (s < 455) & (dd > 150), v - 0.20, v)   # 각인
    edge = np.asarray(Image.fromarray((nibm * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(11))) < 128
    v = np.where(edge & nibm, v + 0.30, v)                             # 가장자리 반사
    (hx, hy), hr = HOLE; hs = -hy
    slit = (np.abs(x) <= SLIT_W) & (s >= -2) & (s <= hs)
    hole = np.hypot(x - hx, s - hs) <= hr
    rim = (np.hypot(x - hx, s - hs) <= hr + 9) & ~hole & ((x < 0) | (s > hs))
    v = np.where(rim, v + 0.35, v)
    v = np.where(slit | hole, 0.0, v)
    img[nibm] = v[nibm]
    body = (img > 0) | nibm
    img = np.where(body & ~(slit | hole), np.maximum(img, 0.10), img)        # 그늘진 쪽도 가장 옅은 층으로 남겨 실루엣을 지킨다
    img *= 1 - np.clip((s - 830) / 190, 0, 1) ** 1.5                         # 몸통은 일부만 — 격자 가장자리에 닿기 전에 흩어진다
    return np.clip(img, 0, 1), ((slit | hole) & nibm).astype(np.float32), (ox, oy)

def pen_place():
    cw, ch = PEN_CANVAS; tip = PEN_PLACE["tip"]; ang = PEN_PLACE["angle"]; sc = PEN_PLACE["scale"]
    loc, cut, (ox0, oy0) = pen_local()
    outs = []
    for arr in (loc, cut):
        im = Image.fromarray((arr * 255).astype(np.uint8))
        im = im.resize((int(im.width * sc), int(im.height * sc)), Image.LANCZOS); ox, oy = ox0 * sc, oy0 * sc
        S = int(max(im.width, im.height) * 2.2)
        big = Image.new("L", (S, S), 0); big.paste(im, (int(round(S / 2 - ox)), int(round(S / 2 - oy))))
        rot = big.rotate(-ang, resample=Image.BICUBIC, center=(S / 2, S / 2))
        cv = Image.new("L", (cw, ch), 0); cv.paste(rot, (int(round(tip[0] - S / 2)), int(round(tip[1] - S / 2))))
        outs.append(np.asarray(cv, np.float32) / 255)
    phi = math.radians(ang); c, s_ = math.cos(phi), math.sin(phi)
    def to_norm(px, py):                     # 로컬 → 격자 기준 0..1 좌표
        dx, dy = px * sc, py * sc
        return ((tip[0] + dx * c - dy * s_) / cw, (tip[1] + dx * s_ + dy * c) / ch)
    return outs[0], outs[1], to_norm

def pen_rig(to_norm):
    """촉 끝(잉크 한 점 · 전환 원점) 좌표 — 격자 기준 0..1."""
    return {"tip": [round(float(v), 5) for v in to_norm(0, 0)]}

# ───────────────────────────── ② ③ ④ 완성본 프레임
SHAPES = [
    {   # ① 만년필
        "key": "pen", "kind": "object", "pool": "all", "label": "만년필",
        "source": "직접 그림(Pillow) — 촉 · 숨구멍 · 틈 · 그립 · 고리 · 몸통 일부, 사진 · 생성 없음",
    },
    {   # ② 장면 — 버터! 노을 해변
        "key": "sunset", "kind": "scene", "pool": "butter", "label": "버터! — 노을 해변",
        "video": "트레일러_버터!_김영건.mp4", "t": 16.0, "file": "frame_butter_0016.jpg",
        "crop": (540, 160, 1300, 782),
        "tone": dict(lo=30, hi=99.9, gamma=3.0, clarity=1.0, vignette=(0.95, 1.0, 0.45)),
    },
    {   # ③ 인물 — 오직 당신의 것 한설(한복 · 노을빛 정면)
        "key": "hanseol", "kind": "person", "pool": "oneandonly", "label": "오직 당신의 것 — 한설",
        "video": "오직 당신의 것_EP.01_v1.1.mp4", "t": 172.5, "file": "frame_oneandonly_0252.jpg",
        "crop": (20, 80, 700, 880), "fit": True,
        "tone": dict(lo=2, hi=97, gamma=0.75, clarity=0.6, knee=0.85, knee_slope=0.3, floor=0.16, feather=0.5, vignette=(1.4, 1.02, 0.22),
                     stats_box=(190, 280, 500, 720),
                     poly=[(105, 480), (100, 380), (115, 260), (160, 170), (230, 120), (330, 104), (430, 124), (510, 182), (552, 268), (562, 360),
                           (552, 450), (540, 560), (520, 640), (470, 700), (432, 760), (432, 800), (520, 900), (640, 990), (720, 1040), (720, 1000),
                           (0, 1000), (0, 905), (40, 850), (120, 770), (200, 725), (150, 665), (128, 600)]),
    },
    {   # ④ 인물 — 버터! 웃는 얼굴
        "key": "smile", "kind": "person", "pool": "butter", "label": "버터! — 웃는 얼굴",
        "video": "트레일러_버터!_김영건.mp4", "t": 31.0, "file": "frame_butter_0031.jpg",
        "crop": (520, 138, 1500, 940),
        "tone": dict(lo=2, hi=98, gamma=0.72, clarity=0.5, floor=0.16, feather=0.8, stats_box=(700, 260, 1250, 900), vignette=(1.0, 1.04, 0.32),
                     poly=[(615, 138), (1500, 138), (1560, 300), (1600, 450), (1660, 620), (1700, 800), (1660, 941), (640, 941),
                           (620, 800), (580, 600), (560, 420), (590, 300), (600, 200)]),
    },
]

def extract_frames():
    os.makedirs(OUT, exist_ok=True)
    for sh in SHAPES:
        if "video" not in sh: continue
        src = os.path.join(FINISHED, sh["video"])
        if not os.path.exists(src):
            print("  완성본 없음 — 저장된 프레임을 쓴다:", sh["file"]); continue
        tmp = os.path.join(OUT, "_tmp.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{sh['t']:.3f}", "-i", src, "-frames:v", "1", tmp], check=True)
        Image.open(tmp).convert("RGB").crop(sh["crop"]).save(os.path.join(OUT, sh["file"]), quality=90)
        os.remove(tmp)
        print("  프레임", sh["file"], "←", sh["video"], f"{sh['t']}s")

def luma(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722

def frame_tone(sh, grid, SS=6):
    """자른 프레임 → 격자 밝기(0..1). 좌표(poly · stats_box)는 원 프레임 기준이라 crop 원점을 뺀다."""
    GW, GH = grid
    x0, y0, x1, y1 = sh["crop"]; cfg = sh["tone"]
    crop = Image.open(os.path.join(OUT, sh["file"])).convert("RGB")
    if sh.get("fit"):
        bh = GH; bw = int(round(GH * (x1 - x0) / (y1 - y0))); bx = (GW - bw) // 2
    else:
        bw, bh, bx = GW, GH, 0
    W, H = bw * SS, bh * SS
    rgb = np.asarray(crop.resize((W, H), Image.LANCZOS), np.float32) / 255
    L = luma(rgb)
    sx, sy = W / (x1 - x0), H / (y1 - y0)
    P = lambda px, py: ((px - x0) * sx, (py - y0) * sy)
    pm = None
    if cfg.get("poly"):
        m0 = Image.new("L", (W, H), 0); ImageDraw.Draw(m0).polygon([P(*p) for p in cfg["poly"]], fill=255)
        pm = np.asarray(m0) > 127
    if cfg.get("stats_box"):
        a, b = P(*cfg["stats_box"][:2]); c, d = P(*cfg["stats_box"][2:])
        sb = np.zeros_like(L, bool); sb[int(b):int(d), int(a):int(c)] = True
        pm = sb if pm is None else (pm & sb)
    Ls = L[pm] if pm is not None else L.ravel()                           # 명암 늘이기는 주인공 안에서만 잰다
    lo, hi = np.percentile(Ls, cfg.get("lo", 1)), np.percentile(Ls, cfg.get("hi", 99.5))
    t = np.clip((L - lo) / max(hi - lo, 1e-3), 0, 1)
    if cfg.get("knee"):
        k = cfg["knee"]; t = np.where(t > k, k + (t - k) * cfg.get("knee_slope", 0.4), t)
    t = t ** cfg.get("gamma", 1.0)
    if cfg.get("clarity"):
        bl = np.asarray(Image.fromarray((t * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(SS * cfg.get("clarity_r", 3))), np.float32) / 255
        t = np.clip(t + cfg["clarity"] * (t - bl), 0, 1)
    mask = np.ones_like(t)
    if cfg.get("poly"):                                                   # 주인공 윤곽(직접 그린 다각형) 밖은 비운다
        m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).polygon([P(*p) for p in cfg["poly"]], fill=255)
        mask = np.asarray(m.filter(ImageFilter.GaussianBlur(SS * cfg.get("feather", 0.8))), np.float32) / 255
    if cfg.get("floor"):                                                  # 어두운 머리칼도 가장 옅은 글자로 남겨 윤곽을 지킨다
        t = np.where(mask > 0.5, np.maximum(t, cfg["floor"]), t)
    if cfg.get("vignette"):
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        e = cfg["vignette"]
        dd = np.sqrt((((xx / W) - 0.5) * 2 / e[0]) ** 2 + (((yy / H) - 0.5) * 2 / e[1]) ** 2)
        mask = mask * np.clip((1 - dd) / e[2] + 1, 0, 1) ** 1.5
    t = t * mask
    small = np.asarray(Image.fromarray((np.clip(t, 0, 1) * 255).astype(np.uint8)).resize((bw, bh), Image.BOX), np.float32) / 255
    out = np.zeros((GH, GW), np.float32)
    out[0:bh, bx:bx + bw] = small
    return out

def pen_tone(gray, cut, grid):
    g = np.asarray(Image.fromarray((gray * 255).astype(np.uint8)).resize(grid, Image.BOX), np.float32) / 255
    c = np.asarray(Image.fromarray((cut * 255).astype(np.uint8)).resize(grid, Image.BOX), np.float32) / 255
    t = g ** 0.6
    t[c > 0.28] = 0                                                       # 틈 · 숨구멍은 빈칸으로 또렷하게
    return t

def coverage(t):
    """밝기 → 이 칸에 글자를 놓을 확률. 어두운 데는 성기게, 밝은 데는 촘촘히(zkPass 손: 손가락 빛 = 빽빽한 줄, 그늘 = 점 몇 개)."""
    return np.clip(np.clip((t - T0) / (1 - T0), 0, None) ** 0.62 * 1.1, 0, 1)

def encode(tone, levels, seed):
    rng = random.Random(seed)
    H, W = tone.shape
    e = coverage(tone).astype(np.float64)
    on = np.zeros((H, W), bool)                         # ① 놓을지: 확률을 오차 확산으로 0/1 — 고르게 성긴 배치
    for y in range(H):
        for x in range(W):
            v = e[y, x]
            q = 1.0 if v >= 0.5 else 0.0
            on[y, x] = q > 0 and tone[y, x] >= T0
            err = v - q
            if x + 1 < W: e[y, x + 1] += err * 7 / 16
            if y + 1 < H:
                if x > 0: e[y + 1, x - 1] += err * 3 / 16
                e[y + 1, x] += err * 5 / 16
                if x + 1 < W: e[y + 1, x + 1] += err / 16
    flat = tone.ravel()                                 # ② 층: 놓인 칸을 밝기 순으로 세워 zkPass 비율로 자른다
    idx = np.flatnonzero(on.ravel())
    order = idx[np.argsort(flat[idx], kind="stable")]
    layer = np.zeros(H * W, np.uint8)
    n = len(order)
    for li, cum in enumerate(LAYER_CUM):
        layer[order[int(round(cum * n)):]] = li + 1
    out = np.zeros(H * W, np.uint8)                     # ③ 글자: 밝기 단계 → 그 단계 음절 중 하나
    for k in idx:
        v = flat[k]
        lv = 1 + int(round((min(v, 1) - T0) / (1 - T0) * (LEVELS - 1) + rng.uniform(-0.6, 0.6)))
        lv = min(max(lv, 1), LEVELS)
        out[k] = (lv << 4) | (int(layer[k]) << 2) | rng.randrange(min(4, len(levels[lv - 1])))
    return out

LAYER_ALPHA = (0.30, 0.50, 0.64, 1.0)                    # 확인용 — 사이트에선 CSS 변수(--seat · --seat-low · --seat-text · --light)
def preview_png(cells, grid, pool_levels, cell=5, bg=(5, 5, 5), ink=(240, 239, 233)):
    """확인용(파이썬) — 층 투명도만, 광채 없음. 화면 그대로는 브라우저 스크린샷으로 본다."""
    GW, GH = grid
    img = np.zeros((GH * cell, GW * cell, 3), np.float32); img[:] = bg
    fonts = {w: load_font(w) for w in WEIGHTS}
    cache = {}
    for k, val in enumerate(cells):
        if not val: continue
        lv, ly, j = val >> 4, (val >> 2) & 3, val & 3
        grp = pool_levels[lv - 1]; ch = grp[j % len(grp)]
        w = WEIGHTS[(0, 1, 1, 2)[ly]]
        if (ch, w) not in cache:
            cache[(ch, w)] = np.asarray(render_tile(ch, fonts[w]).resize((cell, cell), Image.LANCZOS), np.float32) / 255
        a = cache[(ch, w)][..., None] * LAYER_ALPHA[ly]
        y, x = divmod(k, GW)
        sl = img[y * cell:(y + 1) * cell, x * cell:(x + 1) * cell]
        sl[:] = sl * (1 - a) + np.array(ink, np.float32) * a
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="파이썬으로 그린 확인용 PNG 를 둘 폴더")
    ap.add_argument("--no-extract", action="store_true")
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    if not a.no_extract: extract_frames()
    pools, used, dens, f = build_pools()
    atlas, cols, arows = make_atlas(used)
    atlas.save(os.path.join(OUT, "atlas.png"), optimize=True)
    gid = {c: i for i, c in enumerate(used)}
    gray, cut, to_norm = pen_place()
    Image.fromarray((gray * 255).astype(np.uint8)).save(os.path.join(OUT, "pen.png"), optimize=True)
    data = {
        "_설명": "GlyphMorph 형태 데이터 — scripts/glyph-bake.py 가 굽는다. cells[격자] = base64(칸마다 1바이트: 0 빈칸, (밝기 단계 1..15)<<4 | (zkPass 층 0..3)<<2 | 그 단계 안 음절 번호 0..3). 글자 = glyphs[pools[풀][단계-1][번호]]. 칸 순서는 행 우선. atlas.png = 굵기(weights)마다 atlasRows 줄씩.",
        "tile": TILE, "atlasCols": cols, "atlasRows": arows, "weights": list(WEIGHTS), "levels": LEVELS,
        "layerRatio": [0.368, 0.330, 0.246, 0.055],
        "glyphs": "".join(used),
        "pools": {k: [[gid[c] for c in g] for g in lv] for k, lv in pools.items()},
        "grids": {k: list(v) for k, v in GRIDS.items()},
        "rig": pen_rig(to_norm),
        "shapes": [],
    }
    stats = {}
    for si, sh in enumerate(SHAPES):
        ent = {k: sh[k] for k in ("key", "kind", "pool", "label", "source") if k in sh}
        if "video" in sh:
            ent["source"] = f"완성본 AI 숏드라마/{sh['video']}"
            ent["time"] = f"{int(sh['t'] // 60):02d}:{sh['t'] % 60:04.1f}"
            ent["frame"] = sh["file"]
            GW, GH = GRIDS["xl"]; x0, y0, x1, y1 = sh["crop"]
            if sh.get("fit"):                      # 커서 렌즈(EddyOS)가 원본 프레임을 겹칠 자리 — 격자 기준 0..1
                bw = round(GH * (x1 - x0) / (y1 - y0)); bx = (GW - bw) // 2
                ent["box"] = [round(bx / GW, 5), 0, round((bx + bw) / GW, 5), 1]
            else:
                ent["box"] = [0, 0, 1, 1]
        ent["cells"] = {}
        for gk, grid in GRIDS.items():
            tone = pen_tone(gray, cut, grid) if sh["key"] == "pen" else frame_tone(sh, grid)
            cells = encode(tone, pools[sh["pool"]], seed=1000 * si + len(gk))
            ent["cells"][gk] = base64.b64encode(cells.tobytes()).decode()
            stats[(sh["key"], gk)] = int((cells > 0).sum())
            if a.preview:
                os.makedirs(a.preview, exist_ok=True)
                preview_png(cells, grid, pools[sh["pool"]]).save(os.path.join(a.preview, f"bake_{sh['key']}_{gk}.png"))
        data["shapes"].append(ent)
    data["counts"] = {gk: max(stats[(s["key"], gk)] for s in SHAPES) for gk in GRIDS}
    with open(os.path.join(OUT, "glyph-data.json"), "w", encoding="utf-8") as fp:
        json.dump(data, fp, ensure_ascii=False, separators=(",", ":"))
    print("글자", len(used), "· 판", atlas.size)
    for (k, gk), n in stats.items():
        C, R = GRIDS[gk]; print(f"  {k:8s} {gk:2s} {n:6d} 자 · 칸의 {100 * n / (C * R):4.1f}%")
    print("저장:", OUT)

if __name__ == "__main__":
    main()
