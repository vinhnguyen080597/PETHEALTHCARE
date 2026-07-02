type DebugLogPayload = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

function isDebugFlagEnabled(raw: string | undefined): boolean {
  return /^(1|true|yes)$/i.test(String(raw ?? '').trim());
}

export const STARTUP_DEBUG_ENABLED =
  IS_DEV || isDebugFlagEnabled(process.env.EXPO_PUBLIC_STARTUP_DEBUG);

export const CORE_CARE_DEBUG_ENABLED =
  IS_DEV || isDebugFlagEnabled(process.env.EXPO_PUBLIC_CORE_CARE_DEBUG);

function safePayload(payload: DebugLogPayload) {
  if (payload == null) return payload;
  if (typeof payload !== 'object') return payload;
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return String(payload);
  }
}

export function debugLog(scope: string, label: string, payload?: DebugLogPayload) {
  const enabled =
    scope === 'STARTUP'
      ? STARTUP_DEBUG_ENABLED
      : scope === 'CORE_CARE'
        ? CORE_CARE_DEBUG_ENABLED
        : IS_DEV;
  if (!enabled) return;

  const prefix = `[${scope}_DEBUG] ${label}`;
  if (payload === undefined) {
    console.log(prefix);
    return;
  }

  try {
    console.log(prefix, JSON.stringify(safePayload(payload), null, 2));
  } catch {
    console.log(prefix, payload);
  }
}

export function debugCheck(scope: string, label: string, ok: boolean, details?: DebugLogPayload) {
  const enabled =
    scope === 'STARTUP'
      ? STARTUP_DEBUG_ENABLED
      : scope === 'CORE_CARE'
        ? CORE_CARE_DEBUG_ENABLED
        : IS_DEV;
  if (!enabled) return ok;

  debugLog(scope, `${label}.${ok ? 'ok' : 'fail'}`, details);
  return ok;
}
