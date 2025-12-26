<script lang="ts">
  // 부모(DetailSwitcher)에서 받아온 데이터
  export let value: any = {};

  // 데이터 초기화 (없으면 기본값 설정)
  if (!value.type) value.type = 'weapon';
  if (!value.grade) value.grade = 'common';

  // 등급에 따른 텍스트 색상 계산 (시각적 효과)
  $: gradeColor = 
    value.grade === 'legendary' ? 'text-orange-500 font-bold' :
    value.grade === 'epic' ? 'text-purple-500 font-bold' :
    value.grade === 'rare' ? 'text-blue-500 font-bold' :
    value.grade === 'magic' ? 'text-green-500' :
    'text-slate-600 dark:text-slate-400';
</script>

<section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-5">
  
  <!-- 헤더 -->
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
    <h3 class="text-sm font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
      ⚔️ 아이템 상세 데이터
    </h3>
    <p class="text-[10px] text-slate-400 dark:text-slate-500">
      Type / Grade / Price / Stats
    </p>
  </div>

  <!-- 1행: 기본 정보 (유형, 등급, 가격, 무게) -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    
    <!-- 1. 유형 -->
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">유형</label>
      <div class="relative">
        <select 
          bind:value={value.type}
          class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition appearance-none"
        >
          <option value="weapon">🗡️ 무기</option>
          <option value="armor">🛡️ 방어구</option>
          <option value="accessory">💍 장신구</option>
          <option value="consumable">🧪 소모품</option>
          <option value="material">💎 재료/보물</option>
        </select>
        <div class="absolute right-2 top-2.5 text-xs text-slate-400 pointer-events-none">▼</div>
      </div>
    </div>

    <!-- 2. 등급 -->
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">등급</label>
      <div class="relative">
        <select 
          bind:value={value.grade}
          class={`w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition appearance-none ${gradeColor}`}
        >
          <option value="common" class="text-slate-500">⚪ 일반 (Common)</option>
          <option value="magic" class="text-green-500">🟢 매직 (Magic)</option>
          <option value="rare" class="text-blue-500">🔵 희귀 (Rare)</option>
          <option value="epic" class="text-purple-500">🟣 영웅 (Epic)</option>
          <option value="legendary" class="text-orange-500">🟠 전설 (Legendary)</option>
        </select>
        <div class="absolute right-2 top-2.5 text-xs text-slate-400 pointer-events-none">▼</div>
      </div>
    </div>

    <!-- 3. 가격 -->
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">가격 (Gold)</label>
      <input 
        type="text" 
        bind:value={value.price}
        placeholder="예: 500"
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-right"
      />
    </div>

    <!-- 4. 무게 -->
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">무게</label>
      <input 
        type="text" 
        bind:value={value.weight}
        placeholder="예: 1.5 kg"
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-right"
      />
    </div>
  </div>

  <!-- 2행: 전투 스탯 (무기/방어구일 때만 표시) -->
  {#if value.type === 'weapon'}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
      <div>
        <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">공격력 / 데미지 주사위</label>
        <input 
          type="text" 
          bind:value={value.damage}
          placeholder="예: 50 또는 1d8 + 2"
          class="w-full rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition font-medium text-red-500"
        />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">속성 / 타입</label>
        <input 
          type="text" 
          bind:value={value.damageType}
          placeholder="예: 화염, 베기, 관통"
          class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
        />
      </div>
    </div>
  {:else if value.type === 'armor'}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
      <div>
        <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">방어력 (AC)</label>
        <input 
          type="number" 
          bind:value={value.defense}
          placeholder="예: 15"
          class="w-full rounded-xl border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium text-blue-500"
        />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">착용 부위 / 재질</label>
        <input 
          type="text" 
          bind:value={value.material}
          placeholder="예: 중갑, 판금, 가죽"
          class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
        />
      </div>
    </div>
  {/if}

  <!-- 3행: 착용 제한 및 효과 -->
  <div class="space-y-3">
    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">착용/사용 조건</label>
      <input 
        type="text" 
        bind:value={value.requirement}
        placeholder="예: 전사 전용, Lv.10 이상, 힘 15 필요"
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
      />
    </div>

    <div>
      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">특수 효과 및 설명</label>
      <textarea 
        bind:value={value.effects}
        rows="3"
        placeholder="아이템의 특수 능력이나 플레이버 텍스트를 적어주세요."
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none leading-relaxed"
      ></textarea>
    </div>
  </div>

</section>

<style>
  /* 간단한 페이드인 애니메이션 */
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-in-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>