<script lang="ts">
  import type { WorldDoc } from '$lib/domain/docs';
  import type { CategoryId } from '$lib/domain/categories';
  import {
    listDocs,
    createBlankDoc,
    saveDoc,
    searchDocsByTitle,
    getDocById,
    listAllDocs,
    deleteDoc    
  } from '$lib/stores/docStore';
  import { gotoDoc } from '$lib/services/worldNav';
  import { page } from '$app/stores';
  import { CATEGORY_META, categoryPillClass } from '$lib/domain/categories';
  import { matchesTextQuery } from '$lib/utils/koreanSearch';
  import { fileToDataUrl } from '$lib/services/thumbnails';  // ⬅ 이 줄 추가
  import { syncCurrentWorldToSQLite } from '$lib/stores/docStore';
  import { currentWorldId } from '$lib/stores/worldStore';


  const CATEGORY: CategoryId = 'characters';

  const META = CATEGORY_META[CATEGORY];


  let docs: WorldDoc[] = listDocs(CATEGORY);
  let selectedId: string | null = docs[0]?.id ?? null;

// 🔹 세계가 바뀔 때 목록 재로딩 + 선택 문서 보정
$: if ($currentWorldId) {
  // 1) 현재 세계 기준으로 다시 목록 불러오기
  refreshList();

  // 2) 이전 세계에서 선택돼 있던 id가 새 목록에 없으면 정리
  if (!docs.find((d) => d.id === selectedId)) {
    selectedId = docs[0]?.id ?? null;  // 첫 번째 문서나, 없으면 null
  }
}

 // ⬇⬇ 여기 추가
  let listFilter = '';


  // 필터링된 목록
$: filteredDocs =
  listFilter.trim()
    ? docs.filter((doc) =>
        matchesTextQuery(doc.title ?? '', listFilter) ||
        matchesTextQuery(doc.summary ?? '', listFilter)
      )
    : docs;


  // ✅ URL에서 가져온 id를 "한 번만" 반영했는지 여부
  let initializedFromParam = false;

  function refreshList() {
    docs = listDocs(CATEGORY);
  }

  function selectDoc(id: string) {
    selectedId = id;
  }

  function createNew() {
    const newDoc = createBlankDoc(CATEGORY);
    selectedId = newDoc.id;
    refreshList();
  }

  // ✅ URL ?id= → 처음 한 번만 적용
  $: if (!initializedFromParam) {
    const paramId = $page.url.searchParams.get('id');

    if (paramId) {
      const target = getDocById(paramId);

      if (target && target.category === CATEGORY) {
        selectedId = target.id;
      } else if (!selectedId && docs[0]) {
        // 잘못된 id 이거나 카테고리 달라서 못 찾으면 첫 번째 문서로
        selectedId = docs[0].id;
      }
    } else if (!selectedId && docs[0]) {
      // 쿼리 id도 없고, 아직 선택된 것도 없으면 첫 번째 문서
      selectedId = docs[0].id;
    }

    initializedFromParam = true;
  }

  $: selectedDoc = docs.find((d) => d.id === selectedId) ?? null;

  $: if (selectedDoc) {
    saveDoc(selectedDoc);
  }

  // 🔹 이 문서에서 언급한 문서들 + 점프 함수
  $: mentionedDocs =
    selectedDoc?.mentions
      ?.map((id) => getDocById(id))
      .filter((d): d is WorldDoc => !!d) ?? [];

  // 이 문서를 언급한 문서들(백링크)
  $: mentionedByDocs =
    selectedDoc
      ? listAllDocs().filter((d) => (d.mentions ?? []).includes(selectedDoc.id))
      : [];


  function jumpToDoc(doc: WorldDoc) {
  if (doc.category === CATEGORY) {
    // 같은 카테고리(인물 → 인물)는 이 페이지 안에서 선택만 변경
    selectDoc(doc.id);
    return;
  }

  // 다른 카테고리면 worldNav 통해 해당 탭으로 이동
  gotoDoc(doc);
}

  //SQlite관련 함수

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
    // 3초 후 메시지 자동 제거 (선택사항)
    setTimeout(() => {
      saveMessage = '';
    }, 3000);
  }
}


  // ──────────────────────
  // @멘션 관련 상태 & 함수
  // ──────────────────────

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

    const updated = saveDoc({
      ...selectedDoc,
      content: nextContent,
      mentions: nextMentions
    });

    refreshList();
    selectedId = updated.id;

    closeMentionPopup();

    if (contentEl) {
      const newPos = before.length + linkText.length;
      contentEl.focus();
      contentEl.selectionStart = newPos;
      contentEl.selectionEnd = newPos;
    }
  }

  function handleDelete(doc: WorldDoc) {
    if (!confirm(`"${doc.title}" 문서를 삭제할까요?\n(되돌릴 수 없습니다)`)) {
      return;
    }

    deleteDoc(doc.id);
    refreshList();

    // 지금 보고 있던 문서를 지운 거라면,
    // 새로 목록에서 첫 번째를 선택하거나 없으면 null
    if (selectedId === doc.id) {
      selectedId = docs[0]?.id ?? null;
    }
  }

// ──────────────────────
// Rich Text 툴바용 헬퍼
// ──────────────────────

type InlineStyle = 'bold' | 'italic' | 'code';

type TransformResult = {
  text: string;
  newStart: number;
  newEnd: number;
};

function runContentTransform(
  transform: (text: string, start: number, end: number) => TransformResult
) {
  if (!selectedDoc || !contentEl) return;

  const current = selectedDoc.content ?? '';
  const start = contentEl.selectionStart ?? current.length;
  const end = contentEl.selectionEnd ?? start;

  const { text, newStart, newEnd } = transform(current, start, end);

  const updated = saveDoc({
    ...selectedDoc,
    content: text
  });

  // 목록/선택 갱신
  refreshList();
  selectedId = updated.id;

  // 커서 위치 되살리기
  requestAnimationFrame(() => {
    if (!contentEl) return;
    contentEl.focus();
    contentEl.selectionStart = newStart;
    contentEl.selectionEnd = newEnd;
  });
}

function applyInlineStyle(style: InlineStyle) {
  let wrapL = '';
  let wrapR = '';

  switch (style) {
    case 'bold':
      wrapL = '**';
      wrapR = '**';
      break;
    case 'italic':
      wrapL = '*';
      wrapR = '*';
      break;
    case 'code':
      wrapL = '`';
      wrapR = '`';
      break;
  }

  runContentTransform((text, start, end) => {
    const before = text.slice(0, start);
    const selected = text.slice(start, end);
    const after = text.slice(end);
    const hasSelection = end > start;

    // ✅ 1) 글자를 선택해 둔 상태에서 누른 경우 → 선택 영역을 감싸기
    if (hasSelection) {
      const body = selected;
      const next = before + wrapL + body + wrapR + after;

      const newStart = start + wrapL.length;
      const newEnd = newStart + body.length;

      return {
        text: next,
        newStart,
        newEnd
      };
    }

    // ✅ 2) 아무것도 선택 안 한 상태에서 누른 경우
    // **|** 이렇게만 넣고 커서를 가운데에 두기
    const next = before + wrapL + wrapR + after;
    const cursor = start + wrapL.length;

    return {
      text: next,
      newStart: cursor,
      newEnd: cursor
    };
  });
}


function applyBulletList() {
  runContentTransform((text, start, end) => {
    const before = text.slice(0, start);
    const selected = text.slice(start, end);

    const rawBlock = selected || '항목 1\n항목 2';
    const lines = rawBlock.split('\n');

    const bulletLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      // 이미 "- "로 시작하면 중복으로 안 붙이기
      if (trimmed.startsWith('- ')) return trimmed;
      return `- ${trimmed}`;
    });

    const block = bulletLines.join('\n');

    const after = text.slice(end);
    const next = before + block + after;

    const newStart = before.length;
    const newEnd = before.length + block.length;

    return {
      text: next,
      newStart,
      newEnd
    };
  });
}

function wrapSelection(before: string, after: string) {
  if (!selectedDoc) return;
  if (!contentEl) return;

  const el = contentEl;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? start;

  const old = selectedDoc.content ?? '';
  const head = old.slice(0, start);
  const selected = old.slice(start, end);
  const tail = old.slice(end);

  // 선택된 텍스트가 있으면 감싸고,
  // 없으면 사이에 아무 것도 안 넣음
  const next = head + before + selected + after + tail;
  selectedDoc.content = next;

  const newStart = head.length + before.length;
  const newEnd = newStart + selected.length; // 선택 있으면 텍스트 길이, 없으면 0

  // 커서 위치 / 선택범위 갱신
  setTimeout(() => {
    el.focus();
    el.selectionStart = newStart;
    el.selectionEnd = newEnd;  // 선택 없으면 newStart == newEnd → 커서만 사이에 놓임
  }, 0);
}


 // ──────────────────────
  // 썸네일 업로드 / 삭제
  // ──────────────────────
  let thumbError = '';

  async function handleThumbnailChange(event: Event) {
    if (!selectedDoc) return;

    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // 간단한 검증
    if (!file.type.startsWith('image/')) {
      thumbError = '이미지 파일만 업로드할 수 있습니다.';
      input.value = '';
      return;
    }

    // 2MB 제한 (원하면 숫자 바꿔도 됨)
    if (file.size > 2 * 1024 * 1024) {
      thumbError = '썸네일은 2MB 이하 이미지를 권장합니다.';
      input.value = '';
      return;
    }

    thumbError = '';

    try {
      const dataUrl = await fileToDataUrl(file);

      const updated = saveDoc({
        ...selectedDoc,
        thumbnailPath: dataUrl
      });

      // 최신 데이터로 목록/선택 갱신
      refreshList();
      selectedId = updated.id;
    } catch (err) {
      console.error(err);
      thumbError = '썸네일을 불러오는 중 오류가 발생했습니다.';
    } finally {
      // 같은 파일 다시 올릴 수 있게 input 리셋
      input.value = '';
    }
  }

  function clearThumbnail() {
    if (!selectedDoc) return;

    const updated = saveDoc({
      ...selectedDoc,
      thumbnailPath: null
    });

    refreshList();
    selectedId = updated.id;
  }
</script>

<section class="h-full flex flex-col">
  <!-- 상단 헤더 -->
  <header class="mb-4 flex items-center justify-between gap-3">
    <div>
    <h1 class="text-2xl font-semibold mb-1">
      {META.icon} {META.label}
    </h1>
    <p class="text-sm text-slate-500 dark:text-slate-400">
      GENESIS 세계관에 등장하는 인물들을 관리합니다.
    </p>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium
             bg-indigo-500 text-white hover:bg-indigo-600 active:bg-indigo-700
             shadow-sm transition"
      on:click={createNew}
    >
      <span class="text-base">＋</span>
      <span>새 인물 문서</span>
    </button>
  </header>

  <!-- 본문: 좌측 리스트 / 우측 상세 -->
  <div
    class="flex-1 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]"
  >

    <!-- 문서 리스트 -->
    <aside
      class="rounded-2xl border border-slate-200 bg-slate-50/70
             dark:border-slate-800 dark:bg-slate-900/40
             overflow-hidden flex flex-col"
    >
<div
  class="px-3 py-2 border-b border-slate-200 dark:border-slate-800
         space-y-1 text-xs text-slate-500 dark:text-slate-400"
>
  <div class="flex items-center justify-between">
    <span>인물 문서 목록</span>
    <span>
      {filteredDocs.length} / {docs.length}개
    </span>
  </div>

  <div class="flex items-center gap-1">
    <input
      class="flex-1 rounded-lg border border-slate-200 dark:border-slate-700
             bg-white/70 dark:bg-slate-900/40
             px-2 py-1 text-[11px] outline-none
             focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500
             placeholder:text-slate-300 dark:placeholder:text-slate-600
             transition"
      placeholder="제목·요약 검색"
      bind:value={listFilter}
    />
    {#if listFilter}
      <button
        type="button"
        class="px-2 py-1 text-[10px] rounded-md text-slate-400 hover:text-slate-600
               dark:text-slate-500 dark:hover:text-slate-300"
        on:click={() => (listFilter = '')}
      >
        지우기
      </button>
    {/if}
  </div>
</div>


      {#if docs.length === 0}
        <!-- 아예 문서가 하나도 없을 때 -->
        <div class="flex-1 flex items-center justify-center px-4 py-6">
          <p
            class="text-xs text-slate-500 dark:text-slate-400
                  text-center leading-relaxed max-w-[220px]"
          >
            아직 등록된 인물 문서가 없습니다.
            <br />
            우측 상단의 <strong>“새 인물 문서”</strong> 버튼을 눌러 시작해보세요.
          </p>
        </div>

      {:else if filteredDocs.length === 0}
        <!-- 문서는 있는데, 검색 결과가 없을 때 -->
        <div class="flex-1 flex items-center justify-center px-4 py-6">
          <p
            class="text-[11px] text-slate-400 dark:text-slate-500
                  text-center leading-relaxed max-w-[220px]"
          >
            검색 결과가 없습니다.
            <br />
            검색어를 지우거나 다른 키워드를 입력해보세요.
          </p>
        </div>

      {:else}
        <!-- 문서는 있는데, 검색 결과가 있을 때 -->
        <ul class="flex-1 overflow-y-auto py-1">
          {#each filteredDocs as doc}
            <li>
              <!-- 여기부터는 네가 이미 가진 리스트 코드 그대로 -->
              <div
                class={`w-full flex items-start gap-2 px-3 py-2.5 text-sm
                        border-b border-slate-100/60 dark:border-slate-800/60
                        last:border-b-0 rounded-none
                        ${doc.id === selectedId
                          ? 'bg-indigo-50 dark:bg-indigo-900/30'
                          : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/40'}`}
              >
              <!-- 왼쪽: 문서 선택 영역 -->
              <button
                type="button"
                class="flex flex-1 items-start gap-3 text-left"
                on:click={() => selectDoc(doc.id)}
              >
              <div
                class="mt-0.5 h-8 w-8 rounded-full overflow-hidden
                      bg-indigo-100 text-indigo-700 text-xs font-semibold
                      dark:bg-indigo-800 dark:text-indigo-100 shrink-0
                      flex items-center justify-center"
              >
                {#if doc.thumbnailPath}
                  <img
                    src={doc.thumbnailPath}
                    alt={`${doc.title} 썸네일`}
                    class="h-full w-full object-cover"
                  />
                {:else}
                  <span class="truncate">
                    {doc.title.slice(0, 2)}
                  </span>
                {/if}
              </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="truncate font-medium text-slate-800 dark:text-slate-100">
                      {doc.title}
                    </span>
                  </div>
                  {#if doc.summary}
                    <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {doc.summary}
                    </p>
                  {:else}
                    <p class="text-[11px] text-slate-400 dark:text-slate-500 italic">
                      한 줄 요약이 없습니다.
                    </p>
                  {/if}
                </div>
              </button>

              <!-- 오른쪽: 날짜 + 삭제 -->
              <div class="flex flex-col items-end gap-1 shrink-0 pt-1">
                <span class="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {doc.updatedAt}
                </span>
                <button
                  type="button"
                  class="px-2 py-1 text-[10px] rounded-md
                         text-slate-400 hover:text-red-600 hover:bg-red-50
                         dark:text-slate-500 dark:hover:text-red-300 dark:hover:bg-red-900/30
                         transition"
                  on:click={() => handleDelete(doc)}
                >
                  삭제
                </button>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
    </aside>

    <!-- 상세 / 에디터 영역 (지금은 뼈대만) -->
    <section
      class="rounded-2xl border border-slate-200 bg-white
             dark:border-slate-800 dark:bg-slate-900/60
             px-5 py-4 flex flex-col gap-4"
    >
      {#if selectedDoc}
        <!-- 🔹 썸네일 섹션 -->
        <div class="mb-3 flex items-start gap-3">
          <!-- 왼쪽: 미리보기 박스 -->
          <div
            class="h-20 w-20 rounded-lg bg-slate-100 dark:bg-slate-800
                   flex items-center justify-center overflow-hidden shrink-0"
          >
            {#if selectedDoc.thumbnailPath}
              <img
                src={selectedDoc.thumbnailPath}
                alt={`${selectedDoc.title} 썸네일`}
                class="h-full w-full object-cover"
              />
            {:else}
              <span class="text-[11px] text-slate-400 dark:text-slate-500 text-center px-1">
                썸네일 없음
              </span>
            {/if}
          </div>

          <!-- 오른쪽: 업로드 / 삭제 버튼 -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-slate-600 dark:text-slate-200">
              썸네일 (Thumbnail)
            </label>

            <input
              type="file"
              accept="image/*"
              class="block text-[11px] file:text-[11px]
                     file:px-2 file:py-1.5 file:rounded-md
                     file:border file:border-slate-200 file:bg-white
                     file:text-slate-700
                     dark:file:border-slate-700 dark:file:bg-slate-900 dark:file:text-slate-100
                     file:mr-2"
              on:change={handleThumbnailChange}
            />

            <div class="flex items-center gap-2 mt-1 min-h-[1.5rem]">
              {#if selectedDoc.thumbnailPath}
                <button
                  type="button"
                  class="px-2 py-0.5 rounded-md text-[11px]
                         text-slate-400 hover:text-red-600 hover:bg-red-50
                         dark:text-slate-500 dark:hover:text-red-300 dark:hover:bg-red-900/30
                         transition"
                  on:click={clearThumbnail}
                >
                  썸네일 삭제
                </button>
              {/if}

              {#if thumbError}
                <p class="text-[11px] text-red-500">
                  {thumbError}
                </p>
              {/if}
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              제목 (Title)
            </label>
            <input
              class="w-full rounded-xl border border-slate-200 dark:border-slate-700
                     bg-slate-50 dark:bg-slate-900/40
                     px-3 py-2 text-sm outline-none
                     focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500
                     transition"
              bind:value={selectedDoc.title}
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              한 줄 요약 (Summary)
            </label>
            <input
              class="w-full rounded-xl border border-slate-200 dark:border-slate-700
                     bg-slate-50 dark:bg-slate-900/40
                     px-3 py-2 text-sm outline-none
                     focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500
                     transition"
              bind:value={selectedDoc.summary}
              placeholder="선택 사항 · 인물의 핵심을 한 줄로 정리해보세요."
            />
          </div>
        </div>
        <div class="flex-1 flex flex-col gap-2">
          <!-- 1줄차: 제목/설명 -->
          <div class="flex items-center justify-between">
            <label class="text-xs font-medium text-slate-500 dark:text-slate-400">
              본문 (Content)
            </label>
            <span class="text-[10px] text-slate-400 dark:text-slate-500">
              ※ "@키"를 누르면 다른 문서를 @멘션으로 연결할 수 있습니다.
            </span>
          </div>

          <!-- 🔹 2줄차: 마크다운/따옴표 툴바 -->
          <div class="flex items-center justify-between text-[11px]">
            <div class="flex items-center gap-1">
              <!-- 굵게 -->
              <button
                type="button"
                class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700
                      bg-slate-50 dark:bg-slate-900/40
                      text-[11px] font-semibold
                      hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                on:click={() => wrapSelection('**', '**')}
              >
                B
              </button>

              <!-- 기울임 -->
              <button
                type="button"
                class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700
                      bg-slate-50 dark:bg-slate-900/40
                      text-[11px]
                      hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                on:click={() => wrapSelection('*', '*')}
              >
                <span class="italic">i</span>
              </button>

              <!-- 코드 -->
              <button
                type="button"
                class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700
                      bg-slate-50 dark:bg-slate-900/40
                      text-[11px] font-mono
                      hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                on:click={() => wrapSelection('`', '`')}
              >
                code
              </button>

              <!-- 🔹 영어 큰 따옴표 “ ” -->
              <button
                type="button"
                class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700
                      bg-slate-50 dark:bg-slate-900/40
                      text-[11px]
                      hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                on:click={() => wrapSelection('“', '”')}
              >
                “ ” 
              </button>

              <!-- 🔹 영어 작은 따옴표 ‘ ’ -->
              <button
                type="button"
                class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700
                      bg-slate-50 dark:bg-slate-900/40
                      text-[11px]
                      hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                on:click={() => wrapSelection('‘', '’')}
              >
                ‘ ’
              </button>
            </div>

            <span class="text-[10px] text-slate-400 dark:text-slate-500">
              **굵게** · *기울임* · `code` · “따옴표” 지원
            </span>
          </div>

          <!-- 3줄차: textarea + @멘션 -->
          <div class="relative flex-1">
            <textarea
              class="flex-1 w-full min-h-[220px] rounded-xl border border-slate-200 dark:border-slate-700
                    bg-slate-50 dark:bg-slate-900/40
                    px-3 py-2 text-sm outline-none
                    focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500
                    resize-none transition"
              bind:value={selectedDoc.content}
              bind:this={contentEl}
              on:keydown={handleContentKeydown}
              placeholder="이 인물의 외형, 성격, 관계, 히스토리 등을 자유롭게 적어보세요."
            ></textarea>
            {#if isMentionOpen}
              <div
                class="absolute left-2 right-2 bottom-2
                       rounded-2xl border border-slate-200 dark:border-slate-700
                       bg-white/95 dark:bg-slate-900/95
                       shadow-lg p-2 space-y-2 text-xs z-10"
              >
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-slate-400 dark:text-slate-500">
                    연결할 문서를 검색하세요:
                  </span>
                  <input
                    class="flex-1 rounded-lg border border-slate-200 dark:border-slate-700
                           bg-slate-50 dark:bg-slate-900/60
                           px-2 py-1 text-xs outline-none
                           focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500
                           transition"
                    placeholder="제목으로 검색 (예: 오늘이, 설화국...)"
                    value={mentionQuery}
                    on:input={handleMentionSearchInput}
                  />
                  <button
                    type="button"
                    class="px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-slate-600
                           dark:text-slate-500 dark:hover:text-slate-300"
                    on:click={closeMentionPopup}
                  >
                    닫기
                  </button>
                </div>

                {#if mentionResults.length === 0}
                  <div class="px-1 py-2 text-[11px] text-slate-400 dark:text-slate-500">
                    검색 결과가 없습니다.
                  </div>
                {:else}
                  <ul class="max-h-48 overflow-y-auto space-y-1">
                    {#each mentionResults as doc}
                      <li>
                        <button
                          type="button"
                          class="w-full flex flex-col items-start px-2 py-1.5 rounded-lg text-left
                                 hover:bg-indigo-50 dark:hover:bg-indigo-900/40
                                 transition"
                          on:click={() => insertMention(doc)}
                        >
                          <span class="text-[12px] font-medium text-slate-800 dark:text-slate-100">
                            {doc.title}
                          </span>
                          {#if doc.summary}
                            <span class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {doc.summary}
                            </span>
                          {/if}
                          <span class="text-[10px] text-slate-400 dark:text-slate-500">
                            #{doc.category}
                          </span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            {/if}
          </div>
        </div>


        <!-- 🔹 여기 새로 추가 -->
        {#if mentionedDocs.length > 0}
          <section class="mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              이 문서에서 언급한 문서들
            </h3>
            <ul class="flex flex-wrap gap-1.5">
              {#each mentionedDocs as doc}
                <li>
                <button
                  type="button"
                  class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]
                          transition ${categoryPillClass(doc.category)}`}
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
    <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
      이 문서를 언급한 문서들
    </h3>
    <ul class="flex flex-wrap gap-1.5">
      {#each mentionedByDocs as doc}
        <li>
        <button
          type="button"
          class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]
                  transition ${categoryPillClass(doc.category)}`}
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
        <!-- 🔹 여기까지 새 블럭 -->
         
<div class="flex flex-col items-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
  <div class="flex gap-2">
    <button
      type="button"
      class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-500
             hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300
             dark:hover:bg-slate-800 transition"
    >
      임시 저장 (나중에 구현)
    </button>

    <button
      type="button"
      class="px-4 py-1.5 text-xs rounded-lg bg-indigo-500 text-white
             hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-60
             transition"
      on:click={handleSaveToDatabase}
      disabled={isSaving}
    >
      {#if isSaving}
        저장 중...
      {:else}
        저장 (DB)
      {/if}
    </button>
  </div>

  {#if saveMessage}
    <p class="text-[11px] text-slate-400 dark:text-slate-500">
      {saveMessage}
    </p>
  {/if}
</div>
      {:else}
        <div class="m-auto text-center text-sm text-slate-500 dark:text-slate-400 space-y-2">
          <p>왼쪽에서 인물 문서를 선택하거나,</p>
          <p>
            우측 상단의 <strong>“새 인물 문서”</strong> 버튼을 눌러 첫 문서를 만들어보세요.
          </p>
        </div>
      {/if}
    </section>
  </div>
</section>
