<script lang="ts">
  // 스킬 데이터 타입 정의 (나중에 domain/details/skillSchema.ts로 옮겨도 됨)
  type SkillData = {
    type: 'active' | 'passive' | 'ultimate';
    cost: string;
    cooldown: string;
    range: string;
    area: string; // 범위 형태
    conditions: string; // 습득 조건
    effects: string; // 효과
  };

  // 부모(DetailSwitcher)와 양방향 바인딩되는 데이터
  export let value: Partial<SkillData> = {};

  // 기본값 보장
  if (!value.type) value.type = 'active';
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  
  <!-- 헤더 -->
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      ✨ 스킬 상세 데이터
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">
      Type / Cost / Cooldown / Effects
    </p>
  </div>

  <!-- 1행: 타입 / 자원 / 쿨타임 -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- 타입 선택 -->
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">타입</label>
      <div class="relative">
        <select 
          bind:value={value.type}
          class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition appearance-none"
        >
          <option value="active">⚔️ 액티브 (물리/마법)</option>
          <option value="passive">🛡️ 패시브 (지속효과)</option>
          <option value="ultimate">👑 궁극기 / 고유기</option>
        </select>
        <div class="absolute right-3 top-3 text-xs text-slate-400">▼</div>
      </div>
    </div>

    <!-- 소모값 -->
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">자원 소모</label>
      <input 
        type="text" 
        bind:value={value.cost}
        placeholder="예: MP 50, 기력 3"
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
      />
    </div>

    <!-- 쿨타임 -->
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">쿨타임</label>
      <input 
        type="text" 
        bind:value={value.cooldown}
        placeholder="예: 10초, 3턴"
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
      />
    </div>
  </div>

  <!-- 2행: 사거리 / 범위 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">사거리</label>
      <input 
        type="text" 
        bind:value={value.range}
        placeholder="예: 자신, 15m, 시야 내"
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
      />
    </div>
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">범위 형태</label>
      <input 
        type="text" 
        bind:value={value.area}
        placeholder="예: 단일, 반경 3m 원형, 직선"
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
      />
    </div>
  </div>

  <!-- 3행: 조건 및 효과 -->
  <div class="space-y-4">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">습득 조건</label>
      <input 
        type="text" 
        bind:value={value.conditions}
        placeholder="예: Lv.5 이상, '화염구' 습득 시"
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
      />
    </div>

    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">효과 및 상세 설명</label>
      <textarea 
        bind:value={value.effects}
        rows="4"
        placeholder="스킬의 구체적인 효과, 데미지 공식, 상태이상 등을 적어주세요."
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none leading-relaxed"
      ></textarea>
    </div>
  </div>

</section>