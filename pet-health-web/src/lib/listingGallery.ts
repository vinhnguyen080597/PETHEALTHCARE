/** Gallery items for listing detail (photos + optional video). */

export type ListingGalleryItem =
  | { type: "image"; url: string }
  | { type: "video"; url: string };

export function buildListingGalleryItems(input: {
  mediaUrls?: string[] | null;
  mediaUrl?: string | null;
  videoUrl?: string | null;
  placeholder?: string;
}): ListingGalleryItem[] {
  const images = (input.mediaUrls || [])
    .map((url) => String(url || "").trim())
    .filter(Boolean);
  const fallback = String(input.mediaUrl || "").trim();
  const items: ListingGalleryItem[] = (images.length ? images : fallback ? [fallback] : []).map(
    (url) => ({ type: "image" as const, url }),
  );
  const video = String(input.videoUrl || "").trim();
  if (video) items.push({ type: "video", url: video });
  if (!items.length && input.placeholder) {
    items.push({ type: "image", url: input.placeholder });
  }
  return items;
}
