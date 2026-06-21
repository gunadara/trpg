<script lang="ts">
  import { listDocs } from '$lib/stores/docStore';
  import Timeline from '$lib/features/world/visualizer/Timeline.svelte';
  import { gotoDoc } from '$lib/services/worldNav';
  import { browser } from '$app/environment';

  // 사건 문서만 시간축으로
  $: eventDocs = browser ? listDocs('events') : [];

  function handleEventClick(id: string) {
    const doc = eventDocs.find((d) => d.id === id);
    if (doc) gotoDoc(doc);
  }
</script>

<!-- world 레이아웃(사이드바/헤더)이 셸 역할 → 여기선 콘텐츠만 -->
<div class="p-4 md:p-6">
  <div class="max-w-2xl mx-auto mb-4 flex items-end justify-between">
    <div>
      <h1 class="text-lg font-bold text-ink">📜 연표</h1>
      <p class="text-xs text-muted">시간 흐름으로 보는 사건</p>
    </div>
    <span class="text-xs text-muted whitespace-nowrap">총 {eventDocs.length}개</span>
  </div>

  <Timeline docs={eventDocs} onEventClick={handleEventClick} />
</div>
