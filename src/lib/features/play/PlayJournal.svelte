<script lang="ts">
  import { currentSession } from '$lib/stores/sessionStore';
  import {
    LIKELIHOODS, askYesNo, rollScene, rollEvent, sceneToText, eventToText, d
  } from '$lib/services/oracleEngine';
  import type { SessionLog } from '$lib/domain/session';

  // 로그는 최신이 앞(unshift)이라, 저널은 시간순(오래된→최신)으로 뒤집어 보여줌
  $: logs = $currentSession ? [...$currentSession.logs].reverse() : [];

  // ── 서사 입력 ──
  let narrative = '';
  function writeNarrative() {
    const text = narrative.trim();
    if (!text || !$currentSession) return;
    currentSession.addLog({ type: 'roleplay', content: text });
    narrative = '';
  }
  function onKeydown(e: KeyboardEvent) {
    // Ctrl/Cmd + Enter 로 기록
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      writeNarrative();
    }
  }

  // ── 예/아니오 ──
  let likelihood = LIKELIHOODS[2].label;
  let showAsk = false;
  let question = '';

  function doAsk() {
    if (!$currentSession) return;
    const r = askYesNo(likelihood);
    const q = question.trim();
    currentSession.addLog({
      type: 'decision',
      content: `${q ? `"${q}" ` : ''}→ ${r.text}${r.twist ? ' ⚡예외!' : ''} (${r.likelihood}, d100=${r.roll})`
    });
    question = '';
    showAsk = false;
  }

  // ── 씬 / 전개 ──
  function doScene() {
    if (!$currentSession) return;
    currentSession.addLog({ type: 'note', content: `🎬 ${sceneToText(rollScene())}` });
  }
  function doEvent() {
    if (!$currentSession) return;
    currentSession.addLog({ type: 'note', content: `🌀 ${eventToText(rollEvent())}` });
  }

  // ── 다이스 ──
  const DICE = [4, 6, 8, 10, 12, 20, 100];
  function doDice(sides: number) {
    if (!$currentSession) return;
    const roll = d(sides);
    currentSession.addLog({ type: 'dice', content: `🎲 d${sides} → ${roll}` });
  }

  // ── 로그 카드 스타일 ──
  function cardStyle(log: SessionLog): { icon: string; accent: string; isNarrative: boolean } {
    switch (log.type) {
      case 'roleplay':   return { icon: '', accent: '', isNarrative: true };
      case 'decision':   return { icon: '❓', accent: 'border-l-indigo-500', isNarrative: false };
      case 'dice':       return { icon: '🎲', accent: 'border-l-sky-500', isNarrative: false };
      case 'combat_start': return { icon: '⚔️', accent: 'border-l-rose-500', isNarrative: false };
      case 'combat_end': return { icon: '🏁', accent: 'border-l-rose-500', isNarrative: false };
      case 'damage':     return { icon: '💥', accent: 'border-l-rose-500', isNarrative: false };
      case 'heal':       return { icon: '💚', accent: 'border-l-emerald-500', isNarrative: false };
      default:           return { icon: '◆', accent: 'border-l-slate-400 dark:border-l-slate-600', isNarrative: false };
    }
  }

  function timeOf(ts: string): string {
    try { return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }

  function deleteLog(id: string) {
    currentSession.removeLog?.(id);
  }
</script>

{#if !$currentSession}
  <div class="h-full flex items-center justify-center text-slate-500 text-sm">
    세션을 시작하면 플레이 저널이 열려요.
  </div>
{:else}
  <div class="flex flex-col h-full">

    <!-- 저널 스트림 -->
    <div class="flex-1 overflow-y-auto px-1 py-2 space-y-2.5">
      {#if logs.length === 0}
        <p class="text-center text-slate-500 text-sm py-12">
          첫 장면을 적어보세요. 막히면 아래 버튼으로 운명에게 물어도 좋아요.
        </p>
      {/if}

      {#each logs as log (log.id)}
        {@const s = cardStyle(log)}
        {#if s.isNarrative}
          <!-- 내가 쓴 서사 -->
          <div class="group relative rounded-xl bg-slate-100 dark:bg-slate-800/40 px-4 py-3">
            <p class="text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{log.content}</p>
            <div class="flex items-center gap-2 mt-1.5">
              <span class="text-[10px] text-slate-400 dark:text-slate-600">{timeOf(log.timestamp)}</span>
              <button on:click={() => deleteLog(log.id)} class="text-[10px] text-slate-400 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition">삭제</button>
            </div>
          </div>
        {:else}
          <!-- 판정 카드 -->
          <div class="group relative flex items-start gap-2.5 rounded-lg bg-white dark:bg-slate-900/60 shadow-sm dark:shadow-none border-l-2 {s.accent} pl-3 pr-4 py-2">
            <span class="text-sm mt-0.5">{s.icon}</span>
            <div class="flex-1 min-w-0">
              <p class="text-[13px] text-slate-700 dark:text-slate-300 leading-snug">{log.content}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-[10px] text-slate-400 dark:text-slate-600">{timeOf(log.timestamp)}</span>
                <button on:click={() => deleteLog(log.id)} class="text-[10px] text-slate-400 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition">삭제</button>
              </div>
            </div>
          </div>
        {/if}
      {/each}
    </div>

    <!-- 입력 영역 -->
    <div class="border-t border-slate-200 dark:border-slate-800 pt-3 mt-1 space-y-2.5">

      <!-- 예/아니오 펼침 -->
      {#if showAsk}
        <div class="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/80 p-3 space-y-2.5">
          <input
            type="text"
            bind:value={question}
            placeholder="무엇을 묻나요? (예: 문이 잠겨 있나?)"
            class="w-full rounded-lg border border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            on:keydown={(e) => e.key === 'Enter' && doAsk()}
          />
          <div class="flex flex-wrap items-center gap-1.5">
            {#each LIKELIHOODS as lk}
              <button
                on:click={() => (likelihood = lk.label)}
                class="px-2.5 py-1 rounded-full text-[11px] border transition
                       {likelihood === lk.label
                         ? 'border-indigo-500 text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-500/10'
                         : 'border-slate-300 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500'}"
              >{lk.label}</button>
            {/each}
            <button on:click={doAsk} class="ms-auto px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">묻기</button>
          </div>
        </div>
      {/if}

      <!-- 서사 입력창 -->
      <div class="flex items-end gap-2">
        <textarea
          bind:value={narrative}
          on:keydown={onKeydown}
          rows="2"
          placeholder="장면을 적어보세요…  (Ctrl+Enter 로 기록)"
          class="flex-1 resize-none rounded-xl border border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3.5 py-2.5 text-[15px] outline-none focus:border-indigo-500 leading-relaxed"
        ></textarea>
        <button
          on:click={writeNarrative}
          class="shrink-0 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-sm font-bold transition"
        >기록</button>
      </div>

      <!-- 판정 버튼 줄 -->
      <div class="flex flex-wrap items-center gap-1.5">
        <button on:click={() => (showAsk = !showAsk)} class="px-3 py-1.5 rounded-lg text-xs border transition {showAsk ? 'border-indigo-500 text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-500/10' : 'border-slate-300 text-slate-600 hover:border-indigo-500 dark:border-slate-700 dark:text-slate-300'}">❓ 예/아니오</button>
        <button on:click={doScene} class="px-3 py-1.5 rounded-lg text-xs border border-slate-300 text-slate-600 hover:border-emerald-500 dark:border-slate-700 dark:text-slate-300 transition">🎬 씬</button>
        <button on:click={doEvent} class="px-3 py-1.5 rounded-lg text-xs border border-slate-300 text-slate-600 hover:border-violet-500 dark:border-slate-700 dark:text-slate-300 transition">🌀 전개</button>
        <span class="mx-1 text-slate-300 dark:text-slate-700">|</span>
        {#each DICE as sides}
          <button on:click={() => doDice(sides)} class="px-2.5 py-1.5 rounded-lg text-[11px] border border-slate-300 text-slate-500 hover:border-sky-500 hover:text-sky-600 dark:border-slate-800 dark:text-slate-400 dark:hover:text-sky-300 transition">d{sides}</button>
        {/each}
      </div>
    </div>
  </div>
{/if}
