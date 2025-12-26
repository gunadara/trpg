<script lang="ts">
  export let value: any = {};
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      🏳️ 국가 정보
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">Politic / Capital</p>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">수도 (Capital)</label>
      <input type="text" bind:value={value.capital} placeholder="수도 이름" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">통치자 (Ruler)</label>
      <input type="text" bind:value={value.ruler} placeholder="왕/대통령 이름" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
  </div>

  <div class="grid grid-cols-3 gap-3">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">정치 체제</label>
      <input type="text" bind:value={value.political} placeholder="예: 전제군주정" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">인구</label>
      <input type="text" bind:value={value.population} placeholder="예: 500만 명" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">국가 성향</label>
      <input type="text" bind:value={value.alignment} placeholder="예: 중립" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">주요 종족</label>
      <input type="text" bind:value={value.mainRace} placeholder="인간 80%, 엘프 20%" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">주요 산업/특산물</label>
      <input type="text" bind:value={value.industry} placeholder="마도공학, 철광석" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
  </div>
</section>