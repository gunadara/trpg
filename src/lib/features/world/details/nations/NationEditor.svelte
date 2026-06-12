<script lang="ts">
  type NationData = {
    political: string;   // 정치 체제
    ruler: string;
    capital: string;
    population: string;
    mainRace: string;
    industry: string;
    alignment: string;   // 성향
    culture: string;     // 문화 / 풍습
    conflict: string;    // 현재 정세 / 갈등
    secrets: string;     // 숨겨진 사정
  };

  export let value: Partial<NationData> = {};

  const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition";
  const labelCls = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1";
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      🏳️ 나라 상세 데이터
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">Politics / Culture / Conflict</p>
  </div>

  <!-- 1행: 체제 / 통치자 / 수도 -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <label class={labelCls}>정치 체제</label>
      <input type="text" bind:value={value.political} placeholder="예: 제국, 도시연합, 신정" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>통치자</label>
      <input type="text" bind:value={value.ruler} placeholder="현재 권력자" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>수도</label>
      <input type="text" bind:value={value.capital} placeholder="수도 / 중심 도시" class={inputCls} />
    </div>
  </div>

  <!-- 2행: 인구 / 주요 종족 / 산업 -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <label class={labelCls}>인구</label>
      <input type="text" bind:value={value.population} placeholder="예: 약 300만" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>주요 종족</label>
      <input type="text" bind:value={value.mainRace} placeholder="예: 인간 70%, 엘프 20%" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>주력 산업</label>
      <input type="text" bind:value={value.industry} placeholder="예: 마석 채굴, 해상 무역" class={inputCls} />
    </div>
  </div>

  <!-- 성향 -->
  <div>
    <label class={labelCls}>국가 성향</label>
    <input type="text" bind:value={value.alignment} placeholder="예: 폐쇄적, 호전적, 실리주의" class={inputCls} />
  </div>

  <!-- 문화 / 정세 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class={labelCls}>문화 / 풍습</label>
      <textarea bind:value={value.culture} rows="3" placeholder="이 나라만의 관습, 금기, 축제" class={inputCls}></textarea>
    </div>
    <div>
      <label class={labelCls}>현재 정세 / 갈등</label>
      <textarea bind:value={value.conflict} rows="3" placeholder="지금 이 나라가 안고 있는 문제" class={inputCls}></textarea>
    </div>
  </div>

  <!-- 숨겨진 사정 -->
  <div class="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 p-3">
    <label class="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5 ml-1">🔒 숨겨진 사정</label>
    <textarea bind:value={value.secrets} rows="2" placeholder="역사에서 지워진 것, 왕실의 비밀 등" class={inputCls}></textarea>
  </div>
</section>
