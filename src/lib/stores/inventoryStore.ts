// src/lib/stores/inventoryStore.ts
// 심리 검사지: 데이터 포맷 + 채점기 + 저장소
// IPIP(퍼블릭 도메인), ECR-R 같은 기존 검사지도 이 포맷으로 넣으면 같은 채점기로 돌아간다.
import { writable } from 'svelte/store';
import { saveStatus } from '$lib/stores/saveStatus';

const STORAGE_KEY = 'genesis.inventories';

export type Likert = 5 | 7;
export type Factor = { key: string; label: string };
// reverse: 역채점 문항 (높은 답이 낮은 점수를 뜻함)
export type InvItem = { text: string; factor: string; reverse?: boolean };
export type Inventory = {
  id: string;
  name: string;
  desc?: string;
  likert: Likert;
  labels?: string[];   // 답지 문구를 직접 고쳤을 때 (길이 = likert)
  done?: boolean;      // 작성 완료 체크
  factors: Factor[];
  items: InvItem[];
  builtin?: boolean; // 기본 제공 (삭제해도 다시 생김)
};
export type InvData = { inventories: Inventory[] };

// 답: 문항 index -> 1..likert, 또는 null(모르겠다)
export type Answers = Record<number, number | null>;

export function labelsOf(inv: Inventory): string[] {
  const def = LIKERT_LABELS[inv.likert];
  if (!inv.labels || inv.labels.length !== inv.likert) return def;
  return inv.labels.map((l, i) => (l?.trim() ? l : def[i]));
}

export const LIKERT_LABELS: Record<Likert, string[]> = {
  5: ['전혀 아니다', '아니다', '보통이다', '그렇다', '매우 그렇다'],
  7: ['전혀 아니다', '아니다', '조금 아니다', '보통이다', '조금 그렇다', '그렇다', '매우 그렇다']
};

function uid(p: string) {
  return `${p}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// ── 채점 ──
// 역채점을 뒤집고 요소별 평균 → 0~100 환산. 답 안 한 문항은 빼고 계산한다.
export function scoreInventory(inv: Inventory, answers: Answers) {
  const acc: Record<string, number[]> = {};
  for (const f of inv.factors) acc[f.key] = [];

  inv.items.forEach((it, i) => {
    const a = answers[i];
    if (a == null) return;
    if (!acc[it.factor]) acc[it.factor] = [];
    acc[it.factor].push(it.reverse ? inv.likert + 1 - a : a);
  });

  const results = inv.factors.map((f) => {
    const xs = acc[f.key] ?? [];
    const total = inv.items.filter((it) => it.factor === f.key).length;
    if (xs.length === 0) return { label: f.label, value: 50, answered: 0, total, empty: true };
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const value = Math.round(((mean - 1) / (inv.likert - 1)) * 100);
    return { label: f.label, value, answered: xs.length, total, empty: false };
  });

  const unknown = inv.items
    .map((it, i) => ({ it, i }))
    .filter(({ i }) => answers[i] === null)
    .map(({ it }) => it.text);

  return { results, unknown, answered: Object.values(answers).filter((v) => v != null).length };
}

// ── 기본 제공 (동작 확인용 샘플. 실제 검사지는 여기에 추가) ──
const SAMPLE: Inventory = {
  id: 'sample-10',
  name: '샘플 검사지 (10문항)',
  desc: '동작 확인용으로 넣어둔 짧은 예시입니다. 실제 심리 검사지가 아니에요.',
  likert: 5,
  builtin: true,
  factors: [
    { key: 'O', label: '개방성' },
    { key: 'C', label: '성실성' },
    { key: 'E', label: '외향성' },
    { key: 'A', label: '우호성' },
    { key: 'N', label: '신경성' }
  ],
  items: [
    { text: '이 인물은 낯선 것에 먼저 손을 뻗는다.', factor: 'O' },
    { text: '이 인물은 익숙한 방식을 좀처럼 바꾸지 않는다.', factor: 'O', reverse: true },
    { text: '이 인물은 한번 정한 일은 끝까지 해낸다.', factor: 'C' },
    { text: '이 인물은 약속 시간을 자주 어긴다.', factor: 'C', reverse: true },
    { text: '이 인물은 처음 보는 사람에게도 먼저 말을 건다.', factor: 'E' },
    { text: '이 인물은 사람이 많은 자리를 피한다.', factor: 'E', reverse: true },
    { text: '이 인물은 남의 사정을 먼저 헤아린다.', factor: 'A' },
    { text: '이 인물은 자기 뜻대로 안 되면 상대를 몰아붙인다.', factor: 'A', reverse: true },
    { text: '이 인물은 사소한 일에도 오래 마음을 쓴다.', factor: 'N' },
    { text: '이 인물은 위기에서도 평정을 잃지 않는다.', factor: 'N', reverse: true }
  ]
};

function load(): InvData {
  if (typeof window === 'undefined') return { inventories: [SAMPLE] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const list: Inventory[] = Array.isArray(parsed?.inventories) ? parsed.inventories : [];
    // 기본 제공은 항상 살려둔다
    if (!list.some((v) => v.id === SAMPLE.id)) list.unshift(SAMPLE);
    return { inventories: list };
  } catch (e) {
    console.error('[inventories] load 실패:', e);
    return { inventories: [SAMPLE] };
  }
}

function createStore() {
  const { subscribe, set, update } = writable<InvData>({ inventories: [SAMPLE] });

  // 자동저장: 변경 즉시 '저장 중…', 400ms 뒤 실제 기록 후 '저장됨'
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: InvData | null = null;

  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!pending || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
      saveStatus.markSaved();
    } catch (e) {
      console.error('[save] 실패:', e);
      saveStatus.markError();
    }
    pending = null;
  }

  function persist(d: InvData) {
    if (typeof window === 'undefined') return;
    pending = d;
    saveStatus.markDirty();
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 400);
  }

  return {
    subscribe,
    flush,
    load() { set(load()); },

    // 검사지 추가 (불러오기용)
    add(inv: Omit<Inventory, 'id'> & { id?: string }): string {
      const id = inv.id && inv.id.trim() ? inv.id : uid('inv');
      update((d) => {
        d.inventories = d.inventories.filter((v) => v.id !== id);
        d.inventories.push({ ...inv, id, builtin: false });
        persist(d); return d;
      });
      return id;
    },
    // 백업 복원용 — 같은 id는 덮어쓰고 새 것은 붙인다
    importData(incoming: Inventory[]) {
      update((d) => {
        for (const v of incoming ?? []) {
          if (!v?.id) continue;
          const idx = d.inventories.findIndex((x) => x.id === v.id);
          if (idx >= 0) d.inventories[idx] = v;
          else d.inventories.push(v);
        }
        persist(d); return d;
      });
      flush();
    },

    // 빈 검사지 만들기
    create(name: string): string {
      const id = uid('inv');
      update((d) => {
        d.inventories.push({ id, name: name.trim() || '새 검사지', likert: 5, factors: [], items: [], builtin: false });
        persist(d); return d;
      });
      return id;
    },
    // 기본 제공은 못 고치니 사본을 떠서 돌려준다
    duplicate(id: string): string {
      let newId = id;
      update((d) => {
        const src = d.inventories.find((v) => v.id === id);
        if (!src) return d;
        newId = uid('inv');
        d.inventories.push({
          ...src, id: newId, builtin: false, name: `${src.name} (내 사본)`,
          factors: src.factors.map((f) => ({ ...f })),
          items: src.items.map((i) => ({ ...i }))
        });
        persist(d); return d;
      });
      return newId;
    },
    remove(id: string) {
      update((d) => { d.inventories = d.inventories.filter((v) => v.id !== id || v.builtin); persist(d); return d; });
    },
    rename(id: string, name: string) {
      update((d) => { const v = d.inventories.find((x) => x.id === id); if (v) v.name = name.trim() || v.name; persist(d); return d; });
    },
    setLikert(id: string, likert: Likert) {
      update((d) => {
        const v = d.inventories.find((x) => x.id === id);
        if (v) { v.likert = likert; delete v.labels; }   // 단계 수가 바뀌면 답지는 기본값으로
        persist(d); return d;
      });
    },
    setLabel(id: string, index: number, text: string) {
      update((d) => {
        const v = d.inventories.find((x) => x.id === id);
        if (v) {
          const base = v.labels && v.labels.length === v.likert ? [...v.labels] : [...LIKERT_LABELS[v.likert]];
          base[index] = text;
          v.labels = base;
        }
        persist(d); return d;
      });
    },
    resetLabels(id: string) {
      update((d) => { const v = d.inventories.find((x) => x.id === id); if (v) delete v.labels; persist(d); return d; });
    },
    toggleDone(id: string) {
      update((d) => { const v = d.inventories.find((x) => x.id === id); if (v) v.done = v.done !== true; persist(d); return d; });
    },

    // ── 요소 (개방성, 성실성 …) ──
    addFactor(id: string, label: string) {
      update((d) => {
        const v = d.inventories.find((x) => x.id === id);
        const name = label.trim();
        if (v && name && !v.factors.some((f) => f.label === name)) {
          v.factors.push({ key: `f${Date.now().toString(36)}${v.factors.length}`, label: name });
        }
        persist(d); return d;
      });
    },
    renameFactor(id: string, key: string, label: string) {
      update((d) => { const f = d.inventories.find((x) => x.id === id)?.factors.find((x) => x.key === key); if (f) f.label = label.trim() || f.label; persist(d); return d; });
    },
    removeFactor(id: string, key: string) {
      update((d) => {
        const v = d.inventories.find((x) => x.id === id);
        if (v) { v.factors = v.factors.filter((f) => f.key !== key); v.items = v.items.filter((i) => i.factor !== key); }
        persist(d); return d;
      });
    },

    // ── 문항 ──
    addItem(id: string, factor: string) {
      update((d) => { const v = d.inventories.find((x) => x.id === id); if (v) v.items.push({ text: '', factor }); persist(d); return d; });
    },
    patchItem(id: string, index: number, patch: Partial<InvItem>) {
      update((d) => {
        const v = d.inventories.find((x) => x.id === id);
        if (v && v.items[index]) v.items[index] = { ...v.items[index], ...patch };
        persist(d); return d;
      });
    },
    removeItem(id: string, index: number) {
      update((d) => { const v = d.inventories.find((x) => x.id === id); if (v) v.items.splice(index, 1); persist(d); return d; });
    }
  };
}

export const inventoryStore = createStore();

// ── JSON 불러오기/내보내기 ──
// 최소 검증만 하고 넘긴다. 형식이 틀리면 이유를 문자열로 돌려준다.
export function parseInventory(json: string): { ok: true; inv: Omit<Inventory, 'id'> } | { ok: false; error: string } {
  let raw: any;
  try { raw = JSON.parse(json); } catch { return { ok: false, error: 'JSON 형식이 아니에요.' }; }
  if (!raw || typeof raw !== 'object') return { ok: false, error: '객체가 아니에요.' };
  if (typeof raw.name !== 'string' || !raw.name.trim()) return { ok: false, error: 'name(검사지 이름)이 없어요.' };
  if (raw.likert !== 5 && raw.likert !== 7) return { ok: false, error: 'likert는 5 또는 7이어야 해요.' };
  if (!Array.isArray(raw.factors) || raw.factors.length === 0) return { ok: false, error: 'factors(요소 목록)가 비었어요.' };
  if (!Array.isArray(raw.items) || raw.items.length === 0) return { ok: false, error: 'items(문항 목록)가 비었어요.' };

  const factors: Factor[] = [];
  for (const f of raw.factors) {
    if (typeof f?.key !== 'string' || typeof f?.label !== 'string') return { ok: false, error: 'factors는 { key, label } 형태여야 해요.' };
    factors.push({ key: f.key, label: f.label });
  }
  const keys = new Set(factors.map((f) => f.key));
  const items: InvItem[] = [];
  for (const [i, it] of raw.items.entries()) {
    if (typeof it?.text !== 'string' || typeof it?.factor !== 'string') return { ok: false, error: `${i + 1}번 문항이 { text, factor } 형태가 아니에요.` };
    if (!keys.has(it.factor)) return { ok: false, error: `${i + 1}번 문항의 factor "${it.factor}"가 factors에 없어요.` };
    items.push({ text: it.text, factor: it.factor, reverse: it.reverse === true });
  }
  return { ok: true, inv: { name: raw.name.trim(), desc: typeof raw.desc === 'string' ? raw.desc : undefined, likert: raw.likert, factors, items } };
}

// ── 아무 파일이나 읽어서 검사지로 ──
// JSON이면 그대로, 아니면 표/텍스트로 보고 줄마다 한 문항으로 읽는다.
// 줄 형식: 문항 | 요소 | 반대   (구분자는 탭, 쉼표, 세로줄 중 아무거나)
const REVERSE_WORDS = ['반대', '역', '역채점', 'reverse', 'r', 'true', 'y', 'yes', '1', 'o'];

function splitCells(line: string): string[] {
  const sep = line.includes('\t') ? '\t' : line.includes('|') ? '|' : ',';
  return line.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ''));
}

export function parseAnyInventory(
  text: string,
  fallbackName = '가져온 검사지'
): { ok: true; inv: Omit<Inventory, 'id'>; note: string } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: '파일이 비어 있어요.' };

  // 1) 우리 형식(JSON)
  if (trimmed.startsWith('{')) {
    const r = parseInventory(trimmed);
    return r.ok ? { ok: true, inv: r.inv, note: '검사지 형식으로 읽었어요.' } : r;
  }

  // 2) 표·텍스트
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { ok: false, error: '읽을 줄이 없어요.' };

  // 머리글 줄로 보이면 건너뛴다
  const first = splitCells(lines[0]).join(' ');
  const body = /문항|질문|내용|text|item|question/i.test(first) && lines.length > 1 ? lines.slice(1) : lines;

  const factorMap = new Map<string, string>();   // label -> key
  const items: InvItem[] = [];
  let seq = 0;

  for (const line of body) {
    const cells = splitCells(line);
    // 앞의 번호(1. / 1) / - )는 떼어낸다
    const raw = (cells[0] ?? '').replace(/^\s*[-*]?\s*\d+\s*[.)]?\s*/, '').trim();
    if (!raw) continue;

    const label = (cells[1] ?? '').trim() || '성격';
    if (!factorMap.has(label)) factorMap.set(label, `f${factorMap.size}${Date.now().toString(36)}`);

    const flag = (cells[2] ?? '').trim().toLowerCase();
    items.push({ text: raw, factor: factorMap.get(label)!, reverse: REVERSE_WORDS.includes(flag) });
    seq++;
  }

  if (items.length === 0) return { ok: false, error: '문항으로 읽을 수 있는 줄이 없어요.' };

  const factors: Factor[] = [...factorMap.entries()].map(([label, key]) => ({ key, label }));
  const note =
    factors.length === 1 && factors[0].label === '성격'
      ? `${seq}문항을 읽었어요. 요소 구분이 없어서 전부 "성격" 하나로 넣었어요 — 편집에서 나눠주세요.`
      : `${seq}문항 / 요소 ${factors.length}개를 읽었어요.`;

  return { ok: true, inv: { name: fallbackName, likert: 5, factors, items }, note };
}

export const IMPORT_HELP = `한 줄에 문항 하나씩 적은 파일이면 돼요.
요소와 반대 여부는 탭·쉼표·세로줄로 나눠 적으면 같이 읽어요.

  이 인물은 새로운 것을 먼저 시도한다 | 개방성
  이 인물은 변화를 꺼린다 | 개방성 | 반대
  이 인물은 맡은 일을 끝까지 해낸다 | 성실성

파일 형식은 txt, md, csv, tsv, json 다 돼요.`;

export const INVENTORY_TEMPLATE = `{
  "name": "검사지 이름",
  "desc": "설명 (선택)",
  "likert": 5,
  "factors": [
    { "key": "O", "label": "개방성" },
    { "key": "C", "label": "성실성" }
  ],
  "items": [
    { "text": "이 인물은 새로운 것을 먼저 시도한다.", "factor": "O" },
    { "text": "이 인물은 변화를 꺼린다.", "factor": "O", "reverse": true },
    { "text": "이 인물은 맡은 일을 끝까지 해낸다.", "factor": "C" }
  ]
}`;
