<script lang="ts">
  import { goto } from '$app/navigation';
  import { CATEGORY_META, WORLD_CATEGORY_IDS } from '$lib/domain/categories';
  import type { CategoryId } from '$lib/domain/categories';
  import {
    listTrash,
    purgeFromTrash,
    emptyTrash,
    RETENTION_DAYS,
    type TrashItem
  } from '$lib/stores/trashStore';
  import { restoreDocs } from '$lib/stores/docStore';
  import { matchesTextQuery } from '$lib/utils/koreanSearch';

  let items: TrashItem[] = listTrash();
  let filter = '';
  let catFilter: CategoryId | 'all' = 'all';
  let selected: Set<string> = new Set();

  function refresh() {
    items = listTrash();
    // 사라진 항목은 선택에서 제외
    const alive = new Set(items.map((i) => i.doc.id));
    selected = new Set([...selected].filter((id) => alive.has(id)));
  }

  $: shown = items
    .filter((it) => catFilter === 'all' || it.doc.category === catFilter)
    .filter((it) => !filter.trim() || matchesTextQuery(it.doc.title ?? '', filter));

  /** 카테고리별 개수 — 탭에 표시 */
  $: counts = items.reduce<Record<string, number>>((acc, it) => {
    const c = String(it.doc.category);
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});

  function daysLeft(deletedAt: string): number {
    const t = Date.parse(deletedAt);
    if (Number.isNaN(t)) return RETENTION_DAYS;
    return Math.max(0, RETENTION_DAYS - Math.floor((Date.now() - t) / 864e5));
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  function toggleAll() {
    const ids = shown.map((i) => i.doc.id);
    const all = ids.length > 0 && ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
    selected = next;
  }

  function restoreSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    restoreDocs(ids);
    selected = new Set();
    refresh();
  }

  function purgeSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`${ids.length}개를 완전히 삭제할까요?\n이제 되돌릴 수 없습니다.`)) return;
    purgeFromTrash(ids);
    selected = new Set();
    refresh();
  }

  function emptyAll() {
    if (items.length === 0) return;
    if (!confirm(`휴지통의 ${items.length}개를 모두 완전히 삭제할까요?\n되돌릴 수 없습니다.`)) return;
    emptyTrash();
    selected = new Set();
    refresh();
  }

  function openOriginal(it: TrashItem) {
    // 복원한 뒤 그 문서로 이동
    restoreDocs([it.doc.id]);
    refresh();
    goto(`/world/${it.doc.category}/${it.doc.id}`);
  }

  $: allShownSelected =
    shown.length > 0 && shown.every((i) => selected.has(i.doc.id));
</script>

<div class="p-3 sm:p-5 max-w-4xl mx-auto space-y-4">
  <!-- 머리 -->
  <div class="flex items-center gap-2 flex-wrap">
    <button type="button" on:click={() => goto('/world')}
      class="text-xs text-slate-400 hover:text-indigo-500 px-2 py-1 rounded-md transition">← 세계관</button>
    <h1 class="text-base font-bold text-slate-800 dark:text-slate-100">🗑 휴지통</h1>
    <span class="text-[11px] text-slate-400 dark:text-slate-500">
      {items.length}개 · {RETENTION_DAYS}일 뒤 자동 삭제
    </span>
    <div class="flex-1"></div>
    {#if items.length > 0}
      <button type="button" on:click={emptyAll}
        class="px-2.5 py-1 text-[11px] rounded-md text-red-600 hover:bg-red-100
               dark:text-red-300 dark:hover:bg-red-900/40 transition">전체 비우기</button>
    {/if}
  </div>

  {#if items.length === 0}
    <div class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 py-16 text-center">
      <p class="text-sm text-slate-400 dark:text-slate-500">휴지통이 비어 있습니다.</p>
      <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
        삭제한 문서는 {RETENTION_DAYS}일 동안 여기 보관됩니다.
      </p>
    </div>
  {:else}
    <!-- 카테고리 탭 -->
    <div class="flex gap-1 flex-wrap">
      <button type="button" on:click={() => (catFilter = 'all')}
        class="px-2.5 py-1 rounded-lg text-xs font-medium transition
               {catFilter === 'all' ? 'bg-indigo-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
        전체 {items.length}
      </button>
      {#each WORLD_CATEGORY_IDS as cid}
        {#if counts[cid]}
          <button type="button" on:click={() => (catFilter = cid)}
            class="px-2.5 py-1 rounded-lg text-xs font-medium transition
                   {catFilter === cid ? 'bg-indigo-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
            {CATEGORY_META[cid].icon} {CATEGORY_META[cid].label} {counts[cid]}
          </button>
        {/if}
      {/each}
    </div>

    <input
      type="text"
      bind:value={filter}
      placeholder="제목 검색"
      class="w-full rounded-xl border border-slate-200 dark:border-slate-700
             bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition"
    />

    <!-- 선택 도구 -->
    <div class="flex items-center gap-2 flex-wrap px-1">
      <button type="button" on:click={toggleAll}
        class="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600">
        <span class="h-4 w-4 rounded border flex items-center justify-center text-[9px] shrink-0
                     {allShownSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600'}">
          {allShownSelected ? '✓' : ''}
        </span>
        전체 선택
      </button>
      <span class="text-[11px] text-slate-500 dark:text-slate-400">{selected.size}개 선택</span>
      <div class="flex-1"></div>
      <button type="button" on:click={restoreSelected} disabled={selected.size === 0}
        class="px-2.5 py-1 text-[11px] rounded-md transition
               {selected.size === 0 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                 : 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-900/30'}">되돌리기</button>
      <button type="button" on:click={purgeSelected} disabled={selected.size === 0}
        class="px-2.5 py-1 text-[11px] rounded-md transition
               {selected.size === 0 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                 : 'text-red-600 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40'}">완전 삭제</button>
    </div>

    <!-- 목록 -->
    {#if shown.length === 0}
      <p class="text-xs text-slate-400 dark:text-slate-500 text-center py-10">검색 결과가 없습니다.</p>
    {:else}
      <ul class="space-y-1.5">
        {#each shown as it (it.doc.id)}
          <li class="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900
                     border border-slate-200 dark:border-slate-700">
            <button type="button" on:click={() => toggle(it.doc.id)}
              class="h-4 w-4 rounded border flex items-center justify-center text-[9px] shrink-0 transition
                     {selected.has(it.doc.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600'}"
              aria-label="선택">
              {selected.has(it.doc.id) ? '✓' : ''}
            </button>

            <span class="text-base shrink-0">{CATEGORY_META[it.doc.category as CategoryId]?.icon ?? '📄'}</span>

            <div class="min-w-0 flex-1">
              <p class="text-sm text-slate-700 dark:text-slate-200 truncate">
                {it.doc.title || '(제목 없음)'}
              </p>
              {#if it.doc.summary}
                <p class="text-[11px] text-slate-400 dark:text-slate-500 truncate">{it.doc.summary}</p>
              {/if}
              <p class="text-[10px] text-slate-400 dark:text-slate-500">
                {CATEGORY_META[it.doc.category as CategoryId]?.label ?? it.doc.category} · {daysLeft(it.deletedAt)}일 남음
              </p>
            </div>

            <button type="button" on:click={() => openOriginal(it)}
              class="px-2 py-1 text-[10px] rounded-md text-indigo-600 dark:text-indigo-300
                     hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition shrink-0"
              title="되돌리고 열기">열기</button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>
