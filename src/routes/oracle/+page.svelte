<script lang="ts">
  import { onMount } from 'svelte';
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import Oracle from '$lib/features/play/Oracle.svelte';
  import { currentSession } from '$lib/stores/sessionStore';
  import { oracleTables } from '$lib/stores/oracleTables';

  // 진행 중이던 세션이 있으면 불러오기 (오라클 결과를 로그에 잇기 위해)
  onMount(() => {
    currentSession.load();
    oracleTables.load();
  });
</script>

<!-- 레이아웃은 AppShell이, 기능은 <Oracle />가 담당 -->
<AppShell title="🔮 오라클" subtitle="GM 없는 판정" tone="auto">
  <a slot="actions" href="/play" class="text-xs text-primary hover:underline">🎲 세션으로</a>
  <Oracle />
</AppShell>
