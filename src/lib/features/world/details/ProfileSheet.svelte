<!-- src/lib/features/world/details/ProfileSheet.svelte -->
<!--
  스키마 하나로 카테고리별 프로필 시트를 그린다.
  칸을 늘리려면 컴포넌트가 아니라 src/lib/domain/sheetSchemas.ts 를 고칠 것.
  저장 위치: attributes.profile (전용 에디터 데이터와 분리)
-->
<script lang="ts">
  import ExtraFields from './characters/ExtraFields.svelte';
  import {
    type SheetSchema,
    type SheetField,
    getPath,
    setPath,
    ensureShape
  } from '$lib/domain/sheetSchemas';

  export let value: any = {};
  export let schema: SheetSchema;

  if (!value.profile) value.profile = {};

  // 값을 어디에 저장할지 — 흡수한 시트는 attributes.* 를 그대로 쓴다
  $: p = schema.dataRoot === 'root' ? value : value.profile;

  // 스키마가 바뀌어도(카테고리 이동) 빈 칸을 채워둔다
  $: {
    ensureShape(p, schema);
    if (!value.profile) value.profile = {};
    if (!value.profile.extra) value.profile.extra = {};
  }

  // 추가한 칸은 저장 루트와 상관없이 항상 profile.extra 아래
  $: extraStore = value.profile.extra;

  function touch() {
    value = value;
  }

  function onInput(key: string, v: string) {
    setPath(p, key, v);
    touch();
  }

  function listOf(key: string): string[] {
    const v = getPath(p, key);
    return Array.isArray(v) ? v : [];
  }
  function addItem(key: string) {
    setPath(p, key, [...listOf(key), '']);
    touch();
  }
  function setItem(key: string, i: number, v: string) {
    const next = [...listOf(key)];
    next[i] = v;
    setPath(p, key, next);
    touch();
  }
  function removeItem(key: string, i: number) {
    setPath(p, key, listOf(key).filter((_, idx) => idx !== i));
    touch();
  }

  function spanClass(f: SheetField, cols: number): string {
    const s = Math.min(f.span ?? 1, cols);
    if (s <= 1) return '';
    if (s === 2) return 'sm:col-span-2';
    if (s === 3) return 'sm:col-span-3';
    return 'sm:col-span-4';
  }

  function colsClass(cols: number): string {
    if (cols >= 4) return 'grid-cols-2 sm:grid-cols-4';
    if (cols === 3) return 'grid-cols-1 sm:grid-cols-3';
    if (cols === 2) return 'grid-cols-1 sm:grid-cols-2';
    return 'grid-cols-1';
  }
</script>

<section
  class="rounded-xl border border-slate-200 dark:border-slate-700
         bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-5 space-y-5 sm:space-y-6"
>
  <!-- 헤더 -->
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 gap-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1 min-w-0">
      <span class="shrink-0">{schema.icon}</span>
      <span class="truncate">{schema.title}</span>
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 hidden sm:block">
      {schema.subtitle}
    </p>
  </div>

  {#each schema.sections as sec (sec.id)}
    {@const cols = sec.cols ?? 1}
    <div>
      {#if sec.title}
        <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1">
          {sec.icon} {sec.title}
        </label>
      {/if}

      <div
        class={sec.title
          ? `p-2.5 sm:p-3 rounded-xl border space-y-3 ${
              sec.accent
                ? 'bg-indigo-50/60 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/60'
                : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'
            }`
          : 'space-y-3'}
      >
        <div class="grid {colsClass(cols)} gap-2 sm:gap-3">
          {#each sec.fields as f (f.key)}
            <div class="min-w-0 {spanClass(f, cols)}">
              <label
                class="block mb-1 ml-1 {sec.title
                  ? sec.accent
                    ? 'text-[10px] font-bold text-indigo-500 dark:text-indigo-400'
                    : 'text-[10px] text-slate-400'
                  : 'text-xs font-bold text-slate-500 dark:text-slate-400'}"
              >
                {f.label}
              </label>

              {#if f.type === 'text'}
                <input
                  type="text"
                  value={getPath(p, f.key) ?? ''}
                  placeholder={f.placeholder ?? ''}
                  on:input={(e) => onInput(f.key, e.currentTarget.value)}
                  class="ps-input"
                />
              {:else if f.type === 'number'}
                <input
                  type="number"
                  value={getPath(p, f.key) ?? ''}
                  placeholder={f.placeholder ?? ''}
                  on:input={(e) => onInput(f.key, e.currentTarget.value)}
                  class="ps-input"
                />
              {:else if f.type === 'select'}
                <select
                  value={getPath(p, f.key) ?? ''}
                  on:change={(e) => onInput(f.key, e.currentTarget.value)}
                  class="ps-input appearance-none"
                >
                  {#each f.options ?? [] as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              {:else if f.type === 'long'}
                <textarea
                  rows="2"
                  value={getPath(p, f.key) ?? ''}
                  placeholder={f.placeholder ?? ''}
                  on:input={(e) => onInput(f.key, e.currentTarget.value)}
                  class="ps-input resize-y"
                ></textarea>
              {:else}
                <div class="space-y-1.5">
                  {#each listOf(f.key) as item, i}
                    <div class="flex items-center gap-1">
                      <input
                        type="text"
                        value={item}
                        on:input={(e) => setItem(f.key, i, e.currentTarget.value)}
                        class="ps-input py-1.5"
                      />
                      <button
                        type="button"
                        on:click={() => removeItem(f.key, i)}
                        class="text-slate-300 hover:text-rose-500 px-1 text-xs shrink-0"
                        aria-label="항목 삭제">✕</button>
                    </div>
                  {/each}
                  <button
                    type="button"
                    on:click={() => addItem(f.key)}
                    class="w-full text-[10px] text-slate-400 hover:text-indigo-500
                           border border-dashed border-slate-200 dark:border-slate-700
                           hover:border-indigo-400 rounded-lg py-1.5 transition"
                  >
                    ＋ 항목
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <ExtraFields extra={extraStore} sec={sec.id} onChange={touch} />
      </div>
    </div>
  {/each}
</section>

<style>
  @reference "tailwindcss";
  .ps-input {
    @apply w-full min-w-0 rounded-xl border border-slate-200 dark:border-slate-700
           bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none
           focus:border-indigo-500 transition;
  }
</style>
