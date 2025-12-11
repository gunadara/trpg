-- GENESIS – 표준 문서 테이블 (MVP 1차)

CREATE TABLE IF NOT EXISTS world_docs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,        -- 'characters' | 'races' | ...
  title TEXT NOT NULL,
  summary TEXT,                  -- NULL 허용
  content TEXT NOT NULL,         -- 리치 텍스트 or 마크다운
  thumbnail_path TEXT,           -- 파일 경로 or URL

  created_at TEXT NOT NULL,      -- ISO 문자열
  updated_at TEXT NOT NULL
);

-- 카테고리별 조회 자주 할 예정이니 인덱스 하나
CREATE INDEX IF NOT EXISTS idx_world_docs_category
  ON world_docs (category);
