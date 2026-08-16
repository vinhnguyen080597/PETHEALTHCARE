import type { Listing } from "./types";
import {
  isListingNewOnFloor,
  isListingOpenForSale,
  listingCreatedAtMs,
} from "./marketplaceSocialProof";
import { farmPetAvailability } from "./farmPets";

export type LiveTickerKind =
  | "deposit"
  | "sold"
  | "new_listing"
  | "new_batch"
  | "demo";

export type LiveTickerItem = {
  id: string;
  kind: LiveTickerKind;
  listingId?: string;
  breederName: string;
  location: string;
  petTitle: string;
  minutesAgo: number;
  /** Freeform copy for marketplace demos (VI / EN). */
  messageVI?: string;
  messageEN?: string;
};

/** 10 curated pulses so the ticker never feels empty on quiet days. */
export const DEMO_LIVE_TICKER_ITEMS: LiveTickerItem[] = [
  {
    id: "demo-1",
    kind: "demo",
    breederName: "Mina Cattery",
    location: "Hà Nội",
    petTitle: "Mèo ALN",
    minutesAgo: 2,
    messageVI:
      "🎉 Sen Lan vừa chốt cọc bé Mèo ALN tại Mina Cattery (Hà Nội) · 2 phút trước",
    messageEN:
      "🎉 Sen Lan just deposited on a British SH at Mina Cattery (Hanoi) · 2m ago",
  },
  {
    id: "demo-2",
    kind: "demo",
    breederName: "Hoàng Gia Kennel",
    location: "TP. Hồ Chí Minh",
    petTitle: "Corgi",
    minutesAgo: 5,
    messageVI:
      "⚡ Trại Hoàng Gia vừa đăng lứa 5 bé Corgi mới tại TP.HCM · 5 phút trước",
    messageEN:
      "⚡ Hoang Gia Kennel just listed a litter of 5 Corgis in HCMC · 5m ago",
  },
  {
    id: "demo-3",
    kind: "demo",
    breederName: "Petit Paws",
    location: "Đà Nẵng",
    petTitle: "Poodle Tiny",
    minutesAgo: 8,
    messageVI:
      "🏠 Bé Poodle Tiny đã về nhà mới từ Petit Paws (Đà Nẵng) · 8 phút trước",
    messageEN:
      "🏠 A Tiny Poodle found a home from Petit Paws (Da Nang) · 8m ago",
  },
  {
    id: "demo-4",
    kind: "demo",
    breederName: "Lucastalina",
    location: "Hà Nội",
    petTitle: "Munchkin",
    minutesAgo: 12,
    messageVI:
      "✨ Lucastalina vừa lên sàn bé Munchkin kem tại Hà Nội · 12 phút trước",
    messageEN:
      "✨ Lucastalina just listed a cream Munchkin in Hanoi · 12m ago",
  },
  {
    id: "demo-5",
    kind: "demo",
    breederName: "Sunny Farm",
    location: "Bình Dương",
    petTitle: "Golden Retriever",
    minutesAgo: 18,
    messageVI:
      "🎉 Sen Minh vừa đặt cọc bé Golden tại Sunny Farm (Bình Dương) · 18 phút trước",
    messageEN:
      "🎉 Sen Minh just deposited on a Golden at Sunny Farm (Binh Duong) · 18m ago",
  },
  {
    id: "demo-6",
    kind: "demo",
    breederName: "CatHouse VN",
    location: "TP. Hồ Chí Minh",
    petTitle: "Scottish Fold",
    minutesAgo: 25,
    messageVI:
      "⚡ Có 14 bé cưng mới vừa lên sàn trên toàn quốc · 25 phút trước",
    messageEN: "⚡ 14 new pets just hit the nationwide floor · 25m ago",
  },
  {
    id: "demo-7",
    kind: "demo",
    breederName: "Royal Whiskers",
    location: "Hải Phòng",
    petTitle: "Ragdoll",
    minutesAgo: 32,
    messageVI:
      "💬 Sen Hương vừa mở chat với Royal Whiskers về bé Ragdoll · 32 phút trước",
    messageEN:
      "💬 Sen Huong just opened chat with Royal Whiskers about a Ragdoll · 32m ago",
  },
  {
    id: "demo-8",
    kind: "demo",
    breederName: "Corgi House",
    location: "Hà Nội",
    petTitle: "Corgi",
    minutesAgo: 41,
    messageVI:
      "🛡️ Corgi House vừa gắn bảo hành 30 ngày cho lứa Corgi mới · 41 phút trước",
    messageEN:
      "🛡️ Corgi House attached a 30-day warranty to a new Corgi litter · 41m ago",
  },
  {
    id: "demo-9",
    kind: "demo",
    breederName: "Meow Studio",
    location: "Cần Thơ",
    petTitle: "Anh lông ngắn",
    minutesAgo: 55,
    messageVI:
      "🏠 Bé Anh lông ngắn xám xanh đã tìm được Sen tại Meow Studio · 55 phút trước",
    messageEN:
      "🏠 A blue British SH found a Sen at Meow Studio · 55m ago",
  },
  {
    id: "demo-10",
    kind: "demo",
    breederName: "Pawfect Kennel",
    location: "TP. Hồ Chí Minh",
    petTitle: "Pomeranian",
    minutesAgo: 67,
    messageVI:
      "🎉 Sen Tuấn (TP.HCM) vừa giữ cọc an toàn bé Pomeranian tại Pawfect Kennel · 1 giờ trước",
    messageEN:
      "🎉 Sen Tuan (HCMC) just secured a Pomeranian deposit at Pawfect Kennel · 1h ago",
  },
];

function minutesAgoFrom(ms: number | null, now: number): number {
  if (ms == null) return 3;
  return Math.max(1, Math.min(180, Math.round((now - ms) / 60_000)));
}

function titleOf(listing: Listing): string {
  return (listing.titleVI || listing.title || listing.breed || "pet").trim();
}

/**
 * Build a short live-activity feed from real listing states, then pad with
 * demo pulses so the ticker always has up to `limit` items (default 10).
 */
export function buildLiveTickerItems(
  listings: Listing[],
  now = Date.now(),
  limit = 10,
): LiveTickerItem[] {
  const items: LiveTickerItem[] = [];

  for (const listing of listings) {
    const availability = farmPetAvailability(listing);
    const created = listingCreatedAtMs(listing, now);
    const mins = minutesAgoFrom(created, now);
    const breederName = listing.breeder.name?.trim() || "Breeder";
    const location = listing.location?.trim() || listing.breeder.location?.trim() || "";
    const petTitle = titleOf(listing);

    if (availability === "deposit_hold") {
      items.push({
        id: `deposit-${listing.id}`,
        kind: "deposit",
        listingId: listing.id,
        breederName,
        location,
        petTitle,
        minutesAgo: mins,
      });
      continue;
    }

    if (availability === "completed" && !listing.metadataCancelled) {
      items.push({
        id: `sold-${listing.id}`,
        kind: "sold",
        listingId: listing.id,
        breederName,
        location,
        petTitle,
        minutesAgo: mins,
      });
      continue;
    }

    if (isListingOpenForSale(listing) && isListingNewOnFloor(listing, now)) {
      items.push({
        id: `new-${listing.id}`,
        kind: "new_listing",
        listingId: listing.id,
        breederName,
        location,
        petTitle,
        minutesAgo: mins,
      });
    }
  }

  const freshOpen = listings.filter(
    (l) => isListingOpenForSale(l) && isListingNewOnFloor(l, now),
  );
  if (freshOpen.length >= 3) {
    items.unshift({
      id: `batch-${freshOpen.length}`,
      kind: "new_batch",
      breederName: "",
      location: "",
      petTitle: String(freshOpen.length),
      minutesAgo: 1,
    });
  }

  const rank: Record<LiveTickerKind, number> = {
    deposit: 0,
    sold: 1,
    new_batch: 2,
    new_listing: 3,
    demo: 4,
  };
  items.sort((a, b) => {
    const rk = rank[a.kind] - rank[b.kind];
    if (rk !== 0) return rk;
    if (a.minutesAgo !== b.minutesAgo) return a.minutesAgo - b.minutesAgo;
    return a.id.localeCompare(b.id);
  });

  const seen = new Set<string>();
  const unique: LiveTickerItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
    if (unique.length >= limit) break;
  }

  for (const demo of DEMO_LIVE_TICKER_ITEMS) {
    if (unique.length >= limit) break;
    if (seen.has(demo.id)) continue;
    seen.add(demo.id);
    unique.push(demo);
  }

  return unique.slice(0, limit);
}

export function formatTickerMinutes(minutes: number, lang: "EN" | "VI"): string {
  if (minutes <= 1) return lang === "VI" ? "vừa xong" : "just now";
  if (minutes < 60) {
    return lang === "VI" ? `${minutes} phút trước` : `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  return lang === "VI" ? `${hours} giờ trước` : `${hours}h ago`;
}

export function liveTickerDisplayText(
  item: LiveTickerItem,
  lang: "EN" | "VI",
  templates: {
    deposit: string;
    sold: string;
    newListing: string;
    newBatch: string;
  },
): string {
  if (item.kind === "demo") {
    return lang === "VI"
      ? item.messageVI || item.messageEN || ""
      : item.messageEN || item.messageVI || "";
  }
  const time = formatTickerMinutes(item.minutesAgo, lang);
  const location = item.location ? ` (${item.location})` : "";
  if (item.kind === "new_batch") {
    return templates.newBatch.replaceAll("{{count}}", item.petTitle);
  }
  const vars: Record<string, string> = {
    breeder: item.breederName,
    pet: item.petTitle,
    location,
    time,
  };
  const template =
    item.kind === "deposit"
      ? templates.deposit
      : item.kind === "sold"
        ? templates.sold
        : templates.newListing;
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}
