// 마을 지도 생성기 — 길을 먼저 깔고, 길가에 건물을 배치한다.
// 지형 생성기(terrain.ts)와 독립. 양피지 렌더 스타일은 공유 느낌으로 자체 정의.

export type VillageOptions = {
  seed: string;
  width?: number;      // 캔버스 (기본 1200×850)
  height?: number;
  density?: number;    // 건물 밀도 0~1 (기본 0.5)
  river?: boolean;     // 마을을 지나는 개천
  walled?: boolean;    // 성벽 두르기
};

export type Road = { pts: [number, number][]; w: number; kind: 'main' | 'branch' | 'path' };
export type Building = {
  x: number; y: number; w: number; h: number; angle: number;
  kind: 'house' | 'inn' | 'shop' | 'temple' | 'barn';
};
export type Field = { x: number; y: number; w: number; h: number; angle: number };

export type Village = {
  width: number;
  height: number;
  roads: Road[];
  buildings: Building[];
  fields: Field[];
  plaza: { x: number; y: number; r: number } | null;
  well: { x: number; y: number } | null;
  river: [number, number][] | null;
  wall: [number, number][] | null;
  seed: string;
};

/* ── 시드 난수 ── */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 폴리라인 위 t(0~1) 지점의 좌표와 진행 방향 */
function onPath(pts: [number, number][], t: number): { p: [number, number]; dir: [number, number] } {
  const total = pts.length - 1;
  const ft = Math.max(0, Math.min(0.999, t)) * total;
  const i = Math.floor(ft);
  const f = ft - i;
  const a = pts[i], b = pts[Math.min(pts.length - 1, i + 1)];
  const p: [number, number] = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return { p, dir: [dx / len, dy / len] };
}

export function generateVillage(opts: VillageOptions): Village {
  const width = opts.width ?? 1200;
  const height = opts.height ?? 850;
  const density = Math.max(0, Math.min(1, opts.density ?? 0.5));
  const rand = mulberry32(hashSeed(opts.seed));

  const cx = width * (0.45 + rand() * 0.1);
  const cy = height * (0.45 + rand() * 0.1);

  /* 1) 간선도로: 마을을 관통하는 큰길 (살짝 굽은 곡선) */
  const mainAngle = (rand() - 0.5) * 0.6; // 대체로 가로 방향
  const mainPts: [number, number][] = [];
  const mainLen = width * 0.92;
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    const along = (t - 0.5) * mainLen;
    const sway = Math.sin(t * Math.PI * 1.4 + rand() * 0.2) * height * 0.06;
    mainPts.push([
      cx + Math.cos(mainAngle) * along - Math.sin(mainAngle) * sway,
      cy + Math.sin(mainAngle) * along + Math.cos(mainAngle) * sway
    ]);
  }
  const roads: Road[] = [{ pts: mainPts, w: 13, kind: 'main' }];

  /* 2) 갈래길: 간선에서 위/아래로 뻗음 */
  const nBranch = 2 + Math.floor(rand() * 3);
  const branchTs: number[] = [];
  for (let b = 0; b < nBranch; b++) {
    const t = 0.2 + (b / Math.max(1, nBranch - 1)) * 0.6 + (rand() - 0.5) * 0.08;
    branchTs.push(t);
    const { p, dir } = onPath(mainPts, t);
    const side = rand() < 0.5 ? 1 : -1;
    const nx = -dir[1] * side, ny = dir[0] * side;
    const len = height * (0.22 + rand() * 0.2);
    const bend = (rand() - 0.5) * 0.5;
    const bp: [number, number][] = [p];
    for (let k = 1; k <= 3; k++) {
      const f = k / 3;
      bp.push([
        p[0] + nx * len * f + dir[0] * bend * len * f * f,
        p[1] + ny * len * f + dir[1] * bend * len * f * f
      ]);
    }
    roads.push({ pts: bp, w: 8, kind: 'branch' });
  }

  /* 3) 광장 + 우물: 간선 중앙 근처 */
  const plazaT = 0.42 + rand() * 0.16;
  const { p: pp } = onPath(mainPts, plazaT);
  const plaza = { x: pp[0], y: pp[1] + (rand() < 0.5 ? -1 : 1) * 46, r: 34 + rand() * 14 };
  const well = { x: plaza.x + (rand() - 0.5) * 12, y: plaza.y + (rand() - 0.5) * 12 };

  /* 4) 개천 (옵션): 마을 한쪽을 비스듬히 지남 */
  let river: [number, number][] | null = null;
  if (opts.river) {
    const startY = height * (0.15 + rand() * 0.2);
    const pts: [number, number][] = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      pts.push([
        -20 + width * 1.05 * t,
        startY + Math.sin(t * 3.1 + rand() * 0.5) * height * 0.1 + t * height * 0.35
      ]);
    }
    river = pts;
  }

  /* 5) 건물: 각 도로를 따라 양옆에 배치 (겹치지 않게) */
  const buildings: Building[] = [];
  const placed: { x: number; y: number; r: number }[] = [];
  const canPlace = (x: number, y: number, r: number) => {
    if (x < 40 || x > width - 40 || y < 40 || y > height - 40) return false;
    // 광장과 겹치지 않게
    if (Math.hypot(x - plaza.x, y - plaza.y) < plaza.r + r + 6) return false;
    // 개천과 겹치지 않게
    if (river) {
      for (const rp of river) if (Math.hypot(x - rp[0], y - rp[1]) < r + 16) return false;
    }
    for (const q of placed) if (Math.hypot(x - q.x, y - q.y) < q.r + r + 7) return false;
    return true;
  };

  const kindOf = (i: number, roadKind: Road['kind']): Building['kind'] => {
    const r = rand();
    if (roadKind === 'main' && r < 0.08) return 'inn';
    if (roadKind === 'main' && r < 0.16) return 'shop';
    if (r < 0.06) return 'temple';
    if (r < 0.16) return 'barn';
    return 'house';
  };

  for (const road of roads) {
    const slots = Math.round((road.kind === 'main' ? 20 : 10) * (0.5 + density));
    for (let s = 0; s < slots; s++) {
      const t = 0.05 + (s / slots) * 0.9 + (rand() - 0.5) * 0.02;
      const { p, dir } = onPath(road.pts, t);
      for (const side of [1, -1]) {
        if (rand() > 0.55 + density * 0.35) continue; // 듬성듬성
        const nx = -dir[1] * side, ny = dir[0] * side;
        const off = road.w * 0.5 + 16 + rand() * 14;
        const bx = p[0] + nx * off;
        const by = p[1] + ny * off;
        const kind = kindOf(s, road.kind);
        const bw = kind === 'barn' ? 26 + rand() * 12 : kind === 'temple' ? 30 + rand() * 8 : 16 + rand() * 12;
        const bh = kind === 'barn' ? 18 + rand() * 8 : kind === 'temple' ? 24 + rand() * 6 : 14 + rand() * 9;
        const rr = Math.max(bw, bh) * 0.6;
        if (!canPlace(bx, by, rr)) continue;
        // 길과 나란히 (길 방향 각도)
        const angle = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI + (rand() - 0.5) * 10;
        buildings.push({ x: bx, y: by, w: bw, h: bh, angle, kind });
        placed.push({ x: bx, y: by, r: rr });
      }
    }
  }

  /* 6) 밭: 마을 외곽 빈 곳에 */
  const fields: Field[] = [];
  const nField = 5 + Math.floor(rand() * 6);
  for (let f = 0; f < nField; f++) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const a = rand() * Math.PI * 2;
      const d = Math.min(width, height) * (0.32 + rand() * 0.16);
      const fx = cx + Math.cos(a) * d;
      const fy = cy + Math.sin(a) * d * 0.8;
      const fw = 55 + rand() * 45, fh = 38 + rand() * 30;
      if (!canPlace(fx, fy, Math.max(fw, fh) * 0.5)) continue;
      fields.push({ x: fx, y: fy, w: fw, h: fh, angle: (rand() - 0.5) * 24 });
      placed.push({ x: fx, y: fy, r: Math.max(fw, fh) * 0.5 });
      break;
    }
  }

  /* 7) 성벽 (옵션): 건물들을 감싸는 다각형 */
  let wall: [number, number][] | null = null;
  if (opts.walled && buildings.length > 0) {
    let maxR = 0;
    for (const b of buildings) maxR = Math.max(maxR, Math.hypot(b.x - cx, b.y - cy));
    const wr = maxR + 42;
    const pts: [number, number][] = [];
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * Math.PI * 2;
      const rr = wr * (0.92 + rand() * 0.16);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.82]);
    }
    wall = pts;
  }

  return { width, height, roads, buildings, fields, plaza, well, river, wall, seed: opts.seed };
}

/* ═══════════ 렌더 ═══════════ */
const PAPER = '#e8e0c8';
const INK = '#4a4030';
const ROAD_FILL = '#d8c9a4';
const ROAD_EDGE = '#a89468';
const BLD_FILL = '#cbbc9a';
const BLD_ROOF = '#b09a72';
const FIELD_FILL = '#d7d9a8';
const WATER = '#8fa3ab';
const PLAZA_FILL = '#ded2b0';

function polyPath(pts: [number, number][], close = true): string {
  if (pts.length === 0) return '';
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('') + (close ? 'Z' : '');
}

/** 건물 글리프: 위에서 본 사각형 + 지붕 능선 */
function buildingGlyph(b: Building): string {
  const hw = b.w / 2, hh = b.h / 2;
  const fill = b.kind === 'temple' ? '#c9b7d4' : b.kind === 'inn' ? '#d6b98f' : b.kind === 'barn' ? '#c2ab84' : BLD_FILL;
  const inner =
    b.kind === 'barn'
      ? `<line x1="${-hw + 2}" y1="0" x2="${hw - 2}" y2="0" stroke="${INK}" stroke-width="0.8" stroke-opacity="0.5"/>`
      : `<line x1="${-hw + 2}" y1="0" x2="${hw - 2}" y2="0" stroke="${BLD_ROOF}" stroke-width="1.6"/>` +
        `<line x1="${-hw + 2}" y1="${-hh + 1.5}" x2="${hw - 2}" y2="${-hh + 1.5}" stroke="${INK}" stroke-width="0.6" stroke-opacity="0.35"/>`;
  const cross =
    b.kind === 'temple'
      ? `<circle cx="0" cy="${-hh - 4}" r="2.4" fill="none" stroke="${INK}" stroke-width="1"/>`
      : '';
  return (
    `<g transform="translate(${b.x.toFixed(1)},${b.y.toFixed(1)}) rotate(${b.angle.toFixed(1)})">` +
    `<rect x="${-hw}" y="${-hh}" width="${b.w}" height="${b.h}" rx="1.5" fill="${fill}" stroke="${INK}" stroke-width="1.1"/>` +
    inner + cross +
    `</g>`
  );
}

/** 밭 글리프: 사각형 + 이랑 선 */
function fieldGlyph(f: Field): string {
  const hw = f.w / 2, hh = f.h / 2;
  let rows = '';
  const n = Math.max(3, Math.round(f.h / 9));
  for (let i = 1; i < n; i++) {
    const y = -hh + (f.h * i) / n;
    rows += `<line x1="${-hw + 2}" y1="${y.toFixed(1)}" x2="${hw - 2}" y2="${y.toFixed(1)}" stroke="${INK}" stroke-width="0.5" stroke-opacity="0.35"/>`;
  }
  return (
    `<g transform="translate(${f.x.toFixed(1)},${f.y.toFixed(1)}) rotate(${f.angle.toFixed(1)})">` +
    `<rect x="${-hw}" y="${-hh}" width="${f.w}" height="${f.h}" fill="${FIELD_FILL}" fill-opacity="0.8" stroke="${INK}" stroke-width="0.8" stroke-opacity="0.6"/>` +
    rows +
    `</g>`
  );
}

export function renderVillageSvg(v: Village, opts: { title?: string } = {}): string {
  const W = v.width, H = v.height;

  // 길: 넓은 흙색 → 얇은 테두리
  let roadBase = '', roadEdge = '';
  for (const r of v.roads) {
    const d = polyPath(r.pts, false);
    roadBase += `<path d="${d}" fill="none" stroke="${ROAD_FILL}" stroke-width="${r.w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    roadEdge += `<path d="${d}" fill="none" stroke="${ROAD_EDGE}" stroke-width="${r.w + 2}" stroke-opacity="0.35" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  const riverPath = v.river
    ? `<path d="${polyPath(v.river, false)}" fill="none" stroke="${WATER}" stroke-width="9" stroke-opacity="0.75" stroke-linecap="round"/>`
    : '';

  const wallPath = v.wall
    ? `<path d="${polyPath(v.wall)}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-opacity="0.75" stroke-linejoin="round"/>` +
      `<path d="${polyPath(v.wall)}" fill="none" stroke="${ROAD_EDGE}" stroke-width="1.2" stroke-opacity="0.6" stroke-linejoin="round"/>`
    : '';

  const plazaEl = v.plaza
    ? `<circle cx="${v.plaza.x.toFixed(1)}" cy="${v.plaza.y.toFixed(1)}" r="${v.plaza.r.toFixed(1)}" fill="${PLAZA_FILL}" stroke="${ROAD_EDGE}" stroke-width="1.2" stroke-opacity="0.7"/>`
    : '';
  const wellEl = v.well
    ? `<g><circle cx="${v.well.x.toFixed(1)}" cy="${v.well.y.toFixed(1)}" r="5" fill="${WATER}" fill-opacity="0.8" stroke="${INK}" stroke-width="1.2"/>` +
      `<circle cx="${v.well.x.toFixed(1)}" cy="${v.well.y.toFixed(1)}" r="2" fill="none" stroke="${INK}" stroke-width="0.8"/></g>`
    : '';

  const fieldsEl = v.fields.map(fieldGlyph).join('');
  const bldEl = v.buildings.map(buildingGlyph).join('');

  // 종이 얼룩 (정적 점 — 웹뷰 안전)
  let speckle = '';
  for (let gx = 0; gx < Math.round(W / 26); gx++) {
    for (let gy = 0; gy < Math.round(H / 26); gy++) {
      const h = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
      const rnd = h - Math.floor(h);
      if (rnd > 0.6) {
        speckle += `<circle cx="${((gx + (rnd * 3 % 1)) * 26).toFixed(1)}" cy="${((gy + (rnd * 7 % 1)) * 26).toFixed(1)}" r="${(0.4 + (rnd * 5 % 1) * 0.6).toFixed(2)}" fill="#8a7c56" fill-opacity="${(0.05 + (rnd * 11 % 1) * 0.05).toFixed(3)}"/>`;
      }
    }
  }

  // 프레임 + 제목
  const f1 = 10, f2 = 18;
  const frame =
    `<rect x="${f1}" y="${f1}" width="${W - f1 * 2}" height="${H - f1 * 2}" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
    `<rect x="${f2}" y="${f2}" width="${W - f2 * 2}" height="${H - f2 * 2}" fill="none" stroke="${INK}" stroke-width="1" stroke-opacity="0.6"/>`;

  const title = opts.title
    ? `<g><rect x="${W / 2 - 110}" y="26" width="220" height="34" rx="3" fill="${PAPER}" stroke="${INK}" stroke-width="1.5"/>` +
      `<text x="${W / 2}" y="49" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="17" font-weight="bold" fill="${INK}">${opts.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></g>`
    : '';

  // 범례
  const legend =
    `<g transform="translate(${W - 168},${H - 128})">` +
    `<rect x="0" y="0" width="150" height="110" rx="4" fill="${PAPER}" fill-opacity="0.92" stroke="${INK}" stroke-width="1.2"/>` +
    `<rect x="12" y="16" width="14" height="10" fill="${BLD_FILL}" stroke="${INK}" stroke-width="1"/><text x="34" y="25" font-family="Georgia, serif" font-size="11" fill="${INK}">집</text>` +
    `<rect x="12" y="38" width="14" height="10" fill="#d6b98f" stroke="${INK}" stroke-width="1"/><text x="34" y="47" font-family="Georgia, serif" font-size="11" fill="${INK}">여관·상점</text>` +
    `<rect x="12" y="60" width="14" height="10" fill="${FIELD_FILL}" stroke="${INK}" stroke-width="1"/><text x="34" y="69" font-family="Georgia, serif" font-size="11" fill="${INK}">밭</text>` +
    `<circle cx="19" cy="87" r="5" fill="${WATER}" fill-opacity="0.8" stroke="${INK}" stroke-width="1"/><text x="34" y="91" font-family="Georgia, serif" font-size="11" fill="${INK}">우물</text>` +
    `</g>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="${PAPER}"/>` +
    riverPath +
    roadEdge + roadBase +
    plazaEl +
    fieldsEl +
    bldEl +
    wellEl +
    wallPath +
    `<g pointer-events="none">${speckle}</g>` +
    frame + title + legend +
    `</svg>`
  );
}
