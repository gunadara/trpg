<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import DrawHelper from '$lib/features/draw/DrawHelper.svelte';
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

  function endSession() {
    if (!confirm('세션을 종료할까요? 저널 기록은 사라집니다. (필요하면 먼저 백업하세요)')) return;
    currentSession.end();
  }

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
<header slot="header" class="p-3 md:p-4 bg-surface border-b border-line shadow-sm flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
  <div class="flex items-center gap-3 md:gap-4 min-w-0">
  <!-- 세션 제목/상태 (탭바가 네비 담당 → 뒤로가기 제거) -->
    {#if $currentSession}
      <div class="flex items-center gap-2 min-w-0 flex-wrap">
        <h1 class="text-base md:text-lg font-extrabold tracking-tighter text-ink truncate">
          {$currentSession.title}
        </h1>
        <span class="shrink-0 text-primary font-bold text-xs uppercase bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
          진행 중
        </span>
        {#if $currentSession.storylineId}
          <span class="shrink-0 text-purple-500 text-xs bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
            📖 스토리 연동
          </span>
        {/if}
        <button
          on:click={endSession}
          class="shrink-0 text-xs text-rose-500 dark:text-rose-400 hover:underline whitespace-nowrap ms-1"
        >
          세션 종료
        </button>
      </div>
    {:else}
      <button
        on:click={() => showSessionStart = true}
        class="shrink-0 whitespace-nowrap text-sm font-bold bg-primary text-white px-4 py-2 rounded-xl hover:opacity-90 transition"
      >
        + 세션 시작
      </button>
    {/if}
  </div>
  <!-- 주사위: 폰에선 가로 스크롤(잘림 방지), md+에선 그대로 -->
  <div class="flex items-center gap-1.5 bg-bubble p-1.5 rounded-xl border border-line overflow-x-auto md:overflow-visible no-scrollbar">
    {#each [4, 6, 8, 10, 12, 20, 100] as d}
      <button
        on:click={() => rollDice(d)}
        class="shrink-0 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-surface hover:bg-primary hover:text-white rounded-lg text-[11px] font-bold transition-all active:scale-95 border border-line shadow-sm text-muted"
      >
        D{d}
      </button>
    {/each}
  </div>
</header>


<!-- ✅ LEFT 슬롯: World Cast -->
<section
  slot="left"
  class="h-full min-h-0 bg-surface rounded-2xl border border-line flex flex-col overflow-hidden shadow-sm"
>
  <div class="p-4 border-b border-line bg-canvas/50 flex justify-between items-center shrink-0">
    <h2 class="text-xs font-bold text-muted uppercase tracking-widest">인물 목록</h2>
    <span class="text-[10px] bg-bubble px-2 py-0.5 rounded-full text-muted font-bold border border-line">
      {characters.length}명
    </span>
  </div>

  <div class="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 custom-scroll">
    {#if !isLoaded}
      <div class="p-10 text-center text-subtle text-xs animate-pulse font-bold uppercase">불러오는 중…</div>
    {:else if characters.length === 0}
      <div class="p-10 text-center text-subtle text-xs font-medium leading-relaxed italic">
        등록된 인물이 없습니다.<br />세계관 설계에서 인물을 추가하세요.
      </div>
    {:else}
      {#each characters as char (char.id)}
        <div class="group relative bg-surface hover:bg-primary/10 border border-line hover:border-primary/40 rounded-xl p-3 transition-all shadow-sm hover:shadow-md">
          <div class="flex justify-between items-start mb-1">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-lg bg-bubble border border-line flex items-center justify-center overflow-hidden shrink-0">
                {#if char.thumbnailPath}
                  <img src={char.thumbnailPath} alt="" class="w-full h-full object-cover" />
                {:else}
                  <span class="text-base text-subtle">👤</span>
                {/if}
              </div>

              <div class="min-w-0">
                <div class="text-sm font-bold text-ink truncate leading-none mb-1">{char.title}</div>
                <div class="text-[10px] text-subtle font-bold uppercase">
                  LV.{char.attributes?.level || 1}
                </div>
              </div>
            </div>

            <button
              on:click={() => addtoCombat(char)}
              class="bg-primary text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-primary active:scale-95"
            >
              <span class="text-[10px] font-bold px-1 uppercase">전투 추가</span>
            </button>
          </div>

          <button
            on:click={() => showQuickLook(char)}
            class="text-[10px] text-subtle hover:text-primary hover:underline transition-colors mt-2 block pl-13"
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
  class="h-full min-h-0 bg-bubble rounded-3xl border border-line flex flex-col overflow-hidden shadow-inner relative"
>
  <div
    class="absolute inset-0 opacity-[0.02] pointer-events-none"
    style="background-image: radial-gradient(#6366f1 1px, transparent 1px); background-size: 20px 20px;"
  ></div>

  <div class="p-5 border-b border-line bg-surface flex justify-between items-center shrink-0 shadow-sm z-10">
    <div class="flex items-center gap-3">
      <div class="w-2 h-2 rounded-full bg-red-500/100 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
      <h2 class="text-sm font-bold uppercase tracking-widest text-ink">전투 대기열</h2>
    </div>

    <button
      on:click={sortCombat}
      class="text-xs font-bold bg-surface hover:bg-canvas text-primary border border-primary/20 px-4 py-2 rounded-xl transition shadow-sm active:scale-95 uppercase tracking-wide"
    >
    순서 정렬
    </button>
  </div>

  <div class="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 custom-scroll z-0">
    {#each combatants as c, i (c.id)}
      <div class="bg-surface p-5 rounded-2xl border border-line/80 flex items-center gap-6 animate-in fade-in slide-in-from-right-4 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
        <div class="flex flex-col items-center gap-2">
          <span class="text-[10px] font-bold text-subtle uppercase tracking-wider">우선권</span>
          <div class="w-14 h-14 bg-canvas rounded-xl flex items-center justify-center text-2xl font-black text-primary border border-line shadow-inner">
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
              <div class="w-12 h-12 rounded-full bg-bubble border border-line flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {#if c.thumbnail}
                  <img src={c.thumbnail} alt="" class="w-full h-full object-cover" />
                {:else}
                  <span class="text-xl opacity-30 grayscale">⚔️</span>
                {/if}
              </div>

              <div>
                <span class="font-black text-xl text-ink block leading-none mb-1 tracking-tight">
                  {c.name}
                </span>
                <span class="text-[10px] text-subtle font-bold uppercase tracking-wider">참가자</span>
              </div>
            </div>

            <div class="text-right">
              <div class="text-sm font-black text-ink mb-1">
                <span class="text-rose-500">{c.hp}</span>
                <span class="text-subtle">/</span>
                <span class="text-subtle">{c.maxHp} 체력</span>
              </div>
            </div>
          </div>

          <div class="w-full h-3 bg-bubble rounded-full border border-line overflow-hidden relative shadow-inner">
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
              class="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 transition-all font-bold text-xl border border-red-500/20"
            >
              -
            </button>
            <button
              on:click={() => updateHP(i, 1)}
              class="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 hover:text-emerald-600 transition-all font-bold text-xl border border-emerald-500/20"
            >
              +
            </button>
          </div>

          <button
            on:click={() => removeCombatant(c.id)}
            class="w-full py-1.5 rounded-lg bg-canvas text-subtle hover:text-muted hover:bg-bubble text-[9px] font-bold uppercase transition-colors border border-line"
          >
            제거
          </button>
        </div>
      </div>
    {/each}

    {#if combatants.length === 0}
      <div class="h-full flex flex-col items-center justify-center text-subtle space-y-4 py-20 opacity-60">
        <div class="w-20 h-20 bg-bubble rounded-full flex items-center justify-center text-4xl border border-line text-subtle">⚔️</div>
        <div class="text-center">
          <p class="text-sm font-bold uppercase tracking-widest text-muted">전투가 비어있어요</p>
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
    <section class="flex-1 min-h-0 bg-surface rounded-2xl border border-line flex flex-col overflow-hidden shadow-sm">
      <div class="p-4 border-b border-line bg-canvas/50 flex justify-between items-center shrink-0">
        <h3 class="text-xs font-bold text-muted uppercase tracking-widest">세션 기록</h3>
        <span class="text-[10px] bg-bubble px-2 py-0.5 rounded-full text-muted font-bold">
          {$currentSession.logs.length}개
        </span>
      </div>
      
      <div class="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 custom-scroll">
        {#each $currentSession.logs as log (log.id)}
          <div class="p-2.5 bg-canvas rounded-xl border border-line animate-in fade-in slide-in-from-top-1">
            <div class="flex justify-between items-center mb-1">
              <span class={`text-xs font-bold ${
                log.type === 'damage' ? 'text-red-500' :
                log.type === 'heal' ? 'text-green-500' :
                log.type === 'dice' ? 'text-primary' :
                log.type === 'combat_start' ? 'text-orange-500' :
                'text-muted'
              }`}>
                {log.type === 'damage' ? '🗡️ 피해' :
                 log.type === 'heal' ? '💚 회복' :
                 log.type === 'dice' ? '🎲 주사위' :
                 log.type === 'combat_start' ? '⚔️ 전투' :
                 log.type === 'item_get' ? '🎁 획득' :
                 '📝 메모'}
              </span>
              <span class="text-[10px] text-subtle">
                {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div class="text-xs text-ink">{log.content}</div>
          </div>
        {/each}
      </div>
      
      <!-- 수동 메모 입력 -->
      <div class="p-3 border-t border-line shrink-0">
        <input 
          type="text" 
          placeholder="메모 추가 (Enter)..."
          class="w-full text-xs px-3 py-2 border border-line rounded-lg outline-none focus:border-primary transition"
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
    <section class="flex-1 min-h-0 bg-surface rounded-2xl border border-primary/20 p-5 overflow-y-auto animate-in fade-in zoom-in-95 shadow-xl shadow-primary/10">
        <div class="flex justify-between items-start mb-4 border-b border-line pb-3">
        <h3 class="font-bold text-primary uppercase text-[10px] tracking-wider">인물 정보</h3>
        <button
          on:click={() => (selectedCharForDetail = null)}
          class="text-subtle hover:text-muted transition-colors text-xl leading-none"
        >
          &times;
        </button>
      </div>

      <div class="space-y-4">
        <div class="text-2xl font-black text-ink tracking-tight">{selectedCharForDetail.title}</div>

        <div class="grid grid-cols-2 gap-2">
          <div class="bg-canvas p-2.5 rounded-xl border border-line">
            <span class="block text-[9px] font-bold text-subtle uppercase mb-0.5">Race</span>
            <span class="text-xs font-bold text-ink">{selectedCharForDetail.attributes?.race || '-'}</span>
          </div>
          <div class="bg-canvas p-2.5 rounded-xl border border-line">
            <span class="block text-[9px] font-bold text-subtle uppercase mb-0.5">Class</span>
            <span class="text-xs font-bold text-ink">{selectedCharForDetail.attributes?.class || '-'}</span>
          </div>
        </div>

        <div class="text-sm text-muted leading-relaxed custom-scroll max-h-60 overflow-y-auto prose prose-sm">
          {@html selectedCharForDetail.content || '<span class="italic opacity-50 text-xs">내용 없음</span>'}
        </div>
      </div>
    </section>
  {/if}

  <section class="h-80 bg-surface rounded-2xl border border-line flex flex-col overflow-hidden shadow-sm">
     <h2 class="p-4 text-[11px] font-bold text-muted uppercase tracking-widest border-b border-line bg-canvas/50">
      주사위 기록
    </h2>

    <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scroll">
      {#each diceLog as log (log.id)}
        <div class="p-3 bg-canvas rounded-xl border border-line animate-in fade-in slide-in-from-top-1 hover:bg-surface hover:shadow-sm transition-all">
          <div class="flex justify-between text-[10px] font-bold text-subtle mb-1">
            <span class="text-primary bg-primary/10 px-1.5 rounded">{log.type}</span>
            <span class="opacity-60">{log.time}</span>
          </div>
          <div class="text-sm font-bold text-ink">{log.result}</div>
        </div>
      {/each}

      {#if diceLog.length === 0}
        <div class="h-full flex items-center justify-center text-subtle text-[10px] uppercase font-bold tracking-widest opacity-60">
          굴림을 기다리는 중…
        </div>
      {/if}
    </div>
  </section>
</aside>


<!-- ===== 👇 세션 시작 다이얼로그 추가 (제일 아래) ===== -->
{#if showSessionStart}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
    <div class="bg-surface rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95">
      <h2 class="text-xl font-bold mb-6 text-ink">🎬 새 세션 시작</h2>
      
      <div class="space-y-4">
        <div>
          <label class="text-sm font-bold text-muted mb-2 block">세션 제목</label>
          <input 
            type="text" 
            bind:value={sessionTitle}
            placeholder="예: 제1화 - 안개 숲의 비밀"
            class="w-full px-4 py-3 border-2 border-line rounded-xl outline-none focus:border-primary transition"
          />
        </div>
        
        <div>
          <label class="text-sm font-bold text-muted mb-2 block">연결할 스토리라인 (선택)</label>
          <select 
            bind:value={selectedStoryline} 
            class="w-full px-4 py-3 border-2 border-line rounded-xl outline-none focus:border-primary transition"
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
          class="flex-1 px-4 py-3 border-2 border-line rounded-xl font-bold text-muted hover:bg-canvas transition"
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
          class="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition"
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
    class="py-3 px-6 border-t border-line flex justify-between items-center text-[10px] font-bold text-muted uppercase tracking-widest bg-surface"
  >
    <div class="flex gap-6">
      <div class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500/100"></span>
        엔진: 정상
      </div>
    </div>
    <div class="opacity-50">제네시스 세션 v0.4</div>
  </footer>
</SessionFrame>

<DrawHelper />

<style>
  /* 커스텀 스크롤바 (라이트 모드용) */
  .custom-scroll::-webkit-scrollbar { width: 4px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  :global(.dark) .custom-scroll::-webkit-scrollbar-thumb { background: #334155; }
  :global(.dark) .custom-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }

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