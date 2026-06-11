<!-- src/lib/components/templates/FieldInput.svelte -->
<script lang="ts">
  import type { FieldDef } from '$lib/domain/templates';

  export let field: FieldDef;
  export let value: any = null;
  export let disabled: boolean = false;

  function set(v: any) {
    value = v;
    dispatch('change', { key: field.key, value: v });
  }

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  // tags는 MVP로 "쉼표 입력" 방식
  $: tagsText =
    field.type === 'tags'
      ? (Array.isArray(value) ? value.join(', ') : (value ?? ''))
      : '';

  function commitTags(v: string) {
    const arr = v
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    set(arr);
  }
</script>

{#if field.type === 'shortText'}
  <input
    class="input-box"
    value={value ?? ''}
    disabled={disabled}
    placeholder={field.label}
    on:input={(e) => set((e.target as HTMLInputElement).value)}
  />

{:else if field.type === 'longText'}
  <textarea
    class="input-box min-h-[90px]"
    value={value ?? ''}
    disabled={disabled}
    placeholder={field.label}
    on:input={(e) => set((e.target as HTMLTextAreaElement).value)}
  />

{:else if field.type === 'number'}
  <input
    class="input-box"
    type="number"
    value={value ?? ''}
    disabled={disabled}
    on:input={(e) => {
      const raw = (e.target as HTMLInputElement).value;
      set(raw === '' ? null : Number(raw));
    }}
  />

{:else if field.type === 'boolean'}
  <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
    <input
      type="checkbox"
      checked={Boolean(value)}
      disabled={disabled}
      on:change={(e) => set((e.target as HTMLInputElement).checked)}
    />
    <span>{field.label}</span>
  </label>

{:else if field.type === 'select'}
  <select
    class="input-box"
    value={value ?? ''}
    disabled={disabled}
    on:change={(e) => set((e.target as HTMLSelectElement).value || null)}
  >
    <option value="">선택</option>
    {#each field.options ?? [] as opt}
      <option value={opt}>{opt}</option>
    {/each}
  </select>

{:else if field.type === 'tags'}
  <input
    class="input-box"
    value={tagsText}
    disabled={disabled}
    placeholder="태그(쉼표로 구분)"
    on:change={(e) => commitTags((e.target as HTMLInputElement).value)}
  />
{/if}

<style>
    @reference "tailwindcss";
  .input-box { @apply w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition; }
</style>
