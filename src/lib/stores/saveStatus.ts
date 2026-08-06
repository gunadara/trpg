// src/lib/stores/saveStatus.ts
// 문서 자동저장 상태 — 화면 어디서든 같은 상태를 보여주기 위한 전역 스토어

import { derived, writable } from 'svelte/store';

export type SaveState = 'idle' | 'dirty' | 'saved' | 'error';

export type SaveStatus = {
  state: SaveState;
  at: number | null;   // 마지막 저장 시각 (epoch ms)
  message?: string;    // 실패 사유 등
};

function createSaveStatus() {
  const { subscribe, set } = writable<SaveStatus>({ state: 'idle', at: null });

  return {
    subscribe,

    /** 변경 감지 → 아직 저장 전 */
    markDirty() {
      set({ state: 'dirty', at: null });
    },

    /** 저장 완료 */
    markSaved() {
      set({ state: 'saved', at: Date.now() });
    },

    /** 저장 실패 (localStorage 용량 초과 등) */
    markError(message?: string) {
      set({ state: 'error', at: null, message });
    },

    /** 문서를 떠날 때 등 */
    reset() {
      set({ state: 'idle', at: null });
    }
  };
}

export const saveStatus = createSaveStatus();

function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** DocEditLayout의 saveMessage 등에 바로 꽂아 쓸 수 있는 라벨 */
export const saveStatusLabel = derived(saveStatus, ($s): string => {
  switch ($s.state) {
    case 'dirty':
      return '저장 중…';
    case 'saved':
      return $s.at ? `저장됨 ${hhmm($s.at)}` : '저장됨';
    case 'error':
      return $s.message ?? '⚠️ 저장 실패 — 저장 공간이 부족할 수 있어요';
    default:
      return '';
  }
});
