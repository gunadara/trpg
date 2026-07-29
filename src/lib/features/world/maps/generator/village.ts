// 마을 지도 생성기 — 길을 먼저 깔고, 길가에 건물을 배치한다.
// 지형 생성기(terrain.ts)와 독립. 양피지 렌더 스타일은 공유 느낌으로 자체 정의.

export type SettlementKind = 'hamlet' | 'village' | 'town' | 'citadel';
export type VillageBiome = 'grass' | 'forest' | 'desert' | 'tundra' | 'marsh' | 'coast';

export type VillageOptions = {
  seed: string;
  width?: number;      // 캔버스 (기본 1200×850)
  height?: number;
  density?: number;    // 건물 밀도 0~1 (기본 0.5)
  river?: boolean;     // 마을을 지나는 개천
  walled?: boolean;    // 성벽 두르기
  kind?: SettlementKind; // 취락 유형 (기본 village)
  biome?: VillageBiome;  // 주변 환경 (없으면 시드로 자동)
};

/** 환경별 배경·식생 프리셋 */
const BIOME_STYLE: Record<string, {
  bg: string; field: string; road: string; scatter: Array<'tree'|'pine'|'rock'|'reed'|'dune'|'shrub'>; density: number; label: string;
}> = {
  grass:  { bg: '#e9edd4', field: '#cfe0aa', road: '#e6dcc6', scatter: ['tree', 'shrub'],        density: 1.0, label: '초원' },
  forest: { bg: '#dde5cd', field: '#c6d9a2', road: '#e0d5bd', scatter: ['tree', 'tree', 'pine'], density: 1.9, label: '숲' },
  desert: { bg: '#efe3c4', field: '#dbd6a4', road: '#ece0c2', scatter: ['dune', 'rock'],         density: 0.8, label: '사막' },
  tundra: { bg: '#e6e9ea', field: '#cdd8bc', road: '#e2e0d6', scatter: ['pine', 'rock'],         density: 0.9, label: '설원' },
  marsh:  { bg: '#dfe6cf', field: '#c9dca6', road: '#ddd6bd', scatter: ['reed', 'reed', 'tree'], density: 1.5, label: '늪지' },
  coast:  { bg: '#e7ecd8', field: '#cfe0aa', road: '#e6dcc6', scatter: ['shrub', 'rock'],        density: 0.9, label: '해안' }
};

/** 취락 유형별 구조 프리셋 */
const SETTLEMENT = {
  hamlet:  { roads: 1, branchMax: 1, slotMain: 10, slotBranch: 5,  plaza: false, fields: 9, wall: false, label: '촌락' },
  village: { roads: 1, branchMax: 3, slotMain: 20, slotBranch: 10, plaza: true,  fields: 7, wall: false, label: '마을' },
  town:    { roads: 2, branchMax: 5, slotMain: 26, slotBranch: 14, plaza: true,  fields: 4, wall: false, label: '읍' },
  citadel: { roads: 2, branchMax: 6, slotMain: 30, slotBranch: 16, plaza: true,  fields: 2, wall: true,  label: '성채도시' }
} as const;

export type Road = { pts: [number, number][]; w: number; kind: 'main' | 'branch' | 'path' };
export type Building = {
  x: number; y: number; w: number; h: number; angle: number;
  kind: 'house' | 'inn' | 'shop' | 'temple' | 'barn' | 'smithy' | 'mill' | 'stable' | 'tower';
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
  bridges: { x: number; y: number; angle: number; w: number }[];
  pier: [number, number][] | null;   // 해안 마을의 선착장
  kind: SettlementKind;
  biome: VillageBiome;
  scatter: { x: number; y: number; k: 'tree' | 'pine' | 'rock' | 'reed' | 'dune' | 'shrub'; s: number }[];
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
  const kind: SettlementKind = opts.kind ?? 'village';
  const P = SETTLEMENT[kind];
  const rand = mulberry32(hashSeed(opts.seed));
  // 환경: 지정이 없으면 시드로 자동 선택
  const BIOMES: VillageBiome[] = ['grass', 'forest', 'desert', 'tundra', 'marsh', 'coast'];
  const biome: VillageBiome = opts.biome ?? BIOMES[Math.floor(rand() * BIOMES.length)];
  const BS = BIOME_STYLE[biome];

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

  // 큰 취락은 간선도로가 하나 더 (교차로 형성)
  if (P.roads >= 2) {
    const a2 = mainAngle + Math.PI / 2 + (rand() - 0.5) * 0.5;
    const pts2: [number, number][] = [];
    const len2 = height * 0.88;
    for (let k = 0; k <= 5; k++) {
      const tt = k / 5;
      const along = (tt - 0.5) * len2;
      const sway = Math.sin(tt * Math.PI * 1.2) * width * 0.05;
      pts2.push([
        cx + Math.cos(a2) * along - Math.sin(a2) * sway,
        cy + Math.sin(a2) * along + Math.cos(a2) * sway
      ]);
    }
    roads.push({ pts: pts2, w: 11, kind: 'main' });
  }

  /* 2) 갈래길: 간선에서 위/아래로 뻗음 */
  const nBranch = Math.max(1, Math.round(P.branchMax * (0.5 + rand() * 0.5)));
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

  /* 2.5) 해안: 도로가 바다로 뻗지 않게 자르고, 하나만 '부두'로 남긴다 */
  let pier: [number, number][] | null = null;
  if (biome === 'coast') {
    const shoreY = height * 0.80;          // 렌더 해안선(0.82)보다 살짝 위에서 정리
    // 바다로 가장 깊이 들어가는 도로를 부두 후보로
    let pierIdx = -1, deepest = shoreY;
    roads.forEach((rd, i) => {
      for (const [, py] of rd.pts) if (py > deepest) { deepest = py; pierIdx = i; }
    });
    roads.forEach((rd, i) => {
      const cut: [number, number][] = [];
      for (let k = 0; k < rd.pts.length; k++) {
        const [px, py] = rd.pts[k];
        if (py <= shoreY) { cut.push([px, py]); continue; }
        // 해안선을 넘는 순간: 경계까지만 이어붙이고 끊는다
        if (k > 0) {
          const [ax, ay] = rd.pts[k - 1];
          const t = (shoreY - ay) / (py - ay);
          cut.push([ax + (px - ax) * t, shoreY]);
        }
        break;
      }
      if (cut.length >= 2) rd.pts = cut;
      // 부두: 잘린 지점에서 바다로 짧게 뻗는 잔교
      if (i === pierIdx && cut.length >= 2) {
        const [ex, ey] = cut[cut.length - 1];
        const [bx, by] = cut[cut.length - 2];
        const dx = ex - bx, dy = ey - by;
        const len = Math.hypot(dx, dy) || 1;
        const L = 46 + rand() * 26;
        pier = [
          [ex, ey],
          [ex + (dx / len) * L, ey + (dy / len) * L]
        ];
      }
    });

    // 바다까지 뻗은 도로가 없었으면: 해안에 가장 가까운 도로 끝에서 접속로 + 부두를 만든다
    if (!pier) {
      let best: { x: number; y: number } | null = null;
      for (const rd of roads) {
        for (const [px, py] of rd.pts) {
          if (!best || py > best.y) best = { x: px, y: py };
        }
      }
      if (best) {
        // 접속로: 도로 끝 → 해안선
        const accessPts: [number, number][] = [
          [best.x, best.y],
          [best.x + (rand() - 0.5) * 30, shoreY]
        ];
        roads.push({ pts: accessPts, w: 8, kind: 'path' });
        const L = 46 + rand() * 26;
        pier = [
          [accessPts[1][0], shoreY],
          [accessPts[1][0] + (rand() - 0.5) * 14, shoreY + L]
        ];
      }
    }
  }

  /* 3) 광장 + 우물: 간선 중앙 근처 */
  const plazaT = 0.42 + rand() * 0.16;
  const { p: pp } = onPath(mainPts, plazaT);
  let plaza = P.plaza
    ? { x: pp[0], y: pp[1] + (rand() < 0.5 ? -1 : 1) * 46, r: (kind === 'hamlet' ? 22 : 34) + rand() * 14 }
    : null;
  let well = { x: (plaza?.x ?? pp[0]) + (rand() - 0.5) * 12, y: (plaza?.y ?? pp[1] + 40) + (rand() - 0.5) * 12 };

  /* 4) 개천 (옵션): 마을 '가장자리'를 지난다 (중심 관통 금지)
     마을은 물가에 서되, 물이 마을 한복판을 가르지는 않는다. */
  let river: [number, number][] | null = null;
  if (opts.river) {
    const side = rand() < 0.5 ? -1 : 1;          // 중심의 위/아래 중 한쪽
    const clearance = height * 0.26;              // 중심에서 최소 이만큼 떨어뜨림
    const baseY = cy + side * clearance;
    const drift = (rand() - 0.5) * height * 0.12; // 완만한 기울기
    const pts: [number, number][] = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      const wobble = Math.sin(t * 2.6 + rand() * 0.4) * height * 0.05;
      pts.push([-20 + width * 1.05 * t, baseY + wobble + (t - 0.5) * drift]);
    }
    river = pts;
  }

  // 광장이 개천과 겹치면 옮긴다 (다리 위 광장 방지)
  if (plaza && river) {
    const rv = river;
    const distToRiver = (px: number, py: number) => {
      let best = Infinity;
      for (let k = 0; k < rv.length - 1; k++) {
        const [ax, ay] = rv[k], [bx, by] = rv[k + 1];
        const dx = bx - ax, dy = by - ay;
        const L2 = dx * dx + dy * dy;
        let tt = L2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / L2;
        tt = Math.max(0, Math.min(1, tt));
        best = Math.min(best, Math.hypot(px - (ax + tt * dx), py - (ay + tt * dy)));
      }
      return best;
    };
    if (distToRiver(plaza.x, plaza.y) < plaza.r + 24) {
      // 개천 반대편(마을 중심 쪽)으로 밀어냄
      const dir = plaza.y < cy ? -1 : 1;
      let py = plaza.y;
      for (let step = 0; step < 6; step++) {
        py += dir * (plaza.r * 0.5 + 14);
        if (distToRiver(plaza.x, py) > plaza.r + 24 && py > 60 && py < height - 60) break;
      }
      plaza = { ...plaza, y: Math.max(60, Math.min(height - 60, py)) };
    }
  }

  /* 5) 건물: 각 도로를 따라 양옆에 배치 (겹치지 않게) */
  const buildings: Building[] = [];
  const placed: { x: number; y: number; r: number }[] = [];
  /** 점에서 폴리라인까지 최단거리 */
  const distToPolyline = (x: number, y: number, pts: [number, number][]): number => {
    let best = Infinity;
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
      const dx = bx - ax, dy = by - ay;
      const L2 = dx * dx + dy * dy;
      let tt = L2 === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / L2;
      tt = Math.max(0, Math.min(1, tt));
      best = Math.min(best, Math.hypot(x - (ax + tt * dx), y - (ay + tt * dy)));
    }
    return best;
  };

  const canPlace = (x: number, y: number, r: number, skipRoad?: Road) => {
    if (x < 40 || x > width - 40 || y < 40 || y > height - 40) return false;
    // 해안 마을: 아래쪽 바다 영역엔 아무것도 두지 않는다 (렌더의 해안선 H*0.82 기준)
    if (biome === 'coast' && y + r > height * 0.78) return false;
    // 광장과 겹치지 않게
    if (plaza && Math.hypot(x - plaza.x, y - plaza.y) < plaza.r + r + 6) return false;
    // 모든 도로 위에 올라가지 않게 (자기가 면한 도로는 제외 — 그 도로엔 이미 offset을 뒀음)
    for (const rd of roads) {
      if (rd === skipRoad) continue;
      if (distToPolyline(x, y, rd.pts) < rd.w * 0.5 + r + 4) return false;
    }
    // 개천과 겹치지 않게
    if (river) {
      // 폴리라인의 '선분'까지 거리로 검사 (점만 보면 점 사이 구간이 뚫림)
      for (let k = 0; k < river.length - 1; k++) {
        const [ax, ay] = river[k], [bx, by] = river[k + 1];
        const dx = bx - ax, dy = by - ay;
        const L2 = dx * dx + dy * dy;
        let tt = L2 === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / L2;
        tt = Math.max(0, Math.min(1, tt));
        const px = ax + tt * dx, py = ay + tt * dy;
        if (Math.hypot(x - px, y - py) < r + 20) return false; // 개천 폭 + 여유
      }
    }
    for (const q of placed) if (Math.hypot(x - q.x, y - q.y) < q.r + r + 7) return false;
    return true;
  };

  // 특수 건물은 취락당 개수를 제한한다 (대장간 2, 방앗간 1 …)
  const quota: Record<string, number> =
    kind === 'hamlet'
      ? { inn: 0, shop: 0, temple: 0, smithy: 1, mill: 1, stable: 0, tower: 0 }
      : kind === 'village'
      ? { inn: 1, shop: 2, temple: 1, smithy: 1, mill: 1, stable: 1, tower: 0 }
      : kind === 'town'
      ? { inn: 2, shop: 4, temple: 1, smithy: 2, mill: 1, stable: 2, tower: 0 }
      : { inn: 3, shop: 5, temple: 2, smithy: 2, mill: 1, stable: 2, tower: 3 };
  const used: Record<string, number> = {};
  const take = (k: string) => {
    if ((used[k] ?? 0) >= (quota[k] ?? 0)) return false;
    used[k] = (used[k] ?? 0) + 1;
    return true;
  };

  const kindOf = (roadKind: Road['kind']): Building['kind'] => {
    const r = rand();
    if (roadKind === 'main') {
      if (r < 0.10 && take('inn')) return 'inn';
      if (r < 0.24 && take('shop')) return 'shop';
      if (r < 0.30 && take('smithy')) return 'smithy';
      if (r < 0.35 && take('stable')) return 'stable';
    }
    if (r < 0.06 && take('temple')) return 'temple';
    if (r < 0.10 && take('tower')) return 'tower';
    if (r < 0.18) return 'barn';
    return 'house';
  };

  for (const road of roads) {
    const slots = Math.round((road.kind === 'main' ? P.slotMain : P.slotBranch) * (0.5 + density));
    for (let s = 0; s < slots; s++) {
      const t = 0.05 + (s / slots) * 0.9 + (rand() - 0.5) * 0.02;
      const { p, dir } = onPath(road.pts, t);
      for (const side of [1, -1]) {
        if (rand() > 0.55 + density * 0.35) continue; // 듬성듬성
        const nx = -dir[1] * side, ny = dir[0] * side;
        const off = road.w * 0.5 + 16 + rand() * 14;
        const bx = p[0] + nx * off;
        const by = p[1] + ny * off;
        const bkind = kindOf(road.kind);
        const bw =
          bkind === 'barn' ? 26 + rand() * 12
          : bkind === 'temple' ? 30 + rand() * 8
          : bkind === 'smithy' ? 22 + rand() * 8
          : bkind === 'stable' ? 30 + rand() * 10
          : bkind === 'mill' ? 24 + rand() * 6
          : bkind === 'tower' ? 18 + rand() * 4
          : 16 + rand() * 12;
        const bh =
          bkind === 'barn' ? 18 + rand() * 8
          : bkind === 'temple' ? 24 + rand() * 6
          : bkind === 'smithy' ? 18 + rand() * 6
          : bkind === 'stable' ? 16 + rand() * 6
          : bkind === 'mill' ? 24 + rand() * 6
          : bkind === 'tower' ? 18 + rand() * 4
          : 14 + rand() * 9;
        const rr = Math.max(bw, bh) * 0.6;
        if (!canPlace(bx, by, rr, road)) continue;
        // 길과 나란히 (길 방향 각도)
        const angle = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI + (rand() - 0.5) * 10;
        buildings.push({ x: bx, y: by, w: bw, h: bh, angle, kind: bkind });
        placed.push({ x: bx, y: by, r: rr });
      }
    }
  }

  /* 6) 밭: 마을 외곽 빈 곳에 */
  const fields: Field[] = [];
  const nField = Math.max(0, Math.round(P.fields * (0.6 + rand() * 0.8)));
  for (let f = 0; f < nField; f++) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const a = rand() * Math.PI * 2;
      const d = Math.min(width, height) * (0.32 + rand() * 0.16);
      const fx = cx + Math.cos(a) * d;
      const fy = cy + Math.sin(a) * d * 0.8;
      const fw = 55 + rand() * 45, fh = 38 + rand() * 30;
      if (!canPlace(fx, fy, Math.max(fw, fh) * 0.72)) continue;
      fields.push({ x: fx, y: fy, w: fw, h: fh, angle: (rand() - 0.5) * 24 });
      placed.push({ x: fx, y: fy, r: Math.max(fw, fh) * 0.72 });
      break;
    }
  }

  /* 6.3) 환경 식생: 마을 바깥 빈 곳에 나무·바위 등을 흩뿌린다 */
  const scatter: { x: number; y: number; k: 'tree' | 'pine' | 'rock' | 'reed' | 'dune' | 'shrub'; s: number }[] = [];
  {
    const target = Math.round(70 * BS.density);
    for (let n = 0; n < target; n++) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const sx = 30 + rand() * (width - 60);
        const sy = 30 + rand() * (height - 60);
        // 도로·건물·밭과 안 겹치게 (식생은 작으니 여유는 작게)
        if (!canPlace(sx, sy, 9)) continue;
        // 해안이면 아래쪽(바다 예정)엔 안 심음
        const k = BS.scatter[Math.floor(rand() * BS.scatter.length)];
        scatter.push({ x: sx, y: sy, k, s: 4 + rand() * 3.5 });
        placed.push({ x: sx, y: sy, r: 7 });
        break;
      }
    }
  }

  /* 6.4) 우물 위치 확정: 광장이 있으면 그 안, 없으면 빈자리를 찾는다 */
  if (plaza) {
    well = { x: plaza.x + (rand() - 0.5) * plaza.r * 0.5, y: plaza.y + (rand() - 0.5) * plaza.r * 0.5 };
  } else {
    // 광장이 없는 촌락: 도로 근처이면서 건물과 안 겹치는 자리
    let found = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      const t = 0.25 + rand() * 0.5;
      const { p, dir } = onPath(mainPts, t);
      const side = rand() < 0.5 ? 1 : -1;
      const off = 22 + rand() * 24;
      const wx = p[0] + -dir[1] * side * off;
      const wy = p[1] + dir[0] * side * off;
      if (canPlace(wx, wy, 9)) { well = { x: wx, y: wy }; placed.push({ x: wx, y: wy, r: 9 }); found = true; break; }
    }
    if (!found) {
      // 못 찾으면 건물에서 가장 먼 지점으로 (마지막 수단)
      well = { x: cx, y: cy + height * 0.3 };
    }
  }

  /* 6.5) 다리: 도로가 개천을 건너는 지점 */
  const bridges: { x: number; y: number; angle: number; w: number }[] = [];
  if (river) {
    for (const road of roads) {
      for (let i = 0; i < road.pts.length - 1; i++) {
        const [ax, ay] = road.pts[i], [bx2, by2] = road.pts[i + 1];
        for (let j = 0; j < river.length - 1; j++) {
          const [cx2, cy2] = river[j], [dx2, dy2] = river[j + 1];
          // 선분 교차 판정
          const d = (bx2 - ax) * (dy2 - cy2) - (by2 - ay) * (dx2 - cx2);
          if (Math.abs(d) < 1e-6) continue;
          const t1 = ((cx2 - ax) * (dy2 - cy2) - (cy2 - ay) * (dx2 - cx2)) / d;
          const t2 = ((cx2 - ax) * (by2 - ay) - (cy2 - ay) * (bx2 - ax)) / d;
          if (t1 < 0 || t1 > 1 || t2 < 0 || t2 > 1) continue;
          bridges.push({
            x: ax + t1 * (bx2 - ax),
            y: ay + t1 * (by2 - ay),
            angle: (Math.atan2(dy2 - cy2, dx2 - cx2) * 180) / Math.PI,
            w: road.w + 8
          });
        }
      }
    }
  }

  /* 7) 성벽 (옵션): 건물들을 감싸는 다각형 */
  let wall: [number, number][] | null = null;
  if ((opts.walled || P.wall) && buildings.length > 0) {
    let maxR = 0;
    for (const b of buildings) maxR = Math.max(maxR, Math.hypot(b.x - cx, b.y - cy));
    const wr = maxR + 42;
    const pts: [number, number][] = [];
    const shoreLimit = biome === 'coast' ? height * 0.78 : Infinity;
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * Math.PI * 2;
      const rr = wr * (0.92 + rand() * 0.16);
      const px = Math.max(24, Math.min(width - 24, cx + Math.cos(a) * rr));
      // 해안 도시는 바닷쪽 성벽을 해안선까지만 (물 위에 성벽 X)
      const py = Math.min(shoreLimit, Math.max(24, cy + Math.sin(a) * rr * 0.82));
      pts.push([px, py]);
    }
    wall = pts;
  }

  return { width, height, roads, buildings, fields, plaza, well, river, wall, bridges, pier, kind, biome, scatter, seed: opts.seed };
}

/* ═══════════ 렌더 ═══════════ */
const PAPER = '#f7f4ec';       // 밝은 도면 바탕 (양피지 아님)
const INK = '#3c4046';         // 선명한 먹선
const ROAD_FILL = '#e6dcc6';   // 흙길
const ROAD_EDGE = '#bcab88';
const BLD_FILL = '#dccfb6';    // 집
const BLD_ROOF = '#a8977c';
const FIELD_FILL = '#cfe0aa';  // 밭 — 또렷한 연두
const WATER = '#7fa8c4';       // 물 — 파랑
const PLAZA_FILL = '#ece5d4';
const GRID = '#cfcabb';        // 좌표 격자

/** 환경 식생 글리프 */
function scatterGlyph(o: { x: number; y: number; k: string; s: number }): string {
  const { x, y, s, k } = o;
  const g = (inner: string) => `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">${inner}</g>`;
  if (k === 'tree')
    return g(
      `<circle cx="0" cy="${-s * 0.3}" r="${s}" fill="#9cb37e" stroke="${INK}" stroke-width="0.8" stroke-opacity="0.6"/>` +
      `<line x1="0" y1="${s * 0.6}" x2="0" y2="0" stroke="${INK}" stroke-width="0.7" stroke-opacity="0.6"/>`
    );
  if (k === 'pine')
    return g(
      `<path d="M0,${-s * 1.2} L${s * 0.7},${s * 0.5} L${-s * 0.7},${s * 0.5} Z" fill="#8aa27c" stroke="${INK}" stroke-width="0.8" stroke-opacity="0.6"/>`
    );
  if (k === 'rock')
    return g(
      `<path d="M${-s * 0.8},${s * 0.4} L${-s * 0.4},${-s * 0.5} L${s * 0.3},${-s * 0.6} L${s * 0.8},${s * 0.3} Z" fill="#b8b4aa" stroke="${INK}" stroke-width="0.8" stroke-opacity="0.6"/>`
    );
  if (k === 'reed') {
    let out = '';
    for (let i = -1; i <= 1; i++)
      out += `<line x1="${i * s * 0.4}" y1="${s * 0.5}" x2="${i * s * 0.4 + s * 0.15}" y2="${-s * 0.9}" stroke="#7f9468" stroke-width="0.8"/>`;
    return g(out);
  }
  if (k === 'dune')
    return g(
      `<path d="M${-s},0 Q${-s * 0.3},${-s * 0.7} ${s * 0.2},${-s * 0.1} Q${s * 0.6},${s * 0.2} ${s},0" fill="none" stroke="#c4ac7c" stroke-width="1.1"/>`
    );
  // shrub
  return g(
    `<circle cx="${-s * 0.35}" cy="0" r="${s * 0.5}" fill="#a8bb8c" stroke="${INK}" stroke-width="0.6" stroke-opacity="0.5"/>` +
    `<circle cx="${s * 0.35}" cy="${-s * 0.15}" r="${s * 0.45}" fill="#a8bb8c" stroke="${INK}" stroke-width="0.6" stroke-opacity="0.5"/>`
  );
}

function polyPath(pts: [number, number][], close = true): string {
  if (pts.length === 0) return '';
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('') + (close ? 'Z' : '');
}

/** 건물 글리프: 위에서 본 사각형 + 지붕 능선 */
function buildingGlyph(b: Building): string {
  const hw = b.w / 2, hh = b.h / 2;
  const fill =
    b.kind === 'temple' ? '#c9b7d4'
    : b.kind === 'inn' ? '#d6b98f'
    : b.kind === 'shop' ? '#d9c98f'
    : b.kind === 'barn' ? '#c2ab84'
    : b.kind === 'smithy' ? '#a89a92'
    : b.kind === 'mill' ? '#cbbfa0'
    : b.kind === 'stable' ? '#bfae8e'
    : b.kind === 'tower' ? '#b8b0a4'
    : BLD_FILL;
  const inner =
    b.kind === 'barn'
      ? `<line x1="${-hw + 2}" y1="0" x2="${hw - 2}" y2="0" stroke="${INK}" stroke-width="0.8" stroke-opacity="0.5"/>`
      : `<line x1="${-hw + 2}" y1="0" x2="${hw - 2}" y2="0" stroke="${BLD_ROOF}" stroke-width="1.6"/>` +
        `<line x1="${-hw + 2}" y1="${-hh + 1.5}" x2="${hw - 2}" y2="${-hh + 1.5}" stroke="${INK}" stroke-width="0.6" stroke-opacity="0.35"/>`;
  // 건물별 식별 표시
  let mark = '';
  if (b.kind === 'temple') {
    mark = `<circle cx="0" cy="${-hh - 4}" r="2.4" fill="none" stroke="${INK}" stroke-width="1"/>`;
  } else if (b.kind === 'smithy') {
    // 대장간: 모루 + 연기 굴뚝
    mark =
      `<rect x="-2" y="${-hh - 5}" width="4" height="4" fill="${INK}" fill-opacity="0.7"/>` +
      `<path d="M-3,1 L3,1 L2,-2 L-2,-2 Z" fill="${INK}" fill-opacity="0.45"/>`;
  } else if (b.kind === 'mill') {
    // 방앗간: 풍차 날개
    mark =
      `<circle cx="0" cy="0" r="2" fill="none" stroke="${INK}" stroke-width="0.9"/>` +
      `<line x1="0" y1="0" x2="${hw * 0.8}" y2="${-hh * 0.7}" stroke="${INK}" stroke-width="0.9"/>` +
      `<line x1="0" y1="0" x2="${-hw * 0.8}" y2="${hh * 0.7}" stroke="${INK}" stroke-width="0.9"/>` +
      `<line x1="0" y1="0" x2="${hw * 0.8}" y2="${hh * 0.7}" stroke="${INK}" stroke-width="0.9"/>` +
      `<line x1="0" y1="0" x2="${-hw * 0.8}" y2="${-hh * 0.7}" stroke="${INK}" stroke-width="0.9"/>`;
  } else if (b.kind === 'stable') {
    // 마구간: 칸 나눔
    mark =
      `<line x1="${-hw / 3}" y1="${-hh + 1}" x2="${-hw / 3}" y2="${hh - 1}" stroke="${INK}" stroke-width="0.7" stroke-opacity="0.6"/>` +
      `<line x1="${hw / 3}" y1="${-hh + 1}" x2="${hw / 3}" y2="${hh - 1}" stroke="${INK}" stroke-width="0.7" stroke-opacity="0.6"/>`;
  } else if (b.kind === 'tower') {
    // 망루: 원형 + 총안
    mark = `<circle cx="0" cy="0" r="${Math.min(hw, hh) * 0.72}" fill="none" stroke="${INK}" stroke-width="1.1"/>`;
  } else if (b.kind === 'inn') {
    // 여관: 간판
    mark = `<rect x="${hw - 1}" y="-2.5" width="4" height="5" fill="${INK}" fill-opacity="0.5"/>`;
  }
  const cross = mark;
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
  const BS = BIOME_STYLE[v.biome ?? 'grass'];

  // 환경 배경: 바탕색 + 부드러운 얼룩(지형 느낌)
  let ground = `<rect width="${W}" height="${H}" fill="${BS.bg}"/>`;
  {
    // 결정적 얼룩 (같은 시드면 같은 무늬)
    let h = 0;
    for (let i = 0; i < (v.seed ?? '').length; i++) h = (h * 31 + v.seed.charCodeAt(i)) >>> 0;
    const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
    for (let i = 0; i < 26; i++) {
      const bx = rnd() * W, by = rnd() * H;
      const rx = 70 + rnd() * 130, ry = 50 + rnd() * 90;
      ground += `<ellipse cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="${BS.field}" fill-opacity="0.16"/>`;
    }
  }
  // 해안이면 아래쪽에 바다
  if (v.biome === 'coast') {
    const shoreY = H * 0.82;
    let shore = `M0,${H} L0,${shoreY}`;
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      shore += ` L${(W * t).toFixed(0)},${(shoreY + Math.sin(t * 5 + 1) * 12).toFixed(0)}`;
    }
    shore += ` L${W},${H} Z`;
    ground +=
      `<path d="${shore}" fill="${WATER}" fill-opacity="0.55"/>` +
      `<path d="${shore}" fill="none" stroke="${INK}" stroke-width="1.2" stroke-opacity="0.5"/>`;
  }

  // 부두: 널판 잔교 + 끝 계류점 + 작은 배
  let pierEl = '';
  if (v.pier && v.pier.length === 2) {
    const [[ax, ay], [bx, by]] = v.pier;
    const ang = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
    const len = Math.hypot(bx - ax, by - ay);
    let planks = '';
    for (let d = 8; d < len; d += 9) {
      planks += `<line x1="${d.toFixed(1)}" y1="-6" x2="${d.toFixed(1)}" y2="6" stroke="${INK}" stroke-width="0.7" stroke-opacity="0.55"/>`;
    }
    pierEl =
      `<g transform="translate(${ax.toFixed(1)},${ay.toFixed(1)}) rotate(${ang.toFixed(1)})">` +
      `<rect x="0" y="-6" width="${len.toFixed(1)}" height="12" fill="#d9c9a8" stroke="${INK}" stroke-width="1.2"/>` +
      planks +
      `<circle cx="${(len - 3).toFixed(1)}" cy="-8" r="2" fill="${INK}" fill-opacity="0.6"/>` +
      `<circle cx="${(len - 3).toFixed(1)}" cy="8" r="2" fill="${INK}" fill-opacity="0.6"/>` +
      `</g>` +
      // 계류된 작은 배
      `<g transform="translate(${(bx + 16).toFixed(1)},${(by + 10).toFixed(1)}) rotate(${(ang + 20).toFixed(1)})">` +
      `<path d="M-11,0 Q0,7 11,0 Q0,3 -11,0 Z" fill="#cbbc9a" stroke="${INK}" stroke-width="1"/>` +
      `<line x1="0" y1="0" x2="0" y2="-11" stroke="${INK}" stroke-width="1"/>` +
      `</g>`;
  }

  const scatterEl = (v.scatter ?? []).map(scatterGlyph).join('');

  // 길: 넓은 흙색 → 얇은 테두리
  let roadBase = '', roadEdge = '';
  for (const r of v.roads) {
    const d = polyPath(r.pts, false);
    roadBase += `<path d="${d}" fill="none" stroke="${BS.road}" stroke-width="${r.w}" stroke-linecap="round" stroke-linejoin="round"/>`;
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

  // 다리: 개천을 건너는 도로 지점에 널판 표현
  const bridgeEl = (v.bridges ?? [])
    .map((b) => {
      const hw = b.w / 2;
      let planks = '';
      for (let k = -2; k <= 2; k++) {
        planks += `<line x1="${k * 4}" y1="${-hw}" x2="${k * 4}" y2="${hw}" stroke="${INK}" stroke-width="0.7" stroke-opacity="0.5"/>`;
      }
      return (
        `<g transform="translate(${b.x.toFixed(1)},${b.y.toFixed(1)}) rotate(${(b.angle + 90).toFixed(1)})">` +
        `<rect x="-11" y="${-hw}" width="22" height="${b.w}" fill="${ROAD_FILL}" stroke="${INK}" stroke-width="1.2"/>` +
        planks +
        `</g>`
      );
    })
    .join('');
  // 큰 취락은 분수, 작은 곳은 우물
  const isFountain = v.kind === 'town' || v.kind === 'citadel';
  const wellEl = v.well
    ? isFountain
      ? `<g><circle cx="${v.well.x.toFixed(1)}" cy="${v.well.y.toFixed(1)}" r="9" fill="${WATER}" fill-opacity="0.55" stroke="${INK}" stroke-width="1.3"/>` +
        `<circle cx="${v.well.x.toFixed(1)}" cy="${v.well.y.toFixed(1)}" r="5" fill="${WATER}" fill-opacity="0.8" stroke="${INK}" stroke-width="0.9"/>` +
        `<circle cx="${v.well.x.toFixed(1)}" cy="${v.well.y.toFixed(1)}" r="1.8" fill="${INK}" fill-opacity="0.6"/></g>`
      : `<g><circle cx="${v.well.x.toFixed(1)}" cy="${v.well.y.toFixed(1)}" r="5" fill="${WATER}" fill-opacity="0.8" stroke="${INK}" stroke-width="1.2"/>` +
        `<circle cx="${v.well.x.toFixed(1)}" cy="${v.well.y.toFixed(1)}" r="2" fill="none" stroke="${INK}" stroke-width="0.8"/></g>`
    : '';

  const fieldsEl = v.fields.map(fieldGlyph).join('');
  const bldEl = v.buildings.map(buildingGlyph).join('');

  // 좌표 격자 (세션에서 위치 지정용: A1~)
  const COLS = 8, ROWS = 6;
  const gx0 = 26, gy0 = 26, gw = W - 52, gh = H - 52;
  let grid = '';
  for (let c = 1; c < COLS; c++) {
    const x = gx0 + (gw * c) / COLS;
    grid += `<line x1="${x.toFixed(1)}" y1="${gy0}" x2="${x.toFixed(1)}" y2="${gy0 + gh}" stroke="${GRID}" stroke-width="0.7" stroke-opacity="0.55"/>`;
  }
  for (let r = 1; r < ROWS; r++) {
    const y = gy0 + (gh * r) / ROWS;
    grid += `<line x1="${gx0}" y1="${y.toFixed(1)}" x2="${gx0 + gw}" y2="${y.toFixed(1)}" stroke="${GRID}" stroke-width="0.7" stroke-opacity="0.55"/>`;
  }
  // 좌표 라벨
  for (let c = 0; c < COLS; c++) {
    const x = gx0 + (gw * (c + 0.5)) / COLS;
    grid += `<text x="${x.toFixed(1)}" y="${gy0 - 8}" text-anchor="middle" font-family="Georgia, serif" font-size="10" fill="${INK}" fill-opacity="0.55">${String.fromCharCode(65 + c)}</text>`;
  }
  for (let r = 0; r < ROWS; r++) {
    const y = gy0 + (gh * (r + 0.5)) / ROWS;
    grid += `<text x="${gx0 - 10}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-family="Georgia, serif" font-size="10" fill="${INK}" fill-opacity="0.55">${r + 1}</text>`;
  }

  // 프레임 + 제목
  const frame = `<rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-opacity="0.7"/>`;

  const kindLabel = { hamlet: '촌락', village: '마을', town: '읍', citadel: '성채도시' }[v.kind] ?? '마을';
  const title = opts.title
    ? `<g><rect x="${W / 2 - 110}" y="26" width="220" height="34" rx="3" fill="${PAPER}" stroke="${INK}" stroke-width="1.5"/>` +
      `<text x="${W / 2}" y="49" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="17" font-weight="bold" fill="${INK}">${opts.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></g>`
    : `<g><rect x="${W / 2 - 78}" y="26" width="156" height="30" rx="3" fill="${PAPER}" fill-opacity="0.92" stroke="${INK}" stroke-width="1.3"/>` +
      `<text x="${W / 2}" y="46" text-anchor="middle" font-family="Georgia, serif" font-size="13" font-style="italic" fill="${INK}">${BS.label} ${kindLabel}</text></g>`;

  // 범례: 이 마을에 실제로 있는 건물만
  const kindMeta: Record<string, { fill: string; label: string }> = {
    house: { fill: BLD_FILL, label: '집' },
    inn: { fill: '#d6b98f', label: '여관' },
    shop: { fill: '#d9c98f', label: '상점' },
    smithy: { fill: '#a89a92', label: '대장간' },
    mill: { fill: '#cbbfa0', label: '방앗간' },
    stable: { fill: '#bfae8e', label: '마구간' },
    temple: { fill: '#c9b7d4', label: '신전' },
    barn: { fill: '#c2ab84', label: '헛간' },
    tower: { fill: '#b8b0a4', label: '망루' }
  };
  const present = new Set(v.buildings.map((b) => b.kind));
  const rows: { swatch: (x: number, y: number) => string; label: string }[] = [];
  for (const k of ['house', 'inn', 'shop', 'smithy', 'mill', 'stable', 'temple', 'barn', 'tower']) {
    if (!present.has(k as Building['kind'])) continue;
    const m = kindMeta[k];
    rows.push({
      swatch: (x, y) => `<rect x="${x}" y="${y - 5}" width="14" height="10" fill="${m.fill}" stroke="${INK}" stroke-width="1"/>`,
      label: m.label
    });
  }
  if (v.fields.length > 0)
    rows.push({
      swatch: (x, y) => `<rect x="${x}" y="${y - 5}" width="14" height="10" fill="${FIELD_FILL}" stroke="${INK}" stroke-width="1"/>`,
      label: '밭'
    });
  rows.push({
    swatch: (x, y) =>
      isFountain
        ? `<circle cx="${x + 7}" cy="${y}" r="6" fill="${WATER}" fill-opacity="0.55" stroke="${INK}" stroke-width="1"/><circle cx="${x + 7}" cy="${y}" r="3" fill="${WATER}" fill-opacity="0.85" stroke="${INK}" stroke-width="0.7"/>`
        : `<circle cx="${x + 7}" cy="${y}" r="5" fill="${WATER}" fill-opacity="0.8" stroke="${INK}" stroke-width="1"/>`,
    label: isFountain ? '분수' : '우물'
  });
  if (v.pier)
    rows.push({
      swatch: (x, y) => `<rect x="${x}" y="${y - 4}" width="14" height="8" fill="#d9c9a8" stroke="${INK}" stroke-width="1"/><line x1="${x + 5}" y1="${y - 4}" x2="${x + 5}" y2="${y + 4}" stroke="${INK}" stroke-width="0.6"/><line x1="${x + 10}" y1="${y - 4}" x2="${x + 10}" y2="${y + 4}" stroke="${INK}" stroke-width="0.6"/>`,
      label: '부두'
    });
  if (v.bridges && v.bridges.length > 0)
    rows.push({
      swatch: (x, y) => `<rect x="${x}" y="${y - 4}" width="14" height="8" fill="${ROAD_FILL}" stroke="${INK}" stroke-width="1"/><line x1="${x + 5}" y1="${y - 4}" x2="${x + 5}" y2="${y + 4}" stroke="${INK}" stroke-width="0.7"/><line x1="${x + 9}" y1="${y - 4}" x2="${x + 9}" y2="${y + 4}" stroke="${INK}" stroke-width="0.7"/>`,
      label: '다리'
    });

  const lgW = 118, lgRow = 19, lgPad = 13;
  const lgH = lgPad * 2 + rows.length * lgRow - 6;
  const lgX = W - lgW - 26, lgY = H - lgH - 26;
  const legend =
    `<g transform="translate(${lgX},${lgY})">` +
    `<rect x="0" y="0" width="${lgW}" height="${lgH}" rx="4" fill="${PAPER}" fill-opacity="0.93" stroke="${INK}" stroke-width="1.2"/>` +
    rows
      .map((r, i) => {
        const y = lgPad + i * lgRow + 5;
        return r.swatch(12, y) + `<text x="34" y="${y + 4}" font-family="Georgia, serif" font-size="11" fill="${INK}">${r.label}</text>`;
      })
      .join('') +
    `</g>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    ground +
    pierEl +
    scatterEl +
    riverPath +
    roadEdge + roadBase +
    bridgeEl +
    plazaEl +
    fieldsEl +
    bldEl +
    wellEl +
    wallPath +
    `<g pointer-events="none">${grid}</g>` +
    frame + title + legend +
    `</svg>`
  );
}
