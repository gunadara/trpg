// src/lib/stores/gamebookStore.ts
// 게임북(분기형 텍스트 어드벤처) 저장소 — 플레이 콘텐츠, 세계관 DB와 분리
import { writable } from 'svelte/store';

const STORAGE_KEY = 'genesis.gamebooks';

export type Choice = {
  id: string;
  text: string;          // 선택지 문구
  target: string | null; // 연결된 다음 장면 id (null = 미연결)
};

export type Scene = {
  id: string;
  title: string;         // 장면 제목 (에디터용 식별)
  body: string;          // 본문 (플레이어가 읽는 묘사). @[제목](docId) 형태로 멘션 포함 가능
  choices: Choice[];
  linkedDocs?: string[]; // 이 장면에 연결된 세계관 문서 id (등장인물·장소 등)
  gmNotes?: string;      // GM 전용 메모 (플레이어에겐 안 보임)
};

export type Gamebook = {
  id: string;
  title: string;
  startSceneId: string | null;  // 시작 장면
  scenes: Scene[];
  updatedAt: string;
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function load(): Gamebook[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('[gamebook] load 실패:', e);
  }
  return [];
}

function createStore() {
  const { subscribe, set, update } = writable<Gamebook[]>([]);

  function persist(books: Gamebook[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    }
  }

  return {
    subscribe,

    load() {
      set(load());
    },

    // ── 게임북 ──
    createBook(title: string): string {
      const id = uid('book');
      update((books) => {
        const next = [
          ...books,
          { id, title: title.trim() || '제목 없는 게임북', startSceneId: null, scenes: [], updatedAt: new Date().toISOString() }
        ];
        persist(next);
        return next;
      });
      return id;
    },

    // 미리 만든 장면 배열로 게임북 통째 생성 (텍스트 가져오기용)
    importBook(title: string, scenes: Scene[], startSceneId: string | null): string {
      const id = uid('book');
      update((books) => {
        const next = [
          ...books,
          { id, title: title.trim() || '가져온 게임북', startSceneId, scenes, updatedAt: new Date().toISOString() }
        ];
        persist(next);
        return next;
      });
      return id;
    },

    // 기존 게임북의 장면을 통째로 교체 (텍스트로 덮어쓰기용)
    replaceScenes(bookId: string, scenes: Scene[], startSceneId: string | null) {
      update((books) => {
        const next = books.map((b) =>
          b.id === bookId ? { ...b, scenes, startSceneId, updatedAt: new Date().toISOString() } : b
        );
        persist(next);
        return next;
      });
    },

    renameBook(bookId: string, title: string) {
      update((books) => {
        const next = books.map((b) => (b.id === bookId ? { ...b, title: title.trim() || b.title } : b));
        persist(next);
        return next;
      });
    },

    deleteBook(bookId: string) {
      update((books) => {
        const next = books.filter((b) => b.id !== bookId);
        persist(next);
        return next;
      });
    },

    setStart(bookId: string, sceneId: string) {
      update((books) => {
        const next = books.map((b) => (b.id === bookId ? { ...b, startSceneId: sceneId, updatedAt: new Date().toISOString() } : b));
        persist(next);
        return next;
      });
    },

    // ── 장면 ──
    addScene(bookId: string, title = '새 장면'): string {
      const id = uid('scene');
      update((books) => {
        const next = books.map((b) => {
          if (b.id !== bookId) return b;
          const scene: Scene = { id, title, body: '', choices: [] };
          const startSceneId = b.startSceneId ?? id; // 첫 장면이면 자동 시작점
          return { ...b, scenes: [...b.scenes, scene], startSceneId, updatedAt: new Date().toISOString() };
        });
        persist(next);
        return next;
      });
      return id;
    },

    updateScene(bookId: string, sceneId: string, patch: Partial<Scene>) {
      update((books) => {
        const next = books.map((b) => {
          if (b.id !== bookId) return b;
          return {
            ...b,
            scenes: b.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
            updatedAt: new Date().toISOString()
          };
        });
        persist(next);
        return next;
      });
    },

    deleteScene(bookId: string, sceneId: string) {
      update((books) => {
        const next = books.map((b) => {
          if (b.id !== bookId) return b;
          // 이 장면을 가리키던 선택지들은 미연결로
          const scenes = b.scenes
            .filter((s) => s.id !== sceneId)
            .map((s) => ({
              ...s,
              choices: s.choices.map((c) => (c.target === sceneId ? { ...c, target: null } : c))
            }));
          const startSceneId = b.startSceneId === sceneId ? (scenes[0]?.id ?? null) : b.startSceneId;
          return { ...b, scenes, startSceneId, updatedAt: new Date().toISOString() };
        });
        persist(next);
        return next;
      });
    },

    // ── 선택지 ──
    addChoice(bookId: string, sceneId: string) {
      update((books) => {
        const next = books.map((b) => {
          if (b.id !== bookId) return b;
          return {
            ...b,
            scenes: b.scenes.map((s) =>
              s.id === sceneId
                ? { ...s, choices: [...s.choices, { id: uid('ch'), text: '', target: null }] }
                : s
            )
          };
        });
        persist(next);
        return next;
      });
    },

    updateChoice(bookId: string, sceneId: string, choiceId: string, patch: Partial<Choice>) {
      update((books) => {
        const next = books.map((b) => {
          if (b.id !== bookId) return b;
          return {
            ...b,
            scenes: b.scenes.map((s) =>
              s.id === sceneId
                ? { ...s, choices: s.choices.map((c) => (c.id === choiceId ? { ...c, ...patch } : c)) }
                : s
            )
          };
        });
        persist(next);
        return next;
      });
    },

    removeChoice(bookId: string, sceneId: string, choiceId: string) {
      update((books) => {
        const next = books.map((b) => {
          if (b.id !== bookId) return b;
          return {
            ...b,
            scenes: b.scenes.map((s) =>
              s.id === sceneId ? { ...s, choices: s.choices.filter((c) => c.id !== choiceId) } : s
            )
          };
        });
        persist(next);
        return next;
      });
    }
  };
}

export const gamebooks = createStore();
