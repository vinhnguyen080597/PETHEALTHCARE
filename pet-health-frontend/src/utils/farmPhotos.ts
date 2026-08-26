import type { BreederProfile } from '../types';

export type FarmPhotoKind = 'avatar' | 'cover';

export function isFarmPhotoKind(value: string): value is FarmPhotoKind {
  return value === 'avatar' || value === 'cover';
}

export function farmPhotoPickerAspect(kind: FarmPhotoKind): [number, number] {
  return kind === 'avatar' ? [1, 1] : [16, 9];
}

export function farmPhotoResizeWidth(kind: FarmPhotoKind): number {
  return kind === 'avatar' ? 512 : 1600;
}

export function isUnusableFarmPhotoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  return trimmed.startsWith('memory://') || trimmed.startsWith('storage://');
}

/** Merge a newly uploaded public URL into the local farm profile (web-aligned metadata keys). */
export function applyFarmPhotoToProfile(
  profile: BreederProfile,
  kind: FarmPhotoKind,
  publicUrl: string,
): BreederProfile {
  if (kind === 'avatar') {
    return { ...profile, avatar_url: publicUrl };
  }
  return {
    ...profile,
    metadata: {
      ...(profile.metadata ?? {}),
      cover_url: publicUrl,
      coverUrl: publicUrl,
      coverImageUrl: publicUrl,
    },
  };
}
