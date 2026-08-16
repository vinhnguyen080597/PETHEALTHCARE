import { redirect } from "next/navigation";
import { newsPostDetailHref } from "@/lib/newsDetail";

type Props = { params: Promise<{ postId: string }> };

/**
 * Legacy `/app/news/[id]` → Tin tức feed deep link (`?post=`).
 * Keeps old shares working without a separate detail page.
 */
export default async function NewsPostLegacyRedirect({ params }: Props) {
  const { postId } = await params;
  redirect(newsPostDetailHref(postId));
}
