"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import {
  isSocialSubmissionType,
  normalizeSocialSubmissionUrl,
  socialSubmissionPlaceholder,
  socialSubmissionUrlError,
  SOCIAL_URL_ERROR_I18N_KEYS,
  type BreederSubmissionType,
} from "@/lib/breederProfileSubmissions";
import { pickLangText, type TrustGuideHowToEarn } from "@/lib/farmTrustGuide";
import {
  breederSubmissionErrorI18nKey,
  earnModalView,
  type TrustGuideEarnAction,
} from "@/lib/trustGuideEarnStatus";
import type { LegalEntityTag } from "@/lib/legalEntityTag";
import { DialogActions } from "@/components/ui/DialogActions";
import { LoadingPopup } from "@/components/ui/LoadingPopup";

const inputCls =
  "w-full px-4 py-2.5 bg-white border border-[#F0E6D8] rounded-xl text-sm text-[#2B1E19] focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]";

async function readApiError(res: Response, lang: Lang) {
  const data = await res.json().catch(() => ({}));
  const mapped = breederSubmissionErrorI18nKey(
    typeof data.code === "string" ? data.code : "",
  );
  if (mapped) throw new Error(t(lang, mapped));
  throw new Error(typeof data.error === "string" ? data.error : t(lang, "common.error"));
}

export function TrustGuideEarnModal({
  lang,
  row,
  action,
  open,
  onClose,
}: {
  lang: Lang;
  row: TrustGuideHowToEarn;
  action: TrustGuideEarnAction;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [sellerLegalType, setSellerLegalType] = useState<LegalEntityTag | "">(
    "",
  );
  const [legalName, setLegalName] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [identityAck, setIdentityAck] = useState(false);

  useEffect(() => {
    if (!open) {
      setError("");
      setSocialUrl("");
      setSellerLegalType("");
      setLegalName("");
      setRegisteredAddress("");
      setTaxId("");
      setLicenseFile(null);
      setIdentityAck(false);
      setBusy(false);
      setSubmitted(false);
    }
  }, [open]);

  const closeAndRefresh = useCallback(() => {
    router.refresh();
    onClose();
  }, [onClose, router]);

  const submitSocial = async (type: BreederSubmissionType) => {
    const normalized = normalizeSocialSubmissionUrl(socialUrl, type);
    const code = socialSubmissionUrlError(normalized, type);
    if (code) {
      setError(t(lang, SOCIAL_URL_ERROR_I18N_KEYS[code]));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/breeder/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionType: type, url: normalized }),
      });
      if (!res.ok) throw await readApiError(res, lang);
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "common.error"));
    } finally {
      setBusy(false);
    }
  };

  const uploadFacilityVideo = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("kind", "facility_video");
      formData.append("file", file, file.name);
      const uploadRes = await fetch("/api/breeder/submissions/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw await readApiError(uploadRes, lang);
      const uploaded = await uploadRes.json();
      const publicUrl = uploaded?.data?.publicUrl;
      if (!publicUrl) throw new Error(t(lang, "common.error"));

      const submitRes = await fetch("/api/breeder/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionType: "facility_video",
          url: publicUrl,
        }),
      });
      if (!submitRes.ok) throw await readApiError(submitRes, lang);
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "common.error"));
    } finally {
      setBusy(false);
    }
  };

  const submitBusinessLicense = async () => {
    if (!sellerLegalType) {
      setError(t(lang, "account.breederDetails.license.legalTypeRequired"));
      return;
    }
    if (!legalName.trim()) {
      setError(t(lang, "account.breederDetails.license.legalNameRequired"));
      return;
    }
    if (!registeredAddress.trim()) {
      setError(t(lang, "account.breederDetails.license.addressRequired"));
      return;
    }
    const digits = taxId.replace(/\D/g, "");
    if (!/^\d{8,14}$/.test(digits)) {
      setError(t(lang, "account.breederDetails.license.taxIdInvalid"));
      return;
    }
    if (!licenseFile) {
      setError(t(lang, "account.breederDetails.license.fileRequired"));
      return;
    }
    if (!identityAck) {
      setError(t(lang, "account.breederDetails.license.ackRequired"));
      return;
    }

    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("kind", "business_license");
      formData.append("file", licenseFile, licenseFile.name);
      const uploadRes = await fetch("/api/breeder/submissions/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw await readApiError(uploadRes, lang);
      const uploaded = await uploadRes.json();
      const publicUrl = uploaded?.data?.publicUrl;
      if (!publicUrl) throw new Error(t(lang, "common.error"));

      const submitRes = await fetch("/api/breeder/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionType: "business_license",
          url: publicUrl,
          sellerLegalType,
          legalName: legalName.trim(),
          registeredAddress: registeredAddress.trim(),
          taxId: digits,
        }),
      });
      if (!submitRes.ok) throw await readApiError(submitRes, lang);
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "common.error"));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const title = pickLangText(lang, row.titleVI, row.titleEN);
  const how = pickLangText(lang, row.howVI, row.howEN);
  const submissionType =
    action.kind === "submission" ? action.submissionType : null;
  const isSocial = Boolean(
    submissionType && isSocialSubmissionType(submissionType),
  );
  const isFacility = submissionType === "facility_video";
  const isLicense = submissionType === "business_license";
  const isUpload = isFacility || isLicense;
  const view = earnModalView({ busy, submitted });
  const loadingLabel = isUpload
    ? t(lang, "account.breederDetails.uploading")
    : t(lang, "account.breederDetails.submitting");

  return (
    <>
      {view === "loading" ? <LoadingPopup label={loadingLabel} /> : null}
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2B1E19]/45 backdrop-blur-[2px] p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trust-guide-earn-modal-title"
        onClick={() => {
          if (view === "loading") return;
          if (view === "success") closeAndRefresh();
          else onClose();
        }}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-[#F0E6D8] bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id="trust-guide-earn-modal-title"
            className="text-base font-bold text-[#2B1E19]"
          >
            {title}
          </h2>

          {view === "success" ? (
            <>
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 space-y-2">
                <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                  {t(lang, "account.breederDetails.status.pending")}
                </span>
                <p className="text-sm font-medium text-emerald-800" role="status">
                  {t(lang, "account.breederDetails.submitSuccess")}
                </p>
              </div>
              <DialogActions>
                <button
                  type="button"
                  onClick={closeAndRefresh}
                  className="flex-1 rounded-xl bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {t(lang, "warranty.close")}
                </button>
              </DialogActions>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-[#5C4A3A] leading-relaxed">{how}</p>

              {error ? (
                <p className="mt-3 text-xs font-medium text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="mt-4 space-y-3">
                {isSocial && submissionType ? (
                  <input
                    type={submissionType === "social_zalo" ? "tel" : "url"}
                    className={inputCls}
                    placeholder={socialSubmissionPlaceholder(submissionType)}
                    inputMode={submissionType === "social_zalo" ? "tel" : "url"}
                    value={socialUrl}
                    disabled={busy}
                    onChange={(e) => setSocialUrl(e.target.value)}
                  />
                ) : null}

                {isFacility ? (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E8D5B5] bg-[#FFFBF5] px-4 py-8 cursor-pointer hover:border-[#D97706]">
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="sr-only"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadFacilityVideo(file);
                        e.target.value = "";
                      }}
                    />
                    <span className="text-sm font-semibold text-[#D97706]">
                      {t(lang, "account.breederDetails.chooseFile")}
                    </span>
                    <span className="text-xs text-center text-[#6E5A51]">
                      {t(lang, "account.breederDetails.facilityHint")}
                    </span>
                  </label>
                ) : null}

                {isLicense ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          ["household_business", "farm.legalEntity.householdBusiness"],
                          ["enterprise", "farm.legalEntity.enterprise"],
                        ] as const
                      ).map(([value, key]) => (
                        <button
                          key={value}
                          type="button"
                          disabled={busy}
                          onClick={() => setSellerLegalType(value)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                            sellerLegalType === value
                              ? "border-[#D97706] bg-amber-50 text-[#B45309]"
                              : "border-[#F0E6D8] bg-white text-[#5C4A3A]"
                          }`}
                        >
                          {t(lang, key)}
                        </button>
                      ))}
                    </div>
                    <input
                      className={inputCls}
                      placeholder={t(
                        lang,
                        "account.breederDetails.license.legalNamePlaceholder",
                      )}
                      value={legalName}
                      disabled={busy}
                      onChange={(e) => setLegalName(e.target.value)}
                    />
                    <input
                      className={inputCls}
                      placeholder={t(
                        lang,
                        "account.breederDetails.license.addressPlaceholder",
                      )}
                      value={registeredAddress}
                      disabled={busy}
                      onChange={(e) => setRegisteredAddress(e.target.value)}
                    />
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      placeholder={t(
                        lang,
                        "account.breederDetails.license.taxIdPlaceholder",
                      )}
                      value={taxId}
                      disabled={busy}
                      onChange={(e) => setTaxId(e.target.value)}
                    />
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E8D5B5] bg-[#FFFBF5] px-4 py-6 cursor-pointer hover:border-[#D97706]">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
                        disabled={busy}
                        onChange={(e) => {
                          setLicenseFile(e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                      />
                      <span className="text-sm font-semibold text-[#D97706]">
                        {licenseFile
                          ? licenseFile.name
                          : t(lang, "account.breederDetails.chooseFile")}
                      </span>
                      <span className="text-xs text-center text-[#6E5A51]">
                        {t(lang, "account.breederDetails.licenseHint")}
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-xs text-[#5C4A3A]">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={identityAck}
                        disabled={busy}
                        onChange={(e) => setIdentityAck(e.target.checked)}
                      />
                      <span>
                        {t(lang, "account.breederDetails.license.ackLabel")}
                      </span>
                    </label>
                  </>
                ) : null}
              </div>

              <DialogActions>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {t(lang, "warranty.close")}
                </button>
                {action.kind === "profile" ? (
                  <Link
                    href="/app/account/breeder"
                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white"
                    onClick={onClose}
                  >
                    {t(lang, "farm.trust.guide.earnOpenProfile")}
                  </Link>
                ) : null}
                {action.kind === "warranty" ? (
                  <Link
                    href="/app/account/warranty"
                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white"
                    onClick={onClose}
                  >
                    {t(lang, "farm.trust.guide.earnOpenWarranty")}
                  </Link>
                ) : null}
                {isSocial && submissionType ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submitSocial(submissionType)}
                    className="flex-1 rounded-xl bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t(lang, "account.breederDetails.submit")}
                  </button>
                ) : null}
                {isLicense ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submitBusinessLicense()}
                    className="flex-1 rounded-xl bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t(lang, "account.breederDetails.uploadSubmit")}
                  </button>
                ) : null}
              </DialogActions>
            </>
          )}
        </div>
      </div>
    </>
  );
}
