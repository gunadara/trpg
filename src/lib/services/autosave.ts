// src/lib/services/autosave.ts
// 문서 자동저장 — 디바운스 + 상태 표시 + 이탈 시 flush
//
// 기존: 각 [id]/+page.svelte 에서 `$: if (browser && selectedDoc) saveDoc(selectedDoc)`
//       → 한 글자마다 문서 배열 전체를 localStorage에 직렬화. 표시도 없음.
// 변경: `$: if (browser && selectedDoc) queueSave(selectedDoc)`
//       → 500ms 디바운스, 실제 변경 없으면 스킵, 상태는 saveStatus에 반영.

import { browser } from '$app/environment';
import type { WorldDoc } from '$lib/domain/docs';
import { saveDoc } from '$lib/stores/docStore';
import { saveStatus } from '$lib/stores/saveStatus';

const DEBOUNCE_MS = 500;

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: WorldDoc | null = null;

/** 문서별 마지막 저장 시점의 내용 스냅샷 (불필요한 저장 차단용) */
const lastSnapshot = new Map<string, string>();

function snapshot(doc: WorldDoc): string {
  // updatedAt은 저장할 때마다 바뀌므로 비교 대상에서 제외
  const { updatedAt: _updatedAt, ...rest } = doc;
  try {
    return JSON.stringify(rest);
  } catch {
    // 순환참조 등 — 비교 불가하면 항상 저장하도록 유니크값 반환
    return `unserializable-${Math.random()}`;
  }
}

/**
 * 저장 예약. 반응형 구문에서 매 입력마다 호출해도 안전하다.
 * - 내용이 실제로 안 바뀌었으면 아무것도 안 함
 * - 문서를 처음 본 시점은 "기준선"으로만 잡고 저장하지 않음 (열자마자 저장되는 것 방지)
 */
export function queueSave(doc: WorldDoc | null | undefined): void {
  if (!browser || !doc) return;

  const snap = snapshot(doc);

  // 이 문서를 처음 보는 경우 = 방금 로드됨 → 기준선만 기록
  if (!lastSnapshot.has(doc.id)) {
    lastSnapshot.set(doc.id, snap);
    return;
  }

  // 내용 변화 없음 → 무시
  if (lastSnapshot.get(doc.id) === snap) return;

  pending = doc;
  saveStatus.markDirty();

  if (timer) clearTimeout(timer);
  timer = setTimeout(flushSave, DEBOUNCE_MS);
}

/** 예약된 저장을 즉시 실행. 페이지 이탈·라우트 이동 직전에 호출할 것. */
export function flushSave(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  const doc = pending;
  pending = null;
  if (!doc) return;

  try {
    saveDoc(doc);
    lastSnapshot.set(doc.id, snapshot(doc));
    saveStatus.markSaved();
  } catch (err) {
    console.error('[autosave] 저장 실패', err);
    saveStatus.markError();
  }
}

/** 문서를 삭제했거나 외부에서 갈아끼웠을 때 기준선 폐기 */
export function forgetSnapshot(id: string): void {
  lastSnapshot.delete(id);
}

// ── 이탈 시 안전장치 ──
if (browser) {
  window.addEventListener('pagehide', flushSave);
  window.addEventListener('beforeunload', flushSave);
  document.addEventListener('visibilitychange', () => {
    // 안드로이드에서 앱을 백그라운드로 보낼 때 여기로 들어옴
    if (document.visibilityState === 'hidden') flushSave();
  });
}
