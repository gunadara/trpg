<script lang="ts">
  import { gamebooks } from '$lib/stores/gamebookStore';
  import {
    parseGamebookText, gamebookToText,
    FORMAT_GUIDE, EXAMPLE_TEXT, GPT_PROMPT
  } from '$lib/services/gamebookFormat';
  import type { Gamebook } from '$lib/stores/gamebookStore';

  export let mode: 'import' | 'export' = 'import';
  export let book: Gamebook | null = null;   // export 시 대상, import 시 덮어쓸 대상(선택)
  export let onClose: () => void = () => {};
  export let onImported: (bookId: string) => void = () => {};

  let text = mode === 'export' && book ? gamebookToText(book) : '';
  let bookTitle = '';
  let showGuide = false;
  let warnings: string[] = [];
  let copied = '';

  function doImport() {
    const { scenes, startTitle, warnings: w } = parseGamebookText(text);
    warnings = w;
    if (scenes.length === 0) {
      warnings = ['장면을 하나도 찾지 못했어요. "# 제목" 형식으로 시작하는지 확인해 주세요.'];
      return;
    }
    const startId = scenes.find((s) => s.title === startTitle)?.id ?? scenes[0].id;

    if (book) {
      // 기존 게임북 덮어쓰기
      if (!confirm(`「${book.title}」의 장면을 이 텍스트로 교체할까요? (기존 ${book.scenes.length}개 장면이 사라집니다)`)) return;
      gamebooks.replaceScenes(book.id, scenes, startId);
      onImported(book.id);
    } else {
      const id = gamebooks.importBook(bookTitle || '가져온 게임북', scenes, startId);
      onImported(id);
    }
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      copied = label;
      setTimeout(() => (copied = ''), 1500);
    } catch {
      copied = '복사 실패 — 직접 선택해 주세요';
    }
  }

  function loadExample() { text = EXAMPLE_TEXT; }
</script>

<div class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
     on:click={onClose} on:keydown={(e) => e.key === 'Escape' && onClose()} role="button" tabindex="-1">
  <div class="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-line bg-surface"
       on:click|stopPropagation role="dialog">

    <!-- 헤더 -->
    <div class="flex items-center justify-between p-4 border-b border-line shrink-0">
      <h2 class="text-base font-bold text-ink">
        {mode === 'import' ? '📥 텍스트로 가져오기' : '📤 텍스트로 내보내기'}
      </h2>
      <button on:click={onClose} class="text-muted hover:text-muted">✕</button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-3">

      {#if mode === 'import'}
        <!-- 형식 가이드 (접이식) -->
        <div class="rounded-xl border border-line bg-canvas/50">
          <button on:click={() => (showGuide = !showGuide)} class="w-full flex items-center justify-between px-3 py-2.5 text-sm text-muted">
            <span>📖 작성법 {showGuide ? '접기' : '보기'}</span>
            <span class="text-subtle">{showGuide ? '▲' : '▼'}</span>
          </button>
          {#if showGuide}
            <div class="px-3 pb-3 space-y-3">
              <pre class="text-[11px] text-muted whitespace-pre-wrap leading-relaxed font-mono bg-canvas rounded-lg p-3 border border-line">{FORMAT_GUIDE}</pre>
              <div class="flex flex-wrap gap-2">
                <button on:click={loadExample} class="px-3 py-1.5 rounded-lg text-xs border border-line text-muted hover:border-primary transition">예시 불러오기</button>
                <button on:click={() => copy('GPT 프롬프트', GPT_PROMPT)} class="px-3 py-1.5 rounded-lg text-xs border border-emerald-800 text-emerald-300 hover:border-emerald-500 transition">🤖 GPT 프롬프트 복사</button>
              </div>
              <p class="text-[11px] text-subtle">
                AI에게 만들게 하려면 「GPT 프롬프트 복사」 → ChatGPT 등에 붙여넣고 주제만 채워 실행 → 나온 결과를 아래 칸에 붙여넣으세요.
              </p>
            </div>
          {/if}
        </div>

        <!-- 새 게임북이면 제목 -->
        {#if !book}
          <input
            type="text"
            bind:value={bookTitle}
            placeholder="게임북 제목 (비우면 '가져온 게임북')"
            class="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
        {/if}

        <textarea
          bind:value={text}
          rows="12"
          placeholder={'# 첫 장면\n여기에 본문을 쓰고…\n\n- 선택지 -> 다음 장면'}
          class="w-full rounded-xl border border-line bg-canvas px-3.5 py-3 text-sm text-ink leading-relaxed outline-none focus:border-primary resize-y font-mono"
        ></textarea>

        {#if warnings.length > 0}
          <div class="rounded-lg border border-amber-800 bg-amber-900/10 p-3 space-y-1">
            {#each warnings as w}
              <p class="text-[11px] text-amber-400">⚠ {w}</p>
            {/each}
          </div>
        {/if}

      {:else}
        <!-- 내보내기 -->
        <p class="text-[11px] text-muted">이 텍스트를 복사해서 보관하거나, 다른 곳에서 「가져오기」로 다시 불러올 수 있어요.</p>
        <textarea
          value={text}
          readonly
          rows="14"
          class="w-full rounded-xl border border-line bg-canvas px-3.5 py-3 text-sm text-muted leading-relaxed resize-y font-mono"
        ></textarea>
      {/if}
    </div>

    <!-- 푸터 -->
    <div class="flex items-center justify-between p-4 border-t border-line shrink-0">
      <span class="text-[11px] text-emerald-400">{copied ? `✓ ${copied} 복사됨` : ''}</span>
      <div class="flex items-center gap-2">
        {#if mode === 'export'}
          <button on:click={() => copy('전체', text)} class="px-4 py-2 rounded-lg bg-primary hover:opacity-90 text-white text-sm font-bold transition">전체 복사</button>
        {:else}
          <button on:click={onClose} class="px-3 py-2 text-sm text-muted hover:text-ink">취소</button>
          <button on:click={doImport} class="px-4 py-2 rounded-lg bg-primary hover:opacity-90 text-white text-sm font-bold transition">
            {book ? '교체' : '가져오기'}
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
