import { Alert, Platform } from 'react-native';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Confirm destructive admin moderation (violation uphold / suspend).
 * Web uses window.confirm; native uses Alert.
 */
export function confirmAdminModeration(
  kind: 'violation' | 'suspend',
  t: Translate,
  onConfirm: () => void,
) {
  const title = t(kind === 'violation' ? 'adminReview.confirmViolationTitle' : 'adminReview.confirmSuspendTitle');
  const body = t(kind === 'violation' ? 'adminReview.confirmViolationBody' : 'adminReview.confirmSuspendBody');
  const confirmLabel = t(kind === 'violation' ? 'adminReview.markReviewed' : 'adminReview.suspend');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${title}\n\n${body}`)) onConfirm();
    return;
  }

  Alert.alert(title, body, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
