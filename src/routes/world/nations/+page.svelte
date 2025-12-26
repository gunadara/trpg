<script lang="ts">
  import type { WorldDoc } from '$lib/domain/docs';
  import type { CategoryId } from '$lib/domain/categories';
  import { CATEGORY_META } from '$lib/domain/categories';
  import { listDocs, createBlankDoc, deleteDoc } from '$lib/stores/docStore';
  import { matchesTextQuery } from '$lib/utils/koreanSearch';
  import { currentWorldId } from '$lib/stores/worldStore';
  import { goto } from '$app/navigation';

  import DocListLayout from '$lib/components/docs/DocListLayout.svelte';

  const CATEGORY: CategoryId = 'nations';
  const META = CATEGORY_META[CATEGORY];

  let docs: WorldDoc[] = listDocs(CATEGORY);
  let listFilter = '';

  function refreshList() {
    docs = listDocs(CATEGORY);
  }

  // 세계 바뀌면 목록 리로드
  $: if ($currentWorldId) refreshList();

  $: filteredDocs =
    listFilter.trim()
      ? docs.filter((d) =>
          matchesTextQuery(d.title ?? '', listFilter) ||
          matchesTextQuery(d.summary ?? '', listFilter)
        )
      : docs;

  function createNew() {
    const newDoc = createBlankDoc(CATEGORY);
    refreshList();
    goto(`/world/nations/${newDoc.id}`);
  }

  function openDoc(doc: WorldDoc) {
    goto(`/world/nations/${doc.id}`);
  }

  function handleDelete(doc: WorldDoc) {
    if (!confirm(`"${doc.title}" 문서를 삭제할까요?\n(되돌릴 수 없습니다)`)) return;
    deleteDoc(doc.id);
    refreshList();
  }
</script>

<DocListLayout
  icon={META.icon}
  title={META.label}
  subtitle="제국, 왕국, 도시 국가 등 세계의 정치 단위를 정리합니다."
  primaryText="새 나라 문서"
  onPrimary={createNew}
  bind:filterValue={listFilter}
  countText={`${filteredDocs.length} / ${docs.length}개`}
  searchPlaceholder="제목·요약 검색"
>
  <svelte:fragment slot="listTitle">
    <span>나라 문서 목록</span>
  </svelte:fragment>

  {#if docs.length === 0}
    <div class="h-full flex items-center justify-center px-4 py-6">
      <p class="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed max-w-[260px]">
        아직 등록된 나라 문서가 없습니다.<br />
        우측 상단의 <strong>“새 나라 문서”</strong> 버튼을 눌러 시작해보세요.
      </p>
    </div>
  {:else if filteredDocs.length === 0}
    <div class="h-full flex items-center justify-center px-4 py-6">
      <p class="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed max-w-[260px]">
        검색 결과가 없습니다.<br />
        검색어를 지우거나 다른 키워드를 입력해보세요.
      </p>
    </div>
  {:else}
    <ul class="h-full overflow-y-auto py-1">
      {#each filteredDocs as doc}
        <li>
          <div
            class="w-full flex items-start gap-2 px-3 py-2.5 text-sm
                   border-b border-slate-100/60 dark:border-slate-800/60
                   last:border-b-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition"
          >
            <button
              type="button"
              class="flex flex-1 items-start gap-3 text-left"
              on:click={() => openDoc(doc)}
            >
              <div
                class="mt-0.5 h-8 w-8 rounded-full overflow-hidden
                       bg-indigo-100 text-indigo-700 text-xs font-semibold
                       dark:bg-indigo-800 dark:text-indigo-100 shrink-0
                       flex items-center justify-center"
              >
                {#if doc.thumbnailPath}
                  <img src={doc.thumbnailPath} alt={`${doc.title} 썸네일`} class="h-full w-full object-cover" />
                {:else}
                  <span class="truncate">{(doc.title ?? '나라').slice(0, 2)}</span>
                {/if}
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="truncate font-medium text-slate-800 dark:text-slate-100">
                    {doc.title}
                  </span>
                </div>

                {#if doc.summary}
                  <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{doc.summary}</p>
                {:else}
                  <p class="text-[11px] text-slate-400 dark:text-slate-500 italic">한 줄 요약이 없습니다.</p>
                {/if}
              </div>
            </button>

            <div class="flex flex-col items-end gap-1 shrink-0 pt-1">
              <span class="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {doc.updatedAt}
              </span>
              <button
                type="button"
                class="px-2 py-1 text-[10px] rounded-md
                       text-slate-400 hover:text-red-600 hover:bg-red-50
                       dark:text-slate-500 dark:hover:text-red-300 dark:hover:bg-red-900/30 transition"
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
</DocListLayout>
