// src/lib/stores/trashStore.ts
//
// 삭제한 문서를 잠시 보관한다.
// 문서 본체는 localStorage 별도 키에 담고, 목록 갱신 알림용으로 스토어를 함께 둔다.

import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { WorldDoc } from '$lib/domain/docs';

const TRASH_KEY = 'genesis.world_docs.trash.v1';

/** 이 기간이 지난 항목은 열 때 자동으로 비운다 */
export const RETENTION_DAYS = 30;
/** 너무 불어나지 않게 상한 */
const MAX_ITEMS = 300;

export type TrashItem = {
  doc: WorldDoc;
  deletedAt: string; // ISO
};

/** 목록 화면이 구독해서 개수 표시 등에 쓴다 */
export const trashCount = writable(0);

function readRaw(): TrashItem[] {
  if (!browser) return [];
  try {
    const raw = localStorage.getItem(TRASH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[trash] 읽기 실패', err);
    return [];
  }
}

function writeRaw(items: TrashItem[]): void {
  if (!browser) return;
  try {
    localStorage.setItem(TRASH_KEY, JSON.stringify(items));
    trashCount.set(items.length);
  } catch (err) {
    // 용량 초과 시 오래된 것부터 덜어내고 재시도
    console.error('[trash] 저장 실패, 오래된 항목 정리 후 재시도', err);
    const half = items.slice(0, Math.floor(items.length / 2));
    try {
      localStorage.setItem(TRASH_KEY, JSON.stringify(half));
      trashCount.set(half.length);
    } catch {
      /* 그래도 안 되면 포기 — 삭제 자체는 이미 끝났다 */
    }
  }
}

/** 보관 기간이 지난 항목 제거 */
function prune(items: TrashItem[]): TrashItem[] {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const alive = items.filter((it) => {
    const t = Date.parse(it.deletedAt);
    return Number.isNaN(t) ? true : t >= cutoff;
  });
  return alive.length > MAX_ITEMS ? alive.slice(-MAX_ITEMS) : alive;
}

/** 최신 삭제가 위로 오도록 정렬해서 반환 */
export function listTrash(category?: string): TrashItem[] {
  const items = prune(readRaw());
  const filtered = category ? items.filter((it) => it.doc.category === category) : items;
  return [...filtered].reverse();
}

export function trashSize(category?: string): number {
  return listTrash(category).length;
}

/** 삭제 직전에 호출 — 문서를 보관함에 넣는다 */
export function moveToTrash(docs: WorldDoc[]): void {
  if (!browser || docs.length === 0) return;
  const now = new Date().toISOString();
  const items = prune(readRaw());
  for (const doc of docs) {
    // 같은 id가 이미 있으면 최신 것으로 교체
    const idx = items.findIndex((it) => it.doc.id === doc.id);
    if (idx >= 0) items.splice(idx, 1);
    items.push({ doc: JSON.parse(JSON.stringify(doc)), deletedAt: now });
  }
  writeRaw(prune(items));
}

/** 보관함에서 꺼낸다 (복원은 호출한 쪽에서 docStore에 다시 넣는다) */
export function takeFromTrash(ids: string[]): WorldDoc[] {
  const items = prune(readRaw());
  const taken: WorldDoc[] = [];
  const rest: TrashItem[] = [];
  for (const it of items) {
    if (ids.includes(it.doc.id)) taken.push(it.doc);
    else rest.push(it);
  }
  writeRaw(rest);
  return taken;
}

/** 완전 삭제 */
export function purgeFromTrash(ids: string[]): void {
  const items = prune(readRaw()).filter((it) => !ids.includes(it.doc.id));
  writeRaw(items);
}

/** 보관함 비우기 (카테고리 지정 시 그 카테고리만) */
export function emptyTrash(category?: string): void {
  if (!category) {
    writeRaw([]);
    return;
  }
  writeRaw(prune(readRaw()).filter((it) => it.doc.category !== category));
}

/** 앱 시작 시 한 번 — 기간 지난 것 정리 + 개수 반영 */
export function initTrash(): void {
  if (!browser) return;
  writeRaw(prune(readRaw()));
}
