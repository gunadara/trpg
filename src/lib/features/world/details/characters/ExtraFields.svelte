<!-- src/lib/features/world/details/characters/ExtraFields.svelte -->
<!--
  완성된 시트에 "칸만" 덧붙이는 조각.
  시트 섹션마다 하나씩 두면, 그 섹션 아래에 사용자가 만든 칸이 이어 붙는다.
  저장 위치: attributes.profile.extra[sec]
-->
<script lang="ts">
  import {
    type ExtraField,
    type ExtraFieldType,
    EXTRA_TYPE_LABEL,
    EXTRA_TYPE_HINT,
    EXTRA_TYPE_EXAMPLE,
    EXTRA_TYPE_PREVIEW,
    EXTRA_TYPES,
    makeExtraField,
    normalizeExtraFields
  } from '$lib/domain/extraFields';

  /** profile.extra 객체 */
  export let extra: Record<string, ExtraField[]>;
  /** 이 시트 섹션의 id */
  export let sec: string;
  /** 값이 바뀌었음을 부모에 알림 */
  export let onChange: () => void = () => {};

  // 예전 데이터가 있으면 정규화해서 되받아 둔다
  if (extra[sec]) extra[sec] = normalizeExtraFields(extra[sec]);

  let adding = false;

  $: fields = extra[sec] ?? [];

  function addField(type: ExtraFieldType) {
    extra[sec] = [...fields, makeExtraField(type)];
    adding = false;
    extra = extra;
    onChange();
  }

  function removeField(id: string) {
    if (!confirm('이 칸을 삭제할까요? 적어둔 내용도 같이 지워집니다.')) return;
    extra[sec] = fields.filter((f) => f.id !== id);
    extra = extra;
    onChange();
  }

  function addItem(f: ExtraField) {
    f.items = [...f.items, ''];
    extra = extra;
    onChange();
  }

  function removeItem(f: ExtraField, i: number) {
    f.items = f.items.filter((_, idx) => idx !== i);
    extra = extra;
    onChange();
  }
</script>

{#if fields.length > 0}
  <div class="space-y-3">
    {#each fields as f (f.id)}
      <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-2 sm:p-2.5">
        <div class="flex items-center gap-1 mb-1.5">
          <input
            type="text"
            bind:value={f.label}
            on:input={onChange}
            placeholder="칸 이름"
            class="flex-1 bg-transparent text-[10px] font-bold text-slate-500 dark:text-slate-400
                   outline-none border-b border-transparent focus:border-indigo-400 px-1 py-0.5"
          />
          <span class="text-[9px] text-slate-300 dark:text-slate-600 shrink-0">{EXTRA_TYPE_LABEL[f.type]}</span>
          <button
            type="button"
            on:click={() => removeField(f.id)}
            class="text-slate-300 hover:text-rose-500 text-xs px-1 shrink-0"
            title="칸 삭제">✕</button>
        </div>

        {#if f.type === 'text'}
          <input type="text" bind:value={f.value} on:input={onChange} class="xf-input min-w-0" />
        {:else if f.type === 'long'}
          <textarea rows="2" bind:value={f.value} on:input={onChange} class="xf-input resize-y"></textarea>
        {:else}
          <div class="space-y-1.5">
            {#each f.items as _, i}
              <div class="flex items-center gap-1">
                <input type="text" bind:value={f.items[i]} on:input={onChange} class="xf-input py-1.5" />
                <button type="button" on:click={() => removeItem(f, i)}
                  class="text-slate-300 hover:text-rose-500 px-1 text-xs shrink-0">✕</button>
              </div>
            {/each}
            <button type="button" on:click={() => addItem(f)}
              class="text-[10px] text-slate-400 hover:text-indigo-500 px-1">＋ 항목</button>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

{#if adding}
  <div class="p-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10 space-y-1.5">
    <p class="text-[10px] text-slate-500 dark:text-slate-400 px-1 pb-0.5">
      어떤 칸을 만들까요? 적는 방식만 다르고, 나중에 바꾸려면 지우고 다시 만들면 돼요.
    </p>

    {#each EXTRA_TYPES as t}
      <button type="button" on:click={() => addField(t)}
        class="w-full text-left p-2 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800
               border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition">
        <div class="flex items-baseline gap-1.5 flex-wrap">
          <span class="text-xs font-bold text-slate-700 dark:text-slate-200">{EXTRA_TYPE_LABEL[t]}</span>
          <span class="text-[10px] text-slate-400 dark:text-slate-500">{EXTRA_TYPE_HINT[t]}</span>
        </div>

        <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
          예) {EXTRA_TYPE_EXAMPLE[t]}
        </div>

        <!-- 모양 미리보기 -->
        <div class="mt-1.5 pointer-events-none">
          {#if t === 'text'}
            <div class="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[10px] text-slate-500 dark:text-slate-400">
              {EXTRA_TYPE_PREVIEW[t][0]}
            </div>
          {:else if t === 'long'}
            <div class="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {#each EXTRA_TYPE_PREVIEW[t] as line}
                <div>{line}</div>
              {/each}
            </div>
          {:else}
            <div class="space-y-0.5">
              {#each EXTRA_TYPE_PREVIEW[t] as line}
                <div class="flex items-center gap-1">
                  <div class="flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {line}
                  </div>
                  <span class="text-[9px] text-slate-300 dark:text-slate-600">✕</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </button>
    {/each}

    <button type="button" on:click={() => (adding = false)}
      class="w-full text-[10px] text-slate-400 hover:text-slate-600 py-1">취소</button>
  </div>
{:else}
  <button type="button" on:click={() => (adding = true)}
    class="w-full text-[10px] text-slate-400 dark:text-slate-500 hover:text-indigo-500
           border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400
           rounded-lg py-1.5 transition">
    ＋ 칸 추가
  </button>
{/if}

<style>
  @reference "tailwindcss";
  .xf-input {
    @apply w-full rounded-lg border border-slate-200 dark:border-slate-700
           bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none
           focus:border-indigo-500 transition;
  }
</style>
