<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import SaveIndicator from '$lib/components/edit/SaveIndicator.svelte';
  import { saveStatus } from '$lib/stores/saveStatus';
  import StatChart from './StatChart.svelte';
  import StatExport from './StatExport.svelte';
  import SaveToCharacter from './SaveToCharacter.svelte';
  import {
    inventoryStore, scoreInventory, parseAnyInventory, labelsOf, LIKERT_LABELS, IMPORT_HELP, INVENTORY_TEMPLATE,
    type Answers, type Likert
  } from '$lib/stores/inventoryStore';

  onMount(() => {
    inventoryStore.load();
    // 앱을 내리거나 탭을 가릴 때 남은 저장을 밀어넣는다
    const flush = () => inventoryStore.flush();
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  });
  onDestroy(() => { inventoryStore.flush(); saveStatus.reset(); });

  $: invs = $inventoryStore?.inventories ?? [];
  let invId: string | null = null;
  $: if (!invId && invs.length > 0) invId = invs[0].id;
  $: inv = invs.find((v) => v.id === invId) ?? null;

  let answers: Answers = {};
  let showResult = false;
  let editing = false;
  function pickInv(id: string) { invId = id; answers = {}; showResult = false; editing = false; page = 0; }
  function goPage(p: number) {
    page = Math.max(0, Math.min(pageCount - 1, p));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // JSON 형식 안내 접기
  let jsonHelpOpen = false;

  // 기본 제공은 못 고치니, 고치려 하면 사본을 떠서 그쪽으로 옮긴다
  function editable(): string | null {
    if (!inv) return null;
    if (!inv.builtin) return inv.id;
    const copy = inventoryStore.duplicate(inv.id);
    pickInv(copy); editing = true;
    return copy;
  }
  function startEdit() { const id = editable(); if (id) editing = true; }

  function answer(i: number, v: number | null) { answers = { ...answers, [i]: v }; }
  $: answeredCount = inv ? inv.items.filter((_, i) => answers[i] !== undefined).length : 0;
  $: scored = inv && showResult ? scoreInventory(inv, answers) : null;
  $: chartItems = scored ? scored.results.filter((r) => !r.empty).map((r) => ({ label: r.label, value: r.value })) : [];
  $: unknownNote = scored && scored.unknown.length > 0
    ? `아직 안 정해진 것 ${scored.unknown.length}개:\n- ${scored.unknown.join('\n- ')}`
    : '';

  // 요소 추가 입력
  // 문항이 많으면 페이지로 나눈다
  const PAGE = 10;
  let page = 0;
  $: pageCount = inv ? Math.max(1, Math.ceil(inv.items.length / PAGE)) : 1;
  $: if (page >= pageCount) page = pageCount - 1;
  $: pageStart = page * PAGE;
  $: pageItems = inv ? inv.items.slice(pageStart, pageStart + PAGE) : [];
  $: paged = (inv?.items.length ?? 0) > PAGE;
  // 이 페이지를 다 답했는지
  $: pageDone = pageItems.every((_, k) => answers[pageStart + k] !== undefined);

  let factorInput = '';
  function addFactor() {
    const id = editable();
    if (!id || !factorInput.trim()) return;
    inventoryStore.addFactor(id, factorInput);
    factorInput = '';
  }

  // 공유
  let exported = false;
  async function exportInv() {
    if (!inv) return;
    const { id: _i, builtin: _b, ...share } = inv as any;
    try {
      await navigator.clipboard.writeText(JSON.stringify(share, null, 2));
      exported = true; setTimeout(() => (exported = false), 1800);
    } catch {}
  }

  // 불러오기 — 파일로도, 붙여넣기로도
  let importOpen = false;
  let importText = '';
  let importError = '';
  let importNote = '';
  let fileEl: HTMLInputElement;

  function takeText(text: string, name: string) {
    const r = parseAnyInventory(text, name);
    if (!r.ok) { importError = r.error; importNote = ''; return; }
    const id = inventoryStore.add(r.inv);
    importError = ''; importText = '';
    importNote = r.note;
    importOpen = false;
    pickInv(id);
    editing = true;   // 읽은 뒤 바로 손볼 수 있게
  }

  function doImport() { takeText(importText, '붙여넣은 검사지'); }

  async function onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      takeText(text, f.name.replace(/\.[^.]+$/, ''));
    } catch {
      importError = '파일을 읽을 수 없어요.';
    }
    input.value = '';
  }
</script>

<div class="max-w-2xl mx-auto p-6 space-y-5">

  <!-- 검사지 고르기 -->
  <section class="rounded-2xl border border-line bg-surface/60 p-5">
    <h2 class="text-sm font-bold text-primary mb-3">📋 검사지</h2>

    <div class="flex flex-wrap gap-1.5 mb-3">
      {#each invs as v (v.id)}
        <button on:click={() => pickInv(v.id)}
          class="px-3 py-1.5 rounded-lg border text-xs transition
                 {invId === v.id ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted hover:text-ink'}">
          {v.name} <span class="text-subtle">({v.items.length})</span>{#if v.done}<span class="text-emerald-400 ms-0.5">✓</span>{:else if !v.builtin}<span class="text-amber-400/70 ms-0.5">…</span>{/if}
        </button>
      {/each}
      <button on:click={() => { const n = prompt('새 검사지 이름 (예: 내 캐릭터 성격 검사)'); if (n && n.trim()) { pickInv(inventoryStore.create(n)); editing = true; } }}
        class="px-3 py-1.5 rounded-lg text-xs border border-dashed border-line text-muted hover:border-primary hover:text-primary">
        ＋ 새로 만들기
      </button>
    </div>

    {#if inv}
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button on:click={editing ? () => (editing = false) : startEdit}
          class="text-[11px] {editing ? 'text-amber-300' : 'text-primary'} hover:underline">
          {editing ? '✓ 편집 끝내기' : '✎ 문항 편집'}
        </button>
        <button on:click={exportInv} class="text-[11px] text-emerald-400 hover:underline">
          {exported ? '✓ 복사됨' : '🔗 공유용 코드 복사'}
        </button>
        <button on:click={() => (importOpen = !importOpen)} class="text-[11px] text-subtle hover:text-ink">
          공유받은 코드 넣기
        </button>
        {#if !inv.builtin}
          <button on:click={() => { if (inv && confirm(`「${inv.name}」 삭제할까요?`)) { inventoryStore.remove(inv.id); invId = null; } }}
            class="text-[11px] text-subtle hover:text-rose-400">삭제</button>
        {/if}
      </div>

      {#if inv.builtin}
        <p class="text-[10px] text-subtle mt-2">
          기본 제공 검사지예요. 고치면 원본은 두고 내 사본이 만들어져요.
        </p>
      {/if}
      {#if inv.desc}
        <p class="text-[11px] text-muted mt-2">{inv.desc}</p>
      {/if}
    {/if}

    {#if importOpen}
      <div class="rounded-xl border border-line bg-canvas/60 p-3 space-y-2 mt-3">
        <p class="text-[11px] text-muted">파일에서 가져오거나, 아래에 직접 붙여넣으세요.</p>

        <input type="file" accept=".json,.txt,.md,.csv,.tsv,text/plain,application/json"
          bind:this={fileEl} on:change={onFile} class="hidden" />
        <button on:click={() => fileEl.click()}
          class="w-full py-2.5 rounded-xl border border-dashed border-line text-xs text-muted hover:border-primary hover:text-primary">
          📄 파일 고르기 (txt · md · csv · tsv · json)
        </button>

        <textarea bind:value={importText} rows="5" placeholder="또는 여기에 붙여넣기"
          class="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-[11px] outline-none focus:border-primary"></textarea>
        {#if importError}<p class="text-[11px] text-rose-400">{importError}</p>{/if}
        <button on:click={doImport} class="px-3 py-1.5 rounded-lg bg-primary text-ink text-xs font-bold">넣기</button>

        <pre class="text-[10px] text-subtle whitespace-pre-wrap leading-relaxed mt-1">{IMPORT_HELP}</pre>

        <button on:click={() => (jsonHelpOpen = !jsonHelpOpen)}
          class="text-[11px] text-primary hover:underline">
          {jsonHelpOpen ? '▾' : '▸'} JSON 형식으로 넣기 (AI에게 시킬 때)
        </button>
        {#if jsonHelpOpen}
          <div class="space-y-1.5">
            <p class="text-[10px] text-subtle leading-relaxed">
              AI에게 "아래 형식의 JSON으로 성격 검사지를 만들어줘"라고 하면서 이 틀을 같이 주면 돼요.
              reverse는 그렇다고 답할수록 그 요소가 낮아지는 문항에 붙여요.
            </p>
            <pre class="text-[10px] text-muted whitespace-pre-wrap font-mono bg-canvas rounded-lg border border-line p-2 max-h-52 overflow-auto">{INVENTORY_TEMPLATE}</pre>
            <button on:click={() => navigator.clipboard?.writeText(INVENTORY_TEMPLATE)}
              class="text-[11px] text-emerald-400 hover:underline">📋 형식 복사</button>
          </div>
        {/if}
      </div>
    {/if}

    {#if importNote}
      <p class="text-[11px] text-emerald-400 mt-2">✓ {importNote}</p>
    {/if}
  </section>

  {#if inv && editing}
    <!-- 만들기 / 고치기 -->
    <section class="rounded-2xl border border-amber-600/40 bg-surface/40 p-4 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <button on:click={() => { if (inv) { const n = prompt('검사지 이름', inv.name); if (n && n.trim()) inventoryStore.rename(inv.id, n); } }}
          class="text-sm font-bold text-ink hover:text-primary inline-flex items-center gap-1.5">
          {inv.name}<span class="text-[11px] font-normal text-subtle">✎</span>
        </button>
        <div class="flex items-center gap-2.5">
          <SaveIndicator />
          <span class="text-[11px] text-muted">답 보기</span>
          {#each [5, 7] as n (n)}
            <button on:click={() => inv && inventoryStore.setLikert(inv.id, n as Likert)}
              class="px-2 py-1 rounded-lg border text-[11px] transition
                     {inv.likert === n ? 'border-primary bg-primary/20 text-primary font-bold' : 'border-line text-muted hover:border-primary/40'}">
              {n}단계
            </button>
          {/each}
        </div>
      </div>

      <!-- 1단계: 무엇을 재는지 -->
      <div>
        <p class="text-[11px] text-muted mb-1.5">
          <b class="text-ink">1. 무엇을 잴까요?</b> 성격 요소를 먼저 정해요. (예: 개방성, 다정함, 충동성)
        </p>
        <div class="flex flex-wrap gap-1.5 mb-2">
          {#each inv.factors as f (f.key)}
            <span class="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink">
              <button on:click={() => { if (inv) { const n = prompt('요소 이름', f.label); if (n && n.trim()) inventoryStore.renameFactor(inv.id, f.key, n); } }}
                class="hover:text-primary">{f.label}</button>
              <button on:click={() => { if (inv && confirm(`「${f.label}」과 그 문항을 지울까요?`)) inventoryStore.removeFactor(inv.id, f.key); }}
                class="text-subtle hover:text-rose-400">×</button>
            </span>
          {/each}
          {#if inv.factors.length === 0}
            <span class="text-[11px] text-subtle">아직 없어요. 아래에서 추가하세요.</span>
          {/if}
        </div>
        <div class="flex gap-1.5">
          <input bind:value={factorInput} on:keydown={(e) => e.key === 'Enter' && addFactor()}
            placeholder="요소 이름 (예: 다정함)"
            class="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary" />
          <button on:click={addFactor} class="px-4 py-2 rounded-lg bg-bubble text-sm">추가</button>
        </div>
      </div>

      <!-- 2단계: 문항 -->
      <div>
        <p class="text-[11px] text-muted mb-1.5">
          <b class="text-ink">2. 문항을 쓰세요.</b> "이 인물은 —" 으로 시작하면 답하기 편해요.
        </p>

        {#if inv.factors.length === 0}
          <p class="text-[11px] text-subtle">요소를 먼저 하나 만들어주세요.</p>
        {:else}
          <div class="space-y-2">
            {#each pageItems as item, k (pageStart + k)}
              {@const i = pageStart + k}
              <div class="rounded-xl border border-line bg-canvas/40 px-3 py-2.5 space-y-1.5">
                <div class="flex gap-1.5">
                  <textarea value={item.text} rows="2" placeholder="이 인물은 …"
                    on:input={(e) => inv && inventoryStore.patchItem(inv.id, i, { text: e.currentTarget.value })}
                    class="flex-1 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm outline-none focus:border-primary"></textarea>
                  <button on:click={() => inv && inventoryStore.removeItem(inv.id, i)}
                    class="shrink-0 px-2 text-[11px] text-subtle hover:text-rose-400">×</button>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <select value={item.factor}
                    on:change={(e) => inv && inventoryStore.patchItem(inv.id, i, { factor: e.currentTarget.value })}
                    class="rounded border border-line bg-canvas px-1.5 py-1 text-[11px] text-ink outline-none focus:border-primary">
                    {#each inv.factors as f (f.key)}<option value={f.key}>{f.label}</option>{/each}
                  </select>
                  <button on:click={() => inv && inventoryStore.patchItem(inv.id, i, { reverse: !item.reverse })}
                    class="text-[11px] {item.reverse ? 'text-amber-300' : 'text-subtle hover:text-ink'}">
                    {item.reverse ? '☑' : '☐'} 반대로 세기
                  </button>
                </div>
              </div>
            {/each}
          </div>

          {#if paged}
            <div class="flex items-center justify-center gap-1 mt-2">
              <button on:click={() => goPage(page - 1)} disabled={page === 0}
                class="px-2.5 py-1.5 rounded-lg border border-line text-[11px] text-muted disabled:opacity-30">‹</button>
              {#each Array(pageCount) as _, p (p)}
                <button on:click={() => goPage(p)}
                  class="w-7 h-7 rounded-lg border text-[11px] {p === page ? 'border-primary bg-primary/20 text-primary font-bold' : 'border-line text-muted'}">{p + 1}</button>
              {/each}
              <button on:click={() => goPage(page + 1)} disabled={page === pageCount - 1}
                class="px-2.5 py-1.5 rounded-lg border border-line text-[11px] text-muted disabled:opacity-30">›</button>
            </div>
          {/if}

          <button on:click={() => { if (inv) { inventoryStore.addItem(inv.id, inv.factors[0].key); goPage(Math.ceil((inv.items.length + 1) / PAGE) - 1); } }}
            class="w-full mt-2 py-2.5 rounded-xl border border-dashed border-line text-xs text-muted hover:border-primary hover:text-primary">
            ＋ 문항 추가
          </button>

          <p class="text-[10px] text-subtle mt-2 leading-relaxed">
            <b>반대로 세기</b>는 "변화를 꺼린다"처럼 그렇다고 답할수록 그 요소가 낮아지는 문항에 켜요.
            한 요소에 4문항쯤, 그중 절반은 반대로 세기로 섞으면 답이 한쪽으로 쏠리지 않아요.
          </p>
        {/if}
      </div>

      <!-- 3단계: 답지 -->
      <div>
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <p class="text-[11px] text-muted">
            <b class="text-ink">3. 답지를 다듬어요.</b> 그대로 둬도 돼요.
          </p>
          {#if inv.labels}
            <button on:click={() => inv && inventoryStore.resetLabels(inv.id)}
              class="text-[11px] text-subtle hover:text-rose-400">기본값으로</button>
          {/if}
        </div>

        <div class="space-y-1.5">
          {#each labelsOf(inv) as lab, k (k)}
            <div class="flex items-center gap-2">
              <span class="w-6 shrink-0 text-[11px] text-subtle text-right">{k + 1}</span>
              <input value={lab}
                on:input={(e) => inv && inventoryStore.setLabel(inv.id, k, e.currentTarget.value)}
                class="flex-1 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm outline-none focus:border-primary" />
            </div>
          {/each}
        </div>
        <p class="text-[10px] text-subtle mt-1.5">
          왼쪽이 가장 낮은 점수, 오른쪽이 가장 높은 점수예요. 순서는 그대로 두세요.
        </p>
      </div>

      <!-- 작성 완료 -->
      <div class="pt-1 border-t border-line">
        <button on:click={() => inv && inventoryStore.toggleDone(inv.id)}
          class="w-full py-2.5 rounded-xl border text-xs font-bold transition
                 {inv.done ? 'border-emerald-500 bg-emerald-600/15 text-emerald-300' : 'border-line text-muted hover:border-emerald-500/50'}">
          {inv.done ? '✓ 작성 완료' : '☐ 작성 완료로 표시'}
        </button>
        <p class="text-[10px] text-subtle mt-1.5 text-center">
          {#if inv.done}
            목록에 ✓로 표시돼요. 언제든 다시 고칠 수 있어요.
          {:else}
            아직 만드는 중인 검사지는 목록에 …로 표시돼요.
          {/if}
        </p>
      </div>
    </section>
  {/if}

  {#if inv && !editing}
    <!-- 답하기 -->
    <section class="rounded-2xl border border-line bg-surface/40 p-4 space-y-3">
      {#if inv.items.length === 0}
        <p class="text-xs text-subtle text-center py-8 border border-dashed border-line rounded-xl">
          아직 문항이 없어요. 위의 "문항 편집"을 눌러 만들어보세요.
        </p>
      {:else}
        {#if !inv.done && !inv.builtin}
          <p class="text-[11px] text-amber-300/90 rounded-lg border border-amber-600/30 bg-amber-600/10 px-3 py-2">
            아직 작성 중인 검사지예요. 문항을 다 썼으면 편집에서 "작성 완료"를 눌러두세요.
          </p>
        {/if}
        <div class="flex items-center justify-between">
          <p class="text-[11px] text-muted">{answeredCount} / {inv.items.length} 답함</p>
          <button on:click={() => { answers = {}; showResult = false; }}
            class="text-[11px] text-subtle hover:text-rose-400">답 지우기</button>
        </div>

        {#each pageItems as item, k (pageStart + k)}
          {@const i = pageStart + k}
          <div class="rounded-xl border border-line bg-canvas/40 px-3 py-2.5">
            <p class="text-sm text-ink mb-2">
              {i + 1}. {item.text || '(빈 문항)'}
              {#if item.reverse}<span class="text-[10px] text-subtle ms-1">(반대)</span>{/if}
            </p>
            <div class="flex flex-wrap gap-1">
              {#each labelsOf(inv) as lab, k}
                <button on:click={() => answer(i, k + 1)}
                  class="px-2 py-1 rounded-lg border text-[11px] transition
                         {answers[i] === k + 1 ? 'border-primary bg-primary/20 text-primary font-bold' : 'border-line text-muted hover:border-primary/40'}">
                  {lab}
                </button>
              {/each}
              <button on:click={() => answer(i, null)}
                class="px-2 py-1 rounded-lg border text-[11px] transition
                       {answers[i] === null ? 'border-amber-500 bg-amber-600/20 text-amber-200 font-bold' : 'border-dashed border-line text-subtle hover:border-amber-500/40'}">
                아직 모르겠다
              </button>
            </div>
          </div>
        {/each}

        {#if paged}
          <div class="flex items-center justify-between gap-2 pt-1">
            <button on:click={() => goPage(page - 1)} disabled={page === 0}
              class="px-3 py-2 rounded-lg border border-line text-xs text-muted disabled:opacity-30 hover:border-primary">‹ 이전</button>

            <div class="flex flex-wrap justify-center gap-1">
              {#each Array(pageCount) as _, p (p)}
                <button on:click={() => goPage(p)}
                  class="w-7 h-7 rounded-lg border text-[11px] transition
                         {p === page ? 'border-primary bg-primary/20 text-primary font-bold' : 'border-line text-muted hover:border-primary/40'}">
                  {p + 1}
                </button>
              {/each}
            </div>

            <button on:click={() => goPage(page + 1)} disabled={page === pageCount - 1}
              class="px-3 py-2 rounded-lg border text-xs disabled:opacity-30
                     {pageDone && page < pageCount - 1 ? 'border-primary text-primary' : 'border-line text-muted hover:border-primary'}">다음 ›</button>
          </div>
          <p class="text-[10px] text-subtle text-center">{page + 1} / {pageCount} 쪽 · 답한 것은 쪽을 옮겨도 남아요</p>
        {/if}

        <button on:click={() => (showResult = true)} disabled={answeredCount === 0}
          class="w-full py-3 rounded-xl bg-primary hover:opacity-90 disabled:opacity-30 text-ink text-sm font-bold transition">
          결과 보기{#if answeredCount < (inv.items.length ?? 0)} <span class="font-normal opacity-70">({answeredCount}개로)</span>{/if}
        </button>
      {/if}
    </section>
  {/if}

  <!-- 결과 -->
  {#if inv && scored && !editing && chartItems.length > 0}
    <section class="rounded-2xl border border-line bg-surface/60 p-5 space-y-4">
      <h2 class="text-sm font-bold text-primary">✨ 결과</h2>

      <StatChart items={chartItems} min={0} max={100} step={1} title={inv.name} />

      <div class="flex flex-wrap gap-x-3 gap-y-1">
        {#each scored.results as r}
          <span class="text-[11px] {r.empty ? 'text-subtle' : 'text-muted'}">
            {r.label} <b class="text-primary">{r.empty ? '—' : r.value}</b>
            <span class="text-subtle">({r.answered}/{r.total})</span>
          </span>
        {/each}
      </div>

      {#if scored.unknown.length > 0}
        <div class="rounded-xl border border-amber-600/40 bg-amber-600/10 p-3">
          <p class="text-[11px] font-bold text-amber-200 mb-1.5">아직 안 정해진 것 {scored.unknown.length}개</p>
          <ul class="space-y-0.5">
            {#each scored.unknown as u}<li class="text-[11px] text-muted">· {u}</li>{/each}
          </ul>
          <p class="text-[10px] text-subtle mt-2">여기가 다음에 채울 캐릭터 빈칸이에요.</p>
        </div>
      {/if}

      <StatExport items={chartItems} min={0} max={100} title={inv.name} />
      <SaveToCharacter items={chartItems} setKey={inv.name} source={`검사 · ${inv.name}`}
        min={0} max={100} step={1} note={unknownNote} />
    </section>
  {/if}
</div>
