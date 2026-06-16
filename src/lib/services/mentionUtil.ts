// src/lib/services/mentionUtil.ts
// 게임북 본문의 멘션 토큰 @[제목](docId) 처리
// - 본문을 텍스트/멘션 조각으로 분해 (플레이어 렌더링용)
// - 본문에서 docId 목록 추출 (장면-문서 자동 연결용)

const MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;

export type Segment =
  | { type: 'text'; value: string }
  | { type: 'mention'; label: string; docId: string };

// 본문 → 조각 배열 (플레이어가 인라인으로 그릴 때)
export function parseMentions(body: string): Segment[] {
  const segs: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(body)) !== null) {
    if (m.index > last) segs.push({ type: 'text', value: body.slice(last, m.index) });
    segs.push({ type: 'mention', label: m[1], docId: m[2] });
    last = m.index + m[0].length;
  }
  if (last < body.length) segs.push({ type: 'text', value: body.slice(last) });
  return segs;
}

// 본문에서 멘션된 docId 전부 추출 (중복 제거)
export function extractDocIds(body: string): string[] {
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(body)) !== null) ids.add(m[2]);
  return [...ids];
}

// 멘션 토큰 만들기
export function makeMentionToken(label: string, docId: string): string {
  return `@[${label}](${docId})`;
}
