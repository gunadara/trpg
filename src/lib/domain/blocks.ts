// 블록형 시트 — 격자 배치 단계
// 저장 위치: WorldDoc.attributes.blocks (스키마/DB 안 건드림)

export type BlockType = 'text';

// 격자: 가로 GRID_COLS칸, 세로는 ROW_PX 단위
export const GRID_COLS = 12;
export const ROW_PX = 24;
export const DEFAULT_W = GRID_COLS; // 새 블록 기본 = 한 줄 꽉
export const DEFAULT_H = 7;         // 기본 높이(행 단위) ≈ 168px

export type Block = {
  id: string;
  type: BlockType;
  title: string;
  value: string;
  x: number; // 격자 칸 (0 ~ GRID_COLS-1)
  y: number; // 행 (0 ~)
  w: number; // 가로 칸 수
  h: number; // 세로 행 수
};

export function makeBlock(type: BlockType = 'text', y = 0): Block {
  return {
    id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title: '',
    value: '',
    x: 0,
    y,
    w: DEFAULT_W,
    h: DEFAULT_H
  };
}

function hasLayout(b) {
  return b && typeof b.x === 'number' && typeof b.y === 'number'
    && typeof b.w === 'number' && typeof b.h === 'number';
}

// 좌표 없는(구버전) 블록에 자동 배치 부여 — 위에서부터 한 줄씩 쌓기
export function normalizeBlocks(raw): Block[] {
  if (!Array.isArray(raw)) return [];
  let cursorY = 0;
  return raw.map((b) => {
    if (hasLayout(b)) {
      cursorY = Math.max(cursorY, b.y + b.h);
      return b as Block;
    }
    const nb: Block = {
      id: b?.id ?? `blk-${Math.random().toString(36).slice(2, 8)}`,
      type: 'text',
      title: b?.title ?? '',
      value: b?.value ?? '',
      x: 0,
      y: cursorY,
      w: DEFAULT_W,
      h: DEFAULT_H
    };
    cursorY += DEFAULT_H;
    return nb;
  });
}

export function getBlocks(attributes: Record<string, unknown> | undefined): Block[] {
  return normalizeBlocks((attributes as any)?.blocks);
}

// 블록들의 맨 아래 y (새 블록 놓을 위치 계산용)
export function bottomOf(blocks: Block[]): number {
  return blocks.reduce((m, b) => Math.max(m, b.y + b.h), 0);
}
