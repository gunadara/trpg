// src/lib/domain/extraFields.ts
// 완성된 시트에 사용자가 직접 덧붙이는 칸의 타입.
// 저장 위치: WorldDoc.attributes.profile.extra[섹션id]

export type ExtraFieldType = 'text' | 'long' | 'list';

export type ExtraField = {
  id: string;
  label: string;
  type: ExtraFieldType;
  /** text / long 에서 사용. 다른 타입에서도 빈 문자열로 존재 */
  value: string;
  /** list 에서 사용. 다른 타입에서도 빈 배열로 존재 */
  items: string[];
};

export const EXTRA_TYPE_LABEL: Record<ExtraFieldType, string> = {
  text: '짧게 한 줄',
  long: '길게 여러 줄',
  list: '여러 개 나열'
};

/** 무엇을 적는 칸인지 */
export const EXTRA_TYPE_HINT: Record<ExtraFieldType, string> = {
  text: '한 칸에 한 마디만. 줄바꿈 안 됨',
  long: '문단으로 길게. 칸이 늘어남',
  list: '항목을 하나씩 추가·삭제. 순서 있음'
};

/** 실제로 이런 걸 적게 됩니다 */
export const EXTRA_TYPE_EXAMPLE: Record<ExtraFieldType, string> = {
  text: '고향 → 설화국 남부',
  long: '어머니와의 사이 → 열 살에 집을 나온 뒤로…',
  list: '자주 쓰는 무기 → 장검 / 단검 / 활'
};

/** 메뉴에서 모양을 미리 보여줄 때 쓰는 더미 */
export const EXTRA_TYPE_PREVIEW: Record<ExtraFieldType, string[]> = {
  text: ['설화국 남부'],
  long: ['열 살에 집을 나온 뒤로', '한 번도 돌아가지 않았다'],
  list: ['장검', '단검', '활']
};

export const EXTRA_TYPES: ExtraFieldType[] = ['text', 'long', 'list'];

export function makeExtraField(type: ExtraFieldType): ExtraField {
  return {
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: '',
    type,
    value: '',
    items: type === 'list' ? [''] : []
  };
}

/** 예전 데이터/깨진 데이터가 들어와도 안전하게 정규화 */
export function normalizeExtraFields(raw: unknown): ExtraField[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f: any) => ({
    id: f?.id ?? `f-${Math.random().toString(36).slice(2, 8)}`,
    label: typeof f?.label === 'string' ? f.label : '',
    type: (['text', 'long', 'list'].includes(f?.type) ? f.type : 'text') as ExtraFieldType,
    value: typeof f?.value === 'string' ? f.value : '',
    items: Array.isArray(f?.items) ? f.items.map(String) : []
  }));
}
