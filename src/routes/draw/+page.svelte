<script lang="ts">
  import { onMount } from 'svelte';
  import { tagStore, type Group, type Sub } from '$lib/stores/tagStore';
  import SlotMachine from '$lib/features/draw/SlotMachine.svelte';
  import RouletteWheel from '$lib/features/draw/RouletteWheel.svelte';

  onMount(() => {
    tagStore.load();
    const s = localStorage.getItem('drawStyle');
    if (s === 'slot' || s === 'roulette') drawStyle = s;
  });

  // 뽑기 연출 방식
  type DrawStyle = 'instant' | 'slot' | 'roulette';
  let drawStyle: DrawStyle = 'instant';
  const STYLES: { v: DrawStyle; label: string }[] = [
    { v: 'instant', label: '⚡ 바로' },
    { v: 'slot', label: '🎰 슬롯' },
    { v: 'roulette', label: '🎡 룰렛' }
  ];
  function setStyle(v: DrawStyle) {
    drawStyle = v;
    try { localStorage.setItem('drawStyle', v); } catch {}
    slotReels = []; roulettePool = []; spinning = false;
  }

  $: data = $tagStore;
  $: groups = data?.groups ?? [];

  let gid: string | null = null;
  const RANDOM_ID = '__random__'; // 삭제 불가 가상 항목 "전체 랜덤"
  $: if (!gid && groups.length > 0) gid = groups[0].id;
  $: isRandom = gid === RANDOM_ID;
  $: group = groups.find((g) => g.id === gid) ?? null;

  // 선택된 세부분류 (탭)
  let activeSubId: string | null = null;
  $: subs = group?.subs ?? [];
  $: if (group && (activeSubId === null || !subs.some((s) => s.id === activeSubId))) {
    activeSubId = subs[0]?.id ?? null;
  }
  $: activeSub = subs.find((s) => s.id === activeSubId) ?? null;

  // 입력
  let newGroupName = '';
  let tagInput: Record<string, string> = {}; // subId -> 입력값

  function addGroup() { if (newGroupName.trim()) { gid = tagStore.addGroup(newGroupName); newGroupName = ''; } }
  function addTags(sub: Sub) {
    const v = (tagInput[sub.id] ?? '').trim();
    if (group && v) { tagStore.addTags(group.id, sub.id, v); tagInput[sub.id] = ''; tagInput = { ...tagInput }; }
  }

  // 뽑기 결과: tag(태그) + source(출처, 전체 랜덤에서만 채움)
  let results: { tag: string; source: string | null }[] = [];
  let rolled = false;
  let copied = false;
  let pickCount = 3;
  let pickMode: 'each' | 'n' = 'each'; // 방식 선택: 카테고리별 1개씩 / 모아서 N개

  // 슬롯 연출 상태
  let slotReels: { pool: string[]; final: string }[] = [];
  let slotKey = 0;
  let spinning = false;

  // 룰렛 연출 상태
  const ROULETTE_MAX = 18;
  let roulettePool: { tag: string; source: string | null }[] = [];
  let rouletteKey = 0;

  // 선택된 방식으로 실행 (큰 뽑기 버튼)
  function rollGroup() {
    if (!group) return;
    if (drawStyle === 'roulette') {
      const pool = group.subs
        .filter((s) => s.enabled !== false)
        .flatMap((s) => s.tags.map((t) => ({ tag: t, source: null as string | null })));
      startRoulette(pool);
      return;
    }
    if (pickMode === 'each') {
      // 체크된 항목마다 각각 1개씩 (캐릭터 완성용)
      const picked = group.subs
        .filter((s) => s.enabled !== false && s.tags.length > 0)
        .map((s) => ({ tag: s.tags[Math.floor(Math.random() * s.tags.length)], source: null as string | null, pool: s.tags }));
      applyResults(picked);
    } else {
      // 체크된 항목 태그를 다 합쳐서 무작위 N개 (항목 구분 없이)
      const pool = group.subs.filter((s) => s.enabled !== false).flatMap((s) => s.tags);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const picked = shuffled
        .slice(0, Math.min(pickCount, shuffled.length))
        .map((t) => ({ tag: t, source: null as string | null, pool }));
      applyResults(picked);
    }
  }

  // 전체 랜덤 — 모든 분야 통틀어 N개, 출처는 아래에 표기
  function randomAll() {
    const pool = groups.flatMap((g) =>
      g.subs.flatMap((s) => s.tags.map((t) => ({ tag: t, source: `${g.name}·${s.name}` })))
    );
    if (drawStyle === 'roulette') {
      startRoulette(pool);
      return;
    }
    const tagPool = pool.map((p) => p.tag);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked = shuffled
      .slice(0, Math.min(pickCount, shuffled.length))
      .map((p) => ({ ...p, pool: tagPool }));
    applyResults(picked);
  }

  // 결과 반영 + 슬롯 연출이면 릴 세팅
  function applyResults(picked: { tag: string; source: string | null; pool: string[] }[]) {
    results = picked.map((p) => ({ tag: p.tag, source: p.source }));
    rolled = true;
    roulettePool = [];
    if (drawStyle === 'slot' && picked.length > 0) {
      slotReels = picked.map((p) => ({ pool: p.pool.length > 1 ? p.pool : [p.tag], final: p.tag }));
      spinning = true;
      slotKey += 1;
    } else {
      slotReels = [];
      spinning = false;
    }
  }

  // 룰렛 판 세팅 (풀에서 최대 18개만 무작위로 올림)
  function startRoulette(pool: { tag: string; source: string | null }[]) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    roulettePool = shuffled.slice(0, Math.min(ROULETTE_MAX, shuffled.length));
    rouletteKey += 1;
    results = [];
    rolled = false;
    slotReels = [];
    spinning = false;
  }

  function onRouletteResult(e: CustomEvent<{ tag: string }>) {
    const hit = roulettePool.find((p) => p.tag === e.detail.tag);
    results = [{ tag: e.detail.tag, source: hit?.source ?? null }];
    rolled = true;
  }
  async function copyResult() {
    const text = results.map((r) => r.tag).join(', ');
    if (!text) return;
    try { await navigator.clipboard.writeText(text); copied = true; setTimeout(() => (copied = false), 1500); } catch {}
  }
</script>

<div class="h-screen flex flex-col md:flex-row bg-canvas text-ink overflow-hidden">

  <!-- 왼쪽(PC)/상단(폰): 대분류 -->
  <aside class="w-full md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-line bg-surface/40 flex flex-col">
    <!-- 헤더: 폰에선 한 줄(제목+초기화), PC에선 블록 -->
    <div class="p-3 md:p-4 md:border-b border-line flex items-center justify-between md:block">
      <div class="min-w-0">
        <a href="/" class="text-xs text-muted hover:text-primary">← 홈으로</a>
        <h1 class="text-base font-bold text-ink md:mt-1 inline md:block ms-2 md:ms-0">🃏 소재 뽑기</h1>
        <p class="hidden md:block text-[10px] text-muted mt-0.5">분야 · 항목 · 태그</p>
      </div>
      <button on:click={() => confirm('모든 태그를 기본값으로 되돌릴까요?') && tagStore.resetAll()}
        class="md:hidden shrink-0 text-[10px] text-subtle hover:text-rose-400 ms-2">초기화</button>
    </div>

    <!-- 네비: PC 세로 목록 / 폰 가로 스크롤 칩 -->
    <nav class="flex md:flex-col md:flex-1 overflow-x-auto md:overflow-x-visible md:overflow-y-auto p-2 gap-1 md:gap-0 md:space-y-1">
      <!-- 전체 랜덤 (고정, 삭제 불가) -->
      <button on:click={() => (gid = RANDOM_ID)}
        class="shrink-0 md:w-full text-left px-3 py-2 md:py-2.5 rounded-lg text-sm transition flex items-center gap-2 whitespace-nowrap
               {isRandom ? 'bg-amber-600/20 text-amber-200 border border-amber-600' : 'text-muted border border-transparent hover:bg-bubble'}">
        🎲 <span class="font-medium">전체 랜덤</span>
      </button>
      <div class="hidden md:block h-px bg-bubble my-1"></div>

      {#each groups as g (g.id)}
        <button on:click={() => (gid = g.id)}
          class="shrink-0 md:w-full text-left px-3 py-2 md:py-2.5 rounded-lg text-sm transition flex items-center gap-2 md:justify-between whitespace-nowrap
                 {gid === g.id ? 'bg-primary/20 text-primary border border-primary' : 'text-muted border border-transparent hover:bg-bubble'}">
          <span class="font-medium">{g.name}</span>
          <span class="text-[10px] text-muted">{g.subs.length}</span>
        </button>
      {/each}

      <!-- 폰 전용: 분야 추가 칩 (PC는 아래 입력칸 사용) -->
      <button on:click={() => { const n = prompt('새 분야 이름'); if (n && n.trim()) gid = tagStore.addGroup(n); }}
        class="md:hidden shrink-0 px-3 py-2 rounded-lg text-sm border border-dashed border-line text-muted hover:border-primary whitespace-nowrap">＋ 분야</button>
    </nav>

    <!-- PC 전용 푸터: 새 분야 입력 + 전체 초기화 -->
    <div class="hidden md:block p-2 border-t border-line space-y-2">
      <div class="flex gap-1">
        <input bind:value={newGroupName} on:keydown={(e) => e.key === 'Enter' && addGroup()}
          placeholder="새 분야" maxlength="16"
          class="flex-1 min-w-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-primary" />
        <button on:click={addGroup} class="px-2.5 py-1.5 rounded-lg bg-bubble hover:bg-bubble text-xs">＋</button>
      </div>
      <button on:click={() => confirm('모든 태그를 기본값으로 되돌릴까요?') && tagStore.resetAll()}
        class="w-full text-[10px] text-subtle hover:text-rose-400 text-left px-1">전체 초기화</button>
    </div>
  </aside>

  <!-- 오른쪽: 결과 박스 + 세부분류/태그 -->
  <main class="flex-1 overflow-y-auto">
    {#if isRandom}
      <!-- 전체 랜덤 화면 -->
      <div class="max-w-2xl mx-auto p-6 space-y-5">
        <section class="rounded-2xl border border-line bg-surface/60 p-5">
          <h2 class="text-sm font-bold text-amber-300 mb-1">🎲 전체 랜덤</h2>
          <p class="text-[11px] text-muted mb-4">분야·항목 상관없이 모든 태그에서 무작위로 뽑아요.</p>

          <!-- 연출 방식 -->
          <div class="flex gap-1.5 mb-3">
            {#each STYLES as st (st.v)}
              <button on:click={() => setStyle(st.v)}
                class="px-3 py-1.5 rounded-lg border text-xs font-bold transition
                       {drawStyle === st.v ? 'border-amber-500 bg-amber-600/20 text-amber-200' : 'border-line bg-surface/40 text-muted hover:border-amber-500/40'}">
                {st.label}
              </button>
            {/each}
          </div>

          <div class="flex items-center gap-2 mb-4">
            <button on:click={randomAll}
              class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition">
              {drawStyle === 'roulette' ? '🎡 룰렛 만들기' : '🎲 뽑기'}
            </button>
            {#if drawStyle !== 'roulette'}
              <span class="flex items-center gap-1 ms-1">
                <button on:click={() => (pickCount = Math.max(1, pickCount - 1))} class="w-7 h-7 rounded border border-line text-muted hover:border-primary/40">−</button>
                <span class="text-sm text-muted w-6 text-center">{pickCount}</span>
                <button on:click={() => (pickCount = Math.min(8, pickCount + 1))} class="w-7 h-7 rounded border border-line text-muted hover:border-primary/40">＋</button>
                <span class="text-[11px] text-muted">개</span>
              </span>
            {:else}
              <span class="text-[11px] text-muted">한 번에 1개 · 판에는 최대 {ROULETTE_MAX}개</span>
            {/if}
          </div>

          <div class="rounded-xl border border-line bg-canvas/60 min-h-[80px] p-4">
            {#if drawStyle === 'roulette' && roulettePool.length > 0}
              {#key rouletteKey}
                <RouletteWheel items={roulettePool.map((p) => p.tag)} autoSpin on:result={onRouletteResult} />
              {/key}
              {#if rolled && results.length > 0 && !spinning}
                <p class="text-lg font-bold text-amber-300 text-center mt-3">{results[0].tag}</p>
                {#if results[0].source}
                  <p class="text-[11px] text-muted text-center mt-1">{results[0].source}</p>
                {/if}
              {/if}
            {:else if drawStyle === 'slot' && slotReels.length > 0}
              {#key slotKey}
                <SlotMachine reels={slotReels} on:done={() => (spinning = false)} />
              {/key}
              {#if !spinning && results.some((r) => r.source)}
                <div class="mt-4 pt-3 border-t border-line">
                  <p class="text-[10px] text-subtle mb-1">출처</p>
                  <p class="text-[11px] text-muted leading-relaxed">
                    {results.map((r) => `${r.tag} (${r.source})`).join(' · ')}
                  </p>
                </div>
              {/if}
            {:else if !rolled}
              <p class="text-sm text-subtle text-center">아직 뽑지 않았어요</p>
            {:else if results.length === 0}
              <p class="text-sm text-subtle text-center">뽑을 태그가 없어요</p>
            {:else}
              <div class="flex flex-wrap gap-x-4 gap-y-2 justify-center">
                {#each results as r}
                  <p class="text-lg font-bold text-amber-300">{r.tag}</p>
                {/each}
              </div>
              {#if results.some((r) => r.source)}
                <div class="mt-4 pt-3 border-t border-line">
                  <p class="text-[10px] text-subtle mb-1">출처</p>
                  <p class="text-[11px] text-muted leading-relaxed">
                    {results.map((r) => `${r.tag} (${r.source})`).join(' · ')}
                  </p>
                </div>
              {/if}
            {/if}
          </div>
          {#if rolled && results.length > 0 && !spinning}
            <button on:click={copyResult} class="mt-2 text-xs text-emerald-400 hover:underline">{copied ? '✓ 복사됨' : '📋 결과 복사'}</button>
          {/if}
        </section>
      </div>

    {:else if group}
      <div class="max-w-2xl mx-auto p-6 space-y-5">

        <!-- 뽑기 결과 박스 -->
        <section class="rounded-2xl border border-line bg-surface/60 p-5">
          <h2 class="text-sm font-bold text-primary mb-3">✨ 뽑기 결과</h2>

          <!-- 연출 방식 -->
          <div class="flex gap-1.5 mb-3">
            {#each STYLES as st (st.v)}
              <button on:click={() => setStyle(st.v)}
                class="px-3 py-1.5 rounded-lg border text-xs font-bold transition
                       {drawStyle === st.v ? 'border-primary bg-primary/20 text-primary' : 'border-line bg-surface/40 text-muted hover:border-primary/40'}">
                {st.label}
              </button>
            {/each}
          </div>

          {#if drawStyle === 'roulette'}
            <p class="text-[11px] text-muted mb-3">한 번에 1개 뽑아요 · 판에는 최대 {ROULETTE_MAX}개가 무작위로 올라가요</p>
          {:else}
          <!-- 방식 선택 (라디오처럼 하이라이트) → 폰 세로 스택 -->
          <p class="text-[11px] text-muted mb-2">방식 선택</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <button on:click={() => (pickMode = 'each')}
              class="px-3 py-3 rounded-xl border text-xs font-bold transition text-center
                     {pickMode === 'each' ? 'border-primary bg-primary/20 text-primary' : 'border-line bg-surface/40 text-muted hover:border-primary/40'}">
              카테고리별 1개씩<br><span class="text-[10px] font-normal opacity-70">{group.name}의 항목마다 하나씩</span>
            </button>
            <button on:click={() => (pickMode = 'n')}
              class="px-3 py-3 rounded-xl border text-xs font-bold transition text-center
                     {pickMode === 'n' ? 'border-amber-500 bg-amber-600/20 text-amber-100' : 'border-line bg-surface/40 text-muted hover:border-primary/40'}">
              모아서 N개<br><span class="text-[10px] font-normal opacity-70">전체 태그에서 무작위로</span>
            </button>
          </div>

          <!-- N개 방식일 때만 개수 -->
          {#if pickMode === 'n'}
            <div class="flex items-center justify-center gap-2 mb-3">
              <span class="text-[11px] text-muted">개수</span>
              <button on:click={() => (pickCount = Math.max(1, pickCount - 1))} class="w-7 h-7 rounded border border-line text-muted hover:border-primary/40">−</button>
              <span class="text-sm text-muted w-8 text-center">{pickCount}</span>
              <button on:click={() => (pickCount = Math.min(8, pickCount + 1))} class="w-7 h-7 rounded border border-line text-muted hover:border-primary/40">＋</button>
            </div>
          {/if}
          {/if}

          <!-- 큰 뽑기 버튼 (선택된 방식으로 실행) -->
          <button on:click={rollGroup} disabled={!group.subs.some((s) => s.enabled !== false && s.tags.length > 0)}
            class="w-full py-3 rounded-xl bg-primary hover:opacity-90 disabled:opacity-30  text-ink text-sm font-bold transition mb-3">
            {drawStyle === 'roulette' ? '🎡 룰렛 만들기' : '🎲 뽑기'}
          </button>

          <div class="rounded-xl border border-line bg-canvas/60 min-h-[72px] p-4 flex flex-col items-center justify-center">
            {#if drawStyle === 'roulette' && roulettePool.length > 0}
              {#key rouletteKey}
                <RouletteWheel items={roulettePool.map((p) => p.tag)} autoSpin on:result={onRouletteResult} />
              {/key}
              {#if rolled && results.length > 0 && !spinning}
                <p class="text-lg font-bold text-amber-300 text-center mt-3">{results[0].tag}</p>
              {/if}
            {:else if drawStyle === 'slot' && slotReels.length > 0}
              {#key slotKey}
                <SlotMachine reels={slotReels} on:done={() => (spinning = false)} />
              {/key}
            {:else if !rolled}
              <span class="text-sm text-subtle">아직 뽑지 않았어요</span>
            {:else if results.length === 0}
              <span class="text-sm text-subtle">뽑을 태그가 없어요</span>
            {:else}
              <div class="flex flex-wrap gap-2 justify-center">
                {#each results as r}
                  <p class="text-lg font-bold text-amber-300 px-2">{r.tag}</p>
                {/each}
              </div>
            {/if}
          </div>
          {#if rolled && results.length > 0 && !spinning}
            <button on:click={copyResult} class="mt-2 text-xs text-emerald-400 hover:underline">{copied ? '✓ 복사됨' : '📋 결과 복사'}</button>
          {/if}
        </section>

        <!-- 세부분류 가로 탭 + 선택된 항목의 태그 -->
        <div>
          <div class="flex flex-wrap items-center gap-1.5 mb-3">
            {#each group.subs as sub (sub.id)}
              <div class="inline-flex items-center rounded-lg border transition overflow-hidden
                          {activeSubId === sub.id ? 'border-primary bg-primary/10' : 'border-line'}">
                <button on:click={() => tagStore.toggleSub(group.id, sub.id)}
                  class="ps-2 py-1.5 text-xs {sub.enabled !== false ? 'text-emerald-400' : 'text-subtle'}"
                  title="분야 전체 뽑기에 포함">{sub.enabled !== false ? '☑' : '☐'}</button>
                <button on:click={() => (activeSubId = sub.id)}
                  class="pe-3 ps-1 py-1.5 text-xs {activeSubId === sub.id ? 'text-primary' : 'text-muted hover:text-ink'}">
                  {sub.name} <span class="text-subtle">({sub.tags.length})</span>
                </button>
              </div>
            {/each}
            <button on:click={() => { const n = prompt('새 항목 이름 (예: 성격/태도)'); if (n && n.trim()) activeSubId = tagStore.addSub(group.id, n); }}
              class="px-3 py-1.5 rounded-lg text-xs border border-dashed border-line text-muted hover:border-primary hover:text-primary transition">＋ 항목</button>
          </div>

          {#if activeSub}
            <section class="rounded-2xl border border-line bg-surface/40 p-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-ink">{activeSub.name}</h3>
                <button on:click={() => { if (confirm(`「${activeSub.name}」 삭제할까요?`)) { tagStore.deleteSub(group.id, activeSub.id); activeSubId = null; } }}
                  class="text-[11px] text-subtle hover:text-rose-400">항목 삭제</button>
              </div>

              <div class="flex flex-wrap gap-1.5 mb-3">
                {#each activeSub.tags as t (t)}
                  <span class="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink">
                    {t}
                    <button on:click={() => tagStore.removeTag(group.id, activeSub.id, t)} class="text-subtle hover:text-rose-400">×</button>
                  </span>
                {/each}
                {#if activeSub.tags.length === 0}<span class="text-[11px] text-subtle">아직 태그가 없어요.</span>{/if}
              </div>

              <div class="flex gap-1.5">
                <input value={tagInput[activeSub.id] ?? ''}
                  on:input={(e) => { tagInput[activeSub.id] = e.currentTarget.value; tagInput = { ...tagInput }; }}
                  on:keydown={(e) => e.key === 'Enter' && addTags(activeSub)}
                  placeholder="태그 입력 (쉼표로 여러 개)"
                  class="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary" />
                <button on:click={() => addTags(activeSub)} class="px-4 py-2 rounded-lg bg-bubble hover:bg-bubble text-sm">추가</button>
              </div>
            </section>
          {:else}
            <p class="text-xs text-subtle text-center py-8 border border-dashed border-line rounded-2xl">위에서 항목을 골라주세요.</p>
          {/if}
        </div>
      </div>
    {:else}
      <div class="h-full flex items-center justify-center text-muted text-sm">왼쪽에서 분야를 추가해 시작하세요.</div>
    {/if}
  </main>
</div>
