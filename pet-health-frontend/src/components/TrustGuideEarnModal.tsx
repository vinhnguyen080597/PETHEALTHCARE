import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ApiRequestError,
  createBreederProfileSubmission,
  uploadBreederTransparencyMedia,
} from '../api';
import {
  isSocialSubmissionType,
  normalizeSocialSubmissionUrl,
  SOCIAL_URL_ERROR_I18N_KEYS,
  socialSubmissionPlaceholder,
  socialSubmissionUrlError,
  type BreederSubmissionType,
} from '../utils/breederProfileSubmissions';
import { pickLangText, type TrustGuideHowToEarn } from '../utils/farmTrustGuide';
import {
  breederSubmissionErrorI18nKey,
  earnModalView,
  isUploadSubmissionType,
  type TrustGuideEarnAction,
} from '../utils/trustGuideEarnStatus';
import type { LegalEntityTag } from '../utils/legalEntityTag';

type TrustGuideEarnModalProps = {
  visible: boolean;
  token: string;
  row: TrustGuideHowToEarn;
  action: TrustGuideEarnAction;
  onClose: () => void;
  onSubmitted?: () => void;
  onOpenBreederProfile?: () => void;
  onOpenWarranty?: () => void;
};

export function TrustGuideEarnModal({
  visible,
  token,
  row,
  action,
  onClose,
  onSubmitted,
  onOpenBreederProfile,
  onOpenWarranty,
}: TrustGuideEarnModalProps) {
  const { t, i18n } = useTranslation();
  const lang = String(i18n.language || '').toLowerCase().startsWith('vi') ? 'VI' : 'EN';
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [sellerLegalType, setSellerLegalType] = useState<LegalEntityTag | ''>('');
  const [legalName, setLegalName] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [licenseUri, setLicenseUri] = useState('');
  const [identityAck, setIdentityAck] = useState(false);

  useEffect(() => {
    if (!visible) {
      setError('');
      setSocialUrl('');
      setSellerLegalType('');
      setLegalName('');
      setRegisteredAddress('');
      setTaxId('');
      setLicenseUri('');
      setIdentityAck(false);
      setBusy(false);
      setSubmitted(false);
    }
  }, [visible]);

  const submissionType = action.kind === 'submission' ? action.submissionType : null;
  const isSocial = Boolean(submissionType && isSocialSubmissionType(submissionType));
  const isFacility = submissionType === 'facility_video';
  const isLicense = submissionType === 'business_license';
  const isUpload = Boolean(submissionType && isUploadSubmissionType(submissionType));
  const view = earnModalView({ busy, submitted });
  const title = pickLangText(lang, row.titleVI, row.titleEN);
  const how = pickLangText(lang, row.howVI, row.howEN);

  function mapError(err: unknown): string {
    if (err instanceof ApiRequestError && err.code) {
      const key = breederSubmissionErrorI18nKey(err.code);
      if (key) return t(key);
    }
    if (err instanceof Error && err.message) return err.message;
    return t('common.unknownError');
  }

  async function submitSocial(type: BreederSubmissionType) {
    const normalized = normalizeSocialSubmissionUrl(socialUrl, type);
    const code = socialSubmissionUrlError(normalized, type);
    if (code) {
      setError(t(SOCIAL_URL_ERROR_I18N_KEYS[code]));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createBreederProfileSubmission(token, { submissionType: type, url: normalized });
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      setError(mapError(err));
    } finally {
      setBusy(false);
    }
  }

  async function pickAndUploadFacility() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('common.unknownError'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85,
      videoMaxDuration: 120,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    setBusy(true);
    setError('');
    try {
      const uploaded = await uploadBreederTransparencyMedia(token, 'facility_video', asset.uri, {
        mimeHint: asset.mimeType ?? 'video/mp4',
      });
      const publicUrl = uploaded.data?.publicUrl;
      if (!publicUrl) throw new Error(t('common.unknownError'));
      await createBreederProfileSubmission(token, {
        submissionType: 'facility_video',
        url: publicUrl,
      });
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      setError(mapError(err));
    } finally {
      setBusy(false);
    }
  }

  async function pickLicenseImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('common.unknownError'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setLicenseUri(result.assets[0].uri);
  }

  async function submitBusinessLicense() {
    if (!sellerLegalType) {
      setError(t('account.breederDetails.license.legalTypeRequired'));
      return;
    }
    if (!legalName.trim()) {
      setError(t('account.breederDetails.license.legalNameRequired'));
      return;
    }
    if (!registeredAddress.trim()) {
      setError(t('account.breederDetails.license.addressRequired'));
      return;
    }
    const digits = taxId.replace(/\D/g, '');
    if (!/^\d{8,14}$/.test(digits)) {
      setError(t('account.breederDetails.license.taxIdInvalid'));
      return;
    }
    if (!licenseUri) {
      setError(t('account.breederDetails.license.fileRequired'));
      return;
    }
    if (!identityAck) {
      setError(t('account.breederDetails.license.ackRequired'));
      return;
    }

    setBusy(true);
    setError('');
    try {
      const uploaded = await uploadBreederTransparencyMedia(token, 'business_license', licenseUri, {
        mimeHint: 'image/jpeg',
      });
      const publicUrl = uploaded.data?.publicUrl;
      if (!publicUrl) throw new Error(t('common.unknownError'));
      await createBreederProfileSubmission(token, {
        submissionType: 'business_license',
        url: publicUrl,
        sellerLegalType,
        legalName: legalName.trim(),
        registeredAddress: registeredAddress.trim(),
        taxId: digits,
      });
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      setError(mapError(err));
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    if (view === 'loading') return;
    if (view === 'success') {
      onSubmitted?.();
      onClose();
      return;
    }
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        testID="trust-guide-earn-modal-backdrop"
        className="flex-1 justify-center bg-black/45 px-5"
        onPress={handleClose}
      >
        <Pressable
          testID="trust-guide-earn-modal"
          className="max-h-[88%] rounded-2xl border border-[#F0E6D8] bg-white p-5"
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text className="text-base font-bold text-[#2B1E19]">{title}</Text>

            {view === 'success' ? (
              <View className="mt-4">
                <View className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <Text className="self-start rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    {t('account.breederDetails.status.pending')}
                  </Text>
                  <Text className="mt-2 text-sm font-medium text-emerald-800">
                    {t('account.breederDetails.submitSuccess')}
                  </Text>
                </View>
                <Pressable
                  className="mt-4 rounded-xl bg-[#D97706] py-3 active:opacity-90"
                  onPress={handleClose}
                >
                  <Text className="text-center text-sm font-bold text-white">{t('common.done')}</Text>
                </Pressable>
              </View>
            ) : (
              <View className="mt-2">
                <Text className="text-sm leading-5 text-[#5C4A3A]">{how}</Text>
                {error ? (
                  <Text className="mt-3 text-xs font-semibold text-red-600" accessibilityRole="alert">
                    {error}
                  </Text>
                ) : null}

                {isSocial && submissionType ? (
                  <TextInput
                    testID="trust-guide-earn-social-input"
                    className="mt-4 rounded-xl border border-[#F0E6D8] bg-white px-4 py-3 text-sm text-[#2B1E19]"
                    placeholder={socialSubmissionPlaceholder(submissionType)}
                    placeholderTextColor="#94A3B8"
                    keyboardType={submissionType === 'social_zalo' ? 'phone-pad' : 'url'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={socialUrl}
                    editable={!busy}
                    onChangeText={setSocialUrl}
                  />
                ) : null}

                {isFacility ? (
                  <Pressable
                    testID="trust-guide-earn-upload-button"
                    disabled={busy}
                    className="mt-4 items-center rounded-xl border-2 border-dashed border-[#E8D5B5] bg-[#FFFBF5] px-4 py-8 active:opacity-90"
                    onPress={() => void pickAndUploadFacility()}
                  >
                    {busy ? (
                      <ActivityIndicator color="#D97706" />
                    ) : (
                      <>
                        <Text className="text-sm font-bold text-[#D97706]">
                          {t('account.breederDetails.chooseFile')}
                        </Text>
                        <Text className="mt-2 text-center text-xs text-[#6E5A51]">
                          {t('account.breederDetails.facilityHint')}
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : null}

                {isLicense ? (
                  <View className="mt-4 gap-3">
                    <View className="flex-row gap-2">
                      {(
                        [
                          ['household_business', 'farm.legalEntity.householdBusiness'],
                          ['enterprise', 'farm.legalEntity.enterprise'],
                        ] as const
                      ).map(([value, key]) => (
                        <Pressable
                          key={value}
                          disabled={busy}
                          className={`flex-1 rounded-xl border px-3 py-2.5 ${
                            sellerLegalType === value
                              ? 'border-[#D97706] bg-amber-50'
                              : 'border-[#F0E6D8] bg-white'
                          }`}
                          onPress={() => setSellerLegalType(value)}
                        >
                          <Text
                            className={`text-center text-sm font-semibold ${
                              sellerLegalType === value ? 'text-[#B45309]' : 'text-[#5C4A3A]'
                            }`}
                          >
                            {t(key)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      className="rounded-xl border border-[#F0E6D8] bg-white px-4 py-3 text-sm text-[#2B1E19]"
                      placeholder={t('account.breederDetails.license.legalNamePlaceholder')}
                      placeholderTextColor="#94A3B8"
                      value={legalName}
                      editable={!busy}
                      onChangeText={setLegalName}
                    />
                    <TextInput
                      className="rounded-xl border border-[#F0E6D8] bg-white px-4 py-3 text-sm text-[#2B1E19]"
                      placeholder={t('account.breederDetails.license.addressPlaceholder')}
                      placeholderTextColor="#94A3B8"
                      value={registeredAddress}
                      editable={!busy}
                      onChangeText={setRegisteredAddress}
                    />
                    <TextInput
                      className="rounded-xl border border-[#F0E6D8] bg-white px-4 py-3 text-sm text-[#2B1E19]"
                      placeholder={t('account.breederDetails.license.taxIdPlaceholder')}
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      value={taxId}
                      editable={!busy}
                      onChangeText={setTaxId}
                    />
                    <Pressable
                      disabled={busy}
                      className="items-center rounded-xl border-2 border-dashed border-[#E8D5B5] bg-[#FFFBF5] px-4 py-6"
                      onPress={() => void pickLicenseImage()}
                    >
                      <Text className="text-sm font-bold text-[#D97706]">
                        {licenseUri
                          ? t('account.breederDetails.chooseFile')
                          : t('account.breederDetails.chooseFile')}
                      </Text>
                      <Text className="mt-2 text-center text-xs text-[#6E5A51]">
                        {licenseUri
                          ? t('account.breederDetails.status.pending')
                          : t('account.breederDetails.licenseHint')}
                      </Text>
                    </Pressable>
                    <Pressable
                      className="flex-row items-start gap-2"
                      onPress={() => setIdentityAck((v) => !v)}
                    >
                      <View
                        className={`mt-0.5 h-4 w-4 rounded border ${
                          identityAck ? 'border-[#D97706] bg-[#D97706]' : 'border-[#F0E6D8]'
                        }`}
                      />
                      <Text className="flex-1 text-xs leading-4 text-[#5C4A3A]">
                        {t('account.breederDetails.license.ackLabel')}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <View className="mt-4 flex-row gap-3">
                  <Pressable
                    className="flex-1 rounded-xl border border-slate-200 py-3 active:bg-slate-50"
                    disabled={busy}
                    onPress={onClose}
                  >
                    <Text className="text-center text-sm font-semibold text-slate-600">
                      {t('common.cancel')}
                    </Text>
                  </Pressable>

                  {action.kind === 'profile' ? (
                    <Pressable
                      className="flex-1 rounded-xl bg-[#D97706] py-3 active:opacity-90"
                      onPress={() => {
                        onClose();
                        onOpenBreederProfile?.();
                      }}
                    >
                      <Text className="text-center text-sm font-bold text-white">
                        {t('farm.trust.guide.earnOpenProfile')}
                      </Text>
                    </Pressable>
                  ) : null}

                  {action.kind === 'warranty' ? (
                    <Pressable
                      className="flex-1 rounded-xl bg-[#D97706] py-3 active:opacity-90"
                      onPress={() => {
                        onClose();
                        onOpenWarranty?.();
                      }}
                    >
                      <Text className="text-center text-sm font-bold text-white">
                        {t('farm.trust.guide.earnOpenWarranty')}
                      </Text>
                    </Pressable>
                  ) : null}

                  {isSocial && submissionType ? (
                    <Pressable
                      testID="trust-guide-earn-submit-button"
                      className={`flex-1 rounded-xl bg-[#D97706] py-3 ${busy ? 'opacity-60' : 'active:opacity-90'}`}
                      disabled={busy}
                      onPress={() => void submitSocial(submissionType)}
                    >
                      {busy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-center text-sm font-bold text-white">
                          {t('account.breederDetails.submit')}
                        </Text>
                      )}
                    </Pressable>
                  ) : null}

                  {isLicense ? (
                    <Pressable
                      testID="trust-guide-earn-license-submit"
                      className={`flex-1 rounded-xl bg-[#D97706] py-3 ${busy ? 'opacity-60' : 'active:opacity-90'}`}
                      disabled={busy}
                      onPress={() => void submitBusinessLicense()}
                    >
                      {busy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-center text-sm font-bold text-white">
                          {t('account.breederDetails.uploadSubmit')}
                        </Text>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
