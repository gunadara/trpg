<script lang="ts">
  import { onMount } from 'svelte';
  import { docStore, listDocs, createBlankDoc, saveDoc, getDocById } from '$lib/stores/docStore';
  import { upsertPsych, type PsychItem } from '$lib/domain/psych';

  export let items: PsychItem[] = [];
  export let setKey = '';          // 세트 이름 (예: "BIG5")
  export let source = '';
  export let min = 0;
  export let max = 100;
  export let step = 1;
  export let note = '';

  let chars: ReturnType<typeof listDocs> = [];
  let docId = '';
  let saved = '';

  function refresh() { chars = listDocs('characters'); }
  onMount(refresh);
  $: { void $docStore; if (typeof window !== 'undefined') refresh(); }

  function save() {
    if (items.length === 0) return;
    let target = docId ? getDocById(docId) : null;
    if (!target) {
      const blank = createBlankDoc('characters');
      blank.title = `제목 없는 인물`;
      target = saveDoc(blank);
      docId = target.id;
    }
    upsertPsych(target, { key: setKey || '수치', source, min, max, step, items, note });
    saved = target.title;
    setTimeout(() => (saved = ''), 2200);
  }
</script>

<div class="flex flex-wrap items-center gap-1.5">
  <select bind:value={docId}
    class="rounded-lg border border-line bg-canvas px-2 py-1.5 text-xs text-ink outline-none focus:border-primary max-w-[45%]">
    <option value="">＋ 새 인물 문서</option>
    {#each chars as c (c.id)}
      <option value={c.id}>{c.title}</option>
    {/each}
  </select>
  <button on:click={save} disabled={items.length === 0}
    class="px-3 py-1.5 rounded-lg bg-bubble hover:bg-bubble text-xs disabled:opacity-30 whitespace-nowrap">
    인물 문서에 저장
  </button>
  {#if saved}
    <span class="text-[11px] text-emerald-400">✓ 「{saved}」에 저장됨</span>
  {/if}
</div>
