<script lang="ts">
  // 1. 각 기능별 에디터 불러오기
  import CharacterSheet from './characters/CharacterSheet.svelte';
  import ItemEditor from './items/ItemEditor.svelte';
  import SkillEditor from './skills/SkillEditor.svelte';
  import QuestEditor from './quests/QuestEditor.svelte';

  import EventEditor from './events/EventEditor.svelte';
  import GroupEditor from './groups/GroupEditor.svelte';
  import LocationEditor from './locations/LocationEditor.svelte';
  
  import NationEditor from './nations/NationEditor.svelte';
  import RaceEditor from './races/RaceEditor.svelte';
  import StorylineEditor from './storylines/StorylineEditor.svelte';

  // 2. 부모에서 받아올 데이터
  export let category: string; // 예: 'skills', 'characters'
  export let data: any;        // DB의 attributes (JSON 데이터)

  // 데이터가 없으면 빈 객체로 초기화 (에러 방지)
  if (!data) data = {};
</script>

<div class="w-full mb-6">
  <!-- 카테고리에 따라 다른 전용 UI를 보여줌 -->
  
  {#if category === 'characters'}
    <CharacterSheet bind:value={data} />

  {:else if category === 'events'}
    <EventEditor bind:value={data} />

  {:else if category === 'groups'}
    <GroupEditor bind:value={data} />

  {:else if category === 'items'}
    <ItemEditor bind:value={data} />

  {:else if category === 'locations'}
    <LocationEditor bind:value={data} />

  {:else if category === 'nations'}
    <NationEditor bind:value={data} />

  {:else if category === 'quests'}
    <QuestEditor bind:value={data} />

  {:else if category === 'races'}
  <RaceEditor bind:value={data} />

  {:else if category === 'skills'}
    <!-- 스킬 에디터 연결 -->
    <SkillEditor bind:value={data} />

  {:else if category === 'storylines'}
    <StorylineEditor bind:value={data} />

  {:else}
    <!-- 나머지 카테고리는 전용 UI 없음 (안내 메시지 생략 가능) -->
    <!-- 필요하다면 여기에 공통 메시지를 띄울 수 있음 -->
  {/if}
</div>