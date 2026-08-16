import { redirect } from "next/navigation";
import { SUPPORT_HUB_HREF } from "@/lib/supportHub";

export const metadata = { title: "Support · PetCare: Pet Marketplace" };

/** Legacy /support URL → Support Hub */
export default function SupportRedirectPage() {
  redirect(SUPPORT_HUB_HREF);
}
