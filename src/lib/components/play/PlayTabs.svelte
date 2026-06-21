<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import ThemeToggle from '$lib/components/layout/ThemeToggle.svelte';

  $: path = $page.url.pathname;

  const TABS = [
    { href: '/play/journal', icon: '📖', label: '저널' },
    { href: '/play/oracle', icon: '🔮', label: '오라클' },
    { href: '/play', icon: '⚔️', label: '전투' }
  ];

  // 전투(/play)는 정확히 일치할 때만 활성 (하위 경로가 저널/오라클이므로)
  function isActive(href: string): boolean {
    if (href === '/play') return path === '/play';
    return path.startsWith(href);
  }
</script>

<div class="shrink-0 flex items-center gap-1 px-2 md:px-3 h-12 border-b border-line bg-surface">
  <a href="/" class="px-2 py-1.5 text-muted hover:text-primary transition text-base shrink-0" title="홈">🏠</a>
  <div class="w-px h-5 bg-line mx-1 shrink-0"></div>

  <nav class="flex items-center gap-1 overflow-x-auto no-scrollbar">
    {#each TABS as t}
      <button
        on:click={() => goto(t.href)}
        class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5
               {isActive(t.href) ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-bubble'}"
      >
        <span>{t.icon}</span><span>{t.label}</span>
      </button>
    {/each}
  </nav>

  <div class="ms-auto shrink-0">
    <ThemeToggle />
  </div>
</div>
