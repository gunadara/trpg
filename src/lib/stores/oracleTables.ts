// src/lib/stores/oracleTables.ts
// 오라클이 쓰는 단어 테이블 — 사용자가 직접 고칠 수 있게 저장소로 분리
import { writable } from 'svelte/store';

const STORAGE_KEY = 'genesis.oracle_tables';

export type OracleTables = {
  moods: string[];       // 씬 뽑기: 분위기
  eventFocus: string[];  // 전개 뽑기: 사건의 방향
  sparkVerbs: string[];  // 전개 뽑기: 단서 동사
  sparkNouns: string[];  // 전개 뽑기: 단서 명사
};

export const DEFAULT_TABLES: OracleTables = {
  moods: [
    '고요하지만 어딘가 어긋난', '긴장이 감도는', '축제 분위기의', '안개가 짙은',
    '폐허가 된', '낯선 자들로 붐비는', '시간이 멈춘 듯한', '비가 쏟아지는',
    '감시당하는 느낌의', '오래 버려져 있던', '소문이 떠도는', '경계가 삼엄한'
  ],
  eventFocus: [
    '위협이 다가온다', '뜻밖의 인물이 개입한다', '숨겨진 진실의 단서가 드러난다',
    '상황이 호전된다', '상황이 악화된다', '누군가 거짓말을 하고 있다',
    '오래된 일이 되돌아온다', '동맹에 금이 간다', '새로운 기회가 열린다',
    '무언가를 잃는다', '무언가를 얻는다', '예상치 못한 도움이 온다'
  ],
  sparkVerbs: [
    '배신하다', '숨기다', '뒤쫓다', '협상하다', '파괴하다', '지키다',
    '훔치다', '폭로하다', '희생하다', '의심하다', '약속하다', '도망치다',
    '거래하다', '봉인하다', '깨우다', '속이다', '구출하다', '복수하다'
  ],
  sparkNouns: [
    '오래된 약속', '금지된 지식', '잃어버린 이름', '두 번째 기회', '가짜 평화',
    '마지막 열쇠', '깨진 계약', '숨겨진 핏줄', '빌린 시간', '되찾은 기억',
    '불길한 징조', '뜻밖의 유산', '닫힌 문', '낡은 지도', '지워진 기록'
  ]
};

function clone(t: OracleTables): OracleTables {
  return {
    moods: [...t.moods],
    eventFocus: [...t.eventFocus],
    sparkVerbs: [...t.sparkVerbs],
    sparkNouns: [...t.sparkNouns]
  };
}

function load(): OracleTables {
  if (typeof window === 'undefined') return clone(DEFAULT_TABLES);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // 키별로 검증 — 비어있거나 깨진 키는 기본값으로
      const result = clone(DEFAULT_TABLES);
      (Object.keys(result) as (keyof OracleTables)[]).forEach((k) => {
        if (Array.isArray(parsed[k]) && parsed[k].length > 0) {
          result[k] = parsed[k].map(String);
        }
      });
      return result;
    }
  } catch (e) {
    console.error('[oracleTables] load 실패:', e);
  }
  return clone(DEFAULT_TABLES);
}

function createStore() {
  const { subscribe, set } = writable<OracleTables>(clone(DEFAULT_TABLES));

  return {
    subscribe,

    // 브라우저에서 저장분 불러오기 (페이지 onMount에서 호출)
    load() {
      set(load());
    },

    // 전체 저장
    save(tables: OracleTables) {
      // 빈 줄 제거 + 최소 1개 보장
      const cleaned = clone(tables);
      (Object.keys(cleaned) as (keyof OracleTables)[]).forEach((k) => {
        cleaned[k] = cleaned[k].map((s) => s.trim()).filter(Boolean);
        if (cleaned[k].length === 0) cleaned[k] = [...DEFAULT_TABLES[k]];
      });
      set(cleaned);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      }
    },

    // 기본값 복원
    reset() {
      set(clone(DEFAULT_TABLES));
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };
}

export const oracleTables = createStore();
