<!-- src/lib/components/play/SessionFrame.svelte -->
<script lang="ts">
  interface $$Props {
    leftWidth?: string;
    rightWidth?: string;
    children?: any;
  }

  // 필요하면 숫자만 바꿔도 전체 폭이 바뀜
  export let leftWidth = '18rem';
  export let rightWidth = '20rem';
</script>

<div
  class="h-[100dvh] min-h-0 grid grid-rows-[auto_minmax(0,1fr)_auto]
         bg-canvas text-ink overflow-hidden
         font-sans selection:bg-indigo-100 selection:text-indigo-900"
  style={`--left:${leftWidth}; --right:${rightWidth};`}
>
  <!-- HEADER -->
  <div class="shrink-0 z-20">
    <slot name="header" />
  </div>

  <!-- BODY: lg 이상 3컬럼(페이지 고정) / 그 미만 1컬럼 세로 스택(스크롤) -->
  <div class="min-h-0 p-3 lg:p-4 overflow-y-auto lg:overflow-hidden">
    <div class="grid gap-3 lg:gap-4 grid-cols-1 lg:grid-cols-[var(--left)_minmax(0,1fr)_var(--right)] lg:h-full">
      <div class="min-h-[60vh] lg:min-h-0 overflow-hidden">
        <slot name="left" />
      </div>

      <div class="min-h-[60vh] lg:min-h-0 overflow-hidden">
        <slot name="center" />
      </div>

      <div class="min-h-[60vh] lg:min-h-0 overflow-hidden">
        <slot name="right" />
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="shrink-0">
    <slot name="footer" />
  </div>
</div>
