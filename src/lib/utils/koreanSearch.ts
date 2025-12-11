// src/lib/utils/koreanSearch.ts

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const CHO_CNT = 19;
const JUNG_CNT = 21;
const JONG_CNT = 28;

const CHO_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ',
  'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ',
  'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

// 문자열을 초성 문자열로 변환 (예: "오늘이" → "ㅇㄴㅇ")
function getChosung(text: string): string {
  let result = '';

  for (const ch of text) {
    const code = ch.charCodeAt(0);

    // 한글 음절 범위
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
      const syllableIndex = code - HANGUL_BASE;
      const choIndex = Math.floor(syllableIndex / (JUNG_CNT * JONG_CNT));
      result += CHO_LIST[choIndex];
    } else if (/[ㄱ-ㅎ]/.test(ch)) {
      // 이미 자모만 있는 경우도 그냥 붙여줌
      result += ch;
    } else {
      // 한글이 아니면 그냥 스킵
    }
  }

  return result;
}

// 본문(text)이 쿼리(rawQuery)를 "포함하는지" 확인
// - 그대로 포함 (저, 설화, moon 등)
// - 쿼리가 ㄱ-ㅎ만으로 되어 있으면 초성 검색
export function matchesTextQuery(text: string, rawQuery: string): boolean {
  const q = rawQuery.trim();
  if (!q) return true; // 빈 쿼리는 항상 매치

  const lowerText = text.toLowerCase();
  const lowerQ = q.toLowerCase();

  // 1) 그대로 포함되는지 먼저 체크
  if (lowerText.includes(lowerQ)) {
    return true;
  }

  // 2) 쿼리가 "초성만"으로 이루어진 경우 → 초성 검색
  if (/^[ㄱ-ㅎ]+$/.test(lowerQ)) {
    const cho = getChosung(text);
    if (cho.includes(lowerQ)) {
      return true;
    }
  }

  return false;
}
