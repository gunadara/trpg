<script lang="ts">
  type StorylineData = {
    genre: string;
    period: string;        // 작중 시기
    protagonists: string;  // 주요 인물
    status: 'planning' | 'ongoing' | 'done' | 'paused';
    logline: string;       // 한 줄 요약
    conflict: string;      // 핵심 갈등
    ending: string;        // 예정된 결말
  };

  export let value: Partial<StorylineData> = {};

  if (!value.status) value.status = 'planning';

  const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition";
  const labelCls = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1";
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      📜 스토리 라인 상세
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">Logline / Conflict / Ending</p>
  </div>

  <!-- 로그라인 -->
  <div>
    <label class={labelCls}>한 줄 요약 (로그라인)</label>
    <input type="text" bind:value={value.logline} placeholder="이 이야기를 한 문장으로" class={inputCls} />
  </div>

  <!-- 1행: 장르 / 시기 / 상태 -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <label class={labelCls}>장르 / 분위기</label>
      <input type="text" bind:value={value.genre} placeholder="예: 미스터리, 성장담" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>작중 시기</label>
      <input type="text" bind:value={value.period} placeholder="예: 대붕괴 3년 후" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>상태</label>
      <div class="relative">
        <select bind:value={value.status} class="{inputCls} appearance-none">
          <option value="planning">💭 구상 중</option>
          <option value="ongoing">✍️ 진행 중</option>
          <option value="paused">⏸️ 보류</option>
          <option value="done">✅ 완결</option>
        </select>
        <div class="absolute right-3 top-3 text-xs text-slate-400 pointer-events-none">▼</div>
      </div>
    </div>
  </div>

  <!-- 주요 인물 -->
  <div>
    <label class={labelCls}>주요 인물</label>
    <input type="text" bind:value={value.protagonists} placeholder="이 이야기의 중심에 선 사람들" class={inputCls} />
  </div>

  <!-- 핵심 갈등 -->
  <div>
    <label class={labelCls}>핵심 갈등</label>
    <textarea bind:value={value.conflict} rows="3" placeholder="누가 무엇을 원하고, 무엇이 가로막는가" class={inputCls}></textarea>
  </div>

  <!-- 예정된 결말 -->
  <div class="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 p-3">
    <label class="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5 ml-1">🔒 예정된 결말</label>
    <textarea bind:value={value.ending} rows="2" placeholder="이 이야기가 도착할 곳 (스포일러 구역)" class={inputCls}></textarea>
  </div>
</section>
