<script lang="ts">
  import { onMount } from 'svelte';
  import { listAllDocs } from '$lib/stores/docStore';
  import RelationMap from '$lib/features/world/visualizer/RelationMap.svelte';
  import { gotoDoc } from '$lib/services/worldNav';
  import { browser } from '$app/environment';
  import { CATEGORY_META, WORLD_CATEGORY_IDS, type CategoryId } from '$lib/domain/categories';
  import { relationLabels, relTypes, type RelDir } from '$lib/stores/relationLabels';

  onMount(() => {
    relationLabels.load();
    relTypes.load();
  });

  // ── 카테고리 필터 ──
  let active: Record<string, boolean> = Object.fromEntries(
    WORLD_CATEGORY_IDS.map((id) => [id, true])
  );

  function toggleCat(id: CategoryId) {
    active = { ...active, [id]: !active[id] };
  }
  function setAll(v: boolean) {
    active = Object.fromEntries(WORLD_CATEGORY_IDS.map((id) => [id, v]));
  }

  $: allDocs = browser ? listAllDocs() : [];
  $: filteredDocs = allDocs.filter((d) => active[d.category] ?? true);

  // ── 선 긋기 모드 ──
  let linkMode = false;
  function handleLinkPair(from: string, to: string) {
    openEdge(from, to);
  }

  // ── 노드 클릭 (모드 꺼짐 시 = 문서 열기) ──
  function handleNodeClick(id: string) {
    const doc = allDocs.find((d) => d.id === id);
    if (doc) gotoDoc(doc);
  }

  // ── 관계 편집 모달 ──
  let edgeSel: { from: string; to: string } | null = null;
  let selDir: RelDir = 'to';

  function openEdge(from: string, to: string) {
    edgeSel = { from, to };
    selDir = $relationLabels[`${from}->${to}`]?.dir ?? 'to';
  }
  function handleEdgeClick(from: string, to: string) {
    openEdge(from, to);
  }

  function titleOf(id: string): string {
    return allDocs.find((d) => d.id === id)?.title || '?';
  }

  // 방향 화살표 글자
  $: dirArrow = selDir === 'both' ? '↔' : selDir === 'from' ? '←' : '→';

  function setDirSel(d: RelDir) {
    selDir = d;
    // 이미 관계가 있으면 방향만 즉시 반영
    if (edgeSel && $relationLabels[`${edgeSel.from}->${edgeSel.to}`]) {
      relationLabels.setDir(edgeSel.from, edgeSel.to, d);
    }
  }

  function applyLabel(type: string | null) {
    if (edgeSel) relationLabels.setLabel(edgeSel.from, edgeSel.to, type, selDir);
    edgeSel = null;
  }

  // ── 관계 종류 추가 ──
  let addingType = false;
  let newTypeName = '';
  let newTypeColor = '#f59e0b';

  function addRelType() {
    const id = relTypes.add(newTypeName, newTypeColor);
    if (id && edgeSel) {
      relationLabels.setLabel(edgeSel.from, edgeSel.to, id, selDir);
      edgeSel = null;
    }
    newTypeName = '';
    addingType = false;
  }

  function removeRelType(id: string) {
    if (!confirm('이 관계 종류를 삭제할까요? (이미 붙인 선의 라벨은 회색으로 돌아갑니다)')) return;
    relTypes.remove(id);
  }
</script>

<!-- world 레이아웃이 셸 → 여기선 필터바 + 그래프만 (full height) -->
<div class="h-full flex flex-col">
  <!-- 카테고리 필터 칩 + 선 긋기 + 노드 수 -->
  <div class="px-3 md:px-4 py-2.5 bg-surface/60 border-b border-line flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:thin] shrink-0">
    {#each WORLD_CATEGORY_IDS as id}
      <button
        on:click={() => toggleCat(id)}
        class="px-2.5 py-1 rounded-full text-[11px] border transition shrink-0
               {active[id]
                 ? 'border-primary text-primary bg-primary/10'
                 : 'border-line text-subtle hover:border-line'}"
      >
        {CATEGORY_META[id].icon} {CATEGORY_META[id].label}
      </button>
    {/each}
    <span class="mx-1 text-subtle shrink-0">|</span>
    <button class="text-[11px] text-muted hover:text-primary shrink-0" on:click={() => setAll(true)}>전체</button>
    <button class="text-[11px] text-muted hover:text-primary shrink-0" on:click={() => setAll(false)}>없음</button>

    <button
      on:click={() => (linkMode = !linkMode)}
      class="ms-auto shrink-0 px-2.5 py-1 rounded-full text-[11px] border transition
             {linkMode ? 'border-primary text-white bg-primary' : 'border-line text-muted hover:border-primary'}"
    >
      🔗 선 긋기{linkMode ? ' 끄기' : ''}
    </button>
    <span class="ps-2 text-xs text-muted shrink-0">{filteredDocs.length} / {allDocs.length} 노드</span>
  </div>

  <!-- 관계도 영역 -->
  <div class="flex-1 min-h-0 p-3 md:p-4 relative">
    {#if linkMode}
      <div class="absolute top-5 md:top-6 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-primary text-white text-[11px] font-medium shadow-lg pointer-events-none">
        🔗 연결할 노드 <b>둘</b>을 차례로 탭하세요
      </div>
    {/if}

    {#if filteredDocs.length > 0}
      <RelationMap
        docs={filteredDocs}
        labels={$relationLabels}
        types={$relTypes}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        {linkMode}
        onLinkPair={handleLinkPair}
      />
    {:else}
      <div class="h-full flex items-center justify-center text-muted border-2 border-dashed border-line rounded-3xl text-sm text-center px-6">
        {allDocs.length === 0
          ? '표시할 데이터가 없습니다. 먼저 문서를 작성하고 @멘션으로 연결해 보세요!'
          : '모든 카테고리가 꺼져 있어요. 위에서 켜 주세요.'}
      </div>
    {/if}

    <!-- 관계 설정 모달 -->
    {#if edgeSel}
      <div class="absolute inset-0 bg-black/40 flex items-end md:items-center justify-center p-4 z-20"
           on:click={() => (edgeSel = null)}
           on:keydown={(e) => e.key === 'Escape' && (edgeSel = null)}
           role="button" tabindex="-1">
        <div class="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 space-y-4"
             on:click|stopPropagation role="dialog">
          <div>
            <h2 class="text-sm font-bold text-ink">관계 설정</h2>
            <p class="text-xs text-muted mt-1">
              「{titleOf(edgeSel.from)}」 {dirArrow} 「{titleOf(edgeSel.to)}」
            </p>
          </div>

          <!-- 방향 선택 -->
          <div>
            <p class="text-[11px] text-muted mb-1.5">방향</p>
            <div class="flex gap-1.5">
              {#each [['to','→','단방향'],['both','↔','양방향'],['from','←','반대']] as [d, arrow, label]}
                <button
                  on:click={() => setDirSel(d)}
                  class="flex-1 px-2 py-1.5 rounded-lg text-xs border transition
                         {selDir === d ? 'border-primary text-primary bg-primary/10' : 'border-line text-muted hover:border-primary/40'}"
                >
                  <span class="font-bold">{arrow}</span> {label}
                </button>
              {/each}
            </div>
          </div>

          <!-- 관계 종류 -->
          <div>
            <p class="text-[11px] text-muted mb-1.5">종류 (누르면 적용)</p>
            <div class="flex flex-wrap gap-2">
              {#each Object.entries($relTypes) as [type, meta]}
                <span class="inline-flex items-center rounded-full border border-line hover:border-current transition" style="color: {meta.color}">
                  <button on:click={() => applyLabel(type)} class="ps-3 pe-2 py-1.5 text-xs">
                    {meta.label}
                  </button>
                  {#if meta.custom}
                    <button on:click={() => removeRelType(type)} class="pe-2 text-[10px] text-subtle hover:text-rose-400" title="종류 삭제">×</button>
                  {/if}
                </span>
              {/each}
              <button
                on:click={() => (addingType = !addingType)}
                class="px-3 py-1.5 rounded-full text-xs border border-dashed border-line text-muted hover:border-primary hover:text-primary transition"
              >
                + 새 관계
              </button>
            </div>
          </div>

          {#if addingType}
            <div class="flex items-center gap-2 rounded-xl border border-line bg-canvas/60 p-2.5">
              <input
                type="text"
                bind:value={newTypeName}
                placeholder="이름 (예: 주종계약)"
                maxlength="8"
                class="flex-1 min-w-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary"
                on:keydown={(e) => e.key === 'Enter' && addRelType()}
              />
              <input type="color" bind:value={newTypeColor} class="w-8 h-8 rounded-lg border border-line bg-transparent cursor-pointer" title="선 색" />
              <button on:click={addRelType} class="px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 text-white text-xs font-bold transition shrink-0">등록</button>
            </div>
          {/if}

          <div class="flex justify-between pt-1">
            <button class="text-xs text-rose-400 hover:underline" on:click={() => applyLabel(null)}>관계 삭제</button>
            <button class="text-xs text-muted hover:text-ink" on:click={() => (edgeSel = null)}>닫기</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
