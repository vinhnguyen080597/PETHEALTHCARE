/** Map farm-chat API errors to i18n keys (web startChatMessageKey). */
export function farmChatErrorKey(
  code?: string | null,
  status?: number,
):
  | 'petFeed.messages.noListingToMessage'
  | 'petFeed.messages.startChatSelf'
  | 'petFeed.messages.startChatBlocked'
  | 'petFeed.messages.startChatFailed' {
  if (code === 'PET_FEED_MESSAGE_SELF') return 'petFeed.messages.startChatSelf';
  if (code === 'PET_FEED_BREEDER_BLOCKED') return 'petFeed.messages.startChatBlocked';
  if (code === 'PET_FEED_NO_LISTING_TO_MESSAGE' || status === 404) {
    return 'petFeed.messages.noListingToMessage';
  }
  return 'petFeed.messages.startChatFailed';
}
