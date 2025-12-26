import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES 모듈에서 __dirname 사용하기 위한 세팅
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------
// 🏗️ GENESIS Phase 2 폴더 및 파일 구조 정의
// ---------------------------------------------------------

const baseDir = path.join(__dirname, 'src', 'lib');

const structure = [
    // 1. 도메인 (설계도) 영역
    { type: 'dir', path: 'domain/details' },
    { type: 'file', path: 'domain/details/characterSchema.ts', content: '// 인물 데이터 타입 정의\nexport type CharacterFields = {};' },
    { type: 'file', path: 'domain/details/itemSchema.ts', content: '// 아이템 데이터 타입 정의\nexport type ItemFields = {};' },
    { type: 'file', path: 'domain/details/skillSchema.ts', content: '// 스킬 데이터 타입 정의\nexport type SkillFields = {};' },
    { type: 'file', path: 'domain/details/questSchema.ts', content: '// 퀘스트 데이터 타입 정의\nexport type QuestFields = {};' },
    // 나머지 6개 빈 스키마 파일
    { type: 'file', path: 'domain/details/raceSchema.ts', content: 'export type RaceFields = {};' },
    { type: 'file', path: 'domain/details/groupSchema.ts', content: 'export type GroupFields = {};' },
    { type: 'file', path: 'domain/details/nationSchema.ts', content: 'export type NationFields = {};' },
    { type: 'file', path: 'domain/details/locationSchema.ts', content: 'export type LocationFields = {};' },
    { type: 'file', path: 'domain/details/eventSchema.ts', content: 'export type EventFields = {};' },
    { type: 'file', path: 'domain/details/storylineSchema.ts', content: 'export type StorylineFields = {};' },

    // 2. 기능 (UI/로직) 영역 - 메인 폴더
    { type: 'dir', path: 'features/world/details' },
    
    // 3. 핵심 4대장 폴더 및 파일
    { type: 'dir', path: 'features/world/details/characters' },
    { type: 'file', path: 'features/world/details/characters/CharacterSheet.svelte', content: '<!-- 인물 스탯 시트 UI -->' },
    
    { type: 'dir', path: 'features/world/details/items' },
    { type: 'file', path: 'features/world/details/items/ItemEditor.svelte', content: '<!-- 아이템 편집 UI -->' },
    
    { type: 'dir', path: 'features/world/details/skills' },
    { type: 'file', path: 'features/world/details/skills/SkillEditor.svelte', content: '<!-- 스킬 편집 UI -->' },
    
    { type: 'dir', path: 'features/world/details/quests' },
    { type: 'file', path: 'features/world/details/quests/QuestEditor.svelte', content: '<!-- 퀘스트 편집 UI -->' },

    // 4. 나머지 6개 폴더 (빈 폴더)
    { type: 'dir', path: 'features/world/details/races' },
    { type: 'dir', path: 'features/world/details/groups' },
    { type: 'dir', path: 'features/world/details/nations' },
    { type: 'dir', path: 'features/world/details/locations' },
    { type: 'dir', path: 'features/world/details/events' },
    { type: 'dir', path: 'features/world/details/storylines' },

    // 5. 핵심 스위처 파일
    { type: 'file', path: 'features/world/details/DetailSwitcher.svelte', content: '<!-- 카테고리별 UI 스위처 -->' },
];

// ---------------------------------------------------------
// 🚀 실행 로직
// ---------------------------------------------------------

console.log('🚀 GENESIS Phase 2 폴더 구조 생성을 시작합니다...');

structure.forEach(item => {
    const fullPath = path.join(baseDir, item.path);
    
    if (item.type === 'dir') {
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`✅ 폴더 생성: ${item.path}`);
        } else {
            console.log(`PASS (이미 있음): ${item.path}`);
        }
    } else if (item.type === 'file') {
        if (!fs.existsSync(fullPath)) {
            // 상위 폴더가 없으면 만듦
            const dirname = path.dirname(fullPath);
            if (!fs.existsSync(dirname)) {
                fs.mkdirSync(dirname, { recursive: true });
            }
            fs.writeFileSync(fullPath, item.content);
            console.log(`📄 파일 생성: ${item.path}`);
        } else {
            console.log(`PASS (이미 있음): ${item.path}`);
        }
    }
});

console.log('\n🎉 모든 구조가 성공적으로 생성되었습니다!');
console.log('이제 setup_phase2.js 파일은 삭제하셔도 됩니다.');