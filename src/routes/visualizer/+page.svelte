<script lang="ts">
  import { listAllDocs } from '$lib/stores/docStore';
  import RelationMap from '$lib/features/world/visualizer/RelationMap.svelte';
  import { gotoDoc } from '$lib/services/worldNav';
  import { browser } from '$app/environment';

  // 모든 데이터 가져오기
  $: allDocs = browser ? listAllDocs() : [];

  // 노드 클릭 시 해당 문서로 이동
  function handleNodeClick(id: string) {
    const doc = allDocs.find(d => d.id === id);
    if (doc) {
      gotoDoc(doc);
    }
  }
</script>

<div class="h-screen flex flex-col bg-slate-950 overflow-hidden">
  <!-- 헤더 -->
  <header class="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <button on:click={() => history.back()} class="text-slate-400 hover:text-white transition text-sm flex items-center gap-1">
        ← 뒤로
      </button>
      <h1 class="text-lg font-bold text-white flex items-center gap-2">
        🕸️ 세계관 관계도 <span class="text-xs font-normal text-slate-500">(Visualization)</span>
      </h1>
    </div>

    <div class="flex items-center gap-2">
        <span class="text-xs text-slate-500">총 {allDocs.length}개의 연결된 노드</span>
    </div>
  </header>

  <!-- 메인 관계도 영역 -->
  <main class="flex-1 p-4 relative">
    {#if allDocs.length > 0}
      <RelationMap docs={allDocs} onNodeClick={handleNodeClick} />
    {:else}
      <div class="h-full flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
        표시할 데이터가 없습니다. 먼저 문서를 작성하고 @멘션으로 연결해 보세요!
      </div>
    {/if}
  </main>
</div>