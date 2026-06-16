<script lang="ts">
  import { onMount } from 'svelte';
  import { drawStore } from '$lib/stores/drawStore';
  import { currentSession } from '$lib/stores/sessionStore';

  // 저장분 + 진행 중 세션 불러오기 (오라클과 동일 패턴)
  onMount(() => {
    drawStore.load();
    currentSession.load();
  });

  type ResultItem = { cat: string | null; word: string };
  let results: ResultItem[] = [];
  let rolled = false;

  $: data = $drawStore;
  $: activeCat =
    data.categories[data.activeCat] ?? data.categories[0] ?? { name: '', words: [] };

  // 세션이 켜져 있으면 결과를 로그로 남김
  function logToSession(content: string) {
    if ($currentSession) {
      currentSession.addLog({ type: 'note', content: `🎰 ${content}` });
    }
  }

  // Fisher–Yates 셔플 (sort(random)보다 균등함)
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function roll() {
    if (data.mode === 'category') {
      results = data.categories
        .filter((c) => c.words.length > 0)
        .map((c) => ({
          cat: c.name,
          word: c.words[Math.floor(Math.random() * c.words.length)]
        }));
    } else {
      const all = data.categories.flatMap((c) => c.words);
      results = shuffle(all)
        .slice(0, Math.min(data.count, all.length))
        .map((w) => ({ cat: null, word: w }));
    }
    rolled = true;

    if (results.length > 0) {
      const summary =
        data.mode === 'category'
          ? results.map((r) => `${r.cat}=${r.word}`).join(' · ')
          : results.map((r) => r.word).join(', ');
      logToSession(`소재: ${summary}`);
    }
  }

  /* ---------- 단어 / 카테고리 편집 ---------- */

  let inputValue = '';

  function addWord() {
    if (!inputValue.trim()) return;
    drawStore.addWords(inputValue);
    inputValue = '';
  }

  function onInputKey(e: KeyboardEvent) {
    if (e.key === 'Enter') addWord();
  }

  function addCategory() {
    const name = prompt('새 카테고리 이름');
    if (name && name.trim()) drawStore.addCategory(name);
  }

  function renameCategory() {
    const name = prompt('카테고리 이름 변경', activeCat.name);
    if (name && name.trim()) drawStore.renameCategory(name);
  }

  function deleteCategory() {
    if (data.categories.length <= 1) {
      alert('카테고리는 최소 1개 필요해요');
      return;
    }
    if (!confirm(`「${activeCat.name}」 카테고리와 단어 ${activeCat.words.length}개를 삭제할까요?`))
      return;
    drawStore.deleteCategory();
  }

  function resetAll() {
    if (!confirm('모든 카테고리와 단어를 기본값으로 되돌릴까요?')) return;
    drawStore.reset();
    results = [];
    rolled = false;
  }

  const cardCls = 'rounded-2xl border border-slate-800 bg-slate-900/70 p-5';
  const btnCls =
    'px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition';
  const modeCls = (on: boolean) =>
    `px-3 py-1.5 rounded-full text-xs border transition ${
      on
        ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
        : 'border-slate-700 text-slate-400 hover:border-slate-500'
    }`;
</script>

<div class="min-h-screen flex flex-col bg-slate-950 -mx-4 -my-4 md:-mx-8 md:-my-6">
  <header
    class="sticky top-0 z-10 p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between"
  >
    <div class="flex items-center gap-3">
      <button
        on:click={() => history.back()}
        class="text-slate-400 hover:text-white transition text-sm flex items-center gap-1"
      >
        ← 뒤로
      </button>
      <h1 class="text-lg font-bold text-white flex items-center gap-2">
        🎰 소재 뽑기 <span class="text-xs font-normal text-slate-500">(글감 무작위 추출)</span>
      </h1>
    </div>
    <a href="/oracle" class="text-xs text-indigo-400 hover:underline">🔮 오라클로</a>
  </header>

  <main class="flex-1 p-6">
    <div class="max-w-2xl mx-auto space-y-6 pb-16">
      <!-- 결과 -->
      <section class={cardCls}>
        <h2 class="text-sm font-bold text-indigo-400 mb-1">✨ 뽑기 결과</h2>
        <p class="text-[11px] text-slate-500 mb-4">
          모드를 고르고 「뽑기」를 누르세요. 단어들을 엮어 장면이나 글감으로 발전시켜 보세요.
        </p>

        <!-- 모드 -->
        <div class="flex flex-wrap gap-2 mb-3">
          <button class={modeCls(data.mode === 'category')} on:click={() => drawStore.setMode('category')}>
            카테고리별 1개씩
          </button>
          <button class={modeCls(data.mode === 'all')} on:click={() => drawStore.setMode('all')}>
            전체에서 뽑기
          </button>
        </div>

        <!-- 개수 (전체 모드) -->
        {#if data.mode === 'all'}
          <div class="flex items-center gap-3 mb-4 text-sm text-slate-400">
            <button
              class="w-7 h-7 rounded-full border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-indigo-300 transition"
              on:click={() => drawStore.changeCount(-1)}>−</button
            >
            <span class="min-w-[1.5rem] text-center font-bold text-slate-100">{data.count}</span>
            <button
              class="w-7 h-7 rounded-full border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-indigo-300 transition"
              on:click={() => drawStore.changeCount(1)}>+</button
            >
            <span>개 뽑기</span>
          </div>
        {/if}

        <button class={btnCls} on:click={roll}>🎲 뽑기</button>

        <!-- 결과 표시 -->
        <div class="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4 min-h-[72px] flex items-center justify-center">
          {#if !rolled}
            <span class="text-sm text-slate-500">아직 뽑지 않았어요</span>
          {:else if results.length === 0}
            <span class="text-sm text-slate-500">단어가 없어요 — 아래에서 추가해 보세요</span>
          {:else}
            <div class="flex flex-wrap gap-3 justify-center">
              {#each results as r}
                <div class="flex flex-col items-center gap-1">
                  {#if r.cat}
                    <span class="text-[10px] tracking-wider text-slate-500">{r.cat}</span>
                  {/if}
                  <span
                    class="px-3.5 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 font-bold"
                  >
                    {r.word}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </section>

      <!-- 단어 편집 -->
      <section class={cardCls}>
        <!-- 카테고리 탭 -->
        <div class="flex flex-wrap gap-2 mb-4">
          {#each data.categories as cat, i}
            <button
              on:click={() => drawStore.selectCategory(i)}
              class="px-3 py-1.5 rounded-lg text-xs border transition {i === data.activeCat
                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'}"
            >
              {cat.name} ({cat.words.length})
            </button>
          {/each}
          <button
            on:click={addCategory}
            class="px-3 py-1.5 rounded-lg text-xs border border-dashed border-slate-700 text-slate-500 hover:text-indigo-300 hover:border-indigo-500 transition"
          >
            + 카테고리
          </button>
        </div>

        <!-- 액션 -->
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-bold text-indigo-400">
            단어 <span class="text-slate-500 font-normal">({activeCat.words.length}개)</span>
          </h2>
          <div class="flex gap-3 text-[11px]">
            <button class="text-indigo-300 hover:underline" on:click={renameCategory}>이름 변경</button>
            <button class="text-rose-400 hover:underline" on:click={deleteCategory}>카테고리 삭제</button>
            <button class="text-slate-400 hover:underline" on:click={resetAll}>전체 초기화</button>
          </div>
        </div>

        <!-- 단어 태그 -->
        {#if activeCat.words.length === 0}
          <p class="text-center text-xs text-slate-500 py-4">단어를 추가해보세요</p>
        {:else}
          <div class="flex flex-wrap gap-2 mb-4">
            {#each activeCat.words as w, i}
              <span
                class="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full border border-slate-700 bg-slate-800/60 text-sm text-slate-200"
              >
                {w}
                <button
                  class="text-slate-500 hover:text-rose-400 transition leading-none"
                  on:click={() => drawStore.removeWord(i)}
                  aria-label="삭제">×</button
                >
              </span>
            {/each}
          </div>
        {/if}

        <!-- 입력 -->
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={inputValue}
            on:keydown={onInputKey}
            maxlength="200"
            placeholder="단어 입력 (쉼표로 여러 개 가능)"
            class="flex-1 min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 placeholder:text-slate-600"
          />
          <button
            class="px-4 py-2.5 rounded-xl border border-slate-700 text-indigo-300 text-sm hover:border-indigo-500 transition whitespace-nowrap"
            on:click={addWord}>추가</button
          >
        </div>
        <p class="text-[11px] text-slate-600 mt-2">예: 거울, 녹슨 열쇠, 새벽 세시 → 한 번에 3개 추가</p>
      </section>

      {#if $currentSession}
        <p class="text-center text-[11px] text-emerald-400">
          🟢 세션 「{$currentSession.title}」 진행 중 — 뽑은 소재가 세션 로그에 기록됩니다
        </p>
      {/if}
    </div>
  </main>
</div>
