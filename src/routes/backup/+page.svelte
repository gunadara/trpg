<script lang="ts">
  import DocEditLayout from '$lib/components/edit/DocEditLayout.svelte';
  import { exportBackup, importBackup } from '$lib/services/backup';
  import { goto } from '$app/navigation';

  let fileInput: HTMLInputElement;
  let importStatus = '';
  let isProcessing = false;

  // 1. 내보내기 핸들러
  function handleExport() {
    const success = exportBackup();
    if (success) {
      alert('데이터가 성공적으로 다운로드되었습니다!');
    }
  }

  // 2. 파일 선택 트리거
  function triggerImport() {
    fileInput.click();
  }

  // 3. 파일 선택 후 불러오기 핸들러
  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!confirm(`'${file.name}' 파일로 데이터를 복원하시겠습니까?\n(기존 데이터에 덮어씌워집니다.)`)) {
      input.value = ''; // 초기화
      return;
    }

    isProcessing = true;
    importStatus = '데이터 복원 중...';

    try {
      const count = await importBackup(file);
      alert(`${count}개의 문서가 성공적으로 복원되었습니다!`);
      importStatus = '';
      // 복원 후 홈으로 이동해서 갱신된 데이터 확인
      goto('/');
    } catch (error: any) {
      alert(`오류 발생: ${error.message}`);
      importStatus = '복원 실패';
    } finally {
      isProcessing = false;
      input.value = ''; // 초기화
    }
  }
</script>

<div class="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
  <!-- 상단 헤더 (기존 레이아웃 재사용하거나 커스텀) -->
  <header class="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
    <button on:click={() => history.back()} class="text-slate-500 dark:text-slate-400">← 뒤로</button>
    <h1 class="text-lg font-bold text-slate-800 dark:text-white">💾 데이터 백업 및 복원</h1>
  </header>

  <main class="flex-1 p-6 space-y-8 max-w-2xl mx-auto w-full">
    
    <!-- 안내 문구 -->
    <div class="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-xl text-sm leading-relaxed">
      <p class="font-bold mb-1">📢 안전한 데이터 관리를 위해!</p>
      <p>GENESIS는 데이터를 기기 내부에 저장합니다. 앱을 삭제하거나 기기를 변경하기 전에 반드시 <strong>[내보내기]</strong>를 하여 데이터를 백업해 주세요.</p>
    </div>

    <!-- 1. 내보내기 (Export) -->
    <section class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="flex items-start gap-4">
        <div class="text-3xl bg-slate-100 dark:bg-slate-700 p-3 rounded-xl">📤</div>
        <div class="flex-1">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-1">데이터 내보내기 (백업)</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
            현재 작성된 모든 문서(인물, 스킬, 아이템 등)를 하나의 파일(.json)로 저장합니다.
          </p>
          <button 
            on:click={handleExport}
            class="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-500/30"
          >
            파일로 저장하기
          </button>
        </div>
      </div>
    </section>

    <!-- 2. 불러오기 (Import) -->
    <section class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="flex items-start gap-4">
        <div class="text-3xl bg-slate-100 dark:bg-slate-700 p-3 rounded-xl">📥</div>
        <div class="flex-1">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-1">데이터 불러오기 (복원)</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
            이전에 백업해둔 파일(.json)을 불러와서 데이터를 복구합니다.
            <br><span class="text-red-400 text-xs">* 같은 ID의 문서가 있다면 덮어씌워집니다.</span>
          </p>
          
          <button 
            on:click={triggerImport}
            disabled={isProcessing}
            class="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition disabled:opacity-50"
          >
            {isProcessing ? '복원 중...' : '백업 파일 선택하기'}
          </button>

          {#if importStatus}
            <p class="mt-2 text-sm text-indigo-500 font-medium animate-pulse">{importStatus}</p>
          {/if}

          <!-- 숨겨진 파일 입력 -->
          <input 
            type="file" 
            accept=".json" 
            bind:this={fileInput} 
            on:change={handleFileChange}
            class="hidden" 
          />
        </div>
      </div>
    </section>

  </main>
</div>