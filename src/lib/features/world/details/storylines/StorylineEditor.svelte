<script lang="ts">
  export let value: any = {};
  if (!value.status) value.status = 'planning';
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      📜 스토리 개요
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">Plot / Status / Genre</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">진행 상태</label>
      <div class="relative">
        <select bind:value={value.status} class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition appearance-none">
          <option value="planning">📅 구상 중</option>
          <option value="ongoing">🟢 연재/진행 중</option>
          <option value="completed">🏁 완결</option>
          <option value="paused">⏸️ 중단/보류</option>
        </select>
        <div class="absolute right-3 top-3 text-xs text-slate-400 pointer-events-none">▼</div>
      </div>
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">시대적 배경</label>
      <input type="text" bind:value={value.period} placeholder="예: 대혼란기" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">장르 / 분위기</label>
      <input type="text" bind:value={value.genre} placeholder="예: 피카레스크, 로맨스" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
  </div>

  <div>
    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">주요 주인공 (파티)</label>
    <input type="text" bind:value={value.protagonists} placeholder="이야기의 주역들 (@멘션 추천)" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
  </div>
</section>