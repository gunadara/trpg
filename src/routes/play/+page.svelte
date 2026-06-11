<script context="module">
  /**
   * [필수] SSR 비활성화
   */
  export const ssr = false;
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  // 경로가 맞는지 확인해 주세요. (없으면 $lib/stores/docStore 등 확인)
  import { listAllDocs } from '$lib/stores/docStore';
  import SessionFrame from '$lib/components/play/SessionFrame.svelte';
  import { currentSession } from '$lib/stores/sessionStore';



  // 1. 상태 관리 변수
  let allDocs: any[] = [];
  let characters: any[] = [];
  let diceLog: any[] = [];
  let combatants: any[] = [];
  let selectedCharForDetail: any = null;
  let isLoaded = false;
  let showSessionStart = false;
  let sessionTitle = '';
  let selectedStoryline = '';

  /**
   * 데이터 로드 및 초기화
   */
  function refreshSessionData() {
    if (browser) {
      try {
        const data = listAllDocs();
        if (data && Array.isArray(data)) {
          allDocs = data;
          characters = allDocs.filter((d) => d.category === 'characters');
        }
      } catch (err) {
        console.error("GENESIS Session: 데이터 로드 실패", err);
      } finally {
        isLoaded = true;
      }
    }
  }

  onMount(() => {
    refreshSessionData();
    refreshSessionData();
    currentSession.load(); // 👈 이 줄 추가
  });

  // 2. 주사위 기능
  function rollDice(sides: number) {
    const result = Math.floor(Math.random() * sides) + 1;
    const now = new Date();
    const logEntry = {
      id: now.getTime(),
      time: now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: "D" + sides,
      result: "결과: " + result
    };
    diceLog = [logEntry, ...diceLog].slice(0, 50);
    
    // 👇 이 부분 추가
    if ($currentSession) {
      currentSession.addLog({
        type: 'dice',
        content: `D${sides} 굴림: ${result}`,
        value: result
      });
    }
  }


  // 3. 전투 관리
  // addtoCombat 함수 수정
  function addtoCombat(char: any) {
    if (combatants.find((c) => c.id === char.id)) return;
    
    const attr = char.attributes || {};
    const maxHp = (attr.hp && typeof attr.hp.max === 'number') ? attr.hp.max : 10;
    const currentHp = (attr.hp && typeof attr.hp.current === 'number') ? attr.hp.current : maxHp;
    const maxMp = (attr.mp && typeof attr.mp.max === 'number') ? attr.mp.max : 10;
    const currentMp = (attr.mp && typeof attr.mp.current === 'number') ? attr.mp.current : maxMp;

    const newCombatant = {
      id: char.id,
      name: char.title,
      init: 0,
      hp: currentHp,
      maxHp: maxHp,
      mp: currentMp,
      maxMp: maxMp,
      thumbnail: char.thumbnailPath
    };

    combatants = [...combatants, newCombatant];
    // 👇 이 부분 추가
    if ($currentSession) {
      currentSession.addLog({
        type: 'combat_start',
        content: `${char.title}이(가) 전투에 참여했습니다.`,
        actor: char.id
      });
    }
  }

  function sortCombat() {
    combatants = [...combatants].sort((a, b) => b.init - a.init);
  }

  function removeCombatant(id: string) {
    combatants = combatants.filter((c) => c.id !== id);
  }

  // updateHP 함수 수정
  function updateHP(index: number, delta: number) {
    const target = combatants[index];
    if (!target) return;
    
    const oldHp = target.hp;
    const nextHp = target.hp + delta;
    target.hp = Math.max(0, Math.min(target.maxHp, nextHp));
    combatants = [...combatants];
    
    // 👇 이 부분 추가
    const actualDelta = target.hp - oldHp;
    if ($currentSession && actualDelta !== 0) {
      currentSession.addLog({
        type: actualDelta > 0 ? 'heal' : 'damage',
        content: `${target.name}의 HP ${actualDelta > 0 ? '+' : ''}${actualDelta}`,
        actor: target.id,
        value: Math.abs(actualDelta)
      });
    }
  }

  function showQuickLook(char: any) {
    selectedCharForDetail = char;
  }

</script>
<SessionFrame>
  <!-- ✅ HEADER 슬롯 -->
<header slot="header" class="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm">
  <div class="flex items-center gap-6">
    <button
      on:click={() => history.back()}
      class="group flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition"
    >
      <span class="text-lg group-hover:-translate-x-1 transition-transform">←</span>
      <span class="text-sm font-bold tracking-tight">세션 종료</span>
    </button>
    <div class="h-6 w-[1px] bg-slate-200"></div>
  <!-- 👇 이 부분 추가/수정 -->
    {#if $currentSession}
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-extrabold tracking-tighter text-slate-900">
          {$currentSession.title}
        </h1>
        <span class="text-indigo-500 font-bold text-xs uppercase bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
          진행 중
        </span>
        {#if $currentSession.storylineId}
          <span class="text-purple-500 text-xs bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
            📖 스토리 연동
          </span>
        {/if}
      </div>
    {:else}
      <button
        on:click={() => showSessionStart = true}
        class="text-sm font-bold bg-indigo-500 text-white px-4 py-2 rounded-xl hover:bg-indigo-600 transition"
      >
        + 세션 시작
      </button>
    {/if}
  </div>
  <!-- 기존 주사위 버튼들 그대로 유지 -->
  <div class="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
    {#each [4, 6, 8, 10, 12, 20, 100] as d}
      <button
        on:click={() => rollDice(d)}
        class="w-10 h-10 flex items-center justify-center bg-white hover:bg-indigo-600 hover:text-white rounded-lg text-[11px] font-bold transition-all active:scale-95 border border-slate-200 shadow-sm text-slate-600"
      >
        D{d}
      </button>
    {/each}
  </div>
</header>


<!-- ✅ LEFT 슬롯: World Cast -->
<section
  slot="left"
  class="h-full min-h-0 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm"
>
  <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
    <h2 class="text-xs font-bold text-slate-500 uppercase tracking-widest">인물 목록</h2>
    <span class="text-[10px] bg-slate-200/50 px-2 py-0.5 rounded-full text-slate-600 font-bold border border-slate-200">
      {characters.length}명
    </span>
  </div>

  <div class="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 custom-scroll">
    {#if !isLoaded}
      <div class="p-10 text-center text-slate-400 text-xs animate-pulse font-bold uppercase">불러오는 중…</div>
    {:else if characters.length === 0}
      <div class="p-10 text-center text-slate-400 text-xs font-medium leading-relaxed italic">
        등록된 인물이 없습니다.<br />세계관 설계에서 인물을 추가하세요.
      </div>
    {:else}
      {#each characters as char (char.id)}
        <div class="group relative bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-xl p-3 transition-all shadow-sm hover:shadow-md">
          <div class="flex justify-between items-start mb-1">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {#if char.thumbnailPath}
                  <img src={char.thumbnailPath} alt="" class="w-full h-full object-cover" />
                {:else}
                  <span class="text-base text-slate-300">👤</span>
                {/if}
              </div>

              <div class="min-w-0">
                <div class="text-sm font-bold text-slate-800 truncate leading-none mb-1">{char.title}</div>
                <div class="text-[10px] text-slate-400 font-bold uppercase">
                  LV.{char.attributes?.level || 1}
                </div>
              </div>
            </div>

            <button
              on:click={() => addtoCombat(char)}
              class="bg-indigo-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-indigo-600 active:scale-95"
            >
              <span class="text-[10px] font-bold px-1 uppercase">전투 추가</span>
            </button>
          </div>

          <button
            on:click={() => showQuickLook(char)}
            class="text-[10px] text-slate-400 hover:text-indigo-500 hover:underline transition-colors mt-2 block pl-13"
          >
            정보 보기
          </button>
        </div>
      {/each}
    {/if}
  </div>
</section>

<!-- ✅ CENTER 슬롯: Active Battle -->
<section
  slot="center"
  class="h-full min-h-0 bg-slate-100 rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-inner relative"
>
  <div
    class="absolute inset-0 opacity-[0.02] pointer-events-none"
    style="background-image: radial-gradient(#6366f1 1px, transparent 1px); background-size: 20px 20px;"
  ></div>

  <div class="p-5 border-b border-slate-200 bg-white flex justify-between items-center shrink-0 shadow-sm z-10">
    <div class="flex items-center gap-3">
      <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
      <h2 class="text-sm font-bold uppercase tracking-widest text-slate-700">전투 대기열</h2>
    </div>

    <button
      on:click={sortCombat}
      class="text-xs font-bold bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl transition shadow-sm active:scale-95 uppercase tracking-wide"
    >
    순서 정렬
    </button>
  </div>

  <div class="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 custom-scroll z-0">
    {#each combatants as c, i (c.id)}
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-center gap-6 animate-in fade-in slide-in-from-right-4 border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-all">
        <div class="flex flex-col items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">우선권</span>
          <div class="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center text-2xl font-black text-indigo-500 border border-slate-200 shadow-inner">
            <input
              type="number"
              bind:value={c.init}
              class="w-full bg-transparent text-center focus:outline-none transition-colors p-0"
            />
          </div>
        </div>

        <div class="flex-1 space-y-4">
          <div class="flex justify-between items-end">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {#if c.thumbnail}
                  <img src={c.thumbnail} alt="" class="w-full h-full object-cover" />
                {:else}
                  <span class="text-xl opacity-30 grayscale">⚔️</span>
                {/if}
              </div>

              <div>
                <span class="font-black text-xl text-slate-800 block leading-none mb-1 tracking-tight">
                  {c.name}
                </span>
                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">참가자</span>
              </div>
            </div>

            <div class="text-right">
              <div class="text-sm font-black text-slate-700 mb-1">
                <span class="text-rose-500">{c.hp}</span>
                <span class="text-slate-300">/</span>
                <span class="text-slate-400">{c.maxHp} 체력</span>
              </div>
            </div>
          </div>

          <div class="w-full h-3 bg-slate-100 rounded-full border border-slate-200 overflow-hidden relative shadow-inner">
            <div
              class="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(244,63,94,0.3)]"
              style="width: {(c.hp / c.maxHp) * 100}%"
            ></div>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <button
              on:click={() => updateHP(i, -1)}
              class="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-all font-bold text-xl border border-red-100"
            >
              -
            </button>
            <button
              on:click={() => updateHP(i, 1)}
              class="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-500 hover:text-emerald-600 transition-all font-bold text-xl border border-emerald-100"
            >
              +
            </button>
          </div>

          <button
            on:click={() => removeCombatant(c.id)}
            class="w-full py-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-200 text-[9px] font-bold uppercase transition-colors border border-slate-200"
          >
            제거
          </button>
        </div>
      </div>
    {/each}

    {#if combatants.length === 0}
      <div class="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-20 opacity-60">
        <div class="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-4xl border border-slate-300 text-slate-400">⚔️</div>
        <div class="text-center">
          <p class="text-sm font-bold uppercase tracking-widest text-slate-500">전투가 비어있어요</p>
          <p class="text-xs mt-1">대기열에서 인물을 추가하세요.</p>
        </div>
      </div>
    {/if}
  </div>
</section>

<!-- ✅ RIGHT 슬롯: Bio + Dice History -->
<aside slot="right" class="h-full min-h-0 flex flex-col gap-4 overflow-hidden shrink-0">
  
  <!-- 👇 세션 로그 섹션 추가 (제일 위에) -->
  {#if $currentSession}
    <section class="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
      <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest">세션 기록</h3>
        <span class="text-[10px] bg-slate-200/50 px-2 py-0.5 rounded-full text-slate-600 font-bold">
          {$currentSession.logs.length}개
        </span>
      </div>
      
      <div class="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 custom-scroll">
        {#each $currentSession.logs as log (log.id)}
          <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-1">
            <div class="flex justify-between items-center mb-1">
              <span class={`text-xs font-bold ${
                log.type === 'damage' ? 'text-red-500' :
                log.type === 'heal' ? 'text-green-500' :
                log.type === 'dice' ? 'text-indigo-500' :
                log.type === 'combat_start' ? 'text-orange-500' :
                'text-slate-500'
              }`}>
                {log.type === 'damage' ? '🗡️ 피해' :
                 log.type === 'heal' ? '💚 회복' :
                 log.type === 'dice' ? '🎲 주사위' :
                 log.type === 'combat_start' ? '⚔️ 전투' :
                 log.type === 'item_get' ? '🎁 획득' :
                 '📝 메모'}
              </span>
              <span class="text-[10px] text-slate-400">
                {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div class="text-xs text-slate-700">{log.content}</div>
          </div>
        {/each}
      </div>
      
      <!-- 수동 메모 입력 -->
      <div class="p-3 border-t border-slate-100 shrink-0">
        <input 
          type="text" 
          placeholder="메모 추가 (Enter)..."
          class="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition"
          on:keydown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              currentSession.addLog({
                type: 'note',
                content: e.currentTarget.value.trim()
              });
              e.currentTarget.value = '';
            }
          }}
        />
      </div>
    </section>
  {/if}

  <!-- 👇 기존 인물 정보 / 주사위 로그는 그대로 유지 -->
  {#if selectedCharForDetail}
    <section class="flex-1 min-h-0 bg-white rounded-2xl border border-indigo-100 p-5 overflow-y-auto animate-in fade-in zoom-in-95 shadow-xl shadow-indigo-100/50">
        <div class="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
        <h3 class="font-bold text-indigo-500 uppercase text-[10px] tracking-wider">인물 정보</h3>
        <button
          on:click={() => (selectedCharForDetail = null)}
          class="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
        >
          &times;
        </button>
      </div>

      <div class="space-y-4">
        <div class="text-2xl font-black text-slate-800 tracking-tight">{selectedCharForDetail.title}</div>

        <div class="grid grid-cols-2 gap-2">
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span class="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Race</span>
            <span class="text-xs font-bold text-slate-700">{selectedCharForDetail.attributes?.race || '-'}</span>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span class="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Class</span>
            <span class="text-xs font-bold text-slate-700">{selectedCharForDetail.attributes?.class || '-'}</span>
          </div>
        </div>

        <div class="text-sm text-slate-600 leading-relaxed custom-scroll max-h-60 overflow-y-auto prose prose-sm">
          {@html selectedCharForDetail.content || '<span class="italic opacity-50 text-xs">내용 없음</span>'}
        </div>
      </div>
    </section>
  {/if}

  <section class="h-80 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
     <h2 class="p-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 bg-slate-50/50">
      주사위 기록
    </h2>

    <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scroll">
      {#each diceLog as log (log.id)}
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-1 hover:bg-white hover:shadow-sm transition-all">
          <div class="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
            <span class="text-indigo-500 bg-indigo-50 px-1.5 rounded">{log.type}</span>
            <span class="opacity-60">{log.time}</span>
          </div>
          <div class="text-sm font-bold text-slate-700">{log.result}</div>
        </div>
      {/each}

      {#if diceLog.length === 0}
        <div class="h-full flex items-center justify-center text-slate-400 text-[10px] uppercase font-bold tracking-widest opacity-60">
          굴림을 기다리는 중…
        </div>
      {/if}
    </div>
  </section>
</aside>


<!-- ===== 👇 세션 시작 다이얼로그 추가 (제일 아래) ===== -->
{#if showSessionStart}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
    <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95">
      <h2 class="text-xl font-bold mb-6 text-slate-800">🎬 새 세션 시작</h2>
      
      <div class="space-y-4">
        <div>
          <label class="text-sm font-bold text-slate-600 mb-2 block">세션 제목</label>
          <input 
            type="text" 
            bind:value={sessionTitle}
            placeholder="예: 제1화 - 안개 숲의 비밀"
            class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition"
          />
        </div>
        
        <div>
          <label class="text-sm font-bold text-slate-600 mb-2 block">연결할 스토리라인 (선택)</label>
          <select 
            bind:value={selectedStoryline} 
            class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition"
          >
            <option value="">없음</option>
            {#each allDocs.filter(d => d.category === 'storylines') as story}
              <option value={story.id}>{story.title}</option>
            {/each}
          </select>
        </div>
      </div>
      
      <div class="flex gap-3 mt-8">
        <button 
          on:click={() => {
            showSessionStart = false;
            sessionTitle = '';
            selectedStoryline = '';
          }}
          class="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition"
        >
          취소
        </button>
        <button 
          on:click={() => {
            if (sessionTitle.trim()) {
              currentSession.start('default', sessionTitle.trim(), selectedStoryline || undefined);
              showSessionStart = false;
              sessionTitle = '';
              selectedStoryline = '';
            }
          }}
          disabled={!sessionTitle.trim()}
          class="flex-1 px-4 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          시작하기
        </button>
      </div>
    </div>
  </div>
{/if}


  <!-- ✅ FOOTER 슬롯 -->
  <footer
    slot="footer"
    class="py-3 px-6 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white"
  >
    <div class="flex gap-6">
      <div class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        엔진: 정상
      </div>
    </div>
    <div class="opacity-50">제네시스 세션 v0.3.1</div>
  </footer>
</SessionFrame>

<style>
  /* 커스텀 스크롤바 (라이트 모드용) */
  .custom-scroll::-webkit-scrollbar { width: 4px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }

  .animate-in {
    animation-duration: 300ms;
    animation-fill-mode: both;
  }

  .pl-13 { padding-left: 3.25rem; }
</style>