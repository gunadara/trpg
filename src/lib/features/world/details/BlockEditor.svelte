<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { WorldDoc } from '$lib/domain/docs';
  import {
    type Block, makeBlock, getBlocks, bottomOf,
    GRID_COLS, ROW_PX, DEFAULT_H
  } from '$lib/domain/blocks';

  export let doc: WorldDoc;
  const dispatch = createEventDispatcher();

  if (!doc.attributes) doc.attributes = {};
  // 정규화(구버전 블록에 좌표 부여) 후 보관
  let blocks: Block[] = getBlocks(doc.attributes);
  (doc.attributes as any).blocks = blocks;

  let canvasW = 0; // 캔버스 픽셀 너비 (셀 너비 계산용)
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
  function onEdit() {
    commit();
  }

  // ── 드래그(격자 스냅) — 포인터 이벤트로 마우스/터치 공용 ──
  let drag: { id: string; sx: number; sy: number; bx: number; by: number } | null = null;

  function startDrag(e: PointerEvent, b: Block) {
    e.preventDefault();
    drag = { id: b.id, sx: e.clientX, sy: e.clientY, bx: b.x, by: b.y };
  }
  function onMove(e: PointerEvent) {
    if (!drag || cellW === 0) return;
    const b = blocks.find((x) => x.id === drag!.id);
    if (!b) return;
    const dxc = Math.round((e.clientX - drag.sx) / cellW);
    const dyc = Math.round((e.clientY - drag.sy) / ROW_PX);
    const nx = Math.min(Math.max(drag.bx + dxc, 0), GRID_COLS - b.w);
    const ny = Math.max(drag.by + dyc, 0);
    if (nx !== b.x || ny !== b.y) {
      b.x = nx; b.y = ny;
      blocks = blocks;
    }
  }
  function endDrag() {
    if (drag) { drag = null; commit(); }
  }
</script>

<svelte:window on:pointermove={onMove} on:pointerup={endDrag} />

<section class="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200">블록 시트</h3>
    <button
      type="button"
      on:click={addBlock}
      class="text-xs px-2.5 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition"
    >
      + 텍스트 블록
    </button>
  </div>

  {#if blocks.length === 0}
    <p class="text-xs text-slate-400 dark:text-slate-500 py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
      블록을 추가해 자유롭게 배치해 보세요. (제목줄 ⠿ 를 끌어 이동)
    </p>
  {:else}
    <div
      class="relative w-full rounded-xl bg-slate-50/60 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800"
      style="height: {canvasH}px; background-image: radial-gradient(currentColor 1px, transparent 1px); background-size: {cellW}px {ROW_PX}px; color: rgb(148 163 184 / 0.25);"
      bind:clientWidth={canvasW}
    >
      {#each blocks as block (block.id)}
        <div
          class="absolute rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm flex flex-col overflow-hidden"
          style="left: {block.x / GRID_COLS * 100}%; top: {block.y * ROW_PX}px; width: {block.w / GRID_COLS * 100}%; height: {block.h * ROW_PX}px;"
        >
          <div class="flex items-center gap-1.5 px-2 py-1 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <span
              class="cursor-move select-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm px-0.5"
              style="touch-action: none;"
              on:pointerdown={(e) => startDrag(e, block)}
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
        </div>
      {/each}
    </div>
    <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">제목줄의 ⠿ 를 끌어 블록을 옮길 수 있어요. (격자에 맞춰 정렬)</p>
  {/if}
</section>
