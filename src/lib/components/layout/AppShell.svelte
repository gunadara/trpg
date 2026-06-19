<!--
  AppShell.svelte — 레이아웃 전용 셸 (기능 없음)
  ────────────────────────────────────────────────
  세계관(world) 레이아웃의 "안 깨지는 비율 골격"만 뽑아 일반화한 것.
  - min-h-0 사슬: 페이지가 늘어나지 않고 안쪽 콘텐츠만 스크롤 → 비율 안 깨짐
  - 모바일 앱바 + 드로어 / 데스크탑 사이드바(옵션) + 꽉 채우는 main
  - 색은 tone prop으로만 분기 (구조는 동일). 기능/로직은 슬롯으로 받는 콘텐츠가 담당.

  사용:
    <AppShell title="🔮 오라클" subtitle="GM 없는 판정" tone="dark">
      <a slot="actions" href="/play">세션으로</a>
      <MyFeature />            // 기능은 여기 (셸은 안 건드림)
    </AppShell>

  사이드바가 필요하면 navItems를 넘기면 됨 (없으면 사이드바 자체가 사라짐).
-->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import ThemeToggle from '$lib/components/layout/ThemeToggle.svelte';

  export let title: string;
  export let subtitle: string | undefined = undefined;
  export let homeHref = '/';
  /** 사이드바 메뉴. 비어 있으면 사이드바/드로어를 숨기고 단순 헤더만 둠 */
  export let navItems: { href: string; icon: string; label: string }[] = [];
  /** 색 톤만 분기 (구조는 동일). 'auto' = 라이트+다크 테마인식, 'dark' = 다크 고정 */
  export let tone: 'auto' | 'dark' = 'auto';
  /** main 안쪽 여백. 기본은 0(흰 테두리 없이 꽉 차게). 필요할 때만 true */
  export let pad = false;
  /** 테마 토글 버튼 노출 여부 */
  export let showThemeToggle = true;

  let navOpen = false;
  $: hasNav = navItems.length > 0;
  $: currentPath = $page.url.pathname;
  function go(href: string) {
    goto(href);
    navOpen = false;
  }

  // 톤별 표면 클래스 (전부 리터럴이라 Tailwind가 스캔 가능)
  $: t =
    tone === 'dark'
      ? {
          root: 'bg-slate-950 text-slate-100',
          border: 'border-slate-800',
          bar: 'border-slate-800 bg-slate-900/80',
          side: 'border-slate-800 bg-slate-900/40',
          sub: 'text-slate-500',
          navIdle: 'text-slate-300 hover:bg-slate-800/60',
          navActive: 'bg-indigo-600/20 text-indigo-100',
          burger: 'bg-slate-100',
          link: 'text-slate-400 hover:text-indigo-300'
        }
      : {
          root: 'bg-canvas text-ink',
          border: 'border-line',
          bar: 'border-line bg-surface/80',
          side: 'border-line bg-surface',
          sub: 'text-subtle',
          navIdle: 'text-muted hover:bg-black/5 dark:hover:bg-white/5',
          navActive: 'bg-primary/10 text-primary',
          burger: 'bg-ink',
          link: 'text-muted hover:text-primary'
        };
</script>

<div class="min-h-[100dvh] flex flex-col {t.root}">
  <!-- 🔹 모바일 앱바 (md 미만) -->
  <header class="md:hidden flex items-center justify-between px-3 py-2 border-b backdrop-blur {t.bar}">
    <div class="flex items-center gap-2 min-w-0">
      {#if hasNav}
        <button
          type="button"
          class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
          on:click={() => (navOpen = true)}
          aria-label="메뉴 열기"
        >
          <div class="w-5 h-[2px] mb-1 {t.burger}"></div>
          <div class="w-4 h-[2px] mb-1 {t.burger}"></div>
          <div class="w-6 h-[2px] {t.burger}"></div>
        </button>
      {:else}
        <a href={homeHref} class="px-2 py-1 rounded-lg text-sm {t.link}">←</a>
      {/if}
      <div class="flex flex-col min-w-0">
        <span class="text-sm font-semibold truncate">{title}</span>
        {#if subtitle}<span class="text-[10px] truncate {t.sub}">{subtitle}</span>{/if}
      </div>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
      {#if showThemeToggle}<ThemeToggle compact />{/if}
    </div>
  </header>

  <!-- 🔹 본문: (사이드바) + 메인 -->
  <div class="flex-1 flex overflow-hidden min-h-0">
    <!-- 데스크탑 사이드바 -->
    {#if hasNav}
      <aside class="hidden md:flex md:flex-col md:w-60 lg:w-64 self-stretch border-r {t.side}">
        <div class="px-4 py-3 border-b {t.border} space-y-2">
          <a href={homeHref} class="text-[11px] transition {t.link}">← 홈으로</a>
          <div>
            <h1 class="text-xs font-semibold tracking-tight">{title}</h1>
            {#if subtitle}<p class="text-[10px] leading-snug mt-0.5 max-w-[220px] {t.sub}">{subtitle}</p>{/if}
          </div>
          <slot name="sidebar-top" />
        </div>
        <nav class="flex-1 overflow-y-auto py-2">
          <ul class="space-y-1 px-2">
            {#each navItems as item}
              <li>
                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition {currentPath.startsWith(item.href) ? t.navActive : t.navIdle}"
                  on:click={() => go(item.href)}
                >
                  <span class="text-base leading-none">{item.icon}</span>
                  <span class="font-medium">{item.label}</span>
                </button>
              </li>
            {/each}
          </ul>
        </nav>
      </aside>
    {/if}

    <!-- 데스크탑 헤더 + 메인 -->
    <div class="flex-1 min-h-0 flex flex-col">
      <header class="hidden md:flex items-center justify-between px-4 py-2.5 border-b backdrop-blur {t.bar}">
        <div class="flex items-center gap-3 min-w-0">
          {#if !hasNav}
            <a href={homeHref} class="text-sm transition {t.link}">← 홈으로</a>
          {/if}
          <h2 class="text-sm font-semibold truncate">
            {title}{#if subtitle}<span class="ms-2 text-xs font-normal {t.sub}">{subtitle}</span>{/if}
          </h2>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <slot name="actions" />
          {#if showThemeToggle}<ThemeToggle />{/if}
        </div>
      </header>

      <main class="flex-1 min-h-0 overflow-auto {pad ? 'p-3 md:p-4' : ''}">
        <slot />
      </main>
    </div>
  </div>

  <!-- 🔹 모바일 드로어 -->
  {#if hasNav && navOpen}
    <button
      type="button"
      class="fixed inset-0 z-40 bg-black/40"
      on:click={() => (navOpen = false)}
      aria-label="메뉴 닫기"
    ></button>
    <aside class="fixed inset-y-0 left-0 z-50 w-64 max-w-[80%] border-r shadow-xl flex flex-col {t.side}">
      <div class="px-4 py-3 border-b flex items-center justify-between {t.border}">
        <span class="text-sm font-semibold truncate">{title}</span>
        <button
          type="button"
          class="p-1.5 rounded-lg {t.link}"
          on:click={() => (navOpen = false)}
        >
          ✕
        </button>
      </div>
      <nav class="flex-1 overflow-y-auto py-2">
        <ul class="space-y-1 px-2">
          {#each navItems as item}
            <li>
              <button
                type="button"
                class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition {currentPath.startsWith(item.href) ? t.navActive : t.navIdle}"
                on:click={() => go(item.href)}
              >
                <span class="text-base leading-none">{item.icon}</span>
                <span class="font-medium">{item.label}</span>
              </button>
            </li>
          {/each}
        </ul>
      </nav>
    </aside>
  {/if}
</div>
