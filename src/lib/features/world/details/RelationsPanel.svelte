<script lang="ts">
  import { onMount } from 'svelte';
  import { relationLabels, relTypes } from '$lib/stores/relationLabels';
  import { getDocById } from '$lib/stores/docStore';
  import { gotoDoc } from '$lib/services/worldNav';
  import { categoryPillClass } from '$lib/domain/categories';
  import type { WorldDoc } from '$lib/domain/docs';

  export let docId: string;

  onMount(() => {
    relationLabels.load();
    relTypes.load();
  });

  type Row = {
    key: string;
    other: WorldDoc;
    typeLabel: string;
    color: string;
    arrow: string; // 이 문서 기준 방향 표시
  };

  // 이 문서가 낀 모든 관계 (from이든 to든)
  $: rows = (() => {
    const out: Row[] = [];
    const labels = $relationLabels;
    const types = $relTypes;
    for (const [key, entry] of Object.entries(labels)) {
      const [a, b] = key.split('->');
      const iAmFrom = a === docId;
      const iAmTo = b === docId;
      if (!iAmFrom && !iAmTo) continue;

      const otherId = iAmFrom ? b : a;
      const other = getDocById(otherId);
      if (!other) continue;

      const meta = types[entry.type];
      // 이 문서 기준 화살표
      let arrow: string;
      if (entry.dir === 'both') arrow = '↔';
      else if (iAmFrom) arrow = entry.dir === 'to' ? '→' : '←';
      else arrow = entry.dir === 'to' ? '←' : '→';

      out.push({
        key,
        other,
        typeLabel: meta?.label ?? '관계',
        color: meta?.color ?? '#94a3b8',
        arrow
      });
    }
    // 종류별로 정렬
    return out.sort((x, y) => x.typeLabel.localeCompare(y.typeLabel));
  })();

  function remove(key: string) {
    const [a, b] = key.split('->');
    if (!confirm('이 관계를 삭제할까요?')) return;
    relationLabels.setLabel(a, b, null);
  }
</script>

{#if rows.length > 0}
  <section class="mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
    <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">관계</h3>
    <ul class="flex flex-wrap gap-1.5">
      {#each rows as r (r.key)}
        <li>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
            <span class="font-bold" style="color: {r.color}">{r.arrow}</span>
            <span class="font-medium" style="color: {r.color}">{r.typeLabel}</span>
            <button
              type="button"
              class={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full transition ${categoryPillClass(r.other.category)}`}
              on:click={() => gotoDoc(r.other)}
            >
              <span class="opacity-70">#{r.other.category}</span>
              <span class="font-medium">{r.other.title || '제목 없음'}</span>
            </button>
            <button
              type="button"
              class="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 text-[11px]"
              title="관계 삭제"
              on:click={() => remove(r.key)}
            >×</button>
          </span>
        </li>
      {/each}
    </ul>
    <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">관계 추가·방향 변경은 세계관 → 관계도에서.</p>
  </section>
{/if}
