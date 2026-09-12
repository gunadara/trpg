<!-- src/lib/components/docs/DocSelectBar.svelte -->
<!--
  문서 목록 위에 붙는 선택/삭제 툴바.
  선택 상태(selectMode, selected)는 부모가 들고 있고, 각 줄의 체크박스도 부모가 그린다.
-->
<script lang="ts">
  import type { WorldDoc } from '$lib/domain/docs';

  /** 지금 화면에 보이는(검색 필터를 통과한) 문서들 */
  export let visibleDocs: WorldDoc[] = [];
  /** 전체 문서 수 — 검색 중일 때 안내에 씀 */
  export let totalCount = 0;
  export let selectMode = false;
  export let selected: Set<string> = new Set();
  /** 실제 삭제는 부모가 수행 */
  export let onDeleteSelected: (ids: string[]) => void;
  /** 휴지통에 든 개수 — 0이면 버튼을 숨긴다 */
  export let trashCount = 0;
  export let onOpenTrash: () => void = () => {};

  $: visibleIds = visibleDocs.map((d) => d.id);
  $: allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  $: filtering = totalCount > visibleDocs.length;

  function toggleAll() {
    const next = new Set(selected);
    if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
    else visibleIds.forEach((id) => next.add(id));
    selected = next;
  }

  function exit() {
    selectMode = false;
    selected = new Set();
  }

  function requestDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;

    const names = visibleDocs
      .filter((d) => selected.has(d.id))
      .slice(0, 5)
      .map((d) => `· ${d.title || '(제목 없음)'}`)
      .join('\n');
    const more = ids.length > 5 ? `\n… 외 ${ids.length - 5}개` : '';

    if (!confirm(`${ids.length}개 문서를 삭제할까요?\n\n${names}${more}\n\n되돌릴 수 없습니다.`)) return;

    onDeleteSelected(ids);
    exit();
  }
</script>

{#if !selectMode}
  <div class="flex justify-end items-center gap-1 px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
    {#if trashCount > 0}
      <button
        type="button"
        on:click={onOpenTrash}
        class="text-[11px] text-slate-400 dark:text-slate-500 hover:text-indigo-500 px-2 py-1 rounded-md transition"
      >
        🗑 {trashCount}
      </button>
    {/if}
    <button
      type="button"
      on:click={() => (selectMode = true)}
      class="text-[11px] text-slate-400 dark:text-slate-500 hover:text-indigo-500 px-2 py-1 rounded-md transition"
    >
      선택
    </button>
  </div>
{:else}
  <div
    class="flex items-center gap-2 px-3 py-2 border-b border-indigo-200 dark:border-indigo-800
           bg-indigo-50 dark:bg-indigo-900/20 flex-wrap"
  >
    <button
      type="button"
      on:click={toggleAll}
      class="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600"
    >
      <span
        class="h-4 w-4 rounded border flex items-center justify-center text-[9px] shrink-0
               {allVisibleSelected
                 ? 'bg-indigo-500 border-indigo-500 text-white'
                 : 'border-slate-300 dark:border-slate-600'}"
      >
        {allVisibleSelected ? '✓' : ''}
      </span>
      {filtering ? '검색된 것 전체' : '전체 선택'}
    </button>

    <span class="text-[11px] text-slate-500 dark:text-slate-400">
      {selected.size}개 선택
    </span>

    <div class="flex-1"></div>

    <button
      type="button"
      on:click={requestDelete}
      disabled={selected.size === 0}
      class="px-2.5 py-1 text-[11px] rounded-md transition
             {selected.size === 0
               ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
               : 'text-red-600 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40'}"
    >
      삭제
    </button>
    <button
      type="button"
      on:click={exit}
      class="px-2.5 py-1 text-[11px] rounded-md text-slate-500 dark:text-slate-400
             hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition"
    >
      취소
    </button>
  </div>

  {#if filtering}
    <p class="px-3 py-1 text-[10px] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
      검색 중입니다. "전체 선택"은 화면에 보이는 {visibleDocs.length}개만 고릅니다.
    </p>
  {/if}
{/if}
