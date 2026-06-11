// src/lib/stores/templateStore.ts
import type { TemplateDef } from '$lib/domain/templates';

function now() { return Date.now(); }

// MVP: 아무 카테고리든 최소한 렌더는 되게 하는 기본 템플릿
export function getBaseTemplate(scope: string): TemplateDef {
  return {
    id: `base_${scope}_v1`,
    scope,
    kind: 'base',
    title: '기본 템플릿',
    updatedAt: now(),
    sections: [
      {
        id: 'core',
        title: '기본',
        collapsedByDefault: false,
        fields: [
          { key: 'summary', label: '한 줄 요약', type: 'longText', lock: 'template' },
          { key: 'tags', label: '태그', type: 'tags', lock: 'template' }
        ]
      },
      {
        id: 'notes',
        title: '메모',
        collapsedByDefault: true,
        fields: [
          { key: 'note', label: '자유 메모', type: 'longText', lock: 'template' }
        ]
      }
    ]
  };
}
