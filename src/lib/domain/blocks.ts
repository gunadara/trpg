// 블록형 시트 — 게이지(색 팔레트/다중줄)
// 저장 위치: WorldDoc.attributes.blocks (스키마/DB 안 건드림)

export type BlockType = 'text' | 'label' | 'number' | 'list' | 'gauge';
const KNOWN: BlockType[] = ['text', 'label', 'number', 'list', 'gauge'];

export const GRID_COLS = 12;
export const ROW_PX = 24;

// 게이지 색 팔레트
export const GAUGE_COLORS = ['#6366f1', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6'];

export type GaugeRow = { label: string; cur: number; max: number; color?: string };

export type Block = {
  id: string;
  type: BlockType;
  title: string;
  x: number; y: number; w: number; h: number;
  value?: string;      // text / label / number
  items?: string[];    // list
  rows?: GaugeRow[];   // gauge
};

const DEFAULTS: Record<BlockType, { w: number; h: number }> = {
  text:   { w: 12, h: 7 },
  label:  { w: 4,  h: 3 },
  number: { w: 3,  h: 3 },
  list:   { w: 6,  h: 7 },
  gauge:  { w: 6,  h: 5 }
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  text: '텍스트', label: '라벨+값', number: '숫자', list: '목록', gauge: '게이지'
};
export const BLOCK_HINTS: Record<BlockType, string> = {
  text: '긴 자유 서술 (성격, 외모, 사연)',
  label: '짧은 한 줄 정보 (직업: 기사)',
  number: '수치 하나 크게 (STR 10)',
  list: '여러 항목 나열 (소지품, 특기)',
  gauge: '현재/최대 막대 (HP, MP, 호감도)'
};
export const BLOCK_EXAMPLES: Record<BlockType, string> = {
  text: '예) 차갑지만 의외로 정 많은 성격. 어릴 적…',
  label: '예) 기사', number: '10',
  list: '예) 장검 / 방패 / 치유 물약', gauge: ''
};

export function defaultSize(type: BlockType) { return DEFAULTS[type] ?? DEFAULTS.text; }

export function makeBlock(type: BlockType = 'text', y = 0): Block {
  const d = defaultSize(type);
  const base: Block = { id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, title: '', x: 0, y, w: d.w, h: d.h };
  if (type === 'list') return { ...base, items: [] };
  if (type === 'gauge') return { ...base, rows: [{ label: '', cur: 0, max: 100, color: GAUGE_COLORS[0] }] };
  return { ...base, value: '' };
}

function hasLayout(b: any) {
  return b && typeof b.x === 'number' && typeof b.y === 'number' && typeof b.w === 'number' && typeof b.h === 'number';
}
function migrateGauge(b: any): GaugeRow[] {
  if (Array.isArray(b?.rows)) return b.rows;
  if (typeof b?.cur === 'number' || typeof b?.max === 'number') return [{ label: b?.title ?? '', cur: b?.cur ?? 0, max: b?.max ?? 100, color: GAUGE_COLORS[0] }];
  return [{ label: '', cur: 0, max: 100, color: GAUGE_COLORS[0] }];
}

export function normalizeBlocks(raw: any): Block[] {
  if (!Array.isArray(raw)) return [];
  let cursorY = 0;
  return raw.map((b: any) => {
    // 모르는 타입(예: 제거된 bars)은 text로 흡수
    const type: BlockType = KNOWN.includes(b?.type) ? b.type : 'text';
    const layout = hasLayout(b);
    const d = defaultSize(type);
    const nb: Block = {
      id: b?.id ?? `blk-${Math.random().toString(36).slice(2, 8)}`,
      type, title: b?.title ?? '',
      x: layout ? b.x : 0, y: layout ? b.y : cursorY, w: layout ? b.w : d.w, h: layout ? b.h : d.h
    };
    if (type === 'list') nb.items = Array.isArray(b?.items) ? b.items : [];
    else if (type === 'gauge') nb.rows = migrateGauge(b);
    else nb.value = b?.value ?? '';
    cursorY = Math.max(cursorY, nb.y + nb.h);
    return nb;
  });
}

export function getBlocks(attributes: Record<string, unknown> | undefined): Block[] {
  return normalizeBlocks((attributes as any)?.blocks);
}
export function bottomOf(blocks: Block[]): number {
  return blocks.reduce((m, b) => Math.max(m, b.y + b.h), 0);
}
export function fitHeight(b: Block): number {
  if (b.type === 'gauge') return Math.ceil(1.6 + (b.rows?.length ?? 0) * 2 + 1);
  if (b.type === 'list')  return Math.ceil(1.6 + (b.items?.length ?? 0) * 1.3 + 1);
  return b.h;
}
