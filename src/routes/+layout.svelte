<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores'; // ✅ (1) 이거 추가

  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import { initWorldDatabase } from '$lib/services/sqlite';

  import type { CategoryId } from '$lib/domain/categories';
import { CATEGORY_META, WORLD_CATEGORY_IDS } from '$lib/domain/categories';
import { CATEGORY_ROUTE } from '$lib/services/worldNav';

  type NavItem = {
    icon: string;
    label: string;
    href: string;
  };

  const navItems: NavItem[] = [
    { icon: '🌏', label: '세계관 관리', href: '/world' },
    { icon: '📜', label: '세계관 연표', href: '/timeline' },
    { icon: '🕸️', label: '관계도', href: '/visualizer' },
    { icon: '🎲', label: '세션 플레이', href: '/play' },
    { icon: '🔮', label: '오라클', href: '/oracle' }
  ];

const WORLD_ITEMS: NavItem[] = WORLD_CATEGORY_IDS.map((id) => ({
  icon: CATEGORY_META[id].icon,
  label: CATEGORY_META[id].label,
  href: CATEGORY_ROUTE[id]
}));


  // ✅ (2) 현재 경로가 /world 아래인지 판별 (이거 추가)
  $: inWorld = $page.url.pathname.startsWith('/world');
  $: inPlay = $page.url.pathname.startsWith('/play'); // ✅ 추가

  let drawerOpen = false;
  const toggleDrawer = () => (drawerOpen = !drawerOpen);
  const closeDrawer = () => (drawerOpen = false);

  onMount(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (isDark: boolean) => {
      document.documentElement.classList.toggle('dark', isDark);
    };
    apply(mq.matches);

    const handler = (event: MediaQueryListEvent) => apply(event.matches);
    mq.addEventListener('change', handler);

    initWorldDatabase().catch((err) => console.error('[SQLite] init error', err));
    return () => mq.removeEventListener('change', handler);
  });
</script>


<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>


{#if inWorld || inPlay}
 <div class="min-h-[100dvh] bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-50">
    <slot />
  </div>
{:else}
  <div class="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-50">
    <!-- 좌측 고정 사이드바 (md 이상) -->
    <aside class="hidden md:flex md:flex-col md:w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/40 backdrop-blur">
      <div class="h-16 px-4 flex items-center border-b border-slate-200 dark:border-slate-800">
        <span class="text-lg font-semibold tracking-wide">
          GENESIS<span class="text-indigo-400">.MVP</span>
        </span>
      </div>


      <nav class="flex-1 overflow-y-auto py-4">
        <ul class="space-y-1">
          {#each navItems as item}
            <li>
              <a
                href={item.href}
                class="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                       hover:bg-indigo-100 hover:text-indigo-700
                       dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200 transition-colors"
              >
                <span class="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </aside>

    <!-- 우측 영역 -->
    <div class="flex-1 flex flex-col">
      <!-- 상단 앱바 (모바일 전용) -->
      <header class="md:hidden h-14 px-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 backdrop-blur">
        <button
          type="button"
          class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          on:click={toggleDrawer}
          aria-label="메뉴 열기"
        >
          <div class="w-5 h-[2px] bg-slate-800 dark:bg-slate-100 mb-1"></div>
          <div class="w-4 h-[2px] bg-slate-800 dark:bg-slate-100 mb-1"></div>
          <div class="w-6 h-[2px] bg-slate-800 dark:bg-slate-100"></div>
        </button>

        <div class="flex flex-col">
          <span class="text-base font-semibold leading-tight">
            GENESIS<span class="text-indigo-400">.MVP</span>
          </span>
          <span class="text-[11px] text-slate-500 dark:text-slate-400">
            세계관 설정 정리 앱
          </span>
        </div>

        <div class="w-8" aria-hidden="true"></div>
      </header>

      <!-- 모바일 드로어 -->
      {#if drawerOpen}
        <div class="fixed inset-0 z-40 flex md:hidden">
          <div class="w-72 max-w-[80%] h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl">
            <div class="h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <span class="text-sm font-semibold">GENESIS 메뉴</span>
              <button
                type="button"
                class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                on:click={closeDrawer}
                aria-label="메뉴 닫기"
              >
                ✕
              </button>
            </div>


            <nav class="py-3 overflow-y-auto">
              <ul class="space-y-1">
                {#each navItems as item}
                  <li>
                    <a
                      href={item.href}
                      class="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                             hover:bg-indigo-100 hover:text-indigo-700
                             dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200 transition-colors"
                      on:click={closeDrawer}
                    >
                      <span class="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
                  </li>
                {/each}
              </ul>
            </nav>
          </div>

          
          <!-- ✅ 이 오버레이 버튼은 그대로가 맞음 -->
          <button
            type="button"
            class="flex-1 bg-black/40"
            on:click={closeDrawer}
            aria-label="메뉴 닫기"
          ></button>
        </div>
      {/if}
      
      <main class="flex-1 px-4 py-4 md:px-8 md:py-6">
        <slot />
      </main>
    </div>
  </div>
{/if}