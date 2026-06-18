import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';
const KEY = 'genesis-theme';

function initial(): Theme {
  if (!browser) return 'light';
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  // 저장된 선택이 없으면 OS 설정을 따름
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const theme = writable<Theme>(initial());

function apply(t: Theme) {
  if (!browser) return;
  document.documentElement.classList.toggle('dark', t === 'dark');
  localStorage.setItem(KEY, t);
}

// 값이 바뀔 때마다 html 클래스 + localStorage 반영 (초기값도 즉시 적용됨)
if (browser) theme.subscribe(apply);

export function toggleTheme() {
  theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
}

export function setTheme(t: Theme) {
  theme.set(t);
}
