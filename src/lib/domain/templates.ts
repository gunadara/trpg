// src/lib/domain/templates.ts
export type TemplateScope = string; // categoryId (builtin/custom 모두)
export type TemplateKind = 'base' | 'custom';

export type FieldType =
  | 'shortText'
  | 'longText'
  | 'number'
  | 'boolean'
  | 'select'
  | 'tags';

export type FieldLock = 'system' | 'template' | 'custom';

export type FieldDef = {
  key: string;        // 데이터 키(고정) - 충돌 방지용
  label: string;      // 화면 표시 라벨(변경 가능)
  type: FieldType;
  required?: boolean;
  lock?: FieldLock;   // base/custom 정책 판단용
  options?: string[]; // select
  visibility?: 'public' | 'private';
};

export type SectionDef = {
  id: string;
  title: string;
  collapsedByDefault?: boolean;
  fields: FieldDef[];
};

export type TemplateDef = {
  id: string;
  scope: TemplateScope;
  kind: TemplateKind; // base/custom
  title: string;
  basedOnId?: string; // base에서 복제한 경우
  sections: SectionDef[];
  updatedAt: number;
};

// 문서 저장용 값(템플릿 기반 form state)
export type TemplateValues = Record<string, unknown>;
