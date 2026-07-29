<script lang="ts">
  import {
    type Building, type Level, type Area, type Furniture, type Opening, type Wall,
    type AreaKind, type FloorKind,
    FLOOR_STYLE, AREA_META, WALL_STYLE, emptyBuilding
  } from './types';
  import { CATALOG, CATALOG_GROUPS, catalogItem } from './catalog';
  import FirstPersonView from './FirstPersonView.svelte';

  export let building: Building = emptyBuilding();
  export let onChange: (b: Building) => void = () => {};

  /* ── 뷰 상태 ── */
  let cellPx = 44;              // 1칸 픽셀
  let panX = 60, panY = 60;     // 캔버스 이동
  let levelIdx = 0;             // 현재 층 (1차는 0 고정)
  $: level = building.levels.find((l) => l.index === levelIdx) ?? building.levels[0];

  type Tool = 'select' | 'area' | 'furniture' | 'door' | 'wall';
  let tool: Tool = 'select';
  let areaKind: AreaKind = 'room';
  let areaFloor: FloorKind = 'wood';
  let pickedKind = 'bed_single';   // 배치할 가구
  let doorKind: 'door' | 'window' | 'arch' = 'door';
  let wallKind: Wall['kind'] = 'fence';
  let selectedId: string | null = null;
  let selectedType: 'area' | 'furniture' | 'opening' | 'wall' | null = null;

  let svgEl: SVGSVGElement;
  let fpv = false;   // 1인칭 보기

  /* ── 좌표 변환 ── */
  function toCell(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = svgEl.getBoundingClientRect();
    return { x: (e.clientX - r.left - panX) / cellPx, y: (e.clientY - r.top - panY) / cellPx };
  }
  const snap = (v: number, step = 0.5) => Math.round(v / step) * step;

  function commit() {
    building = { ...building };
    onChange(building);
  }

  /* ── 영역 그리기 (드래그) ── */
  let drawStart: { x: number; y: number } | null = null;
  let drawNow: { x: number; y: number } | null = null;
  $: draftArea =
    drawStart && drawNow
      ? {
          x: Math.min(drawStart.x, drawNow.x),
          y: Math.min(drawStart.y, drawNow.y),
          w: Math.abs(drawNow.x - drawStart.x),
          h: Math.abs(drawNow.y - drawStart.y)
        }
      : null;

  /** 울타리 말뚝 위치 */
  function fencePosts(w: Wall): { x: number; y: number }[] {
    const n = Math.max(2, Math.round(Math.hypot(w.x2 - w.x1, w.y2 - w.y1) * 2));
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1 || 1);
      return { x: w.x1 + (w.x2 - w.x1) * t, y: w.y1 + (w.y2 - w.y1) * t };
    });
  }

  /* ── 담 그리기 (드래그로 선분) ── */
  let wallStart: { x: number; y: number } | null = null;
  let wallNow: { x: number; y: number } | null = null;

  /* ── 가구 드래그 ── */
  let dragId: string | null = null;
  let dragOff = { x: 0, y: 0 };
  let rotating = false;
  let rotStart = 0;
  let rotBase = 0;

  function onPointerDown(e: PointerEvent) {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const c = toCell(e);

    if (tool === 'area') {
      drawStart = { x: snap(c.x), y: snap(c.y) };
      drawNow = drawStart;
      return;
    }
    if (tool === 'wall') {
      wallStart = { x: snap(c.x, 0.25), y: snap(c.y, 0.25) };
      wallNow = wallStart;
      return;
    }
    if (tool === 'door') {
      placeOpening(c.x, c.y);
      return;
    }
    if (tool === 'furniture') {
      const item = catalogItem(pickedKind);
      if (!item) return;
      const f: Furniture = {
        id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        kind: item.kind,
        x: snap(c.x), y: snap(c.y),
        w: item.w, h: item.h, rot: 0
      };
      level.furniture = [...level.furniture, f];
      selectedId = f.id; selectedType = 'furniture';
      commit();
      return;
    }
    // select: 가구 잡기
    const hit = [...level.furniture].reverse().find((f) => {
      const half = Math.max(f.w, f.h) / 2;
      return Math.abs(c.x - f.x) <= half && Math.abs(c.y - f.y) <= half;
    });
    if (hit) {
      selectedId = hit.id; selectedType = 'furniture';
      dragId = hit.id;
      dragOff = { x: c.x - hit.x, y: c.y - hit.y };
      return;
    }
    // 담 선택 (선분에 가까우면)
    const hitWall = (level.walls ?? []).find((w) => {
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
      const L2 = dx * dx + dy * dy;
      let t = L2 === 0 ? 0 : ((c.x - w.x1) * dx + (c.y - w.y1) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(c.x - (w.x1 + t * dx), c.y - (w.y1 + t * dy)) < 0.2;
    });
    if (hitWall) { selectedId = hitWall.id; selectedType = 'wall'; return; }
    // 문 선택
    const op = (level.openings ?? []).find((o) => {
      const g = openingGeom(o);
      return g && Math.hypot(c.x - g.x, c.y - g.y) < 0.35;
    });
    if (op) { selectedId = op.id; selectedType = 'opening'; return; }
    // 영역 선택
    const area = [...level.areas].reverse().find(
      (a) => c.x >= a.x && c.x <= a.x + a.w && c.y >= a.y && c.y <= a.y + a.h
    );
    selectedId = area?.id ?? null;
    selectedType = area ? 'area' : null;
  }

  function onPointerMove(e: PointerEvent) {
    const c = toCell(e);
    if (tool === 'area' && drawStart) { drawNow = { x: snap(c.x), y: snap(c.y) }; return; }
    if (tool === 'wall' && wallStart) {
      let nx = snap(c.x, 0.25), ny = snap(c.y, 0.25);
      // Shift 없으면 수평/수직으로 스냅 (반듯한 담)
      if (!e.shiftKey) {
        if (Math.abs(nx - wallStart.x) > Math.abs(ny - wallStart.y)) ny = wallStart.y;
        else nx = wallStart.x;
      }
      wallNow = { x: nx, y: ny };
      return;
    }
    if (rotating && selectedId) {
      const f = level.furniture.find((q) => q.id === selectedId);
      if (f) {
        const ang = (Math.atan2(c.y - f.y, c.x - f.x) * 180) / Math.PI;
        f.rot = Math.round(rotBase + (ang - rotStart));
        if (e.shiftKey) f.rot = Math.round(f.rot / 15) * 15;
        level.furniture = [...level.furniture];
        commit();
      }
      return;
    }
    if (dragId) {
      const f = level.furniture.find((q) => q.id === dragId);
      if (f) {
        f.x = snap(c.x - dragOff.x, e.shiftKey ? 0.1 : 0.5);
        f.y = snap(c.y - dragOff.y, e.shiftKey ? 0.1 : 0.5);
        level.furniture = [...level.furniture];
        commit();
      }
    }
  }

  function onPointerUp() {
    if (tool === 'wall' && wallStart && wallNow) {
      const len = Math.hypot(wallNow.x - wallStart.x, wallNow.y - wallStart.y);
      if (len >= 0.4) {
        const w: Wall = {
          id: `w_${Date.now()}`,
          x1: wallStart.x, y1: wallStart.y, x2: wallNow.x, y2: wallNow.y,
          kind: wallKind
        };
        level.walls = [...(level.walls ?? []), w];
        selectedId = w.id; selectedType = 'wall';
        commit();
      }
      wallStart = wallNow = null;
      return;
    }
    if (tool === 'area' && draftArea) {
      if (draftArea.w >= 1 && draftArea.h >= 1) {
        const a: Area = {
          id: `a_${Date.now()}`,
          x: draftArea.x, y: draftArea.y, w: draftArea.w, h: draftArea.h,
          kind: areaKind,
          floor: areaFloor
        };
        level.areas = [...level.areas, a];
        selectedId = a.id; selectedType = 'area';
        commit();
      }
      drawStart = drawNow = null;
    }
    dragId = null;
    rotating = false;
  }

  function startRotate(e: PointerEvent, f: Furniture) {
    e.stopPropagation();
    const c = toCell(e);
    rotating = true;
    rotStart = (Math.atan2(c.y - f.y, c.x - f.x) * 180) / Math.PI;
    rotBase = f.rot;
    selectedId = f.id; selectedType = 'furniture';
  }

  function removeSelected() {
    if (!selectedId) return;
    if (selectedType === 'furniture') level.furniture = level.furniture.filter((f) => f.id !== selectedId);
    else if (selectedType === 'area') level.areas = level.areas.filter((a) => a.id !== selectedId);
    else if (selectedType === 'opening') level.openings = (level.openings ?? []).filter((o) => o.id !== selectedId);
    else if (selectedType === 'wall') level.walls = (level.walls ?? []).filter((w) => w.id !== selectedId);
    selectedId = null; selectedType = null;
    commit();
  }

  function onKey(e: KeyboardEvent) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      e.preventDefault();
      removeSelected();
    }
    if (e.key === 'Escape') { selectedId = null; selectedType = null; tool = 'select'; }
  }

  /** 클릭 지점에서 가장 가까운 영역 변에 문을 만든다 */
  function placeOpening(cx0: number, cy0: number) {
    let best: { areaId: string; side: 'N' | 'E' | 'S' | 'W'; t: number; d: number } | null = null;
    for (const a of level?.areas ?? []) {
      if (AREA_META[a.kind].edge === 'none') continue;
      const cand: { side: 'N' | 'E' | 'S' | 'W'; d: number; t: number }[] = [
        { side: 'N', d: Math.abs(cy0 - a.y),        t: (cx0 - a.x) / a.w },
        { side: 'S', d: Math.abs(cy0 - (a.y + a.h)), t: (cx0 - a.x) / a.w },
        { side: 'W', d: Math.abs(cx0 - a.x),        t: (cy0 - a.y) / a.h },
        { side: 'E', d: Math.abs(cx0 - (a.x + a.w)), t: (cy0 - a.y) / a.h }
      ];
      for (const q of cand) {
        if (q.t < 0.05 || q.t > 0.95) continue;      // 모서리엔 안 놓음
        // 변 위에 실제로 붙어 있는지 (다른 축도 영역 범위 안)
        const onSpan =
          q.side === 'N' || q.side === 'S'
            ? cx0 >= a.x - 0.3 && cx0 <= a.x + a.w + 0.3
            : cy0 >= a.y - 0.3 && cy0 <= a.y + a.h + 0.3;
        if (!onSpan) continue;
        if (q.d > 0.6) continue;                     // 벽에서 너무 멀면 무시
        if (!best || q.d < best.d) best = { areaId: a.id, side: q.side, t: q.t, d: q.d };
      }
    }
    if (!best) return;
    const o: Opening = {
      id: `o_${Date.now()}`,
      areaId: best.areaId,
      side: best.side,
      t: Math.round(best.t * 100) / 100,
      kind: doorKind,
      w: doorKind === 'window' ? 1 : 1
    };
    level.openings = [...(level.openings ?? []), o];
    selectedId = o.id; selectedType = 'opening';
    commit();
  }

  /** 특정 좌표에 개구부가 있는지 — 어느 영역 소속이든 인식.
   *  (방 벽과 마당 담장이 같은 자리에 겹쳐도 둘 다 뚫리게) */
  function openingAtPoint(mx: number, my: number): Opening | null {
    for (const o of level?.openings ?? []) {
      const g = openingGeom(o);
      if (!g) continue;
      const half = o.w / 2 + 0.02;
      const near = g.dx === 1
        ? Math.abs(my - g.y) < 0.12 && Math.abs(mx - g.x) < half
        : Math.abs(mx - g.x) < 0.12 && Math.abs(my - g.y) < half;
      if (near) return o;
    }
    return null;
  }

  /* ── 벽 생성: 다른 room과 안 맞닿은 변만 ── */
  type Seg = { x1: number; y1: number; x2: number; y2: number; edge: 'wall' | 'fence' | 'rail' };
  $: walls = ((): Seg[] => {
    const out: Seg[] = [];
    const rooms = level?.areas ?? [];
    for (const a of rooms) {
      const edge = AREA_META[a.kind].edge;
      if (edge === 'none') continue;
      // 각 변을 0.5칸 조각으로 나눠, 같은 종류 영역이 붙어있으면 벽을 안 그림
      const step = 0.5;
      const touch = (px: number, py: number) =>
        rooms.some(
          (b) =>
            b.id !== a.id &&
            AREA_META[b.kind].edge === edge &&
            px > b.x - 0.01 && px < b.x + b.w + 0.01 &&
            py > b.y - 0.01 && py < b.y + b.h + 0.01
        );
      // N, S
      for (let x = a.x; x < a.x + a.w - 0.001; x += step) {
        if (!touch(x + step / 2, a.y - step / 2) && !openingAtPoint(x + step / 2, a.y))
          out.push({ x1: x, y1: a.y, x2: x + step, y2: a.y, edge });
        if (!touch(x + step / 2, a.y + a.h + step / 2) && !openingAtPoint(x + step / 2, a.y + a.h))
          out.push({ x1: x, y1: a.y + a.h, x2: x + step, y2: a.y + a.h, edge });
      }
      // W, E
      for (let y = a.y; y < a.y + a.h - 0.001; y += step) {
        if (!touch(a.x - step / 2, y + step / 2) && !openingAtPoint(a.x, y + step / 2))
          out.push({ x1: a.x, y1: y, x2: a.x, y2: y + step, edge });
        if (!touch(a.x + a.w + step / 2, y + step / 2) && !openingAtPoint(a.x + a.w, y + step / 2))
          out.push({ x1: a.x + a.w, y1: y, x2: a.x + a.w, y2: y + step, edge });
      }
    }
    return out;
  })();

  /** 개구부의 화면 좌표·방향 */
  function openingGeom(o: Opening) {
    const a = (level?.areas ?? []).find((q) => q.id === o.areaId);
    if (!a) return null;
    const span = o.side === 'N' || o.side === 'S' ? a.w : a.h;
    const half = o.w / 2;
    if (o.side === 'N') return { x: a.x + o.t * a.w, y: a.y, dx: 1, dy: 0, half, area: a };
    if (o.side === 'S') return { x: a.x + o.t * a.w, y: a.y + a.h, dx: 1, dy: 0, half, area: a };
    if (o.side === 'W') return { x: a.x, y: a.y + o.t * a.h, dx: 0, dy: 1, half, area: a };
    return { x: a.x + a.w, y: a.y + o.t * a.h, dx: 0, dy: 1, half, area: a };
  }

  /* ── 파일 내보내기/가져오기 ── */
  function exportFile() {
    const data = {
      format: 'genesis-interior', version: 1,
      building, cellPx, customAssets: []
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${building.name || '건물'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data?.format !== 'genesis-interior') { alert('실내 도면 파일이 아니에요.'); return; }
        building = data.building;
        cellPx = data.cellPx ?? 44;
        levelIdx = building.levels[0]?.index ?? 0;
        selectedId = null; selectedType = null;
        commit();
      } catch { alert('파일을 읽지 못했어요.'); }
    };
    reader.readAsText(file);
    (e.target as HTMLInputElement).value = '';
  }

  /** 바닥 무늬: 종류마다 확실히 다르게 */
  function floorPattern(a: Area): string {
    const st = FLOOR_STYLE[a.floor];
    const sw = 1 / cellPx;
    let out = '';
    const L = (x1: number, y1: number, x2: number, y2: number, w = sw, op = 0.5) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${st.ink}" stroke-width="${w}" stroke-opacity="${op}"/>`;

    if (st.pattern === 'plank') {
      // 마루: 가로 널판 + 이음매 엇갈림
      for (let i = 0; i <= a.h * 2; i++) out += L(a.x, a.y + i * 0.5, a.x + a.w, a.y + i * 0.5, sw * 1.4, 0.55);
      for (let r = 0; r < a.h * 2; r++)
        for (let c = (r % 2 ? 0.75 : 0.25); c < a.w; c += 1.5)
          out += L(a.x + c, a.y + r * 0.5, a.x + c, a.y + (r + 1) * 0.5, sw, 0.35);
    } else if (st.pattern === 'brick') {
      // 돌: 벽돌 엇갈림
      for (let i = 0; i <= a.h * 2; i++) out += L(a.x, a.y + i * 0.5, a.x + a.w, a.y + i * 0.5, sw * 1.3, 0.5);
      for (let r = 0; r < a.h * 2; r++)
        for (let c = (r % 2 ? 0.5 : 0); c < a.w; c += 1)
          out += L(a.x + c, a.y + r * 0.5, a.x + c, a.y + (r + 1) * 0.5, sw * 1.3, 0.5);
    } else if (st.pattern === 'tatami') {
      // 다다미: 2:1 돗자리 + 진한 테두리
      for (let r = 0; r < a.h; r++)
        for (let c = 0; c < a.w; c += 2) {
          const w = Math.min(2, a.w - c);
          out += `<rect x="${a.x + c}" y="${a.y + r}" width="${w}" height="1" fill="none" stroke="${st.ink}" stroke-width="${sw * 2}" stroke-opacity="0.6"/>`;
          for (let k = 1; k < 6; k++) out += L(a.x + c + (w * k) / 6, a.y + r + 0.08, a.x + c + (w * k) / 6, a.y + r + 0.92, sw * 0.7, 0.3);
        }
    } else if (st.pattern === 'ondol') {
      // 온돌: 넓은 장판 + 은은한 결
      for (let i = 0; i <= a.h; i++) out += L(a.x, a.y + i, a.x + a.w, a.y + i, sw * 1.2, 0.4);
      for (let i = 0; i <= a.w; i++) out += L(a.x + i, a.y, a.x + i, a.y + a.h, sw * 1.2, 0.4);
    } else if (st.pattern === 'weave') {
      // 카펫: 사선 격자
      for (let d = -a.h; d < a.w + a.h; d += 0.4) {
        out += L(a.x + d, a.y, a.x + d + a.h, a.y + a.h, sw * 0.8, 0.28);
        out += L(a.x + d, a.y + a.h, a.x + d + a.h, a.y, sw * 0.8, 0.28);
      }
    } else if (st.pattern === 'blade') {
      // 잔디: 짧은 풀
      for (let r = 0.15; r < a.h; r += 0.35)
        for (let c = 0.15 + (r % 0.7 < 0.35 ? 0 : 0.17); c < a.w; c += 0.34)
          out += L(a.x + c, a.y + r, a.x + c + 0.06, a.y + r - 0.15, sw * 1.1, 0.5);
    } else if (st.pattern === 'wave') {
      // 물: 물결
      for (let r = 0.3; r < a.h; r += 0.5)
        for (let c = 0.2; c < a.w; c += 0.9)
          out += `<path d="M${a.x + c},${a.y + r} q0.22,-0.14 0.45,0 q0.22,0.14 0.45,0" fill="none" stroke="${st.ink}" stroke-width="${sw * 1.3}" stroke-opacity="0.5"/>`;
    } else if (st.pattern === 'speck') {
      // 흙·모래: 점
      for (let r = 0.18; r < a.h; r += 0.3)
        for (let c = 0.18 + (r % 0.6 < 0.3 ? 0 : 0.15); c < a.w; c += 0.3)
          out += `<circle cx="${a.x + c}" cy="${a.y + r}" r="${sw * 1.6}" fill="${st.ink}" fill-opacity="0.45"/>`;
    }
    return out;
  }

  /** 전체 삭제 */
  function clearAll() {
    if (!confirm('이 층의 영역과 가구를 모두 지울까요? (되돌릴 수 없어요)')) return;
    level.areas = [];
    level.furniture = [];
    level.openings = [];
    level.walls = [];
    level.stairs = [];
    selectedId = null; selectedType = null;
    commit();
  }
  function clearFurniture() {
    if (!confirm('가구만 모두 지울까요?')) return;
    level.furniture = [];
    selectedId = null; selectedType = null;
    commit();
  }

  $: selectedFurniture = selectedType === 'furniture' ? level?.furniture.find((f) => f.id === selectedId) ?? null : null;
  $: selectedWall = selectedType === 'wall' ? (level?.walls ?? []).find((w) => w.id === selectedId) ?? null : null;
  $: selectedOpening = selectedType === 'opening' ? (level?.openings ?? []).find((o) => o.id === selectedId) ?? null : null;
  $: selectedArea = selectedType === 'area' ? level?.areas.find((a) => a.id === selectedId) ?? null : null;
</script>

<svelte:window on:keydown={onKey} />

<div class="w-full h-full flex flex-col bg-canvas">
  <!-- 상단 툴바 -->
  <div class="shrink-0 px-3 py-2 border-b border-line bg-surface/70 flex flex-wrap items-center gap-2">
    <input
      bind:value={building.name}
      on:change={commit}
      placeholder="건물 이름"
      class="w-36 rounded-lg border border-line bg-canvas px-2 py-1 text-xs text-ink outline-none focus:border-primary"
    />

    <div class="flex gap-1">
      {#each [['select', '↖ 선택'], ['area', '▭ 영역'], ['wall', '🧱 담'], ['door', '🚪 문'], ['furniture', '🪑 가구']] as [t, label]}
        <button
          on:click={() => (tool = t)}
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition
                 {tool === t ? 'border-primary text-primary bg-primary/10' : 'border-line text-muted'}"
        >{label}</button>
      {/each}
    </div>

    {#if tool === 'wall'}
      <div class="flex gap-1">
        {#each Object.entries(WALL_STYLE) as [k, m]}
          <button
            on:click={() => (wallKind = k)}
            class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition
                   {wallKind === k ? 'border-primary text-primary bg-primary/10' : 'border-line text-muted'}"
          >{m.label}</button>
        {/each}
      </div>
    {/if}
    {#if tool === 'door'}
      <div class="flex gap-1">
        {#each [['door', '문'], ['window', '창문'], ['arch', '통로']] as [k, label]}
          <button
            on:click={() => (doorKind = k)}
            class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition
                   {doorKind === k ? 'border-primary text-primary bg-primary/10' : 'border-line text-muted'}"
          >{label}</button>
        {/each}
      </div>
    {/if}
    {#if tool === 'area'}
      <select bind:value={areaKind} on:change={() => (areaFloor = AREA_META[areaKind].defaultFloor)}
        class="rounded-lg border border-line bg-canvas px-2 py-1 text-[11px] text-ink">
        {#each Object.entries(AREA_META) as [k, m]}<option value={k}>{m.label}</option>{/each}
      </select>
      <div class="flex gap-0.5">
        {#each Object.entries(FLOOR_STYLE) as [k, m]}
          <button
            on:click={() => (areaFloor = k)}
            title={m.label}
            class="w-7 h-7 rounded border-2 transition {areaFloor === k ? 'border-primary scale-110' : 'border-line'}"
            style="background:{m.fill}"
          ></button>
        {/each}
      </div>
      <span class="text-[11px] text-muted">{FLOOR_STYLE[areaFloor].label}</span>
    {/if}

    <div class="ml-auto flex items-center gap-1.5">
      <button on:click={() => (cellPx = Math.max(20, cellPx - 6))} class="w-7 h-7 rounded border border-line text-muted">−</button>
      <span class="text-[11px] text-muted w-8 text-center">{cellPx}</span>
      <button on:click={() => (cellPx = Math.min(90, cellPx + 6))} class="w-7 h-7 rounded border border-line text-muted">＋</button>
      <button
        on:click={() => (fpv = true)}
        disabled={!(level?.areas?.length)}
        class="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-line text-muted hover:border-primary hover:text-primary disabled:opacity-40"
        title="방 안을 1인칭으로 둘러보기"
      >👁 1인칭</button>
      <button on:click={clearFurniture} class="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-line text-muted hover:border-rose-400 hover:text-rose-400" title="가구만 비우기">🪑✕</button>
      <button on:click={clearAll} class="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-line text-muted hover:border-rose-400 hover:text-rose-400" title="이 층 전체 비우기">🗑 전체</button>
      <button on:click={exportFile} class="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-line text-muted hover:border-primary">⬇ 내보내기</button>
      <label class="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-line text-muted hover:border-primary cursor-pointer">
        ⬆ 가져오기
        <input type="file" accept="application/json,.json" on:change={importFile} class="hidden" />
      </label>
    </div>
  </div>

  <div class="flex-1 flex min-h-0">
    <!-- 캔버스 -->
    <div class="flex-1 relative overflow-hidden">
      <svg
        bind:this={svgEl}
        class="w-full h-full touch-none select-none"
        style="background:#f3efe6"
        on:pointerdown={onPointerDown}
        on:pointermove={onPointerMove}
        on:pointerup={onPointerUp}
        on:pointercancel={onPointerUp}
        role="application"
      >
        <g transform="translate({panX},{panY}) scale({cellPx})">
          <!-- 격자 -->
          <g opacity="0.5">
            {#each Array(40) as _, i}
              <line x1={i} y1={-2} x2={i} y2={30} stroke="#cfcabb" stroke-width={1 / cellPx} />
              <line x1={-2} y1={i} x2={40} y2={i} stroke="#cfcabb" stroke-width={1 / cellPx} />
            {/each}
          </g>

          <!-- 영역(바닥) -->
          <defs>
            {#each level?.areas ?? [] as a (a.id)}
              <clipPath id="fclip-{a.id}">
                <rect x={a.x} y={a.y} width={a.w} height={a.h} />
              </clipPath>
            {/each}
          </defs>
          {#each level?.areas ?? [] as a (a.id)}
            <g>
              <rect x={a.x} y={a.y} width={a.w} height={a.h} fill={FLOOR_STYLE[a.floor].fill} />
              <g clip-path="url(#fclip-{a.id})">{@html floorPattern(a)}</g>
              {#if selectedId === a.id}
                <rect x={a.x} y={a.y} width={a.w} height={a.h} fill="none" stroke="#4f7cff" stroke-width={2 / cellPx} stroke-dasharray="{6 / cellPx} {4 / cellPx}" />
              {/if}
            </g>
          {/each}

          <!-- 가구 -->
          {#each level?.furniture ?? [] as f (f.id)}
            {@const item = catalogItem(f.kind)}
            <g transform="translate({f.x},{f.y}) rotate({f.rot})">
              {#if item}
                {@html item.draw(f.w, f.h)}
              {:else}
                <rect x={-f.w / 2} y={-f.h / 2} width={f.w} height={f.h} fill="#ccc" stroke="#333" stroke-width="0.04" />
              {/if}
              {#if selectedId === f.id}
                <rect x={-f.w / 2 - 0.06} y={-f.h / 2 - 0.06} width={f.w + 0.12} height={f.h + 0.12}
                  fill="none" stroke="#4f7cff" stroke-width={2 / cellPx} />
                <!-- 회전 핸들 -->
                <g on:pointerdown={(e) => startRotate(e, f)} style="cursor:grab">
                  <line x1="0" y1={-f.h / 2 - 0.06} x2="0" y2={-f.h / 2 - 0.42} stroke="#4f7cff" stroke-width={2 / cellPx} />
                  <circle cx="0" cy={-f.h / 2 - 0.5} r="0.16" fill="#fff" stroke="#4f7cff" stroke-width={2 / cellPx} />
                </g>
              {/if}
            </g>
          {/each}

          <!-- 벽·담장 -->
          {#each walls as w}
            <line
              x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
              stroke={w.edge === 'wall' ? '#3c4046' : w.edge === 'fence' ? '#8a7a5c' : '#9aa3ab'}
              stroke-width={(w.edge === 'wall' ? 5 : 3) / cellPx}
              stroke-linecap="square"
              stroke-dasharray={w.edge === 'fence' ? `${5 / cellPx} ${4 / cellPx}` : 'none'}
            />
          {/each}

          <!-- 직접 세운 담·울타리 -->
          {#each level?.walls ?? [] as w (w.id)}
            {@const st = WALL_STYLE[w.kind]}
            <g>
              <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                stroke={st.color} stroke-width={st.width / cellPx}
                stroke-linecap="round"
                stroke-dasharray={st.dash ? st.dash.split(' ').map((n) => Number(n) / cellPx).join(' ') : 'none'} />
              {#if w.kind === 'fence'}
                <!-- 울타리 말뚝 -->
                {#each fencePosts(w) as p}
                  <circle cx={p.x} cy={p.y} r={0.06} fill={st.color} />
                {/each}
              {/if}
              {#if selectedId === w.id}
                <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                  stroke="#4f7cff" stroke-width={(st.width + 4) / cellPx} stroke-opacity="0.35" stroke-linecap="round" />
              {/if}
            </g>
          {/each}

          <!-- 그리는 중인 담 -->
          {#if wallStart && wallNow}
            <line x1={wallStart.x} y1={wallStart.y} x2={wallNow.x} y2={wallNow.y}
              stroke={WALL_STYLE[wallKind].color} stroke-width={WALL_STYLE[wallKind].width / cellPx}
              stroke-linecap="round" stroke-opacity="0.7" />
            <circle cx={wallStart.x} cy={wallStart.y} r={0.09} fill="#4f7cff" />
            <circle cx={wallNow.x} cy={wallNow.y} r={0.09} fill="#4f7cff" />
          {/if}

          <!-- 문·창문·통로 -->
          {#each level?.openings ?? [] as o (o.id)}
            {@const g = openingGeom(o)}
            {#if g}
              {@const ax = g.x - g.dx * (o.w / 2)}
              {@const ay = g.y - g.dy * (o.w / 2)}
              {@const bx = g.x + g.dx * (o.w / 2)}
              {@const by = g.y + g.dy * (o.w / 2)}
              <g>
                {#if o.kind === 'window'}
                  <!-- 창문: 짙은 테두리 + 파란 유리 + 흰 중앙선 -->
                  <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#3c4046" stroke-width={7 / cellPx} />
                  <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#8fc4e8" stroke-width={4.5 / cellPx} />
                  <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#ffffff" stroke-width={1.2 / cellPx} stroke-opacity="0.9" />
                {:else if o.kind === 'arch'}
                  <!-- 트인 통로: 양쪽 기둥만, 사이는 완전히 비움 -->
                  <rect x={ax - 0.09} y={ay - 0.09} width="0.18" height="0.18" fill="#3c4046" />
                  <rect x={bx - 0.09} y={by - 0.09} width="0.18" height="0.18" fill="#3c4046" />
                {:else}
                  <!-- 문: 문틀(비움) + 힌지 + 문짝 + 열림 호 -->
                  <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#f3efe6" stroke-width={8 / cellPx} />
                  <circle cx={ax} cy={ay} r="0.075" fill="#3c4046" />
                  <circle cx={bx} cy={by} r="0.075" fill="#3c4046" />
                  <line x1={ax} y1={ay} x2={ax + g.dy * o.w} y2={ay + g.dx * o.w}
                        stroke="#3c4046" stroke-width={3.5 / cellPx} />
                  <path
                    d="M{ax + g.dy * o.w},{ay + g.dx * o.w} A{o.w},{o.w} 0 0 {g.dx > 0 ? 0 : 1} {bx},{by}"
                    fill="none" stroke="#3c4046" stroke-width={1.6 / cellPx}
                    stroke-dasharray="{5 / cellPx} {4 / cellPx}" stroke-opacity="0.75" />
                {/if}
                {#if selectedId === o.id}
                  <circle cx={g.x} cy={g.y} r={0.3} fill="none" stroke="#4f7cff" stroke-width={2 / cellPx} />
                {/if}
              </g>
            {/if}
          {/each}

          <!-- 그리는 중인 영역 -->
          {#if draftArea}
            <rect x={draftArea.x} y={draftArea.y} width={draftArea.w} height={draftArea.h}
              fill="#4f7cff22" stroke="#4f7cff" stroke-width={2 / cellPx} stroke-dasharray="{6 / cellPx} {4 / cellPx}" />
          {/if}
        </g>
      </svg>

      <!-- 안내 -->
      <div class="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/55 text-white text-[11px] backdrop-blur pointer-events-none">
        {#if tool === 'wall'}
      <div class="flex gap-1">
        {#each Object.entries(WALL_STYLE) as [k, m]}
          <button
            on:click={() => (wallKind = k)}
            class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition
                   {wallKind === k ? 'border-primary text-primary bg-primary/10' : 'border-line text-muted'}"
          >{m.label}</button>
        {/each}
      </div>
    {/if}
    {#if tool === 'door'}
      <div class="flex gap-1">
        {#each [['door', '문'], ['window', '창문'], ['arch', '통로']] as [k, label]}
          <button
            on:click={() => (doorKind = k)}
            class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition
                   {doorKind === k ? 'border-primary text-primary bg-primary/10' : 'border-line text-muted'}"
          >{label}</button>
        {/each}
      </div>
    {/if}
    {#if tool === 'area'}드래그해서 영역을 만드세요
        {:else if tool === 'furniture'}지도를 눌러 가구를 놓으세요
        {:else}가구를 끌어 옮기고, 위 손잡이로 돌리세요 (Shift = 미세 조정){/if}
      </div>
    </div>

    <!-- 우측 패널 -->
    <div class="w-52 shrink-0 border-l border-line bg-surface/50 overflow-y-auto">
      {#if tool === 'furniture'}
        <div class="p-2">
          <p class="text-[11px] font-bold text-ink mb-1.5">가구</p>
          {#each CATALOG_GROUPS as g}
            <p class="text-[10px] text-muted mt-2 mb-1">{g}</p>
            <div class="grid grid-cols-2 gap-1">
              {#each CATALOG.filter((c) => c.group === g) as c}
                <button
                  on:click={() => (pickedKind = c.kind)}
                  class="p-1 rounded-lg border text-[10px] transition
                         {pickedKind === c.kind ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted'}"
                >
                  <svg viewBox="-1.4 -1.4 2.8 2.8" class="w-full h-8">
                    {@html c.draw(c.w, c.h)}
                  </svg>
                  {c.label}
                </button>
              {/each}
            </div>
          {/each}
        </div>
      {:else if selectedFurniture}
        <div class="p-3 space-y-2">
          <p class="text-[11px] font-bold text-ink">{catalogItem(selectedFurniture.kind)?.label ?? '가구'}</p>
          <label class="block">
            <span class="text-[10px] text-muted">이름표</span>
            <input bind:value={selectedFurniture.label} on:change={commit}
              placeholder="촌장의 침대"
              class="w-full rounded border border-line bg-canvas px-2 py-1 text-[11px] text-ink" />
          </label>
          <label class="block">
            <span class="text-[10px] text-muted">회전 — {Math.round(selectedFurniture.rot)}°</span>
            <input type="range" min="0" max="359" bind:value={selectedFurniture.rot} on:input={commit} class="w-full" />
          </label>
          <div class="flex gap-1">
            <label class="flex-1">
              <span class="text-[10px] text-muted">가로</span>
              <input type="number" step="0.5" min="0.5" bind:value={selectedFurniture.w} on:change={commit}
                class="w-full rounded border border-line bg-canvas px-1 py-0.5 text-[11px] text-ink" />
            </label>
            <label class="flex-1">
              <span class="text-[10px] text-muted">세로</span>
              <input type="number" step="0.5" min="0.5" bind:value={selectedFurniture.h} on:change={commit}
                class="w-full rounded border border-line bg-canvas px-1 py-0.5 text-[11px] text-ink" />
            </label>
          </div>
          <button on:click={removeSelected} class="w-full py-1.5 rounded-lg text-[11px] font-bold border border-rose-400/50 text-rose-400">🗑 삭제</button>
        </div>
      {:else if selectedWall}
        <div class="p-3 space-y-2">
          <p class="text-[11px] font-bold text-ink">{WALL_STYLE[selectedWall.kind].label}</p>
          <label class="block">
            <span class="text-[10px] text-muted">종류</span>
            <select bind:value={selectedWall.kind} on:change={commit}
              class="w-full rounded border border-line bg-canvas px-2 py-1 text-[11px] text-ink">
              {#each Object.entries(WALL_STYLE) as [k, m]}<option value={k}>{m.label}</option>{/each}
            </select>
          </label>
          <p class="text-[10px] text-subtle">길이 {Math.hypot(selectedWall.x2 - selectedWall.x1, selectedWall.y2 - selectedWall.y1).toFixed(1)}칸</p>
          <button on:click={removeSelected} class="w-full py-1.5 rounded-lg text-[11px] font-bold border border-rose-400/50 text-rose-400">🗑 삭제</button>
        </div>
      {:else if selectedOpening}
        <div class="p-3 space-y-2">
          <p class="text-[11px] font-bold text-ink">
            {selectedOpening.kind === 'door' ? '문' : selectedOpening.kind === 'window' ? '창문' : '트인 통로'}
          </p>
          <label class="block">
            <span class="text-[10px] text-muted">종류</span>
            <select bind:value={selectedOpening.kind} on:change={commit}
              class="w-full rounded border border-line bg-canvas px-2 py-1 text-[11px] text-ink">
              <option value="door">문</option>
              <option value="window">창문</option>
              <option value="arch">트인 통로</option>
            </select>
          </label>
          <label class="block">
            <span class="text-[10px] text-muted">위치 — {Math.round(selectedOpening.t * 100)}%</span>
            <input type="range" min="0.05" max="0.95" step="0.01" bind:value={selectedOpening.t} on:input={commit} class="w-full" />
          </label>
          <label class="block">
            <span class="text-[10px] text-muted">폭 — {selectedOpening.w}칸</span>
            <input type="range" min="0.5" max="2" step="0.25" bind:value={selectedOpening.w} on:input={commit} class="w-full" />
          </label>
          <button on:click={removeSelected} class="w-full py-1.5 rounded-lg text-[11px] font-bold border border-rose-400/50 text-rose-400">🗑 삭제</button>
        </div>
      {:else if selectedArea}
        <div class="p-3 space-y-2">
          <p class="text-[11px] font-bold text-ink">{AREA_META[selectedArea.kind].label}</p>
          <label class="block">
            <span class="text-[10px] text-muted">이름</span>
            <input bind:value={selectedArea.name} on:change={commit} placeholder="안방"
              class="w-full rounded border border-line bg-canvas px-2 py-1 text-[11px] text-ink" />
          </label>
          <label class="block">
            <span class="text-[10px] text-muted">바닥</span>
            <select bind:value={selectedArea.floor} on:change={commit}
              class="w-full rounded border border-line bg-canvas px-2 py-1 text-[11px] text-ink">
              {#each Object.entries(FLOOR_STYLE) as [k, m]}<option value={k}>{m.label}</option>{/each}
            </select>
          </label>
          <p class="text-[10px] text-subtle">{selectedArea.w} × {selectedArea.h} 칸</p>
          <button on:click={removeSelected} class="w-full py-1.5 rounded-lg text-[11px] font-bold border border-rose-400/50 text-rose-400">🗑 삭제</button>
        </div>
      {:else}
        <div class="p-3 text-[11px] text-muted leading-relaxed">
          <p class="font-bold text-ink mb-1">사용법</p>
          <p>① <b>▭ 영역</b>으로 방·마당을 그려요</p>
          <p>② <b>🧱 담</b>으로 마당에 울타리를 세워요</p>
          <p>③ <b>🚪 문</b>으로 벽에 출입구를 내요</p>
          <p>④ <b>🪑 가구</b>에서 골라 눌러 놓아요</p>
          <p>⑤ <b>↖ 선택</b>으로 끌어 옮기고 손잡이로 회전</p>
          <p class="mt-2">Delete = 삭제 · Shift = 미세 조정</p>
        </div>
      {/if}
    </div>
  </div>

  {#if fpv}
    <FirstPersonView {level} onClose={() => (fpv = false)} />
  {/if}
</div>
