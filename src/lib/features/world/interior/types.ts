// 실내 에디터 데이터 구조
// 1차는 단층 + room/yard만 쓰지만, 구조는 처음부터 다층·다양한 건물을 담을 수 있게 잡는다.

export type BuildingKind =
  | 'house' | 'shop' | 'inn' | 'library' | 'temple' | 'smithy'
  | 'ship' | 'apartment' | 'hanok' | 'custom';

export type AreaKind = 'room' | 'yard' | 'deck' | 'water';

export type FloorKind =
  | 'wood' | 'stone' | 'dirt' | 'tatami' | 'ondol'
  | 'carpet' | 'grass' | 'water' | 'sand';

export type Area = {
  id: string;
  x: number; y: number; w: number; h: number; // 칸 단위
  kind: AreaKind;
  floor: FloorKind;
  name?: string;
};

export type Opening = {
  id: string;
  areaId: string;
  side: 'N' | 'E' | 'S' | 'W';
  t: number;          // 변 위의 위치 0~1
  kind: 'door' | 'window' | 'arch';
  w: number;          // 폭(칸)
};

/** 사용자가 직접 세우는 담·울타리·난간 (마당 등에 사용) */
export type Wall = {
  id: string;
  x1: number; y1: number; x2: number; y2: number;
  kind: 'fence' | 'stonewall' | 'hedge' | 'rail';
};

export type Stair = {
  id: string;
  x: number; y: number; w: number; h: number; rot: number;
  kind: 'stair' | 'ladder' | 'ramp';
  toLevel: number;
};

export type Furniture = {
  id: string;
  kind: string;       // 카탈로그 키
  x: number; y: number;   // 중심(칸)
  w: number; h: number;   // 차지 칸 수
  rot: number;        // 자유 회전 0~359
  z?: number;
  label?: string;
};

export type Level = {
  index: number;      // 지하 -1, 1층 0 …
  name?: string;
  areas: Area[];
  openings: Opening[];
  walls: Wall[];        // 직접 세운 담·울타리
  stairs: Stair[];
  furniture: Furniture[];
};

export type Building = {
  id: string;
  name: string;
  kind: BuildingKind;
  levels: Level[];
};

export type InteriorFile = {
  format: 'genesis-interior';
  version: 1;
  building: Building;
  cellPx: number;
  customAssets?: { kind: string; dataUrl: string }[];
};

/* ── 기본값 ── */
export function emptyLevel(index = 0, name = '1층'): Level {
  return { index, name, areas: [], openings: [], walls: [], stairs: [], furniture: [] };
}

export function emptyBuilding(name = '새 건물', kind: BuildingKind = 'house'): Building {
  return { id: `b_${Date.now()}`, name, kind, levels: [emptyLevel()] };
}

export const FLOOR_STYLE: Record<FloorKind, {
  fill: string; label: string;
  pattern: 'plank' | 'brick' | 'tatami' | 'ondol' | 'speck' | 'weave' | 'wave' | 'blade' | 'none';
  ink: string;   // 무늬 색
}> = {
  wood:   { fill: '#d6a86a', label: '마루',   pattern: 'plank',  ink: '#9a6f3c' },
  stone:  { fill: '#b9b7b1', label: '돌바닥', pattern: 'brick',  ink: '#7e7c76' },
  dirt:   { fill: '#c8ab84', label: '흙바닥', pattern: 'speck',  ink: '#8d7250' },
  tatami: { fill: '#d7d093', label: '다다미', pattern: 'tatami', ink: '#8e8a4e' },
  ondol:  { fill: '#e8c98a', label: '온돌',   pattern: 'ondol',  ink: '#b08a4a' },
  carpet: { fill: '#b07f8c', label: '카펫',   pattern: 'weave',  ink: '#7d5460' },
  grass:  { fill: '#9cc06d', label: '잔디',   pattern: 'blade',  ink: '#5f8341' },
  water:  { fill: '#7db0d4', label: '물',     pattern: 'wave',   ink: '#4a7fa6' },
  sand:   { fill: '#e5cf95', label: '모래',   pattern: 'speck',  ink: '#b39a5c' }
};

// 실내만 벽이 자동으로 선다. 마당·툇마루는 뻥 뚫린 채로 두고,
// 담·울타리는 사용자가 '🧱 담' 도구로 직접 세운다.
export const AREA_META: Record<AreaKind, { label: string; defaultFloor: FloorKind; edge: 'wall' | 'none' }> = {
  room:  { label: '실내',   defaultFloor: 'wood',  edge: 'wall' },
  yard:  { label: '마당',   defaultFloor: 'dirt',  edge: 'none' },
  deck:  { label: '툇마루', defaultFloor: 'wood',  edge: 'none' },
  water: { label: '물',     defaultFloor: 'water', edge: 'none' }
};

export const WALL_STYLE: Record<Wall['kind'], { label: string; color: string; width: number; dash?: string }> = {
  fence:     { label: '울타리', color: '#8a7a5c', width: 3.5, dash: '6 4' },
  stonewall: { label: '돌담',   color: '#8d8b84', width: 6 },
  hedge:     { label: '생울타리', color: '#6f9159', width: 7 },
  rail:      { label: '난간',   color: '#9aa3ab', width: 2.5 }
};
