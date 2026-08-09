-- Notify breeders when admin approves or rejects (archives) a listing.

alter table public.pet_feed_notifications
  drop constraint if exists pet_feed_notifications_type_check;

alter table public.pet_feed_notifications
  add constraint pet_feed_notifications_type_check
  check (type in (
    'post_comment',
    'breeder_verified',
    'breeder_rejected',
    'admin_breeder_pending',
    'admin_listing_pending',
    'admin_report_open',
    'deposit_request',
    'deposit_confirmed',
    'deposit_cancelled',
    'deal_complete_request',
    'deal_completed',
    'listing_approved',
    'listing_rejected'
  ));
