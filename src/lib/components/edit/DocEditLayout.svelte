<script lang="ts">
  export let icon: string | undefined;
  export let title: string;
  export let subtitle: string | undefined;

  export let onBack: () => void;

  export let primaryText: string;
  export let primaryDisabled: boolean = false;
  export let onPrimary: () => void;

  export let saveMessage: string | undefined;
</script>

<section class="h-full flex flex-col">
  <header class="mb-3 flex items-center justify-between gap-3">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700
               bg-white dark:bg-slate-900/40 text-sm"
        on:click={onBack}
      >
        ← 목록
      </button>

      <div>
        <h1 class="text-lg font-semibold">
          {#if icon}{icon} {/if}{title}
        </h1>
        {#if subtitle}
          <p class="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        {/if}
      </div>
    </div>

    <button
      type="button"
      class="px-4 py-2 text-sm rounded-xl bg-indigo-500 text-white
             hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-60 transition"
      on:click={onPrimary}
      disabled={primaryDisabled}
    >
      {primaryText}
    </button>
  </header>

  {#if saveMessage}
    <p class="mb-2 text-[11px] text-slate-400 dark:text-slate-500">{saveMessage}</p>
  {/if}

  <section
    class="flex-1 rounded-2xl border border-slate-200 bg-white
           dark:border-slate-800 dark:bg-slate-900/60
           px-5 py-4 flex flex-col gap-4 overflow-y-auto"
  >
    <slot />
  </section>
</section>
