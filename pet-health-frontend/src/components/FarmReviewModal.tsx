import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  canAddFarmReviewPhoto,
  FARM_REVIEW_BODY_MAX,
  FARM_REVIEW_MAX_PHOTOS,
  farmReviewValidationError,
} from '../utils/farmReview';
import { farmReviewUploadPercent } from '../utils/farmReviewUploadShared';
import { farmReviewUploadProgressLabel } from '../utils/farmReviewUploadProgress';
import {
  uploadFarmReviewPhotoUris,
  type FarmReviewUploadProgress,
} from '../utils/uploadFarmReviewPhotos';

const ACCENT = '#D97706';

export type FarmReviewSubmitPayload = {
  rating: number;
  body: string;
  photoUrls: string[];
};

type FarmReviewModalProps = {
  visible: boolean;
  busy?: boolean;
  error?: string;
  token: string | null;
  onClose: () => void;
  onSubmit: (payload: FarmReviewSubmitPayload) => void | Promise<void>;
};

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          accessibilityRole="button"
          accessibilityLabel={`${star} stars`}
          onPress={() => onChange(star)}
        >
          <Text style={{ fontSize: 28, color: value >= star ? ACCENT : '#CBD5E1' }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function FarmReviewModal({
  visible,
  busy = false,
  error = '',
  token,
  onClose,
  onSubmit,
}: FarmReviewModalProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [localError, setLocalError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<FarmReviewUploadProgress | null>(null);

  useEffect(() => {
    if (!visible) return;
    setRating(0);
    setBody('');
    setPhotoUris([]);
    setLocalError('');
    setUploading(false);
    setUploadProgress(null);
  }, [visible]);

  async function pickPhotos() {
    if (!canAddFarmReviewPhoto(photoUris.length)) {
      Alert.alert(t('common.error'), t('farm.review.photosLimit', { count: FARM_REVIEW_MAX_PHOTOS }));
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('alerts.permissionGallery.title'), t('alerts.permissionGallery.message'));
      return;
    }
    const remaining = FARM_REVIEW_MAX_PHOTOS - photoUris.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (result.canceled || !result.assets.length) return;
    try {
      const resized = await Promise.all(
        result.assets.slice(0, remaining).map((asset) =>
          ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1280 } }],
            { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
          ),
        ),
      );
      setPhotoUris((current) => [...current, ...resized.map((item) => item.uri)].slice(0, FARM_REVIEW_MAX_PHOTOS));
    } catch {
      Alert.alert(t('common.error'), t('farm.review.photoUploadFailed'));
    }
  }

  function removePhoto(uri: string) {
    setPhotoUris((current) => current.filter((item) => item !== uri));
  }

  async function submit() {
    const validationCode = farmReviewValidationError({ rating, body, photoUrls: [] });
    if (validationCode) {
      setLocalError(t(`farm.review.error.${validationCode === 'invalid_rating' ? 'rating' : validationCode === 'body_too_long' ? 'bodyTooLong' : 'tooManyPhotos'}`));
      return;
    }
    if (!token) {
      setLocalError(t('farm.review.loginRequired'));
      return;
    }
    setLocalError('');
    setUploading(true);
    setUploadProgress({
      phase: photoUris.length ? 'uploading_photo' : 'submitting',
      completedSteps: 0,
      totalSteps: photoUris.length + 1,
      current: photoUris.length ? 1 : undefined,
      total: photoUris.length || undefined,
    });
    try {
      const photoUrls = photoUris.length
        ? await uploadFarmReviewPhotoUris(token, photoUris, setUploadProgress)
        : [];
      const submitCode = farmReviewValidationError({ rating, body, photoUrls });
      if (submitCode) {
        setLocalError(t(`farm.review.error.${submitCode === 'invalid_rating' ? 'rating' : submitCode === 'body_too_long' ? 'bodyTooLong' : 'tooManyPhotos'}`));
        return;
      }
      setUploadProgress({
        phase: 'submitting',
        completedSteps: photoUris.length,
        totalSteps: photoUris.length + 1,
      });
      await onSubmit({ rating, body: body.trim(), photoUrls });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('farm.review.photoUploadFailed');
      if (/too large|payload too large|entity too large/i.test(message)) {
        setLocalError(t('farm.review.photosTooLarge'));
      } else {
        setLocalError(message);
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  const disabled = busy || uploading;
  const progressPercent = uploadProgress
    ? farmReviewUploadPercent(uploadProgress.completedSteps, uploadProgress.totalSteps)
    : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/40"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {uploadProgress ? (
          <View className="absolute inset-0 z-20 items-center justify-center bg-[#2B1E19]/35 px-6">
            <View className="w-full max-w-[300px] rounded-2xl border border-[#F0E6D8] bg-[#FDFBF7] px-6 py-8">
              <ActivityIndicator size="large" color={ACCENT} />
              <Text className="mt-4 text-center text-sm font-medium text-[#2B1E19]">
                {farmReviewUploadProgressLabel(uploadProgress, t)}
              </Text>
              <View className="mt-4 h-2 overflow-hidden rounded-full bg-[#F0E6D8]">
                <View
                  className="h-full rounded-full bg-[#D97706]"
                  style={{ width: `${Math.max(4, progressPercent)}%` }}
                />
              </View>
              <Text className="mt-2 text-center text-xs text-[#6E5A51]">
                {t('createPetFeedPost.submitProgress.keepOpen')}
              </Text>
            </View>
          </View>
        ) : null}

        <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-6 pt-5">
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text className="text-lg font-bold text-slate-900">{t('farm.review.modalTitle')}</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">{t('farm.review.modalHint')}</Text>

            <View className="mt-4">
              <StarRow value={rating} onChange={setRating} />
            </View>

            <TextInput
              className="mt-4 min-h-[96px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
              accessibilityLabel={t('farm.review.bodyPlaceholder')}
              placeholder={t('farm.review.bodyPlaceholder')}
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              maxLength={FARM_REVIEW_BODY_MAX}
              value={body}
              onChangeText={setBody}
              editable={!disabled}
            />
            <Text className="mt-1 text-right text-xs text-slate-400">
              {body.length}/{FARM_REVIEW_BODY_MAX}
            </Text>

            <Text className="mt-3 text-sm font-semibold text-slate-700">
              {t('farm.review.photosHint', { count: FARM_REVIEW_MAX_PHOTOS })}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {photoUris.map((uri) => (
                <View key={uri} className="relative h-20 w-20 overflow-hidden rounded-xl bg-slate-100">
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('farm.review.photosRemove')}
                    onPress={() => removePhoto(uri)}
                    disabled={disabled}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1"
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {canAddFarmReviewPhoto(photoUris.length) ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void pickPhotos()}
                  disabled={disabled}
                  className="h-20 w-20 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50"
                >
                  <Ionicons name="image-outline" size={22} color="#64748B" />
                  <Text className="mt-1 text-[10px] font-semibold text-slate-500">{t('farm.review.photosAdd')}</Text>
                </Pressable>
              ) : null}
            </View>

            {localError || error ? (
              <Text className="mt-3 text-sm text-red-600">{localError || error}</Text>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                className="flex-1 rounded-xl border border-slate-200 py-3"
                onPress={onClose}
              >
                <Text className="text-center text-sm font-bold text-slate-700">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                className="flex-1 rounded-xl py-3"
                style={{ backgroundColor: ACCENT, opacity: disabled ? 0.6 : 1 }}
                onPress={() => void submit()}
              >
                <Text className="text-center text-sm font-bold text-white">
                  {busy || uploading ? t('farm.review.submitting') : t('farm.review.submit')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
