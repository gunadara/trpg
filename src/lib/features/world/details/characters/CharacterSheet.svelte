<script lang="ts">
  import { searchDocsByTitle } from '$lib/stores/docStore';
  import type { WorldDoc } from '$lib/domain/docs';

  export let value: any = {};

  // 1. 데이터 초기화
  if (!value.level) value.level = 1;
  if (!value.hp) value.hp = { current: 20, max: 20 };
  if (!value.mp) value.mp = { current: 10, max: 10 };
  if (!value.stats) value.stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  
  // 인벤토리 & 스킬 초기화
  if (!value.inventory) value.inventory = []; // { name, count, refId? }
  if (!value.skills) value.skills = [];       // { name, refId? }

  // ---------------------------------------------------------
  // 🔍 검색 및 연결 로직 (아이템 & 스킬 공용)
  // ---------------------------------------------------------
  let isSearchOpen = false;
  let searchTarget: 'inventory' | 'skills' | null = null;
  let searchQuery = '';
  let searchResults: WorldDoc[] = [];

  // 검색창 열기
  function openSearch(target: 'inventory' | 'skills') {
    isSearchOpen = true;
    searchTarget = target;
    searchQuery = '';
    // 초기엔 빈 검색어 -> 해당 카테고리 전체 목록이 뜨도록 유도
    handleSearch();
  }

  // 검색어 입력 시 동작
  function handleSearch() {
    // 1. 전체 검색
    const all = searchDocsByTitle(searchQuery);
    // 2. 카테고리로 필터링 (아이템 추가면 아이템만, 스킬 추가면 스킬만)
    const categoryFilter = searchTarget === 'inventory' ? 'items' : 'skills';
    searchResults = all.filter(d => d.category === categoryFilter);
  }

  // 검색된 항목 선택 (연결)
  function selectItem(doc: WorldDoc) {
    if (searchTarget === 'inventory') {
      // 인벤토리에 추가 (기본 수량 1, refId 저장)
      value.inventory = [...value.inventory, { name: doc.title, count: 1, refId: doc.id }];
    } else if (searchTarget === 'skills') {
      // 스킬에 추가
      value.skills = [...value.skills, { name: doc.title, refId: doc.id }];
    }
    closeSearch();
  }

  // 직접 입력해서 추가 (검색 결과 없을 때)
  function addManualItem() {
    if (!searchQuery.trim()) return;
    if (searchTarget === 'inventory') {
      value.inventory = [...value.inventory, { name: searchQuery, count: 1 }]; // refId 없음
    } else if (searchTarget === 'skills') {
      value.skills = [...value.skills, { name: searchQuery }];
    }
    closeSearch();
  }

  function closeSearch() {
    isSearchOpen = false;
    searchTarget = null;
  }

  // 삭제 기능
  function removeItem(target: 'inventory' | 'skills', index: number) {
    if (target === 'inventory') {
      value.inventory = value.inventory.filter((_: any, i: number) => i !== index);
    } else {
      value.skills = value.skills.filter((_: any, i: number) => i !== index);
    }
  }
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-6 relative">
  
  <!-- 헤더 -->
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      🦸‍♂️ 캐릭터 데이터 시트
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">
      Stats / Inventory / Skills
    </p>
  </div>

  <!-- 1. 기본 프로필 (레벨 / 직업 / 종족 / 성향) -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">Lv.</label>
      <input type="number" bind:value={value.level} class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-center font-bold outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">직업</label>
      <input type="text" bind:value={value.class} class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">종족</label>
      <input type="text" bind:value={value.race} class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">성향</label>
      <input type="text" bind:value={value.alignment} class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
  </div>

  <!-- 2. 바이탈 게이지 (HP / MP) -->
  <div class="bg-white/50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-4">
    <!-- HP -->
    <div>
      <div class="flex justify-between items-end mb-1 px-1">
        <label class="text-xs font-bold text-red-500">❤️ HP</label>
        <div class="flex items-center gap-1 text-xs">
          <input type="number" bind:value={value.hp.current} class="w-12 text-right bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-red-500 outline-none font-bold" />
          <span class="text-slate-400">/</span>
          <input type="number" bind:value={value.hp.max} class="w-12 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-red-500 outline-none" />
        </div>
      </div>
      <div class="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div class="h-full bg-red-500 transition-all duration-300" style="width: {Math.min(100, Math.max(0, (value.hp.current / value.hp.max) * 100))}%"></div>
      </div>
    </div>
    <!-- MP -->
    <div>
      <div class="flex justify-between items-end mb-1 px-1">
        <label class="text-xs font-bold text-blue-500">💧 MP</label>
        <div class="flex items-center gap-1 text-xs">
          <input type="number" bind:value={value.mp.current} class="w-12 text-right bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 outline-none font-bold" />
          <span class="text-slate-400">/</span>
          <input type="number" bind:value={value.mp.max} class="w-12 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 outline-none" />
        </div>
      </div>
      <div class="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div class="h-full bg-blue-500 transition-all duration-300" style="width: {Math.min(100, Math.max(0, (value.mp.current / value.mp.max) * 100))}%"></div>
      </div>
    </div>
  </div>

  <!-- 3. 스탯 그리드 -->
  <div>
    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1">능력치 (Stats)</label>
    <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
      {#each Object.keys(value.stats) as stat}
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 flex flex-col items-center">
          <span class="text-[10px] text-slate-400 uppercase font-bold">{stat}</span>
          <input type="number" bind:value={value.stats[stat]} class="w-full text-center bg-transparent font-bold text-lg outline-none text-slate-800 dark:text-slate-100" />
        </div>
      {/each}
    </div>
  </div>

  <!-- 4. 인벤토리 (검색 연결) -->
  <div>
    <div class="flex items-center justify-between mb-2 px-1">
      <label class="text-xs font-bold text-slate-500 dark:text-slate-400">🎒 인벤토리</label>
      <button 
        type="button" 
        on:click={() => openSearch('inventory')}
        class="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition border border-indigo-200 dark:border-indigo-800"
      >
        + 아이템 연결/추가
      </button>
    </div>
    
    <div class="space-y-2">
      {#each value.inventory as item, i}
        <div class="flex items-center gap-2 animate-fadeIn bg-white dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
          <!-- 아이콘 (연결된 아이템이면 색상 강조) -->
          <span class="text-lg">{item.refId ? '🔗' : '📦'}</span>
          
          <!-- 이름 -->
          <input 
            type="text" 
            bind:value={item.name} 
            placeholder="아이템 이름" 
            class="flex-1 bg-transparent text-sm outline-none"
          />
          
          <!-- 수량 -->
          <span class="text-xs text-slate-400">x</span>
          <input 
            type="number" 
            bind:value={item.count} 
            class="w-10 bg-transparent text-sm text-center outline-none border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500"
          />
          
          <!-- 삭제 버튼 -->
          <button 
            type="button" 
            on:click={() => removeItem('inventory', i)}
            class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 transition"
          >
            ×
          </button>
        </div>
      {/each}
      {#if value.inventory.length === 0}
        <div class="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          소지품이 없습니다.
        </div>
      {/if}
    </div>
  </div>

  <!-- 5. 보유 스킬 (검색 연결) -->
  <div>
    <div class="flex items-center justify-between mb-2 px-1">
      <label class="text-xs font-bold text-slate-500 dark:text-slate-400">📜 보유 스킬</label>
      <button 
        type="button" 
        on:click={() => openSearch('skills')}
        class="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition border border-indigo-200 dark:border-indigo-800"
      >
        + 스킬 연결/추가
      </button>
    </div>
    
    <div class="grid grid-cols-1 gap-2">
      {#each value.skills as skill, i}
        <div class="flex items-center gap-2 animate-fadeIn bg-white dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
          <span class="text-lg">{skill.refId ? '🔗' : '✨'}</span>
          <input 
            type="text" 
            bind:value={skill.name} 
            placeholder="스킬 이름" 
            class="flex-1 bg-transparent text-sm outline-none"
          />
          <button 
            type="button" 
            on:click={() => removeItem('skills', i)}
            class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 transition"
          >
            ×
          </button>
        </div>
      {/each}
      {#if value.skills.length === 0}
        <div class="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          배운 스킬이 없습니다.
        </div>
      {/if}
    </div>
  </div>

  <!-- 🔍 검색 팝업 (모달) -->
  {#if isSearchOpen}
    <div class="absolute inset-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-xl p-4 flex flex-col animate-fadeIn">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-bold text-indigo-500">
          {searchTarget === 'inventory' ? '⚔️ 아이템 검색' : '✨ 스킬 검색'}
        </h4>
        <button on:click={closeSearch} class="text-xs text-slate-400 p-1">닫기</button>
      </div>

      <input 
        type="text" 
        bind:value={searchQuery}
        on:input={handleSearch}
        placeholder="이름으로 검색..."
        class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500 mb-3"
        autoFocus
      />

      <div class="flex-1 overflow-y-auto space-y-1">
        {#each searchResults as item}
          <button 
            type="button"
            class="w-full text-left px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-indigo-500 transition flex items-center gap-2"
            on:click={() => selectItem(item)}
          >
            <span class="text-lg">{searchTarget === 'inventory' ? '📦' : '📜'}</span>
            <div>
              <div class="text-sm font-bold text-slate-700 dark:text-slate-200">{item.title}</div>
              {#if item.summary}
                <div class="text-[10px] text-slate-400 line-clamp-1">{item.summary}</div>
              {/if}
            </div>
          </button>
        {/each}
        
        {#if searchResults.length === 0 && searchQuery}
          <button 
            type="button"
            class="w-full text-center py-3 text-xs text-indigo-500 border border-dashed border-indigo-300 rounded-lg mt-2"
            on:click={addManualItem}
          >
            "{searchQuery}" (으)로 직접 추가하기
          </button>
        {/if}
      </div>
    </div>
  {/if}

</section>

<style>
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>