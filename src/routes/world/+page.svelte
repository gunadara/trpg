<!-- src/routes/world/+page.svelte -->
<script lang="ts">
  import { CATEGORY_META, type CategoryId } from '$lib/domain/categories';
  import { CATEGORY_ROUTE } from '$lib/services/worldNav';
  import { listDocs } from '$lib/stores/docStore';
  import { currentWorldId } from '$lib/stores/worldStore';

  const CATEGORIES: CategoryId[] = [
    'characters',
    'races',
    'groups',
    'nations',
    'locations',
    'events',
    'storylines',
    'items',
    'skills',
    'quests'
  ];

  // 세계가 바뀌면 이 값이 바뀌어서 아래 cards도 다시 계산됨
  $: _world = $currentWorldId; // world 변경 시 반응 트리거 용도

  // 세계 + 카테고리 기준으로 카드 다시 계산
  $: cards = CATEGORIES.map((id) => {
    const docs = listDocs(id);
    return {
      id,
      href: CATEGORY_ROUTE[id],
      icon: CATEGORY_META[id].icon,
      label: CATEGORY_META[id].label,
      count: docs.length
    };
  });
</script>

<section class="h-full flex flex-col p-4 md:p-6">
  <header class="mb-4 md:mb-6">
    <div class="flex items-center justify-between mb-2">
      <a href="/" class="text-sm text-slate-500 hover:text-indigo-500 transition flex items-center gap-1">
        ← 홈으로
      </a>
      <div class="flex items-center gap-3">
        <a href="/timeline" class="text-xs text-indigo-400 hover:underline">📜 연표</a>
        <a href="/visualizer" class="text-xs text-indigo-400 hover:underline">🕸️ 관계도</a>
      </div>
    </div>
    <h1 class="text-xl md:text-2xl font-semibold mb-1">
      GENESIS · World
    </h1>
    <p class="text-sm text-slate-500 dark:text-slate-400">
      인물·종족·나라·사건·스토리 라인 문서를 한 곳에서 관리합니다.
    </p>
  </header>

  <div
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
  >
    {#each cards as card}
      <a
        href={card.href}
        class="group rounded-2xl border border-slate-200 dark:border-slate-800
               bg-white/80 dark:bg-slate-900/70
               px-4 py-3 flex items-center justify-between gap-3
               hover:border-indigo-400 hover:bg-indigo-50/70
               dark:hover:border-indigo-500 dark:hover:bg-indigo-900/30
               transition"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="h-9 w-9 flex items-center justify-center rounded-xl
                   bg-slate-100 dark:bg-slate-800 text-lg"
          >
            {card.icon}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {card.label}
              </span>
            </div>
            <p class="text-[11px] text-slate-400 dark:text-slate-500">
              문서 {card.count}개
            </p>
          </div>
        </div>

        <span class="text-xs text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-300">
          열기 →
        </span>
      </a>
    {/each}
  </div>
</section>
