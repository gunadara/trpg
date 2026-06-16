<script lang="ts">
  import { searchDocsByTitle } from '$lib/stores/docStore';
  import { makeMentionToken } from '$lib/services/mentionUtil';
  import type { WorldDoc } from '$lib/domain/docs';

  export let value = '';
  export let placeholder = '';
  export let rows = 6;
  export let onChange: (v: string) => void = () => {};

  let ta: HTMLTextAreaElement;
  let showMenu = false;
  let query = '';
  let atPos = -1;        // '@'의 위치
  let results: WorldDoc[] = [];
  let activeIdx = 0;

  function onInput() {
    value = ta.value;
    onChange(value);
    detectMention();
  }

  // 커서 직전의 '@단어'를 찾아 검색 메뉴를 띄움
  function detectMention() {
    const pos = ta.selectionStart;
    const before = value.slice(0, pos);
    const at = before.lastIndexOf('@');
    if (at === -1) { showMenu = false; return; }
    const frag = before.slice(at + 1);
    // @뒤에 공백/줄바꿈/괄호가 있으면 멘션 입력 종료된 것
    if (/[\s\n()\[\]]/.test(frag)) { showMenu = false; return; }
    atPos = at;
    query = frag;
    results = searchDocsByTitle(query).slice(0, 6);
    activeIdx = 0;
    showMenu = results.length > 0;
  }

  function insertMention(doc: WorldDoc) {
    const pos = ta.selectionStart;
    const token = makeMentionToken(doc.title || '제목 없음', doc.id);
    value = value.slice(0, atPos) + token + ' ' + value.slice(pos);
    onChange(value);
    showMenu = false;
    // 커서를 토큰 뒤로
    requestAnimationFrame(() => {
      const np = atPos + token.length + 1;
      ta.focus();
      ta.setSelectionRange(np, np);
    });
  }

  function onKeydown(e: KeyboardEvent) {
    if (!showMenu) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = (activeIdx + 1) % results.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = (activeIdx - 1 + results.length) % results.length; }
    else if (e.key === 'Enter') { e.preventDefault(); insertMention(results[activeIdx]); }
    else if (e.key === 'Escape') { showMenu = false; }
  }
</script>

<div class="relative">
  <textarea
    bind:this={ta}
    bind:value
    on:input={onInput}
    on:keydown={onKeydown}
    {rows}
    {placeholder}
    class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-[15px] text-slate-100 leading-relaxed outline-none focus:border-indigo-500 resize-y"
  ></textarea>

  {#if showMenu}
    <div class="absolute z-30 left-3 right-3 mt-1 rounded-xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden">
      <p class="px-3 py-1.5 text-[10px] text-slate-500 border-b border-slate-800">세계관 문서 연결 — ↑↓ Enter</p>
      {#each results as doc, i (doc.id)}
        <button
          on:click={() => insertMention(doc)}
          class="w-full text-left px-3 py-2 text-sm transition flex items-center gap-2
                 {i === activeIdx ? 'bg-indigo-600/20 text-indigo-200' : 'text-slate-300 hover:bg-slate-800'}"
        >
          <span class="truncate">{doc.title || '제목 없음'}</span>
          <span class="text-[10px] text-slate-600 ms-auto shrink-0">{doc.category}</span>
        </button>
      {/each}
    </div>
  {/if}
  <p class="text-[10px] text-slate-600 mt-1">@ 를 입력하면 세계관 문서를 연결할 수 있어요.</p>
</div>
