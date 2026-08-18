import { farmPetAvailability } from "./farmPets";
import { fetchWithSession } from "./fetchWithSession";
import {
  conversationFromStartPayload,
  messagesPageHref,
  openConversationUi,
  optimisticChatConversation,
  withConversationEntryContext,
  withConversationPeerLabel,
  type MessageConversation,
} from "./messages";

export type FarmChatListingHint = {
  id?: string | null;
  status?: string | null;
  metadataSold?: boolean;
  metadataCancelled?: boolean;
  ownerDeleted?: boolean;
};

export type FarmChatThumbHint = {
  listingId?: string | null;
};

/** Prefer a visible open listing; otherwise the farm-level conversation API. */
export function preferredListingIdForFarmChat(options: {
  listingId?: string | null;
  petThumbs?: Array<FarmChatThumbHint | null> | null;
  listings?: Array<FarmChatListingHint | null> | null;
}): string | null {
  const direct = String(options.listingId || "").trim();
  if (direct) return direct;
  const fromThumb = String(options.petThumbs?.[0]?.listingId || "").trim();
  if (fromThumb) return fromThumb;
  for (const row of options.listings ?? []) {
    if (!row) continue;
    const id = String(row.id || "").trim();
    if (!id) continue;
    const availability = farmPetAvailability(row);
    if (availability === "for_sale" || availability === "deposit_hold") return id;
  }
  return null;
}

export function farmConversationStartUrls(options: {
  listingId?: string | null;
  breederId?: string | null;
}): string[] {
  const breederId = String(options.breederId || "").trim();
  if (breederId) {
    return [`/api/breeders/${encodeURIComponent(breederId)}/conversations`];
  }
  const listingId = String(options.listingId || "").trim();
  if (listingId) {
    return [`/api/listings/${encodeURIComponent(listingId)}/conversations`];
  }
  return [];
}

export function shouldRetryFarmChatFallback(
  status: number,
  code?: string | null,
): boolean {
  if (status === 401 || status === 400 || status === 403) return false;
  return (
    status === 404
    || code === "PET_FEED_POST_NOT_FOUND"
    || code === "PET_FEED_NO_LISTING_TO_MESSAGE"
  );
}

export function startChatMessageKey(
  status: number,
  code?: string | null,
):
  | "messages.noListingToMessage"
  | "messages.startChatSelf"
  | "messages.startChatBlocked"
  | "messages.startChatFailed" {
  if (code === "PET_FEED_MESSAGE_SELF") return "messages.startChatSelf";
  if (code === "PET_FEED_BREEDER_BLOCKED") return "messages.startChatBlocked";
  if (code === "PET_FEED_NO_LISTING_TO_MESSAGE" || status === 404) {
    return "messages.noListingToMessage";
  }
  return "messages.startChatFailed";
}

export async function startFarmChatRequest(options: {
  listingId?: string | null;
  breederId?: string | null;
}): Promise<
  | { ok: true; conversation: MessageConversation }
  | { ok: false; status: number; code?: string }
> {
  const urls = farmConversationStartUrls(options);
  if (urls.length === 0) {
    return { ok: false, status: 404, code: "PET_FEED_NO_LISTING_TO_MESSAGE" };
  }
  let last: { status: number; code?: string } = {
    status: 404,
    code: "PET_FEED_NO_LISTING_TO_MESSAGE",
  };
  for (let i = 0; i < urls.length; i += 1) {
    const res = await fetchWithSession(urls[i], { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      data?: unknown;
      code?: string;
    };
    const code = typeof data.code === "string" ? data.code : undefined;
    if (res.ok) {
      const conversation = conversationFromStartPayload(data);
      if (conversation) return { ok: true, conversation };
      last = { status: res.status };
      continue;
    }
    last = { status: res.status, code };
    if (res.status === 401) return { ok: false, status: 401, code };
    const canRetry = i < urls.length - 1 && shouldRetryFarmChatFallback(res.status, code);
    if (canRetry) continue;
    return { ok: false, status: res.status, code };
  }
  return { ok: false, ...last };
}

export function beginOptimisticChatOpen(
  pending: MessageConversation | null,
  openChat?:
    | ((id: string, conversation?: MessageConversation | null) => void)
    | null,
): boolean {
  const id = String(pending?.id || "").trim();
  if (!id || !openChat) return false;
  openChat(id, pending);
  return true;
}

export function finishOptimisticChatOpen(options: {
  pendingId?: string | null;
  openedOptimistic: boolean;
  conversation: MessageConversation;
  replaceChat?:
    | ((pendingId: string, conversation: MessageConversation) => void)
    | null;
  openChat?:
    | ((id: string, conversation?: MessageConversation | null) => void)
    | null;
  navigate: (href: string) => void;
}): void {
  const pendingId = String(options.pendingId || "").trim();
  if (options.openedOptimistic && pendingId && options.replaceChat) {
    options.replaceChat(pendingId, options.conversation);
    return;
  }
  if (options.openChat) {
    options.openChat(options.conversation.id, options.conversation);
    return;
  }
  options.navigate(messagesPageHref(options.conversation.id));
}

export async function startChatAndOpenUi(options: {
  listingId?: string | null;
  breederId?: string | null;
  farmName?: string | null;
  listingTitle?: string | null;
  openChat?:
    | ((id: string, conversation?: MessageConversation | null) => void)
    | null;
  replaceChat?:
    | ((pendingId: string, conversation: MessageConversation) => void)
    | null;
  abortChat?: ((pendingId: string) => void) | null;
  navigate: (href: string) => void;
}): Promise<
  | { ok: true }
  | { ok: false; status: number; code?: string }
> {
  const kind = String(options.breederId || "").trim() ? "breeder" : "listing";
  const sourceId = String(options.breederId || options.listingId || "").trim();
  const pending = optimisticChatConversation({
    kind,
    sourceId,
    farmName: options.farmName,
    listingTitle: options.listingTitle,
    listingId: options.listingId,
  });
  const openedOptimistic = beginOptimisticChatOpen(pending, options.openChat);
  const result = await startFarmChatRequest({
    listingId: options.listingId,
    breederId: options.breederId,
  });
  if (!result.ok) {
    if (openedOptimistic && pending) options.abortChat?.(pending.id);
    return result;
  }
  const conversation = withConversationPeerLabel(
    withConversationEntryContext(
      result.conversation,
      kind === "breeder" ? "breeder" : "listing",
    ),
    options.farmName,
  );
  finishOptimisticChatOpen({
    pendingId: pending?.id,
    openedOptimistic,
    conversation,
    replaceChat: options.replaceChat,
    openChat: options.openChat,
    navigate: options.navigate,
  });
  return { ok: true };
}

export function openFarmChatUi(
  conversation: MessageConversation,
  options: {
    farmName?: string | null;
    openChat?:
      | ((id: string, conversation?: MessageConversation | null) => void)
      | null;
    navigate: (href: string) => void;
  },
): void {
  const farmConversation = withConversationPeerLabel(
    withConversationEntryContext(conversation, "breeder"),
    options.farmName,
  );
  if (options.openChat) {
    options.openChat(farmConversation.id, farmConversation);
    return;
  }
  openConversationUi(farmConversation.id, options.navigate, farmConversation);
}
