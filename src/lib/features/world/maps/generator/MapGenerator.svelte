<script lang="ts">
  // 자체 지도 생성기 — 3·4단계 패널
  import { createBlankDoc, patchDoc } from '$lib/stores/docStore';
  import { generateTerrain } from './terrain';
  import { generateVillage, renderVillageSvg } from './village';
  import { renderTerrainSvg, svgToDataUrl, svgDataUrlToPng } from './renderSvg';

  export let onSaved: (docId: string) => void = () => {};
  export let onClose: () => void = () => {};

  let mapType: 'world' | 'region' | 'village' = 'world';
  let worldName = '';
  let seed = String(Math.floor(Math.random() * 90000) + 10000);
  let cellCount = 2500;
  let seaLevel = 0.42;
  let continents = 1;
  let islandLevel = 0.3; // 섬 밀도 0~1
  let wide = false; // 넓은 세계 (1600×1120)
  // 마을 전용
  let vKind: 'hamlet' | 'village' | 'town' | 'citadel' = 'village'; // 취락 유형
  const V_KINDS = [
    { v: 'hamlet', label: '촌락' },
    { v: 'village', label: '마을' },
    { v: 'town', label: '읍' },
    { v: 'citadel', label: '성채' }
  ] as const;
  let vDensity = 0.55;   // 건물 밀도
  let vRiver = true;     // 개천
  let vWalled = false;   // 성벽

  let previewUrl = '';   // 항상 PNG (웹뷰 SVG 렌더 크래시 방지)
  let lastSeed = '';
  let saving = false;
  let exporting = false;
  let rendering = false;
  let genToken = 0; // 연타 시 마지막 요청만 반영

  async function generate() {
    const token = ++genToken;
    rendering = true;
    let svgUrl: string;

    if (mapType === 'village') {
      const v = generateVillage({
        seed: seed.trim() || 'genesis',
        kind: vKind,
        density: vDensity,
        river: vRiver,
        walled: vWalled,
        width: 1200,
        height: 850
      });
      svgUrl = svgToDataUrl(renderVillageSvg(v, { title: worldName }));
      lastSeed = v.seed;
    } else {
      const size = wide
        ? { width: 1600, height: 1120, cellCount: Math.max(cellCount, 4000) }
        : { width: 1000, height: 700, cellCount };
      const t = generateTerrain({
        seed: seed.trim() || 'genesis',
        seaLevel: mapType === 'region' ? Math.min(seaLevel, 0.38) : seaLevel,
        continents: mapType === 'region' ? 1 : continents,
        islands: islandLevel,
        scale: mapType,
        ...size
      });
      svgUrl = svgToDataUrl(renderTerrainSvg(t, { title: worldName, scale: mapType }));
      lastSeed = t.seed;
    }

    try {
      const png = await svgDataUrlToPng(svgUrl, 1.5); // 한 번만 래스터화
      if (token !== genToken) return; // 더 새 요청이 있으면 버림
      previewUrl = png;
    } catch {
      if (token !== genToken) return;
      previewUrl = svgUrl; // 변환 실패 시 폴백
    } finally {
      if (token === genToken) rendering = false;
    }
  }

  function reroll() {
    seed = String(Math.floor(Math.random() * 90000) + 10000);
    generate();
  }

  function save() {
    if (!previewUrl || saving) return;
    saving = true;
    const doc = createBlankDoc('locations');
    patchDoc(doc.id, {
      title: worldName.trim() || (mapType === 'village' ? `마을 #${lastSeed}` : `생성 지도 #${lastSeed}`),
      attributes: {
        mapImage: previewUrl,
        pins: [],
        mapGen:
          mapType === 'village'
            ? { seed: lastSeed, type: 'village', kind: vKind, density: vDensity, river: vRiver, walled: vWalled, title: worldName, stage: 11 }
            : { seed: lastSeed, cellCount, seaLevel, continents, islands: islandLevel, wide, title: worldName, type: mapType, stage: 10 }
      }
    });
    saving = false;
    onSaved(doc.id);
  }

  async function exportPng() {
    if (!previewUrl || exporting) return;
    exporting = true;
    try {
      const png = await svgDataUrlToPng(previewUrl, 2);
      const a = document.createElement('a');
      a.href = png;
      a.download = `map-${lastSeed}.png`;
      a.click();
    } catch (e) {
      alert('PNG 변환에 실패했어요.');
    } finally {
      exporting = false;
    }
  }

  generate();
</script>

<div class="w-full max-w-md rounded-2xl border border-line bg-surface p-5 space-y-4">
  <div class="flex items-center justify-between">
    <h2 class="text-sm font-bold text-ink">🌍 지도 생성</h2>
    <button class="text-xs text-muted hover:text-ink" on:click={onClose}>닫기</button>
  </div>

  <!-- 미리보기 -->
  <div class="rounded-xl overflow-hidden border border-line bg-canvas">
    {#if previewUrl}
      <img src={previewUrl} alt="생성된 지도 미리보기" class="w-full block" />
    {/if}
  </div>

  <!-- 조절 -->
  <div class="space-y-3">
    <div class="flex gap-1.5">
      <button
        on:click={() => { mapType = 'world'; generate(); }}
        class="flex-1 py-1.5 rounded-lg text-xs font-bold border transition {mapType === 'world' ? 'border-primary text-primary' : 'border-line text-muted'}"
      >🌍 세계</button>
      <button
        on:click={() => { mapType = 'region'; generate(); }}
        class="flex-1 py-1.5 rounded-lg text-xs font-bold border transition {mapType === 'region' ? 'border-primary text-primary' : 'border-line text-muted'}"
      >🗺️ 나라</button>
      <button
        on:click={() => { mapType = 'village'; generate(); }}
        class="flex-1 py-1.5 rounded-lg text-xs font-bold border transition {mapType === 'village' ? 'border-primary text-primary' : 'border-line text-muted'}"
      >🏘️ 마을</button>
    </div>

    <input
      type="text"
      bind:value={worldName}
      placeholder={mapType === 'village' ? '마을 이름 (비워도 됨)' : '세계 이름 (지도 제목으로 들어가요, 비워도 됨)'}
      class="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-primary"
      on:change={generate}
    />

    <div class="flex gap-2">
      <input
        type="text"
        bind:value={seed}
        placeholder="시드 (같은 시드 = 같은 지도)"
        class="flex-1 min-w-0 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-primary"
        on:keydown={(e) => e.key === 'Enter' && generate()}
      />
      <button on:click={generate} class="px-3 py-2 rounded-lg border border-line text-xs font-bold text-muted hover:border-primary hover:text-primary transition shrink-0">이 시드로</button>
      <button on:click={reroll} class="px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition shrink-0">{rendering ? "…" : "🎲 새로"}</button>
    </div>

    {#if mapType === 'village'}
      <!-- 마을 전용 조절 -->
      <div class="flex gap-1">
        {#each V_KINDS as k}
          <button
            on:click={() => { vKind = k.v; generate(); }}
            class="flex-1 py-1 rounded-lg text-[11px] font-bold border transition {vKind === k.v ? 'border-primary text-primary' : 'border-line text-muted'}"
          >{k.label}</button>
        {/each}
      </div>

      <label class="block">
        <span class="text-[11px] text-muted">건물 밀도 — {vDensity < 0.35 ? '듬성' : vDensity < 0.7 ? '보통' : '빽빽'}</span>
        <input type="range" min="0.1" max="1" step="0.05" bind:value={vDensity} on:change={generate} class="w-full" />
      </label>
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-1.5 text-[11px] text-muted">
          <input type="checkbox" bind:checked={vRiver} on:change={generate} />
          개천 지나감
        </label>
        <label class="flex items-center gap-1.5 text-[11px] text-muted">
          <input type="checkbox" bind:checked={vWalled} on:change={generate} />
          성벽 두르기
        </label>
      </div>
    {:else}
      <div class="flex items-center gap-3">
        <label class="flex-1 block" class:opacity-40={mapType === 'region'}>
          <span class="text-[11px] text-muted">대륙 수 — {mapType === 'region' ? '1 (고정)' : continents}</span>
          <input type="range" min="1" max="4" step="1" bind:value={continents} on:change={generate} class="w-full" />
        </label>
        <label class="flex items-center gap-1.5 text-[11px] text-muted shrink-0 pt-3">
          <input type="checkbox" bind:checked={wide} on:change={generate} />
          넓은 세계
        </label>
      </div>

      <label class="block">
        <span class="text-[11px] text-muted">섬 — {islandLevel === 0 ? '없음' : islandLevel < 0.4 ? '조금' : islandLevel < 0.75 ? '보통' : '많음'}</span>
        <input type="range" min="0" max="1" step="0.05" bind:value={islandLevel} on:change={generate} class="w-full" />
      </label>

      <label class="block">
        <span class="text-[11px] text-muted">바다 비율 — {Math.round(seaLevel * 100)}</span>
        <input type="range" min="0.25" max="0.6" step="0.01" bind:value={seaLevel} on:change={generate} class="w-full" />
      </label>

      <label class="block">
        <span class="text-[11px] text-muted">디테일(셀 수) — {cellCount}</span>
        <input type="range" min="800" max="6000" step="100" bind:value={cellCount} on:change={generate} class="w-full" />
      </label>
    {/if}
  </div>

  <div class="flex gap-2">
    <button
      on:click={save}
      disabled={!previewUrl || saving}
      class="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-40"
    >
      📍 장소 문서로 저장
    </button>
    <button
      on:click={exportPng}
      disabled={!previewUrl || exporting}
      class="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-muted hover:border-primary hover:text-primary transition disabled:opacity-40"
    >
      {exporting ? '변환 중…' : '🖼️ PNG'}
    </button>
  </div>
  <p class="text-[10px] text-subtle leading-relaxed">
    저장하면 「생성 지도 #시드」 장소 문서가 만들어지고 핀을 찍을 수 있어요.
    시드·설정이 함께 저장돼서 같은 지도를 다시 뽑을 수 있어요.
  </p>
</div>
