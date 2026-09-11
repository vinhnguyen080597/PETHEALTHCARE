/** One-shot sonar rings around the listing-detail chat FAB (on enter). */
export const CHAT_ICON_RIPPLE_RING_COUNT = 2;
export const CHAT_ICON_RIPPLE_PLAY_MS = 2000;
export const CHAT_ICON_RIPPLE_DURATION_MS = 1600;
export const CHAT_ICON_RIPPLE_STAGGER_MS = 400;
export const CHAT_ICON_RIPPLE_MAX_SCALE = 1.85;

export function chatIconRippleRingDelayMs(
  index: number,
  staggerMs = CHAT_ICON_RIPPLE_STAGGER_MS,
): number {
  return Math.max(0, index) * staggerMs;
}

export function chatIconRippleRingIndexes(
  count = CHAT_ICON_RIPPLE_RING_COUNT,
): number[] {
  const n = Math.max(0, Math.floor(count));
  return Array.from({ length: n }, (_, index) => index);
}

/** When the last ring finishes — the intro stays within PLAY_MS. */
export function chatIconRippleEndsAtMs(index: number): number {
  return chatIconRippleRingDelayMs(index) + CHAT_ICON_RIPPLE_DURATION_MS;
}
