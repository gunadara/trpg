<script lang="ts">
  type EventData = {
    type: 'war' | 'incident' | 'conspiracy' | 'disaster' | 'festival' | 'discovery';
    scale: 'personal' | 'local' | 'national' | 'world';
    startDate: string;
    endDate: string;
    sortYear: number | null;
    location: string;
    involved: string;   // 관련 인물/단체
    cause: string;      // 발단
    result: string;     // 결과
    impact: string;     // 세계에 남긴 영향
    secrets: string;    // 숨겨진 진실 (공식 기록과 다른 것)
  };

  export let value: Partial<EventData> = {};

  if (!value.type) value.type = 'incident';
  if (!value.scale) value.scale = 'local';

  const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition";
  const labelCls = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1";
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      💥 사건 상세 데이터
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">Type / Scale / Cause / Secrets</p>
  </div>

  <!-- 1행: 유형 / 규모 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class={labelCls}>유형</label>
      <div class="relative">
        <select bind:value={value.type} class="{inputCls} appearance-none">
          <option value="war">⚔️ 전쟁 / 분쟁</option>
          <option value="incident">🔥 사건 / 사고</option>
          <option value="conspiracy">🕯️ 음모 / 암투</option>
          <option value="disaster">🌊 재해 / 이변</option>
          <option value="festival">🎉 축제 / 의식</option>
          <option value="discovery">🔍 발견 / 출현</option>
        </select>
        <div class="absolute right-3 top-3 text-xs text-slate-400 pointer-events-none">▼</div>
      </div>
    </div>
    <div>
      <label class={labelCls}>규모</label>
      <div class="relative">
        <select bind:value={value.scale} class="{inputCls} appearance-none">
          <option value="personal">👤 개인 (몇 명의 운명)</option>
          <option value="local">🏘️ 지역 (마을/도시)</option>
          <option value="national">🏳️ 국가 (나라 단위)</option>
          <option value="world">🌍 세계 (모두에게 영향)</option>
        </select>
        <div class="absolute right-3 top-3 text-xs text-slate-400 pointer-events-none">▼</div>
      </div>
    </div>
  </div>

  <!-- 2행: 정렬 연도 / 시기 / 장소 -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div>
      <label class={labelCls}>정렬 연도 <span class="font-normal text-slate-400">(연표용 숫자)</span></label>
      <input type="number" bind:value={value.sortYear} placeholder="예: 412" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>시작 시점</label>
      <input type="text" bind:value={value.startDate} placeholder="예: 제국력 412년 봄" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>종료 시점</label>
      <input type="text" bind:value={value.endDate} placeholder="예: 동년 겨울, 진행 중" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>발생 장소</label>
      <input type="text" bind:value={value.location} placeholder="예: 수도 외곽 지하도" class={inputCls} />
    </div>
  </div>

  <!-- 관련자 -->
  <div>
    <label class={labelCls}>관련 인물 / 단체</label>
    <input type="text" bind:value={value.involved} placeholder="예: 헬릭스, 이지윤, 청로당 잔존 세력" class={inputCls} />
  </div>

  <!-- 발단 / 결과 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class={labelCls}>발단 (왜 일어났나)</label>
      <textarea bind:value={value.cause} rows="3" placeholder="사건의 원인과 배경" class={inputCls}></textarea>
    </div>
    <div>
      <label class={labelCls}>결과 (어떻게 끝났나)</label>
      <textarea bind:value={value.result} rows="3" placeholder="직접적인 결말" class={inputCls}></textarea>
    </div>
  </div>

  <!-- 영향 -->
  <div>
    <label class={labelCls}>남긴 영향</label>
    <textarea bind:value={value.impact} rows="2" placeholder="이 사건 이후 세계가 어떻게 달라졌나" class={inputCls}></textarea>
  </div>

  <!-- 숨겨진 진실 -->
  <div class="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 p-3">
    <label class="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5 ml-1">🔒 숨겨진 진실</label>
    <textarea bind:value={value.secrets} rows="2" placeholder="공식 기록과 다른, 작가만 아는 내막" class={inputCls}></textarea>
  </div>
</section>
