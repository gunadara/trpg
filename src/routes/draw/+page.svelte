<script lang="ts">
  import { onMount } from 'svelte';
  import { tagStore, type Group, type Sub } from '$lib/stores/tagStore';

  onMount(() => tagStore.load());

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

  function pickFromSub(sub: Sub) {
    if (sub.tags.length === 0) return;
    const shuffled = [...sub.tags].sort(() => Math.random() - 0.5);
    results = shuffled.slice(0, Math.min(pickCount, shuffled.length)).map((t) => ({ tag: t, source: null }));
    rolled = true;
  }
  function pickFromGroup() {
    if (!group) return;
    // 왼쪽 칸: 체크된 항목마다 각각 1개씩 (캐릭터 완성용)
    results = group.subs
      .filter((s) => s.enabled !== false && s.tags.length > 0)
      .map((s) => ({ tag: s.tags[Math.floor(Math.random() * s.tags.length)], source: null }));
    rolled = true;
  }

  function pickNFromGroup() {
    if (!group) return;
    // 오른쪽 칸: 체크된 항목 태그를 다 합쳐서 무작위 N개 (항목 구분 없이)
    const pool = group.subs
      .filter((s) => s.enabled !== false)
      .flatMap((s) => s.tags);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    results = shuffled.slice(0, Math.min(pickCount, shuffled.length)).map((t) => ({ tag: t, source: null }));
    rolled = true;
  }

  // 전체 랜덤 — 모든 분야 통틀어 N개, 출처는 아래에 표기
  function randomAll() {
    const pool = groups.flatMap((g) =>
      g.subs.flatMap((s) => s.tags.map((t) => ({ tag: t, source: `${g.name}·${s.name}` })))
    );
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    results = shuffled.slice(0, Math.min(pickCount, shuffled.length));
    rolled = true;
  }
  async function copyResult() {
    const text = results.map((r) => r.tag).join(', ');
    if (!text) return;
    try { await navigator.clipboard.writeText(text); copied = true; setTimeout(() => (copied = false), 1500); } catch {}
  }
</script>

<div class="h-screen flex bg-slate-950 text-slate-200 overflow-hidden">

  <!-- 왼쪽: 대분류 목록 (세계관 관리식 고정 사이드바) -->
  <aside class="w-52 shrink-0 border-r border-slate-800 bg-slate-900/40 flex flex-col">
    <div class="p-4 border-b border-slate-800">
      <a href="/" class="text-xs text-slate-500 hover:text-indigo-400">← 홈으로</a>
      <h1 class="text-base font-bold text-white mt-1">🃏 소재 뽑기</h1>
      <p class="text-[10px] text-slate-500 mt-0.5">분야 · 항목 · 태그</p>
    </div>
    <nav class="flex-1 overflow-y-auto p-2 space-y-1">
      <!-- 전체 랜덤 (고정, 삭제 불가) -->
      <button on:click={() => (gid = RANDOM_ID)}
        class="w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center gap-2
               {isRandom ? 'bg-amber-600/20 text-amber-200 border border-amber-600' : 'text-slate-300 border border-transparent hover:bg-slate-800/60'}">
        🎲 <span class="font-medium">전체 랜덤</span>
      </button>
      <div class="h-px bg-slate-800 my-1"></div>

      {#each groups as g (g.id)}
        <button on:click={() => (gid = g.id)}
          class="w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center justify-between
                 {gid === g.id ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-600' : 'text-slate-300 border border-transparent hover:bg-slate-800/60'}">
          <span class="font-medium">{g.name}</span>
          <span class="text-[10px] text-slate-500">{g.subs.length}</span>
        </button>
      {/each}
    </nav>
    <div class="p-2 border-t border-slate-800 space-y-2">
      <div class="flex gap-1">
        <input bind:value={newGroupName} on:keydown={(e) => e.key === 'Enter' && addGroup()}
          placeholder="새 분야" maxlength="16"
          class="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500" />
        <button on:click={addGroup} class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs">＋</button>
      </div>
      <button on:click={() => confirm('모든 태그를 기본값으로 되돌릴까요?') && tagStore.resetAll()}
        class="w-full text-[10px] text-slate-600 hover:text-rose-400 text-left px-1">전체 초기화</button>
    </div>
  </aside>

  <!-- 오른쪽: 결과 박스 + 세부분류/태그 -->
  <main class="flex-1 overflow-y-auto">
    {#if isRandom}
      <!-- 전체 랜덤 화면 -->
      <div class="max-w-2xl mx-auto p-6 space-y-5">
        <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 class="text-sm font-bold text-amber-300 mb-1">🎲 전체 랜덤</h2>
          <p class="text-[11px] text-slate-500 mb-4">분야·항목 상관없이 모든 태그에서 무작위로 뽑아요.</p>

          <div class="flex items-center gap-2 mb-4">
            <button on:click={randomAll}
              class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition">🎲 뽑기</button>
            <span class="flex items-center gap-1 ms-1">
              <button on:click={() => (pickCount = Math.max(1, pickCount - 1))} class="w-7 h-7 rounded border border-slate-700 text-slate-400 hover:border-slate-500">−</button>
              <span class="text-sm text-slate-300 w-6 text-center">{pickCount}</span>
              <button on:click={() => (pickCount = Math.min(8, pickCount + 1))} class="w-7 h-7 rounded border border-slate-700 text-slate-400 hover:border-slate-500">＋</button>
              <span class="text-[11px] text-slate-500">개</span>
            </span>
          </div>

          <div class="rounded-xl border border-slate-700 bg-slate-950/60 min-h-[80px] p-4">
            {#if !rolled}
              <p class="text-sm text-slate-600 text-center">아직 뽑지 않았어요</p>
            {:else if results.length === 0}
              <p class="text-sm text-slate-600 text-center">뽑을 태그가 없어요</p>
            {:else}
              <div class="flex flex-wrap gap-x-4 gap-y-2 justify-center">
                {#each results as r}
                  <p class="text-lg font-bold text-amber-300">{r.tag}</p>
                {/each}
              </div>
              {#if results.some((r) => r.source)}
                <div class="mt-4 pt-3 border-t border-slate-800">
                  <p class="text-[10px] text-slate-600 mb-1">출처</p>
                  <p class="text-[11px] text-slate-500 leading-relaxed">
                    {results.map((r) => `${r.tag} (${r.source})`).join(' · ')}
                  </p>
                </div>
              {/if}
            {/if}
          </div>
          {#if rolled && results.length > 0}
            <button on:click={copyResult} class="mt-2 text-xs text-emerald-400 hover:underline">{copied ? '✓ 복사됨' : '📋 결과 복사'}</button>
          {/if}
        </section>
      </div>

    {:else if group}
      <div class="max-w-2xl mx-auto p-6 space-y-5">

        <!-- 뽑기 결과 박스 -->
        <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 class="text-sm font-bold text-indigo-300 mb-3">✨ 뽑기 결과</h2>

          <!-- 두 칸: 카테고리별 1개씩 / 전체에서 N개 -->
          <div class="grid grid-cols-2 gap-2 mb-3">
            <button on:click={pickFromGroup}
              class="px-3 py-2.5 rounded-xl border border-indigo-700 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-200 text-xs font-bold transition text-center">
              🎲 {group.name} 전체<br><span class="text-[10px] font-normal text-slate-400">카테고리별 1개씩</span>
            </button>
            <div class="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center gap-1.5">
              <button on:click={pickNFromGroup} disabled={!group.subs.some((s) => s.enabled !== false && s.tags.length > 0)}
                class="text-xs font-bold text-amber-300 hover:text-amber-200 disabled:opacity-30">
                🎲 {group.name}에서 N개
              </button>
              <span class="flex items-center gap-1.5">
                <button on:click={() => (pickCount = Math.max(1, pickCount - 1))} class="w-5 h-5 rounded border border-slate-700 text-slate-400 hover:border-slate-500 text-[11px]">−</button>
                <span class="text-[11px] text-slate-300 w-6 text-center">{pickCount}개</span>
                <button on:click={() => (pickCount = Math.min(8, pickCount + 1))} class="w-5 h-5 rounded border border-slate-700 text-slate-400 hover:border-slate-500 text-[11px]">＋</button>
              </span>
            </div>
          </div>

          <div class="rounded-xl border border-slate-700 bg-slate-950/60 min-h-[72px] p-4 flex items-center justify-center">
            {#if !rolled}
              <span class="text-sm text-slate-600">아직 뽑지 않았어요</span>
            {:else if results.length === 0}
              <span class="text-sm text-slate-600">뽑을 태그가 없어요</span>
            {:else}
              <div class="flex flex-wrap gap-2 justify-center">
                {#each results as r}
                  <p class="text-lg font-bold text-amber-300 px-2">{r.tag}</p>
                {/each}
              </div>
            {/if}
          </div>
          {#if rolled && results.length > 0}
            <button on:click={copyResult} class="mt-2 text-xs text-emerald-400 hover:underline">{copied ? '✓ 복사됨' : '📋 결과 복사'}</button>
          {/if}
        </section>

        <!-- 세부분류 가로 탭 + 선택된 항목의 태그 -->
        <div>
          <div class="flex flex-wrap items-center gap-1.5 mb-3">
            {#each group.subs as sub (sub.id)}
              <div class="inline-flex items-center rounded-lg border transition overflow-hidden
                          {activeSubId === sub.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700'}">
                <button on:click={() => tagStore.toggleSub(group.id, sub.id)}
                  class="ps-2 py-1.5 text-xs {sub.enabled !== false ? 'text-emerald-400' : 'text-slate-600'}"
                  title="분야 전체 뽑기에 포함">{sub.enabled !== false ? '☑' : '☐'}</button>
                <button on:click={() => (activeSubId = sub.id)}
                  class="pe-3 ps-1 py-1.5 text-xs {activeSubId === sub.id ? 'text-indigo-200' : 'text-slate-400 hover:text-slate-200'}">
                  {sub.name} <span class="text-slate-600">({sub.tags.length})</span>
                </button>
              </div>
            {/each}
            <button on:click={() => { const n = prompt('새 항목 이름 (예: 성격/태도)'); if (n && n.trim()) activeSubId = tagStore.addSub(group.id, n); }}
              class="px-3 py-1.5 rounded-lg text-xs border border-dashed border-slate-700 text-slate-500 hover:border-indigo-500 hover:text-indigo-300 transition">＋ 항목</button>
          </div>

          {#if activeSub}
            <section class="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-slate-100">{activeSub.name}</h3>
                <div class="flex items-center gap-3">
                  <button on:click={() => pickFromSub(activeSub)} disabled={activeSub.tags.length === 0}
                    class="text-[11px] text-indigo-400 hover:text-indigo-300 disabled:opacity-30">🎲 이 항목에서 1개</button>
                  <button on:click={() => { if (confirm(`「${activeSub.name}」 삭제할까요?`)) { tagStore.deleteSub(group.id, activeSub.id); activeSubId = null; } }}
                    class="text-[11px] text-slate-600 hover:text-rose-400">항목 삭제</button>
                </div>
              </div>

              <div class="flex flex-wrap gap-1.5 mb-3">
                {#each activeSub.tags as t (t)}
                  <span class="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200">
                    {t}
                    <button on:click={() => tagStore.removeTag(group.id, activeSub.id, t)} class="text-slate-600 hover:text-rose-400">×</button>
                  </span>
                {/each}
                {#if activeSub.tags.length === 0}<span class="text-[11px] text-slate-600">아직 태그가 없어요.</span>{/if}
              </div>

              <div class="flex gap-1.5">
                <input value={tagInput[activeSub.id] ?? ''}
                  on:input={(e) => { tagInput[activeSub.id] = e.currentTarget.value; tagInput = { ...tagInput }; }}
                  on:keydown={(e) => e.key === 'Enter' && addTags(activeSub)}
                  placeholder="태그 입력 (쉼표로 여러 개)"
                  class="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                <button on:click={() => addTags(activeSub)} class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm">추가</button>
              </div>
            </section>
          {:else}
            <p class="text-xs text-slate-600 text-center py-8 border border-dashed border-slate-800 rounded-2xl">위에서 항목을 골라주세요.</p>
          {/if}
        </div>
      </div>
    {:else}
      <div class="h-full flex items-center justify-center text-slate-500 text-sm">왼쪽에서 분야를 추가해 시작하세요.</div>
    {/if}
  </main>
</div>
