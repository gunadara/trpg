<script context="module" lang="ts">
  // 다른 모듈에서 import할 수 있도록 타입은 모듈 스크립트에 선언
  export type MapPin = {
    id: string;
    x: number;      // 0~100 (%) — 이미지 기준 상대 좌표
    y: number;
    docId?: string; // 연결된 문서
    label: string;
  };
</script>

<script lang="ts">
  // 지도 이미지 + 핀 오버레이 뷰어
  export let image: string;                 // dataURL
  export let pins: MapPin[] = [];
  export let editable = false;              // true면 클릭으로 핀 추가
  export let onAddPin: (x: number, y: number) => void = () => {};
  export let onPinClick: (pin: MapPin) => void = () => {};

  let zoom = 100; // %

  function zoomIn() { zoom = Math.min(400, zoom + 50); }
  function zoomOut() { zoom = Math.max(100, zoom - 50); }

  function handleMapClick(e: MouseEvent) {
    if (!editable) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddPin(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  }
</script>

<div class="relative w-full h-full bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden">
  <!-- 스크롤 영역 -->
  <div class="w-full h-full overflow-auto">
    <!-- 이미지 + 핀 레이어 (이미지 크기에 맞춰 핀이 따라감) -->
    <div
      class="relative inline-block {editable ? 'cursor-crosshair' : ''}"
      style="width: {zoom}%"
      on:click={handleMapClick}
      role="img"
      aria-label="세계관 지도"
    >
      <img src={image} alt="지도" class="w-full block select-none" draggable="false" />

      {#each pins as pin (pin.id)}
        <button
          class="absolute -translate-x-1/2 -translate-y-full group"
          style="left: {pin.x}%; top: {pin.y}%"
          on:click|stopPropagation={() => onPinClick(pin)}
          title={pin.label}
        >
          <span class="block text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] group-hover:scale-125 transition-transform">📍</span>
          <span class="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 px-1.5 py-0.5 rounded
                       bg-black/70 text-[10px] text-slate-100 whitespace-nowrap
                       opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {pin.label}
          </span>
        </button>
      {/each}
    </div>
  </div>

  <!-- 줌 컨트롤 -->
  <div class="absolute bottom-4 right-4 flex flex-col gap-1.5">
    <button on:click={zoomIn} class="w-9 h-9 rounded-lg bg-black/60 border border-white/10 text-slate-200 text-lg hover:border-indigo-500 transition backdrop-blur">+</button>
    <button on:click={zoomOut} class="w-9 h-9 rounded-lg bg-black/60 border border-white/10 text-slate-200 text-lg hover:border-indigo-500 transition backdrop-blur">−</button>
  </div>

  {#if editable}
    <div class="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-indigo-600/90 text-white text-[11px] font-bold backdrop-blur pointer-events-none">
      ✏️ 편집 모드 — 지도를 탭하면 핀이 찍혀요
    </div>
  {/if}
</div>
