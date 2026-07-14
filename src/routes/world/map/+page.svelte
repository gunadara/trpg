<script lang="ts">
  import { browser } from '$app/environment';
  import { listDocs, patchDoc, searchDocsByTitle, getDocById } from '$lib/stores/docStore';
  import { gotoDoc } from '$lib/services/worldNav';
  import MapViewer, { type MapPin } from '$lib/features/world/maps/MapViewer.svelte';
  import MapGenerator from '$lib/features/world/maps/generator/MapGenerator.svelte';
  import type { WorldDoc } from '$lib/domain/docs';

  let refresh = 0; // patch 후 목록 갱신용
  let showGenerator = false;

  function handleGeneratedSaved(docId: string) {
    showGenerator = false;
    refresh++;
    selectedId = docId; // 방금 생성한 지도 바로 열기
  }

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

<!-- world 레이아웃이 셸 → 여기선 선택바 + 지도만 (full height) -->
<div class="h-full flex flex-col">
  <!-- 지도 선택 + 핀 편집 -->
  <div class="px-3 md:px-4 py-2.5 bg-surface/60 border-b border-line flex items-center justify-between gap-3 shrink-0">
    <div class="flex items-center gap-2 min-w-0">
      <span class="text-xs font-bold text-ink shrink-0">🗺️ 지도</span>
      {#if mapDocs.length > 0}
        <select
          bind:value={selectedId}
          class="min-w-0 rounded-lg border border-line bg-bubble px-2 py-1.5 text-xs text-ink outline-none focus:border-primary"
        >
          {#each mapDocs as d}
            <option value={d.id}>{d.title || '제목 없는 장소'}</option>
          {/each}
        </select>
      {/if}
    </div>

    <button
      on:click={() => (showGenerator = true)}
      class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border border-line text-muted hover:border-primary hover:text-primary transition"
    >
      🌍 생성
    </button>

    {#if selected}
      <button
        on:click={() => (editMode = !editMode)}
        class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition
               {editMode
                 ? 'bg-primary text-white'
                 : 'border border-line text-muted hover:border-primary'}"
      >
        {editMode ? '✅ 편집 끝' : '✏️ 핀 편집'}
      </button>
    {/if}
  </div>

  <!-- 지도 영역 -->
  <div class="flex-1 p-3 md:p-4 relative min-h-0">
    {#if selected}
      <MapViewer
        image={(selected.attributes as any).mapImage}
        {pins}
        editable={editMode}
        pinStyle={(selected.attributes as any).mapGen ? 'antique' : 'default'}
        onAddPin={handleAddPin}
        onPinClick={handlePinClick}
      />
    {:else}
      <div class="h-full flex flex-col items-center justify-center gap-2 text-muted border-2 border-dashed border-line rounded-3xl text-sm text-center px-6">
        <p>등록된 지도가 없어요.</p>
        <p class="text-xs">장소 문서를 열고 「🗺️ 지역 상세 정보」에서 지도 이미지를 올리면 여기에 나타나요.</p>
      </div>
    {/if}

    <!-- 지도 생성기 -->
    {#if showGenerator}
      <div class="absolute inset-0 bg-black/50 flex items-end md:items-center justify-center p-4 z-20 overflow-y-auto"
           on:click={() => (showGenerator = false)}
           on:keydown={(e) => e.key === 'Escape' && (showGenerator = false)}
           role="button" tabindex="-1">
        <div on:click|stopPropagation role="dialog" class="w-full flex justify-center">
          <MapGenerator onSaved={handleGeneratedSaved} onClose={() => (showGenerator = false)} />
        </div>
      </div>
    {/if}

    <!-- 핀 연결 다이얼로그 -->
    {#if pendingPin}
      <div class="absolute inset-0 bg-black/50 flex items-end md:items-center justify-center p-4 z-20"
           on:click={() => (pendingPin = null)}
           on:keydown={(e) => e.key === 'Escape' && (pendingPin = null)}
           role="button" tabindex="-1">
        <div class="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 space-y-3"
             on:click|stopPropagation role="dialog">
          <h2 class="text-sm font-bold text-ink">📍 새 핀</h2>

          <!-- 문서 검색 연결 -->
          <input
            type="text"
            bind:value={searchQuery}
            on:input={runSearch}
            placeholder="연결할 문서 검색…"
            class="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-primary"
          />
          <div class="max-h-36 overflow-y-auto space-y-1">
            {#each searchResults as doc (doc.id)}
              <button
                on:click={() => confirmPin(doc)}
                class="w-full text-left px-3 py-2 rounded-lg text-xs text-muted hover:bg-primary/10 hover:text-primary transition"
              >
                {doc.title || '제목 없음'}
              </button>
            {/each}
            {#if searchResults.length === 0}
              <p class="text-[11px] text-subtle px-1">검색 결과 없음</p>
            {/if}
          </div>

          <!-- 또는 라벨만 -->
          <div class="flex gap-2 pt-1 border-t border-line">
            <input
              type="text"
              bind:value={customLabel}
              placeholder="문서 없이 이름만 (예: 침몰선)"
              maxlength="20"
              class="flex-1 min-w-0 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-primary"
              on:keydown={(e) => e.key === 'Enter' && confirmPin(null)}
            />
            <button on:click={() => confirmPin(null)} class="px-3 py-2 rounded-lg bg-primary hover:opacity-90 text-white text-xs font-bold transition shrink-0">찍기</button>
          </div>

          <button class="text-xs text-muted hover:text-ink" on:click={() => (pendingPin = null)}>취소</button>
        </div>
      </div>
    {/if}
  </div>
</div>
