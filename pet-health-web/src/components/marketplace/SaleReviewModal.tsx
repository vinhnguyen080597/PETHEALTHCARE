"use client";

import { FarmReviewModal } from "./FarmReviewModal";
import type { Lang } from "@/lib/types";

/** Sale review uses the same star/comment UI as direct farm reviews. */
export function SaleReviewModal(props: {
  lang: Lang;
  open: boolean;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (payload: { rating: number; body: string; photoUrls: string[] }) => void;
}) {
  return <FarmReviewModal {...props} />;
}
