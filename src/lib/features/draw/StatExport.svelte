<script lang="ts">
  import { toTable, toBars, toDescription } from '$lib/domain/statExport';
  import type { PsychItem } from '$lib/domain/psych';

  export let items: PsychItem[] = [];
  export let min = 0;
  export let max = 100;
  export let title = '';

  let done = '';
  async function copy(kind: 'table' | 'bars' | 'desc') {
    const text =
      kind === 'table' ? toTable(items, title)
      : kind === 'bars' ? toBars(items, min, max, title)
      : toDescription(items, min, max, title);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      done = kind;
      setTimeout(() => (done = ''), 1600);
    } catch {}
  }
</script>

{#if items.length > 0}
  <div class="rounded-xl border border-line bg-canvas/40 px-3 py-2.5">
    <p class="text-[11px] text-muted mb-2">내보내기 <span class="text-subtle">— 복사해서 뮤블 위키 등에 붙여넣으세요</span></p>
    <div class="flex flex-wrap gap-1.5">
      <button on:click={() => copy('table')}
        class="px-2.5 py-1 rounded-lg border border-line text-[11px] text-muted hover:border-primary hover:text-primary">
        {done === 'table' ? '✓ 복사됨' : '📋 표'}
      </button>
      <button on:click={() => copy('bars')}
        class="px-2.5 py-1 rounded-lg border border-line text-[11px] text-muted hover:border-primary hover:text-primary">
        {done === 'bars' ? '✓ 복사됨' : '📊 막대'}
      </button>
      <button on:click={() => copy('desc')}
        class="px-2.5 py-1 rounded-lg border border-line text-[11px] text-muted hover:border-primary hover:text-primary">
        {done === 'desc' ? '✓ 복사됨' : '📝 성격 설명'}
      </button>
    </div>
  </div>
{/if}
