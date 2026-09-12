// src/lib/domain/psych.ts
// 심리 수치를 인물 문서(WorldDoc.attributes.psych)에 붙인다. 별도 저장소를 두지 않는다.
import type { WorldDoc } from '$lib/domain/docs';
import { patchDoc } from '$lib/stores/docStore';

export type PsychItem = { label: string; value: number };
export type PsychSet = {
  key: string;        // 세트 구분 (예: "BIG5", "에니어그램")
  source: string;     // 어디서 나왔는지 (예: "검사 · IPIP-50")
  min: number;
  max: number;
  step: number;
  items: PsychItem[];
  note?: string;
  updatedAt: number;
};

export function getPsych(doc: WorldDoc | null): PsychSet[] {
  const raw = (doc?.attributes as any)?.psych;
  return Array.isArray(raw) ? (raw as PsychSet[]) : [];
}

function write(doc: WorldDoc, sets: PsychSet[]) {
  patchDoc(doc.id, { attributes: { ...(doc.attributes ?? {}), psych: sets } });
}

// 같은 key가 있으면 갈아끼우고, 없으면 추가
export function upsertPsych(doc: WorldDoc, set: Omit<PsychSet, 'updatedAt'>) {
  const sets = getPsych(doc).filter((s) => s.key !== set.key);
  sets.unshift({ ...set, updatedAt: Date.now() });
  write(doc, sets);
}

export function setPsychValue(doc: WorldDoc, key: string, label: string, value: number) {
  const sets = getPsych(doc);
  const s = sets.find((x) => x.key === key);
  const it = s?.items.find((x) => x.label === label);
  if (!s || !it) return;
  it.value = Math.max(s.min, Math.min(s.max, Math.round(value)));
  s.updatedAt = Date.now();
  write(doc, sets);
}

export function setPsychNote(doc: WorldDoc, key: string, note: string) {
  const sets = getPsych(doc);
  const s = sets.find((x) => x.key === key);
  if (!s) return;
  s.note = note;
  s.updatedAt = Date.now();
  write(doc, sets);
}

export function removePsych(doc: WorldDoc, key: string) {
  write(doc, getPsych(doc).filter((s) => s.key !== key));
}
