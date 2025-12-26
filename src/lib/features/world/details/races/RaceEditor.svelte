<script lang="ts">
  export let value: any = {};

  if (!value.lifespan) value.lifespan = '';
  if (!value.traits) value.traits = [];

  function addTrait() {
    value.traits = [...value.traits, { name: '', desc: '' }];
  }
  function removeTrait(index: number) {
    value.traits = value.traits.filter((_: any, i: number) => i !== index);
  }
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      🧝‍♀️ 종족 상세 데이터
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">Bio / Culture</p>
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">평균 수명</label>
      <input type="text" bind:value={value.lifespan} placeholder="예: 300년" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">성인 연령</label>
      <input type="text" bind:value={value.adultAge} placeholder="예: 50세" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">평균 신장</label>
      <input type="text" bind:value={value.avgHeight} placeholder="예: 180cm" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">주요 언어</label>
      <input type="text" bind:value={value.language} placeholder="예: 엘프어" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
    </div>
  </div>

  <div>
    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1">주요 서식지</label>
    <input type="text" bind:value={value.habitat} placeholder="예: 세계수 숲, 지하 동굴" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
  </div>

  <div>
    <div class="flex justify-between items-center mb-2">
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">종족 고유 특성</label>
      <button on:click={addTrait} class="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded hover:bg-indigo-100 transition">+ 특성 추가</button>
    </div>
    <div class="space-y-2">
      {#each value.traits as trait, i}
        <div class="flex gap-2 items-start">
          <input type="text" bind:value={trait.name} placeholder="특성명 (예: 야간 시야)" class="w-1/3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
          <input type="text" bind:value={trait.desc} placeholder="효과 설명" class="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition" />
          <button on:click={() => removeTrait(i)} class="text-slate-400 hover:text-red-500 px-2">×</button>
        </div>
      {/each}
    </div>
  </div>
</section>