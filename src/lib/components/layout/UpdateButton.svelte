<script lang="ts">
  import { onMount } from 'svelte';
  import { checkForUpdate, currentVersion, type UpdateState } from '$lib/services/appUpdate';

  export let compact = false;

  let state: UpdateState = { status: 'idle' };
  let version = '';

  onMount(async () => {
    version = await currentVersion();
  });

  async function run() {
    // 즉시 적용 (받으면 바로 새 버전으로 전환)
    state = await checkForUpdate(true, (s) => (state = s));
  }

  $: label =
    state.status === 'checking' ? '확인 중…'
    : state.status === 'downloading' ? '내려받는 중…'
    : state.status === 'ready' ? '적용됨! 재시작하세요'
    : state.status === 'latest' ? '최신 버전이에요'
    : state.status === 'error' ? `실패: ${state.message}`
    : '업데이트 확인';

  $: busy = state.status === 'checking' || state.status === 'downloading';
</script>

<button
  on:click={run}
  disabled={busy}
  class="{compact
    ? 'w-full px-3 py-2 text-xs'
    : 'w-full px-4 py-2.5 text-sm'} rounded-lg border border-line text-muted hover:border-primary hover:text-primary transition disabled:opacity-50 flex items-center justify-between gap-2"
>
  <span>⬆ {label}</span>
  {#if version && !busy}
    <span class="text-[10px] text-subtle">{version}</span>
  {/if}
</button>
