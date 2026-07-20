<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  // reels: 릴마다 { pool: 돌아가는 동안 보여줄 후보들, final: 멈출 때 값 }
  export let reels: { pool: string[]; final: string }[] = [];

  const dispatch = createEventDispatcher<{ done: void }>();

  let display: string[] = [];
  let stopped: boolean[] = [];
  let timers: ReturnType<typeof setInterval>[] = [];
  let stopTimers: ReturnType<typeof setTimeout>[] = [];

  onMount(() => {
    display = reels.map((r) => r.pool[0] ?? r.final);
    stopped = reels.map(() => false);

    reels.forEach((reel, i) => {
      // 돌아가는 동안 빠르게 교체
      timers[i] = setInterval(() => {
        display[i] = reel.pool[Math.floor(Math.random() * reel.pool.length)] ?? reel.final;
        display = [...display];
      }, 55);

      // 순차 정지: 첫 릴 700ms, 이후 450ms 간격
      stopTimers[i] = setTimeout(() => {
        clearInterval(timers[i]);
        display[i] = reel.final;
        stopped[i] = true;
        display = [...display];
        stopped = [...stopped];
        if (stopped.every(Boolean)) dispatch('done');
      }, 700 + i * 450);
    });
  });

  onDestroy(() => {
    timers.forEach(clearInterval);
    stopTimers.forEach(clearTimeout);
  });
</script>

<div class="flex flex-wrap gap-2 justify-center">
  {#each reels as _, i}
    <div
      class="min-w-[72px] px-3 py-2 rounded-lg border text-center overflow-hidden transition-all duration-150
             {stopped[i]
               ? 'border-amber-500 bg-amber-600/15 scale-105'
               : 'border-line bg-surface/60'}"
    >
      <span
        class="text-base font-bold whitespace-nowrap block
               {stopped[i] ? 'text-amber-300 slot-snap' : 'text-muted blur-[1px] opacity-70'}"
      >{display[i]}</span>
    </div>
  {/each}
</div>

<style>
  .slot-snap {
    animation: snap 0.25s ease-out;
  }
  @keyframes snap {
    0% { transform: translateY(-40%); opacity: 0.3; }
    60% { transform: translateY(8%); }
    100% { transform: translateY(0); opacity: 1; }
  }
</style>
