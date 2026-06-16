<script lang="ts">
  import { onMount } from 'svelte';
  import { currentSession } from '$lib/stores/sessionStore';
  import { oracleTables } from '$lib/stores/oracleTables';
  import { listDocs } from '$lib/stores/docStore';
  import PlayJournal from '$lib/features/play/PlayJournal.svelte';
  import { browser } from '$app/environment';

  onMount(() => {
    currentSession.load();
    oracleTables.load();
  });

  // 세션 시작 다이얼로그
  let showStart = false;
  let title = '';
  let storylineId = '';
  $: storylines = browser ? listDocs('storylines') : [];

  function startSession() {
    const t = title.trim() || '이름 없는 세션';
    currentSession.start('default', t, storylineId || undefined);
    title = '';
    storylineId = '';
    showStart = false;
  }

  function endSession() {
    if (!confirm('세션을 종료할까요? 저널 기록은 사라집니다. (필요하면 먼저 백업하세요)')) return;
    currentSession.end();
  }
</script>

<div class="h-screen flex flex-col bg-slate-950">
  <!-- 헤더 -->
  <header class="shrink-0 p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      <a href="/" class="text-slate-400 hover:text-white transition text-sm shrink-0">← 홈</a>
      <h1 class="text-lg font-bold text-white shrink-0">📖 플레이 저널</h1>
      {#if $currentSession}
        <span class="text-xs text-slate-500 truncate">— {$currentSession.title}</span>
      {/if}
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <a href="/play" class="text-xs text-slate-400 hover:text-indigo-300 transition">⚔️ 전투</a>
      <a href="/gamebook" class="text-xs text-slate-400 hover:text-indigo-300 transition">📓 게임북</a>
      {#if $currentSession}
        <button on:click={endSession} class="text-xs text-rose-400 hover:underline">세션 종료</button>
      {:else}
        <button on:click={() => (showStart = true)} class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">+ 세션 시작</button>
      {/if}
    </div>
  </header>

  <!-- 저널 본체 -->
  <main class="flex-1 overflow-hidden">
    <div class="max-w-2xl mx-auto h-full px-4 py-3">
      <PlayJournal />
    </div>
  </main>

  <!-- 세션 시작 다이얼로그 -->
  {#if showStart}
    <div class="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-30"
         on:click={() => (showStart = false)}
         on:keydown={(e) => e.key === 'Escape' && (showStart = false)}
         role="button" tabindex="-1">
      <div class="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4"
           on:click|stopPropagation role="dialog">
        <h2 class="text-base font-bold text-slate-100">📖 새 세션 시작</h2>

        <input
          type="text"
          bind:value={title}
          placeholder="세션 제목 (예: 폐서점 잠입)"
          class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
          on:keydown={(e) => e.key === 'Enter' && startSession()}
        />

        {#if storylines.length > 0}
          <div>
            <label class="block text-xs text-slate-500 mb-1">연결할 스토리라인 (선택)</label>
            <select bind:value={storylineId} class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500">
              <option value="">없음</option>
              {#each storylines as s}
                <option value={s.id}>{s.title || '제목 없음'}</option>
              {/each}
            </select>
          </div>
        {/if}

        <div class="flex justify-end gap-2">
          <button on:click={() => (showStart = false)} class="px-3 py-2 text-xs text-slate-400 hover:text-slate-200">취소</button>
          <button on:click={startSession} class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">시작</button>
        </div>
      </div>
    </div>
  {/if}
</div>
