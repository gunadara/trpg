// src/lib/stores/relationLabels.ts
// 관계도의 선에 붙는 라벨 저장소 + 관계 종류(기본 + 사용자 추가) 관리
import { writable } from 'svelte/store';

const LABELS_KEY = 'genesis.relation_labels';
const TYPES_KEY = 'genesis.relation_types';

export type RelType = { label: string; color: string; custom?: boolean };

// 관계 선의 방향: to = from→to, from = to→from(반대), both = 양방향
export type RelDir = 'to' | 'from' | 'both';
// 관계 한 줄: 종류 + 방향 (b안 — 깔끔한 객체 구조)
export type RelEntry = { type: string; dir: RelDir };

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
  const { subscribe, set, update } = writable<Record<string, RelEntry>>({});

  function persist(map: Record<string, RelEntry>) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LABELS_KEY, JSON.stringify(map));
    }
  }

  // 구버전(값이 문자열=종류id) → 신버전({type, dir}) 자동 변환
  function migrate(raw: Record<string, any>): Record<string, RelEntry> {
    const out: Record<string, RelEntry> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'string') {
        out[k] = { type: v, dir: 'to' };
      } else if (v && typeof v === 'object' && typeof v.type === 'string') {
        const dir: RelDir = v.dir === 'both' || v.dir === 'from' ? v.dir : 'to';
        out[k] = { type: v.type, dir };
      }
    }
    return out;
  }

  return {
    subscribe,

    load() {
      if (typeof window === 'undefined') return;
      try {
        const raw = localStorage.getItem(LABELS_KEY);
        if (raw) {
          const migrated = migrate(JSON.parse(raw));
          set(migrated);
          persist(migrated); // 변환 결과를 저장(다음부턴 신버전)
        }
      } catch (e) {
        console.error('[relationLabels] load 실패:', e);
      }
    },

    // type에 null을 주면 관계 제거. dir 생략 시 기존 방향 유지(없으면 'to')
    setLabel(fromId: string, toId: string, type: string | null, dir?: RelDir) {
      update((map) => {
        const key = `${fromId}->${toId}`;
        const next = { ...map };
        if (type) {
          const prevDir = next[key]?.dir ?? 'to';
          next[key] = { type, dir: dir ?? prevDir };
        } else {
          delete next[key];
        }
        persist(next);
        return next;
      });
    },

    // 방향만 변경 (관계가 이미 있을 때)
    setDir(fromId: string, toId: string, dir: RelDir) {
      update((map) => {
        const key = `${fromId}->${toId}`;
        if (!map[key]) return map;
        const next = { ...map, [key]: { ...map[key], dir } };
        persist(next);
        return next;
      });
    }
  };
}

export const relationLabels = createLabelsStore();

// (구버전 호환) REL_TYPES 이름으로도 내보냄
export const REL_TYPES = DEFAULT_REL_TYPES;
