<script lang="ts">
  import { onMount } from 'svelte';
  import Oracle from '$lib/features/play/Oracle.svelte';
  import { currentSession } from '$lib/stores/sessionStore';
  import { oracleTables } from '$lib/stores/oracleTables';

  // 진행 중이던 세션이 있으면 불러오기 (오라클 결과를 로그에 잇기 위해)
  onMount(() => {
    currentSession.load();
    oracleTables.load();
  });
</script>

<!-- 탭바가 셸 → 여기선 오라클 본문만 -->
<div class="h-full overflow-y-auto">
  <Oracle />
</div>
