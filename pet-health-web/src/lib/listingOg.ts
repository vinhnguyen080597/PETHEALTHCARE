import { formatPriceVnd } from "./formatPrice";
import type { Listing } from "./types";

/** Professional share-card copy for Open Graph / Twitter. */
export function buildListingOgCopy(listing: Listing): {
  title: string;
  description: string;
} {
  const title = (listing.title || "Tin đăng thú cưng").trim();
  const price =
    formatPriceVnd(listing.price) ||
    (listing.price && listing.price !== "—" ? String(listing.price).trim() : "");

  const facts = [listing.breed, listing.location, price].filter(
    (v) => Boolean(v && String(v).trim() && String(v).trim() !== "—"),
  );

  const description = (
    facts.length
      ? `${facts.join(" · ")} — Tin đăng trên Pet Marketplace`
      : "Tìm thú cưng khỏe mạnh từ breeder uy tín trên Pet Marketplace"
  ).slice(0, 160);

  return { title, description };
}
