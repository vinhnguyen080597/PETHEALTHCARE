import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getPublicPostDetail } from "@/lib/api/public";
import { absoluteMediaUrl } from "@/lib/config";
import { buildListingOgCopy } from "@/lib/listingOg";
import { formatPriceVnd } from "@/lib/formatPrice";

export const alt = "Pet Marketplace listing";
/** 2× Facebook’s 1200×630 so text/photos stay sharp after social compression */
export const size = { width: 2400, height: 1260 };
export const contentType = "image/png";
export const runtime = "nodejs";

type Props = { params: Promise<{ postId: string }> };

async function loadFont(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(join(process.cwd(), "public/fonts", file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function loadInterFonts() {
  const [semi, bold] = await Promise.all([
    loadFont("Inter-SemiBold.ttf"),
    loadFont("Inter-Bold.ttf"),
  ]);
  return [
    { name: "Inter", data: semi, style: "normal" as const, weight: 600 as const },
    { name: "Inter", data: bold, style: "normal" as const, weight: 700 as const },
  ];
}

/** Prefer full photos over feed-card thumbs (720px) so OG isn’t soft. */
function listingOgPhotoUrl(listing: {
  mediaUrl: string;
  mediaUrls: string[];
}): string | undefined {
  const candidates = [listing.mediaUrl, ...(listing.mediaUrls || [])];
  const full = candidates.find(
    (u) => u && !u.startsWith("data:") && !/\/thumbs\//i.test(u),
  );
  return absoluteMediaUrl(
    full || candidates.find((u) => u && !u.startsWith("data:")),
  );
}

function fallbackCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FDFBF7",
        color: "#2B1E19",
        fontSize: 84,
        fontWeight: 700,
        fontFamily: "Inter",
      }}
    >
      Pet Marketplace
    </div>
  );
}

export default async function OgImage({ params }: Props) {
  const { postId } = await params;
  const listing = await getPublicPostDetail(postId).catch(() => null);
  const fonts = await loadInterFonts();

  const brand = "Pet Marketplace";
  const domain = "pet-marketplace.org";

  if (!listing) {
    return new ImageResponse(fallbackCard(), { ...size, fonts });
  }

  const { title } = buildListingOgCopy(listing);
  const price =
    formatPriceVnd(listing.price) ||
    (listing.price && listing.price !== "—" ? listing.price : "");
  const subtitle = [listing.breed, listing.location].filter(Boolean).join(" · ");
  const displayTitle = title.length > 48 ? `${title.slice(0, 46)}…` : title;
  const photo = listingOgPhotoUrl(listing);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#2B1E19",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            width: 1392,
            height: 1260,
            display: "flex",
            overflow: "hidden",
            background: "#44403c",
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              width={1392}
              height={1260}
              style={{
                width: 1392,
                height: 1260,
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#a8a29e",
                fontSize: 56,
                fontWeight: 700,
              }}
            >
              Pet Marketplace
            </div>
          )}
        </div>

        <div
          style={{
            width: 1008,
            height: 1260,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "96px 88px",
            background: "#FDFBF7",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#D97706",
                fontSize: 44,
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              {brand}
            </div>
            <div
              style={{
                display: "flex",
                color: "#2B1E19",
                fontSize: 78,
                fontWeight: 700,
                lineHeight: 1.15,
                maxHeight: 280,
                overflow: "hidden",
              }}
            >
              {displayTitle}
            </div>
            {subtitle ? (
              <div
                style={{
                  display: "flex",
                  color: "#78716c",
                  fontSize: 42,
                  fontWeight: 600,
                  lineHeight: 1.35,
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {price ? (
              <div
                style={{
                  display: "flex",
                  color: "#B45309",
                  fontSize: 64,
                  fontWeight: 700,
                }}
              >
                {price}
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                color: "#a8a29e",
                fontSize: 34,
                fontWeight: 600,
              }}
            >
              {domain}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
