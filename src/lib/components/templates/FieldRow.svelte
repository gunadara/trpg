<!-- src/lib/components/templates/FieldRow.svelte -->
<script lang="ts">
  export let label: string;
  export let required: boolean = false;
  export let hint: string | undefined = undefined;
</script>

<div class="flex flex-col gap-1">
  <div class="flex items-center gap-2">
    <div class="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
      {label}{#if required}<span class="text-red-500">*</span>{/if}
    </div>
    {#if hint}
      <div class="text-[11px] text-slate-400 dark:text-slate-500">{hint}</div>
    {/if}
  </div>
  <slot />
</div>
