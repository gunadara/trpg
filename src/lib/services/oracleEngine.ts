// src/lib/services/oracleEngine.ts
// 오라클 판정 로직 — Oracle.svelte와 PlayJournal 양쪽에서 공유
import { get } from 'svelte/store';
import { oracleTables } from '$lib/stores/oracleTables';
import { listDocs, listAllDocs } from '$lib/stores/docStore';
import type { WorldDoc } from '$lib/domain/docs';

export function d(n: number) { return Math.floor(Math.random() * n) + 1; }
export function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export const LIKELIHOODS = [
  { label: '거의 확실함', p: 90 },
  { label: '가능성 높음', p: 75 },
  { label: '반반', p: 50 },
  { label: '가능성 낮음', p: 25 },
  { label: '희박함', p: 10 }
];

export type YesNoResult = { text: string; roll: number; twist: boolean; likelihood: string };

export function askYesNo(likelihoodLabel: string): YesNoResult {
  const lk = LIKELIHOODS.find((l) => l.label === likelihoodLabel) ?? LIKELIHOODS[2];
  const roll = d(100);
  const yesZone = lk.p;
  let text: string;
  if (roll <= yesZone) {
    if (roll <= yesZone * 0.2) text = '예, 그리고…';
    else if (roll > yesZone * 0.8) text = '예, 하지만…';
    else text = '예';
  } else {
    const noSize = 100 - yesZone;
    const inNo = roll - yesZone;
    if (inNo <= noSize * 0.2) text = '아니오, 하지만…';
    else if (inNo > noSize * 0.8) text = '아니오, 그리고…';
    else text = '아니오';
  }
  return { text, roll, twist: roll % 11 === 0, likelihood: lk.label };
}

export type SceneResult = { location: WorldDoc | null; character: WorldDoc | null; mood: string };

export function rollScene(): SceneResult {
  const t = get(oracleTables);
  const locs = listDocs('locations');
  const chars = listDocs('characters');
  return {
    location: locs.length ? pick(locs) : null,
    character: chars.length ? pick(chars) : null,
    mood: pick(t.moods)
  };
}

export type EventResult = { focus: string; subject: WorldDoc | null; verb: string; noun: string };

export function rollEvent(): EventResult {
  const t = get(oracleTables);
  const all = listAllDocs();
  return {
    focus: pick(t.eventFocus),
    subject: all.length ? pick(all) : null,
    verb: pick(t.sparkVerbs),
    noun: pick(t.sparkNouns)
  };
}

// 저널 카드용 요약 문자열
export function sceneToText(s: SceneResult): string {
  return `${s.mood} 「${s.location?.title ?? '미지의 장소'}」에서 ${s.character?.title ?? '낯선 인물'}와(과) 마주친다`;
}
export function eventToText(e: EventResult): string {
  return `${e.focus} — 관련: 「${e.subject?.title ?? '???'}」 · 단서: ${e.verb} / ${e.noun}`;
}
