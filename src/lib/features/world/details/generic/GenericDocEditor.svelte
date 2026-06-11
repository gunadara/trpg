<!-- src/lib/features/world/details/generic/GenericDocEditor.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  import DocEditLayout from '$lib/components/edit/DocEditLayout.svelte';

  import TemplateSectionCard from '$lib/components/templates/TemplateSectionCard.svelte';
  import FieldRow from '$lib/components/templates/FieldRow.svelte';
  import FieldInput from '$lib/components/templates/FieldInput.svelte';

  import type { TemplateDef, TemplateValues } from '$lib/domain/templates';
  import { getBaseTemplate } from '$lib/stores/templateStore';

  // ✅ docStore 쪽에 없으면 추가해야 함
  import { getDocById, patchDoc } from '$lib/stores/docStore';
  import type { WorldDoc } from '$lib/domain/docs';

  export let worldId: string;
  export let categoryId: string;
  export let docId: string;

  let doc: WorldDoc | null = null;
  let template: TemplateDef | null = null;

  // draft: 템플릿 필드 값들
  let values: TemplateValues = {};
  let titleDraft = '';
  let summaryDraft = '';
  let contentDraft = '';
  let dirty = false;

  // 섹션 접힘 상태
  let collapsed: Record<string, boolean> = {};

  function toggleSection(id: string) {
    collapsed = { ...collapsed, [id]: !collapsed[id] };
  }

  function markDirty() {
    dirty = true;
  }

  function onFieldChange(e: CustomEvent<{ key: string; value: any }>) {
    values = { ...values, [e.detail.key]: e.detail.value };
    markDirty();
  }

  function load() {
    const d = getDocById(docId);
    doc = d ?? null;
    template = getBaseTemplate(categoryId);

    // 문서 구조 가정:
    // - doc.title: string
    // - doc.details: Record<string, any> (없으면 {})
    titleDraft = doc?.title ?? '';
    summaryDraft = doc?.summary ?? '';
    contentDraft = doc?.content ?? '';
    values = { ...(doc?.attributes ?? {}) };

    // 섹션 기본 접힘값
    const nextCollapsed: Record<string, boolean> = {};
    for (const s of template.sections) {
      nextCollapsed[s.id] = Boolean(s.collapsedByDefault);
    }
    collapsed = nextCollapsed;

    dirty = false;
  }

  async function save() {
    if (!doc) return;

    try {
      const updated = patchDoc(doc.id, {
        title: titleDraft.trim() || doc.title,
        summary: summaryDraft,
        content: contentDraft,
        attributes: values
      });
      if (!updated) throw new Error('patchDoc returned null');
 

      dirty = false;
    } catch (e) {
      console.error('[GenericDocEditor] save failed', e);
      alert('저장에 실패했습니다.');
    }
  }

  function onBack() {
    // 공용 라우트(나중에): /world/docs/[categoryId]
    // 지금은 안전하게 world로 보내도 OK
    goto(`/world`);
  }

  onMount(load);
</script>

{#if !doc || !template}
  <div class="text-sm text-slate-500 dark:text-slate-400">불러오는 중...</div>
{:else}
  <DocEditLayout
    icon="🧩"
    title={titleDraft || '제목 없음'}
    subtitle={`카테고리: ${categoryId}`}
    onBack={onBack}
    primaryText="저장"
    primaryDisabled={!dirty}
    onPrimary={save}
    saveMessage={dirty ? '변경사항이 있습니다. 저장 버튼을 눌러 반영하세요.' : '저장됨'}
  >
    <div class="flex flex-col gap-4">
      <!-- 제목 -->
      <FieldRow label="제목" required={true}>
        <input
          class="input-box"
          value={titleDraft}
          placeholder="제목"
          on:input={(e) => { titleDraft = (e.target as HTMLInputElement).value; markDirty(); }}
        />
      </FieldRow>


      <!-- 요약 -->
      <FieldRow label="요약">
        <textarea
          class="input-box min-h-[70px]"
          value={summaryDraft}
          placeholder="요약"
          on:input={(e) => { summaryDraft = (e.target as HTMLTextAreaElement).value; markDirty(); }}
        />
      </FieldRow>

      <!-- 본문 -->
      <FieldRow label="본문">
       <textarea
         class="input-box min-h-[140px]"
          value={contentDraft}
          placeholder="본문"
          on:input={(e) => { contentDraft = (e.target as HTMLTextAreaElement).value; markDirty(); }}
        />
      </FieldRow>
 

      {#each template.sections as section (section.id)}
        <TemplateSectionCard
          title={section.title}
          collapsed={collapsed[section.id]}
          onToggle={() => toggleSection(section.id)}
        >
          {#each section.fields as field (field.key)}
            <!-- private 처리(나중 확장): 지금은 표시만 -->
            <FieldRow
              label={field.visibility === 'private' ? `${field.label} (비공개)` : field.label}
              required={Boolean(field.required)}
            >
              <FieldInput
                {field}
                value={values[field.key]}
                on:change={onFieldChange}
              />
            </FieldRow>
          {/each}
        </TemplateSectionCard>
      {/each}
    </div>
  </DocEditLayout>
{/if}

<style>
    @reference "tailwindcss";
  .input-box { @apply w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 transition; }
</style>
