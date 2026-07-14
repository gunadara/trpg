// 자체 지도 생성기 — 2단계: 해안선 추출 + 곡선화
// 원리: 육지 셀들의 변 중 "육지끼리 공유되지 않는 변" = 해안선 조각
//       조각들을 이어 닫힌 루프로 만들고 Chaikin 알고리즘으로 부드럽게
import type { Terrain } from './terrain';

type Pt = [number, number];

const keyOf = (p: Pt) => `${Math.round(p[0] * 10)}|${Math.round(p[1] * 10)}`;

/** 육지 실루엣(외곽 + 호수 구멍)을 닫힌 루프들로 추출 */
export function extractCoastLoops(t: Terrain): Pt[][] {
  // 1) 육지 셀의 모든 변 수집 — 두 번 나오는 변(육지끼리 공유)은 내부, 한 번이면 경계
  const edges = new Map<string, { a: Pt; b: Pt; count: number }>();

  for (let i = 0; i < t.polygons.length; i++) {
    if (t.heights[i] < t.seaLevel) continue;
    const poly = t.polygons[i];
    if (poly.length < 3) continue;

    // d3 cellPolygon은 첫 점이 마지막에 반복될 수 있음 → 중복 제거
    const pts =
      keyOf(poly[0]) === keyOf(poly[poly.length - 1]) ? poly.slice(0, -1) : poly;

    for (let j = 0; j < pts.length; j++) {
      const a = pts[j];
      const b = pts[(j + 1) % pts.length];
      const ka = keyOf(a), kb = keyOf(b);
      if (ka === kb) continue; // 길이 0 변 무시
      const ek = ka < kb ? `${ka}~${kb}` : `${kb}~${ka}`;
      const found = edges.get(ek);
      if (found) found.count++;
      else edges.set(ek, { a, b, count: 1 });
    }
  }

  // 2) 경계 변들을 끝점으로 이어 루프 만들기
  const boundary = [...edges.values()].filter((e) => e.count === 1);
  const byPoint = new Map<string, { a: Pt; b: Pt; used: boolean }[]>();
  const segs = boundary.map((e) => ({ a: e.a, b: e.b, used: false }));
  for (const s of segs) {
    for (const k of [keyOf(s.a), keyOf(s.b)]) {
      const arr = byPoint.get(k) ?? [];
      arr.push(s);
      byPoint.set(k, arr);
    }
  }

  const loops: Pt[][] = [];
  for (const start of segs) {
    if (start.used) continue;
    start.used = true;
    const loop: Pt[] = [start.a, start.b];
    let curKey = keyOf(start.b);
    const startKey = keyOf(start.a);

    while (curKey !== startKey) {
      const candidates = (byPoint.get(curKey) ?? []).filter((s) => !s.used);
      if (candidates.length === 0) break; // 열린 사슬(맵 가장자리 등) — 그대로 종료
      const next = candidates[0];
      next.used = true;
      const nextPt = keyOf(next.a) === curKey ? next.b : next.a;
      loop.push(nextPt);
      curKey = keyOf(nextPt);
    }
    if (loop.length >= 4) loops.push(loop);
  }
  return loops;
}

/** Chaikin 코너 커팅 — iterations번 반복할수록 부드러워짐 */
export function chaikin(loop: Pt[], iterations = 2): Pt[] {
  let pts = loop;
  for (let it = 0; it < iterations; it++) {
    const next: Pt[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      next.push(
        [p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25],
        [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]
      );
    }
    pts = next;
  }
  return pts;
}

/** 루프들 → 하나의 path d 문자열 (evenodd로 호수 구멍 처리) */
export function loopsToPath(loops: Pt[][]): string {
  return loops
    .map((loop) => {
      const parts = loop.map(
        ([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      );
      return parts.join('') + 'Z';
    })
    .join('');
}
