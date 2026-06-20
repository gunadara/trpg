<script lang="ts">
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import { listDocs } from '$lib/stores/docStore';
  import Timeline from '$lib/features/world/visualizer/Timeline.svelte';
  import { gotoDoc } from '$lib/services/worldNav';
  import { browser } from '$app/environment';

  // 사건 문서만 가져오기
  $: eventDocs = browser ? listDocs('events') : [];

  function handleEventClick(id: string) {
    const doc = eventDocs.find((d) => d.id === id);
    if (doc) gotoDoc(doc);
  }
</script>

<!-- 레이아웃은 AppShell(테마인식), 기능은 <Timeline /> -->
<AppShell title="📜 세계관 연표" subtitle="Timeline" tone="auto">
  <span slot="actions" class="text-xs text-muted whitespace-nowrap">총 {eventDocs.length}개의 사건</span>

  <div class="p-4 md:p-6">
    <Timeline docs={eventDocs} onEventClick={handleEventClick} />
  </div>
</AppShell>
