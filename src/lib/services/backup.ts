import { get } from 'svelte/store';
import { docStore, saveDoc } from '$lib/stores/docStore'; // 기존 스토어 활용
import type { WorldDoc } from '$lib/domain/docs';
import { tagStore } from '$lib/stores/tagStore';
import { inventoryStore } from '$lib/stores/inventoryStore';

// 문서(SQLite)와 달리 localStorage에만 있는 것들 — 백업에 같이 실어야 안 사라진다
function collectExtras() {
  // 다른 화면을 안 거쳤으면 스토어가 비어 있을 수 있으니 localStorage에서 먼저 읽는다
  tagStore.load();
  inventoryStore.load();
  return {
    tags: get(tagStore),
    inventories: get(inventoryStore).inventories.filter((v) => !v.builtin)
  };
}

/**
 * 📤 데이터 내보내기 (Export)
 * 현재 로드된 모든 문서를 JSON 파일로 다운로드합니다.
 */
export function exportBackup() {
  try {
    // 1. 스토어에서 데이터 가져오기
    const docs = get(docStore);
    const extras = collectExtras();

    const hasExtras =
      (extras.tags?.groups?.length ?? 0) > 0 || extras.inventories.length > 0;
    if (docs.length === 0 && !hasExtras) {
      alert('백업할 데이터가 없습니다.');
      return;
    }

    // 2. 백업 파일 포맷 정의
    const backupData = {
      app: 'GENESIS',
      version: '1.1',
      timestamp: new Date().toISOString(),
      count: docs.length,
      data: docs,
      // v1.1부터: 소재 뽑기 태그 + 내가 만든 검사지
      extras
    };

    // 3. JSON 파일 생성 및 다운로드 트리거
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    // 파일명: genesis_backup_2023-10-27.json
    a.download = `genesis_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // 뒷정리
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('백업 실패:', error);
    alert('백업 파일을 생성하는 중 오류가 발생했습니다.');
    return false;
  }
}

/**
 * 📥 데이터 불러오기 (Import)
 * JSON 파일을 읽어 DB에 덮어쓰거나 추가합니다.
 */
export type RestoreResult = { docs: number; groups: number; inventories: number };

export async function importBackup(file: File): Promise<RestoreResult> {
  return new Promise<RestoreResult>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        // 1. 유효성 검사 (간단하게)
        if (parsed.app !== 'GENESIS' || !Array.isArray(parsed.data)) {
          throw new Error('올바르지 않은 백업 파일 형식입니다.');
        }

        const docs: WorldDoc[] = parsed.data;
        let successCount = 0;

        // 2. 데이터 저장 (덮어쓰기/추가)
        // saveDoc은 이미 스토어와 DB를 동기화하도록 구현되어 있다고 가정
        for (const doc of docs) {
          // ID가 충돌하면 덮어씌웁니다 (Merge 방식)
          await saveDoc(doc); 
          successCount++;
        }

        // 3. v1.1 추가분 복원 (예전 백업 파일이면 extras가 없으므로 건너뜀)
        const extras = parsed.extras ?? {};
        let groupCount = 0;
        let invCount = 0;

        if (extras.tags && Array.isArray(extras.tags.groups)) {
          tagStore.load();
          tagStore.importData(extras.tags);
          groupCount = extras.tags.groups.length;
        }
        if (Array.isArray(extras.inventories)) {
          inventoryStore.load();
          inventoryStore.importData(extras.inventories);
          invCount = extras.inventories.length;
        }

        resolve({ docs: successCount, groups: groupCount, inventories: invCount });
      } catch (error) {
        console.error('복원 실패:', error);
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsText(file);
  });
}