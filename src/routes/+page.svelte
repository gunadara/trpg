<script context="module">
  /** [중요] SSR 비활성화 — 클라이언트 스토어(localStorage/SQLite)를 메인에서 직접 사용 */
  export const ssr = false;
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { listAllDocs } from '$lib/stores/docStore';
  import type { WorldDoc } from '$lib/domain/docs';

  // 10대 핵심 카테고리
  const categories = [
    { id: 'characters', name: '인물', icon: '👤' },
    { id: 'locations', name: '장소', icon: '📍' },
    { id: 'items', name: '아이템', icon: '💎' },
    { id: 'skills', name: '스킬', icon: '✨' },
    { id: 'quests', name: '퀘스트', icon: '📜' },
    { id: 'events', name: '사건', icon: '🔥' },
    { id: 'groups', name: '단체', icon: '🚩' },
    { id: 'nations', name: '나라', icon: '🏳️' },
    { id: 'races', name: '종족', icon: '🧝‍♀️' },
    { id: 'storylines', name: '스토리', icon: '📖' }
  ];
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

  let allDocs: WorldDoc[] = [];
  let isLoaded = false;

  function refreshData() {
    if (!browser) return;
    try {
      allDocs = listAllDocs() || [];
    } catch (e) {
      console.error('GENESIS Core: 데이터 로드 중 치명적 에러', e);
    } finally {
      isLoaded = true;
    }
  }

  onMount(refreshData);

  // 카테고리별 개수 + 최근 문서(수정순)
  $: countOf = (id: string) => allDocs.filter((d) => d.category === id).length;
  $: recent = [...allDocs]
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 8);
  $: totalCount = allDocs.length;
</script>

<div class="min-h-[100dvh] bg-canvas text-ink font-sans selection:bg-indigo-100 dark:selection:bg-indigo-500/30 flex flex-col overflow-hidden">
  <!-- 배경 블롭 -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-indigo-200/40 dark:bg-indigo-600/15 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-normal"></div>
    <div class="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-200/40 dark:bg-purple-600/15 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-normal"></div>
  </div>

  <main class="relative z-10 w-full px-4 sm:px-6 md:px-8 py-8 flex-1 flex flex-col min-h-0">
    <!-- 헤더 -->
    <header class="mb-8 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end shrink-0">
      <div>
        <div class="flex items-center gap-3 mb-2">
          <div class="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[9px] font-black tracking-widest uppercase shadow-sm">System Online</div>
          <a href="/play" class="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-[9px] font-black tracking-widest uppercase hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all shadow-sm">Go to Session 🎲</a>
        </div>
        <h1 class="text-3xl sm:text-4xl font-black tracking-tighter italic leading-none text-ink">
          GENE<span class="text-primary">SIS</span> <span class="text-subtle text-xl sm:text-2xl font-light not-italic uppercase tracking-normal">Engine</span>
        </h1>
        <p class="text-muted text-[10px] font-bold mt-1 uppercase tracking-[0.2em]">Master World Builder v0.4</p>
      </div>

      <a
        href="/world"
        class="bg-primary hover:opacity-90 text-white px-6 py-3 rounded-2xl font-black text-sm transition shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 hover:shadow-xl hover:-translate-y-0.5 shrink-0"
      >
        <span>+</span> 세계관 관리
      </a>
    </header>

    <!-- 카테고리 런처 -->
    <section class="shrink-0 mb-8">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-[11px] font-black uppercase tracking-[0.2em] text-subtle">카테고리</h2>
        <span class="text-[11px] font-bold text-muted">전체 {totalCount}개 문서</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {#each categories as cat}
          <a
            href={`/world/${cat.id}`}
            class="group bg-surface border border-line hover:border-primary/40 rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div class="flex items-center justify-between">
              <span class="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
              <span class="text-[11px] font-black text-muted bg-bubble rounded-full px-2 py-0.5 min-w-[1.5rem] text-center">{countOf(cat.id)}</span>
            </div>
            <span class="text-sm font-black tracking-tight text-ink group-hover:text-primary transition-colors">{cat.name}</span>
          </a>
        {/each}
      </div>
    </section>

    <!-- 최근 문서 -->
    <section class="flex-1 min-h-0 flex flex-col mb-6">
      <h2 class="text-[11px] font-black uppercase tracking-[0.2em] text-subtle mb-3 shrink-0">최근 문서</h2>
      <div class="flex-1 min-h-0 overflow-y-auto custom-scroll pr-1">
        {#if !isLoaded}
          <div class="h-full flex flex-col items-center justify-center space-y-4">
            <div class="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p class="text-subtle text-[10px] font-black tracking-[0.3em] uppercase italic">Syncing with local storage...</p>
          </div>
        {:else if recent.length === 0}
          <div class="h-full flex flex-col items-center justify-center py-16 text-center">
            <div class="w-20 h-20 bg-bubble rounded-full flex items-center justify-center text-4xl border border-line shadow-sm grayscale opacity-30 mb-5">📝</div>
            <p class="text-lg font-black uppercase tracking-widest text-subtle">No Data</p>
            <p class="text-xs mt-2 font-medium text-muted">위 카테고리에서 첫 문서를 만들어 보세요.</p>
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {#each recent as doc (doc.id)}
              <a
                href={`/world/${doc.category}/${doc.id}`}
                class="group bg-surface border border-line hover:border-primary/40 hover:shadow-md rounded-2xl p-4 transition-all flex items-center gap-4 shadow-sm"
              >
                <div class="w-14 h-14 rounded-xl bg-bubble flex items-center justify-center overflow-hidden border border-line shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                  {#if doc.thumbnailPath}
                    <img src={doc.thumbnailPath} alt={doc.title} class="w-full h-full object-cover" />
                  {:else}
                    <span class="text-2xl opacity-70">{catById[doc.category]?.icon ?? '📄'}</span>
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <span class="text-[9px] font-black uppercase tracking-widest text-primary">{catById[doc.category]?.name ?? doc.category}</span>
                  <h3 class="font-black text-ink truncate group-hover:text-primary transition-colors text-base tracking-tight leading-tight">{doc.title || '제목 없음'}</h3>
                  <p class="text-[11px] text-muted line-clamp-1 leading-relaxed font-medium">{doc.summary || '상세 요약 설명이 아직 등록되지 않았습니다.'}</p>
                </div>
                <span class="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 text-primary font-black text-xl pr-1">→</span>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </section>

    <!-- 하단 상태바 -->
    <footer class="mt-auto pt-6 border-t border-line flex flex-wrap gap-y-2 justify-between items-center text-[10px] font-black text-subtle uppercase tracking-widest shrink-0">
      <div class="flex flex-wrap gap-x-6 gap-y-1">
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"></span>
          Database: Connected
        </div>
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          Storage: Client-Stored
        </div>
      </div>
      <div class="opacity-60 italic font-medium text-muted">Genesis Core v0.4</div>
    </footer>
  </main>
</div>

<style>
  .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
  .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.2); }
  :global(.dark) .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); }
  :global(.dark) .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(129, 140, 248, 0.3); }

  @keyframes spin { to { transform: rotate(360deg); } }
  .animate-spin { animation: spin 1s linear infinite; }
</style>
