/** Transparency warning helpers — Phase 4. */

export const TRANSPARENCY_WARNING_SCORE_THRESHOLD = 15;

export type TransparencyWarningStatus =
  | "pending_breeder_action"
  | "confirmed"
  | "appealed"
  | "upheld"
  | "restored";

export type TransparencyWarning = {
  id: string;
  breeder_profile_id: string;
  user_id: string;
  score_at_trigger: number;
  penalty_points_at_trigger: number;
  trigger_violation_id?: string;
  status: TransparencyWarningStatus;
  breeder_action_at?: string | null;
  admin_resolution?: string;
  admin_note?: string;
  admin_resolved_at?: string | null;
  created_at?: string;
  breeder_profile?: {
    id?: string;
    display_name?: string;
    avatar_url?: string | null;
  } | null;
};

export function isPendingBreederTransparencyWarning(
  warning: TransparencyWarning | null | undefined,
): boolean {
  return warning?.status === "pending_breeder_action";
}

export function isAppealedTransparencyWarning(
  warning: TransparencyWarning | null | undefined,
): boolean {
  return warning?.status === "appealed";
}

export function transparencyWarningTitle(
  lang: "VI" | "EN",
  score: number,
): string {
  return lang === "EN"
    ? `Transparency score is ${score}/100`
    : `Điểm minh bạch còn ${score}/100`;
}

export function transparencyWarningBody(lang: "VI" | "EN"): string {
  return lang === "EN"
    ? "A penalty dropped your transparency score to a critical level. Confirm to suspend your account, or appeal for admin review."
    : "Một điểm phạt đã đưa điểm minh bạch xuống mức nguy hiểm. Xác nhận để tạm khóa tài khoản, hoặc kháng cáo để admin xem xét.";
}

export function requestStatusGroupForAppeal(
  status: string,
): "waiting" | "approved" | "rejected" {
  if (status === "restored") return "approved";
  if (status === "upheld" || status === "confirmed") return "rejected";
  return "waiting";
}
