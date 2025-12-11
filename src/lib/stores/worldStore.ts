// src/lib/stores/worldStore.ts
import { writable, get } from 'svelte/store';

export type WorldInfo = {
  id: string;          // 내부용 ID
  name: string;        // 예: '오늘이 세계', '설화 시리즈'
  emoji: string;       // 예: '🌙', '🏰'
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'genesis.worlds';
const CURRENT_KEY = 'genesis.currentWorldId';

// ─────────────────────────────
// 초기 값 로딩 헬퍼
// ─────────────────────────────
function loadWorldsFromStorage(): WorldInfo[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as WorldInfo[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveWorldsToStorage(list: WorldInfo[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function loadCurrentId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(CURRENT_KEY);
}

function saveCurrentId(id: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CURRENT_KEY, id);
}

// ─────────────────────────────
// 세계 목록 / 현재 세계 스토어
// ─────────────────────────────
const initialWorlds = (() => {
  const loaded = loadWorldsFromStorage();
  if (loaded.length > 0) return loaded;

  const now = new Date().toISOString();
  // 앱 첫 실행 시 기본 세계 하나 생성
  return [
    {
      id: 'default',
      name: '기본 세계',
      emoji: '🌏',
      createdAt: now,
      updatedAt: now
    }
  ];
})();

export const worlds = writable<WorldInfo[]>(initialWorlds);

const initialCurrent =
  loadCurrentId() ?? initialWorlds[0]?.id ?? 'default';

export const currentWorldId = writable<string>(initialCurrent);

// 로컬스토리지와 동기화
worlds.subscribe((value) => {
  saveWorldsToStorage(value);
});

currentWorldId.subscribe((value) => {
  saveCurrentId(value);
});

// ─────────────────────────────
// 조작 함수들
// ─────────────────────────────
export function createWorld(name = '새 세계', emoji = '🪐'): WorldInfo {
  const now = new Date().toISOString();
  const id = `world-${now}-${Math.random().toString(16).slice(2)}`;

  const world: WorldInfo = { id, name, emoji, createdAt: now, updatedAt: now };

  worlds.update((list) => [world, ...list]);
  currentWorldId.set(id);

  return world;
}

export function renameWorld(id: string, name: string) {
  const now = new Date().toISOString();
  worlds.update((list) =>
    list.map((w) =>
      w.id === id ? { ...w, name, updatedAt: now } : w
    )
  );
}

export function setWorldEmoji(id: string, emoji: string) {
  const now = new Date().toISOString();
  worlds.update((list) =>
    list.map((w) =>
      w.id === id ? { ...w, emoji, updatedAt: now } : w
    )
  );
}

// ⚠ 삭제는 나중에: 세계 삭제 시 그 세계의 문서도 같이 삭제해야 해서
// 지금은 함수를 만들어두지 말고, 설계 끝나면 같이 구현하자.
