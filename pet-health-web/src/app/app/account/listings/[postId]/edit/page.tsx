import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLang } from "@/i18n";
import { COOKIE_LANG, peekAccessToken, getSessionUser } from "@/lib/session";
import { getPublicPostDetail } from "@/lib/api/public";
import { canAccessListingEditPage } from "@/lib/listingEdit";
import { EditListingForm } from "@/components/account/EditListingForm";

export const metadata = { title: "Update listing details" };

type Props = { params: Promise<{ postId: string }> };

export default async function EditListingPage({ params }: Props) {
  const { postId } = await params;
  const token = await peekAccessToken();
  const next = `/app/account/listings/${encodeURIComponent(postId)}/edit`;
  if (!token) redirect(`/login?next=${encodeURIComponent(next)}`);

  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const session = await getSessionUser();
  const listing = await getPublicPostDetail(postId).catch(() => null);
  const currentUserId = session.account?.user_id || null;

  if (
    !canAccessListingEditPage({
      currentUserId,
      listing,
    })
  ) {
    redirect(`/app/pet-feed/posts/${encodeURIComponent(postId)}`);
  }

  return <EditListingForm listing={listing!} lang={lang} />;
}
