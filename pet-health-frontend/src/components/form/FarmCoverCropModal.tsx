import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image as RNImage,
  Modal,
  PanResponder,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { farmPhotoResizeWidth } from '../../utils/farmPhotos';
import {
  COVER_CROP_MAX_SCALE,
  COVER_CROP_MIN_SCALE,
  clampCoverTransform,
  computeCoverCropRect,
  coverCropSourceFromPicker,
  coverCropViewportSize,
  coverImageDisplaySize,
  type CoverCropSource,
  type CoverCropTransform,
} from '../../utils/farmCoverCrop';
import { modalBottomInset, modalTopInset } from '../../utils/modalSafeArea';

const PRIMARY = '#D97706';

export async function resolveCoverCropSource(asset: {
  uri: string;
  width?: number | null;
  height?: number | null;
}): Promise<CoverCropSource> {
  const parsed = coverCropSourceFromPicker(asset);
  if (parsed) return parsed;
  return new Promise((resolve, reject) => {
    RNImage.getSize(
      asset.uri,
      (width, height) => resolve({ uri: asset.uri, width, height }),
      reject,
    );
  });
}

type FarmCoverCropModalProps = {
  source: CoverCropSource | null;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => void;
  title?: string;
  hint?: string;
  confirmLabel?: string;
  failedLabel?: string;
  viewportSize?: { width: number; height: number };
  resizeWidth?: number;
};

export function FarmCoverCropModal({
  source,
  onCancel,
  onConfirm,
  title,
  hint,
  confirmLabel,
  failedLabel,
  viewportSize,
  resizeWidth,
}: FarmCoverCropModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const viewport = useMemo(
    () => viewportSize ?? coverCropViewportSize(Dimensions.get('window').width),
    [viewportSize],
  );
  const outputWidth = resizeWidth ?? farmPhotoResizeWidth('cover');
  const cropTitle = title ?? t('breederProfile.coverCropTitle');
  const cropHint = hint ?? t('breederProfile.coverCropHint');
  const cropConfirm = confirmLabel ?? t('breederProfile.coverCropConfirm');
  const cropFailed = failedLabel ?? t('breederProfile.coverCropFailed');
  const [resolved, setResolved] = useState<CoverCropSource | null>(source);
  const [transform, setTransform] = useState<CoverCropTransform>({ tx: 0, ty: 0, scale: 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const transformRef = useRef(transform);
  const gestureStartRef = useRef(transform);
  const resolvedRef = useRef(resolved);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    resolvedRef.current = resolved;
  }, [resolved]);

  useEffect(() => {
    let cancelled = false;
    setTransform({ tx: 0, ty: 0, scale: 1 });
    setError('');
    setBusy(false);
    if (!source) {
      setResolved(null);
      return;
    }
    if (source.width > 0 && source.height > 0) {
      setResolved(source);
      return;
    }
    RNImage.getSize(
      source.uri,
      (width, height) => {
        if (!cancelled) setResolved({ uri: source.uri, width, height });
      },
      () => {
        if (!cancelled) setResolved(source);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [source]);

  function applyTransform(next: CoverCropTransform) {
    const image = resolvedRef.current;
    if (!image) return;
    const clamped = clampCoverTransform(
      image.width,
      image.height,
      viewport.width,
      viewport.height,
      next,
    );
    transformRef.current = clamped;
    setTransform(clamped);
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          gestureStartRef.current = transformRef.current;
        },
        onPanResponderMove: (_event, gesture) => {
          const image = resolvedRef.current;
          if (!image) return;
          const next = clampCoverTransform(
            image.width,
            image.height,
            viewport.width,
            viewport.height,
            {
              ...gestureStartRef.current,
              tx: gestureStartRef.current.tx + gesture.dx,
              ty: gestureStartRef.current.ty + gesture.dy,
            },
          );
          transformRef.current = next;
          setTransform(next);
        },
      }),
    [viewport.height, viewport.width],
  );

  const display = resolved
    ? coverImageDisplaySize(
        resolved.width,
        resolved.height,
        viewport.width,
        viewport.height,
        transform.scale,
      )
    : { width: viewport.width, height: viewport.height };

  async function confirm() {
    if (!resolved || busy) return;
    setBusy(true);
    setError('');
    try {
      const crop = computeCoverCropRect(
        resolved.width,
        resolved.height,
        viewport.width,
        viewport.height,
        transform,
      );
      const result = await ImageManipulator.manipulateAsync(
        resolved.uri,
        [
          { crop },
          { resize: { width: outputWidth } },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      onConfirm(result.uri);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : cropFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={Boolean(source)} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        className="flex-1 bg-slate-950/80"
        style={{
          paddingTop: modalTopInset(insets.top) + 8,
          paddingBottom: modalBottomInset(insets.bottom, 16),
        }}
      >
        <Text className="px-5 text-center text-lg font-bold text-white">
          {cropTitle}
        </Text>
        <Text className="mt-2 px-6 text-center text-sm leading-5 text-white/80">
          {cropHint}
        </Text>

        <View className="mt-6 items-center px-5">
          <View
            className="overflow-hidden rounded-xl border border-white/20 bg-black"
            style={{ width: viewport.width, height: viewport.height }}
            {...panResponder.panHandlers}
          >
            {resolved ? (
              <Image
                pointerEvents="none"
                source={{ uri: resolved.uri }}
                contentFit="fill"
                style={{
                  position: 'absolute',
                  width: display.width,
                  height: display.height,
                  left: (viewport.width - display.width) / 2 + transform.tx,
                  top: (viewport.height - display.height) / 2 + transform.ty,
                }}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </View>
        </View>

        <View className="mt-5 flex-row items-center justify-center gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('breederProfile.coverCropZoomOut')}
            disabled={!resolved || transform.scale <= COVER_CROP_MIN_SCALE}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/15"
            onPress={() => applyTransform({ ...transform, scale: transform.scale - 0.25 })}
          >
            <Ionicons name="remove" size={22} color="#fff" />
          </Pressable>
          <Text className="w-14 text-center text-sm font-semibold text-white">
            {Math.round(transform.scale * 100)}%
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('breederProfile.coverCropZoomIn')}
            disabled={!resolved || transform.scale >= COVER_CROP_MAX_SCALE}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/15"
            onPress={() => applyTransform({ ...transform, scale: transform.scale + 0.25 })}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        {error ? (
          <Text className="mt-4 px-5 text-center text-sm text-red-300">{error}</Text>
        ) : null}

        <View className="mt-auto flex-row gap-3 px-5">
          <Pressable
            className="flex-1 rounded-xl border border-white/25 py-3"
            disabled={busy}
            onPress={onCancel}
          >
            <Text className="text-center text-sm font-bold text-white">{t('breederProfile.coverCropCancel')}</Text>
          </Pressable>
          <Pressable
            className="flex-1 rounded-xl py-3"
            style={{ backgroundColor: busy ? '#FDBA74' : PRIMARY }}
            disabled={busy || !resolved}
            onPress={() => void confirm()}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center text-sm font-bold text-white">
                {cropConfirm}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
