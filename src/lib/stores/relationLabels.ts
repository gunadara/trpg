// src/lib/stores/relationLabels.ts
// 관계도의 선에 붙는 라벨 저장소 + 관계 종류(기본 + 사용자 추가) 관리
import { writable } from 'svelte/store';

const LABELS_KEY = 'genesis.relation_labels';
const TYPES_KEY = 'genesis.relation_types';

export type RelType = { label: string; color: string; custom?: boolean };

// 기본 관계 종류
export const DEFAULT_REL_TYPES: Record<string, RelType> = {
  ally:   { label: '동맹', color: '#34d399' },
  enemy:  { label: '적대', color: '#fb7185' },
  member: { label: '소속', color: '#38bdf8' },
  family: { label: '혈연', color: '#fbbf24' },
  love:   { label: '연인', color: '#f472b6' },
  mentor: { label: '사제', color: '#a78bfa' },
  etc:    { label: '기타', color: '#94a3b8' }
};

/* ───── 관계 종류 (기본 + 커스텀) ───── */

function createTypesStore() {
  const { subscribe, set, update } = writable<Record<string, RelType>>({ ...DEFAULT_REL_TYPES });

  function persist(all: Record<string, RelType>) {
    if (typeof window === 'undefined') return;
    // 커스텀만 골라서 저장 (기본값은 코드에 있으니)
    const custom: Record<string, RelType> = {};
    Object.entries(all).forEach(([k, v]) => { if (v.custom) custom[k] = v; });
    localStorage.setItem(TYPES_KEY, JSON.stringify(custom));
  }

  return {
    subscribe,

    load() {
      if (typeof window === 'undefined') return;
      try {
        const raw = localStorage.getItem(TYPES_KEY);
        const custom = raw ? JSON.parse(raw) : {};
        set({ ...DEFAULT_REL_TYPES, ...custom });
      } catch (e) {
        console.error('[relTypes] load 실패:', e);
      }
    },

    add(label: string, color: string): string | null {
      const name = label.trim().slice(0, 8);
      if (!name) return null;
      const id = `c${Date.now()}`;
      update((all) => {
        const next = { ...all, [id]: { label: name, color, custom: true } };
        persist(next);
        return next;
      });
      return id;
    },

    remove(id: string) {
      update((all) => {
        if (!all[id]?.custom) return all; // 기본 종류는 못 지움
        const next = { ...all };
        delete next[id];
        persist(next);
        return next;
      });
    }
  };
}

export const relTypes = createTypesStore();

/* ───── 선별 라벨 (`from->to` -> 관계 종류 id) ───── */

function createLabelsStore() {
  const { subscribe, set, update } = writable<Record<string, string>>({});

  function persist(map: Record<string, string>) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LABELS_KEY, JSON.stringify(map));
    }
  }

  return {
    subscribe,

    load() {
      if (typeof window === 'undefined') return;
      try {
        const raw = localStorage.getItem(LABELS_KEY);
        if (raw) set(JSON.parse(raw));
      } catch (e) {
        console.error('[relationLabels] load 실패:', e);
      }
    },

    // type에 null을 주면 라벨 제거
    setLabel(fromId: string, toId: string, type: string | null) {
      update((map) => {
        const key = `${fromId}->${toId}`;
        const next = { ...map };
        if (type) next[key] = type;
        else delete next[key];
        persist(next);
        return next;
      });
    }
  };
}

export const relationLabels = createLabelsStore();

// (구버전 호환) REL_TYPES 이름으로도 내보냄
export const REL_TYPES = DEFAULT_REL_TYPES;
