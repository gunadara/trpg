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

  let current: string | null = null;
  let basket: string[] = [];
  let copied = false;

  function roll() {
    if (!sub || sub.tags.length === 0) { current = null; return; }
    current = sub.tags[Math.floor(Math.random() * sub.tags.length)];
  }
  function keep() {
    if (current && !basket.includes(current)) basket = [...basket, current];
  }
  function removeFromBasket(w: string) { basket = basket.filter((b) => b !== w); }
  function selectGroup(i: number) { gIdx = i; sIdx = 0; current = null; }
  function selectSub(i: number) { sIdx = i; current = null; }

  async function copyBasket() {
    const text = basket.join(', ');
    if (!text) return;
    try { await navigator.clipboard.writeText(text); copied = true; setTimeout(() => (copied = false), 1500); } catch {}
  }
  function clearBasket() { basket = []; current = null; }
  function toggle() { open = !open; if (open && !current) roll(); }
</script>

{#if loaded}
  <button on:click={toggle}
    class="fixed bottom-5 right-5 z-40 rounded-full shadow-xl border border-indigo-400/40 bg-indigo-600 hover:bg-indigo-500 text-white text-2xl flex items-center justify-center transition active:scale-95"
    style="width:52px;height:52px" title="뽑기 도우미" aria-label="뽑기 도우미 열기">🎲</button>

  {#if open}
    <div class="fixed bottom-20 right-5 z-40 w-[320px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl text-slate-200 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
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

        {#if !sub || sub.tags.length === 0}
          <p class="text-xs text-slate-500 text-center py-3">태그가 없어요. <a href="/draw" class="text-indigo-400 hover:underline">소재뽑기</a>에서 추가하세요.</p>
        {:else}
          <div class="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-center">
            <p class="text-lg font-bold text-amber-300 min-h-[1.75rem]">{current ?? '—'}</p>
          </div>
          <div class="flex gap-2">
            <button on:click={roll} class="flex-1 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:border-indigo-500 transition">🔄 다시</button>
            <button on:click={keep} disabled={!current} class="flex-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-bold transition">＋ 담기</button>
          </div>
        {/if}

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
