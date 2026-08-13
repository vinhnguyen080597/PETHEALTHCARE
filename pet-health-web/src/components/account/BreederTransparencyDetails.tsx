"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiBreederProfile, Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import {
  BREEDER_SUBMISSION_TYPES,
  breederSubmissionTypeLabel,
  normalizeSocialSubmissionUrl,
  socialSubmissionPlaceholder,
  socialSubmissionUrlError,
  SOCIAL_URL_ERROR_I18N_KEYS,
  submissionStatusForType,
  type BreederProfileSubmission,
  type BreederSubmissionType,
} from "@/lib/breederProfileSubmissions";

const SOCIAL_TYPES = BREEDER_SUBMISSION_TYPES.filter((type) =>
  type.startsWith("social_"),
);

const inputCls =
  "w-full px-4 py-2.5 bg-white border border-[#F0E6D8] rounded-xl text-sm text-[#2B1E19] focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]";

function statusBadge(status: string, lang: Lang) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-800 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const labelKey = `account.breederDetails.status.${status}` as EnKey;
  const label =
    status === "pending" || status === "approved" || status === "rejected" || status === "cancelled"
      ? t(lang, labelKey)
      : status;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[status] || map.pending}`}>
      {label}
    </span>
  );
}

async function readApiError(res: Response, lang: Lang) {
  const data = await res.json().catch(() => ({}));
  throw new Error(typeof data.error === "string" ? data.error : t(lang, "common.error"));
}

export function BreederTransparencyDetails({
  lang,
  profile,
}: {
  lang: Lang;
  profile: ApiBreederProfile | null;
}) {
  const [submissions, setSubmissions] = useState<BreederProfileSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [socialUrls, setSocialUrls] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const isVerified = profile?.verification_status === "verified";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/breeder/submissions", { cache: "no-store" });
      if (!res.ok) throw await readApiError(res, lang);
      const json = await res.json();
      setSubmissions(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setSubmissions([]);
      setError(err instanceof Error ? err.message : t(lang, "common.error"));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    if (isVerified) void load();
    else setLoading(false);
  }, [isVerified, load]);

  const latestByType = useMemo(() => {
    const map = new Map<BreederSubmissionType, BreederProfileSubmission>();
    for (const type of BREEDER_SUBMISSION_TYPES) {
      const row = submissionStatusForType(submissions, type);
      if (row) map.set(type, row);
    }
    return map;
  }, [submissions]);

  const submitSocial = async (type: BreederSubmissionType) => {
    const url = normalizeSocialSubmissionUrl(socialUrls[type] || "", type);
    const code = socialSubmissionUrlError(url, type);
    if (code) {
      setError(t(lang, SOCIAL_URL_ERROR_I18N_KEYS[code]));
      return;
    }
    setBusy(type);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/breeder/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionType: type, url }),
      });
      if (!res.ok) throw await readApiError(res, lang);
      setSocialUrls((cur) => ({ ...cur, [type]: "" }));
      setMessage(t(lang, "account.breederDetails.submitSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "common.error"));
    } finally {
      setBusy(null);
    }
  };

  const uploadMedia = async (type: "facility_video" | "business_license", file: File) => {
    setBusy(type);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("kind", type);
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
        body: JSON.stringify({ submissionType: type, url: publicUrl }),
      });
      if (!submitRes.ok) throw await readApiError(submitRes, lang);
      setMessage(t(lang, "account.breederDetails.submitSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "common.error"));
    } finally {
      setBusy(null);
    }
  };

  if (!profile) return null;

  if (!isVerified) {
    return (
      <section className="mt-8 rounded-2xl border border-[#F3E2C8] bg-[#FFFBF5] p-5">
        <h2 className="text-sm font-bold text-[#2B1E19]">
          {t(lang, "account.breederDetails.title")}
        </h2>
        <p className="mt-2 text-sm text-[#6E5A51]">
          {t(lang, "account.breederDetails.verifiedOnly")}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#F3E2C8] bg-white p-5 lg:p-6">
      <h2 className="text-sm font-bold text-[#2B1E19]">
        {t(lang, "account.breederDetails.title")}
      </h2>
      <p className="mt-1 text-sm text-[#6E5A51] leading-relaxed">
        {t(lang, "account.breederDetails.subtitle")}
      </p>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm font-medium text-emerald-700" role="status">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-[#6E5A51]">{t(lang, "common.loading")}</p>
      ) : (
        <div className="mt-5 space-y-6">
          {(["facility_video", "business_license"] as const).map((type) => {
            const row = latestByType.get(type);
            const accept =
              type === "facility_video" ? "video/mp4,video/webm,video/quicktime" : "image/*,application/pdf";
            return (
              <div key={type} className="rounded-xl border border-[#F0E6D8] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#2B1E19]">
                    {breederSubmissionTypeLabel(type, lang)}
                  </h3>
                  {row ? statusBadge(row.status, lang) : null}
                </div>
                <p className="mt-1 text-xs text-[#6E5A51]">
                  {t(lang, type === "facility_video" ? "account.breederDetails.facilityHint" : "account.breederDetails.licenseHint")}
                </p>
                {row?.payload?.url && row.status !== "rejected" ? (
                  <p className="mt-2 text-xs text-[#5C4A3A] break-all">{row.payload.url}</p>
                ) : null}
                {row?.status === "rejected" && row.rejection_reason ? (
                  <p className="mt-2 text-xs text-red-700">{row.rejection_reason}</p>
                ) : null}
                {(!row || row.status === "rejected" || row.status === "cancelled") && (
                  <label className="mt-3 inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept={accept}
                      className="text-xs"
                      disabled={busy === type}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadMedia(type, file);
                        e.target.value = "";
                      }}
                    />
                    <span className="text-xs font-semibold text-[#D97706]">
                      {busy === type
                        ? t(lang, "account.breederDetails.uploading")
                        : t(lang, "account.breederDetails.uploadSubmit")}
                    </span>
                  </label>
                )}
              </div>
            );
          })}

          <div className="rounded-xl border border-[#F0E6D8] p-4">
            <h3 className="text-sm font-semibold text-[#2B1E19]">
              {t(lang, "account.breederDetails.socialTitle")}
            </h3>
            <p className="mt-1 text-xs text-[#6E5A51]">
              {t(lang, "account.breederDetails.socialHint")}
            </p>
            <div className="mt-4 space-y-4">
              {SOCIAL_TYPES.map((type) => {
                const row = latestByType.get(type);
                const pending = row?.status === "pending";
                const approved = row?.status === "approved";
                return (
                  <div key={type}>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-[#6E5A51]">
                        {breederSubmissionTypeLabel(type, lang)}
                      </span>
                      {row ? statusBadge(row.status, lang) : null}
                    </div>
                    {approved && row?.payload?.url ? (
                      <p className="text-xs text-[#5C4A3A] break-all">{row.payload.url}</p>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type={type === "social_zalo" ? "tel" : "url"}
                          className={inputCls}
                          placeholder={socialSubmissionPlaceholder(type)}
                          inputMode={type === "social_zalo" ? "tel" : "url"}
                          value={socialUrls[type] || ""}
                          disabled={pending || busy === type}
                          onChange={(e) =>
                            setSocialUrls((cur) => ({ ...cur, [type]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          disabled={pending || busy === type}
                          onClick={() => void submitSocial(type)}
                          className="shrink-0 px-4 py-2.5 rounded-xl bg-[#D97706] text-white text-sm font-semibold disabled:opacity-50"
                        >
                          {t(lang, "account.breederDetails.submit")}
                        </button>
                      </div>
                    )}
                    {row?.status === "rejected" && row.rejection_reason ? (
                      <p className="mt-1 text-xs text-red-700">{row.rejection_reason}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
