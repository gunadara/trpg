// src/lib/stores/sessionStore.ts (새 파일)
import { writable, get } from 'svelte/store';
import type { GameSession, SessionLog } from '$lib/domain/session';

const STORAGE_KEY = 'genesis.current_session';

function createSessionStore() {
  const { subscribe, set, update } = writable<GameSession | null>(null);

  return {
    subscribe,
    
    start(worldId: string, title: string, storylineId?: string) {
      const session: GameSession = {
        id: `session-${Date.now()}`,
        worldId,
        title,
        storylineId,
        date: new Date().toISOString(),
        logs: [],
        combatants: [],
        currentRound: 0
      };
      set(session);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      }
    },

    addLog(log: Omit<SessionLog, 'id' | 'timestamp'>) {
      update(session => {
        if (!session) return null;
        const newLog: SessionLog = {
          ...log,
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString()
        };
        session.logs = [newLog, ...session.logs];
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        }
        return session;
      });
    },

    removeLog(id: string) {
      update(session => {
        if (!session) return null;
        session.logs = session.logs.filter(l => l.id !== id);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        }
        return session;
      });
    },

    load() {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          set(JSON.parse(raw));
        } catch (e) {
          console.error('세션 로드 실패:', e);
        }
      }
    },

    end() {
      const session = get({ subscribe });
      if (session) {
        update(s => {
          if (!s) return null;
          s.logs = [{
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'note',
            content: '세션 종료'
          }, ...s.logs];
          return s;
        });
      }
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      set(null);
    }
  };
}

export const currentSession = createSessionStore();