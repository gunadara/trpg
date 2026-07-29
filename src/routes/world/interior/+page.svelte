<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import InteriorEditor from '$lib/features/world/interior/InteriorEditor.svelte';
  import { emptyBuilding, type Building } from '$lib/features/world/interior/types';

  const KEY = 'interiorDraft';
  let building: Building = emptyBuilding();
  let loaded = false;

  onMount(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) building = JSON.parse(raw);
    } catch {}
    loaded = true;
  });

  function handleChange(b: Building) {
    building = b;
    if (!browser) return;
    try { localStorage.setItem(KEY, JSON.stringify(b)); } catch {}
  }

  function newBuilding() {
    if (!confirm('새 건물을 시작할까요? 지금 도면은 사라져요 (내보내기로 저장할 수 있어요)')) return;
    building = emptyBuilding();
    handleChange(building);
  }
</script>

<div class="h-full flex flex-col">
  <div class="px-3 md:px-4 py-2.5 bg-surface/60 border-b border-line flex items-center justify-between gap-3 shrink-0">
    <span class="text-xs font-bold text-ink">🏠 실내 도면</span>
    <button
      on:click={newBuilding}
      class="px-3 py-1.5 rounded-lg text-xs font-bold border border-line text-muted hover:border-primary hover:text-primary transition"
    >+ 새 건물</button>
  </div>

  <div class="flex-1 min-h-0">
    {#if loaded}
      <InteriorEditor {building} onChange={handleChange} />
    {/if}
  </div>
</div>
