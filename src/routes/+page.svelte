<script context="module">
  /**
   * [중요] SSR 비활성화
   * 클라이언트 사이드 스토어(localStorage/SQLite)를 메인에서 바로 사용하므로 
   * 서버 사이드 렌더링 시 발생하는 모듈 오류를 차단합니다.
   */
  export const ssr = false;
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { listAllDocs } from '$lib/stores/docStore';
  import type { WorldDoc } from '$lib/domain/docs';

  // 1. 10대 핵심 카테고리 정의
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

  // 2. 상태 관리
  let allDocs: WorldDoc[] = [];
  let selectedCategoryId = 'characters';
  let isLoaded = false;

  /**
   * 실제 스토어에서 데이터를 동기화합니다.
   */
  function refreshData() {
    if (browser) {
      try {
        const data = listAllDocs();
        allDocs = data || [];
      } catch (e) {
        console.error("GENESIS Core: 데이터 로드 중 치명적 에러", e);
      } finally {
        isLoaded = true;
      }
    }
  }

  onMount(() => {
    refreshData();
  });

  // 선택된 카테고리에 맞춰 리스트 자동 필터링
  $: filteredDocs = allDocs.filter(d => d.category === selectedCategoryId);
  $: currentCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];

  function selectCategory(id: string) {
    selectedCategoryId = id;
  }
</script>

<div class="min-h-[100dvh] bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 flex flex-col overflow-hidden">
  <!-- 배경 레이어: 밝은 테마 시각 효과 -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-indigo-200/40 blur-[120px] rounded-full mix-blend-multiply"></div>
    <div class="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-200/40 blur-[100px] rounded-full mix-blend-multiply"></div>
  </div>

  <main class="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 flex flex-col min-h-0">
    <!-- 헤더: 타이틀 및 TRPG 진입 -->
    <header class="mb-8 flex justify-between items-end shrink-0">
      <div>
        <div class="flex items-center gap-3 mb-2">
            <div class="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-600 text-[9px] font-black tracking-widest uppercase shadow-sm">System Online</div>
            <a href="/play" class="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-600 text-[9px] font-black tracking-widest uppercase hover:bg-rose-100 hover:text-rose-700 transition-all shadow-sm">Go to Session 🎲</a>
        </div>
        <h1 class="text-4xl font-black tracking-tighter italic leading-none text-slate-900">
          GENE<span class="text-indigo-600">SIS</span> <span class="text-slate-400 text-2xl font-light not-italic uppercase tracking-normal">Engine</span>
        </h1>
        <p class="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-[0.2em]">
          Master World Builder v0.3.8
        </p>
      </div>

      <a
        href={`/world/${selectedCategoryId}/new`}
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-sm transition shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2 hover:shadow-xl hover:-translate-y-0.5"
      >
        <span>+</span> 신규 {currentCategory.name} 작성
      </a>
    </header>

    <!-- 메인 레이아웃: 사이드바 + 리스트 -->
    <div class="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden mb-6">
      
      <!-- [좌측] 10개 카테고리 네비게이션 -->
      <nav
        class="lg:w-52 w-full shrink-0
               flex lg:flex-col flex-row gap-2
               overflow-x-auto lg:overflow-y-auto
               custom-scroll pb-2 lg:pb-0 pr-2"
      >
        {#each categories as cat}
          <button
            on:click={() => selectCategory(cat.id)}
            class="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all border text-left group shrink-0 shadow-sm
            {selectedCategoryId === cat.id
              ? 'bg-white border-indigo-200 text-indigo-700 shadow-md translate-x-1 ring-1 ring-indigo-100' 
              : 'bg-white/60 border-white/50 text-slate-500 hover:border-indigo-100 hover:bg-white hover:text-slate-700'}"
          >
            <span class="text-xl transition-transform group-hover:scale-110">{cat.icon}</span>
            <span class="text-sm font-black tracking-tight whitespace-nowrap">{cat.name}</span>
          </button>
        {/each}
      </nav>

      <!-- [우측] 문서 목록 (밝은 테마용) -->
      <section class="flex-1 min-h-0 bg-white/70 rounded-[2.5rem] border border-white/60 flex flex-col overflow-hidden backdrop-blur-xl shadow-xl ring-1 ring-black/5">
        
        <!-- 본문 헤더 -->
        <div class="p-6 border-b border-slate-100 bg-white/50 flex justify-between items-center shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl border border-indigo-100 text-indigo-600 shadow-sm">
              {currentCategory.icon}
            </div>
            <div>
              <h2 class="font-black text-xl leading-none mb-1 text-slate-800">{currentCategory.name} 목록</h2>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                {selectedCategoryId} database
              </p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100 shadow-sm">
              {filteredDocs.length} RECORDS
            </span>
          </div>
        </div>

        <!-- 스크롤 가능한 본문 영역 -->
        <div class="flex-1 min-h-0 overflow-y-auto p-6 custom-scroll">
          {#if !isLoaded}
            <div class="h-full flex flex-col items-center justify-center space-y-4">
              <div class="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p class="text-slate-400 text-[10px] font-black tracking-[0.3em] uppercase italic">
                Syncing with local storage...
              </p>
            </div>

          {:else if filteredDocs.length === 0}
            <!-- 데이터가 없을 때의 UI -->
            <div class="h-full flex flex-col items-center justify-center py-20">
              <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl border border-slate-100 shadow-sm grayscale opacity-30 mb-6 transition-opacity group-hover:opacity-50">
                {currentCategory.icon}
              </div>
              <div class="text-center">
                <p class="text-lg font-black uppercase tracking-widest text-slate-400">No Data</p>
                <p class="text-xs mt-2 font-medium text-slate-500 uppercase tracking-tight">새로운 기록을 추가하여 내용을 채워보세요.</p>
              </div>
            </div>

          {:else}
            <!-- 실제 데이터 카드 그리드 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each filteredDocs as doc (doc.id)}
                <a
                  href={`/world/${selectedCategoryId}/${doc.id}`}
                  class="group bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/50 rounded-[2rem] p-5 transition-all flex items-center gap-5 shadow-sm relative overflow-hidden"
                >
                  <!-- 썸네일 영역 -->
                  <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm shrink-0 group-hover:scale-105 transition-transform z-10">
                    {#if doc.thumbnailPath}
                      <img src={doc.thumbnailPath} alt={doc.title} class="w-full h-full object-cover" />
                    {:else}
                      <!-- 썸네일 부재 시 밝은 그라데이션 아이콘 제공 -->
                      <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                        <span class="text-2xl opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                          {currentCategory.icon}
                        </span>
                      </div>
                    {/if}
                  </div>

                  <div class="flex-1 min-w-0 z-10">
                    <h3 class="font-black text-slate-800 truncate mb-1 group-hover:text-indigo-600 transition-colors text-base tracking-tight leading-tight">
                      {doc.title}
                    </h3>
                    <p class="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">
                      {doc.summary || '상세 요약 설명이 아직 등록되지 않았습니다.'}
                    </p>
                  </div>

                  <div class="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 text-indigo-500 font-black text-xl z-10 pr-2">
                    →
                  </div>
                </a>
              {/each}
            </div>
          {/if}
        </div>
      </section>
    </div>

    <!-- 하단 상태 표시바 -->
    <footer class="mt-auto pt-6 border-t border-slate-200/60 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
      <div class="flex gap-8">
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"></span>
          Database: Connected
        </div>
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          Storage: Client-Stored
        </div>
      </div>
      <div class="opacity-60 italic font-medium text-slate-500">Genesis Core v0.3.8</div>
    </footer>
  </main>
</div>

<style>
  /* 커스텀 스크롤바 디자인 (밝은 모드용) */
  .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
  .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.2); }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>