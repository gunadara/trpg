<script lang="ts">
  export let value: any = {};
  if (!value.type) value.type = 'guild';
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      🏛️ 단체 상세 데이터
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">Org / Leader / Goal</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">단체 유형</label>
      <div class="relative">
        <select bind:value={value.type} class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition appearance-none">
          <option value="guild">⚔️ 길드/협회</option>
          <option value="order">🛡️ 기사단</option>
          <option value="religion">🙏 종교/교단</option>
          <option value="secret">🕵️ 비밀 조직</option>
          <option value="criminal">☠️ 범죄 조직</option>
          <option value="other">기타</option>
        </select>
        <div class="absolute right-3 top-3 text-xs text-slate-400 pointer-events-none">▼</div>
      </div>
    </div>
    
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">수장 (Leader)</label>
      <input type="text" bind:value={value.leader} placeholder="예: 아서 펜드래곤" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">본거지 (Base)</label>
      <input type="text" bind:value={value.base} placeholder="예: 카멜롯 성" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
  </div>

  <div>
    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">설립 이념 / 목적</label>
    <textarea bind:value={value.goal} rows="2" placeholder="이 단체가 존재하는 이유나 목표를 적어주세요." class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition resize-none"></textarea>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">우호 세력</label>
      <input type="text" bind:value={value.ally} placeholder="동맹 관계" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">적대 세력</label>
      <input type="text" bind:value={value.enemy} placeholder="경쟁/전쟁 관계" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
  </div>
</section>