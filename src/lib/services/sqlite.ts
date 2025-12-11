// src/lib/services/sqlite.ts
// GENESIS 세계관용 SQLite 래퍼
// - 브라우저 / SSR 환경에서는 안전하게 stub 모드로 동작
// - Capacitor + @capacitor-community/sqlite가 있으면 실제 DB 사용

import { browser } from '$app/environment';
import type { WorldDoc } from '$lib/domain/docs';

const DB_NAME = 'genesis_worlds';
const DB_VERSION = 1;

// 실제 SQLite 커넥션 (있으면 사용, 없으면 stub)
let db: any | null = null;
let mode: 'sqlite' | 'stub' = 'stub';
let initPromise: Promise<void> | null = null;

// ────────────────────────────────────────────────
// 내부: Capacitor / SQLite 플러그인 동적 로딩
// ────────────────────────────────────────────────

type SQLiteDeps = {
  Capacitor: any;
  sqlite: any; // SQLiteConnection 인스턴스
};

async function loadSQLiteDeps(): Promise<SQLiteDeps | null> {
  if (!browser) return null;

  try {
    const [{ Capacitor }, sqliteMod] = await Promise.all([
      import('@capacitor/core'),
      import('@capacitor-community/sqlite')
    ]);

    const { CapacitorSQLite, SQLiteConnection } = sqliteMod as any;
    const sqlite = new SQLiteConnection(CapacitorSQLite);

    return { Capacitor, sqlite };
  } catch (err) {
    console.info(
      '[SQLite] plugin not available, running in stub mode',
      err
    );
    return null;
  }
}

// ────────────────────────────────────────────────
// DB 초기화: 앱 시작 시 한 번만 호출
// ────────────────────────────────────────────────

export async function initWorldDatabase(): Promise<void> {
  if (!browser) {
    // SSR 에서는 아무것도 하지 않음
    return;
  }

  if (mode === 'sqlite' && db) {
    // 이미 준비됨
    return;
  }

  if (initPromise) {
    // 초기화 중이면 같은 Promise 사용
    return initPromise;
  }

  initPromise = (async () => {
    const deps = await loadSQLiteDeps();
    if (!deps) {
      mode = 'stub';
      return;
    }

    const { Capacitor, sqlite } = deps;
    const platform = Capacitor.getPlatform?.() ?? 'web';

    // 순수 웹(dev 서버)에서는 stub 모드 유지
    if (platform === 'web') {
      console.info('[SQLite] web platform → stub mode (localStorage only)');
      mode = 'stub';
      return;
    }

    try {
      // encryption 안 쓰는 기본 모드
      // createConnection(dbName, encrypted, mode, version, readOnly)
      const dbConn = await sqlite.createConnection(
        DB_NAME,
        false,
        'no-encryption',
        DB_VERSION,
        false
      );

      await dbConn.open();

      // world_docs 테이블 및 인덱스 생성
      await dbConn.execute(`
        CREATE TABLE IF NOT EXISTS world_docs (
          id TEXT PRIMARY KEY NOT NULL,
          worldId TEXT NOT NULL,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          summary TEXT,
          content TEXT NOT NULL,
          thumbnailPath TEXT,
          mentions TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_world_docs_world
          ON world_docs(worldId);
        CREATE INDEX IF NOT EXISTS idx_world_docs_world_category
          ON world_docs(worldId, category);
      `);

      db = dbConn;
      mode = 'sqlite';
      console.info(
        '[SQLite] GENESIS world DB initialized',
        `platform=${platform}`
      );
    } catch (err) {
      console.error(
        '[SQLite] initWorldDatabase failed, fallback to stub mode',
        err
      );
      db = null;
      mode = 'stub';
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

// 현재 모드 확인용(디버깅용)
export function getSQLiteMode(): 'sqlite' | 'stub' {
  return mode;
}



// ────────────────────────────────────────────────
// 현재 world 의 모든 문서를 SQLite 에 저장
// ────────────────────────────────────────────────
export async function saveWorldDocsToSQLite(
  worldId: string,
  docs: WorldDoc[]
): Promise<void> {
  // SSR 에서는 아무것도 안 함
  if (!browser) return;

  // DB 준비 (안 되어 있으면 init 시도)
  await initWorldDatabase();

  // 아직 SQLite 환경이 아니면 → 스텁 로그만 찍고 종료
  if (!db || mode !== 'sqlite') {
    console.info('[SQLite][STUB] saveWorldDocsToSQLite', {
      worldId,
      count: docs.length,
      sample: docs[0] ?? null
    });
    return;
  }

  const dbConn = db;

  try {
    // 1) 이 world 의 기존 문서 싹 지우기
    await dbConn.run('DELETE FROM world_docs WHERE worldId = ?;', [worldId]);

    // 2) 새 문서들 다시 채우기
    for (const doc of docs) {
      const mentionsJson =
        doc.mentions && doc.mentions.length > 0
          ? JSON.stringify(doc.mentions)
          : null;

      const createdAt = doc.createdAt ?? new Date().toISOString();
      const updatedAt = doc.updatedAt ?? createdAt;

      await dbConn.run(
        `
        INSERT OR REPLACE INTO world_docs (
          id,
          worldId,
          category,
          title,
          summary,
          content,
          thumbnailPath,
          mentions,
          createdAt,
          updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
        [
          doc.id,
          doc.worldId ?? worldId,
          doc.category,
          doc.title ?? '',
          doc.summary ?? '',
          doc.content ?? '',
          doc.thumbnailPath ?? null,
          mentionsJson,
          createdAt,
          updatedAt
        ]
      );
    }

    console.info('[SQLite] saveWorldDocsToSQLite OK', {
      worldId,
      count: docs.length
    });
  } catch (err) {
    console.error('[SQLite] saveWorldDocsToSQLite 실패', err);
    throw err;
  }
}



// ────────────────────────────────────────────────
// (옵션) SQLite → 메모리로 불러오기 헬퍼
// 아직 안 쓴다면 무시해도 됨
// ────────────────────────────────────────────────

export async function loadWorldDocsFromSQLite(
  worldId: string
): Promise<WorldDoc[]> {
  if (!browser) return [];

  await initWorldDatabase();

  if (!db || mode !== 'sqlite') {
    console.info('[SQLite][STUB] loadWorldDocsFromSQLite', { worldId });
    return [];
  }

  const dbConn = db;

  try {
    const res = await dbConn.query(
      `
      SELECT
        id,
        worldId,
        category,
        title,
        summary,
        content,
        thumbnailPath,
        mentions,
        createdAt,
        updatedAt
      FROM world_docs
      WHERE worldId = ?
      ORDER BY updatedAt DESC;
    `,
      [worldId]
    );

    const rows = (res?.values ?? []) as any[];

    return rows.map((row) => ({
      id: row.id,
      worldId: row.worldId,
      category: row.category,
      title: row.title,
      summary: row.summary ?? '',
      content: row.content ?? '',
      thumbnailPath: row.thumbnailPath ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      mentions: row.mentions ? JSON.parse(row.mentions) : undefined
    })) as WorldDoc[];
  } catch (err) {
    console.error('[SQLite] loadWorldDocsFromSQLite 실패', err);
    return [];
  }
}
