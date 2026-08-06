<!-- src/lib/components/edit/SaveIndicator.svelte -->
<script lang="ts">
  import { saveStatus, saveStatusLabel } from '$lib/stores/saveStatus';

  $: state = $saveStatus.state;
  $: dotClass =
    state === 'error'
      ? 'bg-red-500'
      : state === 'dirty'
        ? 'bg-amber-400 animate-pulse'
        : 'bg-emerald-500';
</script>

{#if $saveStatusLabel}
  <span
    class="inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap
           {state === 'error'
             ? 'text-red-500'
             : 'text-slate-400 dark:text-slate-500'}"
  >
    <span class="h-1.5 w-1.5 rounded-full shrink-0 {dotClass}"></span>
    {$saveStatusLabel}
  </span>
{/if}
