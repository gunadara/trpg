<script lang="ts">
  type RaceData = {
    lifespan: string;
    adultAge: string;
    avgHeight: string;
    habitat: string;
    language: string;
    traits: string;     // 외형적 특징
    ability: string;    // 고유 능력
    weakness: string;   // 약점 / 제약
    society: string;    // 사회 구조
    relations: string;  // 타 종족과의 관계
  };

  export let value: Partial<RaceData> = {};

  const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition";
  const labelCls = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1";
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      🧝‍♀️ 종족 상세 데이터
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">Biology / Ability / Society</p>
  </div>

  <!-- 1행: 수명 / 성인 나이 / 평균 신장 -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <label class={labelCls}>수명</label>
      <input type="text" bind:value={value.lifespan} placeholder="예: 약 800년" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>성인 기준</label>
      <input type="text" bind:value={value.adultAge} placeholder="예: 100세" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>평균 신장</label>
      <input type="text" bind:value={value.avgHeight} placeholder="예: 170~190cm" class={inputCls} />
    </div>
  </div>

  <!-- 2행: 서식지 / 언어 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class={labelCls}>주 서식지</label>
      <input type="text" bind:value={value.habitat} placeholder="예: 깊은 숲, 차원의 틈" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>언어</label>
      <input type="text" bind:value={value.language} placeholder="예: 고대어, 공용어 사용" class={inputCls} />
    </div>
  </div>

  <!-- 외형 -->
  <div>
    <label class={labelCls}>외형적 특징</label>
    <textarea bind:value={value.traits} rows="2" placeholder="다른 종족과 구별되는 생김새" class={inputCls}></textarea>
  </div>

  <!-- 능력 / 약점 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class={labelCls}>고유 능력</label>
      <textarea bind:value={value.ability} rows="3" placeholder="이 종족만 할 수 있는 것" class={inputCls}></textarea>
    </div>
    <div>
      <label class={labelCls}>약점 / 제약</label>
      <textarea bind:value={value.weakness} rows="3" placeholder="치명적인 약점이나 대가" class={inputCls}></textarea>
    </div>
  </div>

  <!-- 사회 / 관계 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class={labelCls}>사회 구조</label>
      <textarea bind:value={value.society} rows="2" placeholder="예: 모계 부족제, 장로 회의" class={inputCls}></textarea>
    </div>
    <div>
      <label class={labelCls}>타 종족과의 관계</label>
      <textarea bind:value={value.relations} rows="2" placeholder="우호적/적대적인 종족과 그 이유" class={inputCls}></textarea>
    </div>
  </div>
</section>
