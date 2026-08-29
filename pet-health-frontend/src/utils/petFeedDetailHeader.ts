/** Message CTA in detail header — hidden for listing owner. */
export function petFeedDetailShowsMessageButton(
  isOwnPost: boolean,
  hasMessageHandler: boolean,
): boolean {
  return !isOwnPost && hasMessageHandler;
}
