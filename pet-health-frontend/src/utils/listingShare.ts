import type { PetFeedConversationPostSummary } from '../types';

export function normalizeListingShare(raw: unknown): PetFeedConversationPostSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id || '').trim();
  if (!id) return null;
  const thumb = typeof row.thumb_url === 'string' ? row.thumb_url.trim() : '';
  return {
    id,
    title: String(row.title || '').trim(),
    thumb_url: thumb || null,
    price_note: String(row.price_note || '').trim(),
    species: String(row.species || '').trim(),
    breed: String(row.breed || '').trim(),
    location: String(row.location || '').trim(),
    status: (String(row.status || '').trim() || 'published') as PetFeedConversationPostSummary['status'],
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}
