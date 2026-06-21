<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  onMount(() => goto('/world/graph', { replaceState: true }));
</script>

<p class="p-6 text-sm text-muted">이동 중…</p>
