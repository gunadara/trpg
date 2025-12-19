<script lang="ts">
  import { onMount } from 'svelte';

  import { getSQLiteMode } from '$lib/services/sqlite';
  import {
    hydrateCurrentWorldFromSQLite,
    syncCurrentWorldToSQLite,
    listAllDocs
  } from '$lib/stores/docStore';

  import { get } from 'svelte/store';
  import { currentWorldId } from '$lib/stores/worldStore';

  const STORAGE_KEY = 'genesis.world_docs.v1';

  let mode: 'sqlite' | 'stub' = 'stub';
  let worldId = 'default';

  let localHas = false;
  let localBytes = 0;

  let docCount = 0;
  let lastLog = '';

  function refreshSnapshot() {
    mode = getSQLiteMode();
    worldId = get(currentWorldId) || 'default';

    const raw = localStorage.getItem(STORAGE_KEY);
    localHas = !!raw;
    localBytes = raw ? raw.length : 0;

    docCount = listAllDocs().length;
  }

  async function doHydrate() {
    lastLog = 'hydrate...';
    try {
      await hydrateCurrentWorldFromSQLite();
      lastLog = '✅ hydrate OK';
    } catch (e) {
      console.error(e);
      lastLog = '❌ hydrate FAIL (console 확인)';
    } finally {
      refreshSnapshot();
    }
  }

  async function doSync() {
    lastLog = 'sync...';
    try {
      await syncCurrentWorldToSQLite();
      lastLog = '✅ sync OK';
    } catch (e) {
      console.error(e);
      lastLog = '❌ sync FAIL (console 확인)';
    } finally {
      refreshSnapshot();
    }
  }

  function clearLocalOnly() {
    localStorage.removeItem(STORAGE_KEY);
    lastLog = `🧹 localStorage cleared: ${STORAGE_KEY}`;
    refreshSnapshot();
  }

  function reloadApp() {
    location.reload();
  }

  onMount(() => {
    refreshSnapshot();
  });
</script>

<section class="min-h-full p-4 space-y-3">
  <h1 class="text-xl font-semibold">GENESIS Debug</h1>

  <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2">
    <div class="text-sm">
      <div><b>SQLite mode</b>: {mode}</div>
      <div><b>currentWorldId</b>: {worldId}</div>
      <div><b>docs in memory</b>: {docCount}</div>
      <div><b>localStorage</b>: {localHas ? '있음' : '없음'} ({localBytes} bytes)</div>
    </div>

    <div class="flex flex-wrap gap-2 pt-2">
      <button
        class="px-3 py-2 text-sm rounded-xl bg-indigo-500 text-white hover:bg-indigo-600"
        on:click={doHydrate}
      >
        Hydrate (SQLite → 메모리/로컬)
      </button>

      <button
        class="px-3 py-2 text-sm rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-700"
        on:click={doSync}
      >
        Sync (메모리 → SQLite)
      </button>

      <button
        class="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700"
        on:click={clearLocalOnly}
      >
        Clear localStorage only
      </button>

      <button
        class="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700"
        on:click={reloadApp}
      >
        Reload
      </button>
    </div>

    {#if lastLog}
      <p class="text-[12px] text-slate-500 dark:text-slate-400 pt-2">{lastLog}</p>
    {/if}

    <p class="text-[11px] text-slate-400 dark:text-slate-500 pt-2 leading-relaxed">
      ✅ SQLite 검증 절차: <br />
      1) Sync 눌러서 SQLite 저장 <br />
      2) Clear localStorage only <br />
      3) Reload <br />
      4) Hydrate 눌러서 문서가 복구되면 SQLite 정상
    </p>
  </div>
</section>
