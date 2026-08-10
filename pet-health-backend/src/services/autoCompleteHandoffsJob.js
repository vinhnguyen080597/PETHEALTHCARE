import {
  autoCompleteExpiredHandoffs,
} from '../repositories/petFeedRepository.js';
import { createDealNotification } from '../repositories/petFeedNotificationsRepository.js';

function dealNotifyMeta(post) {
  return {
    title: post?.title || '',
    thumb_url: Array.isArray(post?.media_urls) ? post.media_urls[0] : null,
    breeder_profile_id: post?.breeder_profile_id || null,
    cta_href: post?.id ? `/app/pet-feed/posts/${encodeURIComponent(post.id)}` : undefined,
    auto_completed: true,
  };
}

/**
 * Cron/admin job: auto-complete overdue handoffs and notify both parties.
 */
export async function runAutoCompleteHandoffsJob(accessToken, options = {}) {
  const result = await autoCompleteExpiredHandoffs(accessToken, options);
  const notifyFailures = [];

  for (const item of result.completed) {
    const post = item.post;
    const title = post?.title || '';
    const recipients = [item.notify_breeder_user_id, item.notify_sen_user_id].filter(Boolean);
    for (const recipientUserId of recipients) {
      try {
        await createDealNotification({
          recipientUserId,
          actorUserId: 'system',
          postId: post.id,
          type: 'deal_completed',
          bodyPreview:
            `Giao dịch "${title}" đã tự hoàn thành sau khi hết hạn xác nhận của Sen.`,
          metadata: dealNotifyMeta(post),
          accessToken,
        });
      } catch (err) {
        notifyFailures.push({
          post_id: post.id,
          recipient_user_id: recipientUserId,
          error: err?.message || String(err),
        });
      }
    }
  }

  return {
    ...result,
    completed_count: result.completed.length,
    notify_failures: notifyFailures,
  };
}
