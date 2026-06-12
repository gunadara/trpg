<script lang="ts">
  import { onMount } from 'svelte';
  import Oracle from '$lib/features/play/Oracle.svelte';
  import { currentSession } from '$lib/stores/sessionStore';
  import { oracleTables } from '$lib/stores/oracleTables';

  // 진행 중이던 세션이 있으면 불러오기 (오라클 결과를 로그에 잇기 위해)
  onMount(() => {
    currentSession.load();
    oracleTables.load();
  });
</script>

<div class="min-h-screen flex flex-col bg-slate-950">
  <header class="sticky top-0 z-10 p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <button on:click={() => history.back()} class="text-slate-400 hover:text-white transition text-sm flex items-center gap-1">
        ← 뒤로
      </button>
      <h1 class="text-lg font-bold text-white flex items-center gap-2">
        🔮 오라클 <span class="text-xs font-normal text-slate-500">(GM 없는 판정)</span>
      </h1>
    </div>
    <a href="/play" class="text-xs text-indigo-400 hover:underline">🎲 세션으로</a>
  </header>

  <main class="flex-1 p-6">
    <Oracle />
  </main>
</div>
