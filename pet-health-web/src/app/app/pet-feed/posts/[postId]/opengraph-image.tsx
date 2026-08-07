import { ImageResponse } from "next/og";
import { getPublicPostDetail } from "@/lib/api/public";
import { absoluteMediaUrl } from "@/lib/config";
import { buildListingOgCopy } from "@/lib/listingOg";
import { formatPriceVnd } from "@/lib/formatPrice";

export const alt = "Pet Marketplace listing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

type Props = { params: Promise<{ postId: string }> };

export default async function OgImage({ params }: Props) {
  const { postId } = await params;
  const listing = await getPublicPostDetail(postId).catch(() => null);

  if (!listing) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#FDFBF7",
            color: "#2B1E19",
            fontSize: 42,
            fontWeight: 600,
          }}
        >
          Pet Marketplace
        </div>
      ),
      { ...size },
    );
  }

  const { title } = buildListingOgCopy(listing);
  const price =
    formatPriceVnd(listing.price) ||
    (listing.price && listing.price !== "—" ? listing.price : "");
  const subtitle = [listing.breed, listing.location].filter(Boolean).join(" · ");
  const photo = absoluteMediaUrl(listing.mediaUrl);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#2B1E19",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "58%",
            height: "100%",
            display: "flex",
            position: "relative",
            overflow: "hidden",
            background: "#44403c",
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              width={700}
              height={630}
              style={{
                width: "100%",
                height: "100%",
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
                fontSize: 28,
              }}
            >
              Pet Marketplace
            </div>
          )}
        </div>

        <div
          style={{
            width: "42%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px 44px",
            background: "#FDFBF7",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "#D97706",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              Pet Marketplace
            </div>
            <div
              style={{
                display: "flex",
                color: "#2B1E19",
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1.2,
                maxHeight: 160,
                overflow: "hidden",
              }}
            >
              {title.length > 56 ? `${title.slice(0, 54)}…` : title}
            </div>
            {subtitle ? (
              <div
                style={{
                  display: "flex",
                  color: "#78716c",
                  fontSize: 24,
                  lineHeight: 1.35,
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {price ? (
              <div
                style={{
                  display: "flex",
                  color: "#B45309",
                  fontSize: 34,
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
                fontSize: 18,
              }}
            >
              pet-marketplace.org
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
