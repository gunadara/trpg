<script lang="ts">
  export let value: any = {};
  if (!value.type) value.type = 'city';
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      🗺️ 지역 상세 정보
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">Geo / Danger / Owner</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">유형</label>
      <div class="relative">
        <select bind:value={value.type} class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition appearance-none">
          <option value="city">🏙️ 도시/마을</option>
          <option value="dungeon">💀 던전/유적</option>
          <option value="nature">🌲 자연/지형</option>
          <option value="building">🏰 주요 건물</option>
        </select>
        <div class="absolute right-3 top-3 text-xs text-slate-400 pointer-events-none">▼</div>
      </div>
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">소속 국가</label>
      <input type="text" bind:value={value.nation} placeholder="예: 브리튼 왕국" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">위험도</label>
      <input type="text" bind:value={value.danger} placeholder="예: 안전, Lv.50+" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
  </div>

  <div>
    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">지배자 / 영주</label>
    <input type="text" bind:value={value.ruler} placeholder="이 지역을 다스리는 사람" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
  </div>
</section>