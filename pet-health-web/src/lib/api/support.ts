import { fetchJson } from "./client";

export type SupportTicketKind = "feedback" | "scam";
export type SupportFeedbackCategory = "ui" | "feature" | "bug" | "other";
export type SupportScamTargetType = "account" | "phone" | "facebook" | "bank";
export type SupportTicketStatus = "open" | "reviewed" | "dismissed";

export type SupportTicket = {
  id: string;
  user_id: string;
  kind: SupportTicketKind;
  category?: string | null;
  title?: string | null;
  body: string;
  scam_target_type?: string | null;
  identifier?: string | null;
  related_url?: string | null;
  anonymous?: boolean;
  evidence_confirmed?: boolean;
  evidence_urls?: string[];
  status: SupportTicketStatus | string;
  created_at?: string;
  updated_at?: string;
};

export type SupportBlacklistResult = {
  hit: boolean;
  source: "demo" | "live" | null;
  too_short?: boolean;
  label_key?: string | null;
  note_key?: string | null;
  scam_target_type?: string | null;
};

export type CreateFeedbackTicketInput = {
  kind: "feedback";
  category: SupportFeedbackCategory;
  title: string;
  body: string;
  evidence_urls?: string[];
};

export type CreateScamTicketInput = {
  kind: "scam";
  scam_target_type: SupportScamTargetType;
  identifier: string;
  related_url?: string;
  body: string;
  anonymous?: boolean;
  evidence_confirmed: boolean;
  evidence_urls: string[];
};

export async function createSupportTicket(
  token: string,
  body: CreateFeedbackTicketInput | CreateScamTicketInput | Record<string, unknown>,
) {
  return fetchJson<{ data: SupportTicket }>("/support/tickets", {
    method: "POST",
    token,
    body,
  });
}

export async function lookupSupportBlacklist(query: string) {
  return fetchJson<{ data: SupportBlacklistResult }>(
    `/support/blacklist?q=${encodeURIComponent(query)}`,
    { cache: "no-store" },
  );
}
