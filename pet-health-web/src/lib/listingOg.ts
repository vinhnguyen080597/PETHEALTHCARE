import { absoluteMediaUrl } from "./config";
import { formatPriceVnd } from "./formatPrice";
import type { Listing } from "./types";

function speciesEmoji(species: string): string {
  const s = species.toLowerCase();
  if (s.includes("cat") || s.includes("mèo") || s.includes("meo")) return "🐱";
  if (s.includes("dog") || s.includes("chó") || s.includes("cho")) return "🐶";
  if (s.includes("bird") || s.includes("chim")) return "🐦";
  if (s.includes("fish") || s.includes("cá") || s.includes("ca ")) return "🐠";
  if (s.includes("rabbit") || s.includes("thỏ") || s.includes("tho")) return "🐰";
  if (s.includes("hamster")) return "🐹";
  if (s.includes("mouse") || s.includes("chuột") || s.includes("chuot")) return "🐭";
  if (s.includes("reptile") || s.includes("bò sát") || s.includes("bo sat")) return "🐍";
  return "🐾";
}

function isBlank(v: string | null | undefined): boolean {
  const t = (v || "").trim();
  return !t || t === "—";
}

/** Prefer full photos over feed-card thumbs for sharp social previews. */
export function listingOgPhotoUrl(listing: Listing): string | undefined {
  const candidates = [listing.mediaUrl, ...(listing.mediaUrls || [])];
  const full = candidates.find(
    (u) => u && !u.startsWith("data:") && !/\/thumbs\//i.test(u),
  );
  return absoluteMediaUrl(
    full || candidates.find((u) => u && !u.startsWith("data:")),
  );
}

/**
 * Mẫu 1 share copy — facts live in og:title / og:description;
 * og:image is the full-bleed pet photo (no text baked into the image).
 */
export function buildListingOgCopy(listing: Listing): {
  title: string;
  description: string;
} {
  const emoji = speciesEmoji(listing.species);
  const breed = !isBlank(listing.breed)
    ? listing.breed.trim()
    : !isBlank(listing.title)
      ? listing.title.trim()
      : "Thú cưng";
  const price =
    formatPriceVnd(listing.price) ||
    (!isBlank(listing.price) ? String(listing.price).trim() : "");

  const title = (
    price ? `${emoji} ${breed} — ${price}` : `${emoji} ${breed}`
  ).slice(0, 110);

  const parts: string[] = [];
  if (!isBlank(listing.location)) {
    parts.push(`📍 ${listing.location.trim()}`);
  }
  const breederName = listing.breeder?.name?.trim();
  if (breederName && breederName !== "Breeder") {
    parts.push(`🏠 ${breederName}`);
  }
  if (listing.escrowEnabled) {
    parts.push("🛡️ Giữ cọc an tâm Escrow");
  }

  const description = (
    parts.length
      ? parts.join(" • ")
      : "Tìm thú cưng khỏe mạnh từ breeder uy tín trên PetCare: Pet Marketplace"
  ).slice(0, 160);

  return { title, description };
}
