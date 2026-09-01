-- Allow farm review notification types (admin queue + buyer/breeder alerts).

alter table public.pet_feed_notifications
  drop constraint if exists pet_feed_notifications_type_check;

alter table public.pet_feed_notifications
  add constraint pet_feed_notifications_type_check
  check (type in (
    'post_comment',
    'breeder_verified',
    'breeder_rejected',
    'breeder_detail_approved',
    'breeder_detail_rejected',
    'transparency_warning',
    'transparency_warning_resolved',
    'admin_breeder_pending',
    'admin_breeder_detail_pending',
    'admin_transparency_appeal',
    'admin_listing_pending',
    'admin_report_open',
    'admin_feedback_open',
    'admin_scam_open',
    'admin_farm_review_pending',
    'deposit_request',
    'deposit_confirmed',
    'deposit_cancel_request',
    'deposit_cancelled',
    'deal_complete_request',
    'deal_completed',
    'deal_reviewed',
    'deal_dispute_opened',
    'deal_dispute_resolved',
    'listing_approved',
    'listing_rejected',
    'conversation_message',
    'farm_sale_review_request',
    'farm_reviewed',
    'farm_review_rejected'
  ));
