<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { listDocs, patchDoc, searchDocsByTitle, getDocById } from '$lib/stores/docStore';
  import { gotoDoc } from '$lib/services/worldNav';
  import MapViewer, { type MapPin } from '$lib/features/world/maps/MapViewer.svelte';
  import type { WorldDoc } from '$lib/domain/docs';

  let refresh = 0; // patch 후 목록 갱신용

  // 지도 이미지를 가진 장소 문서들
  $: mapDocs = browser && refresh >= 0
    ? listDocs('locations').filter((d) => (d.attributes as any)?.mapImage)
    : [];

  let selectedId: string | null = null;
  $: if (!selectedId && mapDocs.length > 0) selectedId = mapDocs[0].id;
  $: selected = mapDocs.find((d) => d.id === selectedId) ?? null;
  $: pins = ((selected?.attributes as any)?.pins ?? []) as MapPin[];

  let editMode = false;

  /* ── 핀 저장 ── */
  function savePins(next: MapPin[]) {
    if (!selected) return;
    patchDoc(selected.id, {
      attributes: { ...(selected.attributes ?? {}), pins: next }
    });
    refresh++; // 다시 읽기
  }

  /* ── 핀 추가 (지도 탭 → 문서 연결 다이얼로그) ── */
  let pendingPin: { x: number; y: number } | null = null;
  let searchQuery = '';
  let searchResults: WorldDoc[] = [];
  let customLabel = '';

  function handleAddPin(x: number, y: number) {
    pendingPin = { x, y };
    searchQuery = '';
    customLabel = '';
    searchResults = searchDocsByTitle('');
  }

  function runSearch() {
    searchResults = searchDocsByTitle(searchQuery);
  }

  function confirmPin(doc: WorldDoc | null) {
    if (!pendingPin) return;
    const label = doc ? doc.title : customLabel.trim();
    if (!label) return;
    const pin: MapPin = {
      id: `pin-${Date.now()}`,
      x: pendingPin.x,
      y: pendingPin.y,
      docId: doc?.id,
      label
    };
    savePins([...pins, pin]);
    pendingPin = null;
  }

  /* ── 핀 클릭 ── */
  function handlePinClick(pin: MapPin) {
    if (editMode) {
      if (confirm(`핀 「${pin.label}」을 삭제할까요?`)) {
        savePins(pins.filter((p) => p.id !== pin.id));
      }
      return;
    }
    if (pin.docId) {
      const doc = getDocById(pin.docId);
      if (doc) { gotoDoc(doc); return; }
    }
    alert(`📍 ${pin.label}`);
  }
</script>

<div class="h-screen flex flex-col bg-slate-950 overflow-hidden">
  <!-- 헤더 -->
  <header class="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      <button on:click={() => history.back()} class="text-slate-400 hover:text-white transition text-sm shrink-0">← 뒤로</button>
      <h1 class="text-lg font-bold text-white shrink-0">🗺️ 지도</h1>

      {#if mapDocs.length > 0}
        <select
          bind:value={selectedId}
          class="min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
        >
          {#each mapDocs as d}
            <option value={d.id}>{d.title || '제목 없는 장소'}</option>
          {/each}
        </select>
      {/if}
    </div>

    {#if selected}
      <button
        on:click={() => (editMode = !editMode)}
        class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition
               {editMode
                 ? 'bg-indigo-600 text-white'
                 : 'border border-slate-700 text-slate-300 hover:border-indigo-500'}"
      >
        {editMode ? '✅ 편집 끝' : '✏️ 핀 편집'}
      </button>
    {/if}
  </header>

  <!-- 본문 -->
  <main class="flex-1 p-4 relative min-h-0">
    {#if selected}
      <MapViewer
        image={(selected.attributes as any).mapImage}
        {pins}
        editable={editMode}
        onAddPin={handleAddPin}
        onPinClick={handlePinClick}
      />
    {:else}
      <div class="h-full flex flex-col items-center justify-center gap-2 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl text-sm text-center px-6">
        <p>등록된 지도가 없어요.</p>
        <p class="text-xs">장소 문서를 열고 「🗺️ 지역 상세 정보」에서 지도 이미지를 올리면 여기에 나타나요.</p>
      </div>
    {/if}

    <!-- 핀 연결 다이얼로그 -->
    {#if pendingPin}
      <div class="absolute inset-0 bg-black/50 flex items-end md:items-center justify-center p-4 z-20"
           on:click={() => (pendingPin = null)}
           on:keydown={(e) => e.key === 'Escape' && (pendingPin = null)}
           role="button" tabindex="-1">
        <div class="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-3"
             on:click|stopPropagation role="dialog">
          <h2 class="text-sm font-bold text-slate-100">📍 새 핀</h2>

          <!-- 문서 검색 연결 -->
          <input
            type="text"
            bind:value={searchQuery}
            on:input={runSearch}
            placeholder="연결할 문서 검색…"
            class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
          />
          <div class="max-h-36 overflow-y-auto space-y-1">
            {#each searchResults as doc (doc.id)}
              <button
                on:click={() => confirmPin(doc)}
                class="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-300 transition"
              >
                {doc.title || '제목 없음'}
              </button>
            {/each}
            {#if searchResults.length === 0}
              <p class="text-[11px] text-slate-600 px-1">검색 결과 없음</p>
            {/if}
          </div>

          <!-- 또는 라벨만 -->
          <div class="flex gap-2 pt-1 border-t border-slate-800">
            <input
              type="text"
              bind:value={customLabel}
              placeholder="문서 없이 이름만 (예: 침몰선)"
              maxlength="20"
              class="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
              on:keydown={(e) => e.key === 'Enter' && confirmPin(null)}
            />
            <button on:click={() => confirmPin(null)} class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shrink-0">찍기</button>
          </div>

          <button class="text-xs text-slate-500 hover:text-slate-300" on:click={() => (pendingPin = null)}>취소</button>
        </div>
      </div>
    {/if}
  </main>
</div>
