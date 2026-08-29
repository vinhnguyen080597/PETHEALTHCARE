/** Message CTA in detail header — hidden for listing owner. */
export function petFeedDetailShowsMessageButton(
  isOwnPost: boolean,
  hasMessageHandler: boolean,
): boolean {
  return !isOwnPost && hasMessageHandler;
}

/** Edit CTA in detail header — shown only for listing owner. */
export function petFeedDetailShowsEditButton(
  isOwnPost: boolean,
  hasEditHandler: boolean,
): boolean {
  return isOwnPost && hasEditHandler;
}
