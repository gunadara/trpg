<script lang="ts">
  import type { WorldDoc } from '$lib/domain/docs';

  export let docs: WorldDoc[] = [];           // 사건(events) 문서들
  export let onEventClick: (id: string) => void = () => {};

  // 사건 유형별 아이콘 (EventEditor의 type과 대응)
  const TYPE_ICON: Record<string, string> = {
    war: '⚔️', incident: '🔥', conspiracy: '🕯️',
    disaster: '🌊', festival: '🎉', discovery: '🔍'
  };

  // 규모별 강조 색 (EventEditor의 scale과 대응)
  const SCALE_STYLE: Record<string, string> = {
    personal: 'border-slate-600 text-slate-400',
    local: 'border-sky-700 text-sky-400',
    national: 'border-amber-700 text-amber-400',
    world: 'border-rose-700 text-rose-400'
  };
  const SCALE_LABEL: Record<string, string> = {
    personal: '개인', local: '지역', national: '국가', world: '세계'
  };

  type TimelineEvent = {
    doc: WorldDoc;
    sortYear: number | null;
    icon: string;
    scaleCls: string;
    scaleLabel: string;
    dateLabel: string;
  };

  function toEvent(doc: WorldDoc): TimelineEvent {
    const a = (doc.attributes ?? {}) as Record<string, any>;
    const raw = a.sortYear;
    const sortYear =
      typeof raw === 'number' && !Number.isNaN(raw) ? raw :
      typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw)) ? Number(raw) :
      null;

    const start = (a.startDate ?? '').toString().trim();
    const end = (a.endDate ?? '').toString().trim();
    const dateLabel = start && end ? `${start} ~ ${end}` : (start || end || '');

    return {
      doc,
      sortYear,
      icon: TYPE_ICON[a.type] ?? '📌',
      scaleCls: SCALE_STYLE[a.scale] ?? SCALE_STYLE.personal,
      scaleLabel: SCALE_LABEL[a.scale] ?? '',
      dateLabel
    };
  }

  $: events = docs.map(toEvent);
  $: dated = events
    .filter(e => e.sortYear !== null)
    .sort((a, b) => (a.sortYear! - b.sortYear!));
  $: undated = events.filter(e => e.sortYear === null);
</script>

<div class="max-w-2xl mx-auto pb-16">

  {#if dated.length === 0 && undated.length === 0}
    <div class="h-64 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl text-sm">
      아직 기록된 사건이 없습니다. 사건 문서를 작성해 보세요!
    </div>
  {/if}

  <!-- 시간순 연표 -->
  {#if dated.length > 0}
    <ol class="relative border-s-2 border-slate-800 ms-4">
      {#each dated as ev, i (ev.doc.id)}
        <li class="mb-8 ms-6">
          <!-- 스파인 위의 점 -->
          <span class="absolute flex items-center justify-center w-8 h-8 rounded-full -start-4 bg-slate-900 border-2 {ev.scaleCls.split(' ')[0]} text-base">
            {ev.icon}
          </span>

          <!-- 연도 표시 (이전 사건과 연도가 다를 때만) -->
          {#if i === 0 || dated[i - 1].sortYear !== ev.sortYear}
            <div class="text-xs font-bold text-indigo-400 mb-1.5 tracking-wider">
              {ev.sortYear}년
            </div>
          {/if}

          <!-- 사건 카드 -->
          <button
            on:click={() => onEventClick(ev.doc.id)}
            class="w-full text-left rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-indigo-600 hover:bg-slate-900 transition p-4 group"
          >
            <div class="flex items-center justify-between gap-2 mb-1">
              <h3 class="font-bold text-slate-100 group-hover:text-indigo-300 transition text-sm">
                {ev.doc.title || '제목 없는 사건'}
              </h3>
              {#if ev.scaleLabel}
                <span class="shrink-0 text-[10px] px-2 py-0.5 rounded-full border {ev.scaleCls}">
                  {ev.scaleLabel}
                </span>
              {/if}
            </div>

            {#if ev.dateLabel}
              <p class="text-[11px] text-slate-500 mb-1.5">🗓 {ev.dateLabel}</p>
            {/if}

            {#if ev.doc.summary}
              <p class="text-xs text-slate-400 leading-relaxed line-clamp-2">{ev.doc.summary}</p>
            {/if}
          </button>
        </li>
      {/each}
    </ol>
  {/if}

  <!-- 시기 미정 사건 -->
  {#if undated.length > 0}
    <div class="mt-10">
      <h2 class="text-xs font-bold text-slate-500 tracking-wider mb-3 ms-2">
        🌫 시기 미정 — 사건 문서에 「정렬 연도」를 입력하면 연표에 배치됩니다
      </h2>
      <div class="space-y-2">
        {#each undated as ev (ev.doc.id)}
          <button
            on:click={() => onEventClick(ev.doc.id)}
            class="w-full text-left rounded-xl border border-dashed border-slate-800 bg-slate-900/40 hover:border-slate-600 transition px-4 py-3 flex items-center gap-3"
          >
            <span class="text-base">{ev.icon}</span>
            <span class="text-sm text-slate-300">{ev.doc.title || '제목 없는 사건'}</span>
            {#if ev.dateLabel}
              <span class="text-[11px] text-slate-600 ms-auto shrink-0">{ev.dateLabel}</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
