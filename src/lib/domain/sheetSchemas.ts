// src/lib/domain/sheetSchemas.ts
//
// "프로필 시트" 배치표.
// 컴포넌트를 새로 만들지 않고 여기에 적기만 하면 시트가 생긴다.
// 렌더링은 ProfileSheet.svelte 하나가 전부 담당.
//
// key는 점(.)으로 중첩 가능:  'basic.age'  →  attributes.profile.basic.age
// 저장 위치는 항상 attributes.profile 아래 → 기존 전용 에디터 데이터와 안 섞임.

export type SheetFieldType = 'text' | 'long' | 'list' | 'number' | 'select';

export type SheetField = {
  key: string;
  label: string;
  type: SheetFieldType;
  placeholder?: string;
  /** 섹션 그리드에서 차지할 칸 수 (기본 1) */
  span?: number;
  /** select 전용 */
  options?: { value: string; label: string }[];
};

export type SheetSection = {
  id: string;
  icon: string;
  title: string;
  /** 넓은 화면에서 몇 열로 나눌지 (기본 1) */
  cols?: number;
  /** 강조 배경 (서사 축처럼 중요한 섹션) */
  accent?: boolean;
  fields: SheetField[];
};

export type SheetSchema = {
  scope: string;
  icon: string;
  title: string;
  subtitle: string;
  /**
   * 값을 어디에 저장할지.
   * - 'profile' (기본): attributes.profile.* — 새로 만든 시트
   * - 'root': attributes.* — 기존 전용 에디터가 쓰던 자리 그대로.
   *   흡수한 시트는 이걸 써야 기존 입력값이 마이그레이션 없이 그대로 보인다.
   */
  dataRoot?: 'profile' | 'root';
  sections: SheetSection[];
};

// ────────────────────────────────────────────
// 인물
// ────────────────────────────────────────────
const CHARACTERS: SheetSchema = {
  scope: 'characters',
  icon: '📖',
  title: '인물 프로필 시트',
  subtitle: '외모 / 성격 / 배경 / 서사',
  sections: [
    {
      id: 'basic',
      icon: '',
      title: '',
      cols: 4,
      fields: [
        { key: 'basic.age', label: '나이', type: 'text' },
        { key: 'basic.gender', label: '성별', type: 'text' },
        { key: 'basic.job', label: '직업 · 신분', type: 'text' },
        { key: 'basic.affiliation', label: '소속', type: 'text' }
      ]
    },
    {
      id: 'look',
      icon: '👤',
      title: '외모',
      cols: 3,
      fields: [
        { key: 'look.build', label: '키 · 체형', type: 'text' },
        { key: 'look.hair', label: '머리 · 눈', type: 'text' },
        { key: 'look.impression', label: '첫인상 한마디', type: 'text' },
        {
          key: 'look.detail',
          label: '옷차림 · 특징',
          type: 'long',
          span: 3,
          placeholder: '옷차림, 흉터, 늘 지니는 것…'
        }
      ]
    },
    {
      id: 'mind',
      icon: '🎭',
      title: '성격',
      cols: 2,
      fields: [
        {
          key: 'mind.personality',
          label: '성격',
          type: 'long',
          span: 2,
          placeholder: '겉으로 보이는 모습과 실제가 어떻게 다른가'
        },
        { key: 'merits', label: '장점', type: 'list' },
        { key: 'flaws', label: '단점 · 약점', type: 'list' },
        {
          key: 'mind.tone',
          label: '말투 · 버릇',
          type: 'long',
          span: 2,
          placeholder: '존댓말만 쓴다, 말끝을 흐린다…'
        }
      ]
    },
    {
      id: 'past',
      icon: '🏛',
      title: '배경',
      cols: 2,
      fields: [
        { key: 'past.origin', label: '출신 · 가족', type: 'long' },
        { key: 'past.event', label: '과거 · 결정적 사건', type: 'long' }
      ]
    },
    {
      id: 'arc',
      icon: '🔥',
      title: '서사 축',
      cols: 2,
      accent: true,
      fields: [
        { key: 'arc.desire', label: '욕망 · 목표', type: 'long', placeholder: '무엇을 원하는가' },
        { key: 'arc.fear', label: '결핍 · 두려움', type: 'long', placeholder: '무엇이 없어서 그걸 원하는가' },
        { key: 'arc.secret', label: '비밀', type: 'long', span: 2, placeholder: '들키면 곤란한 것' },
        {
          key: 'arc.change',
          label: '변화 — 어떻게 달라지는가',
          type: 'long',
          span: 2,
          placeholder: '시작과 끝에서 이 인물의 무엇이 바뀌는가'
        }
      ]
    },
    {
      id: 'memo',
      icon: '✍️',
      title: '집필 메모',
      cols: 2,
      fields: [
        { key: 'debut', label: '첫 등장 장면', type: 'long', span: 2, placeholder: '처음 나올 때 무엇을 하고 있는가' },
        { key: 'symbols', label: '상징 (색 · 소품 · 향)', type: 'list', span: 2 }
      ]
    }
  ]
};

// ────────────────────────────────────────────
// 나라
// ────────────────────────────────────────────
const NATIONS: SheetSchema = {
  scope: 'nations',
  icon: '🏳️',
  title: '나라 시트',
  subtitle: '통치 / 지리 / 문화 / 정세',
  sections: [
    {
      id: 'basic',
      icon: '',
      title: '',
      cols: 4,
      fields: [
        { key: 'basic.form', label: '정체', type: 'text', placeholder: '왕국, 공화국…' },
        { key: 'basic.capital', label: '수도', type: 'text' },
        { key: 'basic.ruler', label: '통치자', type: 'text' },
        { key: 'basic.founded', label: '건국', type: 'text' }
      ]
    },
    {
      id: 'rule',
      icon: '👑',
      title: '통치',
      cols: 2,
      fields: [
        { key: 'rule.structure', label: '권력 구조', type: 'long', placeholder: '누가 실제로 결정하는가' },
        { key: 'rule.law', label: '법 · 제도', type: 'long' },
        { key: 'rule.classes', label: '계급 · 신분', type: 'list' },
        { key: 'rule.military', label: '군사력', type: 'long' }
      ]
    },
    {
      id: 'land',
      icon: '🗺',
      title: '지리 · 경제',
      cols: 2,
      fields: [
        { key: 'land.terrain', label: '지형 · 기후', type: 'long' },
        { key: 'land.cities', label: '주요 도시', type: 'list' },
        { key: 'land.industry', label: '산업 · 특산', type: 'list' },
        { key: 'land.trade', label: '교역 · 화폐', type: 'long' }
      ]
    },
    {
      id: 'culture',
      icon: '🎎',
      title: '문화',
      cols: 2,
      fields: [
        { key: 'culture.people', label: '주민 · 종족 구성', type: 'long' },
        { key: 'culture.faith', label: '종교 · 신앙', type: 'long' },
        { key: 'culture.custom', label: '풍습 · 금기', type: 'list' },
        { key: 'culture.language', label: '언어 · 문자', type: 'text' }
      ]
    },
    {
      id: 'tension',
      icon: '🔥',
      title: '정세',
      cols: 2,
      accent: true,
      fields: [
        { key: 'tension.conflict', label: '갈등 · 불안 요소', type: 'long', span: 2, placeholder: '이 나라가 안고 있는 문제' },
        { key: 'tension.allies', label: '우호국', type: 'list' },
        { key: 'tension.enemies', label: '적대국', type: 'list' }
      ]
    }
  ]
};

// ────────────────────────────────────────────
// 종족
// ────────────────────────────────────────────
const RACES: SheetSchema = {
  scope: 'races',
  icon: '🧝‍♀️',
  title: '종족 시트',
  subtitle: '신체 / 생태 / 사회 / 관계',
  sections: [
    {
      id: 'basic',
      icon: '',
      title: '',
      cols: 4,
      fields: [
        { key: 'basic.lifespan', label: '수명', type: 'text' },
        { key: 'basic.height', label: '평균 신장', type: 'text' },
        { key: 'basic.habitat', label: '주 서식지', type: 'text' },
        { key: 'basic.population', label: '규모', type: 'text' }
      ]
    },
    {
      id: 'body',
      icon: '🧬',
      title: '신체 · 능력',
      cols: 2,
      fields: [
        { key: 'body.look', label: '생김새', type: 'long', span: 2 },
        { key: 'body.traits', label: '고유 능력', type: 'list' },
        { key: 'body.weakness', label: '약점 · 제약', type: 'list' }
      ]
    },
    {
      id: 'life',
      icon: '🌱',
      title: '생태',
      cols: 2,
      fields: [
        { key: 'life.cycle', label: '탄생 · 성장 · 죽음', type: 'long' },
        { key: 'life.food', label: '식성 · 생활', type: 'long' }
      ]
    },
    {
      id: 'society',
      icon: '🏘',
      title: '사회',
      cols: 2,
      fields: [
        { key: 'society.structure', label: '무리 · 가족 구조', type: 'long' },
        { key: 'society.faith', label: '신앙 · 가치관', type: 'long' },
        { key: 'society.custom', label: '풍습 · 금기', type: 'list' },
        { key: 'society.language', label: '언어', type: 'text' }
      ]
    },
    {
      id: 'relation',
      icon: '🔥',
      title: '다른 종족과',
      cols: 2,
      accent: true,
      fields: [
        { key: 'relation.view', label: '바깥에서 이 종족을 보는 시선', type: 'long', span: 2 },
        { key: 'relation.friendly', label: '우호', type: 'list' },
        { key: 'relation.hostile', label: '적대', type: 'list' }
      ]
    }
  ]
};

// ────────────────────────────────────────────
// 단체
// ────────────────────────────────────────────
const GROUPS: SheetSchema = {
  scope: 'groups',
  icon: '🏛️',
  title: '단체 시트',
  subtitle: '목적 / 구성 / 자원 / 갈등',
  sections: [
    {
      id: 'basic',
      icon: '',
      title: '',
      cols: 4,
      fields: [
        { key: 'basic.kind', label: '종류', type: 'text', placeholder: '길드, 교단, 상회…' },
        { key: 'basic.leader', label: '수장', type: 'text' },
        { key: 'basic.base', label: '본거지', type: 'text' },
        { key: 'basic.size', label: '규모', type: 'text' }
      ]
    },
    {
      id: 'purpose',
      icon: '🎯',
      title: '목적',
      cols: 2,
      fields: [
        { key: 'purpose.goal', label: '표면적 목적', type: 'long' },
        { key: 'purpose.real', label: '실제 목적', type: 'long', placeholder: '겉과 속이 다르다면' },
        { key: 'purpose.origin', label: '설립 경위', type: 'long', span: 2 }
      ]
    },
    {
      id: 'member',
      icon: '👥',
      title: '구성',
      cols: 2,
      fields: [
        { key: 'member.ranks', label: '계급 · 직책', type: 'list' },
        { key: 'member.entry', label: '가입 조건 · 의식', type: 'long' },
        { key: 'member.rules', label: '규율 · 처벌', type: 'list' },
        { key: 'member.mark', label: '표식 · 상징', type: 'text' }
      ]
    },
    {
      id: 'power',
      icon: '💰',
      title: '자원 · 영향력',
      cols: 2,
      fields: [
        { key: 'power.money', label: '자금원', type: 'long' },
        { key: 'power.force', label: '무력 · 수단', type: 'long' },
        { key: 'power.reach', label: '영향권', type: 'list', span: 2 }
      ]
    },
    {
      id: 'tension',
      icon: '🔥',
      title: '갈등',
      cols: 2,
      accent: true,
      fields: [
        { key: 'tension.inner', label: '내부 분열', type: 'long', span: 2, placeholder: '누가 누구를 못 미더워하는가' },
        { key: 'tension.allies', label: '협력', type: 'list' },
        { key: 'tension.enemies', label: '적대', type: 'list' }
      ]
    }
  ]
};

// ────────────────────────────────────────────
// 장소
// ────────────────────────────────────────────
const LOCATIONS: SheetSchema = {
  scope: 'locations',
  icon: '🗺️',
  title: '장소 시트',
  subtitle: '풍경 / 사람 / 내력 / 쓰임',
  sections: [
    {
      id: 'basic',
      icon: '',
      title: '',
      cols: 4,
      fields: [
        { key: 'basic.kind', label: '종류', type: 'text', placeholder: '숲, 도시, 유적…' },
        { key: 'basic.region', label: '위치 · 소속', type: 'text' },
        { key: 'basic.scale', label: '규모', type: 'text' },
        { key: 'basic.access', label: '접근성', type: 'text', placeholder: '도보 3일, 배로만…' }
      ]
    },
    {
      id: 'scene',
      icon: '🌄',
      title: '풍경',
      cols: 2,
      fields: [
        { key: 'scene.look', label: '첫눈에 보이는 것', type: 'long', span: 2 },
        { key: 'scene.sense', label: '소리 · 냄새 · 공기', type: 'long', placeholder: '글로 옮길 때 쓸 감각' },
        { key: 'scene.weather', label: '기후 · 계절', type: 'long' }
      ]
    },
    {
      id: 'people',
      icon: '👥',
      title: '사람',
      cols: 2,
      fields: [
        { key: 'people.who', label: '누가 사는가', type: 'long' },
        { key: 'people.rule', label: '누가 다스리는가', type: 'text' },
        { key: 'people.spots', label: '주요 장소 · 건물', type: 'list', span: 2 }
      ]
    },
    {
      id: 'history',
      icon: '📜',
      title: '내력',
      cols: 2,
      fields: [
        { key: 'history.past', label: '과거에 있었던 일', type: 'long' },
        { key: 'history.rumor', label: '떠도는 소문 · 전설', type: 'long' }
      ]
    },
    {
      id: 'story',
      icon: '🔥',
      title: '이야기에서의 쓰임',
      cols: 2,
      accent: true,
      fields: [
        { key: 'story.role', label: '여기서 무슨 일이 벌어지는가', type: 'long', span: 2 },
        { key: 'story.danger', label: '위험 요소', type: 'list' },
        { key: 'story.secret', label: '숨겨진 것', type: 'list' }
      ]
    }
  ]
};


// ────────────────────────────────────────────
// 아래 5종은 기존 전용 에디터를 흡수한 것 → dataRoot: 'root'
// (attributes.* 자리를 그대로 써서 기존 입력값이 마이그레이션 없이 보인다)
// ────────────────────────────────────────────

const EVENTS: SheetSchema = {
  scope: 'events',
  icon: '💥',
  title: '사건 시트',
  subtitle: '시점 / 경위 / 여파',
  dataRoot: 'root',
  sections: [
    {
      id: 'basic',
      icon: '',
      title: '',
      cols: 4,
      fields: [
        {
          key: 'type', label: '유형', type: 'select',
          options: [
            { value: 'war', label: '⚔️ 전쟁 / 분쟁' },
            { value: 'incident', label: '🔥 사건 / 사고' },
            { value: 'conspiracy', label: '🕯️ 음모 / 암투' },
            { value: 'disaster', label: '🌊 재해 / 이변' },
            { value: 'festival', label: '🎉 축제 / 의식' },
            { value: 'discovery', label: '🔍 발견 / 출현' }
          ]
        },
        {
          key: 'scale', label: '규모', type: 'select',
          options: [
            { value: 'personal', label: '👤 개인' },
            { value: 'local', label: '🏘️ 지역' },
            { value: 'national', label: '🏳️ 국가' },
            { value: 'world', label: '🌍 세계' }
          ]
        },
        { key: 'startDate', label: '시작 시점', type: 'text' },
        { key: 'endDate', label: '종료 시점', type: 'text' }
      ]
    },
    {
      id: 'where',
      icon: '📍',
      title: '무대',
      cols: 2,
      fields: [
        { key: 'location', label: '발생 장소', type: 'text' },
        { key: 'sortYear', label: '정렬용 연도', type: 'number', placeholder: '예: 412' },
        { key: 'involved', label: '관련 인물 · 단체', type: 'list', span: 2 }
      ]
    },
    {
      id: 'flow',
      icon: '📜',
      title: '경위',
      cols: 2,
      fields: [
        { key: 'cause', label: '발단 — 왜 일어났나', type: 'long' },
        { key: 'result', label: '결과 — 어떻게 끝났나', type: 'long' }
      ]
    },
    {
      id: 'after',
      icon: '🔥',
      title: '여파',
      cols: 2,
      accent: true,
      fields: [
        { key: 'impact', label: '남긴 영향', type: 'long', span: 2 },
        { key: 'secrets', label: '🔒 숨겨진 진실', type: 'long', span: 2, placeholder: '기록에 안 남은 것' }
      ]
    }
  ]
};

const ITEMS: SheetSchema = {
  scope: 'items',
  icon: '⚔️',
  title: '아이템 시트',
  subtitle: '분류 / 성능 / 내력',
  dataRoot: 'root',
  sections: [
    {
      id: 'basic',
      icon: '',
      title: '',
      cols: 4,
      fields: [
        {
          key: 'type', label: '유형', type: 'select',
          options: [
            { value: 'weapon', label: '🗡️ 무기' },
            { value: 'armor', label: '🛡️ 방어구' },
            { value: 'accessory', label: '💍 장신구' },
            { value: 'consumable', label: '🧪 소모품' },
            { value: 'material', label: '💎 재료 / 보물' }
          ]
        },
        {
          key: 'grade', label: '등급', type: 'select',
          options: [
            { value: 'common', label: '⚪ 일반' },
            { value: 'magic', label: '🟢 매직' },
            { value: 'rare', label: '🔵 희귀' },
            { value: 'epic', label: '🟣 영웅' },
            { value: 'legendary', label: '🟠 전설' }
          ]
        },
        { key: 'price', label: '가격 (Gold)', type: 'number' },
        { key: 'weight', label: '무게', type: 'text' }
      ]
    },
    {
      id: 'spec',
      icon: '🔧',
      title: '성능',
      cols: 2,
      fields: [
        { key: 'damage', label: '공격력 · 데미지', type: 'text' },
        { key: 'damageType', label: '속성 · 타입', type: 'text' },
        { key: 'defense', label: '방어력 (AC)', type: 'text' },
        { key: 'material', label: '착용 부위 · 재질', type: 'text' },
        { key: 'requirement', label: '착용 · 사용 조건', type: 'text', span: 2 },
        { key: 'effects', label: '특수 효과 및 설명', type: 'long', span: 2 }
      ]
    },
    {
      id: 'lore',
      icon: '🔥',
      title: '내력',
      cols: 2,
      accent: true,
      fields: [
        { key: 'origin', label: '누가 만들었나 · 어디서 왔나', type: 'long', span: 2 },
        { key: 'owners', label: '거쳐 간 주인', type: 'list' },
        { key: 'curse', label: '대가 · 저주 · 조건', type: 'long' }
      ]
    }
  ]
};

const SKILLS: SheetSchema = {
  scope: 'skills',
  icon: '✨',
  title: '스킬 시트',
  subtitle: '분류 / 수치 / 원리',
  dataRoot: 'root',
  sections: [
    {
      id: 'basic',
      icon: '',
      title: '',
      cols: 4,
      fields: [
        {
          key: 'type', label: '타입', type: 'select',
          options: [
            { value: 'active', label: '⚔️ 액티브' },
            { value: 'passive', label: '🛡️ 패시브' },
            { value: 'ultimate', label: '👑 궁극기 / 고유기' }
          ]
        },
        { key: 'cost', label: '자원 소모', type: 'text' },
        { key: 'cooldown', label: '쿨타임', type: 'text' },
        { key: 'range', label: '사거리', type: 'text' }
      ]
    },
    {
      id: 'spec',
      icon: '🔧',
      title: '상세',
      cols: 2,
      fields: [
        { key: 'area', label: '범위 형태', type: 'text' },
        { key: 'conditions', label: '습득 조건', type: 'text' },
        { key: 'effects', label: '효과 및 상세 설명', type: 'long', span: 2 }
      ]
    },
    {
      id: 'lore',
      icon: '🔥',
      title: '원리 · 대가',
      cols: 2,
      accent: true,
      fields: [
        { key: 'principle', label: '어떤 원리로 작동하는가', type: 'long', span: 2 },
        { key: 'cost_real', label: '치르는 대가', type: 'long' },
        { key: 'users', label: '쓸 수 있는 자', type: 'list' }
      ]
    }
  ]
};

const QUESTS: SheetSchema = {
  scope: 'quests',
  icon: '📜',
  title: '퀘스트 시트',
  subtitle: '의뢰 / 목표 / 보상',
  dataRoot: 'root',
  sections: [
    {
      id: 'basic',
      icon: '',
      title: '',
      cols: 4,
      fields: [
        {
          key: 'status', label: '진행 상태', type: 'select',
          options: [
            { value: 'not_started', label: '⚪ 시작 전' },
            { value: 'in_progress', label: '🔵 진행 중' },
            { value: 'completed', label: '🟢 완료' },
            { value: 'failed', label: '🔴 실패' }
          ]
        },
        { key: 'client', label: '의뢰인', type: 'text' },
        { key: 'location', label: '수행 장소', type: 'text' },
        { key: 'deadline', label: '기한', type: 'text' }
      ]
    },
    {
      id: 'goal',
      icon: '🎯',
      title: '목표',
      cols: 2,
      fields: [
        { key: 'goal', label: '목표 · 승리 조건', type: 'long', span: 2 },
        { key: 'steps', label: '단계', type: 'list', span: 2 }
      ]
    },
    {
      id: 'reward',
      icon: '💰',
      title: '보상',
      cols: 2,
      fields: [
        { key: 'reward_gold', label: '보상 (Gold)', type: 'number' },
        { key: 'reward_exp', label: '보상 (EXP)', type: 'number' },
        { key: 'reward_items', label: '보상 아이템', type: 'list', span: 2 }
      ]
    },
    {
      id: 'twist',
      icon: '🔥',
      title: '함정',
      cols: 2,
      accent: true,
      fields: [
        { key: 'twist', label: '의뢰인이 말하지 않은 것', type: 'long', span: 2 },
        { key: 'fail_cost', label: '실패하면 벌어지는 일', type: 'long', span: 2 }
      ]
    }
  ]
};

const STORYLINES: SheetSchema = {
  scope: 'storylines',
  icon: '📖',
  title: '스토리 라인 시트',
  subtitle: '전제 / 인물 / 갈등 / 결말',
  dataRoot: 'root',
  sections: [
    {
      id: 'basic',
      icon: '',
      title: '',
      cols: 4,
      fields: [
        {
          key: 'status', label: '상태', type: 'select',
          options: [
            { value: 'planning', label: '💭 구상 중' },
            { value: 'ongoing', label: '✍️ 진행 중' },
            { value: 'paused', label: '⏸️ 보류' },
            { value: 'done', label: '✅ 완결' }
          ]
        },
        { key: 'genre', label: '장르 · 분위기', type: 'text' },
        { key: 'period', label: '작중 시기', type: 'text' },
        { key: 'length', label: '분량 · 화수', type: 'text' }
      ]
    },
    {
      id: 'premise',
      icon: '🎬',
      title: '전제',
      cols: 1,
      fields: [
        { key: 'logline', label: '한 줄 요약 (로그라인)', type: 'long', placeholder: '누가, 무엇을 원해서, 무엇에 막히는가' }
      ]
    },
    {
      id: 'cast',
      icon: '👥',
      title: '인물',
      cols: 2,
      fields: [
        { key: 'protagonists', label: '주요 인물', type: 'list' },
        { key: 'stakes', label: '무엇이 걸려 있는가', type: 'long' }
      ]
    },
    {
      id: 'arc',
      icon: '🔥',
      title: '갈등 · 결말',
      cols: 2,
      accent: true,
      fields: [
        { key: 'conflict', label: '핵심 갈등', type: 'long', span: 2 },
        { key: 'turns', label: '전환점', type: 'list' },
        { key: 'ending', label: '🔒 예정된 결말', type: 'long' }
      ]
    }
  ]
};

export const SHEET_SCHEMAS: SheetSchema[] = [
  CHARACTERS,
  NATIONS,
  RACES,
  GROUPS,
  LOCATIONS,
  EVENTS,
  ITEMS,
  SKILLS,
  QUESTS,
  STORYLINES
];

export function schemaFor(scope: string | undefined): SheetSchema | null {
  if (!scope) return null;
  return SHEET_SCHEMAS.find((s) => s.scope === scope) ?? null;
}

// ── 점 표기 경로 읽기/쓰기 ──
export function getPath(root: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), root);
}

export function setPath(root: any, path: string, val: any): void {
  const keys = path.split('.');
  let cur = root;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof cur[keys[i]] !== 'object' || cur[keys[i]] === null) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = val;
}

/** 스키마에 있는 칸을 빈 값으로 미리 만들어 둔다 */
export function ensureShape(root: any, schema: SheetSchema): void {
  for (const sec of schema.sections) {
    for (const f of sec.fields) {
      const v = getPath(root, f.key);
      if (v === undefined) {
        if (f.type === 'list') setPath(root, f.key, []);
        else if (f.type === 'select') setPath(root, f.key, f.options?.[0]?.value ?? '');
        else setPath(root, f.key, '');
      }
    }
  }
}
