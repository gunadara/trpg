<script lang="ts">
  import { onMount } from 'svelte';
  import type { WorldDoc } from '$lib/domain/docs';
  import { DEFAULT_REL_TYPES, type RelType } from '$lib/stores/relationLabels';

  export let docs: WorldDoc[] = [];
  export let labels: Record<string, string> = {};   // `${from}->${to}` -> 관계 타입
  export let types: Record<string, RelType> = DEFAULT_REL_TYPES;
  export let onNodeClick: (id: string) => void = () => {};
  export let onEdgeClick: (from: string, to: string) => void = () => {};

  let container: HTMLDivElement;
  let network: any = null;
  let visReady = false;

  // 카테고리별 색상 테마 (GENESIS 스타일)
  const COLORS: Record<string, any> = {
    characters: { background: '#7986CB', border: '#5C6BC0', highlight: '#C5CAE9' },
    locations: { background: '#81C784', border: '#66BB6A', highlight: '#C8E6C9' },
    items: { background: '#FFB74D', border: '#FFA726', highlight: '#FFE0B2' },
    nations: { background: '#E57373', border: '#EF5350', highlight: '#FFCDD2' },
    events: { background: '#BA68C8', border: '#AB47BC', highlight: '#E1BEE7' },
    default: { background: '#90A4AE', border: '#78909C', highlight: '#CFD8DC' }
  };

  onMount(() => {
    const w = window as any;
    if (w.vis) {
      visReady = true;
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/vis-network/standalone/umd/vis-network.min.js';
      script.onload = () => { visReady = true; };
      document.head.appendChild(script);
    }
    return () => { if (network) network.destroy(); };
  });

  // docs나 labels가 바뀌면 다시 그림 (필터 토글 대응)
  $: if (visReady && container) render(docs, labels, types);

  function render(docList: WorldDoc[], labelMap: Record<string, string>, typeMap: Record<string, RelType>) {
    const vis = (window as any).vis;
    if (!vis) return;

    const ids = new Set(docList.map((d) => d.id));

    const nodes = docList.map((doc) => ({
      id: doc.id,
      label: doc.title,
      title: doc.summary || doc.title,
      color: COLORS[doc.category] || COLORS.default,
      font: { color: '#ffffff', size: 14, strokeWidth: 2, strokeColor: '#000000' },
      shape: 'dot',
      size: doc.category === 'characters' ? 25 : 18
    }));

    const edges: any[] = [];
    docList.forEach((doc) => {
      (doc.mentions ?? []).forEach((targetId) => {
        if (!ids.has(targetId)) return; // 필터로 숨은 노드로 가는 선은 생략
        const key = `${doc.id}->${targetId}`;
        const rel = labelMap[key] ? (typeMap[labelMap[key]] ?? null) : null;
        edges.push({
          id: key,
          from: doc.id,
          to: targetId,
          arrows: 'to',
          label: rel ? rel.label : undefined,
          font: rel
            ? { color: rel.color, size: 11, strokeWidth: 4, strokeColor: '#0f172a' }
            : undefined,
          color: rel
            ? { color: rel.color, opacity: 0.85, highlight: rel.color }
            : { color: '#475569', opacity: 0.4 },
          width: rel ? 2 : 1
        });
      });
    });

    const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
    const options = {
      nodes: { borderWidth: 2, shadow: true },
      edges: {
        smooth: { type: 'continuous' },
        hoverWidth: 1.5,
        selectionWidth: 2
      },
      physics: {
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 100,
          springConstant: 0.08
        },
        maxVelocity: 50,
        solver: 'forceAtlas2Based',
        timestep: 0.35,
        stabilization: { iterations: 150 }
      },
      interaction: { hover: true, tooltipDelay: 200 }
    };

    if (network) network.destroy();
    network = new vis.Network(container, data, options);

    network.on('click', (params: any) => {
      if (params.nodes.length > 0) {
        onNodeClick(params.nodes[0]);
      } else if (params.edges.length > 0) {
        // 선 클릭 → 관계 라벨 편집
        const [from, to] = String(params.edges[0]).split('->');
        if (from && to) onEdgeClick(from, to);
      }
    });
  }
</script>

<div class="relative w-full h-full bg-[#0f172a] overflow-hidden rounded-2xl border border-slate-800">
  <div bind:this={container} class="w-full h-full"></div>

  <!-- 범례 (Legend) -->
  <div class="absolute bottom-4 left-4 p-3 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 flex flex-wrap gap-3 pointer-events-none">
    {#each Object.entries(COLORS) as [cat, theme]}
      {#if cat !== 'default'}
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-full" style="background: {theme.background}"></div>
          <span class="text-[10px] text-slate-300 uppercase font-bold">{cat}</span>
        </div>
      {/if}
    {/each}
  </div>

  <!-- 조작 안내 -->
  <div class="absolute top-4 right-4 text-[10px] text-slate-500 bg-black/20 px-2 py-1 rounded">
    휠: 확대/축소 | 드래그: 이동 | 노드 클릭: 문서 | 선 클릭: 관계 라벨
  </div>
</div>

<style>
  :global(.vis-tooltip) {
    background-color: #1e293b !important;
    color: #f1f5f9 !important;
    border: 1px solid #334155 !important;
    padding: 8px !important;
    border-radius: 8px !important;
    font-size: 12px !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
  }
</style>
