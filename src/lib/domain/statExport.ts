// src/lib/domain/statExport.ts
// 수치를 뮤블 위키 등 바깥에 붙여넣기 좋은 형태로 바꾼다.
import type { PsychItem } from './psych';

function pct(v: number, min: number, max: number) {
  return Math.max(0, Math.min(1, (v - min) / Math.max(1, max - min)));
}

export function toTable(items: PsychItem[], title = ''): string {
  const head = `| 항목 | 수치 |\n| --- | --- |`;
  const rows = items.map((i) => `| ${i.label} | ${i.value} |`).join('\n');
  return (title ? `### ${title}\n\n` : '') + `${head}\n${rows}`;
}

export function toBars(items: PsychItem[], min: number, max: number, title = ''): string {
  const width = 10;
  const pad = Math.max(...items.map((i) => [...i.label].length), 0);
  const rows = items.map((i) => {
    const filled = Math.round(pct(i.value, min, max) * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    const label = i.label + ' '.repeat(Math.max(0, pad - [...i.label].length));
    return `${label}  ${bar} ${i.value}`;
  });
  return (title ? `${title}\n` : '') + rows.join('\n');
}

const LEVELS: [number, string][] = [
  [0.85, '매우 높다'],
  [0.65, '높은 편이다'],
  [0.35, '보통이다'],
  [0.15, '낮은 편이다'],
  [0, '매우 낮다']
];
export function levelOf(v: number, min: number, max: number): string {
  const p = pct(v, min, max);
  return (LEVELS.find(([t]) => p >= t) ?? LEVELS[LEVELS.length - 1])[1];
}

// 성격 설명 문장 — 수치를 읽을 수 있는 문장으로
export function toDescription(items: PsychItem[], min: number, max: number, title = ''): string {
  if (items.length === 0) return '';
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const lines = items.map((i) => `- ${i.label} ${i.value} — ${levelOf(i.value, min, max)}`);
  const summary =
    items.length >= 2 && top.value !== bottom.value
      ? `\n\n가장 두드러지는 것은 ${top.label}(${top.value}), 가장 약한 것은 ${bottom.label}(${bottom.value})이다.`
      : '';
  return (title ? `### ${title}\n\n` : '') + lines.join('\n') + summary;
}
