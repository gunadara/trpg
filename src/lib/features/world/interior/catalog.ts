// 가구 카탈로그
// 지금은 임시 벡터 글리프. 나중에 Kenney 등 에셋(PNG)으로 교체할 수 있게
// draw() 대신 image 경로를 넣는 방식도 지원한다.

export type CatalogItem = {
  kind: string;
  label: string;
  group: '침구' | '탁자' | '수납' | '주방' | '장식' | '설비';
  w: number;   // 기본 차지 칸
  h: number;
  /** 임시 벡터 그리기 (1칸=1 좌표계, 중심 0,0 기준) */
  draw: (w: number, h: number) => string;
  /** 에셋 이미지 경로 (있으면 draw 대신 사용) */
  image?: string;
};

const INK = '#3c4046';
const WOOD = '#c9a978';
const WOOD_D = '#a8875a';
const FABRIC = '#b8949a';
const STONE = '#c4bda8';
const METAL = '#9aa3ab';
const PLANT = '#8fa876';

/** 좌표는 칸 단위(0.5 = 반칸). 중심이 (0,0) */
const rect = (x: number, y: number, w: number, h: number, fill: string, sw = 0.04, rx = 0.03) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const line = (x1: number, y1: number, x2: number, y2: number, c = INK, sw = 0.025, op = 0.6) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${sw}" stroke-opacity="${op}"/>`;

export const CATALOG: CatalogItem[] = [
  {
    kind: 'bed_single', label: '침대(1인)', group: '침구', w: 1, h: 2,
    draw: (w, h) =>
      rect(-w / 2, -h / 2, w, h, FABRIC) +
      rect(-w / 2 + 0.06, -h / 2 + 0.06, w - 0.12, h * 0.24, '#efe9dd', 0.03) +
      line(-w / 2 + 0.08, h * 0.05, w / 2 - 0.08, h * 0.05) +
      line(-w / 2 + 0.08, h * 0.14, w / 2 - 0.08, h * 0.14, INK, 0.02, 0.35)
  },
  {
    kind: 'bed_double', label: '침대(2인)', group: '침구', w: 2, h: 2,
    draw: (w, h) =>
      rect(-w / 2, -h / 2, w, h, FABRIC) +
      rect(-w / 2 + 0.08, -h / 2 + 0.06, w / 2 - 0.14, h * 0.22, '#efe9dd', 0.03) +
      rect(0.06, -h / 2 + 0.06, w / 2 - 0.14, h * 0.22, '#efe9dd', 0.03) +
      line(-w / 2 + 0.08, h * 0.05, w / 2 - 0.08, h * 0.05)
  },
  {
    kind: 'table_rect', label: '탁자(사각)', group: '탁자', w: 2, h: 1,
    draw: (w, h) => {
      let g = rect(-w / 2, -h / 2, w, h, WOOD);
      for (let i = 1; i < 4; i++) g += line(-w / 2 + (w * i) / 4, -h / 2 + 0.06, -w / 2 + (w * i) / 4, h / 2 - 0.06, WOOD_D, 0.02, 0.55);
      return g;
    }
  },
  {
    kind: 'table_round', label: '탁자(원형)', group: '탁자', w: 1.5, h: 1.5,
    draw: (w) =>
      `<circle cx="0" cy="0" r="${w / 2}" fill="${WOOD}" stroke="${INK}" stroke-width="0.04"/>` +
      `<circle cx="0" cy="0" r="${w / 2 - 0.12}" fill="none" stroke="${WOOD_D}" stroke-width="0.025" stroke-opacity="0.6"/>`
  },
  {
    kind: 'chair', label: '의자', group: '탁자', w: 0.7, h: 0.7,
    draw: (w, h) => rect(-w / 2, -h / 2, w, h, WOOD, 0.035) + rect(-w / 2, -h / 2 - 0.1, w, 0.12, WOOD_D, 0.03)
  },
  {
    kind: 'bench', label: '벤치', group: '탁자', w: 2, h: 0.5,
    draw: (w, h) => rect(-w / 2, -h / 2, w, h, WOOD) + line(-w / 2 + 0.1, 0, w / 2 - 0.1, 0, WOOD_D, 0.02, 0.5)
  },
  {
    kind: 'shelf', label: '책장', group: '수납', w: 1.6, h: 0.5,
    draw: (w, h) => {
      let g = rect(-w / 2, -h / 2, w, h, WOOD_D);
      const n = 7;
      for (let i = 0; i < n; i++) {
        const bw = (w - 0.12) / n;
        g += rect(-w / 2 + 0.06 + i * bw, -h / 2 + 0.06, bw * 0.78, h - 0.12,
          ['#9c6b5a', '#6b7f9c', '#8a9c6b', '#9c8a6b'][i % 4], 0.02, 0.01);
      }
      return g;
    }
  },
  {
    kind: 'wardrobe', label: '장롱', group: '수납', w: 1.4, h: 0.6,
    draw: (w, h) => rect(-w / 2, -h / 2, w, h, WOOD) + line(0, -h / 2 + 0.05, 0, h / 2 - 0.05, INK, 0.03, 0.7)
  },
  {
    kind: 'chest', label: '궤짝', group: '수납', w: 0.9, h: 0.6,
    draw: (w, h) =>
      rect(-w / 2, -h / 2, w, h, WOOD_D) +
      line(-w / 2 + 0.05, 0, w / 2 - 0.05, 0, METAL, 0.04, 0.8) +
      `<rect x="-0.07" y="-0.06" width="0.14" height="0.12" fill="${METAL}" stroke="${INK}" stroke-width="0.02"/>`
  },
  {
    kind: 'hearth', label: '벽난로', group: '설비', w: 1.6, h: 0.7,
    draw: (w, h) =>
      rect(-w / 2, -h / 2, w, h, STONE, 0.045) +
      rect(-w * 0.28, -h / 2 + h * 0.28, w * 0.56, h * 0.6, '#3d3228', 0.03) +
      `<path d="M0,${h * 0.28} q-0.1,-0.18 0,-0.3 q0.1,0.12 0,0.3" fill="#d98b45"/>`
  },
  {
    kind: 'stove', label: '화덕', group: '주방', w: 1, h: 1,
    draw: (w) =>
      `<circle cx="0" cy="0" r="${w / 2}" fill="${STONE}" stroke="${INK}" stroke-width="0.04"/>` +
      `<circle cx="0" cy="0" r="${w / 2 - 0.14}" fill="#3d3228" stroke="${INK}" stroke-width="0.02"/>` +
      `<path d="M0,0.1 q-0.09,-0.16 0,-0.26 q0.09,0.1 0,0.26" fill="#d98b45"/>`
  },
  {
    kind: 'counter', label: '조리대', group: '주방', w: 2, h: 0.6,
    draw: (w, h) => rect(-w / 2, -h / 2, w, h, STONE) + line(-w / 2 + 0.08, -h / 2 + 0.12, w / 2 - 0.08, -h / 2 + 0.12, INK, 0.02, 0.35)
  },
  {
    kind: 'barrel', label: '통', group: '수납', w: 0.6, h: 0.6,
    draw: (w) =>
      `<circle cx="0" cy="0" r="${w / 2}" fill="${WOOD}" stroke="${INK}" stroke-width="0.04"/>` +
      `<circle cx="0" cy="0" r="${w / 2 - 0.08}" fill="none" stroke="${WOOD_D}" stroke-width="0.03"/>`
  },
  {
    kind: 'rug', label: '카펫', group: '장식', w: 2.5, h: 1.8,
    draw: (w, h) =>
      rect(-w / 2, -h / 2, w, h, '#a88b9c', 0.035, 0.05) +
      `<rect x="${-w / 2 + 0.14}" y="${-h / 2 + 0.14}" width="${w - 0.28}" height="${h - 0.28}" rx="0.03" fill="none" stroke="${INK}" stroke-width="0.025" stroke-opacity="0.55" stroke-dasharray="0.1 0.07"/>`
  },
  {
    kind: 'plant', label: '화분', group: '장식', w: 0.6, h: 0.6,
    draw: (w) =>
      `<circle cx="0" cy="0" r="${w / 2}" fill="${PLANT}" stroke="${INK}" stroke-width="0.035"/>` +
      `<circle cx="${-w * 0.16}" cy="${-w * 0.14}" r="${w * 0.2}" fill="${PLANT}" stroke="${INK}" stroke-width="0.025"/>` +
      `<circle cx="${w * 0.18}" cy="${-w * 0.05}" r="${w * 0.18}" fill="${PLANT}" stroke="${INK}" stroke-width="0.025"/>`
  },
  {
    kind: 'desk', label: '책상', group: '탁자', w: 1.6, h: 0.8,
    draw: (w, h) =>
      rect(-w / 2, -h / 2, w, h, WOOD) +
      rect(-w / 2 + 0.08, -h / 2 + 0.08, w * 0.3, h - 0.16, WOOD_D, 0.025) +
      `<rect x="${w * 0.06}" y="${-h * 0.18}" width="${w * 0.3}" height="${h * 0.36}" fill="#efe9dd" stroke="${INK}" stroke-width="0.02"/>`
  }
];

export const CATALOG_GROUPS = ['침구', '탁자', '수납', '주방', '장식', '설비'] as const;

export function catalogItem(kind: string): CatalogItem | undefined {
  return CATALOG.find((c) => c.kind === kind);
}
