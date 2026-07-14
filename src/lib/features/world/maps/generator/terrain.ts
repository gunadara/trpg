// 자체 지도 생성기 — 지형 (3·4단계 개정판)
// 변경: 다중 대륙 지원, 가장자리 잘림 방지 마진, 강 생성용 이웃 정보 노출
import { Delaunay } from 'd3-delaunay';
import { createNoise2D } from 'simplex-noise';

export type TerrainOptions = {
  seed: string;        // 같은 시드 = 같은 지도
  width?: number;      // 기본 1000
  height?: number;     // 기본 700
  cellCount?: number;  // 기본 2500
  seaLevel?: number;   // 0~1, 높을수록 바다 많음 (기본 0.42)
  continents?: number; // 대륙 수 1~5 (기본 1)
  islands?: number;    // 섬 밀도 0~1 (기본 0.3)
  scale?: 'world' | 'region'; // region = 나라/지방 지도 (땅이 화면을 채움)
};

export type Terrain = {
  width: number;
  height: number;
  polygons: [number, number][][];
  /** 셀 중심점 (강 경로용) */
  centers: [number, number][];
  /** 셀별 이웃 셀 인덱스 (강 경로용) */
  neighbors: number[][];
  heights: number[];
  /** 셀별 습도 0~1 (바이옴용) */
  moisture: number[];
  seaLevel: number;
  seed: string;
};

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

function makeFbm(rand: () => number) {
  const noise = createNoise2D(rand);
  return (x: number, y: number): number => {
    let v = 0, amp = 0.55, freq = 1, sum = 0;
    for (let o = 0; o < 3; o++) {
      v += noise(x * freq, y * freq) * amp;
      sum += amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    return v / sum;
  };
}

export function generateTerrain(opts: TerrainOptions): Terrain {
  const width = opts.width ?? 1000;
  const height = opts.height ?? 700;
  const cellCount = opts.cellCount ?? 2500;
  const seaLevel = opts.seaLevel ?? 0.42;
  const nCont = Math.max(1, Math.min(5, opts.continents ?? 1));
  const islands = Math.max(0, Math.min(1, opts.islands ?? 0.3));
  const region = opts.scale === 'region';

  const rand = mulberry32(hashSeed(opts.seed));
  const fbm = makeFbm(rand);

  /* 대륙 중심점 뿌리기 — 서로 최대한 떨어지게 (best-of-N 샘플링) */
  const contCenters: [number, number][] = [];
  for (let c = 0; c < nCont; c++) {
    let best: [number, number] = [0, 0];
    let bestScore = -1;
    for (let attempt = 0; attempt < 24; attempt++) {
      const p: [number, number] = [
        (0.22 + rand() * 0.56) * width,
        (0.22 + rand() * 0.56) * height
      ];
      const score =
        contCenters.length === 0
          ? 1
          : Math.min(...contCenters.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])));
      if (score > bestScore) { bestScore = score; best = p; }
    }
    contCenters.push(best);
  }
  // 대륙 반경: 개수 많을수록 하나가 작아짐
  const contR = ((region ? 0.78 : 0.52) * Math.min(width, height)) / Math.sqrt(nCont);

  /* 산맥(능선) — 대륙마다 1~2개, 꺾인 선분으로. 판 경계처럼 길쭉하게 */
  type Ridge = { pts: [number, number][]; w: number };
  const ridges: Ridge[] = [];
  for (const [ccx, ccy] of contCenters) {
    const nRidge = 1 + (rand() < 0.45 ? 1 : 0);
    for (let r = 0; r < nRidge; r++) {
      // 시작점: 중심에서 약간 비켜서 (한가운데 돔 방지)
      const offA = rand() * Math.PI * 2;
      const offD = (0.1 + rand() * 0.35) * contR;
      const p0: [number, number] = [ccx + Math.cos(offA) * offD, ccy + Math.sin(offA) * offD];
      // 방향 + 중간에 한 번 꺾임
      const a1 = rand() * Math.PI * 2;
      const a2 = a1 + (rand() - 0.5) * 1.1;
      const len = contR * (0.55 + rand() * 0.5);
      const p1: [number, number] = [p0[0] + Math.cos(a1) * len * 0.5, p0[1] + Math.sin(a1) * len * 0.5];
      const p2: [number, number] = [p1[0] + Math.cos(a2) * len * 0.5, p1[1] + Math.sin(a2) * len * 0.5];
      ridges.push({ pts: [p0, p1, p2], w: contR * (0.14 + rand() * 0.08) });
    }
  }

  /* 섬 씨앗 — 대륙 반경 1.1~1.6배 거리에 작은 봉우리 */
  const isles: { x: number; y: number; r: number }[] = [];
  const isleCount = Math.round(islands * 5 * nCont);
  const safe = 0.12; // 캔버스 가장자리 12% 안쪽만 허용
  for (let k = 0; k < isleCount; k++) {
    // 캔버스 안에 떨어질 때까지 재시도 (최대 10회)
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

  /* 점 뿌리기 + Lloyd 완화 1회 */
  let points: [number, number][] = Array.from({ length: cellCount }, () => [
    rand() * width,
    rand() * height
  ]);
  {
    const v = Delaunay.from(points).voronoi([0, 0, width, height]);
    points = points.map((p, i) => {
      const poly = v.cellPolygon(i);
      if (!poly) return p;
      let cx = 0, cy = 0;
      for (const [x, y] of poly) { cx += x; cy += y; }
      return [cx / poly.length, cy / poly.length];
    });
  }

  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi([0, 0, width, height]);

  /* 높이 = 노이즈 + 대륙 마스크 + 가장자리 마진(잘림 방지) */
  const freq = (region ? 3.2 : 1.8) / Math.max(width, height); // 낮을수록 덩어리 큼
  const margin = (region ? 0.035 : 0.07) * Math.min(width, height);

  const fbmMoist = makeFbm(rand); // 습도용 별도 노이즈
  const freqM = 2.6 / Math.max(width, height);

  const polygons: [number, number][][] = [];
  const centers: [number, number][] = [];
  const neighbors: number[][] = [];
  const heights: number[] = [];
  const moisture: number[] = [];

  for (let i = 0; i < points.length; i++) {
    polygons.push((voronoi.cellPolygon(i) ?? []) as [number, number][]);
    centers.push(points[i]);
    neighbors.push([...delaunay.neighbors(i)]);

    const [x, y] = points[i];
    const n01 = fbm(x * freq, y * freq) * 0.5 + 0.5;

    // 가장 가까운 대륙 중심 기준 마스크 (가우시안)
    let mask = 0;
    for (const [cx, cy] of contCenters) {
      const d = Math.hypot(x - cx, y - cy) / contR;
      mask = Math.max(mask, Math.exp(-d * d * 1.5));
    }
    for (const isl of isles) {
      const d = Math.hypot(x - isl.x, y - isl.y) / isl.r;
      mask = Math.max(mask, Math.exp(-d * d * 1.6) * 0.95); // 섬은 대륙보다 낮게
    }

    // 가장자리 마진: 경계에 가까울수록 0으로 눌러 무조건 바다
    const edgeD = Math.min(x, y, width - x, height - y) / margin;
    const e = Math.max(0, Math.min(1, edgeD));
    const edgeMask = e * e * (3 - 2 * e); // smoothstep

    // 능선 마스크: 가장 가까운 능선 선분까지 거리
    let ridge = 0;
    for (const rg of ridges) {
      for (let sgi = 0; sgi < rg.pts.length - 1; sgi++) {
        const d = distToSeg(x, y, rg.pts[sgi], rg.pts[sgi + 1]) / rg.w;
        ridge = Math.max(ridge, Math.exp(-d * d * 2));
      }
    }

    // 대륙 마스크 = 육지 여부(저지대), 능선 = 고도. 산은 선을 따라 선다
    const h = (n01 * 0.5 + mask * 0.52 - 0.13 + ridge * 0.38) * edgeMask;
    heights.push(Math.max(0, Math.min(1, h)));
    moisture.push(fbmMoist(x * freqM, y * freqM) * 0.5 + 0.5);
  }

  return { width, height, polygons, centers, neighbors, heights, moisture, seaLevel, seed: opts.seed };
}
