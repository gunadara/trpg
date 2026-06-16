<script lang="ts">
  import { onMount } from 'svelte';
  import { drawStore } from '$lib/stores/drawStore';

  let open = false;
  let loaded = false;

  onMount(() => {
    drawStore.load();
    loaded = true;
  });

  $: data = $drawStore;
  $: categories = data?.categories ?? [];

  // 선택된 묶음 (없으면 첫 번째)
  let activeIdx = 0;
  $: if (activeIdx >= categories.length) activeIdx = 0;
  $: activeCat = categories[activeIdx] ?? null;

  // 굴린 결과 + 담은 것들
  let current: string | null = null;
  let basket: string[] = [];
  let copied = false;

  function roll() {
    if (!activeCat || activeCat.words.length === 0) { current = null; return; }
    const pick = activeCat.words[Math.floor(Math.random() * activeCat.words.length)];
    current = pick;
  }

  function keep() {
    if (current && !basket.includes(current)) basket = [...basket, current];
    roll(); // 담고 바로 다음 후보
  }

  function removeFromBasket(w: string) {
    basket = basket.filter((b) => b !== w);
  }

  function selectCat(i: number) {
    activeIdx = i;
    current = null;
  }

  async function copyBasket() {
    const text = basket.join(', ');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      copied = false;
    }
  }

  function clearBasket() { basket = []; current = null; }

  function toggle() {
    open = !open;
    if (open && !current) roll();
  }
</script>

{#if loaded}
  <!-- 떠다니는 버튼 -->
  <button
    on:click={toggle}
    class="fixed bottom-5 right-5 z-40 w-13 h-13 rounded-full shadow-xl border border-indigo-400/40
           bg-indigo-600 hover:bg-indigo-500 text-white text-2xl flex items-center justify-center
           transition active:scale-95"
    style="width:52px;height:52px"
    title="뽑기 도우미"
    aria-label="뽑기 도우미 열기"
  >🎲</button>

  <!-- 패널 -->
  {#if open}
    <div class="fixed bottom-20 right-5 z-40 w-[320px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl text-slate-200 overflow-hidden">
      <!-- 헤더 -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 class="text-sm font-bold text-white flex items-center gap-1.5">🎲 뽑기 도우미</h3>
        <a href="/draw" class="text-[10px] text-slate-500 hover:text-indigo-300" title="소재뽑기 화면에서 단어 편집">단어 편집 →</a>
      </div>

      <div class="p-4 space-y-3">
        <!-- 묶음 선택 -->
        <div class="flex flex-wrap gap-1.5">
          {#each categories as cat, i}
            <button
              on:click={() => selectCat(i)}
              class="px-2.5 py-1 rounded-full text-[11px] border transition
                     {i === activeIdx
                       ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                       : 'border-slate-700 text-slate-400 hover:border-slate-500'}"
            >{cat.name}</button>
          {/each}
        </div>

        {#if !activeCat || activeCat.words.length === 0}
          <p class="text-xs text-slate-500 text-center py-4">
            이 묶음엔 단어가 없어요. <a href="/draw" class="text-indigo-400 hover:underline">소재뽑기</a>에서 추가하세요.
          </p>
        {:else}
          <!-- 현재 결과 -->
          <div class="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-center">
            <p class="text-lg font-bold text-amber-300 min-h-[1.75rem]">{current ?? '—'}</p>
          </div>

          <!-- 굴리기 / 담기 -->
          <div class="flex gap-2">
            <button on:click={roll} class="flex-1 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:border-indigo-500 transition">🔄 다시</button>
            <button on:click={keep} disabled={!current} class="flex-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-bold transition">＋ 담기</button>
          </div>
        {/if}

        <!-- 담은 것들 -->
        {#if basket.length > 0}
          <div class="border-t border-slate-800 pt-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] text-slate-500">담은 소재 ({basket.length})</span>
              <button on:click={clearBasket} class="text-[10px] text-slate-600 hover:text-rose-400">비우기</button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              {#each basket as w (w)}
                <span class="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200">
                  {w}
                  <button on:click={() => removeFromBasket(w)} class="text-slate-600 hover:text-rose-400 text-[11px]">×</button>
                </span>
              {/each}
            </div>
            <button on:click={copyBasket} class="w-full px-3 py-2 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-sm font-bold transition">
              {copied ? '✓ 복사됨!' : '📋 복사해서 붙여넣기'}
            </button>
            <p class="text-[10px] text-slate-600 text-center">복사한 뒤 원하는 입력칸에 붙여넣으세요.</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}
