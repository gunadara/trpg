<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import type { CategoryId } from '$lib/domain/categories';
  import { CATEGORY_META, WORLD_CATEGORY_IDS } from '$lib/domain/categories';
  import { CATEGORY_ROUTE } from '$lib/services/worldNav';

  import {
    worlds,
    currentWorldId,
    createWorld,
    renameWorld
  } from '$lib/stores/worldStore';
  import { hydrateCurrentWorldFromSQLite } from '$lib/stores/docStore';
  import DrawHelper from '$lib/features/draw/DrawHelper.svelte';
  import ThemeToggle from '$lib/components/layout/ThemeToggle.svelte';

    // /world 영역 진입 시 한 번, SQLite → 메모리/로컬스토리지 하이드레이트
  onMount(() => {
    hydrateCurrentWorldFromSQLite().catch((err) => {
      console.error('[SQLite] initial hydrate failed', err);
    });
  });

  type NavItem = {
    id: CategoryId;
    href: string;
    icon: string;
    label: string;
  };

  // 월드 내비 메뉴 (공용 목록 기반)
  const NAV_ITEMS: NavItem[] = WORLD_CATEGORY_IDS.map((id) => ({
    id,
    href: CATEGORY_ROUTE[id],
    icon: CATEGORY_META[id].icon,
    label: CATEGORY_META[id].label
  }));

  let navOpen = false;

  // 세계관 "뷰" 탭 (문서 카테고리와 별개 — 같은 세계를 다른 방식으로 봄)
  const VIEW_ITEMS = [
    { href: '/world/timeline', icon: '📜', label: '연표' },
    { href: '/world/graph', icon: '🕸️', label: '관계도' },
    { href: '/world/map', icon: '🗺️', label: '지도' }
  ];
  function goHref(href: string) {
    goto(href);
    navOpen = false;
  }

  // 현재 라우트 경로
  $: currentPath = $page.url.pathname;

  function go(item: NavItem) {
    goto(item.href);
    navOpen = false;
  }

  // 현재 선택된 세계
  $: activeWorld = $worlds.find((w) => w.id === $currentWorldId) ?? $worlds[0];

  function handleCreateWorld() {
    const w = createWorld();
    const name = window.prompt('새 세계 이름을 정해 주세요', w.name);
    if (name && name.trim()) renameWorld(w.id, name.trim());
  }

  function handleRenameWorld() {
    if (!activeWorld) return;
    const next = window.prompt('세계 이름을 수정하세요', activeWorld.name);
    if (next && next.trim()) renameWorld(activeWorld.id, next.trim());
  }
</script>

<!-- 전체 월드 영역을 감싸는 AppShell -->
<div class="min-h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
  <!-- 🔹 모바일 상단 앱바 (md 미만에서만 보임) -->
<header
  class="md:hidden flex items-center justify-between px-3 py-2
         border-b border-slate-200 dark:border-slate-800
         bg-white/80 dark:bg-slate-900/80 backdrop-blur"
>
  <!-- ✅ 왼쪽: 햄버거 + 타이틀 -->
  <div class="flex items-center gap-2 min-w-0">
    <button
      type="button"
      class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      on:click={() => (navOpen = true)}
      aria-label="카테고리 메뉴 열기"
    >
      <div class="w-5 h-[2px] bg-slate-800 dark:bg-slate-100 mb-1"></div>
      <div class="w-4 h-[2px] bg-slate-800 dark:bg-slate-100 mb-1"></div>
      <div class="w-6 h-[2px] bg-slate-800 dark:bg-slate-100"></div>
    </button>

    <div class="flex flex-col min-w-0 text-xs">
      <span class="font-semibold truncate">세계관 문서</span>
      {#if activeWorld}
        <span class="text-[10px] text-slate-400 dark:text-slate-500 truncate">
          현재 세계: {activeWorld.emoji} {activeWorld.name}
        </span>
      {/if}
    </div>
  </div>

  <!-- ✅ 오른쪽: 홈 + 테마만 (세계 관리 컨트롤은 드로어로 이동) -->
  <div class="flex items-center gap-1.5 shrink-0">
    <a href="/" class="px-2 py-1 rounded-lg text-[13px] text-slate-500 hover:text-indigo-500 border border-slate-200 dark:border-slate-700 transition" aria-label="홈으로">🏠</a>
    <ThemeToggle compact />
  </div>
</header>

  <!-- 본문: 좌측 사이드바 + 우측 콘텐츠 -->
  <div class="flex-1 flex overflow-hidden min-h-0">
    <!-- 🔹 데스크탑 / 태블릿용 고정 사이드바 -->
<aside class="hidden md:flex md:flex-col md:w-60 lg:w-64
             self-stretch
             border-r border-slate-200 dark:border-slate-800
             bg-white dark:bg-slate-950
             backdrop-blur">

  <div
    class="px-4 py-3 border-b border-slate-200 dark:border-slate-800
           space-y-2"
  >
    <div>
    <div class="flex items-center justify-between mb-1">
      <a href="/" class="text-[11px] text-slate-500 hover:text-indigo-500 transition">← 홈으로</a>
      <div class="flex items-center gap-1">
        <a href="/play/oracle" class="text-[11px] text-indigo-400 hover:underline">🔮 오라클</a>
        <ThemeToggle compact />
      </div>
    </div>
    <h1 class="text-xs font-semibold mb-0.5 tracking-tight">
      세계관 문서
    </h1>
      <p
        class="text-[10px] leading-snug text-slate-400 dark:text-slate-500
               max-w-[220px]"
      >
        인물·종족·나라·스토리 라인 등 세계관 문서를 한 곳에서 관리합니다.
      </p>
    </div>

    <!-- 🔹 세계 선택 바 -->
    <div class="flex items-center gap-2">
      <select
        class="flex-1 rounded-lg border border-slate-200 dark:border-slate-700
               bg-white/80 dark:bg-slate-900/60 px-2 py-1.5 text-[11px] outline-none
               focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500
               text-slate-700 dark:text-slate-100"
        bind:value={$currentWorldId}
      >
        {#each $worlds as w}
          <option value={w.id}>
            {w.emoji} {w.name}
          </option>
        {/each}
      </select>
      <button
        type="button"
        class="px-2 py-1 text-[11px] rounded-lg whitespace-nowrap
              text-slate-400 hover:text-slate-700 hover:bg-slate-100
              dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-800"
        on:click={handleRenameWorld}
      >
        이름
      </button>
      <button
        type="button"
        class="px-2.5 py-1 rounded-lg text-[11px] font-medium
               bg-indigo-500 text-white hover:bg-indigo-600 active:bg-indigo-700
               transition"
        on:click={handleCreateWorld}
      >
        ＋ 새 세계
      </button>
    </div>
  </div>

      <nav class="flex-1 overflow-y-auto py-2">
        <ul class="space-y-1 px-2">
          {#each NAV_ITEMS as item}
            <li>
              <button
                type="button"
                class={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs
                        text-left transition
                        ${
                          currentPath.startsWith(item.href)
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-100'
                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/50'
                        }`}
                on:click={() => go(item)}
              >
                <span class="text-base leading-none">{item.icon}</span>
                <span class="font-medium">{item.label}</span>
              </button>
            </li>
          {/each}
          <li class="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
            <p class="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">뷰</p>
          </li>
          {#each VIEW_ITEMS as v}
            <li>
              <button
                type="button"
                class={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition ${currentPath.startsWith(v.href) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-100' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/50'}`}
                on:click={() => goHref(v.href)}
              >
                <span class="text-base leading-none">{v.icon}</span>
                <span class="font-medium">{v.label}</span>
              </button>
            </li>
          {/each}
        <!-- ✅ 디버그 버튼: Drawer 안에 -->
        <li class="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs
                   text-left transition
                   text-slate-600 hover:bg-slate-50
                   dark:text-slate-300 dark:hover:bg-slate-900/50"
            on:click={() => { goto('/debug'); navOpen = false; }}
          >
            <span class="text-base">🛠️</span>
            <span class="font-medium">디버그</span>
          </button>
        </li>
        </ul>
      </nav>
    </aside>

    <!-- 🔹 오른쪽 실제 페이지(각 카테고리의 +page.svelte가 여기로 들어옴) -->
    <main class="flex-1 min-h-0 overflow-auto bg-slate-50 dark:bg-slate-900">
      <slot />
    </main>
  </div>

  <!-- 🔹 모바일용 Drawer (navOpen일 때만) -->
  {#if navOpen}
  <!-- 배경 오버레이 -->
  <button
    type="button"
    class="fixed inset-0 z-40 bg-black/40"
    on:click={() => (navOpen = false)}
    aria-label="메뉴 닫기 오버레이"
  ></button>
    <!-- 왼쪽에서 슬라이드되는 메뉴 -->
    <aside
      class="fixed inset-y-0 left-0 z-50 w-64 max-w-full
             border-r border-slate-200 dark:border-slate-800
             bg-white dark:bg-slate-950
             shadow-xl flex flex-col"
    >
      <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div class="flex flex-col">
          <span class="text-sm font-semibold">GENESIS · World</span>
          <span class="text-[11px] text-slate-400 dark:text-slate-500">
            카테고리를 선택하세요
          </span>
        </div>
        <button
          type="button"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
          on:click={() => (navOpen = false)}
        >
          ✕
        </button>
      </div>

      <!-- 🔹 세계 선택/관리 (앱바에서 이동) -->
      <div class="px-3 py-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <select
          class="w-full rounded-lg border border-slate-200 dark:border-slate-700
                 bg-white/80 dark:bg-slate-900/60 px-2 py-2 text-xs outline-none
                 focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500
                 text-slate-700 dark:text-slate-100"
          bind:value={$currentWorldId}
        >
          {#each $worlds as w}
            <option value={w.id}>{w.emoji} {w.name}</option>
          {/each}
        </select>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 px-2 py-1.5 rounded-lg text-[11px] border border-slate-200 dark:border-slate-700
                   text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition"
            on:click={handleRenameWorld}
          >
            이름 수정
          </button>
          <button
            type="button"
            class="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium
                   bg-indigo-500 text-white hover:bg-indigo-600 active:bg-indigo-700 transition"
            on:click={handleCreateWorld}
          >
            ＋ 새 세계
          </button>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto py-2">
        <ul class="space-y-1 px-2">
          {#each NAV_ITEMS as item}
            <li>
              <button
                type="button"
                class={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs
                        text-left transition
                        ${
                          currentPath.startsWith(item.href)
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-100'
                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/50'
                        }`}
                on:click={() => go(item)}
              >
                <span class="text-base leading-none">{item.icon}</span>
                <span class="font-medium">{item.label}</span>
              </button>
            </li>
          {/each}
          <li class="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
            <p class="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">뷰</p>
          </li>
          {#each VIEW_ITEMS as v}
            <li>
              <button
                type="button"
                class={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition ${currentPath.startsWith(v.href) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-100' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/50'}`}
                on:click={() => goHref(v.href)}
              >
                <span class="text-base leading-none">{v.icon}</span>
                <span class="font-medium">{v.label}</span>
              </button>
            </li>
          {/each}
        </ul>
        {#if import.meta.env.DEV}
          <li class="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs
                    text-left transition
                    text-slate-600 hover:bg-slate-50
                    dark:text-slate-300 dark:hover:bg-slate-900/50"
              on:click={() => { goto('/debug'); navOpen = false; }}
            >
              <span class="text-base">🛠️</span>
              <span class="font-medium">디버그</span>
            </button>
          </li>
        {/if}
      </nav>
    </aside>
  {/if}
</div>

<DrawHelper />
