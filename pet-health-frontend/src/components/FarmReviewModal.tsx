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
import { uploadFarmReviewPhoto } from '../api';
import {
  canAddFarmReviewPhoto,
  FARM_REVIEW_BODY_MAX,
  FARM_REVIEW_MAX_PHOTOS,
  validateFarmReviewInput,
} from '../utils/farmReview';

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

  useEffect(() => {
    if (!visible) return;
    setRating(0);
    setBody('');
    setPhotoUris([]);
    setLocalError('');
    setUploading(false);
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
    const validationError = validateFarmReviewInput({ rating, body, photoUrls: photoUris });
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    if (!token) {
      setLocalError(t('farm.review.loginRequired'));
      return;
    }
    setLocalError('');
    setUploading(true);
    try {
      const photoUrls: string[] = [];
      for (const uri of photoUris) {
        photoUrls.push(await uploadFarmReviewPhoto(token, uri));
      }
      const submitError = validateFarmReviewInput({ rating, body, photoUrls });
      if (submitError) {
        setLocalError(submitError);
        return;
      }
      await onSubmit({ rating, body: body.trim(), photoUrls });
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : t('farm.review.photoUploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  const disabled = busy || uploading;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/40"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            {uploading ? (
              <View className="mt-3 flex-row items-center gap-2">
                <ActivityIndicator size="small" color={ACCENT} />
                <Text className="text-sm text-slate-500">{t('farm.review.photosUploading')}</Text>
              </View>
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
