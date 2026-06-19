<script lang="ts">
  import { onMount } from 'svelte';
  import AppShell from '$lib/components/layout/AppShell.svelte';
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

<!-- 레이아웃은 AppShell(테마인식), 기능은 <PlayJournal /> -->
<AppShell title="📖 플레이 저널" subtitle={$currentSession ? $currentSession.title : undefined} tone="auto">
  <svelte:fragment slot="actions">
    <a href="/play" class="text-xs text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-300 transition">⚔️ 전투</a>
    <a href="/gamebook" class="text-xs text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-300 transition">📓 게임북</a>
    {#if $currentSession}
      <button on:click={endSession} class="text-xs text-rose-500 dark:text-rose-400 hover:underline whitespace-nowrap">세션 종료</button>
    {:else}
      <button on:click={() => (showStart = true)} class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition whitespace-nowrap">+ 세션 시작</button>
    {/if}
  </svelte:fragment>

  <div class="h-full px-3 py-2 md:px-4">
    <PlayJournal />
  </div>
</AppShell>

<!-- 세션 시작 다이얼로그 -->
{#if showStart}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
       on:click={() => (showStart = false)}
       on:keydown={(e) => e.key === 'Escape' && (showStart = false)}
       role="button" tabindex="-1">
    <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-5 space-y-4"
         on:click|stopPropagation role="dialog">
      <h2 class="text-base font-bold text-slate-800 dark:text-slate-100">📖 새 세션 시작</h2>

      <input
        type="text"
        bind:value={title}
        placeholder="세션 제목 (예: 폐서점 잠입)"
        class="w-full rounded-lg border border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        on:keydown={(e) => e.key === 'Enter' && startSession()}
      />

      {#if storylines.length > 0}
        <div>
          <label class="block text-xs text-slate-500 mb-1">연결할 스토리라인 (선택)</label>
          <select bind:value={storylineId} class="w-full rounded-lg border border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500">
            <option value="">없음</option>
            {#each storylines as s}
              <option value={s.id}>{s.title || '제목 없음'}</option>
            {/each}
          </select>
        </div>
      {/if}

      <div class="flex justify-end gap-2">
        <button on:click={() => (showStart = false)} class="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">취소</button>
        <button on:click={startSession} class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">시작</button>
      </div>
    </div>
  </div>
{/if}
