import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const VERSION_URL = 'https://app.myteslamate.com/api/mobile/min-version';

export type UpdateStatus = 'idle' | 'up-to-date' | 'outdated';

export interface AppUpdateCheckResult {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
}

function parseVersion(v: string): number[] {
  return v
    .replace(/^v/, '')
    .split('.')
    .map(part => parseInt(part, 10))
    .map(n => (Number.isFinite(n) ? n : 0));
}

function isOutdated(current: string, latest: string): boolean {
  const a = parseVersion(current);
  const b = parseVersion(latest);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    if (ai < bi) return true;
    if (ai > bi) return false;
  }
  return false;
}

export function useAppUpdateCheck(): AppUpdateCheckResult {
  const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<UpdateStatus>('idle');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Any failure here is silently ignored: status stays 'idle', the gate
      // does not block. We only force-update on an explicit successful
      // response that contains a valid `min_version`.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) return;
        const body = await res.json();
        const remote =
          typeof body?.min_version === 'string' ? body.min_version : null;
        if (!remote || cancelled) return;
        setLatestVersion(remote);
        setStatus(
          isOutdated(currentVersion, remote) ? 'outdated' : 'up-to-date'
        );
      } catch {
        // Offline / timeout / parse error — don't block the user.
      } finally {
        clearTimeout(timeout);
      }
    };

    check();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [currentVersion]);

  return { status, currentVersion, latestVersion };
}
