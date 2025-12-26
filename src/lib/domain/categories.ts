// src/lib/domain/categories.ts

// GENESIS에서 사용할 고정 카테고리 ID
export type CategoryId =
  | 'characters'   // 인물
  | 'races'        // 종족
  | 'groups'       // 단체
  | 'nations'      // 나라
  | 'locations'    // 장소/지도
  | 'events'       // 사건 사고
  | 'storylines'   // 스토리 라인
  | 'items'        // 아이템
  | 'skills'       // 스킬
  | 'quests';      // 퀘스트

// UI에 쓸 메타데이터 (아이콘/한글 표기 등)
export const CATEGORY_META: Record<
  CategoryId,
  { icon: string; label: string }
> = {
  characters: { icon: '🦸‍♂️', label: '인물' },
  races: { icon: '🧝‍♀️', label: '종족' },
  groups: { icon: '🏛️', label: '단체' },
  nations: { icon: '🏳️', label: '나라' },
  locations: { icon: '🗺️', label: '장소/지도' },
  events: { icon: '💥', label: '사건 사고' },
  storylines: { icon: '📜', label: '스토리 라인' },
  items: { icon: '⚔️', label: '아이템' },
  skills: { icon: '✨', label: '스킬' },
  quests: { icon: '📜', label: '퀘스트' }
};

// GENESIS World에서 쓰는 카테고리 순서(사이드바/홈 카드/드로어 공통)
export const WORLD_CATEGORY_IDS: readonly CategoryId[] = [
  'characters',
  'races',
  'groups',
  'nations',
  'locations',
  'events',
  'storylines',
  'items',
  'skills',
  'quests'
] as const;


// ────────────────────────────────────────────
// 카테고리별 칩(뱃지) 색상 클래스
// ────────────────────────────────────────────

export const CATEGORY_PILL_CLASS: Record<CategoryId, string> = {
  characters:
    'bg-pink-50 text-pink-700 hover:bg-pink-100 ' +
    'dark:bg-pink-900/40 dark:text-pink-100 dark:hover:bg-pink-900',
  nations:
    'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ' +
    'dark:bg-indigo-900/40 dark:text-indigo-100 dark:hover:bg-indigo-900',
  locations:
    'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ' +
    'dark:bg-emerald-900/40 dark:text-emerald-100 dark:hover:bg-emerald-900',
  races:
    'bg-sky-50 text-sky-700 hover:bg-sky-100 ' +
    'dark:bg-sky-900/40 dark:text-sky-100 dark:hover:bg-sky-900',
  groups:
    'bg-amber-50 text-amber-700 hover:bg-amber-100 ' +
    'dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900',
  events:
    'bg-rose-50 text-rose-700 hover:bg-rose-100 ' +
    'dark:bg-rose-900/40 dark:text-rose-100 dark:hover:bg-rose-900',
  storylines:
    'bg-violet-50 text-violet-700 hover:bg-violet-100 ' +
    'dark:bg-violet-900/40 dark:text-violet-100 dark:hover:bg-violet-900',
  items:
    'bg-slate-50 text-slate-700 hover:bg-slate-100 ' +
    'dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800',
  skills:
    'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 ' +
    'dark:bg-cyan-900/40 dark:text-cyan-100 dark:hover:bg-cyan-900',
  quests:
    'bg-orange-50 text-orange-700 hover:bg-orange-100 ' +
    'dark:bg-orange-900/40 dark:text-orange-100 dark:hover:bg-orange-900'
};

export function categoryPillClass(category: CategoryId): string {
  return CATEGORY_PILL_CLASS[category] ?? 'bg-slate-100 text-slate-700';
}