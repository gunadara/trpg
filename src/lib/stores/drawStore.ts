// src/lib/stores/drawStore.ts
// 소재 뽑기 — 카테고리별 단어를 모아두고 무작위로 뽑는다.
// (random-main 「소재 뽑기」를 genesis 스토어 패턴으로 이식)
import { writable } from 'svelte/store';

const STORAGE_KEY = 'genesis.draw_data';

export type DrawCategory = { name: string; words: string[] };

export type DrawData = {
  mode: 'category' | 'all'; // 카테고리별 1개씩 | 전체에서 N개
  count: number; // 'all' 모드에서 뽑을 개수
  activeCat: number; // 편집 중인 카테고리 인덱스
  categories: DrawCategory[];
};

export const DEFAULT_DRAW: DrawData = {
  mode: 'category',
  count: 3,
  activeCat: 0,
  categories: [
    { name: '장소', words: ['계단', '지하도', '잠긴 문', '창문', '마지막 버스', '옥상', '폐서점'] },
    { name: '사물', words: ['거울', '달력', '꺼진 전화', '편지', '빈 의자', '지도', '녹슨 열쇠', '사진'] },
    { name: '분위기', words: ['낯선 냄새', '새벽 세시', '반복', '목소리', '그림자', '안개', '이름'] }
  ]
};

function clone(d: DrawData): DrawData {
  return {
    mode: d.mode,
    count: d.count,
    activeCat: d.activeCat,
    categories: d.categories.map((c) => ({ name: c.name, words: [...c.words] }))
  };
}

function load(): DrawData {
  if (typeof window === 'undefined') return clone(DEFAULT_DRAW);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.categories) && parsed.categories.length > 0) {
        return {
          mode: parsed.mode === 'all' ? 'all' : 'category',
          count: Number.isFinite(parsed.count) ? Math.max(1, parsed.count) : 3,
          activeCat: Number.isInteger(parsed.activeCat) ? parsed.activeCat : 0,
          categories: parsed.categories.map((c: any) => ({
            name: String(c?.name ?? ''),
            words: Array.isArray(c?.words) ? c.words.map(String) : []
          }))
        };
      }
    }
  } catch (e) {
    console.error('[drawStore] load 실패:', e);
  }
  return clone(DEFAULT_DRAW);
}

function createStore() {
  const { subscribe, set, update } = writable<DrawData>(clone(DEFAULT_DRAW));

  function persist(d: DrawData) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    }
  }

  // activeCat 범위 보정
  function safeIndex(d: DrawData): number {
    if (d.activeCat < 0 || d.activeCat >= d.categories.length) return 0;
    return d.activeCat;
  }

  return {
    subscribe,

    // 브라우저에서 저장분 불러오기 (페이지 onMount에서 호출)
    load() {
      set(load());
    },

    setMode(mode: DrawData['mode']) {
      update((d) => {
        d.mode = mode;
        persist(d);
        return d;
      });
    },

    changeCount(delta: number) {
      update((d) => {
        const total = d.categories.reduce((n, c) => n + c.words.length, 0);
        d.count = Math.max(1, Math.min(total || 1, d.count + delta));
        persist(d);
        return d;
      });
    },

    selectCategory(i: number) {
      update((d) => {
        d.activeCat = i;
        persist(d);
        return d;
      });
    },

    // 쉼표로 구분된 여러 단어 추가 (중복·길이 제한 적용)
    addWords(raw: string) {
      update((d) => {
        const i = safeIndex(d);
        const cat = d.categories[i];
        if (!cat) return d;
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((p) => {
            if (p.length <= 20 && !cat.words.includes(p)) cat.words.push(p);
          });
        persist(d);
        return d;
      });
    },

    removeWord(wordIndex: number) {
      update((d) => {
        const cat = d.categories[safeIndex(d)];
        if (cat) cat.words.splice(wordIndex, 1);
        persist(d);
        return d;
      });
    },

    addCategory(name: string) {
      update((d) => {
        d.categories.push({ name: name.trim().slice(0, 12), words: [] });
        d.activeCat = d.categories.length - 1;
        persist(d);
        return d;
      });
    },

    renameCategory(name: string) {
      update((d) => {
        const cat = d.categories[safeIndex(d)];
        if (cat) cat.name = name.trim().slice(0, 12);
        persist(d);
        return d;
      });
    },

    deleteCategory() {
      update((d) => {
        if (d.categories.length <= 1) return d;
        d.categories.splice(safeIndex(d), 1);
        d.activeCat = 0;
        persist(d);
        return d;
      });
    },

    reset() {
      const d = clone(DEFAULT_DRAW);
      set(d);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };
}

export const drawStore = createStore();
