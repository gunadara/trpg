<script lang="ts">
  import { onMount } from 'svelte';
  import { tagStore } from '$lib/stores/tagStore';

  let open = false;
  let loaded = false;
  onMount(() => { tagStore.load(); loaded = true; });

  $: data = $tagStore;
  $: groups = data?.groups ?? [];

  let gIdx = 0;
  let sIdx = 0;
  $: if (gIdx >= groups.length) gIdx = 0;
  $: group = groups[gIdx] ?? null;
  $: subs = group?.subs ?? [];
  $: if (sIdx >= subs.length) sIdx = 0;
  $: sub = subs[sIdx] ?? null;

  let count = 3;
  let results: string[] = [];
  let basket: string[] = [];
  let copied = false;

  function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5); }

  // 이 항목에서 N개
  function rollSub() {
    if (!sub) return;
    results = shuffle(sub.tags).slice(0, Math.min(count, sub.tags.length));
  }
  // 이 분야에서 N개 (체크된 항목 합쳐서)
  function rollGroup() {
    if (!group) return;
    const pool = group.subs.filter((s) => s.enabled !== false).flatMap((s) => s.tags);
    results = shuffle(pool).slice(0, Math.min(count, pool.length));
  }
  // 전체 랜덤 N개
  function rollAll() {
    const pool = groups.flatMap((g) => g.subs.flatMap((s) => s.tags));
    results = shuffle(pool).slice(0, Math.min(count, pool.length));
  }

  function keepAll() {
    for (const r of results) if (!basket.includes(r)) basket = [...basket, r];
  }
  function keepOne(t: string) { if (!basket.includes(t)) basket = [...basket, t]; }
  function removeFromBasket(t: string) { basket = basket.filter((b) => b !== t); }
  function clearBasket() { basket = []; }

  async function copyBasket() {
    const text = basket.join(', ');
    if (!text) return;
    try { await navigator.clipboard.writeText(text); copied = true; setTimeout(() => (copied = false), 1500); } catch {}
  }

  function selectGroup(i: number) { gIdx = i; sIdx = 0; results = []; }
  function selectSub(i: number) { sIdx = i; results = []; }
</script>

{#if loaded}
  <button on:click={() => (open = !open)}
    class="fixed bottom-5 right-5 z-40 rounded-full shadow-xl border border-indigo-400/40 bg-indigo-600 hover:bg-indigo-500 text-white text-2xl flex items-center justify-center transition active:scale-95"
    style="width:52px;height:52px" title="뽑기 도우미" aria-label="뽑기 도우미 열기">🎲</button>

  {#if open}
    <div class="fixed bottom-20 right-5 z-40 w-[340px] max-w-[calc(100vw-2.5rem)] max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl text-slate-200">
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800 sticky top-0 bg-slate-900">
        <h3 class="text-sm font-bold text-white">🎲 뽑기 도우미</h3>
        <a href="/draw" class="text-[10px] text-slate-500 hover:text-indigo-300">태그 편집 →</a>
      </div>

      <div class="p-4 space-y-3">
        <!-- 대분류 -->
        <div class="flex flex-wrap gap-1.5">
          {#each groups as g, i}
            <button on:click={() => selectGroup(i)}
              class="px-2.5 py-1 rounded-full text-[11px] border transition {i === gIdx ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10' : 'border-slate-700 text-slate-400 hover:border-slate-500'}">{g.name}</button>
          {/each}
        </div>
        <!-- 세부분류 -->
        {#if subs.length > 0}
          <div class="flex flex-wrap gap-1.5">
            {#each subs as s, i}
              <button on:click={() => selectSub(i)}
                class="px-2 py-0.5 rounded text-[10px] border transition {i === sIdx ? 'border-emerald-500 text-emerald-300' : 'border-slate-800 text-slate-500 hover:border-slate-600'}">{s.name}</button>
            {/each}
          </div>
        {/if}

        <!-- 개수 -->
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-slate-500">개수</span>
          <button on:click={() => (count = Math.max(1, count - 1))} class="w-6 h-6 rounded border border-slate-700 text-slate-400 hover:border-slate-500">−</button>
          <span class="text-xs text-slate-300 w-5 text-center">{count}</span>
          <button on:click={() => (count = Math.min(8, count + 1))} class="w-6 h-6 rounded border border-slate-700 text-slate-400 hover:border-slate-500">＋</button>
        </div>

        <!-- 뽑기 방식 3가지 -->
        <div class="grid grid-cols-3 gap-1.5">
          <button on:click={rollSub} disabled={!sub || sub.tags.length === 0}
            class="px-2 py-2 rounded-lg text-[11px] border border-slate-700 text-slate-300 hover:border-indigo-500 disabled:opacity-30 transition">이 항목</button>
          <button on:click={rollGroup} disabled={!group}
            class="px-2 py-2 rounded-lg text-[11px] border border-slate-700 text-slate-300 hover:border-indigo-500 disabled:opacity-30 transition">이 분야</button>
          <button on:click={rollAll}
            class="px-2 py-2 rounded-lg text-[11px] border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-300 transition">전체</button>
        </div>

        <!-- 결과 -->
        {#if results.length > 0}
          <div class="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
            <div class="flex flex-wrap gap-1.5 mb-2">
              {#each results as r (r)}
                <button on:click={() => keepOne(r)} class="rounded-full border border-amber-700/50 bg-amber-500/5 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-500/15" title="담기">{r} ＋</button>
              {/each}
            </div>
            <button on:click={keepAll} class="text-[11px] text-emerald-400 hover:underline">전부 담기</button>
          </div>
        {/if}

        <!-- 담은 것 -->
        {#if basket.length > 0}
          <div class="border-t border-slate-800 pt-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] text-slate-500">담은 태그 ({basket.length})</span>
              <button on:click={clearBasket} class="text-[10px] text-slate-600 hover:text-rose-400">비우기</button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              {#each basket as w (w)}
                <span class="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200">
                  {w}<button on:click={() => removeFromBasket(w)} class="text-slate-600 hover:text-rose-400 text-[11px]">×</button>
                </span>
              {/each}
            </div>
            <button on:click={copyBasket} class="w-full px-3 py-2 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-sm font-bold transition">{copied ? '✓ 복사됨!' : '📋 복사해서 붙여넣기'}</button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}
