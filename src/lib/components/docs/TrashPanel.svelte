<!-- src/lib/components/docs/TrashPanel.svelte -->
<!-- 목록 화면에서 펼쳐보는 휴지통. 복원 / 완전 삭제 / 비우기 -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    listTrash,
    purgeFromTrash,
    emptyTrash,
    RETENTION_DAYS,
    type TrashItem
  } from '$lib/stores/trashStore';
  import { restoreDocs } from '$lib/stores/docStore';

  export let category: string;
  export let open = false;

  const dispatch = createEventDispatcher();

  let items: TrashItem[] = [];

  $: if (open) refresh();

  function refresh() {
    items = listTrash(category);
  }

  function daysLeft(deletedAt: string): number {
    const t = Date.parse(deletedAt);
    if (Number.isNaN(t)) return RETENTION_DAYS;
    const gone = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
    return Math.max(0, RETENTION_DAYS - gone);
  }

  function restore(id: string) {
    restoreDocs([id]);
    refresh();
    dispatch('changed');
  }

  function purge(item: TrashItem) {
    if (!confirm(`"${item.doc.title || '(제목 없음)'}" 을(를) 완전히 삭제할까요?\n이제 되돌릴 수 없습니다.`)) return;
    purgeFromTrash([item.doc.id]);
    refresh();
  }

  function empty() {
    if (items.length === 0) return;
    if (!confirm(`휴지통의 ${items.length}개를 완전히 삭제할까요?\n되돌릴 수 없습니다.`)) return;
    emptyTrash(category);
    refresh();
  }
</script>

{#if open}
  <div class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
    <div class="flex items-center gap-2 px-3 py-2 flex-wrap">
      <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300">🗑 휴지통</span>
      <span class="text-[10px] text-slate-400 dark:text-slate-500">
        {items.length}개 · {RETENTION_DAYS}일 뒤 자동 삭제
      </span>
      <div class="flex-1"></div>
      {#if items.length > 0}
        <button type="button" on:click={empty}
          class="px-2 py-1 text-[10px] rounded-md text-red-600 hover:bg-red-100
                 dark:text-red-300 dark:hover:bg-red-900/40 transition">비우기</button>
      {/if}
      <button type="button" on:click={() => (open = false)}
        class="px-2 py-1 text-[10px] rounded-md text-slate-500 dark:text-slate-400
               hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition">닫기</button>
    </div>

    {#if items.length === 0}
      <p class="px-3 pb-3 text-[10px] text-slate-400 dark:text-slate-500">
        비어 있습니다.
      </p>
    {:else}
      <ul class="max-h-56 overflow-y-auto px-2 pb-2 space-y-1">
        {#each items as it (it.doc.id)}
          <li class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800
                     border border-slate-200 dark:border-slate-700">
            <div class="min-w-0 flex-1">
              <p class="text-xs text-slate-700 dark:text-slate-200 truncate">
                {it.doc.title || '(제목 없음)'}
              </p>
              <p class="text-[10px] text-slate-400 dark:text-slate-500">
                {daysLeft(it.deletedAt)}일 남음
              </p>
            </div>
            <button type="button" on:click={() => restore(it.doc.id)}
              class="px-2 py-1 text-[10px] rounded-md text-indigo-600 dark:text-indigo-300
                     hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition shrink-0">되돌리기</button>
            <button type="button" on:click={() => purge(it)}
              class="px-1.5 py-1 text-[10px] rounded-md text-slate-400 hover:text-red-600
                     dark:hover:text-red-300 transition shrink-0" title="완전 삭제">✕</button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}
