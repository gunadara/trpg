// src/lib/stores/tagStore.ts
// 소재 태그 3단 구조: 대분류(Group) > 세부분류(Sub) > 태그(Tag)
// 기존 2단 drawStore 데이터(genesis.draw)를 자동으로 흡수한다.
import { writable } from 'svelte/store';

const STORAGE_KEY = 'genesis.tags';
const OLD_DRAW_KEY = 'genesis.draw'; // 기존 2단 소재뽑기 저장 키

export type Sub = { id: string; name: string; tags: string[]; enabled?: boolean };
export type Group = { id: string; name: string; subs: Sub[] };
export type TagData = { groups: Group[] };

function uid(p: string) {
  return `${p}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// ── 기본 데이터 (시아가 정리해온 예시 반영) ──
export const DEFAULT_TAGS: TagData = {
  groups: [
    {
      id: uid('g'), name: '장면 글감',
      subs: [
        { id: uid('s'), name: '장소', enabled: true, tags: ['계단', '지하도', '잠긴 문', '창문', '마지막 버스', '옥상', '폐서점'] },
        { id: uid('s'), name: '사물', enabled: true, tags: ['거울', '달력', '꺼진 전화', '편지', '빈 의자', '지도', '녹슨 열쇠', '사진'] },
        { id: uid('s'), name: '분위기', enabled: true, tags: ['낯선 냄새', '새벽 세시', '반복', '목소리', '그림자', '안개', '이름'] }
      ]
    },
    {
      id: uid('g'), name: '인물',
      subs: [
        { id: uid('s'), name: '성격/태도', enabled: true, tags: ['냉정하지만 다정함', '거짓말을 못 함', '눈치 빠름', '비겁하지만 결정적일 때 나섬', '맹목적으로 충성함'] },
        { id: uid('s'), name: '역할/직업', enabled: true, tags: ['전직 기사', '수상한 점원', '가짜 성녀', '떠돌이 약장수', '몰락 귀족'] },
        { id: uid('s'), name: '비밀/과거', enabled: true, tags: ['가짜 신분', '기억 상실', '전쟁 생존자', '버려진 핏줄', '지워진 이름'] },
        { id: uid('s'), name: '욕망/결핍', enabled: true, tags: ['인정받고 싶음', '잃은 것을 되찾고 싶음', '복수하고 싶음', '속죄하고 싶음', '자유로워지고 싶음'] },
        { id: uid('s'), name: '말투/습관', enabled: true, tags: ['존댓말만 씀', '농담으로 진심 감춤', '말끝을 흐림', '혼잣말이 많음'] }
      ]
    },
    {
      id: uid('g'), name: '사건',
      subs: [
        { id: uid('s'), name: '실종/납치', enabled: true, tags: ['누군가 사라짐', '납치당함', '흔적 없이 증발'] },
        { id: uid('s'), name: '정체폭로', enabled: true, tags: ['정체가 들킴', '비밀 폭로', '가면이 벗겨짐'] },
        { id: uid('s'), name: '계약/거래', enabled: true, tags: ['계약 파기', '위험한 거래', '대가를 치름'] }
      ]
    },
    {
      id: uid('g'), name: '장르/톤',
      subs: [
        { id: uid('s'), name: '장르', enabled: true, tags: ['로판', '학원물', '미스터리', '다크 판타지', '느와르'] },
        { id: uid('s'), name: '분위기', enabled: true, tags: ['피폐', '코믹', '잔잔함', '괴담풍', '비극'] },
        { id: uid('s'), name: '서사맛', enabled: true, tags: ['구원 서사', '복수 서사', '성장물', '관계 파탄'] }
      ]
    }
  ]
};

function clone(d: TagData): TagData {
  return {
    groups: d.groups.map((g) => ({
      id: g.id, name: g.name,
      subs: g.subs.map((s) => ({ id: s.id, name: s.name, enabled: s.enabled !== false, tags: [...s.tags] }))
    }))
  };
}

// 기존 2단 데이터(genesis.draw)를 3단으로 변환해 "장면 글감" 대분류로
function migrateOldDraw(): Group | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OLD_DRAW_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw);
    if (!Array.isArray(old?.categories)) return null;
    return {
      id: uid('g'), name: '소재뽑기 (이전)',
      subs: old.categories.map((c: any) => ({
        id: uid('s'),
        name: String(c?.name ?? '분류'),
        enabled: c?.enabled !== false,
        tags: Array.isArray(c?.words) ? c.words.map(String) : []
      }))
    };
  } catch {
    return null;
  }
}

function load(): TagData {
  if (typeof window === 'undefined') return clone(DEFAULT_TAGS);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.groups)) return parsed;
    }
    // 첫 실행: 기본값 + (있으면) 기존 2단 데이터 흡수
    const base = clone(DEFAULT_TAGS);
    const migrated = migrateOldDraw();
    if (migrated && migrated.subs.some((s) => s.tags.length > 0)) {
      base.groups.push(migrated);
    }
    return base;
  } catch (e) {
    console.error('[tags] load 실패:', e);
    return clone(DEFAULT_TAGS);
  }
}

function createStore() {
  const { subscribe, set, update } = writable<TagData>(clone(DEFAULT_TAGS));

  function persist(d: TagData) {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  }

  return {
    subscribe,
    load() { set(load()); },

    // ── 대분류 ──
    addGroup(name: string): string {
      const id = uid('g');
      update((d) => { d.groups.push({ id, name: name.trim().slice(0, 16) || '새 분야', subs: [] }); persist(d); return d; });
      return id;
    },
    renameGroup(gid: string, name: string) {
      update((d) => { const g = d.groups.find((x) => x.id === gid); if (g) g.name = name.trim().slice(0, 16) || g.name; persist(d); return d; });
    },
    deleteGroup(gid: string) {
      update((d) => { d.groups = d.groups.filter((g) => g.id !== gid); persist(d); return d; });
    },

    // ── 세부분류 ──
    addSub(gid: string, name: string): string {
      const id = uid('s');
      update((d) => { const g = d.groups.find((x) => x.id === gid); if (g) g.subs.push({ id, name: name.trim().slice(0, 16) || '새 항목', tags: [], enabled: true }); persist(d); return d; });
      return id;
    },
    renameSub(gid: string, sid: string, name: string) {
      update((d) => { const s = d.groups.find((g) => g.id === gid)?.subs.find((x) => x.id === sid); if (s) s.name = name.trim().slice(0, 16) || s.name; persist(d); return d; });
    },
    deleteSub(gid: string, sid: string) {
      update((d) => { const g = d.groups.find((x) => x.id === gid); if (g) g.subs = g.subs.filter((s) => s.id !== sid); persist(d); return d; });
    },
    toggleSub(gid: string, sid: string) {
      update((d) => { const s = d.groups.find((g) => g.id === gid)?.subs.find((x) => x.id === sid); if (s) s.enabled = s.enabled === false; persist(d); return d; });
    },

    // ── 태그 ──
    addTags(gid: string, sid: string, raw: string) {
      const parts = raw.split(',').map((t) => t.trim()).filter(Boolean);
      update((d) => {
        const s = d.groups.find((g) => g.id === gid)?.subs.find((x) => x.id === sid);
        if (s) for (const p of parts) if (!s.tags.includes(p)) s.tags.push(p);
        persist(d); return d;
      });
    },
    removeTag(gid: string, sid: string, tag: string) {
      update((d) => { const s = d.groups.find((g) => g.id === gid)?.subs.find((x) => x.id === sid); if (s) s.tags = s.tags.filter((t) => t !== tag); persist(d); return d; });
    },

    resetAll() { const d = clone(DEFAULT_TAGS); set(d); persist(d); }
  };
}

export const tagStore = createStore();
