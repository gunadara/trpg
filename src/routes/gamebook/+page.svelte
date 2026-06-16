<script lang="ts">
  import { onMount } from 'svelte';
  import { gamebooks, type Gamebook, type Scene } from '$lib/stores/gamebookStore';
  import { getDocById } from '$lib/stores/docStore';
  import { extractDocIds } from '$lib/services/mentionUtil';
  import MentionTextarea from '$lib/features/play/MentionTextarea.svelte';
  import GamebookIO from '$lib/features/play/GamebookIO.svelte';

  onMount(() => gamebooks.load());

  let bookId: string | null = null;
  let sceneId: string | null = null;

  $: books = $gamebooks;
  $: book = books.find((b) => b.id === bookId) ?? null;
  $: scene = (sceneId && book) ? (book.scenes.find((s) => s.id === sceneId) ?? null) : null;

  // 첫 진입 시 자동 선택 (순환 방지: scene을 다시 읽지 않음)
  $: if (!bookId && books.length > 0) bookId = books[0].id;
  $: if (book && sceneId === null && book.scenes.length > 0) sceneId = book.scenes[0].id;

  function newBook() {
    const t = prompt('게임북 제목', '새 게임북');
    if (t === null) return;
    bookId = gamebooks.createBook(t);
    sceneId = null;
  }

  // 가져오기/내보내기 모달
  let ioMode: 'import' | 'export' | null = null;
  let ioBook: Gamebook | null = null;   // null이면 새 게임북으로 가져오기

  function openImportNew() { ioBook = null; ioMode = 'import'; }
  function openImportOver() { ioBook = book; ioMode = 'import'; }
  function openExport() { ioBook = book; ioMode = 'export'; }
  function onImported(id: string) {
    ioMode = null;
    bookId = id;
    sceneId = null;
  }
  function removeBook(b: Gamebook) {
    if (!confirm(`「${b.title}」을(를) 삭제할까요? 장면 ${b.scenes.length}개가 함께 사라집니다.`)) return;
    gamebooks.deleteBook(b.id);
    if (bookId === b.id) { bookId = null; sceneId = null; }
  }
  function newScene() {
    if (!book) return;
    sceneId = gamebooks.addScene(book.id);
  }

  function sceneLabel(s: Scene) {
    return s.title?.trim() || '(제목 없음)';
  }

  // 본문 변경 → 저장 + 멘션된 문서 자동 연결 (2번)
  function onBodyChange(v: string) {
    if (!book || !scene) return;
    const ids = extractDocIds(v);
    gamebooks.updateScene(book.id, scene.id, { body: v, linkedDocs: ids });
  }

  // 연결된 문서의 요약을 본문 끝에 붙여넣기 (3번: 설정 가져오기)
  function pullDocText(docId: string) {
    if (!book || !scene) return;
    const doc = getDocById(docId);
    if (!doc) return;
    const text = (doc.summary || doc.content || '').trim();    if (!text) { alert('이 문서엔 가져올 요약/본문이 없어요.'); return; }
    const merged = scene.body ? scene.body + '\n\n' + text : text;
    gamebooks.updateScene(book.id, scene.id, { body: merged });
  }

  function docTitle(id: string): string {
    return getDocById(id)?.title || '(삭제된 문서)';
  }
</script>

<div class="h-screen flex flex-col bg-slate-950 text-slate-200">
  <header class="shrink-0 p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      <a href="/journal" class="text-slate-400 hover:text-white transition text-sm shrink-0">← 저널</a>
      <h1 class="text-lg font-bold text-white">📓 게임북 만들기</h1>
    </div>
    {#if book}
      <div class="flex items-center gap-2">
        <button on:click={openImportOver} class="text-xs text-slate-400 hover:text-indigo-300 transition">📥 텍스트로 채우기</button>
        <button on:click={openExport} class="text-xs text-slate-400 hover:text-indigo-300 transition">📤 내보내기</button>
        <a href="/gamebook/play?book={book.id}" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">▶ 플레이</a>
      </div>
    {/if}
  </header>

  <div class="flex-1 flex overflow-hidden">
    <!-- 좌: 게임북 + 장면 목록 -->
    <aside class="w-60 shrink-0 border-r border-slate-800 bg-slate-900/40 overflow-y-auto p-3 space-y-4">
      <!-- 게임북 선택 -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">게임북</span>
          <div class="flex items-center gap-2">
            <button on:click={openImportNew} class="text-[11px] text-emerald-400 hover:underline">📥 텍스트</button>
            <button on:click={newBook} class="text-[11px] text-indigo-400 hover:underline">+ 새로</button>
          </div>
        </div>
        {#each books as b (b.id)}
          <div class="flex items-center gap-1 mb-1">
            <button
              on:click={() => { bookId = b.id; sceneId = null; }}
              class="flex-1 text-left px-2.5 py-1.5 rounded-lg text-xs transition truncate
                     {bookId === b.id ? 'bg-indigo-600/20 border border-indigo-600 text-indigo-200' : 'border border-transparent text-slate-300 hover:bg-slate-800/60'}"
            >📓 {b.title}</button>
            <button on:click={() => removeBook(b)} class="text-slate-600 hover:text-rose-400 text-xs px-1">×</button>
          </div>
        {/each}
        {#if books.length === 0}
          <p class="text-[11px] text-slate-600 px-1">+ 새로 눌러 시작</p>
        {/if}
      </div>

      <!-- 장면 목록 -->
      {#if book}
        <div class="border-t border-slate-800 pt-3">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">장면 ({book.scenes.length})</span>
            <button on:click={newScene} class="text-[11px] text-indigo-400 hover:underline">+ 장면</button>
          </div>
          {#each book.scenes as s (s.id)}
            <button
              on:click={() => (sceneId = s.id)}
              class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition mb-1 flex items-center gap-1.5
                     {sceneId === s.id ? 'bg-slate-700/50 text-white' : 'text-slate-400 hover:bg-slate-800/40'}"
            >
              {#if book.startSceneId === s.id}<span class="text-emerald-400" title="시작 장면">▶</span>{/if}
              <span class="truncate">{sceneLabel(s)}</span>
            </button>
          {/each}
        </div>
      {/if}
    </aside>

    <!-- 우: 장면 에디터 -->
    <main class="flex-1 overflow-y-auto p-6">
      {#if !book}
        <div class="h-full flex items-center justify-center text-slate-500 text-sm">왼쪽에서 게임북을 만들어 보세요.</div>
      {:else if !scene}
        <div class="h-full flex items-center justify-center text-slate-500 text-sm">「+ 장면」으로 첫 장면을 추가하세요.</div>
      {:else}
        <div class="max-w-2xl mx-auto space-y-5">
          <!-- 장면 헤더 -->
          <div class="flex items-center justify-between gap-3">
            <input
              type="text"
              value={scene.title}
              on:input={(e) => gamebooks.updateScene(book.id, scene.id, { title: e.currentTarget.value })}
              placeholder="장면 제목"
              class="flex-1 bg-transparent text-xl font-bold text-white outline-none border-b border-transparent focus:border-slate-700 pb-1"
            />
            <div class="flex items-center gap-2 shrink-0">
              {#if book.startSceneId !== scene.id}
                <button on:click={() => gamebooks.setStart(book.id, scene.id)} class="text-[11px] text-slate-400 hover:text-emerald-400">시작 장면으로</button>
              {:else}
                <span class="text-[11px] text-emerald-400">▶ 시작 장면</span>
              {/if}
              <button on:click={() => { gamebooks.deleteScene(book.id, scene.id); sceneId = null; }} class="text-[11px] text-rose-400 hover:underline">삭제</button>
            </div>
          </div>

          <!-- 본문 -->
          <div>
            <label class="block text-xs font-bold text-slate-500 mb-1.5">본문 (플레이어가 읽는 묘사)</label>
            {#key scene.id}
              <MentionTextarea
                value={scene.body}
                rows={6}
                placeholder={'너는 폐서점 앞에 섰다. @파밀 이(가) 유리문 너머에서 너를 본다…'}
                onChange={onBodyChange}
              />
            {/key}
          </div>

          <!-- 연결된 세계관 문서 (2·3번) -->
          {#if scene.linkedDocs && scene.linkedDocs.length > 0}
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <p class="text-[11px] font-bold text-slate-500 mb-2">🔗 이 장면에 등장 (본문 @멘션 자동 연결)</p>
              <div class="flex flex-wrap gap-1.5">
                {#each scene.linkedDocs as id (id)}
                  <span class="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-300">
                    {docTitle(id)}
                    <button on:click={() => pullDocText(id)} class="text-[10px] text-indigo-400 hover:text-indigo-300" title="이 문서의 설정을 본문에 가져오기">⬇설정</button>
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          <!-- GM 전용 메모 -->
          <div class="rounded-xl border border-dashed border-rose-900/60 bg-rose-950/10 p-3">
            <label class="block text-xs font-bold text-rose-400/80 mb-1.5">🔒 GM 메모 (플레이어에겐 안 보임)</label>
            <textarea
              value={scene.gmNotes ?? ''}
              on:input={(e) => gamebooks.updateScene(book.id, scene.id, { gmNotes: e.currentTarget.value })}
              rows="2"
              placeholder="함정, NPC의 진짜 정체, 판정 기준 등"
              class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none focus:border-rose-700 resize-y"
            ></textarea>
          </div>

          <!-- 선택지 -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold text-slate-500">선택지</label>
              <button on:click={() => gamebooks.addChoice(book.id, scene.id)} class="text-xs text-indigo-400 hover:underline">+ 선택지 추가</button>
            </div>

            {#if scene.choices.length === 0}
              <p class="text-[11px] text-slate-600 rounded-lg border border-dashed border-slate-800 px-3 py-3 text-center">
                선택지가 없으면 이 장면은 「엔딩」이 됩니다.
              </p>
            {/if}

            <div class="space-y-2">
              {#each scene.choices as c (c.id)}
                <div class="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                  <span class="text-slate-600 text-sm shrink-0">▸</span>
                  <input
                    type="text"
                    value={c.text}
                    on:input={(e) => gamebooks.updateChoice(book.id, scene.id, c.id, { text: e.currentTarget.value })}
                    placeholder="선택지 문구 (예: 문을 연다)"
                    class="flex-1 min-w-0 bg-transparent text-sm text-slate-100 outline-none"
                  />
                  <span class="text-slate-600 text-xs shrink-0">→</span>
                  <select
                    value={c.target ?? ''}
                    on:change={(e) => gamebooks.updateChoice(book.id, scene.id, c.id, { target: e.currentTarget.value || null })}
                    class="shrink-0 max-w-[140px] rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="">(연결 안 됨)</option>
                    {#each book.scenes.filter((s) => s.id !== scene.id) as target}
                      <option value={target.id}>{sceneLabel(target)}</option>
                    {/each}
                  </select>
                  <button on:click={() => gamebooks.removeChoice(book.id, scene.id, c.id)} class="text-slate-600 hover:text-rose-400 text-xs shrink-0 px-1">×</button>
                </div>
              {/each}
            </div>

            <p class="text-[11px] text-slate-600 mt-2">
              ※ 연결할 장면이 아직 없다면, 먼저 왼쪽에서 「+ 장면」으로 만든 뒤 여기서 선택하세요.
            </p>
          </div>
        </div>
      {/if}
    </main>
  </div>
</div>

{#if ioMode}
  <GamebookIO
    mode={ioMode}
    book={ioBook}
    onClose={() => (ioMode = null)}
    onImported={onImported}
  />
{/if}
