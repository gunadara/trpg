// 자체 지도 생성기 — 지형 (정합 연동 개편)
// 구조: buildWorldDef(시드 → 연속 지형 함수) + sampleTerrain(창 → 셀 표본)
// 같은 시드의 세계에서 임의 사각 구역을 잘라 고해상도로 다시 찍으면
// 대륙·산맥·바이옴이 일치하는 지역 지도가 나온다 (구글맵 줌인 원리)
import { Delaunay } from 'd3-delaunay';
import { createNoise2D } from 'simplex-noise';

export type TerrainOptions = {
  seed: string;        // 같은 시드 = 같은 세계
  width?: number;      // 세계 좌표계 크기 (기본 1000×700)
  height?: number;
  cellCount?: number;  // 표본 셀 수 (기본 2500)
  seaLevel?: number;   // 0~1 (기본 0.42)
  continents?: number; // 대륙 수 1~5 (기본 1)
  islands?: number;    // 섬 밀도 0~1 (기본 0.3)
  scale?: 'world' | 'region'; // region = 단독 나라 지도 프리셋
};

export type WorldWindow = { x: number; y: number; w: number; h: number }; // 세계 좌표계 사각 구역

export type WorldDef = {
  width: number;   // 세계 좌표계 크기
  height: number;
  seaLevel: number;
  seed: string;
  /** 세계 좌표 (x,y) → 높이 0~1. 연속 함수라 아무 지점이나 물어볼 수 있음 */
  heightAt: (x: number, y: number) => number;
  /** 세계 좌표 (x,y) → 습도 0~1 */
  moistureAt: (x: number, y: number) => number;
};

export type Terrain = {
  width: number;   // 출력 캔버스 크기 (렌더 좌표계)
  height: number;
  polygons: [number, number][][];
  centers: [number, number][];
  neighbors: number[][];
  heights: number[];
  moisture: number[];
  seaLevel: number;
  seed: string;
};

/* ── 시드 유틸 ── */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeFbm(rand: () => number, octaves = 3) {
  const noise = createNoise2D(rand);
  return (x: number, y: number): number => {
    let v = 0, amp = 0.55, freq = 1, sum = 0;
    for (let o = 0; o < octaves; o++) {
      v += noise(x * freq, y * freq) * amp;
      sum += amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    return v / sum;
  };
}

/* ═══ 1부: 세계 정의 — 시드에서 연속 지형 함수 만들기 ═══ */
export function buildWorldDef(opts: TerrainOptions): WorldDef {
  const width = opts.width ?? 1000;
  const height = opts.height ?? 700;
  const seaLevel = opts.seaLevel ?? 0.42;
  const nCont = Math.max(1, Math.min(5, opts.continents ?? 1));
  const islands = Math.max(0, Math.min(1, opts.islands ?? 0.3));
  const region = opts.scale === 'region';

  // ⚠️ 난수 순서 고정 구간 — 여기 순서를 바꾸면 같은 시드의 세계가 달라짐
  const rand = mulberry32(hashSeed(opts.seed));
  const fbmElev = makeFbm(rand);          // 큰 지형
  const fbmDetail = makeFbm(rand, 2);     // 잔 디테일 (지역 줌에서 해안 굴곡 담당)
  const fbmMoist = makeFbm(rand);         // 습도

  /* 대륙 중심점 — 여러 개일 때 서로 확실히 떨어지도록 강하게 분리 */
  const contCenters: [number, number][] = [];
  for (let c = 0; c < nCont; c++) {
    let best: [number, number] = [width / 2, height / 2];
    let bestScore = -1;
    for (let attempt = 0; attempt < 60; attempt++) {
      const p: [number, number] = [
        (0.24 + rand() * 0.52) * width,
        (0.24 + rand() * 0.52) * height
      ];
      const score =
        contCenters.length === 0
          ? 1
          : Math.min(...contCenters.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])));
      if (score > bestScore) { bestScore = score; best = p; }
    }
    contCenters.push(best);
  }
  const contR = ((region ? 0.82 : nCont === 1 ? 0.74 : nCont === 2 ? 0.6 : 0.52) * Math.min(width, height)) / (nCont === 1 ? 1 : Math.sqrt(nCont));

  // 각 대륙에 로브(돌출부)를 붙여 큰 본체를 만든다. 대륙이 많을수록 로브를 작게/적게
  // 해서 옆 대륙과 안 붙게 한다.
  type Lobe = { x: number; y: number; r: number };
  const lobeReach = nCont === 1 ? 0.85 : 0.4;   // 로브가 중심에서 뻗는 거리 비율
  const lobeSize = nCont === 1 ? 0.6 : 0.38;   // 로브 크기 비율
  const lobeMax = nCont === 1 ? 6 : 3;
  const contLobes: Lobe[][] = contCenters.map(([ccx, ccy]) => {
    const lobes: Lobe[] = [{ x: ccx, y: ccy, r: contR }];
    const nLobe = (nCont === 1 ? 4 : 2) + Math.floor(rand() * (lobeMax - 1));
    for (let i = 0; i < nLobe; i++) {
      const a = rand() * Math.PI * 2;
      const d = contR * (0.4 + rand() * lobeReach);
      // 단일 대륙은 가로로 더 퍼지게 (x방향 거리 1.35배)
      const dx = Math.cos(a) * d * (nCont === 1 ? 1.35 : 1);
      const dy = Math.sin(a) * d * (nCont === 1 ? 0.85 : 1);
      lobes.push({
        x: ccx + dx,
        y: ccy + dy,
        r: contR * (0.35 + rand() * lobeSize)
      });
    }
    return lobes;
  });

  /* ── 판구조론 산맥 (A안: 산맥만 판 경계로 결정) ──
     세계를 판으로 조각내고, 각 판에 이동 벡터를 줌.
     판끼리 만나는 경계에서 서로 밀면(수렴) → 산맥. */
  const PLATE_COUNT = 8 + Math.floor(rand() * 5); // 8~12개 판
  const plateSites: [number, number][] = [];
  for (let i = 0; i < PLATE_COUNT; i++) {
    plateSites.push([rand() * width, rand() * height]);
  }
  // 각 판의 이동 벡터 (방향·세기)
  const plateDrift: [number, number][] = plateSites.map(() => {
    const a = rand() * Math.PI * 2;
    const spd = 0.5 + rand() * 0.5;
    return [Math.cos(a) * spd, Math.sin(a) * spd];
  });
  // 점(x,y)이 속한 판 인덱스 = 가장 가까운 plateSite
  const plateOf = (x: number, y: number): number => {
    let best = 0, bd = Infinity;
    for (let i = 0; i < plateSites.length; i++) {
      const d = (x - plateSites[i][0]) ** 2 + (y - plateSites[i][1]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };

  // 판 경계 산맥 강도: 점 주변에서 다른 판을 만나고, 두 판이 서로 미는지(수렴) 계산
  const plateMountain = (x: number, y: number): number => {
    const myPlate = plateOf(x, y);
    const probe = Math.min(width, height) * 0.02; // 경계 탐지 반경
    let maxConverge = 0;
    // 8방향으로 살짝 이동해 다른 판을 만나는지
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const nx = x + Math.cos(a) * probe;
      const ny = y + Math.sin(a) * probe;
      const other = plateOf(nx, ny);
      if (other === myPlate) continue;
      // 두 판의 상대 이동이 서로를 향하면(수렴) 양수
      const rel: [number, number] = [
        plateDrift[myPlate][0] - plateDrift[other][0],
        plateDrift[myPlate][1] - plateDrift[other][1]
      ];
      // 경계 방향(내 판 → 다른 판)으로의 접근 성분
      const converge = rel[0] * Math.cos(a) + rel[1] * Math.sin(a);
      if (converge > maxConverge) maxConverge = converge;
    }
    return maxConverge; // 0~약1.5
  };

  /* 섬 씨앗 */
  const isles: { x: number; y: number; r: number }[] = [];
  const isleCount = Math.round(islands * 5 * nCont);
  const safe = 0.12;
  for (let k = 0; k < isleCount; k++) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const [ccx, ccy] = contCenters[Math.floor(rand() * nCont)];
      const a = rand() * Math.PI * 2;
      const d = (1.12 + rand() * 0.48) * contR;
      const x = ccx + Math.cos(a) * d;
      const y = ccy + Math.sin(a) * d;
      if (x < width * safe || x > width * (1 - safe) || y < height * safe || y > height * (1 - safe)) continue;
      isles.push({ x, y, r: contR * (0.07 + rand() * 0.09) });
      break;
    }
  }

  const distToSeg = (px: number, py: number, a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L2 = dx * dx + dy * dy;
    if (L2 === 0) return Math.hypot(px - a[0], py - a[1]);
    let t = ((px - a[0]) * dx + (py - a[1]) * dy) / L2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
  };

  const freq = (region ? 3.2 : 1.8) / Math.max(width, height);
  const freqD = 24 / Math.max(width, height); // 디테일 파장 ≈ 세계폭/24
  const freqM = 2.6 / Math.max(width, height);
  const margin = (region ? 0.035 : nCont === 1 ? 0.06 : 0.07) * Math.min(width, height);

  const heightAt = (x: number, y: number): number => {
    const n01 = fbmElev(x * freq, y * freq) * 0.5 + 0.5;
    const detail = fbmDetail(x * freqD, y * freqD); // -1~1, 소진폭

    let mask = 0;
    for (const lobes of contLobes) {
      for (const lb of lobes) {
        const d = Math.hypot(x - lb.x, y - lb.y) / lb.r;
        mask = Math.max(mask, Math.exp(-d * d * 1.1));
      }
    }
    for (const isl of isles) {
      const d = Math.hypot(x - isl.x, y - isl.y) / isl.r;
      mask = Math.max(mask, Math.exp(-d * d * 1.6) * 0.8);
    }

    // 판구조론 산맥: 수렴 경계에서 솟음. 부드럽게 다듬어 산줄기로.
    const conv = plateMountain(x, y);
    const ridge = Math.max(0, Math.min(1, (conv - 0.15) * 1.3));

    const edgeD = Math.min(x, y, width - x, height - y) / margin;
    const e = Math.max(0, Math.min(1, edgeD));
    const edgeMask = e * e * (3 - 2 * e);

    const h = (mask * 0.82 + n01 * 0.28 + detail * 0.06 - 0.24 + ridge * 0.3) * edgeMask;
    return Math.max(0, Math.min(1, h));
  };

  const moistureAt = (x: number, y: number): number =>
    fbmMoist(x * freqM, y * freqM) * 0.5 + 0.5;

  return { width, height, seaLevel, seed: opts.seed, heightAt, moistureAt };
}

/* ═══ 2부: 표본 찍기 — 세계의 사각 구역을 셀로 샘플링 ═══ */
export function sampleTerrain(
  def: WorldDef,
  win: WorldWindow,
  cellCount: number,
  outW: number,
  outH: number
): Terrain {
  // 표본용 난수는 세계 정의와 분리 (창마다 결정적)
  const salt = `${def.seed}|s|${Math.round(win.x)},${Math.round(win.y)},${Math.round(win.w)},${Math.round(win.h)}`;
  const rand = mulberry32(hashSeed(salt));

  /* 창 안(세계 좌표)에 점 뿌리기 + Lloyd 1회 */
  let points: [number, number][] = Array.from({ length: cellCount }, () => [
    win.x + rand() * win.w,
    win.y + rand() * win.h
  ]);
  const bounds: [number, number, number, number] = [win.x, win.y, win.x + win.w, win.y + win.h];
  {
    const v = Delaunay.from(points).voronoi(bounds);
    points = points.map((p, i) => {
      const poly = v.cellPolygon(i);
      if (!poly) return p;
      let cx = 0, cy = 0;
      for (const [x, y] of poly) { cx += x; cy += y; }
      return [cx / poly.length, cy / poly.length];
    });
  }

  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi(bounds);

  /* 세계 좌표 → 출력 캔버스 좌표 */
  const tx = (x: number) => ((x - win.x) / win.w) * outW;
  const ty = (y: number) => ((y - win.y) / win.h) * outH;

  const polygons: [number, number][][] = [];
  const centers: [number, number][] = [];
  const neighbors: number[][] = [];
  const heights: number[] = [];
  const moisture: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const poly = (voronoi.cellPolygon(i) ?? []) as [number, number][];
    polygons.push(poly.map(([x, y]) => [tx(x), ty(y)] as [number, number]));
    centers.push([tx(points[i][0]), ty(points[i][1])]);
    neighbors.push([...delaunay.neighbors(i)]);
    heights.push(def.heightAt(points[i][0], points[i][1]));
    moisture.push(def.moistureAt(points[i][0], points[i][1]));
  }

  /* ── 수력 침식 (물이 흐르며 땅을 깎고 하류에 쌓음) ──
     1) 높은 셀→낮은 셀 순으로 물 흐름(flux) 누적
     2) 물이 많이 지나는 곳을 깎아 계곡 형성, 완만한 곳엔 약간 퇴적 */
  erode(heights, neighbors, def.seaLevel);

  /* ── 기후: 바람이 바다에서 습기를 싣고 오다 산맥을 넘으면 비를 뿌려 건조해짐(비그늘) ──
     탁월풍 방향으로 셀을 훑으며 습기를 전달, 고도 오를 때 비로 소모 */
  applyClimate(heights, moisture, centers, neighbors, def.seaLevel, outW);

  return {
    width: outW, height: outH,
    polygons, centers, neighbors, heights, moisture,
    seaLevel: def.seaLevel, seed: def.seed
  };
}

/** 기후: 탁월풍이 바다에서 습기를 싣고 오다 산을 넘으며 비를 뿌림 → 산 뒤(비그늘)는 건조 */
function applyClimate(
  heights: number[],
  moisture: number[],
  centers: [number, number][],
  neighbors: number[][],
  seaLevel: number,
  outW: number
): void {
  const n = heights.length;
  // 탁월풍: 서→동 (왼쪽에서 오른쪽). x 오름차순으로 훑으며 습기 전달
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => centers[a][0] - centers[b][0]
  );
  const humid = new Array(n).fill(0);
  for (const i of order) {
    if (heights[i] < seaLevel) { humid[i] = 1; continue; } // 바다 = 습기 공급원
    // 서쪽(바람 불어오는 쪽) 이웃들의 습기 평균을 받음
    let inflow = 0, cnt = 0;
    for (const nb of neighbors[i]) {
      if (centers[nb][0] < centers[i][0]) { inflow += humid[nb]; cnt++; }
    }
    let m = cnt > 0 ? inflow / cnt : 0.6;
    // 고도가 높으면 비로 습기 소모 (비그늘)
    const rel = Math.max(0, heights[i] - seaLevel);
    m -= rel * 0.45;
    // 증발산 회복: 내륙도 완전 건조는 안 되게 바닥을 받쳐줌
    m = Math.max(m, 0.4 - rel * 0.5) * 0.85 + m * 0.15;
    humid[i] = Math.max(0, Math.min(1, m));
  }
  // 기존 노이즈 습도와 혼합 (기후 70% + 노이즈 30%)로 자연스럽게
  for (let i = 0; i < n; i++) {
    if (heights[i] < seaLevel) continue;
    moisture[i] = Math.max(0, Math.min(1, humid[i] * 0.7 + moisture[i] * 0.3));
  }
}

/** 수력 침식: 셀 그래프 위에서 흐름 누적 → 침식/퇴적 */
function erode(heights: number[], neighbors: number[][], seaLevel: number, iterations = 2): void {
  const n = heights.length;
  for (let iter = 0; iter < iterations; iter++) {
    // 높은 순 정렬
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => heights[b] - heights[a]);
    const flux = new Array(n).fill(1); // 각 셀 강수 1

    // 각 셀의 최저 이웃(내리막) 방향으로 물 전달
    for (const i of order) {
      if (heights[i] < seaLevel) continue; // 바다는 침식 안 함
      let lowest = -1, lh = heights[i];
      for (const nb of neighbors[i]) {
        if (heights[nb] < lh) { lh = heights[nb]; lowest = nb; }
      }
      if (lowest === -1) continue; // 웅덩이
      flux[lowest] += flux[i]; // 하류로 물 누적

      // 침식량 = 흐름 × 경사. 물 많고 가파를수록 깊게 깎임
      const slope = heights[i] - heights[lowest];
      const erosion = Math.min(
        heights[i] - seaLevel, // 바다 밑으론 안 깎음
        Math.sqrt(flux[i]) * slope * 0.02
      );
      if (erosion > 0) heights[i] -= erosion * 0.5;
    }
  }

  // 침식 후 국소 웅덩이 살짝 메우기 (강이 끊기지 않게)
  for (let i = 0; i < n; i++) {
    if (heights[i] < seaLevel) continue;
    let minNb = Infinity;
    for (const nb of neighbors[i]) minNb = Math.min(minNb, heights[nb]);
    if (minNb > heights[i] && minNb < 1) heights[i] = Math.min(minNb, heights[i] + 0.002);
  }
}

/* ═══ 기존 API 호환 ═══ */
export function generateTerrain(opts: TerrainOptions): Terrain {
  const def = buildWorldDef(opts);
  return sampleTerrain(
    def,
    { x: 0, y: 0, w: def.width, h: def.height },
    opts.cellCount ?? 2500,
    def.width,
    def.height
  );
}

/** 세계 지도의 사각 구역 → 지역 지도 (지형 정합) */
export function generateRegion(
  worldOpts: TerrainOptions,
  win: WorldWindow,
  cellCount = 3500,
  outW = 1600
): Terrain {
  const def = buildWorldDef(worldOpts);
  // 창을 세계 경계 안으로 클램프
  const x = Math.max(0, Math.min(def.width - 10, win.x));
  const y = Math.max(0, Math.min(def.height - 10, win.y));
  const w = Math.max(10, Math.min(def.width - x, win.w));
  const h = Math.max(10, Math.min(def.height - y, win.h));
  const outH = Math.round((outW * h) / w);
  return sampleTerrain(def, { x, y, w, h }, cellCount, outW, outH);
}
