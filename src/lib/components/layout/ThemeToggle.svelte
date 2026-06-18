<!-- 라이트/다크 전환 버튼 (어느 헤더에서나 재사용) -->
<script lang="ts">
  import { theme, toggleTheme } from '$lib/stores/theme';
  export let compact = false; // true면 더 작게 (모바일 앱바용)
</script>

<button
  type="button"
  on:click={toggleTheme}
  class="rounded-lg text-slate-500 hover:text-indigo-500 hover:bg-black/5
         dark:text-slate-300 dark:hover:text-indigo-200 dark:hover:bg-white/10 transition
         {compact ? 'p-1.5 text-sm' : 'p-2'}"
  aria-label={$theme === 'dark' ? '라이트 모드로' : '다크 모드로'}
  title={$theme === 'dark' ? '라이트 모드로' : '다크 모드로'}
>
  {#if $theme === 'dark'}☀️{:else}🌙{/if}
</button>
