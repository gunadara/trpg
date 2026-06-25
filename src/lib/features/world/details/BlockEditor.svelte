<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { WorldDoc } from '$lib/domain/docs';
  import {
    type Block, makeBlock, getBlocks, bottomOf,
    GRID_COLS, ROW_PX
  } from '$lib/domain/blocks';

  export let doc: WorldDoc;
  const dispatch = createEventDispatcher();

  if (!doc.attributes) doc.attributes = {};
  let blocks: Block[] = getBlocks(doc.attributes);
  (doc.attributes as any).blocks = blocks;

  let canvasW = 0;
  $: cellW = canvasW > 0 ? canvasW / GRID_COLS : 0;
  $: canvasH = (bottomOf(blocks) + 2) * ROW_PX;

  function commit() {
    (doc.attributes as any).blocks = blocks;
    blocks = blocks;
    dispatch('change');
  }
  function addBlock() {
    blocks = [...blocks, makeBlock('text', bottomOf(blocks))];
    commit();
  }
  function removeBlock(id: string) {
    if (!confirm('이 블록을 삭제할까요?')) return;
    blocks = blocks.filter((b) => b.id !== id);
    commit();
  }
  function onEdit() { commit(); }

  // ── 겹침 판정 ──
  function overlap(a: {x:number;y:number;w:number;h:number}, b: Block) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function collides(cand: {x:number;y:number;w:number;h:number}, selfId: string) {
    return blocks.some((b) => b.id !== selfId && overlap(cand, b));
  }

  // ── 드래그/리사이즈 (포인터 = 마우스+터치) ──
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
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    active = { mode: 'move', id: b.id, sx: e.clientX, sy: e.clientY, bx: b.x, by: b.y };
    lockPage(true);
  }
  function startResize(e: PointerEvent, b: Block) {
    e.preventDefault();
    e.stopPropagation();
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
      // 드래그 중엔 자유(안 막힘). 겹침은 놓을 때 정리.
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
    pushDown(movedId);  // 놓을 때 겹친 블록을 아래로 밀어냄
    commit();
  }

  // 잡은 블록(fixed)은 고정, 겹치는 다른 블록을 아래로 밀어냄 (연쇄)
  function pushDown(fixedId: string) {
    let changed = true, guard = 0;
    while (changed && guard++ < 200) {
      changed = false;
      const sorted = [...blocks].sort((a, b) => a.y - b.y);
      for (const a of sorted) {
        for (const c of sorted) {
          if (a.id === c.id) continue;
          if (!overlap(a, c)) continue;
          // 위/고정인 쪽을 기준으로 다른 쪽을 내림
          let upper = a, lower = c;
          if (c.id === fixedId) { upper = c; lower = a; }
          else if (a.id === fixedId) { upper = a; lower = c; }
          else if (a.y > c.y) { upper = c; lower = a; }
          if (lower.id === fixedId) continue; // 고정 블록은 안 밀림
          const ny = upper.y + upper.h;
          if (ny > lower.y) { lower.y = ny; changed = true; }
        }
      }
    }
    blocks = blocks;
  }

  // 정렬: 가로 위치는 유지, 위에서부터 빈틈/겹침 없이 차곡차곡
  function compact() {
    const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
    const placed: Block[] = [];
    for (const b of sorted) {
      let ny = 0, moved = true, guard = 0;
      while (moved && guard++ < 200) {
        moved = false;
        for (const p of placed) {
          if (overlap({ x: b.x, y: ny, w: b.w, h: b.h }, p)) {
            ny = Math.max(ny, p.y + p.h);
            moved = true;
          }
        }
      }
      b.y = ny;
      placed.push(b);
    }
    blocks = blocks;
    commit();
  }
</script>

<svelte:window on:pointermove={onMove} on:pointerup={endActive} on:pointercancel={endActive} />

<section class="mt-1">
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200">블록 시트</h3>
    <div class="flex items-center gap-1.5">
      {#if blocks.length > 0}
        <button
          type="button"
          on:click={compact}
          class="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition"
          title="겹침/빈틈을 위에서부터 정리"
        >
          ⤴ 정렬
        </button>
      {/if}
      <button
        type="button"
        on:click={addBlock}
        class="text-xs px-2.5 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition"
      >
        + 텍스트 블록
      </button>
    </div>
  </div>

  {#if blocks.length === 0}
    <p class="text-xs text-slate-400 dark:text-slate-500 py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
      블록을 추가해 자유롭게 배치해 보세요. (제목줄 ⠿ 끌어 이동 · 우하단 모서리로 크기조절)
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
          class="absolute rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm flex flex-col overflow-hidden {active && active.id === block.id ? 'z-20 ring-2 ring-indigo-300 dark:ring-indigo-500/50' : 'z-0'}"
          style="left: {block.x / GRID_COLS * 100}%; top: {block.y * ROW_PX}px; width: {block.w / GRID_COLS * 100}%; height: {block.h * ROW_PX}px;"
        >
          <div class="flex items-center gap-1.5 px-2 py-1 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <span
              class="cursor-move select-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm px-0.5"
              style="touch-action: none;"
              on:pointerdown={(e) => startMove(e, block)}
              title="끌어서 이동"
            >⠿</span>
            <input
              type="text"
              bind:value={block.title}
              on:input={onEdit}
              placeholder="항목 이름"
              class="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
            <button type="button" on:click={() => removeBlock(block.id)}
              class="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 text-xs px-1" title="삭제">×</button>
          </div>
          <textarea
            bind:value={block.value}
            on:input={onEdit}
            placeholder="내용을 자유롭게…"
            class="flex-1 w-full bg-transparent px-2.5 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none resize-none"
          ></textarea>
          <!-- 크기조절 손잡이 (우하단) -->
          <span
            class="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize text-slate-300 dark:text-slate-600 hover:text-indigo-400 flex items-end justify-end leading-none"
            style="touch-action: none;"
            on:pointerdown={(e) => startResize(e, block)}
            title="크기 조절"
          >◢</span>
        </div>
      {/each}
    </div>
    <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">⠿ 끌어 이동 · 우하단 ◢ 크기조절 · 놓으면 겹친 블록이 아래로 비켜요. 지저분하면 ⤴ 정렬.</p>
  {/if}
</section>
