// src/lib/stores/drawStore.ts
// 소재 뽑기 — 카테고리별 단어를 모아두고 무작위로 뽑는다.
// (random-main 「소재 뽑기」를 genesis 스토어 패턴으로 이식)
import { writable } from 'svelte/store';

const STORAGE_KEY = 'genesis.draw_data';

export type DrawCategory = { name: string; words: string[]; enabled?: boolean };

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
    { name: '장소', enabled: true, words: ['계단', '지하도', '잠긴 문', '창문', '마지막 버스', '옥상', '폐서점'] },
    { name: '사물', enabled: true, words: ['거울', '달력', '꺼진 전화', '편지', '빈 의자', '지도', '녹슨 열쇠', '사진'] },
    { name: '분위기', enabled: true, words: ['낯선 냄새', '새벽 세시', '반복', '목소리', '그림자', '안개', '이름'] },
    { name: '캐릭터성', enabled: false, words: ['겉으론 냉정하지만 정 많은', '거짓말을 못 하는', '복수심에 사로잡힌', '과거를 숨기는', '누구에게도 곁을 안 주는', '맹목적으로 충성하는', '비겁하지만 결정적일 때 나서는', '농담으로 진심을 감추는', '원칙에 목숨 거는', '의외로 겁이 많은'] },
    { name: '욕망/동기', enabled: false, words: ['인정받고 싶다', '잃은 것을 되찾고 싶다', '진실을 알고 싶다', '도망치고 싶다', '누군가를 지키고 싶다', '복수하고 싶다', '자유로워지고 싶다', '속죄하고 싶다'] },
    { name: '장르/톤', enabled: false, words: ['호러', '느와르', '로맨스', '성장담', '미스터리', '다크 판타지', '블랙코미디', '비극', '스릴러', '잔잔한 일상'] }
  ]
};

function clone(d: DrawData): DrawData {
  return {
    mode: d.mode,
    count: d.count,
    activeCat: d.activeCat,
    categories: d.categories.map((c) => ({ name: c.name, words: [...c.words], enabled: c.enabled !== false }))
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
            words: Array.isArray(c?.words) ? c.words.map(String) : [],
            enabled: c?.enabled !== false
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

    // 카테고리 포함/제외 토글 (뽑기 대상)
    toggleEnabled(i: number) {
      update((d) => {
        const cat = d.categories[i];
        if (cat) cat.enabled = cat.enabled === false ? true : false;
        persist(d);
        return d;
      });
    },

    addCategory(name: string) {
      update((d) => {
        d.categories.push({ name: name.trim().slice(0, 12), words: [], enabled: true });
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
