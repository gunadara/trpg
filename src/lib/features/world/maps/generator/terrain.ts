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
  /** 셀별 호수 여부 (침식 웅덩이가 물로 찬 곳) */
  lake: boolean[];
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
        (0.18 + rand() * 0.64) * width,
        (0.18 + rand() * 0.64) * height
      ];
      const score =
        contCenters.length === 0
          ? 1
          : Math.min(...contCenters.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])));
      if (score > bestScore) { bestScore = score; best = p; }
    }
    contCenters.push(best);
  }
  // 대륙 반경: 기본값을 쓰되, '가장 가까운 이웃 대륙까지 거리'로 상한을 걸어
  // 로브까지 포함해도 옆 대륙과 겹치지 않게 한다.
  const R_BY_COUNT = [0.62, 0.62, 0.58, 0.50, 0.46, 0.42]; // index = 대륙 수
  const baseR = (region ? 0.82 : R_BY_COUNT[Math.min(nCont, 5)]) * Math.min(width, height);

  // 로브가 중심에서 뻗는 최대 도달거리 배수 (아래 lobeReach/lobeSize와 맞춤)
  const lobeReach = nCont === 1 ? 0.85 : 0.2;
  const lobeSize = nCont === 1 ? 0.6 : 0.22;
  const lobeMax = nCont === 1 ? 6 : 7;
  const REACH = (0.4 + lobeReach) + (0.35 + lobeSize); // 로브 중심거리 + 로브반경

  const contRadii: number[] = contCenters.map(([x, y], i) => {
    let nearest = Infinity;
    for (let j = 0; j < contCenters.length; j++) {
      if (i === j) continue;
      nearest = Math.min(nearest, Math.hypot(x - contCenters[j][0], y - contCenters[j][1]));
    }
    if (!isFinite(nearest)) return baseR;             // 대륙 1개면 제한 없음
    const cap = (nearest / (REACH * 2)) * 0.94;       // 두 대륙 도달범위가 안 닿게
    return Math.min(baseR, cap);
  });

  // 각 대륙에 로브(돌출부)를 붙여 큰 본체를 만든다.
  type Lobe = { x: number; y: number; r: number };
  const contLobes: Lobe[][] = contCenters.map(([ccx, ccy], ci) => {
    const contR = contRadii[ci];
    const lobes: Lobe[] = [{ x: ccx, y: ccy, r: contR }];
    const nLobe = (nCont === 1 ? 4 : 4) + Math.floor(rand() * (lobeMax - 1));
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
  const PLATE_COUNT = 14 + Math.floor(rand() * 7); // 8~12개 판
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
  // 판 유형: 대륙판(육지 기반) / 해양판(바다 기반) — B안의 핵심
  // 대략 45%를 해양판으로 (지구도 해양판이 더 넓음)
  const plateOceanic: boolean[] = plateSites.map(() => rand() < 0.45);

  // 점(x,y)이 속한 판 인덱스 = 가장 가까운 plateSite
  const plateOf = (x: number, y: number): number => {
    let best = 0, bd = Infinity;
    for (let i = 0; i < plateSites.length; i++) {
      const d = (x - plateSites[i][0]) ** 2 + (y - plateSites[i][1]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };

  /** 판 경계 효과 (B안):
   *  - 대륙↔대륙 수렴 → 큰 산맥 (히말라야형)
   *  - 대륙↔해양 수렴 → 대륙 쪽 해안산맥 + 해양 쪽 해구 (안데스형)
   *  - 해양↔해양 수렴 → 화산섬 호 (일본형)
   *  - 발산 → 열곡·해령 (살짝 낮아짐) */
  const plateEffect = (x: number, y: number): { mtn: number; trench: number; volcano: number } => {
    const myPlate = plateOf(x, y);
    const myOcean = plateOceanic[myPlate];
    const probe = Math.min(width, height) * 0.040;
    let mtn = 0, trench = 0, volcano = 0;

    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const other = plateOf(x + Math.cos(a) * probe, y + Math.sin(a) * probe);
      if (other === myPlate) continue;
      const rel: [number, number] = [
        plateDrift[myPlate][0] - plateDrift[other][0],
        plateDrift[myPlate][1] - plateDrift[other][1]
      ];
      const conv = rel[0] * Math.cos(a) + rel[1] * Math.sin(a); // +면 수렴, -면 발산
      const otherOcean = plateOceanic[other];

      if (conv > 0) {
        // 수렴 경계
        if (!myOcean && !otherOcean) {
          mtn = Math.max(mtn, conv * 1.15);            // 대륙-대륙: 최대 산맥
        } else if (!myOcean && otherOcean) {
          mtn = Math.max(mtn, conv * 0.95);            // 대륙 쪽: 해안 산맥
        } else if (myOcean && !otherOcean) {
          trench = Math.max(trench, conv * 0.9);       // 해양 쪽: 해구
        } else {
          volcano = Math.max(volcano, conv * 0.85);    // 해양-해양: 화산섬 호
        }
      } else {
        // 발산 경계: 열곡/해령 — 살짝 꺼짐
        trench = Math.max(trench, -conv * 0.35);
      }
    }
    return { mtn, trench, volcano };
  };

  /* 섬 씨앗 */
  const isles: { x: number; y: number; r: number }[] = [];
  const isleCount = Math.round(islands * 5 * nCont);
  const safe = 0.12;
  for (let k = 0; k < isleCount; k++) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const ci = Math.floor(rand() * nCont);
      const [ccx, ccy] = contCenters[ci];
      const cR = contRadii[ci];
      const a = rand() * Math.PI * 2;
      const d = (1.12 + rand() * 0.48) * cR;
      const x = ccx + Math.cos(a) * d;
      const y = ccy + Math.sin(a) * d;
      if (x < width * safe || x > width * (1 - safe) || y < height * safe || y > height * (1 - safe)) continue;
      isles.push({ x, y, r: cR * (0.07 + rand() * 0.09) });
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

    // 판구조론 B안: 판 유형에 따라 산맥·해구·화산섬이 다르게 생김
    const pe = plateEffect(x, y);
    const ridge = Math.max(0, Math.min(1, (pe.mtn - 0.02) * 1.35));   // 산맥
    const trench = Math.max(0, Math.min(1, (pe.trench - 0.15) * 1.2)); // 해구·열곡
    const volcano = Math.max(0, Math.min(1, (pe.volcano - 0.25) * 1.5)); // 화산섬 호

    // 해양판 위에서는 육지가 되기 어렵게 → 판이 대륙 윤곽에도 관여 (B안)
    const oceanicDamp = plateOceanic[plateOf(x, y)] ? (nCont > 1 ? 0.92 : 0.78) : (nCont > 1 ? 1.15 : 1.06);

    const edgeD = Math.min(x, y, width - x, height - y) / margin;
    const e = Math.max(0, Math.min(1, edgeD));
    const edgeMask = e * e * (3 - 2 * e);

    /* ── '육지 정도(landness)'와 '고도'를 분리 ──
       예전엔 하나의 높이값으로 둘 다 처리해서, 바다 비율을 올리면
       대륙 전체가 해수면 근처로 몰려 노이즈에 조각조각 갈라졌다.
       이제 landness>0 이면 확실한 육지로 만들고, 고도는 그 위에서 따로 준다. */
    const flatMask = Math.pow(mask, 0.75);
    // 바다 비율 슬라이더(seaLevel)는 육지 양을 조절하는 데만 쓴다
    const seaBias = (seaLevel - 0.42) * 1.25;
    const landness =
      (flatMask * 0.80 * oceanicDamp + n01 * 0.24 + detail * 0.06 - 0.52 - seaBias) * edgeMask;

    if (landness <= 0) {
      // 바다: 해안에서 멀수록 깊게
      return Math.max(0, seaLevel - 0.015 + landness * 0.75);
    }
    // 육지: 기본 평지 + 산맥/화산 (해구는 낮춤). 확실히 해수면 위로.
    const elev =
      0.02 + landness * 0.38 + ridge * 0.36 + volcano * 0.32 - trench * 0.12;
    return Math.min(1, seaLevel + Math.max(0.008, elev));
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

  // 침식이 판 웅덩이 → 물 채워 호수로. 넘치는 지점은 하류로 뚫어 강이 이어지게.
  const lake = fillDepressions(heights, neighbors, def.seaLevel);

  // 내륙 바다 구멍 처리: 대양과 연결 안 된 바다 셀 덩어리를 찾아
  // 큰 것은 호수로, 작은 것은 메워서 '바다색 구멍'이 안 남게 한다.
  fillInlandSeas(heights, neighbors, def.seaLevel, lake, centers, outW, outH);

  /* ── 기후: 바람이 바다에서 습기를 싣고 오다 산맥을 넘으면 비를 뿌려 건조해짐(비그늘) ──
     탁월풍 방향으로 셀을 훑으며 습기를 전달, 고도 오를 때 비로 소모 */
  applyClimate(heights, moisture, centers, neighbors, def.seaLevel, outW);

  return {
    width: outW, height: outH,
    polygons, centers, neighbors, heights, moisture, lake,
    seaLevel: def.seaLevel, seed: def.seed
  };
}

/** 내륙 바다(대양과 안 이어진 바다 덩어리) 처리:
 *  - 지도 가장자리에 닿은 바다 = 진짜 대양
 *  - 거기 연결 안 된 바다 덩어리 = 내륙 구멍 → 크면 호수, 작으면 메움 */
function fillInlandSeas(
  heights: number[],
  neighbors: number[][],
  seaLevel: number,
  lake: boolean[],
  centers: [number, number][],
  outW: number,
  outH: number
): void {
  const n = heights.length;
  const isSea = (i: number) => heights[i] < seaLevel;
  // 1) 가장자리 바다에서 BFS로 '대양'에 연결된 바다 표시
  const ocean = new Array(n).fill(false);
  const stack: number[] = [];
  const edge = Math.min(outW, outH) * 0.03;
  for (let i = 0; i < n; i++) {
    if (!isSea(i)) continue;
    const [x, y] = centers[i];
    if (x < edge || x > outW - edge || y < edge || y > outH - edge) {
      ocean[i] = true; stack.push(i);
    }
  }
  while (stack.length) {
    const c = stack.pop()!;
    for (const nb of neighbors[c]) {
      if (isSea(nb) && !ocean[nb]) { ocean[nb] = true; stack.push(nb); }
    }
  }
  // 2) 대양에 연결 안 된 바다 덩어리 = 내륙 구멍. 군집별로 처리
  const MIN_INLAND_LAKE = 6; // 이 이상이면 호수, 미만이면 메움
  const visited = new Array(n).fill(false);
  for (let s = 0; s < n; s++) {
    if (!isSea(s) || ocean[s] || visited[s]) continue;
    const cluster: number[] = [];
    const st = [s]; visited[s] = true;
    while (st.length) {
      const c = st.pop()!;
      cluster.push(c);
      for (const nb of neighbors[c]) {
        if (isSea(nb) && !ocean[nb] && !visited[nb]) { visited[nb] = true; st.push(nb); }
      }
    }
    if (cluster.length >= MIN_INLAND_LAKE) {
      // 호수로: 해수면 살짝 위로 올려 육지 판정 + 호수 표시
      for (const c of cluster) { heights[c] = seaLevel + 0.005; lake[c] = true; }
    } else {
      // 메움: 주변 육지 평균 높이로
      for (const c of cluster) {
        let sum = 0, cnt = 0;
        for (const nb of neighbors[c]) if (heights[nb] >= seaLevel) { sum += heights[nb]; cnt++; }
        heights[c] = cnt ? sum / cnt : seaLevel + 0.01;
      }
    }
  }
}

/** 웅덩이 채우기 (Priority-Flood): 국소 최저점을 물로 채워 호수로 만들고,
 *  모든 육지 셀이 바다로 내려갈 경로를 갖게 해 강이 끊기지 않게 한다.
 *  반환: 셀별 호수 여부 (원래 높이보다 물이 차오른 곳) */
function fillDepressions(heights: number[], neighbors: number[][], seaLevel: number): boolean[] {
  const n = heights.length;
  const filled = heights.slice();
  const lake = new Array(n).fill(false);
  const EPS = 0.0008; // 물이 흐르도록 하는 최소 경사

  // 우선순위 큐 대용: 낮은 셀부터 처리
  const closed = new Array(n).fill(false);
  // 바다 셀을 출발점으로 (해수면 = 배수 출구)
  const pq: number[] = [];
  for (let i = 0; i < n; i++) {
    if (heights[i] < seaLevel) { filled[i] = heights[i]; closed[i] = true; pq.push(i); }
  }
  // 간단 정렬 기반 처리 (셀 수 수천이라 충분)
  let guard = 0;
  while (pq.length > 0 && guard++ < n * 4) {
    // 가장 낮은 filled 값 셀 꺼내기
    let mi = 0;
    for (let k = 1; k < pq.length; k++) if (filled[pq[k]] < filled[pq[mi]]) mi = k;
    const c = pq[mi];
    pq.splice(mi, 1);

    for (const nb of neighbors[c]) {
      if (closed[nb]) continue;
      closed[nb] = true;
      // 이웃은 최소한 현재 셀 + EPS 높이 (더 낮으면 채워서 물 고임 = 호수)
      const spill = filled[c] + EPS;
      if (heights[nb] < spill) {
        filled[nb] = spill;
        // 물이 '충분히 깊게' 찬 곳만 호수. 얕게 메워진 곳은 그냥 평지.
        if (heights[nb] >= seaLevel && spill - heights[nb] > 0.012) lake[nb] = true;
      } else {
        filled[nb] = heights[nb];
      }
      pq.push(nb);
    }
  }
  // 채운 높이 반영
  for (let i = 0; i < n; i++) heights[i] = filled[i];

  // 좁쌀 웅덩이 제거: 물 찬 셀이 여러 개 '뭉친' 것만 진짜 호수로 인정.
  // (연결된 호수 셀 군집 크기가 MIN_LAKE 미만이면 호수 표시 해제 = 평지 취급)
  const MIN_LAKE = 16; // 이 셀 수 이상 뭉쳐야 호수
  const visited = new Array(n).fill(false);
  for (let s = 0; s < n; s++) {
    if (!lake[s] || visited[s]) continue;
    // BFS로 연결된 호수 군집 수집
    const cluster: number[] = [];
    const stack = [s];
    visited[s] = true;
    while (stack.length) {
      const c = stack.pop()!;
      cluster.push(c);
      for (const nb of neighbors[c]) {
        if (lake[nb] && !visited[nb]) { visited[nb] = true; stack.push(nb); }
      }
    }
    if (cluster.length < MIN_LAKE) {
      for (const c of cluster) lake[c] = false; // 너무 작으면 호수 취소
    }
  }
  return lake;
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
function erode(heights: number[], neighbors: number[][], seaLevel: number, iterations = 1): void {
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
        Math.sqrt(flux[i]) * slope * 0.012
      );
      if (erosion > 0) heights[i] -= erosion * 0.5;
    }
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
