// src/lib/services/worldNav.ts
import type { CategoryId } from '$lib/domain/categories';
import type { WorldDoc } from '$lib/domain/docs';
import { goto } from '$app/navigation';

export const CATEGORY_ROUTE: Record<CategoryId, string> = {
  characters: '/world/characters',
  races: '/world/races',
  groups: '/world/groups',
  nations: '/world/nations',
  locations: '/world/locations',
  events: '/world/events',
  storylines: '/world/storylines'
};

export function gotoDoc(doc: WorldDoc) {
  const base = CATEGORY_ROUTE[doc.category];
  if (!base) {
    console.warn('unknown category', doc.category, doc);
    return;
  }

  const url = `${base}?id=${encodeURIComponent(doc.id)}`;
  goto(url);
}
