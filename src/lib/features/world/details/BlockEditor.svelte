<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { WorldDoc } from '$lib/domain/docs';
  import {
    type Block, type BlockType, makeBlock, getBlocks, bottomOf, fitHeight,
    GRID_COLS, ROW_PX, BLOCK_LABELS, BLOCK_HINTS, BLOCK_EXAMPLES, GAUGE_COLORS
  } from '$lib/domain/blocks';

  export let doc: WorldDoc;
  const dispatch = createEventDispatcher();

  if (!doc.attributes) doc.attributes = {};
  let blocks: Block[] = getBlocks(doc.attributes);
  (doc.attributes as any).blocks = blocks;

  const ADD_TYPES: BlockType[] = ['text', 'label', 'number', 'list', 'gauge'];
  let addMenu = false;
  let colorPickFor: string | null = null; // 색 팔레트 열린 게이지 줄 키

  // 사용자가 컬러피커로 고른 색 — 문서에 저장돼 팔레트에 계속 남음
  let customColors: string[] = Array.isArray((doc.attributes as any)?.customColors)
    ? ((doc.attributes as any).customColors as string[]) : [];
  $: palette = [...GAUGE_COLORS, ...customColors];

  function addCustomColor(row: { color?: string }, c: string) {
    if (!GAUGE_COLORS.includes(c) && !customColors.includes(c)) {
      customColors = [...customColors, c];
      (doc.attributes as any).customColors = customColors;
    }
    row.color = c;
    commit();
  }

  let canvasW = 0;
  $: cellW = canvasW > 0 ? canvasW / GRID_COLS : 0;
  $: canvasH = (bottomOf(blocks) + 2) * ROW_PX;

  function commit() {
    (doc.attributes as any).blocks = blocks;
    blocks = blocks;
    dispatch('change');
  }
  function addBlock(type: BlockType) {
    blocks = [...blocks, makeBlock(type, bottomOf(blocks))];
    addMenu = false;
    commit();
  }
  function removeBlock(id: string) {
    if (!confirm('이 블록을 삭제할까요?')) return;
    blocks = blocks.filter((b) => b.id !== id);
    commit();
  }
  function onEdit() { commit(); }

  // 내용 늘면 칸도 자동으로 커짐(줄어들진 않음) + 아래 밀어내기
  function autofit(b: Block) {
    const need = fitHeight(b);
    if (need > b.h) { b.h = need; pushDown(b.id); }
  }
  function pickColor(row: { color?: string }, c: string) {
    row.color = c;
    colorPickFor = null;
    commit();
  }

  // ── 목록 아이템 ──
  function addItem(b: Block) {
    b.items = [...(b.items ?? []), ''];
    autofit(b); commit();
  }
  function removeItem(b: Block, i: number) {
    b.items = (b.items ?? []).filter((_, idx) => idx !== i);
    commit();
  }
  // ── 게이지 줄 ──
  function addRow(b: Block) {
    b.rows = [...(b.rows ?? []), { label: '', cur: 0, max: 100, color: GAUGE_COLORS[(b.rows?.length ?? 0) % GAUGE_COLORS.length] }];
    autofit(b); commit();
  }
  function removeRow(b: Block, i: number) {
    b.rows = (b.rows ?? []).filter((_, idx) => idx !== i);
    commit();
  }

  // ── 선택 삭제 모드 ──
  let selectMode = false;
  let selected = new Set<string>();
  function toggleSelectMode() {
    selectMode = !selectMode;
    selected = new Set();
  }
  function toggleSel(id: string) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    selected = selected;
  }
  function selectAll() {
    selected = new Set(blocks.map((b) => b.id));
  }
  function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}개 블록을 삭제할까요?`)) return;
    blocks = blocks.filter((b) => !selected.has(b.id));
    selected = new Set();
    selectMode = false;
    commit();
  }
  function deleteAll() {
    if (blocks.length === 0) return;
    if (!confirm('블록을 전부 삭제할까요?')) return;
    blocks = [];
    selected = new Set();
    selectMode = false;
    commit();
  }

  // ── 겹침 / 드래그 / 리사이즈 ──
  function overlap(a: {x:number;y:number;w:number;h:number}, b: Block) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  let active:
    | { mode: 'move'; id: string; sx: number; sy: number; bx: number; by: number }
    | { mode: 'resize'; id: string; sx: number; sy: number; bw: number; bh: number }
    | null = null;

  function lockPage(lock: boolean) {
    if (typeof document === 'undefined') return;
    document.body.style.userSelect = lock ? 'none' : '';
    (document.body.style as any).webkitUserSelect = lock ? 'none' : '';
  }
  function startMove(e: PointerEvent, b: Block) {
    if (selectMode) return;
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    active = { mode: 'move', id: b.id, sx: e.clientX, sy: e.clientY, bx: b.x, by: b.y };
    lockPage(true);
  }
  function startResize(e: PointerEvent, b: Block) {
    if (selectMode) return;
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    active = { mode: 'resize', id: b.id, sx: e.clientX, sy: e.clientY, bw: b.w, bh: b.h };
    lockPage(true);
  }
  function onMove(e: PointerEvent) {
    if (!active || cellW === 0) return;
    e.preventDefault();
    const b = blocks.find((x) => x.id === active!.id);
    if (!b) return;
    if (active.mode === 'move') {
      const dxc = Math.round((e.clientX - active.sx) / cellW);
      const dyc = Math.round((e.clientY - active.sy) / ROW_PX);
      const nx = Math.min(Math.max(active.bx + dxc, 0), GRID_COLS - b.w);
      const ny = Math.max(active.by + dyc, 0);
      if (nx !== b.x || ny !== b.y) { b.x = nx; b.y = ny; blocks = blocks; }
    } else {
      const dwc = Math.round((e.clientX - active.sx) / cellW);
      const dhc = Math.round((e.clientY - active.sy) / ROW_PX);
      const nw = Math.min(Math.max(active.bw + dwc, 2), GRID_COLS - b.x);
      const nh = Math.max(active.bh + dhc, 3);
      if (nw !== b.w || nh !== b.h) { b.w = nw; b.h = nh; blocks = blocks; }
    }
  }
  function endActive() {
    if (!active) return;
    const movedId = active.id;
    active = null;
    lockPage(false);
    pushDown(movedId);
    commit();
  }
  function pushDown(fixedId: string) {
    let changed = true, guard = 0;
    while (changed && guard++ < 200) {
      changed = false;
      const sorted = [...blocks].sort((a, b) => a.y - b.y);
      for (const a of sorted) {
        for (const c of sorted) {
          if (a.id === c.id || !overlap(a, c)) continue;
          let upper = a, lower = c;
          if (c.id === fixedId) { upper = c; lower = a; }
          else if (a.id === fixedId) { upper = a; lower = c; }
          else if (a.y > c.y) { upper = c; lower = a; }
          if (lower.id === fixedId) continue;
          const ny = upper.y + upper.h;
          if (ny > lower.y) { lower.y = ny; changed = true; }
        }
      }
    }
    blocks = blocks;
  }
  function compact() {
    const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
    const placed: Block[] = [];
    for (const b of sorted) {
      let ny = 0, moved = true, guard = 0;
      while (moved && guard++ < 200) {
        moved = false;
        for (const p of placed) {
          if (overlap({ x: b.x, y: ny, w: b.w, h: b.h }, p)) { ny = Math.max(ny, p.y + p.h); moved = true; }
        }
      }
      b.y = ny; placed.push(b);
    }
    blocks = blocks; commit();
  }
</script>

<svelte:window on:pointermove={onMove} on:pointerup={endActive} on:pointercancel={endActive} />

<section class="mt-1">
  <div class="flex items-center justify-between mb-2 gap-2">
    <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200 shrink-0">블록 시트</h3>

    {#if selectMode}
      <div class="flex items-center gap-1.5 flex-wrap justify-end">
        <button type="button" on:click={selectAll}
          class="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400">전체선택</button>
        <button type="button" on:click={deleteSelected} disabled={selected.size === 0}
          class="text-xs px-2.5 py-1 rounded-lg bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40">선택삭제 {selected.size > 0 ? `(${selected.size})` : ''}</button>
        <button type="button" on:click={deleteAll}
          class="text-xs px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">전체삭제</button>
        <button type="button" on:click={toggleSelectMode}
          class="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">취소</button>
      </div>
    {:else}
      <div class="flex items-center gap-1.5 flex-wrap justify-end">
        {#if blocks.length > 0}
          <button type="button" on:click={toggleSelectMode}
            class="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400">선택</button>
          <button type="button" on:click={compact}
            class="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400" title="겹침/빈틈 정리">⤴ 정렬</button>
        {/if}
        <button type="button" on:click={() => (addMenu = !addMenu)}
          class="text-xs px-2.5 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500">+ 블록 추가</button>
      </div>
    {/if}
  </div>

  <!-- 추가 메뉴: 인라인(잘리지 않음) + 설명 -->
  {#if addMenu && !selectMode}
    <div class="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
      {#each ADD_TYPES as t}
        <button type="button" on:click={() => addBlock(t)}
          class="text-left px-2.5 py-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition">
          <span class="text-xs font-bold text-slate-700 dark:text-slate-200">{BLOCK_LABELS[t]}</span>
          <span class="block text-[10px] text-slate-400 dark:text-slate-500">{BLOCK_HINTS[t]}</span>
        </button>
      {/each}
    </div>
  {/if}

  {#if blocks.length === 0}
    <p class="text-xs text-slate-400 dark:text-slate-500 py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
      "+ 블록 추가"로 항목을 만들어 자유롭게 배치해 보세요.
    </p>
  {:else}
    <div
      class="relative w-full rounded-xl bg-slate-50/60 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 {active ? 'select-none' : ''}"
      style="height: {canvasH}px; touch-action: {active ? 'none' : 'auto'};
             background-image: radial-gradient(currentColor 1px, transparent 1px);
             background-size: {cellW}px {ROW_PX}px; color: rgb(148 163 184 / 0.25);"
      bind:clientWidth={canvasW}
    >
      {#each blocks as block (block.id)}
        <div
          class="absolute rounded-xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col overflow-hidden
                 {active && active.id === block.id ? 'z-20 ring-2 ring-indigo-300 dark:ring-indigo-500/50' : 'z-0'}
                 {selectMode && selected.has(block.id) ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-slate-200 dark:border-slate-700'}"
          style="left: {block.x / GRID_COLS * 100}%; top: {block.y * ROW_PX}px; width: {block.w / GRID_COLS * 100}%; height: {block.h * ROW_PX}px;"
          on:click={selectMode ? () => toggleSel(block.id) : undefined}
        >
          <div class="flex items-center gap-1.5 px-2 py-1 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            {#if selectMode}
              <input type="checkbox" checked={selected.has(block.id)} tabindex="-1" readonly style="pointer-events:none;" class="accent-indigo-500" />
            {:else}
              <span class="cursor-move select-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm px-0.5"
                style="touch-action: none;" on:pointerdown={(e) => startMove(e, block)} title="끌어서 이동">⠿</span>
            {/if}
            <input type="text" bind:value={block.title} on:input={onEdit}
              placeholder="{BLOCK_LABELS[block.type]} 이름"
              disabled={selectMode}
              class="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600" />
            {#if !selectMode}
              <button type="button" on:click={() => removeBlock(block.id)}
                class="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 text-xs px-1" title="삭제">×</button>
            {/if}
          </div>

          {#if block.type === 'text'}
            <textarea bind:value={block.value} on:input={onEdit} disabled={selectMode}
              placeholder={BLOCK_EXAMPLES.text}
              class="flex-1 w-full bg-transparent px-2.5 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none resize-none"></textarea>
          {:else if block.type === 'label'}
            <div class="flex-1 flex items-center px-2.5">
              <input type="text" bind:value={block.value} on:input={onEdit} disabled={selectMode}
                placeholder={BLOCK_EXAMPLES.label}
                class="w-full bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none" />
            </div>
          {:else if block.type === 'number'}
            <div class="flex-1 flex items-center justify-center px-2">
              <input type="number" bind:value={block.value} on:input={onEdit} disabled={selectMode}
                placeholder={BLOCK_EXAMPLES.number}
                class="w-full bg-transparent text-center text-2xl font-bold text-slate-800 dark:text-slate-100 outline-none" />
            </div>
          {:else if block.type === 'gauge'}
            <div class="flex-1 overflow-y-auto px-2.5 py-1.5 space-y-1.5">
              {#each block.rows ?? [] as row, i}
                <div>
                  <div class="flex items-center gap-1 text-xs">
                    <button type="button" on:click={() => (colorPickFor = colorPickFor === `${block.id}:${i}` ? null : `${block.id}:${i}`)} disabled={selectMode}
                      class="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10" style="background:{row.color ?? GAUGE_COLORS[0]};" title="색 선택"></button>
                    <input type="text" bind:value={row.label} on:input={onEdit} disabled={selectMode}
                      placeholder="이름(HP)" class="flex-1 min-w-0 bg-transparent font-medium text-slate-600 dark:text-slate-300 outline-none" />
                    <input type="number" bind:value={row.cur} on:input={onEdit} disabled={selectMode}
                      class="w-10 bg-transparent text-right font-bold text-slate-700 dark:text-slate-200 outline-none" />
                    <span class="text-slate-400">/</span>
                    <input type="number" bind:value={row.max} on:input={onEdit} disabled={selectMode}
                      class="w-10 bg-transparent text-left text-slate-500 outline-none" />
                    {#if !selectMode}
                      <button type="button" on:click={() => removeRow(block, i)} class="text-slate-300 hover:text-rose-400 text-xs px-0.5">×</button>
                    {/if}
                  </div>
                  {#if colorPickFor === `${block.id}:${i}`}
                    <div class="flex flex-wrap items-center gap-1 my-1 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                      {#each palette as c}
                        <button type="button" on:click={() => pickColor(row, c)}
                          class="w-5 h-5 rounded-full border-2 {row.color === c ? 'border-slate-700 dark:border-white' : 'border-transparent'}"
                          style="background:{c};" aria-label="색"></button>
                      {/each}
                      <label class="w-5 h-5 rounded-full border border-dashed border-slate-400 dark:border-slate-500 flex items-center justify-center text-[9px] cursor-pointer hover:border-indigo-400" title="직접 고르기">
                        🎨
                        <input type="color" class="sr-only" value={row.color ?? GAUGE_COLORS[0]}
                          on:change={(e) => addCustomColor(row, (e.currentTarget as HTMLInputElement).value)} />
                      </label>
                    </div>
                  {/if}
                  <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-0.5">
                    <div class="h-full rounded-full transition-all"
                      style="width: {Math.max(0, Math.min(100, ((Number(row.cur) || 0) / (Number(row.max) || 1)) * 100))}%; background:{row.color ?? GAUGE_COLORS[0]};"></div>
                  </div>
                </div>
              {/each}
              {#if !selectMode}
                <button type="button" on:click={() => addRow(block)} class="text-[11px] text-slate-400 hover:text-indigo-500">+ 줄</button>
              {/if}
            </div>
          {:else if block.type === 'list'}
            <div class="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
              {#each block.items ?? [] as _, i}
                <div class="flex items-center gap-1">
                  <span class="text-slate-300 dark:text-slate-600 text-xs">•</span>
                  <input type="text" bind:value={block.items[i]} on:input={onEdit} disabled={selectMode}
                    placeholder="항목" class="flex-1 min-w-0 bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none" />
                  {#if !selectMode}
                    <button type="button" on:click={() => removeItem(block, i)} class="text-slate-300 hover:text-rose-400 text-xs px-1">×</button>
                  {/if}
                </div>
              {/each}
              {#if (block.items ?? []).length === 0}
                <p class="text-[10px] text-slate-400 dark:text-slate-600 px-1.5">{BLOCK_EXAMPLES.list}</p>
              {/if}
              {#if !selectMode}
                <button type="button" on:click={() => addItem(block)} class="text-[11px] text-slate-400 hover:text-indigo-500 px-1.5">+ 항목</button>
              {/if}
            </div>
          {/if}

          {#if !selectMode}
            <span class="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize text-slate-300 dark:text-slate-600 hover:text-indigo-400 flex items-end justify-end leading-none"
              style="touch-action: none;" on:pointerdown={(e) => startResize(e, block)} title="크기 조절">◢</span>
          {/if}
        </div>
      {/each}
    </div>
    <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">⠿ 끌어 이동 · ◢ 크기조절 · 놓으면 겹친 블록이 비켜요 · ⤴ 정렬 · 선택으로 여러 개 삭제.</p>
  {/if}
</section>
