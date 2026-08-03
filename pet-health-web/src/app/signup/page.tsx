import { redirect } from "next/navigation";

export const metadata = { title: "Sign up" };

/** Keep /signup for old links; unified auth UI lives on /login. */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const nextRaw = sp.next;
  const next = Array.isArray(nextRaw) ? nextRaw[0] : nextRaw;
  const params = new URLSearchParams({ tab: "register" });
  if (next) params.set("next", next);
  redirect(`/login?${params.toString()}`);
}
