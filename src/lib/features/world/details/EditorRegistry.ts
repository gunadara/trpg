// src/lib/features/world/details/EditorRegistry.ts
import type { SvelteComponent } from 'svelte';

export type EditorProps = {
  worldId: string;
  categoryId: string;
  docId: string;
};

// Registry는 "컴포넌트를 로드한다"까지만 책임.
// Props 타입까지 강제하면 Svelte 타입 제네릭 때문에 TS가 자주 터짐.
type EditorModule = { default: typeof SvelteComponent };
type EditorLoader = () => Promise<EditorModule>;

// “플러그인 슬롯”: key → 에디터 로더
const EDITOR_LOADERS: Record<string, EditorLoader> = {
  characters: () =>
    import('$lib/features/world/details/characters/CharacterSheet.svelte') as unknown as Promise<EditorModule>,
  events: () =>
    import('$lib/features/world/details/events/EventEditor.svelte') as unknown as Promise<EditorModule>,

  // 공용(폴백)
  generic: () =>
    import('$lib/features/world/details/generic/GenericDocEditor.svelte') as unknown as Promise<EditorModule>,

  // 나중에 플러그인
  // monsterCodex: () => import('$lib/features/world/details/plugins/monsterCodex/Editor.svelte') as unknown as Promise<EditorModule>,
};

export async function loadEditor(editorKey: string | undefined) {
  const key = editorKey && EDITOR_LOADERS[editorKey] ? editorKey : 'generic';
  return EDITOR_LOADERS[key]();
}
