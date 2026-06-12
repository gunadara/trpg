<script lang="ts">
  import { listDocs } from '$lib/stores/docStore';
  import Timeline from '$lib/features/world/visualizer/Timeline.svelte';
  import { gotoDoc } from '$lib/services/worldNav';
  import { browser } from '$app/environment';

  // 사건 문서만 가져오기
  $: eventDocs = browser ? listDocs('events') : [];

  function handleEventClick(id: string) {
    const doc = eventDocs.find(d => d.id === id);
    if (doc) {
      gotoDoc(doc);
    }
  }
</script>

<div class="min-h-screen flex flex-col bg-slate-950">
  <!-- 헤더 -->
  <header class="sticky top-0 z-10 p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <button on:click={() => history.back()} class="text-slate-400 hover:text-white transition text-sm flex items-center gap-1">
        ← 뒤로
      </button>
      <h1 class="text-lg font-bold text-white flex items-center gap-2">
        📜 세계관 연표 <span class="text-xs font-normal text-slate-500">(Timeline)</span>
      </h1>
    </div>

    <div class="flex items-center gap-2">
      <span class="text-xs text-slate-500">총 {eventDocs.length}개의 사건</span>
    </div>
  </header>

  <!-- 연표 영역 -->
  <main class="flex-1 p-6">
    <Timeline docs={eventDocs} onEventClick={handleEventClick} />
  </main>
</div>
