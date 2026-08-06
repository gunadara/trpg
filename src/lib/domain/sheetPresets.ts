// src/lib/domain/sheetPresets.ts
// 블록 시트 "서식" — 칸을 미리 짜둔 배치표.
// 사용자가 블록을 하나씩 쌓는 대신, 완성된 시트를 통째로 깔아준다.
//
// 좌표계는 BlockEditor와 동일: x/w는 12칸 그리드, y/h는 ROW_PX(24px) 단위.

import type { BlockType } from '$lib/domain/blocks';

export type PresetBlock = {
  type: BlockType;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  items?: string[];
  rows?: { label: string; cur: number; max: number }[];
};

export type SheetPreset = {
  id: string;
  /** 어느 카테고리 문서에서 보여줄지 */
  scope: string;
  name: string;
  hint: string;
  blocks: PresetBlock[];
};

// ────────────────────────────────────────────
// 인물 — 웹소설 (전체 시트)
// ────────────────────────────────────────────
const CHARACTER_NOVEL: PresetBlock[] = [
  // 기본 정보 (한 줄에 4칸)
  { type: 'label', title: '나이', x: 0, y: 0, w: 3, h: 3 },
  { type: 'label', title: '성별', x: 3, y: 0, w: 3, h: 3 },
  { type: 'label', title: '직업 · 신분', x: 6, y: 0, w: 3, h: 3 },
  { type: 'label', title: '소속', x: 9, y: 0, w: 3, h: 3 },

  // 외모
  { type: 'label', title: '키 · 체형', x: 0, y: 3, w: 4, h: 3 },
  { type: 'label', title: '머리 · 눈', x: 4, y: 3, w: 4, h: 3 },
  { type: 'label', title: '첫인상 한마디', x: 8, y: 3, w: 4, h: 3 },
  { type: 'text', title: '외모 · 옷차림', x: 0, y: 6, w: 12, h: 6 },

  // 성격
  { type: 'text', title: '성격', x: 0, y: 12, w: 6, h: 7 },
  { type: 'list', title: '장점 / 단점', x: 6, y: 12, w: 6, h: 7, items: ['', '', ''] },
  { type: 'text', title: '말투 · 버릇', x: 0, y: 19, w: 6, h: 5 },
  { type: 'list', title: '좋아하는 것 / 싫어하는 것', x: 6, y: 19, w: 6, h: 5, items: ['', ''] },

  // 배경
  { type: 'text', title: '출신 · 가족', x: 0, y: 24, w: 6, h: 7 },
  { type: 'text', title: '과거 · 결정적 사건', x: 6, y: 24, w: 6, h: 7 },

  // 서사 축 — 캐릭터를 굴러가게 하는 부분
  { type: 'text', title: '욕망 · 목표', x: 0, y: 31, w: 6, h: 6 },
  { type: 'text', title: '결핍 · 두려움', x: 6, y: 31, w: 6, h: 6 },
  { type: 'text', title: '비밀', x: 0, y: 37, w: 12, h: 5 },

  // 관계 · 상징
  { type: 'list', title: '관계', x: 0, y: 42, w: 6, h: 7, items: ['', '', ''] },
  { type: 'list', title: '상징 (색 · 소품 · 향)', x: 6, y: 42, w: 6, h: 7, items: ['', ''] },

  // 집필용
  { type: 'text', title: '첫 등장 장면', x: 0, y: 49, w: 12, h: 5 },
  { type: 'text', title: '변화 (어떻게 달라지는가)', x: 0, y: 54, w: 12, h: 6 }
];

// ────────────────────────────────────────────
// 인물 — 간단 (급할 때 / 조연용)
// ────────────────────────────────────────────
const CHARACTER_SIMPLE: PresetBlock[] = [
  { type: 'label', title: '나이 · 성별', x: 0, y: 0, w: 4, h: 3 },
  { type: 'label', title: '직업 · 신분', x: 4, y: 0, w: 4, h: 3 },
  { type: 'label', title: '한마디로', x: 8, y: 0, w: 4, h: 3 },
  { type: 'text', title: '성격', x: 0, y: 3, w: 6, h: 6 },
  { type: 'text', title: '욕망 · 목표', x: 6, y: 3, w: 6, h: 6 },
  { type: 'text', title: '비밀 · 과거', x: 0, y: 9, w: 6, h: 6 },
  { type: 'text', title: '말투 · 버릇', x: 6, y: 9, w: 6, h: 6 }
];

// ────────────────────────────────────────────
// 인물 — TRPG (수치 위주)
// ────────────────────────────────────────────
const CHARACTER_TRPG: PresetBlock[] = [
  { type: 'label', title: '클래스', x: 0, y: 0, w: 4, h: 3 },
  { type: 'label', title: '종족', x: 4, y: 0, w: 4, h: 3 },
  { type: 'number', title: '레벨', x: 8, y: 0, w: 4, h: 3 },
  {
    type: 'gauge',
    title: '상태',
    x: 0,
    y: 3,
    w: 12,
    h: 6,
    rows: [
      { label: 'HP', cur: 20, max: 20 },
      { label: 'MP', cur: 10, max: 10 }
    ]
  },
  { type: 'number', title: 'STR', x: 0, y: 9, w: 2, h: 3 },
  { type: 'number', title: 'DEX', x: 2, y: 9, w: 2, h: 3 },
  { type: 'number', title: 'CON', x: 4, y: 9, w: 2, h: 3 },
  { type: 'number', title: 'INT', x: 6, y: 9, w: 2, h: 3 },
  { type: 'number', title: 'WIS', x: 8, y: 9, w: 2, h: 3 },
  { type: 'number', title: 'CHA', x: 10, y: 9, w: 2, h: 3 },
  { type: 'list', title: '소지품', x: 0, y: 12, w: 6, h: 7, items: ['', '', ''] },
  { type: 'list', title: '특기 · 기술', x: 6, y: 12, w: 6, h: 7, items: ['', '', ''] },
  { type: 'text', title: '배경 · 동기', x: 0, y: 19, w: 12, h: 6 }
];

export const SHEET_PRESETS: SheetPreset[] = [
  {
    id: 'character-novel',
    scope: 'characters',
    name: '인물 — 웹소설',
    hint: '외모·성격·배경·욕망·관계까지 전체 시트',
    blocks: CHARACTER_NOVEL
  },
  {
    id: 'character-simple',
    scope: 'characters',
    name: '인물 — 간단',
    hint: '조연이나 급할 때. 7칸',
    blocks: CHARACTER_SIMPLE
  },
  {
    id: 'character-trpg',
    scope: 'characters',
    name: '인물 — TRPG',
    hint: '레벨·HP·능력치·소지품',
    blocks: CHARACTER_TRPG
  }
];

/** 해당 카테고리에서 쓸 수 있는 서식 목록 */
export function presetsFor(scope: string | undefined): SheetPreset[] {
  if (!scope) return [];
  return SHEET_PRESETS.filter((p) => p.scope === scope);
}
