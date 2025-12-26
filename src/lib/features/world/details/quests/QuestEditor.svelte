<script lang="ts">
  export let value: any = {};

  // 초기값 보장 (데이터가 없으면 기본값으로 채워줌)
  if (!value.status) value.status = 'not_started';
  if (value.reward_gold === undefined) value.reward_gold = 0;
  if (value.reward_exp === undefined) value.reward_exp = 0;

  // 상태별 텍스트 색상 (시각적 효과)
  $: statusColor = 
    value.status === 'completed' ? 'text-green-500 font-bold' :
    value.status === 'in_progress' ? 'text-blue-500 font-bold' :
    value.status === 'failed' ? 'text-red-500 font-bold' :
    'text-slate-500';
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  
  <!-- 헤더 -->
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      📜 퀘스트 정보
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">
      Status / Rewards / Goal
    </p>
  </div>

  <!-- 1행: 상태 / 의뢰인 / 장소 -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- 상태 -->
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">진행 상태</label>
      <div class="relative">
        <select 
          bind:value={value.status}
          class={`w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition appearance-none ${statusColor}`}
        >
          <option value="not_started" class="text-slate-500">⚪ 시작 전 (Not Started)</option>
          <option value="in_progress" class="text-blue-500">🔵 진행 중 (In Progress)</option>
          <option value="completed" class="text-green-500">🟢 완료 (Completed)</option>
          <option value="failed" class="text-red-500">🔴 실패 (Failed)</option>
        </select>
        <div class="absolute right-3 top-3 text-xs text-slate-400 pointer-events-none">▼</div>
      </div>
    </div>

    <!-- 의뢰인 -->
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">의뢰인 (Client)</label>
      <input 
        type="text" 
        bind:value={value.client}
        placeholder="예: 촌장, 왕실 기사단"
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
      />
    </div>

    <!-- 장소 -->
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">수행 장소 (Location)</label>
      <input 
        type="text" 
        bind:value={value.location}
        placeholder="예: 북쪽 숲, 지하 던전"
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
      />
    </div>
  </div>

  <!-- 2행: 보상 (Rewards) - 강조됨 -->
  <div class="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1">보상 (Rewards)</label>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <!-- 골드 -->
      <div class="relative">
        <span class="absolute left-3 top-2.5 text-xs">💰</span>
        <input 
          type="number" 
          bind:value={value.reward_gold}
          class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-2 py-2 text-sm outline-none focus:border-yellow-500 transition text-right font-medium"
          placeholder="0"
        />
        <span class="absolute right-8 top-2.5 text-[10px] text-slate-400 pointer-events-none">G</span>
      </div>

      <!-- 경험치 -->
      <div class="relative">
        <span class="absolute left-3 top-2.5 text-xs">✨</span>
        <input 
          type="number" 
          bind:value={value.reward_exp}
          class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-2 py-2 text-sm outline-none focus:border-purple-500 transition text-right font-medium"
          placeholder="0"
        />
        <span class="absolute right-8 top-2.5 text-[10px] text-slate-400 pointer-events-none">EXP</span>
      </div>

      <!-- 아이템 -->
      <div class="col-span-2 relative">
        <span class="absolute left-3 top-2.5 text-xs">🎁</span>
        <input 
          type="text" 
          bind:value={value.reward_items}
          class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 py-2 text-sm outline-none focus:border-indigo-500 transition"
          placeholder="보상 아이템 (예: 낡은 검, 회복약)"
        />
      </div>
    </div>
  </div>

  <!-- 3행: 목표 및 승리 조건 -->
  <div>
    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">목표 / 승리 조건</label>
    <textarea 
      bind:value={value.goal}
      rows="3"
      placeholder="퀘스트의 구체적인 목표나 성공 조건을 적어주세요. (예: 고블린 10마리 처치, 잃어버린 반지 회수)"
      class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none leading-relaxed"
    ></textarea>
  </div>

</section>