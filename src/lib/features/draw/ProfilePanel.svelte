<script lang="ts">
  import { onMount } from 'svelte';
  import StatChart from './StatChart.svelte';
  import StatExport from './StatExport.svelte';
  import { docStore, listDocs, getDocById } from '$lib/stores/docStore';
  import { getPsych, setPsychValue, setPsychNote, removePsych } from '$lib/domain/psych';

  let chars: ReturnType<typeof listDocs> = [];
  function refresh() { chars = listDocs('characters'); }
  onMount(refresh);
  $: { void $docStore; if (typeof window !== 'undefined') refresh(); }

  let docId: string | null = null;
  $: withPsych = chars.filter((c) => getPsych(c).length > 0);
  $: if (withPsych.length > 0 && (!docId || !withPsych.some((c) => c.id === docId))) docId = withPsych[0].id;
  $: doc = docId ? getDocById(docId) : null;
  $: sets = getPsych(doc);

  function fmt(ts: number) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  async function copySet(key: string) {
    const s = sets.find((x) => x.key === key);
    if (!s || !doc) return;
    const text = `${doc.title} · ${s.key}\n${s.items.map((i) => `${i.label} ${i.value}`).join(' / ')}`;
    try { await navigator.clipboard.writeText(text); } catch {}
  }
</script>

<div class="max-w-2xl mx-auto p-6 space-y-5">
  <section class="rounded-2xl border border-line bg-surface/60 p-5">
    <h2 class="text-sm font-bold text-primary mb-1">📊 인물 수치</h2>
    <p class="text-[11px] text-muted mb-3">뽑기·검사 결과가 인물 문서에 붙어 있어요. 여기서 직접 손봐도 돼요.</p>

    {#if withPsych.length === 0}
      <p class="text-xs text-subtle text-center py-8 border border-dashed border-line rounded-xl">
        아직 없어요. 뽑기나 검사 결과에서 "인물 문서에 저장"을 눌러보세요.
      </p>
    {:else}
      <div class="flex flex-wrap gap-1.5">
        {#each withPsych as c (c.id)}
          <button on:click={() => (docId = c.id)}
            class="px-3 py-1.5 rounded-lg border text-xs transition
                   {docId === c.id ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted hover:text-ink'}">
            {c.title} <span class="text-subtle">({getPsych(c).length})</span>
          </button>
        {/each}
      </div>
    {/if}
  </section>

  {#if doc}
    {#each sets as s (s.key)}
      <section class="rounded-2xl border border-line bg-surface/40 p-5 space-y-4">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-ink">{s.key}</h3>
            <p class="text-[10px] text-subtle mt-0.5">{s.source} · {fmt(s.updatedAt)}</p>
          </div>
          <button on:click={() => { if (doc && confirm(`「${s.key}」 수치를 지울까요?`)) removePsych(doc, s.key); }}
            class="shrink-0 text-[11px] text-subtle hover:text-rose-400">삭제</button>
        </div>

        <StatChart items={s.items} min={s.min} max={s.max} step={s.step} />

        <div class="space-y-2.5 pt-1">
          <p class="text-[11px] text-muted">직접 조정</p>
          {#each s.items as it (it.label)}
            <div class="flex items-center gap-2">
              <span class="w-24 shrink-0 text-[11px] text-muted text-right truncate">{it.label}</span>
              <input type="range" min={s.min} max={s.max} step={s.step} value={it.value}
                on:input={(e) => doc && setPsychValue(doc, s.key, it.label, +e.currentTarget.value)}
                class="flex-1 accent-[var(--primary)]" />
              <input type="number" min={s.min} max={s.max} step={s.step} value={it.value}
                on:change={(e) => doc && setPsychValue(doc, s.key, it.label, +e.currentTarget.value)}
                class="w-14 shrink-0 rounded border border-line bg-canvas px-1.5 py-1 text-xs text-ink outline-none focus:border-primary" />
            </div>
          {/each}
        </div>

        <div>
          <p class="text-[11px] text-muted mb-1.5">메모</p>
          <textarea value={s.note ?? ''} rows="4"
            on:change={(e) => doc && setPsychNote(doc, s.key, e.currentTarget.value)}
            placeholder="정해진 것 / 아직 안 정해진 것"
            class="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs outline-none focus:border-primary"></textarea>
        </div>

        <StatExport items={s.items} min={s.min} max={s.max} title={`${doc.title} · ${s.key}`} />

        <div class="flex flex-wrap gap-3">
          <button on:click={() => copySet(s.key)} class="text-xs text-emerald-400 hover:underline">📋 복사</button>
          <a href={`/world/characters/${doc.id}`} class="text-xs text-primary hover:underline">인물 문서 열기 →</a>
        </div>
      </section>
    {/each}
  {/if}
</div>
