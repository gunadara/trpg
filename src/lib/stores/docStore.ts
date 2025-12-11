// src/lib/stores/docStore.ts
import type { CategoryId } from '$lib/domain/categories';
import type { WorldDoc } from '$lib/domain/docs';
import { loadWorldDocs, saveWorldDocs } from '$lib/services/db';
import { matchesTextQuery } from '$lib/utils/koreanSearch';

import { get } from 'svelte/store';
import { currentWorldId } from '$lib/stores/worldStore';
import {
  saveWorldDocsToSQLite,
  loadWorldDocsFromSQLite
} from '$lib/services/sqlite';


// ID 생성기 (카테고리 prefix + uuid/타임스탬프)
function makeId(category: CategoryId): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${category}-${crypto.randomUUID()}`;
  }
  return `${category}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// 카테고리별 기본 제목 접두사
const CATEGORY_LABEL: Record<CategoryId, string> = {
  characters: '인물 문서',
  races: '종족 문서',
  groups: '단체 문서',
  nations: '국가 문서',
  locations: '장소 문서',
  events: '사건 문서',
  storylines: '스토리 라인'
};

const DEFAULT_WORLD_ID = 'default';  // ⬅ 기본 세계 id 하나 정해두기

// 최초 앱 실행 시 사용할 기본 예시 데이터
const DEFAULT_DOCS: WorldDoc[] = [
  {
    id: makeId('characters'),
    worldId: DEFAULT_WORLD_ID,      
    category: 'characters',
    title: '예시 인물 – 오늘이',
    summary: '세계관 샘플 인물. 실제 데이터 대신 임시로 사용 중.',
    content: '',
    thumbnailPath: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: makeId('races'),
    worldId: DEFAULT_WORLD_ID, 
    category: 'races',
    title: '예시 종족 – 월화족',
    summary: '달빛과 꽃을 다루는 종족. 세계관 샘플 데이터.',
    content: '',
    thumbnailPath: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: makeId('groups'),
    worldId: DEFAULT_WORLD_ID, 
    category: 'groups',
    title: '예시 단체 – 달빛 길드',
    summary: '월광 아래서만 활동하는 비밀 길드. 샘플 데이터.',
    content: '',
    thumbnailPath: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: makeId('nations'),
    worldId: DEFAULT_WORLD_ID, 
    category: 'nations',
    title: '예시 국가 – 설화국',
    summary: '눈과 설화가 지배하는 왕국. 샘플 데이터.',
    content: '',
    thumbnailPath: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: makeId('locations'),
    worldId: DEFAULT_WORLD_ID, 
    category: 'locations',
    title: '예시 장소 – 안개 숲',
    summary: '길을 잃은 자의 소원을 들려준다는 안개 낀 숲.',
    content: '',
    thumbnailPath: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: makeId('events'),
    worldId: DEFAULT_WORLD_ID, 
    category: 'events',
    title: '예시 사건 – 붉은 달의 밤',
    summary: '달이 붉게 변하며 세계 곳곳에서 이상 현상이 발생한 밤.',
    content: '',
    thumbnailPath: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: makeId('storylines'),
    worldId: DEFAULT_WORLD_ID, 
    category: 'storylines',
    title: '예시 스토리 라인 – 메인 퀘스트',
    summary: '세계의 균형이 무너져가는 가운데, 주인공이 선택받는 여정.',
    content: '',
    thumbnailPath: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  }
];

// 모듈 내부에서 유지하는 "현재 세션의 세계관 문서들"
let memoryDocs: WorldDoc[] = [];

function ensureInitialized() {
  if (memoryDocs.length > 0) return;

  const stored = loadWorldDocs();

  if (stored.length > 0) {
    let needsSave = false;

    // stored를 WorldDoc[]라고 명시
    memoryDocs = (stored as WorldDoc[]).map((doc) => {
      if (!doc.worldId) {
        needsSave = true;
        return { ...doc, worldId: DEFAULT_WORLD_ID };
      }
      return doc;
    });

    if (needsSave) {
      saveWorldDocs(memoryDocs);
    }
  } else {
    memoryDocs = [...DEFAULT_DOCS];
    saveWorldDocs(memoryDocs);
  }
}


// ◼ 카테고리별 문서 목록 조회
export function listDocs(category: CategoryId): WorldDoc[] {
  ensureInitialized();

  const worldId = getCurrentWorldId();

  return memoryDocs
    .filter(
      (doc) =>
        doc.category === category &&
        (doc.worldId ?? DEFAULT_WORLD_ID) === worldId
    )
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)); // 최근 수정 순
}

// ◼ id로 단일 문서 조회
export function getDocById(id: string): WorldDoc | null {
  ensureInitialized();

  return memoryDocs.find((doc) => doc.id === id) ?? null;
}

// ◼ 전체 문서 목록 조회 (카테고리 무시)
export function listAllDocs(): WorldDoc[] {
  ensureInitialized();

  const worldId = getCurrentWorldId();

  return [...memoryDocs]
    .filter((doc) => (doc.worldId ?? DEFAULT_WORLD_ID) === worldId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

// ◼ mentions 정리: 본문에 실제로 남아있는 @만 유지 (in-place)
function normalizeMentionsInPlace(doc: WorldDoc): void {
  const content = doc.content ?? '';
  const original = doc.mentions ?? [];

  // mentions가 없거나 본문이 비면 그대로
  if (!original.length || !content) return;

  const cleaned: string[] = [];

  for (const id of original) {
    const target = getDocById(id);
    if (!target) continue;

    const token = `@${target.title}`;
    if (content.includes(token)) {
      cleaned.push(id);
    }
  }

  // 길이가 같으면 굳이 덮어쓸 필요 없음
  if (cleaned.length === original.length) return;

  doc.mentions = cleaned;
}

function getCurrentWorldId(): string {
  try {
    const id = get(currentWorldId);
    return id || DEFAULT_WORLD_ID;
  } catch {
    return DEFAULT_WORLD_ID;
  }
}

// ◼ 새 "빈" 문서 생성 + 목록에 추가
export function createBlankDoc(category: CategoryId): WorldDoc {
  ensureInitialized();

  const now = new Date().toISOString();
  const worldId = getCurrentWorldId();

  const newDoc: WorldDoc = {
    id: makeId(category),
    worldId, 
    category,
    title: `제목 없는 ${CATEGORY_LABEL[category]}`,
    summary: '',
    content: '',
    thumbnailPath: null,
    createdAt: now,
    updatedAt: now
  };

  memoryDocs = [newDoc, ...memoryDocs];
  saveWorldDocs(memoryDocs);

  return newDoc;
}

// ◼ 문서 삭제
export function deleteDoc(id: string): void {
  ensureInitialized();

  // 1) 해당 문서 제거
  const removedId = id;
  memoryDocs = memoryDocs.filter((d) => d.id !== removedId);

  // 2) 다른 문서들 mentions에서 이 id 빼주기
  memoryDocs = memoryDocs.map((d) => {
    const m = d.mentions ?? [];
    if (!m.length) return d;

    const nextMentions = m.filter((mid) => mid !== removedId);
    if (nextMentions.length === m.length) return d;

    return { ...d, mentions: nextMentions };
  });

  saveWorldDocs(memoryDocs);
}

// ◼ 문서 저장/업데이트
export function saveDoc(doc: WorldDoc): WorldDoc {
  ensureInitialized();

  // 🔹 먼저 mentions를 본문(@제목) 기준으로 "제자리에서" 정리
  normalizeMentionsInPlace(doc);

  const now = new Date().toISOString();
  const updated: WorldDoc = { ...doc, updatedAt: now };

  const idx = memoryDocs.findIndex((d) => d.id === updated.id);

  if (idx === -1) {
    memoryDocs = [updated, ...memoryDocs];
  } else {
    memoryDocs = [
      ...memoryDocs.slice(0, idx),
      updated,
      ...memoryDocs.slice(idx + 1)
    ];
  }

  saveWorldDocs(memoryDocs);
  return updated;
}


// ◼ 제목으로 문서 검색 (모든 카테고리 대상)
export function searchDocsByTitle(query: string): WorldDoc[] {
  ensureInitialized();

  const worldId = getCurrentWorldId();
  const q = query.trim();

  // 먼저 현재 world 문서들만 대상으로
  const base = memoryDocs.filter(
    (doc) => (doc.worldId ?? DEFAULT_WORLD_ID) === worldId
  );

  if (!q) {
    return base
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 20);
  }

  return base
    .filter((doc) => matchesTextQuery(doc.title ?? '', q))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 20);
}

// 🔹 현재 world의 문서들을 모두 SQLite(DB)에 저장하는 헬퍼
export async function syncCurrentWorldToSQLite(): Promise<void> {
  ensureInitialized();

  const worldId = getCurrentWorldId();
  const docsForWorld = memoryDocs.filter(
    (doc) => (doc.worldId ?? DEFAULT_WORLD_ID) === worldId
  );

  await saveWorldDocsToSQLite(worldId, docsForWorld);
}
// 🔹 SQLite에 저장된 현재 world 문서들을 메모리/로컬스토리지로 끌어오는 헬퍼
export async function hydrateCurrentWorldFromSQLite(): Promise<void> {
  // SSR 방어: 서버 렌더링 환경에서는 아무것도 안 함
  if (typeof window === 'undefined') return;

  ensureInitialized();

  const worldId = getCurrentWorldId();

  // 1) SQLite에서 해당 world 문서들 읽어오기
  const sqliteDocs = await loadWorldDocsFromSQLite(worldId);

  if (!sqliteDocs || sqliteDocs.length === 0) {
    console.info('[SQLite] hydrateCurrentWorldFromSQLite: no docs, skip', {
      worldId
    });
    return;
  }

  // 2) worldId가 빠져 있으면 보정
  const normalizedDocs = sqliteDocs.map((doc) => ({
    ...doc,
    worldId: doc.worldId ?? worldId
  }));

  // 3) 이 world가 아닌 문서들은 그대로 유지
  const otherWorldDocs = memoryDocs.filter(
    (doc) => (doc.worldId ?? DEFAULT_WORLD_ID) !== worldId
  );

  // 4) 메모리 상태 교체
  memoryDocs = [...otherWorldDocs, ...normalizedDocs];

  // 5) localStorage에도 반영
  saveWorldDocs(memoryDocs);

  console.info('[SQLite] hydrateCurrentWorldFromSQLite OK', {
    worldId,
    count: normalizedDocs.length
  });
}
