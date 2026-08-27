/** Map breed-recognition API failures to i18n keys (observable user copy). */
export function breedRecognitionErrorI18nKey(code: string | null | undefined): string | null {
  switch (String(code || '').trim()) {
    case 'AI_CREDITS_EXHAUSTED':
      return 'alerts.aiCreditsExhaustedBreed.message';
    case 'AI_PAYLOAD_DUPLICATE_IMAGE':
      return 'breedRecognition.errors.duplicateImage';
    case 'AI_PAYLOAD_PHOTO_REQUIRED':
      return 'breedRecognition.errors.photoRequired';
    case 'AI_PAYLOAD_IMAGE_TOO_SMALL':
      return 'breedRecognition.errors.imageTooSmall';
    case 'AI_PAYLOAD_IMAGE_SIGNATURE_MISMATCH':
      return 'breedRecognition.errors.imageInvalid';
    case 'AI_PAYLOAD_TOO_MANY_PHOTOS':
      return 'breedRecognition.errors.tooManyPhotos';
    case 'REQUEST_TIMEOUT':
      return 'breedRecognition.errors.timeout';
    default:
      return null;
  }
}

function readErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return '';
}

export function breedRecognitionErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  const key = breedRecognitionErrorI18nKey(readErrorCode(error));
  if (key) return t(key);
  const message = readErrorMessage(error);
  if (message) return message;
  return t('common.unknownError');
}
