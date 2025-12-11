// src/lib/services/db.ts
import { browser } from '$app/environment';
import type { WorldDoc } from '$lib/domain/docs';

// 브라우저 저장소 키 (버전까지 포함해서 나중에 스키마 바꿀 때 구분하기 좋게)
const STORAGE_KEY = 'genesis.world_docs.v1';

// ◼ world_docs 전체를 읽어오는 함수
export function loadWorldDocs(): WorldDoc[] {
  if (!browser) {
    // SSR 단계에서는 localStorage가 없으니 그냥 빈 배열
    return [];
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as WorldDoc[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error('[GENESIS] Failed to parse stored docs', err);
    return [];
  }
}

// ◼ world_docs 전체를 통째로 저장하는 함수
export function saveWorldDocs(docs: WorldDoc[]): void {
  if (!browser) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (err) {
    console.error('[GENESIS] Failed to save docs', err);
  }
}
