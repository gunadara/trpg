// 앱 자동 업데이트
// GitHub Pages에 올라간 웹 빌드를 확인해서, 새 버전이면 받아서 적용한다.
// - APK를 다시 뽑지 않아도 기능·UI 수정이 폰에 반영됨
// - 안드로이드 네이티브(Manifest·권한 등) 변경은 여전히 APK 재빌드 필요

import { Capacitor } from '@capacitor/core';

/** 웹 빌드가 올라가는 주소 (GitHub Pages) */
const BASE = 'https://gunadara.github.io/trpg';

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'downloading' }
  | { status: 'ready'; version: string }
  | { status: 'latest' }
  | { status: 'error'; message: string };

let updater: any = null;

async function getUpdater() {
  if (updater) return updater;
  try {
    const mod = await import('@capgo/capacitor-updater');
    updater = mod.CapacitorUpdater;
    return updater;
  } catch {
    return null;
  }
}

/** 현재 적용된 번들 버전 */
export async function currentVersion(): Promise<string> {
  const u = await getUpdater();
  if (!u) return 'web';
  try {
    const cur = await u.current();
    return cur?.bundle?.version ?? 'builtin';
  } catch {
    return 'builtin';
  }
}

/**
 * 새 버전이 있는지 확인하고, 있으면 받아서 다음 실행에 적용되게 한다.
 * @param apply true면 즉시 적용(앱 새로고침)
 */
export async function checkForUpdate(
  apply = false,
  onState?: (s: UpdateState) => void
): Promise<UpdateState> {
  const set = (s: UpdateState) => { onState?.(s); return s; };

  // 네이티브 앱이 아니면(브라우저) 업데이트가 필요 없음 — 새로고침이면 최신
  if (!Capacitor.isNativePlatform()) return set({ status: 'latest' });

  const u = await getUpdater();
  if (!u) return set({ status: 'error', message: '업데이터 플러그인이 없어요' });

  try {
    set({ status: 'checking' });

    // 1) 서버의 최신 버전 확인
    const res = await fetch(`${BASE}/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('버전 정보를 읽지 못했어요');
    const remote = await res.json() as { version: string };

    const cur = await currentVersion();
    if (cur === remote.version) return set({ status: 'latest' });

    // 2) 새 번들 내려받기
    set({ status: 'downloading' });
    const bundle = await u.download({
      url: `${BASE}/bundle.zip`,
      version: remote.version
    });

    // 3) 적용 (즉시 또는 다음 실행)
    if (apply) {
      await u.set(bundle);   // 즉시 전환 (앱이 새 번들로 리로드됨)
    } else {
      await u.next(bundle);  // 다음 실행 시 적용
    }
    return set({ status: 'ready', version: remote.version });
  } catch (e: any) {
    return set({ status: 'error', message: e?.message ?? '업데이트 실패' });
  }
}

/** 앱 시작 시 조용히 확인 (다음 실행에 적용) */
export async function autoCheckOnStart() {
  if (!Capacitor.isNativePlatform()) return;
  const u = await getUpdater();
  if (!u) return;
  try {
    // 이전에 받아둔 번들이 정상 부팅되었음을 알림 (롤백 방지)
    await u.notifyAppReady();
  } catch {}
  // 백그라운드로 확인만 (사용자 방해 없이)
  checkForUpdate(false).catch(() => {});
}
