<script lang="ts">
  // 뽑은 수치를 그래프로. 축이 3개 이상이면 레이더, 아니면 가로 막대.
  export let items: { label: string; value: number }[] = [];
  export let min = 0;
  export let max = 100;
  export let step = 1;
  export let title = '';

  $: span = Math.max(1, max - min);
  $: norm = items.map((it) => Math.max(0, Math.min(1, (it.value - min) / span)));
  $: isRadar = items.length >= 3;

  // ── 레이더 기하 ──
  const W = 300, H = 250, CX = 150, CY = 118, R = 78;
  function pt(i: number, n: number, r: number) {
    const a = (-90 + (360 / n) * i) * (Math.PI / 180);
    return [CX + Math.cos(a) * r, CY + Math.sin(a) * r] as const;
  }
  function poly(n: number, r: number) {
    return Array.from({ length: n }, (_, i) => pt(i, n, r).join(',')).join(' ');
  }
  $: shape = items.map((_, i) => pt(i, items.length, R * norm[i]).join(',')).join(' ');
  // 격자 눈금값 (위쪽 축에 표기)
  const RINGS = [0.25, 0.5, 0.75, 1];
  $: ringLabels = RINGS.map((f) => Math.round(min + span * f));
</script>

{#if items.length > 0}
  <div class="w-full">
    {#if title}
      <p class="text-[11px] text-muted text-center mb-1">{title}</p>
    {/if}

    {#if isRadar}
      <svg viewBox="0 0 {W} {H}" class="w-full max-w-[320px] mx-auto block" role="img" aria-label="{title} 그래프">
        <!-- 격자 -->
        {#each [0.25, 0.5, 0.75, 1] as ring}
          <polygon points={poly(items.length, R * ring)}
            fill="none" stroke="var(--line)" stroke-width="1" />
        {/each}
        {#each items as _, i}
          <line x1={CX} y1={CY} x2={pt(i, items.length, R)[0]} y2={pt(i, items.length, R)[1]}
            stroke="var(--line)" stroke-width="1" />
        {/each}

        <!-- 눈금값: 축과 축 사이 빈 방향에 (라벨과 안 겹치게) -->
        {#each RINGS.slice(0, 3) as ring, i}
          {@const a = (-90 + 180 / items.length) * (Math.PI / 180)}
          <text x={CX + Math.cos(a) * R * ring} y={CY + Math.sin(a) * R * ring}
            text-anchor="middle" dominant-baseline="middle"
            font-size="8" fill="var(--subtle)">{ringLabels[i]}</text>
        {/each}

        <!-- 값 -->
        <polygon points={shape} fill="var(--primary)" fill-opacity="0.28"
          stroke="var(--primary)" stroke-width="2" stroke-linejoin="round" />
        {#each items as _, i}
          <circle cx={pt(i, items.length, R * norm[i])[0]} cy={pt(i, items.length, R * norm[i])[1]}
            r="3" fill="var(--primary)" />
        {/each}

        <!-- 라벨 -->
        {#each items as it, i}
          {@const [lx, ly] = pt(i, items.length, R + 20)}
          <text x={lx} y={ly}
            text-anchor={lx > CX + 6 ? 'start' : lx < CX - 6 ? 'end' : 'middle'}
            dominant-baseline="middle"
            font-size="11" fill="var(--muted)">{it.label}</text>
          <text x={lx} y={ly + 12}
            text-anchor={lx > CX + 6 ? 'start' : lx < CX - 6 ? 'end' : 'middle'}
            dominant-baseline="middle"
            font-size="11" font-weight="700" fill="var(--primary)">{it.value}</text>
        {/each}
      </svg>
      <p class="text-[10px] text-subtle text-center mt-1">
        축 {min} ~ {max} · {step}칸씩 · 바깥쪽일수록 높음
      </p>
    {:else}
      <div class="space-y-2 py-1">
        {#each items as it, i}
          <div class="flex items-center gap-2">
            <span class="w-20 shrink-0 text-[11px] text-muted text-right truncate">{it.label}</span>
            <div class="flex-1 h-2.5 rounded-full bg-bubble overflow-hidden">
              <div class="h-full rounded-full bg-primary" style="width: {norm[i] * 100}%"></div>
            </div>
            <span class="w-8 shrink-0 text-[11px] font-bold text-primary">{it.value}</span>
          </div>
        {/each}
        <div class="flex items-center gap-2">
          <span class="w-20 shrink-0"></span>
          <div class="flex-1 flex justify-between text-[10px] text-subtle">
            <span>{min}</span><span>{Math.round((min + max) / 2)}</span><span>{max}</span>
          </div>
          <span class="w-8 shrink-0"></span>
        </div>
      </div>
      <p class="text-[10px] text-subtle text-center mt-1">축 {min} ~ {max} · {step}칸씩</p>
    {/if}
  </div>
{/if}
