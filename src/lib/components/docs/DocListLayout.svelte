<script lang="ts">
  export let icon: string | undefined;
  export let title: string;
  export let subtitle: string | undefined;

  export let primaryText: string;
  export let primaryDisabled: boolean = false;
  export let onPrimary: () => void;

  export let filterValue: string; // bind 대상
  export let countText: string;

  export let searchPlaceholder = '제목·요약 검색';
</script>

<section class="h-full flex flex-col">
  <header class="mb-4 flex items-center justify-between gap-3">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold mb-1 truncate">{#if icon}{icon} {/if}{title}</h1>
      {#if subtitle}<p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{subtitle}</p>{/if}
    </div>

    <button
      type="button"
      class="shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium
             bg-indigo-500 text-white hover:bg-indigo-600 active:bg-indigo-700
             shadow-sm transition disabled:opacity-60"
      on:click={onPrimary}
      disabled={primaryDisabled}
    >
      <span class="text-base">＋</span>
      <span>{primaryText}</span>
    </button>
  </header>

  <section
    class="flex-1 rounded-2xl border border-slate-200 bg-white
           dark:border-slate-800 dark:bg-slate-900/60
           overflow-hidden flex flex-col"
  >
    <div class="px-3 py-2 border-b border-slate-200 dark:border-slate-800
                space-y-1 text-xs text-slate-500 dark:text-slate-400">
      <div class="flex items-center justify-between">
        <slot name="listTitle" />
        <span>{countText}</span>
      </div>

      <div class="flex items-center gap-1">
        <input
          class="flex-1 rounded-lg border border-slate-200 dark:border-slate-700
                 bg-white/70 dark:bg-slate-900/40
                 px-2 py-1 text-[11px] outline-none
                 focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500
                 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition"
          placeholder={searchPlaceholder}
          bind:value={filterValue}
        />

        {#if filterValue}
          <button
            type="button"
            class="px-2 py-1 text-[10px] rounded-md text-slate-400 hover:text-slate-600
                   dark:text-slate-500 dark:hover:text-slate-300"
            on:click={() => (filterValue = '')}
          >
            지우기
          </button>
        {/if}
      </div>
    </div>

    <div class="flex-1 min-h-0">
      <slot />
    </div>
  </section>
</section>
