<script lang="ts">
  import PlayTabs from '$lib/components/play/PlayTabs.svelte';
</script>

<!-- 플레이 묶음 셸: 상단 탭바(저널·오라클·전투) + 본문 -->
<div class="h-[100dvh] flex flex-col bg-canvas overflow-hidden">
  <PlayTabs />
  <div class="flex-1 min-h-0 overflow-hidden">
    <slot />
  </div>
</div>
