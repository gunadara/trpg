<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  // items: 원판에 올라갈 항목 (부모가 ROULETTE_MAX개 이하로 잘라서 넘김)
  export let items: string[] = [];
  export let autoSpin = false;

  onMount(() => {
    if (autoSpin) setTimeout(() => spin(), 350);
  });

  const dispatch = createEventDispatcher<{ result: { tag: string } }>();

  // 색은 '단어'에 묶는다 → 같은 단어면 같은 색, 다른 단어면 다른 색.
  // 화면에 등장하는 고유 단어들에 색상환을 균등 배분.
  $: uniqueTags = [...new Set(items)];
  $: colorOf = (tag: string): string => {
    const idx = uniqueTags.indexOf(tag);
    const total = uniqueTags.length;
    if (total <= 1) return 'hsl(30 45% 52%)';
    const hue = Math.round((idx * (360 / total) + idx * 7) % 360);
    return `hsl(${hue} 42% 52%)`;
  };

  let rotation = 0;
  let spinning = false;
  let winner: string | null = null;

  $: n = items.length;
  $: seg = 360 / Math.max(n, 1);

  function polar(cx: number, cy: number, r: number, deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function segPath(i: number) {
    const start = i * seg;
    const end = start + seg;
    const p1 = polar(150, 150, 140, start);
    const p2 = polar(150, 150, 140, end);
    const large = seg > 180 ? 1 : 0;
    return `M150,150 L${p1.x},${p1.y} A140,140 0 ${large} 1 ${p2.x},${p2.y} Z`;
  }

  function labelPos(i: number) {
    const mid = i * seg + seg / 2;
    const p = polar(150, 150, 92, mid);
    return { ...p, angle: mid };
  }

  // 원판 그대로 두고 라벨만 잘라 표시 (조각이 얇을수록 짧게)
  function trim(s: string) {
    const max = n > 18 ? 4 : n > 12 ? 5 : n > 8 ? 7 : 9;
    return s.length > max ? s.slice(0, max) + '…' : s;
  }
  $: labelFont = n > 18 ? 7.5 : n > 12 ? 9 : n > 8 ? 10.5 : 12;

  export function spin() {
    if (spinning || n === 0) return;
    spinning = true;
    winner = null;
    const idx = Math.floor(Math.random() * n);
    // 당첨 조각의 중앙이 포인터(위, 0도)에 오도록
    const target = 360 * 5 + (360 - (idx * seg + seg / 2));
    // 현재 회전값 기준으로 이어서 돌기
    rotation = rotation - (rotation % 360) + target;
    setTimeout(() => {
      spinning = false;
      winner = items[idx];
      dispatch('result', { tag: items[idx] });
    }, 3600);
  }
</script>

<div class="flex flex-col items-center gap-3">
  <div class="relative">
    <!-- 포인터 -->
    <div class="absolute left-1/2 -top-1 -translate-x-1/2 z-10
                w-0 h-0 border-x-[10px] border-x-transparent border-t-[16px] border-t-amber-400 drop-shadow"></div>

    <svg viewBox="0 0 300 300" class="w-64 h-64 md:w-72 md:h-72">
      <!-- 바깥 림 (고정) -->
      <circle cx="150" cy="150" r="146" fill="none" stroke="#8a6d3b" stroke-width="5" />
      <circle cx="150" cy="150" r="142" fill="none" stroke="#3f3a33" stroke-width="3" />
      <g
        style="transform-origin: 150px 150px; transform: rotate({rotation}deg);
               transition: {spinning ? 'transform 3.5s cubic-bezier(0.12, 0.65, 0.18, 1)' : 'none'};"
      >
        {#each items as item, i}
          <path d={segPath(i)} fill={colorOf(item)} fill-opacity={uniqueTags.indexOf(item) % 2 === 0 ? 0.95 : 0.82} stroke="#2a2521" stroke-width="1.5" />
          {@const lp = labelPos(i)}
          <text
            x={lp.x} y={lp.y}
            fill="#f5ecd7" font-size={labelFont} font-weight="bold"
            text-anchor="middle" dominant-baseline="middle"
            transform="rotate({lp.angle + 90}, {lp.x}, {lp.y})"
          >{trim(item)}</text>
          <!-- 조각 경계 핀 -->
          {@const pin = polar(150, 150, 134, i * seg)}
          <circle cx={pin.x} cy={pin.y} r="2.5" fill="#e7d8b1" fill-opacity="0.9" />
        {/each}
        <!-- 허브 -->
        <circle cx="150" cy="150" r="20" fill="#2a2521" stroke="#8a6d3b" stroke-width="2.5" />
        <circle cx="150" cy="150" r="7" fill="#c9a24b" />
      </g>
    </svg>
  </div>

  <button
    on:click={spin}
    disabled={spinning || n === 0}
    class="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-bold transition"
  >
    {spinning ? '돌아가는 중…' : winner ? '🎡 다시 돌리기' : '🎡 돌리기'}
  </button>
</div>
