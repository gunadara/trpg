<!-- src/lib/components/templates/TemplateSectionCard.svelte -->
<script lang="ts">
  export let title: string;
  export let collapsed: boolean = false;
  export let onToggle: () => void;
</script>

<div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
  <div class="px-4 py-3 flex items-center justify-between gap-3">
    <button type="button" class="text-left flex-1" on:click={onToggle}>
      <div class="font-semibold text-slate-800 dark:text-slate-100">{title}</div>
    </button>

    <div class="flex items-center gap-2">
      <slot name="actions" />
      <button
        type="button"
        class="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700
               bg-white dark:bg-slate-900/40"
        on:click={onToggle}
      >
        {collapsed ? '펼치기' : '접기'}
      </button>
    </div>
  </div>

  {#if !collapsed}
    <div class="px-4 pb-4 flex flex-col gap-3">
      <slot />
    </div>
  {/if}
</div>
