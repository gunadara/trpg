// src/lib/domain/docs.ts
import type { CategoryId } from '$lib/domain/categories';

// Phase 2: 카테고리별 전용 필드(JSON) 저장용
export type DocAttributes = Record<string, unknown>;

export type WorldDoc = {
  id: string;
  worldId: string;             // ⭐ 세계 구분용 필드
  category: CategoryId;

  title: string;
  summary: string;
  content: string;

  thumbnailPath: string | null;

  // Phase 2 핵심: 카테고리별 전용 데이터
  // - 예: characters: { level, vitals, stats, inventory, skills ... }
  // - 예: items: { type, grade, price, weight, stats, requirement ... }
  attributes?: DocAttributes;

  createdAt: string;
  updatedAt: string;

  mentions?: string[];         // 있으면 유지
};
