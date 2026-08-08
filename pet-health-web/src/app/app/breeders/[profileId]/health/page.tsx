import { redirect } from "next/navigation";

type Props = { params: Promise<{ profileId: string }> };

/** Legacy /health → owner trust guide. */
export default async function BreederHealthRedirect({ params }: Props) {
  const { profileId } = await params;
  redirect(`/app/breeders/${encodeURIComponent(profileId)}/trust`);
}
