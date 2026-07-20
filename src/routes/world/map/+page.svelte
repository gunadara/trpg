<script lang="ts">
  import { browser } from '$app/environment';
  import { listDocs, patchDoc, searchDocsByTitle, getDocById, createBlankDoc } from '$lib/stores/docStore';
  import { generateTerrain, generateRegion, type Terrain } from '$lib/features/world/maps/generator/terrain';
  import { buildRivers, clipRiversToWindow } from '$lib/features/world/maps/generator/rivers';
  import { renderTerrainSvg, svgToDataUrl, svgDataUrlToPng } from '$lib/features/world/maps/generator/renderSvg';
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

  /* ── 지역 뽑기 (세계 지도에서 사각 구역 드래그 → 정합 지역 지도) ── */
  let selectRegionMode = false;
  let regionBusy = false;
  let regionName = '';
  let regionPreview: {
    url: string;
    win: { x: number; y: number; w: number; h: number };
    terrain: Terrain;
    rivers: [number, number][][];
    worldOpts: Record<string, unknown>;
  } | null = null;

  // 지역 뽑기 가능 = 생성된 세계 지도만 (업로드 지도·지역 지도는 불가)
  $: canExtract = !!(selected && (selected.attributes as any)?.mapGen && (selected.attributes as any).mapGen.type !== 'region');

  function handleSelectRect(rPct: { x: number; y: number; w: number; h: number }) {
    if (!selected) return;
    const mg = (selected.attributes as any).mapGen;
    const W = mg.wide ? 1600 : 1000;
    const H = mg.wide ? 1120 : 700;
    // % → 세계 좌표, 경계 클램프
    let x = (rPct.x / 100) * W, y = (rPct.y / 100) * H;
    let w = (rPct.w / 100) * W, h = (rPct.h / 100) * H;
    x = Math.max(0, Math.min(W - 10, x));
    y = Math.max(0, Math.min(H - 10, y));
    w = Math.max(10, Math.min(W - x, w));
    h = Math.max(10, Math.min(H - y, h));
    const win = { x, y, w, h };
    const worldOpts = {
      seed: mg.seed,
      seaLevel: mg.seaLevel ?? 0.42,
      continents: mg.continents ?? 1,
      islands: mg.islands ?? 0.3,
      width: W,
      height: H,
      cellCount: mg.cellCount ?? 2500
    };

    selectRegionMode = false;
    regionBusy = true;
    setTimeout(async () => {
      try {
        // 강 2패스: 세계 해상도 강을 지역에 얹는다 (정합)
        const worldT = generateTerrain(worldOpts);
        const worldRivers = buildRivers(worldT);
        const terrain = generateRegion(worldOpts, win, 3500);
        const rivers = clipRiversToWindow(worldRivers, win, terrain.width, terrain.height);
        const svgUrl = svgToDataUrl(renderTerrainSvg(terrain, { scale: 'region', riversOverride: rivers }));
        let url = svgUrl;
        try { url = await svgDataUrlToPng(svgUrl, 1.5); } catch { /* SVG 폴백 */ }
        regionName = '';
        regionPreview = { url, win, terrain, rivers, worldOpts };
      } finally {
        regionBusy = false;
      }
    }, 30);
  }

  async function saveRegion() {
    if (!regionPreview || !selected) return;
    const { terrain, rivers, win, worldOpts } = regionPreview;
    const name = regionName.trim();
    const svgUrl = svgToDataUrl(renderTerrainSvg(terrain, { scale: 'region', riversOverride: rivers, title: name }));
    let mapImage = svgUrl;
    try { mapImage = await svgDataUrlToPng(svgUrl, 1.5); } catch { /* 변환 실패 시 SVG 폴백 */ }
    const doc = createBlankDoc('locations');
    patchDoc(doc.id, {
      title: name || `지역 지도 (${(selected as any).title || '세계'})`,
      attributes: {
        mapImage,
        pins: [],
        mapGen: { ...worldOpts, type: 'region', window: win, parentId: selected.id, stage: 9 }
      }
    });
    regionPreview = null;
    refresh++;
    selectedId = doc.id;
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

    {#if canExtract}
      <button
        on:click={() => { selectRegionMode = !selectRegionMode; if (selectRegionMode) editMode = false; }}
        class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition
               {selectRegionMode
                 ? 'bg-emerald-600 text-white'
                 : 'border border-line text-muted hover:border-emerald-500 hover:text-emerald-500'}"
      >
        {selectRegionMode ? '✅ 선택 끝' : '🔍 지역 뽑기'}
      </button>
    {/if}

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
        selectable={selectRegionMode}
        onSelectRect={handleSelectRect}
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

    <!-- 지역 뽑기: 계산 중 -->
    {#if regionBusy}
      <div class="absolute inset-0 bg-black/40 flex items-center justify-center z-20 pointer-events-none">
        <div class="px-4 py-2 rounded-xl bg-surface border border-line text-xs font-bold text-ink">🗺️ 지역 지도 생성 중…</div>
      </div>
    {/if}

    <!-- 지역 뽑기: 미리보기 + 저장 -->
    {#if regionPreview}
      <div class="absolute inset-0 bg-black/50 flex items-end md:items-center justify-center p-4 z-20 overflow-y-auto"
           on:click={() => (regionPreview = null)}
           on:keydown={(e) => e.key === 'Escape' && (regionPreview = null)}
           role="button" tabindex="-1">
        <div class="w-full max-w-md rounded-2xl border border-line bg-surface p-5 space-y-3"
             on:click|stopPropagation role="dialog">
          <h2 class="text-sm font-bold text-ink">🔍 지역 지도 미리보기</h2>
          <div class="rounded-xl overflow-hidden border border-line bg-canvas">
            <img src={regionPreview.url} alt="지역 지도 미리보기" class="w-full block" />
          </div>
          <input
            type="text"
            bind:value={regionName}
            placeholder="지역 이름 (지도 제목으로 들어가요, 비워도 됨)"
            class="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-primary"
          />
          <div class="flex gap-2">
            <button on:click={saveRegion} class="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition">📍 장소 문서로 저장</button>
            <button on:click={() => (regionPreview = null)} class="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-muted hover:text-ink transition">취소</button>
          </div>
          <p class="text-[10px] text-subtle leading-relaxed">
            세계 지도와 지형·산맥·강이 이어지는 지역 지도예요. 저장하면 원본 세계 지도와 연결돼요.
          </p>
        </div>
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
