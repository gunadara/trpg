<script lang="ts">
  type GroupData = {
    type: 'guild' | 'order' | 'company' | 'cult' | 'gang' | 'family';
    scale: 'cell' | 'small' | 'large' | 'transnational';
    leader: string;
    base: string;
    goal: string;       // 표면적 목표
    ideology: string;   // 이념 / 신조
    ally: string;
    enemy: string;
    secrets: string;    // 숨겨진 목적
  };

  export let value: Partial<GroupData> = {};

  if (!value.type) value.type = 'guild';
  if (!value.scale) value.scale = 'small';

  const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition";
  const labelCls = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1";
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      🏛️ 단체 상세 데이터
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">Type / Leader / Ideology / Relations</p>
  </div>

  <!-- 1행: 유형 / 규모 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class={labelCls}>유형</label>
      <div class="relative">
        <select bind:value={value.type} class="{inputCls} appearance-none">
          <option value="guild">⚒️ 길드 / 협회</option>
          <option value="order">🛡️ 기사단 / 교단</option>
          <option value="company">💰 상회 / 기업</option>
          <option value="cult">🕯️ 비밀결사 / 컬트</option>
          <option value="gang">🗡️ 범죄 조직</option>
          <option value="family">👑 가문 / 혈족</option>
        </select>
        <div class="absolute right-3 top-3 text-xs text-slate-400 pointer-events-none">▼</div>
      </div>
    </div>
    <div>
      <label class={labelCls}>규모</label>
      <div class="relative">
        <select bind:value={value.scale} class="{inputCls} appearance-none">
          <option value="cell">🕸️ 소수 정예 (10명 이하)</option>
          <option value="small">🏠 소규모 (지역 단위)</option>
          <option value="large">🏰 대규모 (국가 단위)</option>
          <option value="transnational">🌍 초국가 (세계 곳곳)</option>
        </select>
        <div class="absolute right-3 top-3 text-xs text-slate-400 pointer-events-none">▼</div>
      </div>
    </div>
  </div>

  <!-- 2행: 수장 / 거점 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class={labelCls}>수장 / 지도자</label>
      <input type="text" bind:value={value.leader} placeholder="단체를 이끄는 인물" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>본거지</label>
      <input type="text" bind:value={value.base} placeholder="예: 폐쇄된 서점 지하" class={inputCls} />
    </div>
  </div>

  <!-- 목표 / 이념 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class={labelCls}>표면적 목표</label>
      <textarea bind:value={value.goal} rows="2" placeholder="대외적으로 내세우는 것" class={inputCls}></textarea>
    </div>
    <div>
      <label class={labelCls}>이념 / 신조</label>
      <textarea bind:value={value.ideology} rows="2" placeholder="이들이 믿는 것, 행동 원리" class={inputCls}></textarea>
    </div>
  </div>

  <!-- 관계 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class={labelCls}>우호 세력</label>
      <input type="text" bind:value={value.ally} placeholder="동맹, 협력 관계" class={inputCls} />
    </div>
    <div>
      <label class={labelCls}>적대 세력</label>
      <input type="text" bind:value={value.enemy} placeholder="대립, 경쟁 관계" class={inputCls} />
    </div>
  </div>

  <!-- 숨겨진 목적 -->
  <div class="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 p-3">
    <label class="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5 ml-1">🔒 숨겨진 목적</label>
    <textarea bind:value={value.secrets} rows="2" placeholder="구성원도 모르는 진짜 목적" class={inputCls}></textarea>
  </div>
</section>
