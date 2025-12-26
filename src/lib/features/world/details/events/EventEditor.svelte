<script lang="ts">
  export let value: any = {};
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      💥 사건 기록
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">Date / Location / Result</p>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">발생 시기 (시작)</label>
      <input type="text" bind:value={value.startDate} placeholder="예: 제국력 350년" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">종료 시기</label>
      <input type="text" bind:value={value.endDate} placeholder="예: 제국력 355년" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
  </div>

  <div>
    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">발생 장소</label>
    <input type="text" bind:value={value.location} placeholder="사건이 일어난 곳" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
  </div>

  <div class="grid grid-cols-2 gap-3">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">원인 (발단)</label>
      <textarea bind:value={value.cause} rows="3" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition resize-none" placeholder="사건의 계기"></textarea>
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">결과 (영향)</label>
      <textarea bind:value={value.result} rows="3" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition resize-none" placeholder="사건의 결말과 영향"></textarea>
    </div>
  </div>
</section>