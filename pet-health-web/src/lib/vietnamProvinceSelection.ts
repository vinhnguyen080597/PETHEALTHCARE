import { VIETNAM_PROVINCES, type VietnamProvince } from "../constants/vietnamProvinces";

const LEGACY_PROVINCE_ALIASES: Record<string, VietnamProvince> = {
  "Thừa Thiên Huế": "TP. Huế",
  "Thua Thien Hue": "TP. Huế",
  "Huế": "TP. Huế",
  "Hà Nội": "TP. Hà Nội",
  "Ha Noi": "TP. Hà Nội",
  "Hải Phòng": "TP. Hải Phòng",
  "Hai Phong": "TP. Hải Phòng",
  "Đà Nẵng": "TP. Đà Nẵng",
  "Da Nang": "TP. Đà Nẵng",
  "Cần Thơ": "TP. Cần Thơ",
  "Can Tho": "TP. Cần Thơ",
  "Đồng Nai": "TP. Đồng Nai",
  "TP HCM": "TP. Hồ Chí Minh",
  "TP.HCM": "TP. Hồ Chí Minh",
  "TP Hồ Chí Minh": "TP. Hồ Chí Minh",
  "Sài Gòn": "TP. Hồ Chí Minh",
  "Saigon": "TP. Hồ Chí Minh",
  "Hà Giang": "Tuyên Quang",
  "Yên Bái": "Lào Cai",
  "Bắc Kạn": "Thái Nguyên",
  "Hòa Bình": "Phú Thọ",
  "Vĩnh Phúc": "Phú Thọ",
  "Bắc Giang": "Bắc Ninh",
  "Thái Bình": "Hưng Yên",
  "Hà Nam": "Ninh Bình",
  "Nam Định": "Ninh Bình",
  "Quảng Bình": "Quảng Trị",
  "Quảng Nam": "TP. Đà Nẵng",
  "Kon Tum": "Quảng Ngãi",
  "Bình Định": "Gia Lai",
  "Phú Yên": "Đắk Lắk",
  "Ninh Thuận": "Khánh Hòa",
  "Đắk Nông": "Lâm Đồng",
  "Bình Thuận": "Lâm Đồng",
  "Bà Rịa - Vũng Tàu": "TP. Hồ Chí Minh",
  "Bình Dương": "TP. Hồ Chí Minh",
  "Bình Phước": "TP. Đồng Nai",
  "Long An": "Tây Ninh",
  "Tiền Giang": "Đồng Tháp",
  "Kiên Giang": "An Giang",
  "Bến Tre": "Vĩnh Long",
  "Trà Vinh": "Vĩnh Long",
  "Bạc Liêu": "Cà Mau",
  "Hậu Giang": "TP. Cần Thơ",
  "Sóc Trăng": "TP. Cần Thơ",
  "Hải Dương": "TP. Hải Phòng",
};

function compact(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isVietnamProvince(value: string): value is VietnamProvince {
  return (VIETNAM_PROVINCES as readonly string[]).includes(value);
}

/** Map saved free-text / legacy province names to the current 34-province catalog. */
export function resolveProvinceSelection(value: string | null | undefined): VietnamProvince | "" {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (isVietnamProvince(raw)) return raw;

  const alias = LEGACY_PROVINCE_ALIASES[raw];
  if (alias) return alias;

  const needle = compact(raw);
  const exact = VIETNAM_PROVINCES.find((province) => compact(province) === needle);
  if (exact) return exact;

  const contains = VIETNAM_PROVINCES.find(
    (province) => needle.includes(compact(province)) || compact(province).includes(needle),
  );
  return contains ?? "";
}

/** Normalized lowercase needles for matching listing/breeder locations. */
export function provinceMatchNeedles(province: string): string[] {
  const trimmed = String(province || "").trim();
  if (!trimmed) return [];

  const needles = new Set<string>();
  const add = (value: string) => {
    const next = compact(value);
    if (next) needles.add(next);
  };

  add(trimmed);
  if (trimmed.startsWith("TP. ")) {
    add(trimmed.slice(4));
  }

  for (const [legacy, mapped] of Object.entries(LEGACY_PROVINCE_ALIASES)) {
    if (mapped === trimmed) add(legacy);
  }

  return [...needles];
}

export function listingMatchesProvince(
  listing: { location?: string; breeder?: { location?: string } },
  province: string,
): boolean {
  const needles = provinceMatchNeedles(province);
  if (!needles.length) return true;
  const haystack = compact(
    [listing.location, listing.breeder?.location].filter(Boolean).join(" "),
  );
  return needles.some((needle) => haystack.includes(needle));
}
