// 자체 지도 생성기 — 4단계: 강
// 원리: 높은 셀(수원)에서 출발해 항상 가장 낮은 이웃으로 이동 → 바다 도달 시 완성
//       이미 강이 지나간 셀에 닿으면 거기서 합류(강은 갈라지지 않고 합쳐진다)
import type { Terrain } from './terrain';

type Pt = [number, number];

export type River = Pt[]; // 셀 중심들의 폴리라인 (상류 → 하류)

export function buildRivers(t: Terrain, density = 1): River[] {
  const isSea = (i: number) => t.heights[i] < t.seaLevel;
  const maxH = Math.max(...t.heights);
  const rel = (i: number) => (t.heights[i] - t.seaLevel) / Math.max(0.0001, maxH - t.seaLevel);

  // 수원 후보: 상대 높이 0.5 이상 셀을 높이순 정렬 후 듬성듬성 채택 (시드 결정적)
  const candidates = t.heights
    .map((_, i) => i)
    .filter((i) => !isSea(i) && rel(i) > 0.42)
    .sort((a, b) => t.heights[b] - t.heights[a]);

  const sourceCount = Math.max(3, Math.round((candidates.length / 22) * density));
  const step = Math.max(1, Math.floor(candidates.length / sourceCount));
  const sources = candidates.filter((_, idx) => idx % step === 0).slice(0, Math.round(16 * density));

  const riverCell = new Set<number>(); // 이미 강이 흐르는 셀
  const rivers: River[] = [];

  for (const src of sources) {
    if (riverCell.has(src)) continue;
    const path: number[] = [src];
    const inPath = new Set<number>([src]);
    let cur = src;
    let guard = 0;

    while (guard++ < 600) {
      // 가장 낮은 이웃으로 (지나온 셀 제외)
      let next = -1;
      let lowest = Infinity;
      for (const nb of t.neighbors[cur]) {
        if (inPath.has(nb)) continue;
        if (t.heights[nb] < lowest) { lowest = t.heights[nb]; next = nb; }
      }
      if (next === -1) break; // 사방이 지나온 길 — 포기
      // 내리막이 없으면 = 웅덩이. 물이 차서 가장 낮은 가장자리로 넘친다(호수 배수)
      path.push(next);
      inPath.add(next);
      if (isSea(next)) break;          // 바다 도달
      if (riverCell.has(next)) break;  // 기존 강에 합류
      cur = next;
    }

    const reachedSea = isSea(path[path.length - 1]) || riverCell.has(path[path.length - 1]);
    if (!reachedSea || path.length < 5) continue; // 바다(또는 기존 강 합류)에 못 닿으면 버림
    for (const c of path) riverCell.add(c);
    rivers.push(path.map((i) => t.centers[i]));
  }
  return rivers;
}

/** 열린 폴리라인용 Chaikin (양 끝점 유지) */
export function smoothOpen(line: Pt[], iterations = 2): Pt[] {
  let pts = line;
  for (let it = 0; it < iterations; it++) {
    if (pts.length < 3) return pts;
    const next: Pt[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      next.push(
        [p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25],
        [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]
      );
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}
