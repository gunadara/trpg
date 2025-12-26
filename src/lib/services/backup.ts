import { get } from 'svelte/store';
import { docStore, saveDoc } from '$lib/stores/docStore'; // 기존 스토어 활용
import type { WorldDoc } from '$lib/domain/docs';

/**
 * 📤 데이터 내보내기 (Export)
 * 현재 로드된 모든 문서를 JSON 파일로 다운로드합니다.
 */
export function exportBackup() {
  try {
    // 1. 스토어에서 데이터 가져오기
    const docs = get(docStore);
    
    if (docs.length === 0) {
      alert('백업할 데이터가 없습니다.');
      return;
    }

    // 2. 백업 파일 포맷 정의
    const backupData = {
      app: 'GENESIS',
      version: '1.0',
      timestamp: new Date().toISOString(),
      count: docs.length,
      data: docs
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
export async function importBackup(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
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

        resolve(successCount);
      } catch (error) {
        console.error('복원 실패:', error);
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsText(file);
  });
}