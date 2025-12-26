<script lang="ts">
  import { onMount } from 'svelte';
  import type { WorldDoc } from '$lib/domain/docs';
  import { CATEGORY_META } from '$lib/domain/categories';

  export let docs: WorldDoc[] = [];
  export let onNodeClick: (id: string) => void = () => {};

  let container: HTMLDivElement;
  let network: any;

  // 카테고리별 색상 테마 (GENESIS 스타일)
  const COLORS: Record<string, any> = {
    characters: { background: '#7986CB', border: '#5C6BC0', highlight: '#C5CAE9' },
    locations: { background: '#81C784', border: '#66BB6A', highlight: '#C8E6C9' },
    items: { background: '#FFB74D', border: '#FFA726', highlight: '#FFE0B2' },
    nations: { background: '#E57373', border: '#EF5350', highlight: '#FFCDD2' },
    events: { background: '#BA68C8', border: '#AB47BC', highlight: '#E1BEE7' },
    default: { background: '#90A4AE', border: '#78909C', highlight: '#CFD8DC' }
  };

  onMount(async () => {
    // 1. vis-network 라이브러리 동적 로드 (CDN)
    const vis = (window as any).vis;
    if (!vis) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/vis-network/standalone/umd/vis-network.min.js';
      document.head.appendChild(script);
      script.onload = () => initNetwork();
    } else {
      initNetwork();
    }
  });

  function initNetwork() {
    const vis = (window as any).vis;
    
    // 2. 데이터 변환 (Docs -> Nodes & Edges)
    const nodes = docs.map(doc => ({
      id: doc.id,
      label: doc.title,
      title: doc.summary || doc.title, // 툴팁
      color: COLORS[doc.category] || COLORS.default,
      font: { color: '#ffffff', size: 14, strokeWidth: 2, strokeColor: '#000000' },
      shape: 'dot',
      size: doc.category === 'characters' ? 25 : 18 // 주인공(인물)은 좀 더 크게
    }));

    const edges: any[] = [];
    docs.forEach(doc => {
      if (doc.mentions && doc.mentions.length > 0) {
        doc.mentions.forEach(targetId => {
          // 중복 선 방지 및 유효한 타겟인지 확인
          if (docs.some(d => d.id === targetId)) {
            edges.push({
              from: doc.id,
              to: targetId,
              arrows: 'to',
              color: { color: '#475569', opacity: 0.4 },
              width: 1
            });
          }
        });
      }
    });

    // 3. 네트워크 옵션 설정
    const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
    const options = {
      nodes: {
        borderWidth: 2,
        shadow: true
      },
      edges: {
        smooth: { type: 'continuous' }
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
      interaction: {
        hover: true,
        tooltipDelay: 200
      }
    };

    network = new vis.Network(container, data, options);

    // 4. 클릭 이벤트 연결
    network.on('click', (params: any) => {
      if (params.nodes.length > 0) {
        onNodeClick(params.nodes[0]);
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
    마우스 휠: 확대/축소 | 드래그: 이동 | 노드 클릭: 문서 이동
  </div>
</div>

<style>
  /* vis-network 툴팁 스타일 보정 */
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