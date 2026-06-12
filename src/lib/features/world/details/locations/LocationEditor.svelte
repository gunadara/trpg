<script lang="ts">
  type LocationData = {
    type: 'city' | 'dungeon' | 'nature' | 'building';
    nation: string;
    danger: string;
    ruler: string;
    atmosphere: string;  // 분위기
    features: string;    // 명물 / 특징
    secrets: string;     // 숨겨진 것
  };

  export let value: Partial<LocationData> = {};

  if (!value.type) value.type = 'city';

  const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition";
  const labelCls = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1";
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      🗺️ 지역 상세 정보
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">Geo / Danger / Atmosphere</p>
  </div>

  <!-- 1행: 유형 / 소속 국가 / 위험도 -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <label class={labelCls}>유형</label>
      <div class="relative">
        <select bind:value={value.type} class="{inputCls} appearance-none">
          <option value="city">🏙️ 도시/마을</option>
          <option value="dungeon">💀 던전/유적</option>
          <option value="nature">🌲 자연/지형</option>
          <option value="building">🏰 주요 건물</option>
        </select>
        <div class="absolute right-3 top-3 text-xs text-slate-400 pointer-events-none">▼</div>
      </div>
    </div>
    <div>
      <label class={labelCls}>소속 국가</label>
      <input type="text" bind:value={value.nation} placeholder="예: 브리튼 왕국" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>위험도</label>
      <input type="text" bind:value={value.danger} placeholder="예: 안전, Lv.50+" class={inputCls} />
    </div>
  </div>

  <!-- 지배자 -->
  <div>
    <label class={labelCls}>지배자 / 영주</label>
    <input type="text" bind:value={value.ruler} placeholder="이 지역을 다스리는 사람" class={inputCls} />
  </div>

  <!-- 분위기 / 특징 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class={labelCls}>분위기</label>
      <textarea bind:value={value.atmosphere} rows="3" placeholder="처음 도착한 사람이 받는 인상 — 냄새, 소리, 공기" class={inputCls}></textarea>
    </div>
    <div>
      <label class={labelCls}>명물 / 특징</label>
      <textarea bind:value={value.features} rows="3" placeholder="이곳에서만 볼 수 있는 것" class={inputCls}></textarea>
    </div>
  </div>

  <!-- 숨겨진 것 -->
  <div class="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 p-3">
    <label class="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5 ml-1">🔒 숨겨진 것</label>
    <textarea bind:value={value.secrets} rows="2" placeholder="이 장소에 묻혀 있는 비밀" class={inputCls}></textarea>
  </div>
</section>
