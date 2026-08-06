
<script lang="ts">
  import type { WorldDoc } from '$lib/domain/docs';
  import type { CategoryId } from '$lib/domain/categories';
  import { page } from '$app/stores';
  import { goto, beforeNavigate } from '$app/navigation';
  import { onDestroy } from 'svelte';
  import { queueSave, flushSave } from '$lib/services/autosave';
  import { browser } from '$app/environment';
  import DocEditLayout from '$lib/components/edit/DocEditLayout.svelte';
  import DetailSwitcher from '$lib/features/world/details/DetailSwitcher.svelte';
  import ProfileSheet from '$lib/features/world/details/ProfileSheet.svelte';
  import BlockEditor from '$lib/features/world/details/BlockEditor.svelte';
  import { schemaFor } from '$lib/domain/sheetSchemas';
  import RelationsPanel from '$lib/features/world/details/RelationsPanel.svelte';


  import {
    getDocById,
    saveDoc,
    searchDocsByTitle,
    listAllDocs
  } from '$lib/stores/docStore';

  import { CATEGORY_META, categoryPillClass } from '$lib/domain/categories';
  import { fileToDataUrl } from '$lib/services/thumbnails';
  import { syncCurrentWorldToSQLite } from '$lib/stores/docStore';
  import { gotoDoc } from '$lib/services/worldNav';

  const CATEGORY: CategoryId = 'storylines';
  const META = CATEGORY_META[CATEGORY];
  const SHEET_SCHEMA = schemaFor(CATEGORY);

  // ── 시트 선택 (프로필 / 전용 / 자유 블록) — 데이터는 각자 보관 ──
  let activeSheet: 'profile' | 'detail' | 'blocks' = 'profile';
  $: if (selectedDoc) {
    activeSheet =
      ((selectedDoc.attributes as any)?.activeSheet as 'profile' | 'detail' | 'blocks') ?? 'profile';
  }
  function setSheet(mode: 'profile' | 'detail' | 'blocks') {
    if (!selectedDoc) return;
    if (!selectedDoc.attributes) selectedDoc.attributes = {};
    (selectedDoc.attributes as any).activeSheet = mode;
    activeSheet = mode;
    saveDoc(selectedDoc);
  }

  // 현재 문서
  $: docId = $page.params.id;
  $: selectedDoc = docId ? (getDocById(docId) as WorldDoc | null) : null;

  // 혹시 잘못된 id로 들어오면 목록으로
  $: if (browser && docId && !selectedDoc) {
    // 약간의 안전장치
    goto('/world/storylines');
  }

  // 변경사항 저장 (디바운스 자동저장 — 상태는 SaveIndicator가 표시)
  $: if (browser && selectedDoc) {
    queueSave(selectedDoc);
  }

  // 화면을 떠나기 전에 밀린 저장을 확정
  beforeNavigate(flushSave);
  onDestroy(flushSave);

  // 언급/백링크
    $: mentionedDocs = selectedDoc
    ? (selectedDoc.mentions ?? [])
      .map((id) => getDocById(id))
      .filter((d): d is WorldDoc => !!d)
  : [];



    $: mentionedByDocs = (() => {
    const sd = selectedDoc;
    if (!sd) return [];

    const id = sd.id;
    return listAllDocs().filter((d) => (d.mentions ?? []).includes(id));
    })();


  function jumpToDoc(doc: WorldDoc) {
    if (doc.category === CATEGORY) {
      goto(`/world/storylines/${doc.id}`);
      return;
    }
    gotoDoc(doc);
  }

  // DB 저장
  let isSaving = false;
  let saveMessage = '';

  async function handleSaveToDatabase() {
    if (!selectedDoc) return;
    isSaving = true;
    saveMessage = '';
    try {
      await syncCurrentWorldToSQLite();
      saveMessage = '현재 세계의 문서를 DB에 저장했어요.';
    } catch (err) {
      console.error('[SAVE] DB 저장 중 오류', err);
      saveMessage = '저장 중 오류가 발생했습니다.';
    } finally {
      isSaving = false;
      setTimeout(() => (saveMessage = ''), 3000);
    }
  }

  // @멘션
  let isMentionOpen = false;
  let mentionQuery = '';
  let mentionResults: WorldDoc[] = [];
  let contentEl: HTMLTextAreaElement | null = null;
  let mentionPos = 0;

  function openMentionPopup() {
    isMentionOpen = true;
    mentionQuery = '';
    mentionResults = searchDocsByTitle('');
  }
  function closeMentionPopup() {
    isMentionOpen = false;
  }
  function handleContentKeydown(event: KeyboardEvent) {
    const target = event.currentTarget as HTMLTextAreaElement;
    if (event.key === '@') {
      event.preventDefault();
      mentionPos = target.selectionStart ?? 0;
      openMentionPopup();
    } else if (event.key === 'Escape') {
      closeMentionPopup();
    }
  }
  function handleMentionSearchInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    mentionQuery = target.value;
    mentionResults = searchDocsByTitle(mentionQuery);
  }
function insertMention(doc: WorldDoc) {
  if (!selectedDoc) return;

  const linkText = `@${doc.title} `;
  const current = selectedDoc.content ?? '';

  const pos = mentionPos ?? 0;
  const before = current.slice(0, pos);
  const after = current.slice(pos);

  const nextContent = before + linkText + after;

  const prevMentions = selectedDoc.mentions ?? [];
  const nextMentions = prevMentions.includes(doc.id)
    ? prevMentions
    : [...prevMentions, doc.id];

  // ✅ 저장만 하고 selectedDoc 재할당 금지
  saveDoc({
    ...selectedDoc,
    content: nextContent,
    mentions: nextMentions
  });

  closeMentionPopup();

  requestAnimationFrame(() => {
    if (!contentEl) return;
    const newPos = before.length + linkText.length;
    contentEl.focus();
    contentEl.selectionStart = newPos;
    contentEl.selectionEnd = newPos;
  });
}

  // 텍스트 감싸기
function wrapSelection(before: string, after: string) {
  if (!selectedDoc || !contentEl) return;

  const el = contentEl;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? start;

  const old = selectedDoc.content ?? '';
  const head = old.slice(0, start);
  const selected = old.slice(start, end);
  const tail = old.slice(end);

  const next = head + before + selected + after + tail;

  // ✅ 저장만 하고 selectedDoc 재할당 금지
  saveDoc({
    ...selectedDoc,
    content: next
  });

  const newStart = head.length + before.length;
  const newEnd = newStart + selected.length;

  setTimeout(() => {
    el.focus();
    el.selectionStart = newStart;
    el.selectionEnd = newEnd;
  }, 0);
}


  // 썸네일
  let thumbError = '';

async function handleThumbnailChange(event: Event) {
  if (!selectedDoc) return;
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    thumbError = '이미지 파일만 업로드할 수 있습니다.';
    input.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    thumbError = '썸네일은 2MB 이하 이미지를 권장합니다.';
    input.value = '';
    return;
  }

  thumbError = '';
  try {
    const dataUrl = await fileToDataUrl(file);

    // ✅ 저장만 하고 selectedDoc 재할당 금지
    saveDoc({
      ...selectedDoc,
      thumbnailPath: dataUrl
    });
  } catch (err) {
    console.error(err);
    thumbError = '썸네일을 불러오는 중 오류가 발생했습니다.';
  } finally {
    input.value = '';
  }
}


  function clearThumbnail() {
  if (!selectedDoc) return;
  saveDoc({ ...selectedDoc, thumbnailPath: null });
}

  function backToList() {
    goto('/world/storylines');
  }
</script>


<DocEditLayout
  icon={META.icon}
  title="스토리 라인 편집"
  subtitle="문서를 편집합니다."
  onBack={backToList}
  primaryText={isSaving ? '백업 중...' : 'DB 백업'}
  primaryDisabled={isSaving}
  onPrimary={handleSaveToDatabase}
  saveMessage={saveMessage}
>
  {#if selectedDoc}
      <!-- 썸네일 -->
      <div class="mb-1 flex items-start gap-3">
        <div class="h-20 w-20 rounded-lg bg-slate-100 dark:bg-slate-800
                    flex items-center justify-center overflow-hidden shrink-0">
          {#if selectedDoc.thumbnailPath}
            <img src={selectedDoc.thumbnailPath} alt={`${selectedDoc.title} 썸네일`} class="h-full w-full object-cover" />
          {:else}
            <span class="text-[11px] text-slate-400 dark:text-slate-500 text-center px-1">썸네일 없음</span>
          {/if}
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-slate-600 dark:text-slate-200">썸네일 (Thumbnail)</label>
          <input
            type="file"
            accept="image/*"
            class="block text-[11px] file:text-[11px]
                   file:px-2 file:py-1.5 file:rounded-md
                   file:border file:border-slate-200 file:bg-white
                   file:text-slate-700 dark:file:border-slate-700
                   dark:file:bg-slate-900 dark:file:text-slate-100 file:mr-2"
            on:change={handleThumbnailChange}
          />
          <div class="flex items-center gap-2 mt-1 min-h-[1.5rem]">
            {#if selectedDoc.thumbnailPath}
              <button
                type="button"
                class="px-2 py-0.5 rounded-md text-[11px]
                       text-slate-400 hover:text-red-600 hover:bg-red-50
                       dark:text-slate-500 dark:hover:text-red-300 dark:hover:bg-red-900/30 transition"
                on:click={clearThumbnail}
              >
                썸네일 삭제
              </button>
            {/if}
            {#if thumbError}
              <p class="text-[11px] text-red-500">{thumbError}</p>
            {/if}
          </div>
        </div>
      </div>

      <!-- 제목/요약 -->
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">제목 (Title)</label>
          <input
            class="w-full rounded-xl border border-slate-200 dark:border-slate-700
                   bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-sm outline-none
                   focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500 transition"
            bind:value={selectedDoc.title}
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">한 줄 요약 (Summary)</label>
          <input
            class="w-full rounded-xl border border-slate-200 dark:border-slate-700
                   bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-sm outline-none
                   focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500 transition"
            bind:value={selectedDoc.summary}
            placeholder="예: 세계 붕괴를 막기 위한 메인 스토리 라인"
          />
        </div>
      </div>

      <!-- ✅ [NEW] 2. 스킬 상세 설정 UI (여기에 추가됨!) -->
      <!-- 제목/요약(위)과 본문(아래) 사이 -->
      <!-- 시트 영역: 프로필 / 전용 / 자유 블록 (데이터는 각자 보관) -->
      <div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden mb-6">
        <div class="flex items-center gap-1 px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex-wrap">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400 me-1">시트</span>
          {#if SHEET_SCHEMA}
            <button type="button" on:click={() => setSheet('profile')}
              class="px-2.5 py-1 rounded-lg text-xs font-medium transition
                     {activeSheet === 'profile' ? 'bg-indigo-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
              📖 프로필 시트
            </button>
          {/if}
          <button type="button" on:click={() => setSheet('detail')}
            class="px-2.5 py-1 rounded-lg text-xs font-medium transition
                   {activeSheet === 'detail' ? 'bg-indigo-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
            🗂 기본 시트
          </button>
          <button type="button" on:click={() => setSheet('blocks')}
            class="px-2.5 py-1 rounded-lg text-xs font-medium transition
                   {activeSheet === 'blocks' ? 'bg-indigo-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
            🧩 자유 시트
          </button>
        </div>

        <div class="p-2">
          {#if activeSheet === 'profile' && SHEET_SCHEMA}
            <ProfileSheet bind:value={selectedDoc.attributes} schema={SHEET_SCHEMA} />
          {:else if activeSheet === 'blocks'}
            <BlockEditor doc={selectedDoc} on:change={() => saveDoc(selectedDoc)} />
          {:else}
            <DetailSwitcher
              category={CATEGORY}
              bind:data={selectedDoc.attributes}
            />
          {/if}
        </div>
      </div>
      
      <!-- 본문 -->
      <div class="flex-1 flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-medium text-slate-500 dark:text-slate-400">본문 (Content)</label>
          <span class="text-[10px] text-slate-400 dark:text-slate-500">
            ※ "@키"를 누르면 다른 문서를 @멘션으로 연결할 수 있습니다.
          </span>
        </div>

        <div class="flex items-center gap-1 text-[11px]">
          <button type="button" class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition" on:click={() => wrapSelection('**','**')}>B</button>
          <button type="button" class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition" on:click={() => wrapSelection('*','*')}><span class="italic">i</span></button>
          <button type="button" class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition" on:click={() => wrapSelection('`','`')}>code</button>
          <button type="button" class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition" on:click={() => wrapSelection('“','”')}>“ ”</button>
          <button type="button" class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition" on:click={() => wrapSelection('‘','’')}>‘ ’</button>
        </div>

        <div class="relative flex-1">
          <textarea
            class="flex-1 w-full min-h-[220px] rounded-xl border border-slate-200 dark:border-slate-700
                   bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-sm outline-none
                   focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500 resize-none transition"
            bind:value={selectedDoc.content}
            bind:this={contentEl}
            on:keydown={handleContentKeydown}
            placeholder="에피소드 순서, 분기, 플래그, 주요 전개 등을 적어보세요."
          ></textarea>

          {#if isMentionOpen}
            <div class="absolute left-2 right-2 bottom-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-lg p-2 space-y-2 text-xs z-10">
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-slate-400 dark:text-slate-500">연결할 문서를 검색하세요:</span>
                <input
                  class="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500 transition"
                  placeholder="제목으로 검색 (예: 오늘이, 설화국...)"
                  value={mentionQuery}
                  on:input={handleMentionSearchInput}
                />
                <button type="button" class="px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" on:click={closeMentionPopup}>닫기</button>
              </div>

              {#if mentionResults.length === 0}
                <div class="px-1 py-2 text-[11px] text-slate-400 dark:text-slate-500">검색 결과가 없습니다.</div>
              {:else}
                <ul class="max-h-48 overflow-y-auto space-y-1">
                  {#each mentionResults as doc}
                    <li>
                      <button type="button" class="w-full flex flex-col items-start px-2 py-1.5 rounded-lg text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition" on:click={() => insertMention(doc)}>
                        <span class="text-[12px] font-medium text-slate-800 dark:text-slate-100">{doc.title}</span>
                        {#if doc.summary}
                          <span class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{doc.summary}</span>
                        {/if}
                        <span class="text-[10px] text-slate-400 dark:text-slate-500">#{doc.category}</span>
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      {#if mentionedDocs.length > 0}
        <section class="mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
          <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">이 문서에서 언급한 문서들</h3>
          <ul class="flex flex-wrap gap-1.5">
            {#each mentionedDocs as doc}
              <li>
                <button
                  type="button"
                  class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition ${categoryPillClass(doc.category)}`}
                  on:click={() => jumpToDoc(doc)}
                >
                  <span class="opacity-70">#{doc.category}</span>
                  <span class="font-medium">{doc.title}</span>
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if mentionedByDocs.length > 0}
        <section class="mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
          <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">이 문서를 언급한 문서들</h3>
          <ul class="flex flex-wrap gap-1.5">
            {#each mentionedByDocs as doc}
              <li>
                <button
                  type="button"
                  class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition ${categoryPillClass(doc.category)}`}
                  on:click={() => jumpToDoc(doc)}
                >
                  <span class="opacity-70">#{doc.category}</span>
                  <span class="font-medium">{doc.title}</span>
                </button>
              </li>
            {/each}
          </ul>
       </section>
      {/if}

      <RelationsPanel docId={selectedDoc.id} />

    {:else}
      <div class="m-auto text-center text-sm text-slate-500 dark:text-slate-400">
        문서를 찾을 수 없습니다.
      </div>
    {/if}
</DocEditLayout>
