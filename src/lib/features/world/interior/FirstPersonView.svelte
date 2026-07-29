<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Level, Area, Furniture } from './types';
  import { AREA_META, FLOOR_STYLE } from './types';
  import { catalogItem } from './catalog';

  export let level: Level;
  export let onClose: () => void = () => {};

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let raf = 0;

  /* ── 카메라 ── */
  let px = 2, py = 2;      // 칸 좌표
  let dir = 0;             // 라디안
  const FOV = Math.PI / 3; // 60도
  const EYE = 0.5;         // 눈높이 비율

  /* ── 벽 세그먼트 (편집 화면과 같은 규칙) ── */
  type Seg = { x1: number; y1: number; x2: number; y2: number; kind: 'wall' | 'fence' | 'rail'; open?: 'door' | 'window' | 'arch' };
  let segs: Seg[] = [];

  /** 개구부의 실제 좌표 */
  function openingPos(o: any): { x: number; y: number; horiz: boolean } | null {
    const a = (level?.areas ?? []).find((q) => q.id === o.areaId);
    if (!a) return null;
    if (o.side === 'N') return { x: a.x + o.t * a.w, y: a.y, horiz: true };
    if (o.side === 'S') return { x: a.x + o.t * a.w, y: a.y + a.h, horiz: true };
    if (o.side === 'W') return { x: a.x, y: a.y + o.t * a.h, horiz: false };
    return { x: a.x + a.w, y: a.y + o.t * a.h, horiz: false };
  }

  /** 특정 좌표(벽 조각 중점)에 개구부가 있는지 — 어느 영역 소속이든 인식.
   *  (방 벽과 마당 담장이 같은 자리에 겹쳐 있어도 둘 다 뚫리게 하기 위함) */
  function openingKindAtPoint(mx: number, my: number): 'door' | 'window' | 'arch' | null {
    for (const o of level?.openings ?? []) {
      const g = openingPos(o);
      if (!g) continue;
      const half = o.w / 2 + 0.02;
      const near = g.horiz
        ? Math.abs(my - g.y) < 0.12 && Math.abs(mx - g.x) < half
        : Math.abs(mx - g.x) < 0.12 && Math.abs(my - g.y) < half;
      if (near) return o.kind as any;
    }
    return null;
  }

  function buildWalls() {
    const out: Seg[] = [];
    const areas = level?.areas ?? [];
    for (const a of areas) {
      const edge = AREA_META[a.kind].edge;
      if (edge === 'none') continue;
      const step = 0.5;
      const touch = (qx: number, qy: number) =>
        areas.some(
          (b) =>
            b.id !== a.id &&
            AREA_META[b.kind].edge === edge &&
            qx > b.x - 0.01 && qx < b.x + b.w + 0.01 &&
            qy > b.y - 0.01 && qy < b.y + b.h + 0.01
        );
      for (let x = a.x; x < a.x + a.w - 0.001; x += step) {
        if (!touch(x + step / 2, a.y - step / 2))
          out.push({ x1: x, y1: a.y, x2: x + step, y2: a.y, kind: edge as any, open: openingKindAtPoint(x + step / 2, a.y) ?? undefined });
        if (!touch(x + step / 2, a.y + a.h + step / 2))
          out.push({ x1: x, y1: a.y + a.h, x2: x + step, y2: a.y + a.h, kind: edge as any, open: openingKindAtPoint(x + step / 2, a.y + a.h) ?? undefined });
      }
      for (let y = a.y; y < a.y + a.h - 0.001; y += step) {
        if (!touch(a.x - step / 2, y + step / 2))
          out.push({ x1: a.x, y1: y, x2: a.x, y2: y + step, kind: edge as any, open: openingKindAtPoint(a.x, y + step / 2) ?? undefined });
        if (!touch(a.x + a.w + step / 2, y + step / 2))
          out.push({ x1: a.x + a.w, y1: y, x2: a.x + a.w, y2: y + step, kind: edge as any, open: openingKindAtPoint(a.x + a.w, y + step / 2) ?? undefined });
      }
    }
    // 사용자가 직접 세운 담·울타리
    for (const w of level?.walls ?? []) {
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      const n = Math.max(1, Math.round(len / 0.5));
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const x1 = w.x1 + (w.x2 - w.x1) * t0, y1 = w.y1 + (w.y2 - w.y1) * t0;
        const x2 = w.x1 + (w.x2 - w.x1) * t1, y2 = w.y1 + (w.y2 - w.y1) * t1;
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        out.push({
          x1, y1, x2, y2,
          kind: w.kind === 'rail' ? 'rail' : 'fence',
          open: openingKindAtPoint(mx, my) ?? undefined
        });
      }
    }
    segs = out;
  }

  /** 카메라를 첫 방 중앙에 */
  function placeCamera() {
    const room = (level?.areas ?? []).find((a) => a.kind === 'room') ?? level?.areas?.[0];
    if (room) { px = room.x + room.w / 2; py = room.y + room.h / 2; }
    dir = 0;
  }

  /** 점이 어느 영역 안인지 (바닥 색용) */
  function areaAt(x: number, y: number): Area | null {
    const list = level?.areas ?? [];
    for (let i = list.length - 1; i >= 0; i--) {
      const a = list[i];
      if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) return a;
    }
    return null;
  }

  /* ── 광선 ↔ 선분 교차 ── */
  function castRay(ox: number, oy: number, ang: number): { dist: number; kind: Seg['kind']; hitX: number; open?: Seg['open'] } | null {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let best: { dist: number; kind: Seg['kind']; hitX: number; open?: Seg['open'] } | null = null;
    for (const s of segs) {
      const sx = s.x2 - s.x1, sy = s.y2 - s.y1;
      const den = dx * sy - dy * sx;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((s.x1 - ox) * sy - (s.y1 - oy) * sx) / den;      // 광선 거리
      const u = ((s.x1 - ox) * dy - (s.y1 - oy) * dx) / den;      // 선분 위 위치 0~1
      if (t <= 0.001 || u < 0 || u > 1) continue;
      if (!best || t < best.dist) best = { dist: t, kind: s.kind, hitX: u, open: s.open };
    }
    return best;
  }

  /* ── 조작 ── */
  const keys = new Set<string>();
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') { if (document.pointerLockElement) document.exitPointerLock?.(); onClose(); return; }
    keys.add(e.key.toLowerCase());
  }
  function onKeyUp(e: KeyboardEvent) { keys.delete(e.key.toLowerCase()); }

  // 터치: 좌측=이동(가상 스틱), 우측=회전
  let touchMove: { id: number; x0: number; y0: number; dx: number; dy: number } | null = null;
  let touchLook: { id: number; x0: number } | null = null;
  let locked = false;          // 마우스 포인터 잠금 여부
  let isTouch = false;         // 터치 기기인지

  function requestLock() {
    if (isTouch) return;
    canvas?.requestPointerLock?.();
  }
  function onLockChange() {
    locked = document.pointerLockElement === canvas;
  }
  function onMouseMove(e: MouseEvent) {
    if (!locked) return;
    dir += e.movementX * 0.0022;   // 마우스로 시점 회전
  }

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse') {
      isTouch = false;
      if (!locked) { requestLock(); return; }
      return;
    }
    isTouch = true;
    const r = canvas.getBoundingClientRect();
    if (e.clientX - r.left < r.width / 2) touchMove = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 };
    else touchLook = { id: e.pointerId, x0: e.clientX };
    canvas.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (touchMove?.id === e.pointerId) {
      touchMove.dx = Math.max(-1, Math.min(1, (e.clientX - touchMove.x0) / 55));
      touchMove.dy = Math.max(-1, Math.min(1, (e.clientY - touchMove.y0) / 55));
    } else if (touchLook?.id === e.pointerId) {
      dir += (e.clientX - touchLook.x0) * 0.007;
      touchLook.x0 = e.clientX;
    }
  }
  function onPointerUp(e: PointerEvent) {
    if (touchMove?.id === e.pointerId) touchMove = null;
    if (touchLook?.id === e.pointerId) touchLook = null;
  }

  /** 벽에 막히는지 (간단 충돌) */
  function canMoveTo(nx: number, ny: number): boolean {
    // 영역 안이거나, 문 바로 앞(문지방)이면 허용
    if (!areaAt(nx, ny) && !nearOpening(nx, ny)) return false;
    const R = 0.18;
    for (const s of segs) {
      if (s.kind === 'rail') continue;              // 난간은 통과
      if (s.open === 'door' || s.open === 'arch') continue; // 문·통로는 지나갈 수 있음
      const sx = s.x2 - s.x1, sy = s.y2 - s.y1;
      const L2 = sx * sx + sy * sy;
      let t = L2 === 0 ? 0 : ((nx - s.x1) * sx + (ny - s.y1) * sy) / L2;
      t = Math.max(0, Math.min(1, t));
      const cx = s.x1 + t * sx, cy = s.y1 + t * sy;
      if (Math.hypot(nx - cx, ny - cy) < R) return false;
    }
    return true;
  }

  /** 문 근처인지 (문지방을 지날 때 잠깐 영역 밖이 됨) */
  function nearOpening(x: number, y: number): boolean {
    for (const o of level?.openings ?? []) {
      const a = (level?.areas ?? []).find((q) => q.id === o.areaId);
      if (!a) continue;
      let ox: number, oy: number;
      if (o.side === 'N') { ox = a.x + o.t * a.w; oy = a.y; }
      else if (o.side === 'S') { ox = a.x + o.t * a.w; oy = a.y + a.h; }
      else if (o.side === 'W') { ox = a.x; oy = a.y + o.t * a.h; }
      else { ox = a.x + a.w; oy = a.y + o.t * a.h; }
      if (Math.hypot(x - ox, y - oy) < o.w * 0.5 + 0.35) return true;
    }
    return false;
  }

  function step(dt: number) {
    const SP = 3.2 * dt, RT = 2.6 * dt;
    let mf = 0, ms = 0;
    if (keys.has('w') || keys.has('arrowup')) mf += 1;
    if (keys.has('s') || keys.has('arrowdown')) mf -= 1;
    if (keys.has('a')) ms -= 1;
    if (keys.has('d')) ms += 1;
    if (keys.has('arrowleft')) dir -= RT;
    if (keys.has('arrowright')) dir += RT;
    if (touchMove) { mf += -touchMove.dy; ms += touchMove.dx; }

    if (mf || ms) {
      const len = Math.hypot(mf, ms) || 1;
      const fx = Math.cos(dir), fy = Math.sin(dir);
      const nx = px + ((fx * mf - fy * ms) / len) * SP;
      const ny = py + ((fy * mf + fx * ms) / len) * SP;
      if (canMoveTo(nx, py)) px = nx;
      if (canMoveTo(px, ny)) py = ny;
    }
  }

  /* ── 렌더 ── */
  function draw() {
    if (!ctx || !canvas) return;
    const W = canvas.width, H = canvas.height;

    // 천장 / 바닥
    const here = areaAt(px, py);
    const floorFill = here ? FLOOR_STYLE[here.floor].fill : '#8b8377';
    const g = ctx.createLinearGradient(0, 0, 0, H / 2);
    g.addColorStop(0, '#2b2f36'); g.addColorStop(1, '#4a5058');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H / 2);
    const g2 = ctx.createLinearGradient(0, H / 2, 0, H);
    g2.addColorStop(0, '#5b5b52'); g2.addColorStop(1, floorFill);
    ctx.fillStyle = g2; ctx.fillRect(0, H / 2, W, H / 2);

    // 벽
    const zbuf = new Float32Array(W);
    for (let sx = 0; sx < W; sx++) {
      const a = dir - FOV / 2 + (FOV * sx) / W;
      const hit = castRay(px, py, a);
      zbuf[sx] = hit ? hit.dist : Infinity;
      if (!hit) continue;
      const corrected = hit.dist * Math.cos(a - dir); // 어안 보정
      const h = Math.min(H * 3, H / corrected);
      const y0 = H / 2 - h * EYE, y1 = y0 + h;
      // 벽 종류·거리별 명암
      const base = hit.kind === 'wall' ? [122, 116, 104] : hit.kind === 'fence' ? [138, 122, 92] : [154, 163, 171];
      const shade = Math.max(0.25, Math.min(1, 1.35 / (1 + corrected * 0.32)));
      const edgeDark = hit.hitX < 0.04 || hit.hitX > 0.96 ? 0.75 : 1;
      const c = base.map((v) => Math.round(v * shade * edgeDark));
      const wallCol = `rgb(${c[0]},${c[1]},${c[2]})`;

      if (!hit.open) {
        // 온전한 벽
        ctx.fillStyle = wallCol;
        ctx.fillRect(sx, y0, 1, y1 - y0);
      } else if (hit.open === 'arch') {
        // 트인 통로: 위 아치 + 양옆 기둥만 (문짝 없음 → 문과 구분)
        const H0 = y1 - y0;
        ctx.fillStyle = wallCol;
        // 가운데로 갈수록 아치가 얇아지는 곡선
        const archH = H0 * (0.10 + 0.10 * Math.abs(hit.hitX - 0.5) * 2);
        ctx.fillRect(sx, y0, 1, archH);
        if (hit.hitX < 0.07 || hit.hitX > 0.93) ctx.fillRect(sx, y0, 1, H0);
      } else if (hit.open === 'door') {
        // 문: 인방 + 문설주 + 반쯤 열린 나무 문짝 (통로와 확실히 구분)
        const H0 = y1 - y0;
        ctx.fillStyle = wallCol;
        ctx.fillRect(sx, y0, 1, H0 * 0.18);                       // 인방
        if (hit.hitX < 0.1 || hit.hitX > 0.9) {
          ctx.fillRect(sx, y0, 1, H0);                            // 문설주
        } else if (hit.hitX < 0.46) {
          // 문짝(나무): 왼쪽 절반을 덮은 채 반쯤 열린 모습
          const woodShade = shade * (0.85 + (0.46 - hit.hitX) * 0.4);
          const wc = [140, 100, 62].map((v) => Math.round(v * woodShade));
          ctx.fillStyle = `rgb(${wc[0]},${wc[1]},${wc[2]})`;
          ctx.fillRect(sx, y0 + H0 * 0.18, 1, H0 * 0.82);
          // 문짝 판재 이음선
          if (Math.abs(hit.hitX - 0.24) < 0.012 || Math.abs(hit.hitX - 0.36) < 0.012) {
            ctx.fillStyle = `rgba(70,48,28,${0.7 * shade})`;
            ctx.fillRect(sx, y0 + H0 * 0.18, 1, H0 * 0.82);
          }
          // 손잡이
          if (Math.abs(hit.hitX - 0.42) < 0.022) {
            ctx.fillStyle = `rgba(215,190,110,${0.95 * shade})`;
            ctx.fillRect(sx, y0 + H0 * 0.52, 1, H0 * 0.07);
          }
        } else {
          // 열린 틈: 안쪽 어둠 + 문지방
          const g3 = ctx.createLinearGradient(0, y0 + H0 * 0.18, 0, y1);
          g3.addColorStop(0, `rgba(18,20,24,${0.62 * shade})`);
          g3.addColorStop(1, `rgba(18,20,24,${0.18 * shade})`);
          ctx.fillStyle = g3;
          ctx.fillRect(sx, y0 + H0 * 0.18, 1, H0 * 0.82);
          ctx.fillStyle = `rgba(96,76,54,${0.95 * shade})`;
          ctx.fillRect(sx, y1 - H0 * 0.055, 1, H0 * 0.055);       // 문지방
        }
      } else if (hit.open === 'window') {
        // 창문: 위 인방 + 아래 허리벽 + 가운데 유리(하늘색 반투명 + 창살)
        const H0 = y1 - y0;
        ctx.fillStyle = wallCol;
        ctx.fillRect(sx, y0, 1, H0 * 0.22);                      // 위 벽
        ctx.fillRect(sx, y0 + H0 * 0.68, 1, H0 * 0.32);          // 아래 허리벽
        if (hit.hitX < 0.1 || hit.hitX > 0.9) {
          ctx.fillRect(sx, y0, 1, H0);                            // 창틀 옆기둥
        } else {
          // 유리
          ctx.fillStyle = `rgba(150,200,232,${0.75 * shade})`;
          ctx.fillRect(sx, y0 + H0 * 0.22, 1, H0 * 0.46);
          // 창살 (가운데 세로)
          if (Math.abs(hit.hitX - 0.5) < 0.035) {
            ctx.fillStyle = wallCol;
            ctx.fillRect(sx, y0 + H0 * 0.22, 1, H0 * 0.46);
          }
          // 유리 광택
          ctx.fillStyle = `rgba(255,255,255,${0.22 * shade})`;
          ctx.fillRect(sx, y0 + H0 * 0.25, 1, H0 * 0.1);
        }
      }
    }

    // 가구: 빌보드 (정면 스프라이트 없으면 색 박스)
    const items = (level?.furniture ?? [])
      .map((f) => ({ f, d: Math.hypot(f.x - px, f.y - py) }))
      .sort((A, B) => B.d - A.d); // 먼 것부터
    for (const { f, d } of items) {
      if (d < 0.15 || d > 24) continue;
      let ang = Math.atan2(f.y - py, f.x - px) - dir;
      while (ang < -Math.PI) ang += Math.PI * 2;
      while (ang > Math.PI) ang -= Math.PI * 2;
      if (Math.abs(ang) > FOV / 2 + 0.35) continue;
      const sx = W / 2 + (ang / FOV) * W;
      const corrected = d * Math.cos(ang);
      const size = H / corrected;
      const item = catalogItem(f.kind);
      const hRatio = furnitureHeight(f.kind);          // 가구 높이(칸 기준)
      const bw = size * Math.max(f.w, f.h) * 0.55;
      const bh = size * hRatio;
      const yBase = H / 2 + size * EYE;                 // 바닥 접점
      // 가려짐 처리
      if (zbuf[Math.round(Math.max(0, Math.min(W - 1, sx)))] < corrected) continue;
      const shade = Math.max(0.3, Math.min(1, 1.3 / (1 + corrected * 0.3)));
      const col = furnitureColor(f.kind).map((v) => Math.round(v * shade));
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.fillRect(sx - bw / 2, yBase - bh, bw, bh);
      ctx.strokeStyle = `rgba(20,22,26,${0.5 * shade})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - bw / 2, yBase - bh, bw, bh);
      // 이름표
      if (f.label && corrected < 6) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, 1.6 / corrected)})`;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(f.label, sx, yBase - bh - 6);
      }
    }
  }

  /** 가구 종류별 높이(칸) — 정면 스프라이트 생기기 전 임시 */
  function furnitureHeight(kind: string): number {
    if (kind.startsWith('bed')) return 0.28;
    if (kind === 'shelf' || kind === 'wardrobe') return 0.95;
    if (kind === 'hearth') return 0.8;
    if (kind === 'rug') return 0.02;
    if (kind === 'chair') return 0.5;
    if (kind === 'table_rect' || kind === 'table_round' || kind === 'desk') return 0.45;
    if (kind === 'chest' || kind === 'barrel') return 0.4;
    if (kind === 'plant') return 0.35;
    return 0.5;
  }
  function furnitureColor(kind: string): number[] {
    if (kind.startsWith('bed')) return [184, 148, 154];
    if (kind === 'shelf') return [140, 110, 78];
    if (kind === 'wardrobe') return [168, 135, 90];
    if (kind === 'hearth') return [150, 145, 132];
    if (kind === 'rug') return [168, 139, 156];
    if (kind === 'plant') return [143, 168, 118];
    if (kind === 'stove') return [120, 116, 106];
    return [201, 169, 120];
  }

  let last = 0;
  function loop(t: number) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    step(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function resize() {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width);
    canvas.height = Math.round(r.height);
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    buildWalls();
    placeCamera();
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('mousemove', onMouseMove);
    raf = requestAnimationFrame(loop);
  });
  onDestroy(() => {
    cancelAnimationFrame(raf);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', resize);
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('mousemove', onMouseMove);
      if (document.pointerLockElement) document.exitPointerLock?.();
    }
  });
</script>

<svelte:window on:keydown={onKeyDown} on:keyup={onKeyUp} />

<div class="fixed inset-0 z-50 bg-black">
  <canvas
    bind:this={canvas}
    class="w-full h-full touch-none"
    on:pointerdown={onPointerDown}
    on:pointermove={onPointerMove}
    on:pointerup={onPointerUp}
    on:pointercancel={onPointerUp}
  ></canvas>

  <button
    on:click={() => { if (document.pointerLockElement) document.exitPointerLock?.(); onClose(); }}
    class="absolute top-4 left-4 px-4 py-2 rounded-xl bg-black/60 border border-white/15 text-slate-100 text-sm font-bold backdrop-blur"
  >✕ 나가기</button>

  <!-- 마우스: 잠금 안내 -->
  {#if !isTouch && !locked}
    <button
      on:click={requestLock}
      class="absolute inset-0 m-auto w-64 h-24 rounded-2xl bg-black/65 border border-white/20 text-slate-100 backdrop-blur flex flex-col items-center justify-center gap-1"
    >
      <span class="text-sm font-bold">화면을 클릭하세요</span>
      <span class="text-[11px] text-white/70">마우스로 둘러보기 · WASD 이동 · ESC 나가기</span>
    </button>
  {/if}

  <!-- 터치: 가상 스틱 -->
  {#if isTouch}
    <div class="absolute left-6 bottom-8 w-28 h-28 rounded-full border-2 border-white/25 bg-white/5 pointer-events-none">
      <div
        class="absolute w-12 h-12 rounded-full bg-white/25 border border-white/40"
        style="left:{50 + (touchMove?.dx ?? 0) * 28}%; top:{50 + (touchMove?.dy ?? 0) * 28}%; transform:translate(-50%,-50%)"
      ></div>
    </div>
    <div class="absolute right-6 bottom-8 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white/70 text-[11px] pointer-events-none">
      끌어서 둘러보기
    </div>
  {/if}

  {#if !isTouch && locked}
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 text-white/70 text-[11px] backdrop-blur pointer-events-none">
      WASD 이동 · 마우스 둘러보기 · ESC 나가기
    </div>
    <!-- 조준점 -->
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/50 pointer-events-none"></div>
  {/if}
</div>
