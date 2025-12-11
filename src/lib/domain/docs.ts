// src/lib/domain/docs.ts
import type { CategoryId } from '$lib/domain/categories';

export type WorldDoc = {
  id: string;
  worldId: string;             // ⭐ 세계 구분용 필드 추가
  category: CategoryId;
  title: string;
  summary: string;
  content: string;
  thumbnailPath: string | null;
  createdAt: string;
  updatedAt: string;
  mentions?: string[];         // 있으면 유지
};
