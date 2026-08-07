-- Admin queue notifications (breeder / listing / report requests).

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
    'admin_report_open'
  ));
