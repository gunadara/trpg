// src/lib/services/gamebookFormat.ts
// 게임북 텍스트 형식 ↔ 데이터 변환 (가져오기/내보내기)
import type { Gamebook, Scene, Choice } from '$lib/stores/gamebookStore';

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export type ParseResult = {
  scenes: Scene[];
  startTitle: string | null;
  warnings: string[];
};

// 텍스트 → 장면 배열 (선택지 target은 '제목'으로 매칭 후 id로 변환)
export function parseGamebookText(text: string): ParseResult {
  const lines = text.split('\n');
  const warnings: string[] = [];

  type Raw = { title: string; body: string[]; gm: string[]; choices: { text: string; targetTitle: string }[] };
  const raws: Raw[] = [];
  let cur: Raw | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    const h = line.match(/^#\s+(.+)$/);
    const choice = line.match(/^-\s+(.+?)\s*->\s*(.+)$/);
    const gm = line.match(/^>\s*GM:\s*(.+)$/i);

    if (h) {
      cur = { title: h[1].trim(), body: [], gm: [], choices: [] };
      raws.push(cur);
    } else if (!cur) {
      // 첫 # 이전 줄은 무시
    } else if (choice) {
      cur.choices.push({ text: choice[1].trim(), targetTitle: choice[2].trim() });
    } else if (gm) {
      cur.gm.push(gm[1].trim());
    } else {
      cur.body.push(line); // 빈 줄도 본문 줄바꿈으로 유지
    }
  }

  // 제목 → 새 id 매핑
  const titleToId = new Map<string, string>();
  for (const r of raws) {
    if (titleToId.has(r.title)) {
      warnings.push(`중복된 장면 제목: "${r.title}" — 연결이 꼬일 수 있어요.`);
    }
    titleToId.set(r.title, uid('scene'));
  }

  const scenes: Scene[] = raws.map((r) => {
    const choices: Choice[] = r.choices.map((c) => {
      const target = titleToId.get(c.targetTitle) ?? null;
      if (!target) warnings.push(`"${r.title}" 의 선택지 → "${c.targetTitle}" 장면을 찾지 못했어요.`);
      return { id: uid('ch'), text: c.text, target };
    });
    // 앞뒤 빈 줄 정리
    const body = r.body.join('\n').replace(/^\n+|\n+$/g, '');
    return {
      id: titleToId.get(r.title)!,
      title: r.title,
      body,
      choices,
      gmNotes: r.gm.length ? r.gm.join('\n') : undefined
    };
  });

  return { scenes, startTitle: raws[0]?.title ?? null, warnings };
}

// 게임북 → 텍스트 (내보내기). 멘션 토큰 @[제목](id)는 @제목 으로 단순화
export function gamebookToText(book: Gamebook): string {
  const idToTitle = new Map(book.scenes.map((s) => [s.id, s.title]));
  const out: string[] = [];

  // 시작 장면을 맨 앞으로
  const ordered = [...book.scenes];
  if (book.startSceneId) {
    const i = ordered.findIndex((s) => s.id === book.startSceneId);
    if (i > 0) { const [s] = ordered.splice(i, 1); ordered.unshift(s); }
  }

  for (const s of ordered) {
    out.push(`# ${s.title}`);
    const body = s.body.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1'); // 멘션 단순화
    if (body.trim()) out.push(body);
    if (s.gmNotes) {
      for (const line of s.gmNotes.split('\n')) out.push(`> GM: ${line}`);
    }
    for (const c of s.choices) {
      const t = c.target ? (idToTitle.get(c.target) ?? '???') : '(연결안됨)';
      out.push(`- ${c.text} -> ${t}`);
    }
    out.push(''); // 장면 사이 빈 줄
  }
  return out.join('\n').trim() + '\n';
}

// ── 앱 내장 가이드/예시/프롬프트 ──

export const FORMAT_GUIDE = `# 제목      → 새 장면 시작
(그냥 줄)   → 장면 본문 (플레이어가 읽는 글)
- 선택지 -> 가는장면제목   → 선택지 + 연결
@이름      → 세계관 문서 연결 (멘션)
> GM: 메모  → GM 전용 메모 (플레이어에겐 안 보임)
![삽화](설명) → 삽화 자리 표시

· 선택지의 "-> 제목"은 다른 # 제목과 글자가 정확히 같아야 연결돼요.
· 선택지 없는 장면 = 엔딩.
· 맨 처음 # 장면이 시작 장면.
· 화살표는 -> (붙임표+부등호), → 같은 특수문자 말고요.`;

export const EXAMPLE_TEXT = `# 폐서점 앞
비가 그친 골목 끝, 너는 먼지 낀 유리문 앞에 섰다.
간판은 떨어져 나갔고, 문 너머로 희미한 불빛이 흔들린다.
![삽화](비 내린 골목의 낡은 서점 외관)
> GM: 안을 들여다보면 @파밀 의 그림자가 보이지만, 플레이어는 아직 정체를 모른다.

- 문을 연다 -> 서점 안
- 창문으로 돌아 들어간다 -> 뒷골목
- 그냥 돌아간다 -> 귀가

# 서점 안
오래된 종이 냄새 사이로, 낮은 그르렁 소리가 들린다.
어둠 속에서 @파밀 의 눈이 빛난다.
> GM: 큰 소리를 내면 파밀이 경계한다.

- 천천히 다가간다 -> 대치
- 도망친다 -> 뒷골목

# 뒷골목
젖은 벽돌 벽 사이로 찬 바람이 분다. 막다른 길이다.

- 벽을 넘는다 -> 귀가
- 돌아서서 맞선다 -> 대치

# 대치
숨을 고를 새도 없이, 그것과 정면으로 마주 섰다.
> GM: 이 장면은 전투 대시보드로 넘어가는 지점.

# 귀가
너는 무사히 골목을 빠져나왔다. 오늘 밤의 일은… 아직 끝나지 않은 듯하다.`;

export const GPT_PROMPT = `아래 형식 규칙대로 분기형 게임북을 만들어줘.

[형식]
- "# 제목" 은 새 장면, 그냥 줄은 본문
- "- 선택지 -> 장면제목" 은 선택지 + 연결 (화살표는 반드시 -> )
- "@이름" 은 등장인물/장소 표시
- 플레이어가 몰라야 할 정보는 "> GM:" 줄로
- 삽화가 들어가면 좋을 곳은 "![삽화](설명)" 으로
- 선택지의 "-> 장면제목" 은 반드시 실제 "# 장면제목" 과 똑같이
- 맨 처음 "#" 장면이 시작 장면, 선택지 없는 장면은 엔딩

[주제]
(여기에 원하는 내용 — 예: 폐서점에서 괴물 개와 마주치는 호러 단편, 장면 6~8개, 엔딩 2개)

[등장]
(여기에 인물/장소 — 예: 소시민, 파밀, 안개 숲)`;
