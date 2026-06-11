// src/lib/domain/session.ts (새 파일)
export type SessionLogType = 
  | 'combat_start'
  | 'combat_end'
  | 'damage'
  | 'heal'
  | 'dice'
  | 'item_get'
  | 'roleplay'
  | 'decision'
  | 'note';

export type SessionLog = {
  id: string;
  timestamp: string;
  type: SessionLogType;
  content: string;
  actor?: string;
  target?: string;
  value?: number;
  relatedDocs?: string[];
  relatedStoryline?: string;
};

export type GameSession = {
  id: string;
  worldId: string;
  title: string;
  storylineId?: string;
  date: string;
  logs: SessionLog[];
  combatants: any[];
  currentRound: number;
};