<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { gamebooks, type Gamebook, type Scene, type Choice } from '$lib/stores/gamebookStore';
  import { parseMentions } from '$lib/services/mentionUtil';
  import { getDocById } from '$lib/stores/docStore';

  onMount(() => gamebooks.load());

  $: books = $gamebooks;
  $: bookId = $page.url.searchParams.get('book');
  $: book = books.find((b) => b.id === bookId) ?? (books.length ? books[0] : null);

  // 진행 기록: 지나온 장면 + 고른 선택지
  type Step = { scene: Scene; chosen?: string };
  let history: Step[] = [];
  let current: Scene | null = null;
  let started = false;

  function start() {
    if (!book) return;
    const startScene = book.scenes.find((s) => s.id === book.startSceneId) ?? book.scenes[0] ?? null;
    history = [];
    current = startScene;
    started = true;
  }

  function choose(c: Choice) {
    if (!book || !current) return;
    // 방금 장면을 히스토리에 박제 (고른 선택지 표시)
    history = [...history, { scene: current, chosen: c.text }];
    const next = c.target ? book.scenes.find((s) => s.id === c.target) ?? null : null;
    current = next;
  }

  function restart() { started = false; current = null; history = []; }

  // GM 모드 (켜면 현재 장면의 GM 메모가 보임)
  let gmMode = false;

  // 멘션 클릭 → 문서 설정 팝업
  let popupDocId: string | null = null;
  $: popupDoc = popupDocId ? getDocById(popupDocId) : null;

  // 책이 바뀌면 초기화
  $: if (book) { /* noop, 그냥 반응 */ }
</script>

<div class="h-screen flex flex-col bg-slate-950 text-slate-100">
  <header class="shrink-0 p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      <a href="/gamebook" class="text-slate-400 hover:text-white transition text-sm shrink-0">← 편집</a>
      <h1 class="text-lg font-bold text-white truncate">▶ {book?.title ?? '게임북'}</h1>
    </div>
    {#if started}
      <div class="flex items-center gap-3">
        <button
          on:click={() => (gmMode = !gmMode)}
          class="text-xs transition {gmMode ? 'text-rose-400' : 'text-slate-500 hover:text-slate-300'}"
          title="GM 메모 보기 — 혼자/GM일 때만"
        >{gmMode ? '🔓 GM 모드' : '🔒 GM 모드'}</button>
        <button on:click={restart} class="text-xs text-slate-400 hover:text-white">⟲ 처음부터</button>
      </div>
    {/if}
  </header>

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-2xl mx-auto px-5 py-6">

      {#if !book || book.scenes.length === 0}
        <div class="text-center text-slate-500 text-sm py-20">
          플레이할 장면이 없어요. <a href="/gamebook" class="text-indigo-400 hover:underline">게임북 편집</a>에서 먼저 만들어 주세요.
        </div>

      {:else if !started}
        <!-- 시작 화면 -->
        <div class="text-center py-16 space-y-5">
          <div class="text-5xl">📖</div>
          <h2 class="text-2xl font-bold">{book.title}</h2>
          <p class="text-sm text-slate-500">장면 {book.scenes.length}개</p>
          <button on:click={start} class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition">시작하기</button>
        </div>

      {:else}
        <!-- 지나온 경로 (흐릿하게 누적) -->
        {#each history as step (step.scene.id + (step.chosen ?? ''))}
          <div class="mb-5 opacity-60">
            <p class="text-[15px] leading-relaxed text-slate-400 whitespace-pre-wrap">
              {#each parseMentions(step.scene.body) as seg}
                {#if seg.type === 'text'}{seg.value}{:else}<span class="text-indigo-400/70">{seg.label}</span>{/if}
              {/each}
            </p>
            {#if step.chosen}
              <p class="mt-2 text-sm text-indigo-400/80">▸ {step.chosen}</p>
            {/if}
            <div class="border-b border-slate-800/60 mt-4"></div>
          </div>
        {/each}

        <!-- 현재 장면 -->
        {#if current}
          <div class="mb-6">
            <p class="text-[17px] leading-relaxed text-slate-100 whitespace-pre-wrap">
              {#each parseMentions(current.body || '(본문이 비어 있습니다)') as seg}
                {#if seg.type === 'text'}{seg.value}{:else}<button
                  on:click={() => (popupDocId = seg.docId)}
                  class="text-indigo-300 underline decoration-dotted underline-offset-2 hover:text-indigo-200"
                >{seg.label}</button>{/if}
              {/each}
            </p>
          </div>

          {#if gmMode && current.gmNotes}
            <div class="mb-5 rounded-xl border border-rose-900/60 bg-rose-950/20 p-3">
              <p class="text-[10px] font-bold text-rose-400/80 mb-1">🔒 GM 메모</p>
              <p class="text-sm text-rose-200/80 whitespace-pre-wrap leading-relaxed">{current.gmNotes}</p>
            </div>
          {/if}

          {#if current.choices.length > 0}
            <div class="space-y-2.5">
              {#each current.choices as c (c.id)}
                <button
                  on:click={() => choose(c)}
                  disabled={!c.target}
                  class="w-full text-left px-4 py-3 rounded-xl border transition
                         {c.target
                           ? 'border-slate-700 bg-slate-900/60 hover:border-indigo-500 hover:bg-indigo-500/5 text-slate-100'
                           : 'border-slate-800 bg-slate-900/30 text-slate-600 cursor-not-allowed'}"
                >
                  <span class="text-indigo-400 mr-1.5">▸</span>{c.text || '(빈 선택지)'}
                  {#if !c.target}<span class="text-[10px] text-slate-600 ms-2">· 연결 안 됨</span>{/if}
                </button>
              {/each}
            </div>
          {:else}
            <!-- 엔딩 -->
            <div class="text-center py-8 space-y-3 border-t border-slate-800 mt-4">
              <p class="text-sm text-slate-500">— 이야기의 끝 —</p>
              <button on:click={restart} class="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-indigo-500 transition">처음부터 다시</button>
            </div>
          {/if}
        {:else}
          <!-- 선택지가 미연결 장면으로 갔을 때 -->
          <div class="text-center py-8 space-y-3">
            <p class="text-sm text-slate-500">이 길은 아직 이어지지 않았어요. (선택지에 연결된 장면이 없음)</p>
            <button on:click={restart} class="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-indigo-500 transition">처음부터</button>
          </div>
        {/if}
      {/if}
    </div>
  </main>

  <!-- 멘션 설정 팝업 -->
  {#if popupDoc}
    <div class="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-40"
         on:click={() => (popupDocId = null)}
         on:keydown={(e) => e.key === 'Escape' && (popupDocId = null)}
         role="button" tabindex="-1">
      <div class="w-full max-w-md max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-3"
           on:click|stopPropagation role="dialog">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-white">{popupDoc.title || '제목 없음'}</h2>
          <button on:click={() => (popupDocId = null)} class="text-slate-500 hover:text-slate-300 text-sm">✕</button>
        </div>
        <p class="text-[10px] text-slate-500 uppercase tracking-wider">{popupDoc.category}</p>
        {#if popupDoc.summary}
          <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{popupDoc.summary}</p>
        {/if}
        {#if popupDoc.content}
          <p class="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap border-t border-slate-800 pt-3">{popupDoc.content}</p>
        {/if}
        {#if !popupDoc.summary && !popupDoc.content}
          <p class="text-xs text-slate-600">등록된 설명이 없어요.</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
