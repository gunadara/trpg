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
  export let selectable = false;            // true면 드래그로 사각 구역 선택 (지역 뽑기)
  export let onSelectRect: (r: { x: number; y: number; w: number; h: number }) => void = () => {}; // % 좌표
  export let pinStyle: 'default' | 'antique' = 'default'; // antique = 옛 지도풍(점+지명)
  export let fullscreenMode = false; // 전체화면일 때: 열자마자 화면맞춤, 휠 줌 활성
  export let onAddPin: (x: number, y: number) => void = () => {};
  export let onPinClick: (pin: MapPin) => void = () => {};

  // 지역 색칠: 다각형 점 찍기
  export type MapRegion = { id: string; name: string; points: { x: number; y: number }[]; color: string };
  export let regions: MapRegion[] = [];
  export let regionDrawing = false;                     // true면 드래그로 자유롭게 경계 그리기(올가미)
  export let regionColor = '#e07a5f';                   // 현재 그리는 지역 색
  export let onRegionLasso: (points: { x: number; y: number }[]) => void = () => {}; // 올가미 완료 콜백
  export let draftPoints: { x: number; y: number }[] = []; // 그리는 중인 경로

  let zoom = 100; // % (컨테이너 가로폭 기준)

  // 화면 맞춤: 가로·세로가 모두 들어오는 배율 계산
  let cw = 0, ch = 0;           // 스크롤 영역 크기
  let natW = 0, natH = 0;       // 이미지 원본 크기
  $: fitZoom =
    cw > 0 && ch > 0 && natW > 0 && natH > 0
      ? Math.min(100, ((ch * natW) / (natH * cw)) * 100 * 0.98)
      : 100;

  function fit() { zoom = rotated ? rotFitZoom : fitZoom; }
  function zoomIn() { zoom = Math.min(400, zoom + 50); }
  function zoomOut() { zoom = Math.max(Math.min(fitZoom, 100), zoom - 50); }

  // 휠 줌: 전체화면에서만 지도 확대/축소. 일반 뷰에선 페이지 스크롤을 막지 않음.
  function onWheelZoom(e: WheelEvent) {
    if (!fullscreenMode || selectable) return; // 전체화면 아니면 페이지 스크롤 그대로
    e.preventDefault();
    const step = e.deltaY < 0 ? 15 : -15;
    const floor = Math.min(fitZoom, 100);
    zoom = Math.max(floor, Math.min(500, zoom + step));
  }

  /* ── 핀치 줌 (모바일 두 손가락) ── */
  const activePointers = new Map<number, { x: number; y: number }>();
  let pinchStartDist = 0;
  let pinchStartZoom = 100;
  let pinching = false;

  function pinchDist(): number {
    const pts = [...activePointers.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }
  function onPointerDownZoom(e: PointerEvent) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 2) {
      pinching = true;
      pinchStartDist = pinchDist();
      pinchStartZoom = zoom;
    }
  }
  function onPointerMoveZoom(e: PointerEvent) {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinching && activePointers.size >= 2 && pinchStartDist > 0) {
      const ratio = pinchDist() / pinchStartDist;
      zoom = Math.max(fitZoom, Math.min(500, pinchStartZoom * ratio));
    }
  }
  function onPointerUpZoom(e: PointerEvent) {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) pinching = false;
  }

  function handleImgLoad(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    natW = img.naturalWidth;
    natH = img.naturalHeight;
    applyInitialZoom();
  }
  function applyInitialZoom() {
    if (fullscreenMode) {
      zoom = fitZoom;
    } else {
      const portrait = ch > cw;
      zoom = portrait ? 100 : fitZoom;
    }
  }
  // 전체화면: 컨테이너 크기가 처음 확정될 때 한 번만 화면맞춤 (이후 줌 자유)
  let fsFitted = false;
  $: if (fullscreenMode && cw > 0 && ch > 0 && natW > 0 && natH > 0 && !fsFitted) {
    zoom = rotated ? rotFitZoom : fitZoom;
    fsFitted = true;
  }

  /* 세로 화면(폰)에서 가로로 긴 지도는 90° 돌려 보면 훨씬 크다 */
  let rotateOn = true;   // 사용자가 끌 수 있게
  $: rotated =
    fullscreenMode && rotateOn &&
    cw > 0 && ch > 0 && natW > 0 && natH > 0 &&
    ch > cw * 1.15 &&        // 세로로 긴 화면
    natW > natH * 1.15;      // 가로로 긴 지도

  // 회전 상태 화면맞춤: 이미지 가로변이 화면 '세로'에, 세로변이 화면 '가로'에 들어가야 함
  $: rotFitZoom =
    cw > 0 && ch > 0 && natW > 0 && natH > 0
      ? Math.min((ch / cw) * 100, (natW / natH) * 100) * 0.98
      : 100;

  function toggleRotate() {
    rotateOn = !rotateOn;
    zoom = rotated ? rotFitZoom : fitZoom;
  }

  function handleMapClick(e: MouseEvent) {
    if (regionDrawing) return; // 올가미는 드래그로 처리 (클릭 무시)
    if (!editable || selectable) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddPin(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  }

  /* ── 구역 드래그 선택 (지역 뽑기) ── */
  let selStart: { x: number; y: number } | null = null;
  let selCur: { x: number; y: number } | null = null;
  let mapEl: HTMLElement | null = null;

  function pctOf(e: PointerEvent): { x: number; y: number } {
    const rect = (mapEl as HTMLElement).getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    };
  }
  // 올가미 상태
  let lassoPath: { x: number; y: number }[] = [];
  let lassoActive = false;

  function selDown(e: PointerEvent) {
    if (regionDrawing) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      lassoActive = true;
      lassoPath = [pctOf(e)];
      draftPoints = lassoPath;
      return;
    }
    if (!selectable) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    selStart = selCur = pctOf(e);
  }
  function selMove(e: PointerEvent) {
    if (regionDrawing && lassoActive) {
      const p = pctOf(e);
      const last = lassoPath[lassoPath.length - 1];
      // 너무 촘촘하면 건너뛰기 (점 과잉 방지) — 0.6% 이상 이동 시만 기록
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.6) {
        lassoPath = [...lassoPath, p];
        draftPoints = lassoPath;
      }
      return;
    }
    if (!selectable || !selStart) return;
    selCur = pctOf(e);
  }
  function selUp() {
    if (regionDrawing && lassoActive) {
      lassoActive = false;
      if (lassoPath.length >= 3) onRegionLasso(lassoPath);
      lassoPath = [];
      return;
    }
    if (!selectable || !selStart || !selCur) { selStart = selCur = null; return; }
    const r = selRect;
    selStart = selCur = null;
    if (r && r.w > 3 && r.h > 3) onSelectRect(r);
  }
  $: selRect = selStart && selCur
    ? {
        x: Math.min(selStart.x, selCur.x),
        y: Math.min(selStart.y, selCur.y),
        w: Math.abs(selCur.x - selStart.x),
        h: Math.abs(selCur.y - selStart.y)
      }
    : null;
</script>

<div class="relative w-full h-full bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden">
  <!-- 스크롤 영역 -->
  <div
    class="w-full h-full overflow-auto flex map-scroll"
    bind:clientWidth={cw}
    bind:clientHeight={ch}
    on:pointerdown={onPointerDownZoom}
    on:pointermove={onPointerMoveZoom}
    on:pointerup={onPointerUpZoom}
    on:pointercancel={onPointerUpZoom}
    on:wheel={onWheelZoom}
    style={selectable ? '' : 'touch-action: pan-x pan-y pinch-zoom;'}
  >
    <!-- 이미지 + 핀 레이어 (이미지 크기에 맞춰 핀이 따라감) -->
    <div
      class="relative inline-block m-auto {(editable && !selectable) || regionDrawing ? 'cursor-crosshair' : ''} {selectable ? 'cursor-crosshair' : ''}"
      style="width: {zoom}%; {rotated ? `transform: rotate(90deg); transform-origin: center;` : ''} {selectable || regionDrawing ? 'touch-action: none;' : ''}"
      bind:this={mapEl}
      on:click={handleMapClick}
      on:pointerdown={selDown}
      on:pointermove={selMove}
      on:pointerup={selUp}
      role="img"
      aria-label="세계관 지도"
    >
      <img src={image} alt="지도" class="w-full block select-none" draggable="false" on:load={handleImgLoad} />

      <!-- 지역 색칠 오버레이 (% 좌표를 viewBox 0~100으로) -->
      {#if regions.length > 0 || draftPoints.length > 0}
        <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {#each regions as rg (rg.id)}
            {#if rg.points.length >= 3}
              <polygon
                points={rg.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill={rg.color} fill-opacity="0.32"
                stroke={rg.color} stroke-width="0.9" stroke-dasharray="2 1.2" stroke-opacity="0.95" stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
              />
            {/if}
          {/each}
          {#if draftPoints.length > 0}
            {#if draftPoints.length >= 2}
              <!-- 올가미 궤적: 어두운 외곽 + 밝은 색선 -->
              <polygon
                points={draftPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill={regionColor} fill-opacity="0.28"
                stroke="#3a2f1c" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"
                vector-effect="non-scaling-stroke"
              />
              <polygon
                points={draftPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={regionColor} stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"
                vector-effect="non-scaling-stroke"
              />
            {/if}
          {/if}
        </svg>
      {/if}

      {#if selRect}
        <div
          class="absolute border-2 border-dashed border-indigo-400 bg-indigo-400/15 pointer-events-none rounded"
          style="left: {selRect.x}%; top: {selRect.y}%; width: {selRect.w}%; height: {selRect.h}%"
        ></div>
      {/if}

      {#each pins as pin (pin.id)}
        {#if pinStyle === 'antique'}
          <button
            class="absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center"
            style="left: {pin.x}%; top: {pin.y}%"
            on:click|stopPropagation={() => onPinClick(pin)}
            title={pin.label}
          >
            <span class="block w-2 h-2 rounded-full bg-[#4a4030] ring-2 ring-[#dcd4ae] group-hover:scale-150 transition-transform"></span>
            <span class="mt-0.5 px-1 text-[11px] font-serif font-semibold text-[#4a4030] whitespace-nowrap
                         [text-shadow:0_0_3px_#dcd4ae,0_0_3px_#dcd4ae,0_0_3px_#dcd4ae]">
              {pin.label}
            </span>
          </button>
        {:else}
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
        {/if}
      {/each}
    </div>
  </div>

  <!-- 줌 컨트롤 -->
  <div class="absolute top-4 right-4 flex flex-col gap-1.5">
    <button on:click={zoomIn} class="w-9 h-9 rounded-lg bg-black/60 border border-white/10 text-slate-200 text-lg hover:border-indigo-500 transition backdrop-blur">+</button>
    <button on:click={zoomOut} class="w-9 h-9 rounded-lg bg-black/60 border border-white/10 text-slate-200 text-lg hover:border-indigo-500 transition backdrop-blur">−</button>
    <button on:click={fit} title="화면 맞춤" class="w-9 h-9 rounded-lg bg-black/60 border border-white/10 text-slate-200 text-sm hover:border-indigo-500 transition backdrop-blur">⛶</button>
    {#if fullscreenMode && ch > cw * 1.15 && natW > natH * 1.15}
      <button
        on:click={toggleRotate}
        title={rotateOn ? '가로로 보기 끄기' : '가로로 크게 보기'}
        class="w-9 h-9 rounded-lg border text-sm transition backdrop-blur
               {rotateOn ? 'bg-indigo-600/80 border-indigo-400 text-white' : 'bg-black/60 border-white/10 text-slate-200'}"
      >⟳</button>
    {/if}
  </div>

  {#if editable}
    <div class="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-indigo-600/90 text-white text-[11px] font-bold backdrop-blur pointer-events-none">
      ✏️ 편집 모드 — 지도를 탭하면 핀이 찍혀요
    </div>
  {/if}

  {#if selectable}
    <div class="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-emerald-600/90 text-white text-[11px] font-bold backdrop-blur pointer-events-none">
      🔍 드래그해서 지역을 선택하세요
    </div>
  {/if}
</div>

<style>
  /* 지도 스크롤바 숨김 (스크롤·팬은 유지) — 이중 스크롤바 방지 */
  .map-scroll { scrollbar-width: none; -ms-overflow-style: none; }
  .map-scroll::-webkit-scrollbar { display: none; }
</style>
