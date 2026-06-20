<script lang="ts">
  import { listDocs, listAllDocs } from '$lib/stores/docStore';
  import { currentSession } from '$lib/stores/sessionStore';
  import { gotoDoc } from '$lib/services/worldNav';
  import type { WorldDoc } from '$lib/domain/docs';
  import { browser } from '$app/environment';
  import { oracleTables } from '$lib/stores/oracleTables';

  /* ─────────────── 공통 ─────────────── */

  function d(n: number) { return Math.floor(Math.random() * n) + 1; }
  function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

  // 세션이 켜져 있으면 결과를 로그로 남김
  function logToSession(content: string) {
    if ($currentSession) {
      currentSession.addLog({ type: 'note', content: `🔮 ${content}` });
    }
  }

  /* ─────────────── 1. 예/아니오 오라클 ─────────────── */

  const LIKELIHOODS = [
    { label: '거의 확실함', p: 90 },
    { label: '가능성 높음', p: 75 },
    { label: '반반', p: 50 },
    { label: '가능성 낮음', p: 25 },
    { label: '희박함', p: 10 }
  ];

  let likelihood = LIKELIHOODS[2];
  let ynResult: { text: string; roll: number; twist: boolean } | null = null;

  function askOracle() {
    const roll = d(100);
    const p = likelihood.p;
    const yesZone = p;
    let text: string;

    if (roll <= yesZone) {
      // 예 구역: 앞 20%는 "그리고", 뒤 20%는 "하지만"
      if (roll <= yesZone * 0.2) text = '예, 그리고…';
      else if (roll > yesZone * 0.8) text = '예, 하지만…';
      else text = '예';
    } else {
      const noSize = 100 - yesZone;
      const inNo = roll - yesZone;
      if (inNo <= noSize * 0.2) text = '아니오, 하지만…';
      else if (inNo > noSize * 0.8) text = '아니오, 그리고…';
      else text = '아니오';
    }

    // 11의 배수 = 예외 발생 (약 9%) — 예상 밖의 전개가 끼어든다
    const twist = roll % 11 === 0;

    ynResult = { text, roll, twist };
    logToSession(`질문(${likelihood.label}) → ${text}${twist ? ' ⚡예외 발생' : ''} (d100=${roll})`);
  }

  /* ─────────────── 2. 씬 뽑기 ─────────────── */

  type SceneResult = {
    location: WorldDoc | null;
    character: WorldDoc | null;
    mood: string;
  };
  let scene: SceneResult | null = null;

  function rollScene() {
    const locs = listDocs('locations');
    const chars = listDocs('characters');
    scene = {
      location: locs.length ? pick(locs) : null,
      character: chars.length ? pick(chars) : null,
      mood: pick($oracleTables.moods)
    };
    logToSession(
      `씬: ${scene.mood} 「${scene.location?.title ?? '미지의 장소'}」에서 ${scene.character?.title ?? '낯선 인물'}와(과) 마주친다`
    );
  }

  /* ─────────────── 3. 전개 뽑기 ─────────────── */

  type EventResult = {
    focus: string;
    subject: WorldDoc | null;
    verb: string;
    noun: string;
  };
  let event: EventResult | null = null;

  function rollEvent() {
    const all = browser ? listAllDocs() : [];
    event = {
      focus: pick($oracleTables.eventFocus),
      subject: all.length ? pick(all) : null,
      verb: pick($oracleTables.sparkVerbs),
      noun: pick($oracleTables.sparkNouns)
    };
    logToSession(
      `전개: ${event.focus} — 관련: 「${event.subject?.title ?? '???'}」 / 단서: ${event.verb} · ${event.noun}`
    );
  }

  /* ─────────────── 단어 테이블 편집 ─────────────── */

  let editing = false;
  let editText = { moods: '', eventFocus: '', sparkVerbs: '', sparkNouns: '' };

  function openEditor() {
    editText = {
      moods: $oracleTables.moods.join('\n'),
      eventFocus: $oracleTables.eventFocus.join('\n'),
      sparkVerbs: $oracleTables.sparkVerbs.join('\n'),
      sparkNouns: $oracleTables.sparkNouns.join('\n')
    };
    editing = true;
  }

  function saveTables() {
    oracleTables.save({
      moods: editText.moods.split('\n'),
      eventFocus: editText.eventFocus.split('\n'),
      sparkVerbs: editText.sparkVerbs.split('\n'),
      sparkNouns: editText.sparkNouns.split('\n')
    });
    editing = false;
  }

  function resetTables() {
    if (!confirm('단어 테이블을 기본값으로 되돌릴까요?')) return;
    oracleTables.reset();
    editing = false;
  }

  function openDoc(doc: WorldDoc | null) {
    if (doc) gotoDoc(doc);
  }

  const cardCls = "rounded-2xl border border-line bg-surface p-5";
  const btnCls = "px-5 py-2.5 rounded-xl bg-primary hover:opacity-90 text-white text-sm font-bold transition";
  const docBtnCls = "text-primary hover:text-primary hover:underline font-bold";
</script>

<div class="max-w-2xl mx-auto space-y-6 pb-16">

  <!-- 1. 예/아니오 -->
  <section class={cardCls}>
    <h2 class="text-sm font-bold text-primary mb-1">❓ 예 / 아니오</h2>
    <p class="text-[11px] text-muted mb-4">질문을 떠올리고, 가능성을 고른 뒤 물어보세요. "그리고/하지만"은 답에 변수를 더합니다.</p>

    <div class="flex flex-wrap gap-2 mb-4">
      {#each LIKELIHOODS as lk}
        <button
          on:click={() => (likelihood = lk)}
          class="px-3 py-1.5 rounded-full text-xs border transition
                 {likelihood === lk
                   ? 'border-primary text-primary bg-primary/10'
                   : 'border-line text-muted hover:border-primary/40'}"
        >
          {lk.label}
        </button>
      {/each}
    </div>

    <button class={btnCls} on:click={askOracle}>운명에게 묻기</button>

    {#if ynResult}
      <div class="mt-4 rounded-xl border border-line bg-canvas/60 p-4">
        <p class="text-2xl font-bold text-ink">{ynResult.text}</p>
        <p class="text-[11px] text-muted mt-1">d100 = {ynResult.roll}</p>
        {#if ynResult.twist}
          <p class="mt-2 text-xs text-amber-400 font-bold">
            ⚡ 예외 발생! — 예상 밖의 일이 끼어듭니다. 아래 「전개 뽑기」를 굴려보세요.
          </p>
        {/if}
      </div>
    {/if}
  </section>

  <!-- 2. 씬 뽑기 -->
  <section class={cardCls}>
    <h2 class="text-sm font-bold text-primary mb-1">🎬 씬 뽑기</h2>
    <p class="text-[11px] text-muted mb-4">내 세계관의 장소와 인물을 무작위로 엮어 장면을 만듭니다.</p>

    <button class={btnCls} on:click={rollScene}>장면 생성</button>

    {#if scene}
      <div class="mt-4 rounded-xl border border-line bg-canvas/60 p-4 text-sm leading-relaxed text-ink">
        <span class="text-emerald-400">{scene.mood}</span>
        {#if scene.location}
          {@const loc = scene.location}
          <button class={docBtnCls} on:click={() => openDoc(loc)}>「{loc.title}」</button>에서,
        {:else}
          <span class="text-muted">「미지의 장소」</span>에서,
        {/if}
        {#if scene.character}
          {@const char = scene.character}
          <button class={docBtnCls} on:click={() => openDoc(char)}>{char.title}</button>와(과) 마주친다.
        {:else}
          <span class="text-muted">낯선 인물</span>와(과) 마주친다.
        {/if}
        {#if !scene.location || !scene.character}
          <p class="text-[11px] text-muted mt-2">※ 장소/인물 문서가 더 쌓이면 조합이 풍부해져요.</p>
        {/if}
      </div>
    {/if}
  </section>

  <!-- 3. 전개 뽑기 -->
  <section class={cardCls}>
    <h2 class="text-sm font-bold text-primary mb-1">🌀 전개 뽑기</h2>
    <p class="text-[11px] text-muted mb-4">이야기가 막혔을 때 — 사건의 방향, 관련 설정, 해석용 단서 두 개를 뽑습니다.</p>

    <button class={btnCls} on:click={rollEvent}>전개 굴리기</button>

    {#if event}
      <div class="mt-4 rounded-xl border border-line bg-canvas/60 p-4 space-y-2">
        <p class="text-lg font-bold text-ink">{event.focus}</p>
        <p class="text-sm text-muted">
          관련 설정:
          {#if event.subject}
            {@const subj = event.subject}
            <button class={docBtnCls} on:click={() => openDoc(subj)}>「{subj.title}」</button>
          {:else}
            <span class="text-muted">??? (문서가 없어요)</span>
          {/if}
        </p>
        <p class="text-sm text-muted">
          단서: <span class="text-amber-300 font-bold">{event.verb}</span>
          <span class="text-subtle">·</span>
          <span class="text-amber-300 font-bold">{event.noun}</span>
        </p>
        <p class="text-[11px] text-muted pt-1">세 조각을 엮어 해석하는 건 당신의 몫 — 그게 오라클의 규칙이에요.</p>
      </div>
    {/if}
  </section>

  <!-- 단어 테이블 편집 -->
  <section class={cardCls}>
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold text-primary">⚙️ 단어 테이블</h2>
      {#if !editing}
        <button class="text-xs text-primary hover:underline" on:click={openEditor}>편집</button>
      {/if}
    </div>

    {#if editing}
      <p class="text-[11px] text-muted mt-1 mb-3">한 줄에 한 단어씩. 비워두면 해당 칸은 기본값으로 돌아갑니다.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-[11px] font-bold text-muted mb-1">씬 분위기</label>
          <textarea bind:value={editText.moods} rows="8" class="w-full rounded-xl border border-line bg-field px-3 py-2 text-xs text-ink outline-none focus:border-primary"></textarea>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-muted mb-1">사건의 방향</label>
          <textarea bind:value={editText.eventFocus} rows="8" class="w-full rounded-xl border border-line bg-field px-3 py-2 text-xs text-ink outline-none focus:border-primary"></textarea>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-muted mb-1">단서 — 동사</label>
          <textarea bind:value={editText.sparkVerbs} rows="8" class="w-full rounded-xl border border-line bg-field px-3 py-2 text-xs text-ink outline-none focus:border-primary"></textarea>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-muted mb-1">단서 — 명사</label>
          <textarea bind:value={editText.sparkNouns} rows="8" class="w-full rounded-xl border border-line bg-field px-3 py-2 text-xs text-ink outline-none focus:border-primary"></textarea>
        </div>
      </div>
      <div class="flex gap-2 mt-3">
        <button class={btnCls} on:click={saveTables}>저장</button>
        <button class="px-4 py-2.5 rounded-xl border border-line text-muted text-sm hover:border-primary/40 transition" on:click={() => (editing = false)}>취소</button>
        <button class="ms-auto px-4 py-2.5 rounded-xl border border-rose-900 text-rose-400 text-sm hover:border-rose-600 transition" on:click={resetTables}>기본값 복원</button>
      </div>
    {:else}
      <p class="text-[11px] text-muted mt-1">
        분위기 {$oracleTables.moods.length} · 방향 {$oracleTables.eventFocus.length} · 동사 {$oracleTables.sparkVerbs.length} · 명사 {$oracleTables.sparkNouns.length}개 — 내 취향대로 갈아끼울 수 있어요.
      </p>
    {/if}
  </section>

  {#if $currentSession}
    <p class="text-center text-[11px] text-emerald-400">
      🟢 세션 「{$currentSession.title}」 진행 중 — 모든 결과가 세션 로그에 기록됩니다
    </p>
  {/if}
</div>
