// 자체 지도 생성기 — 렌더 5단계: 지도 드레싱
// 평지 초록톤 + 숲 + 프레임/나침반/축척바 + 양피지 질감 + 바다 장식
import type { Terrain } from './terrain';
import { extractCoastLoops, chaikin, loopsToPath } from './coast';
import { buildRivers, smoothOpen } from './rivers';

/* ── 양피지 팔레트 ── */
const OCEAN = '#d8cfb6';
const RING = '#bcb193';
const COAST_INK = '#6e6349';
const LAND_BASE = '#cdd0a2';   // 평지 = 은은한 세이지 그린
const BAND_MID = '#d4cda2';    // 고원 평지 — 누런기
const BAND_HILL = '#c8b98f';   // 구릉
const BAND_MTN = '#bfae88';    // 산
const RIVER = '#8fa3ab';
const INK = '#5f543d';         // 장식 공용 잉크
const MTN_FILL = '#cbbc9a';
const TREE_FILL = '#b6c18c';
const OCEAN_DEEP = '#c3c2a8';  // 깊은 바다 — 살짝 어둡고 푸른기
const WAVE_INK = '#7d94a0';
const TUNDRA = '#dad9d0';      // 툰드라 — 회백
const DESERT = '#e0d2a0';      // 사막 — 모래
const MTN_SNOW = '#e7e4da';    // 한랭지 산 = 설산
const SERIF = "Georgia,'Times New Roman',serif";

function polyToPath(poly: [number, number][]): string {
  if (poly.length === 0) return '';
  return (
    poly
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join('') + 'Z'
  );
}

function bandColor(rel: number): string | null {
  if (rel < 0.3) return null;
  if (rel < 0.55) return BAND_MID;
  if (rel < 0.75) return BAND_HILL;
  return BAND_MTN;
}

/* 인덱스 기반 결정적 지터 */
function jitter(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
/* 좌표 격자 기반 결정적 값 (숲 군락용) */
function gridHash(x: number, y: number, salt: number): number {
  const v = Math.sin(Math.floor(x / 85) * 91.7 + Math.floor(y / 85) * 47.3 + salt * 13.7) * 24634.63;
  return v - Math.floor(v);
}

function mountainGlyph(x: number, y: number, s: number, seed = 0): string {
  const lean = (jitter(seed, 51) - 0.5) * 0.5;          // 봉우리 기울기
  const ax = x + lean * s;                               // 정상 x (비대칭)
  const l = x - s, r = x + s;
  const top = y - s * (0.95 + jitter(seed, 52) * 0.25);
  const base = y + s * 0.45;
  // 좌사면 살짝 오목, 우사면 살짝 볼록한 곡선
  const body =
    `M${l.toFixed(1)},${base.toFixed(1)} ` +
    `Q${(l + (ax - l) * 0.55).toFixed(1)},${(base - (base - top) * 0.38).toFixed(1)} ${ax.toFixed(1)},${top.toFixed(1)} ` +
    `Q${(ax + (r - ax) * 0.45).toFixed(1)},${(base - (base - top) * 0.55).toFixed(1)} ${r.toFixed(1)},${base.toFixed(1)}`;
  // 우사면 음영 해칭 2~3줄
  let hatch = '';
  const nH = 2 + (jitter(seed, 53) > 0.5 ? 1 : 0);
  for (let k = 1; k <= nH; k++) {
    const f = k / (nH + 1);
    const hx0 = ax + (r - ax) * f * 0.5;
    const hy0 = top + (base - top) * f * 0.75;
    hatch += `<line x1="${hx0.toFixed(1)}" y1="${hy0.toFixed(1)}" x2="${(hx0 + s * 0.36).toFixed(1)}" y2="${(hy0 + s * 0.3).toFixed(1)}" stroke="${INK}" stroke-width="0.7" stroke-opacity="0.8"/>`;
  }
  // 25% 확률로 작은 곁봉우리
  let sub = '';
  if (jitter(seed, 54) < 0.25) {
    const ss = s * 0.55;
    const sx = x + (lean > 0 ? -1 : 1) * s * 0.7;
    sub = `<path d="M${(sx - ss).toFixed(1)},${base.toFixed(1)} Q${sx.toFixed(1)},${(y - ss).toFixed(1)} ${(sx + ss).toFixed(1)},${base.toFixed(1)}" fill="${MTN_FILL}" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/>`;
  }
  return sub + `<path d="${body}" fill="${MTN_FILL}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>` + hatch;
}

function treeGlyph(x: number, y: number, s: number): string {
  // 캐노피: 원 3개 뭉게 — 1패스 테두리, 2패스 속채움으로 내부선 지움
  const cs: [number, number, number][] = [
    [x - s * 0.8, y - s * 0.75, s * 0.72],
    [x + s * 0.8, y - s * 0.75, s * 0.72],
    [x, y - s * 1.35, s * 0.8]
  ];
  const trunk = `<line x1="${x.toFixed(1)}" y1="${(y + s * 0.7).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y - s * 0.4).toFixed(1)}" stroke="${INK}" stroke-width="0.9"/>`;
  const outline = cs
    .map(([cx, cy, r]) => `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${TREE_FILL}" stroke="${INK}" stroke-width="0.9"/>`)
    .join('');
  const fillOnly = cs
    .map(([cx, cy, r]) => `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r - 0.5).toFixed(1)}" fill="${TREE_FILL}"/>`)
    .join('');
  return trunk + outline + fillOnly;
}

function coniferGlyph(x: number, y: number, s: number): string {
  const w = s * 0.85, h = s * 2.1;
  return (
    `<line x1="${x.toFixed(1)}" y1="${(y + s * 0.6).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${INK}" stroke-width="0.9"/>` +
    `<path d="M${(x - w).toFixed(1)},${y.toFixed(1)} L${x.toFixed(1)},${(y - h).toFixed(1)} L${(x + w).toFixed(1)},${y.toFixed(1)} Z" fill="${TREE_FILL}" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/>`
  );
}

function waveGlyph(x: number, y: number): string {
  const d1 = `M${(x - 9).toFixed(1)},${y.toFixed(1)} q4.5,-4 9,0 q4.5,4 9,0`;
  return `<path d="${d1}" fill="none" stroke="${WAVE_INK}" stroke-width="1" stroke-opacity="0.55" stroke-linecap="round"/>`;
}

function shipGlyph(x: number, y: number): string {
  return (
    `<g stroke="${INK}" stroke-width="1.1" fill="none" stroke-linejoin="round">` +
    `<path d="M${x - 11},${y} q11,7 22,0 l-3,4 h-16 Z" fill="${MTN_FILL}"/>` + // 선체
    `<line x1="${x - 3}" y1="${y}" x2="${x - 3}" y2="${y - 13}"/>` +
    `<path d="M${x - 3},${y - 13} q8,4 8,11 h-8 Z" fill="${OCEAN}"/>` +        // 돛
    `</g>`
  );
}

/** 나침반 (cx, cy 중심, r 반지름) */
function compassRose(cx: number, cy: number, r: number): string {
  const pt = (a: number, rr: number) =>
    `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  // 8방위 별: 주방위 길게, 간방위 짧게
  let star = '';
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 2;
    star += `<path d="M${pt(a, r * 0.88)} L${pt(a + 0.42, r * 0.18)} L${pt(a - 0.42, r * 0.18)} Z" fill="${INK}"/>`;
    const b = a + Math.PI / 4;
    star += `<path d="M${pt(b, r * 0.5)} L${pt(b + 0.5, r * 0.12)} L${pt(b - 0.5, r * 0.12)} Z" fill="${INK}" fill-opacity="0.55"/>`;
  }
  return (
    `<g>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${OCEAN}" fill-opacity="0.75" stroke="${INK}" stroke-width="1.2"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r * 0.66}" fill="none" stroke="${INK}" stroke-width="0.7" stroke-opacity="0.6"/>` +
    star +
    `<text x="${cx}" y="${cy - r - 6}" text-anchor="middle" font-family="${SERIF}" font-size="${r * 0.5}" font-weight="bold" fill="${INK}">N</text>` +
    `</g>`
  );
}

/** 축척바 (x, y 왼쪽 기준) */
function scaleBar(x: number, y: number, mid = 250): string {
  const seg = 55, n = 4, h = 7;
  let bars = '';
  for (let i = 0; i < n; i++) {
    bars += `<rect x="${x + i * seg}" y="${y}" width="${seg}" height="${h}" fill="${i % 2 ? 'none' : INK}" stroke="${INK}" stroke-width="1"/>`;
  }
  const label = (v: number, lx: number) =>
    `<text x="${lx}" y="${y - 5}" text-anchor="middle" font-family="${SERIF}" font-size="11" fill="${INK}">${v}</text>`;
  return `<g>${bars}${label(0, x)}${label(mid, x + seg * 2)}${label(mid * 2, x + seg * 4)}</g>`;
}

export type RenderOptions = {
  title?: string;
  scale?: 'world' | 'region';
  /** 지정 시 강을 직접 계산하지 않고 이 폴리라인(캔버스 좌표)을 사용 — 세계-지역 정합용 */
  riversOverride?: [number, number][][];
};

export function renderTerrainSvg(t: Terrain, opts: RenderOptions = {}): string {
  const loops = extractCoastLoops(t).map((l) => chaikin(l, 2));
  const coastPath = loopsToPath(loops);

  const maxH = Math.max(...t.heights);
  const rel = (i: number) =>
    (t.heights[i] - t.seaLevel) / Math.max(0.0001, maxH - t.seaLevel);
  const isSea = (i: number) => t.heights[i] < t.seaLevel;

  /* 기온: 위(북)일수록 한랭, 고도 높을수록 한랭 */
  const temp = (i: number) =>
    (t.centers[i][1] / t.height) * 0.95 + 0.03 - rel(i) * 0.3;
  type Biome = 'tundra' | 'desert' | 'grass';
  const biome = (i: number): Biome => {
    if (temp(i) < 0.24) return 'tundra';
    if (temp(i) > 0.66 && t.moisture[i] < 0.42) return 'desert';
    return 'grass';
  };

  /* 바이옴 틴트 + 높이 밴드 (틴트 먼저 → 밴드가 위) */
  const bandPaths: string[] = [];
  for (let i = 0; i < t.polygons.length; i++) {
    if (isSea(i)) continue;
    const b = biome(i);
    if (b === 'grass') continue;
    const d = polyToPath(t.polygons[i]);
    if (d) bandPaths.push(`<path d="${d}" fill="${b === 'tundra' ? TUNDRA : DESERT}"/>`);
  }
  for (let i = 0; i < t.polygons.length; i++) {
    if (isSea(i)) continue;
    let color = bandColor(rel(i));
    if (!color) continue;
    if (biome(i) === 'tundra') color = MTN_SNOW; // 한랭지 고지대 = 만년설 톤
    const d = polyToPath(t.polygons[i]);
    if (d) bandPaths.push(`<path d="${d}" fill="${color}"/>`);
  }

  /* 깊은 바다 셀 (블러로 수심 그라데이션) */
  const deepPaths: string[] = [];
  for (let i = 0; i < t.polygons.length; i++) {
    if (!isSea(i) || t.heights[i] >= t.seaLevel * 0.6) continue;
    const d = polyToPath(t.polygons[i]);
    if (d) deepPaths.push(`<path d="${d}" fill="${OCEAN_DEEP}"/>`);
  }

  /* 강 */
  const riverLines = opts.riversOverride ?? buildRivers(t, opts.scale === 'region' ? 1.8 : 1);
  const riverPaths = riverLines
    .map((r) => {
      const pts = smoothOpen(r, 2);
      // 3구간으로 나눠 굵기 0.9 → 1.6 → 2.4 (수원 가늘게, 하구 굵게)
      const widths = [0.9, 1.6, 2.4];
      const segLen = Math.ceil(pts.length / 3);
      let out = '';
      for (let seg = 0; seg < 3; seg++) {
        const from = Math.max(0, seg * segLen - (seg > 0 ? 1 : 0)); // 이음새 겹침
        const part = pts.slice(from, Math.min(pts.length, (seg + 1) * segLen + 1));
        if (part.length < 2) continue;
        const d = part
          .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
          .join('');
        out += `<path d="${d}" fill="none" stroke="${RIVER}" stroke-width="${widths[seg]}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      return out;
    })
    .join('');

  /* 숲: 평지~낮은 구릉에 격자 해시로 군락 형성 */
  const forestCells = t.heights
    .map((_, i) => i)
    .filter((i) => {
      if (isSea(i)) return false;
      const r = rel(i);
      if (r < 0.06 || r > 0.42) return false;
      if (biome(i) === 'desert') return false;
      const [cx, cy] = t.centers[i];
      const clusterCut = 0.2 + t.moisture[i] * 0.35; // 습할수록 숲 군락 많이
      return gridHash(cx, cy, 5) < clusterCut && jitter(i, 9) < 0.65;
    })
    .sort((a, b) => t.centers[a][1] - t.centers[b][1]);
  const trees = forestCells
    .map((i) => {
      const [cx, cy] = t.centers[i];
      const jx = (jitter(i, 1) - 0.5) * 10;
      const jy = (jitter(i, 2) - 0.5) * 8;
      const size = 3.2 + jitter(i, 3) * 1.8;
      return temp(i) < 0.34
        ? coniferGlyph(cx + jx, cy + jy, size)
        : treeGlyph(cx + jx, cy + jy, size);
    })
    .join('');

  /* 산 */
  const mtnCells = t.heights
    .map((_, i) => i)
    .filter((i) => !isSea(i) && rel(i) >= 0.48 && jitter(i, 7) < 0.75)
    .sort((a, b) => t.centers[a][1] - t.centers[b][1]);
  const glyphs = mtnCells
    .map((i) => {
      const [cx, cy] = t.centers[i];
      const jx = (jitter(i, 1) - 0.5) * 8;
      const jy = (jitter(i, 2) - 0.5) * 6;
      const s = 6 + rel(i) * 6 + jitter(i, 3) * 2;
      return mountainGlyph(cx + jx, cy + jy, s, i);
    })
    .join('');

  /* 사막 점무늬 */
  const desertDots = t.heights
    .map((_, i) => i)
    .filter((i) => !isSea(i) && biome(i) === 'desert' && jitter(i, 21) < 0.3)
    .map((i) => {
      const [cx, cy] = t.centers[i];
      let dots = '';
      for (let k = 0; k < 3; k++) {
        const dx = (jitter(i, 30 + k) - 0.5) * 16;
        const dy = (jitter(i, 40 + k) - 0.5) * 12;
        dots += `<circle cx="${(cx + dx).toFixed(1)}" cy="${(cy + dy).toFixed(1)}" r="0.9" fill="${INK}" fill-opacity="0.35"/>`;
      }
      return dots;
    })
    .join('');

  /* 바다 장식: 깊은 바다(이웃까지 전부 바다) 셀에 물결, 그중 하나엔 배 */
  const deepSea = t.heights
    .map((_, i) => i)
    .filter(
      (i) =>
        isSea(i) &&
        t.heights[i] < t.seaLevel * 0.6 &&
        t.neighbors[i].every((nb) => isSea(nb)) &&
        jitter(i, 13) < 0.1
    )
    .slice(0, 26);
  let seaDecor = deepSea.map((i) => waveGlyph(t.centers[i][0], t.centers[i][1])).join('');
  if (deepSea.length > 2) {
    const s = deepSea[Math.floor(jitter(deepSea[0], 17) * deepSea.length)];
    seaDecor += shipGlyph(t.centers[s][0], t.centers[s][1] - 4);
  }

  /* 나침반 위치: 네 모서리 중 가장 바다다운 곳 */
  const inset = 78;
  const corners: [number, number][] = [
    [t.width - inset, inset], [inset, inset],
    [inset, t.height - inset - 30] // 우하단은 범례 자리라 제외
  ];
  let bestCorner = corners[0], bestScore = Infinity;
  for (const [ccx, ccy] of corners) {
    let score = 0, cnt = 0;
    for (let i = 0; i < t.centers.length; i++) {
      const [x, y] = t.centers[i];
      if (Math.abs(x - ccx) < 110 && Math.abs(y - ccy) < 110) { score += t.heights[i]; cnt++; }
    }
    const avg = cnt ? score / cnt : 1;
    if (avg < bestScore) { bestScore = avg; bestCorner = [ccx, ccy]; }
  }

  const rings = [10, 19, 30]
    .map(
      (w, i) =>
        `<path d="${coastPath}" fill="none" stroke="${RING}" stroke-width="${w}" stroke-opacity="${0.42 - i * 0.13}" stroke-linejoin="round"/>`
    )
    .join('');

  /* 프레임: 이중선 + 모서리 사각 장식 */
  const f1 = 10, f2 = 18;
  const cornerTick = (x: number, y: number) =>
    `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="${INK}"/>`;
  /* ── 7단계: 카르투슈 · 범례 · 경위선 ── */

  // 경위선: 옅은 격자 (프레임 안쪽)
  const grid: string[] = [];
  const gStep = Math.max(120, Math.round(Math.min(t.width, t.height) / 6));
  for (let gx = gStep; gx < t.width - f2; gx += gStep)
    grid.push(`<line x1="${gx}" y1="${f2}" x2="${gx}" y2="${t.height - f2}"/>`);
  for (let gy = gStep; gy < t.height - f2; gy += gStep)
    grid.push(`<line x1="${f2}" y1="${gy}" x2="${t.width - f2}" y2="${gy}"/>`);
  const graticule = `<g stroke="${INK}" stroke-width="0.7" stroke-opacity="0.09">${grid.join('')}</g>`;

  // 카르투슈: 상단 중앙 제목 띠
  const title = (opts.title ?? '').trim();
  let cartouche = '';
  if (title) {
    const fs = 21;
    const tw = Math.max(120, title.length * fs * 1.05 + 56);
    const th = 46;
    const cx = t.width / 2, cy = f2 + 14;
    const x0 = cx - tw / 2;
    const fl = (dir: number) =>
      `<line x1="${cx + dir * (tw / 2 - 14)}" y1="${cy + th / 2}" x2="${cx + dir * (tw / 2 + 26)}" y2="${cy + th / 2}" stroke="${INK}" stroke-width="1" stroke-opacity="0.5"/>`;
    cartouche =
      `<g>` +
      `<rect x="${x0}" y="${cy}" width="${tw}" height="${th}" rx="6" fill="${OCEAN}" fill-opacity="0.88" stroke="${INK}" stroke-width="1.8"/>` +
      `<rect x="${x0 + 5}" y="${cy + 5}" width="${tw - 10}" height="${th - 10}" rx="4" fill="none" stroke="${INK}" stroke-width="0.7"/>` +
      `<text x="${cx}" y="${cy + th / 2 + fs * 0.36}" text-anchor="middle" font-family="${SERIF}" font-size="${fs}" font-weight="bold" fill="${INK}">${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>` +
      `<path d="M${cx - 8},${cy + th + 7} L${cx},${cy + th + 3} L${cx + 8},${cy + th + 7} L${cx},${cy + th + 11} Z" fill="${INK}" fill-opacity="0.7"/>` +
      fl(-1) + fl(1) +
      `</g>`;
  }

  // 범례: 우하단, 지도에 실제 있는 요소만
  const hasForest = forestCells.length > 0;
  const hasDesert = desertDots.length > 0;
  const hasTundra = bandPaths.some((p2) => p2.includes(TUNDRA));
  const hasRiver = riverPaths.length > 0;
  const legendEntries: { glyph: (x: number, y: number) => string; label: string }[] = [];
  legendEntries.push({ glyph: (x, y) => mountainGlyph(x, y + 3, 5, 2), label: '산지' });
  if (hasForest) legendEntries.push({ glyph: (x, y) => treeGlyph(x, y + 3, 3), label: '숲' });
  if (hasRiver)
    legendEntries.push({
      glyph: (x, y) => `<path d="M${x - 6},${y} q3,-4 6,0 q3,4 6,0" fill="none" stroke="${RIVER}" stroke-width="2" stroke-linecap="round"/>`,
      label: '강'
    });
  if (hasDesert)
    legendEntries.push({
      glyph: (x, y) => `<circle cx="${x - 4}" cy="${y}" r="1.1" fill="${INK}" fill-opacity="0.5"/><circle cx="${x + 1}" cy="${y - 3}" r="1.1" fill="${INK}" fill-opacity="0.5"/><circle cx="${x + 5}" cy="${y + 2}" r="1.1" fill="${INK}" fill-opacity="0.5"/>`,
      label: '사막'
    });
  if (hasTundra)
    legendEntries.push({
      glyph: (x, y) => `<rect x="${x - 6}" y="${y - 5}" width="12" height="10" fill="${TUNDRA}" stroke="${INK}" stroke-width="0.7"/>`,
      label: '툰드라'
    });
  const lgW = 92, lgRow = 21, lgPad = 12;
  const lgH = lgPad * 2 + legendEntries.length * lgRow - 6;
  const lgX = t.width - f2 - lgW - 12, lgY = t.height - f2 - lgH - 12;
  const legend =
    `<g>` +
    `<rect x="${lgX}" y="${lgY}" width="${lgW}" height="${lgH}" rx="5" fill="${OCEAN}" fill-opacity="0.88" stroke="${INK}" stroke-width="1.2"/>` +
    legendEntries
      .map((e, i) => {
        const y = lgY + lgPad + i * lgRow + 4;
        return e.glyph(lgX + 18, y) + `<text x="${lgX + 34}" y="${y + 4}" font-family="${SERIF}" font-size="11" fill="${INK}">${e.label}</text>`;
      })
      .join('') +
    `</g>`;

  const frame =
    `<rect x="${f1}" y="${f1}" width="${t.width - f1 * 2}" height="${t.height - f1 * 2}" fill="none" stroke="${INK}" stroke-width="2.4"/>` +
    `<rect x="${f2}" y="${f2}" width="${t.width - f2 * 2}" height="${t.height - f2 * 2}" fill="none" stroke="${INK}" stroke-width="0.9"/>` +
    cornerTick(f1, f1) + cornerTick(t.width - f1, f1) +
    cornerTick(f1, t.height - f1) + cornerTick(t.width - f1, t.height - f1);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t.width} ${t.height}">` +
    `<defs>` +
    `<clipPath id="land"><path d="${coastPath}" fill-rule="evenodd"/></clipPath>` +
    `<filter id="soften" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="6"/></filter>` +
    `<filter id="paper" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="1" seed="7" stitchTiles="stitch"/>` +
    `<feColorMatrix type="matrix" values="0 0 0 0 0.42 0 0 0 0 0.37 0 0 0 0 0.26 0 0 0 0.07 0"/>` +
    `</filter>` +
    `<radialGradient id="vig" cx="50%" cy="50%" r="72%">` +
    `<stop offset="70%" stop-color="${INK}" stop-opacity="0"/>` +
    `<stop offset="100%" stop-color="${INK}" stop-opacity="0.16"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="${t.width}" height="${t.height}" fill="${OCEAN}"/>` +
    `<g filter="url(#soften)">${deepPaths.join('')}</g>` +
    rings +
    `<path d="${coastPath}" fill="${LAND_BASE}" fill-rule="evenodd"/>` +
    `<g clip-path="url(#land)" filter="url(#soften)">${bandPaths.join('')}</g>` +
    `<g clip-path="url(#land)">${riverPaths}</g>` +
    `<g clip-path="url(#land)">${trees}</g>` +
    `<g clip-path="url(#land)">${desertDots}</g>` +
    `<g clip-path="url(#land)">${glyphs}</g>` +
    `<path d="${coastPath}" fill="none" stroke="${COAST_INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
    graticule +
    seaDecor +
    frame +
    cartouche +
    legend +
    compassRose(bestCorner[0], bestCorner[1], 34) +
    scaleBar(42, t.height - 40, opts.scale === 'region' ? 50 : 250) +
    `<rect width="${t.width}" height="${t.height}" fill="url(#vig)" pointer-events="none"/>` +
    `<rect width="${t.width}" height="${t.height}" filter="url(#paper)" pointer-events="none"/>` +
    `</svg>`
  );
}

/** SVG 문자열 → dataURL */
export function svgToDataUrl(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** SVG dataURL → PNG dataURL (내보내기용, 브라우저 전용) */
export async function svgDataUrlToPng(dataUrl: string, scale = 2): Promise<string> {
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('SVG 로드 실패'));
    img.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth * scale;
  canvas.height = img.naturalHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 미지원');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}
