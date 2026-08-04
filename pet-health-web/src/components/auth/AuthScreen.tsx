"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { isSupabaseConfigured } from "@/lib/config";
import {
  SIGNUP_OTP_LENGTH,
  fillEmail,
  isValidEmail,
  resolveAuthError,
  resolveForgotError,
  resolveOtpError,
} from "@/lib/authErrors";

const AUTH_HERO =
  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=1400&h=1800&fit=crop&auto=format";

type AuthTab = "login" | "register";
type AuthStep = "form" | "otp" | "forgot" | "forgot-apply";
type OAuthProvider = "google" | "facebook";

const inputCls =
  "w-full px-4 py-3 bg-white border border-[#F0E6D8] rounded-xl text-sm text-[#2B1E19] placeholder:text-stone-400 focus:outline-none focus:border-[#D97706] focus:ring-4 focus:ring-amber-500/10 transition-all duration-200";
const inputErrorCls = "border-red-400 focus:border-red-400 focus:ring-red-500/10";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#EA4335"
        d="M9 7.2v3.6h5.1c-.2 1.2-1.5 3.5-5.1 3.5A5.9 5.9 0 1 1 9 3.1c1.7 0 2.8.7 3.4 1.3l2.3-2.2C13.5.9 11.5 0 9 0 4 0 0 4 0 9s4 9 9 9c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.2-1.5H9z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M3 3l18 18M10.5 10.7a2 2 0 0 0 2.8 2.8M9.2 5.5A9.8 9.8 0 0 1 12 5c5 0 9.3 3.1 11 7-.5 1.2-1.2 2.3-2.1 3.2M6.7 6.7C4.8 7.9 3.3 9.6 2.2 12c1.7 3.9 6 7 9.8 7 1.4 0 2.7-.3 3.9-.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
}

function mapOAuthQueryError(lang: Lang, raw: string) {
  const value = raw.trim().toLowerCase();
  if (!value) return "";
  if (value === "oauth_not_configured") return t(lang, "auth.oauth.notConfigured");
  if (value === "oauth_missing_code" || value === "oauth_exchange_failed" || value === "oauth_failed") {
    return t(lang, "auth.oauth.failed");
  }
  if (value.includes("access_denied") || value.includes("user denied")) {
    return t(lang, "auth.oauth.cancelled");
  }
  // Supabase failed to swap Facebook/Google auth code with the provider (credentials/config).
  if (value.includes("unable to exchange external code")) {
    return t(lang, "auth.oauth.providerExchangeFailed");
  }
  return raw.length > 160 ? t(lang, "auth.oauth.failed") : raw;
}

async function readJson(res: Response) {
  return res.json().catch(() => ({})) as Promise<{
    error?: string;
    code?: string;
    message?: string;
    data?: { hasSession?: boolean };
  }>;
}

export function AuthScreen({
  lang,
  initialTab = "login",
}: {
  lang: Lang;
  initialTab?: AuthTab;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/app/account";
  const tabParam = search.get("tab");
  const oauthErrorParam = search.get("oauth_error");

  const [tab, setTab] = useState<AuthTab>(
    tabParam === "register" || initialTab === "register" ? "register" : "login",
  );
  const [step, setStep] = useState<AuthStep>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(() =>
    oauthErrorParam ? mapOAuthQueryError(lang, oauthErrorParam) : "",
  );
  const [success, setSuccess] = useState("");
  const [oauthBusy, setOauthBusy] = useState<OAuthProvider | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    displayName?: string;
    otp?: string;
    newPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

  useEffect(() => {
    if (tabParam === "register") setTab("register");
    else if (tabParam === "login") setTab("login");
  }, [tabParam]);

  useEffect(() => {
    if (!oauthErrorParam) return;
    setError(mapOAuthQueryError(lang, oauthErrorParam));
    const params = new URLSearchParams(search.toString());
    params.delete("oauth_error");
    const qs = params.toString();
    router.replace(qs ? `/login?${qs}` : "/login", { scroll: false });
  }, [oauthErrorParam, lang, router, search]);

  useEffect(() => {
    if (tab !== "register") {
      setShowConfirmPassword(false);
    }
  }, [tab]);

  const switchTab = (nextTab: AuthTab) => {
    setTab(nextTab);
    setError("");
    setSuccess("");
    setFieldErrors({});
    setStep("form");
    setConfirmPassword("");
    const params = new URLSearchParams(search.toString());
    if (nextTab === "register") params.set("tab", "register");
    else params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `/login?${qs}` : "/login", { scroll: false });
  };

  const onOAuth = async (provider: OAuthProvider) => {
    if (!isSupabaseConfigured()) {
      setError(t(lang, "auth.oauth.notConfigured"));
      return;
    }
    setOauthBusy(provider);
    setError("");
    setSuccess("");
    try {
      window.location.assign(
        `/api/auth/oauth/start?provider=${provider}&next=${encodeURIComponent(next)}`,
      );
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "auth.oauth.failed"));
    } finally {
      setOauthBusy(null);
    }
  };

  const goToOtp = (signUpEmail: string, signUpPassword: string) => {
    setPendingEmail(signUpEmail);
    setPendingPassword(signUpPassword);
    setDisplayName("");
    setOtp("");
    setFieldErrors({});
    setError("");
    setSuccess(t(lang, "auth.signupOk"));
    setStep("otp");
  };

  const onLoginOrSignup = async (e: FormEvent) => {
    e.preventDefault();
    const nextFieldErrors: typeof fieldErrors = {};
    if (!email.trim()) nextFieldErrors.email = t(lang, "auth.field.emailRequired");
    if (!password) nextFieldErrors.password = t(lang, "auth.field.passwordRequired");
    if (tab === "register") {
      if (!confirmPassword) {
        nextFieldErrors.confirmPassword = t(lang, "auth.field.confirmPasswordRequired");
      }
      if (password && password.length < 6) {
        nextFieldErrors.password = t(lang, "auth.field.passwordTooShort");
      }
    }
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("");
      return;
    }
    if (tab === "register" && password !== confirmPassword) {
      setFieldErrors({
        confirmPassword: t(lang, "auth.field.confirmPasswordMismatch"),
      });
      setError("");
      return;
    }
    if (tab === "register" && !isValidEmail(email)) {
      setFieldErrors({});
      setError(t(lang, "auth.errors.invalidEmailFormat"));
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setFieldErrors({});
    try {
      if (tab === "register") {
        const signUpEmail = email.trim();
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: signUpEmail, password }),
        });
        const data = await readJson(res);
        if (!res.ok) {
          throw Object.assign(new Error(data.error || "signup"), {
            code: data.code,
            status: res.status,
            payload: data,
          });
        }
        goToOtp(signUpEmail, password);
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        if (data.code === "SIGNUP_OTP_PENDING" && isValidEmail(email)) {
          const resend = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim(), password }),
          });
          const resendData = await readJson(resend);
          if (!resend.ok) {
            setError(
              resolveAuthError(lang, true, resendData, resend.status),
            );
            return;
          }
          goToOtp(email.trim(), password);
          return;
        }
        throw Object.assign(new Error(data.error || "login"), {
          code: data.code,
          status: res.status,
          payload: data,
        });
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      const payload =
        err && typeof err === "object" && "payload" in err
          ? (err as { payload: { error?: string; code?: string; message?: string } }).payload
          : { error: err instanceof Error ? err.message : undefined };
      const status =
        err && typeof err === "object" && "status" in err
          ? Number((err as { status: number }).status)
          : undefined;
      setError(resolveAuthError(lang, tab === "register", payload, status));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    const nextFieldErrors: typeof fieldErrors = {};
    if (!displayName.trim()) {
      nextFieldErrors.displayName = t(lang, "auth.field.displayNameRequired");
    }
    if (!otp.trim()) {
      nextFieldErrors.otp = t(lang, "auth.field.otpRequired");
    } else if (otp.trim().length !== SIGNUP_OTP_LENGTH) {
      nextFieldErrors.otp = t(lang, "auth.field.otpInvalidLength");
    }
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail,
          otp: otp.trim(),
          password: pendingPassword,
          displayName: displayName.trim(),
        }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(resolveOtpError(lang, data));
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "auth.otpError"));
    } finally {
      setLoading(false);
    }
  };

  const onForgotSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setFieldErrors({ email: t(lang, "auth.field.emailRequired") });
      setError("");
      return;
    }
    if (!isValidEmail(email)) {
      setError(t(lang, "auth.errors.invalidEmailFormat"));
      setFieldErrors({});
      return;
    }
    setLoading(true);
    setError("");
    setFieldErrors({});
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(resolveForgotError(lang, data));
        return;
      }
      setPendingEmail(email.trim());
      setOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setSuccess(t(lang, "auth.signupOk"));
      setStep("forgot-apply");
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "auth.forgot.sendFailed"));
    } finally {
      setLoading(false);
    }
  };

  const onForgotApply = async (e: FormEvent) => {
    e.preventDefault();
    const nextFieldErrors: typeof fieldErrors = {};
    if (!otp.trim()) nextFieldErrors.otp = t(lang, "auth.field.otpRequired");
    else if (otp.trim().length !== SIGNUP_OTP_LENGTH) {
      nextFieldErrors.otp = t(lang, "auth.field.otpInvalidLength");
    }
    if (!forgotNewPassword) {
      nextFieldErrors.newPassword = t(lang, "auth.field.passwordRequired");
    } else if (forgotNewPassword.length < 6) {
      nextFieldErrors.newPassword = t(lang, "auth.field.passwordTooShort");
    }
    if (!forgotConfirmPassword) {
      nextFieldErrors.confirmPassword = t(lang, "auth.field.confirmPasswordRequired");
    } else if (forgotNewPassword !== forgotConfirmPassword) {
      nextFieldErrors.confirmPassword = t(lang, "auth.field.confirmPasswordMismatch");
    }
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});
    try {
      const res = await fetch("/api/auth/forgot-password/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail,
          otp: otp.trim(),
          newPassword: forgotNewPassword,
        }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(resolveForgotError(lang, data));
        return;
      }
      if (data.data?.hasSession) {
        router.push(next);
        router.refresh();
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setSuccess(t(lang, "auth.forgotSuccess"));
      setStep("form");
      setTab("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "auth.forgot.sendFailed"));
    } finally {
      setLoading(false);
    }
  };

  const brandPanel = (
    <aside className="relative hidden lg:flex min-h-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={AUTH_HERO} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, rgba(120,53,15,0.35) 0%, rgba(146,64,14,0.55) 45%, rgba(43,30,25,0.78) 100%)",
        }}
      />
      <div className="relative z-10 flex flex-col justify-end gap-6 p-10 xl:p-12 w-full">
        <div>
          <h1 className="font-display text-3xl xl:text-4xl font-semibold text-white leading-[1.15] tracking-tight max-w-md drop-shadow-sm">
            {t(lang, "auth.heroTitle")}
          </h1>
          <p className="mt-4 text-amber-50/85 text-sm xl:text-base max-w-sm leading-relaxed">
            {t(lang, "auth.heroSub")}
          </p>
        </div>
        <div className="backdrop-blur-md bg-white/15 border border-white/25 rounded-2xl px-4 py-3.5 shadow-lg shadow-amber-950/20 max-w-sm">
          <p className="text-white text-sm font-medium leading-snug">
            {t(lang, "auth.escrowBadge")}
          </p>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="bg-[#FDFBF7] text-[#2B1E19]">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-2 lg:min-h-[calc(100vh-7.5rem)] lg:rounded-2xl lg:overflow-hidden lg:border lg:border-[#F0E6D8] lg:bg-white/40 lg:shadow-[0_20px_50px_-28px_rgba(180,83,9,0.35)]">
          {brandPanel}

          <section className="relative flex flex-col justify-center px-0 sm:px-2 lg:px-10 xl:px-14 py-2 lg:py-10 bg-[#FDFBF7]">
            <div className="w-full max-w-[420px] mx-auto">
              <div className="lg:hidden mb-6 rounded-2xl overflow-hidden relative h-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={AUTH_HERO} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2B1E19]/80 via-[#92400E]/40 to-transparent" />
                <p className="absolute bottom-3 left-4 right-4 font-display text-lg font-semibold text-white leading-snug">
                  {t(lang, "auth.heroTitle")}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {step === "form" ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative flex p-1 rounded-full bg-[#F3E2C8]/60 border border-[#F0E6D8] mb-6">
                      {(
                        [
                          ["login", "auth.login"],
                          ["register", "auth.signup"],
                        ] as const
                      ).map(([key, labelKey]) => {
                        const active = tab === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => switchTab(key)}
                            className={`relative z-10 flex-1 py-2.5 text-sm font-medium rounded-full transition-colors ${
                              active ? "text-[#2B1E19]" : "text-stone-500 hover:text-[#2B1E19]"
                            }`}
                          >
                            {active && (
                              <motion.span
                                layoutId="auth-tab-pill"
                                className="absolute inset-0 rounded-full bg-white shadow-sm shadow-amber-900/10 border border-[#F0E6D8]"
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                              />
                            )}
                            <span className="relative z-10">{t(lang, labelKey)}</span>
                          </button>
                        );
                      })}
                    </div>

                    <h2 className="font-display text-xl font-semibold text-[#2B1E19] mb-4">
                      {tab === "login"
                        ? t(lang, "auth.welcomeBack")
                        : t(lang, "auth.createAccount")}
                    </h2>

                    {error ? (
                      <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        {error}
                      </p>
                    ) : null}
                    {success ? (
                      <p className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                        {success}
                      </p>
                    ) : null}

                    <div className="space-y-3 mb-5">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        disabled={loading || oauthBusy !== null}
                        onClick={() => void onOAuth("google")}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-[#F0E6D8] bg-white text-sm font-medium text-[#2B1E19] hover:border-amber-300 hover:bg-amber-50/40 transition-colors disabled:opacity-60"
                      >
                        <GoogleIcon />
                        {oauthBusy === "google"
                          ? t(lang, "common.loading")
                          : t(lang, "auth.continueGoogle")}
                      </motion.button>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        disabled={loading || oauthBusy !== null}
                        onClick={() => void onOAuth("facebook")}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-[#F0E6D8] bg-white text-sm font-medium text-[#2B1E19] hover:border-amber-300 hover:bg-amber-50/40 transition-colors disabled:opacity-60"
                      >
                        <FacebookIcon />
                        {oauthBusy === "facebook"
                          ? t(lang, "common.loading")
                          : t(lang, "auth.continueFacebook")}
                      </motion.button>
                    </div>

                    <div className="relative flex items-center gap-3 mb-5">
                      <div className="flex-1 h-px bg-[#F0E6D8]" />
                      <span className="text-xs text-stone-400 font-medium whitespace-nowrap">
                        {t(lang, "auth.orEmail")}
                      </span>
                      <div className="flex-1 h-px bg-[#F0E6D8]" />
                    </div>

                    <form onSubmit={onLoginOrSignup} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                          {tab === "login"
                            ? t(lang, "auth.emailOrLogin")
                            : t(lang, "auth.email")}
                        </label>
                        <input
                          type={tab === "register" ? "email" : "text"}
                          autoCapitalize="none"
                          autoComplete={tab === "register" ? "email" : "username"}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`${inputCls} ${fieldErrors.email ? inputErrorCls : ""}`}
                          placeholder={
                            tab === "login"
                              ? t(lang, "auth.emailOrLogin")
                              : "you@email.com"
                          }
                        />
                        <FieldError message={fieldErrors.email} />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                          {t(lang, "auth.password")}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${inputCls} pr-11 ${fieldErrors.password ? inputErrorCls : ""}`}
                            autoComplete={
                              tab === "login" ? "current-password" : "new-password"
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#6E5A51] transition-colors p-0.5"
                            aria-label={
                              showPassword
                                ? t(lang, "auth.hidePassword")
                                : t(lang, "auth.showPassword")
                            }
                          >
                            <EyeIcon open={showPassword} />
                          </button>
                        </div>
                        {fieldErrors.password ? (
                          <FieldError message={fieldErrors.password} />
                        ) : tab === "register" ? (
                          <p className="mt-1.5 text-xs text-stone-400">
                            {t(lang, "auth.passwordHint")}
                          </p>
                        ) : null}
                      </div>

                      {tab === "register" ? (
                        <div>
                          <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                            {t(lang, "auth.confirmPassword")}
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className={`${inputCls} pr-11 ${fieldErrors.confirmPassword ? inputErrorCls : ""}`}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#6E5A51] transition-colors p-0.5"
                              aria-label={
                                showConfirmPassword
                                  ? t(lang, "auth.hidePassword")
                                  : t(lang, "auth.showPassword")
                              }
                            >
                              <EyeIcon open={showConfirmPassword} />
                            </button>
                          </div>
                          <FieldError message={fieldErrors.confirmPassword} />
                        </div>
                      ) : null}

                      {tab === "login" ? (
                        <div className="flex justify-end -mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setStep("forgot");
                              setError("");
                              setSuccess("");
                              setFieldErrors({});
                            }}
                            className="text-xs font-medium text-[#D97706] hover:text-[#B45309]"
                          >
                            {t(lang, "auth.forgot")}
                          </button>
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#D97706] text-white font-medium py-3 rounded-xl hover:bg-[#B45309] hover:shadow-lg hover:shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
                      >
                        {loading
                          ? t(lang, "common.loading")
                          : tab === "login"
                            ? t(lang, "auth.login")
                            : t(lang, "auth.signup")}
                      </button>
                    </form>

                    <p className="mt-5 text-center text-xs text-stone-400 leading-relaxed">
                      {t(lang, "auth.termsPrefix")}{" "}
                      <Link href="/terms-of-service" className="text-[#D97706] hover:underline">
                        {t(lang, "legal.terms")}
                      </Link>{" "}
                      {t(lang, "auth.termsAnd")}{" "}
                      <Link href="/privacy-policy" className="text-[#D97706] hover:underline">
                        {t(lang, "legal.privacy")}
                      </Link>
                    </p>
                  </motion.div>
                ) : null}

                {step === "otp" ? (
                  <motion.form
                    key="otp"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    onSubmit={onVerifyOtp}
                    className="space-y-4"
                  >
                    <h2 className="font-display text-2xl font-semibold text-[#2B1E19]">
                      {t(lang, "auth.otpTitle")}
                    </h2>
                    <p className="text-sm text-[#6E5A51]">
                      {fillEmail(t(lang, "auth.otpSubtitle"), pendingEmail)}
                    </p>
                    {success ? (
                      <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                        {success}
                      </p>
                    ) : null}
                    {error ? (
                      <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        {error}
                      </p>
                    ) : null}

                    <div>
                      <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                        {t(lang, "auth.displayName")} *
                      </label>
                      <input
                        value={displayName}
                        maxLength={160}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className={`${inputCls} ${fieldErrors.displayName ? inputErrorCls : ""}`}
                        placeholder={t(lang, "auth.displayNamePlaceholder")}
                        autoComplete="name"
                      />
                      {fieldErrors.displayName ? (
                        <FieldError message={fieldErrors.displayName} />
                      ) : (
                        <p className="mt-1.5 text-xs text-stone-400">
                          {t(lang, "auth.displayNameHelper")}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                        {t(lang, "auth.otp")} *
                      </label>
                      <input
                        inputMode="numeric"
                        maxLength={SIGNUP_OTP_LENGTH}
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, SIGNUP_OTP_LENGTH))
                        }
                        className={`${inputCls} ${fieldErrors.otp ? inputErrorCls : ""}`}
                        placeholder={t(lang, "auth.otpPlaceholder")}
                        autoComplete="one-time-code"
                      />
                      {fieldErrors.otp ? (
                        <FieldError message={fieldErrors.otp} />
                      ) : (
                        <p className="mt-1.5 text-xs text-stone-400">
                          {t(lang, "auth.otpHelper")}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#D97706] text-white font-medium py-3 rounded-xl hover:bg-[#B45309] transition-all disabled:opacity-60"
                    >
                      {loading ? t(lang, "common.loading") : t(lang, "auth.verifyOtp")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("form");
                        setTab("register");
                        setError("");
                        setSuccess("");
                        setFieldErrors({});
                      }}
                      className="w-full text-sm text-stone-500 hover:text-[#D97706] transition-colors"
                    >
                      ← {t(lang, "auth.backToSignUp")}
                    </button>
                  </motion.form>
                ) : null}

                {step === "forgot" ? (
                  <motion.form
                    key="forgot"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    onSubmit={onForgotSend}
                    className="space-y-4"
                  >
                    <h2 className="font-display text-2xl font-semibold text-[#2B1E19]">
                      {t(lang, "auth.forgotTitle")}
                    </h2>
                    <p className="text-sm text-[#6E5A51]">{t(lang, "auth.forgotBody")}</p>
                    {error ? (
                      <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        {error}
                      </p>
                    ) : null}
                    <div>
                      <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                        {t(lang, "auth.email")}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${inputCls} ${fieldErrors.email ? inputErrorCls : ""}`}
                        autoComplete="email"
                      />
                      <FieldError message={fieldErrors.email} />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#D97706] text-white font-medium py-3 rounded-xl hover:bg-[#B45309] transition-all disabled:opacity-60"
                    >
                      {loading ? t(lang, "common.loading") : t(lang, "auth.forgotSend")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("form");
                        setTab("login");
                        setError("");
                        setFieldErrors({});
                      }}
                      className="w-full text-sm text-stone-500 hover:text-[#D97706]"
                    >
                      ← {t(lang, "auth.forgotBack")}
                    </button>
                  </motion.form>
                ) : null}

                {step === "forgot-apply" ? (
                  <motion.form
                    key="forgot-apply"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    onSubmit={onForgotApply}
                    className="space-y-4"
                  >
                    <h2 className="font-display text-2xl font-semibold text-[#2B1E19]">
                      {t(lang, "auth.forgotTitle")}
                    </h2>
                    <p className="text-sm text-[#6E5A51]">
                      {fillEmail(t(lang, "auth.otpSubtitle"), pendingEmail)}
                    </p>
                    {success ? (
                      <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                        {success}
                      </p>
                    ) : null}
                    {error ? (
                      <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        {error}
                      </p>
                    ) : null}

                    <div>
                      <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                        {t(lang, "auth.otp")}
                      </label>
                      <input
                        inputMode="numeric"
                        maxLength={SIGNUP_OTP_LENGTH}
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, SIGNUP_OTP_LENGTH))
                        }
                        className={`${inputCls} ${fieldErrors.otp ? inputErrorCls : ""}`}
                        autoComplete="one-time-code"
                      />
                      <FieldError message={fieldErrors.otp} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                        {t(lang, "auth.forgot.newPassword")}
                      </label>
                      <input
                        type="password"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        className={`${inputCls} ${fieldErrors.newPassword ? inputErrorCls : ""}`}
                        autoComplete="new-password"
                      />
                      <FieldError message={fieldErrors.newPassword} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                        {t(lang, "auth.forgot.confirmPassword")}
                      </label>
                      <input
                        type="password"
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        className={`${inputCls} ${fieldErrors.confirmPassword ? inputErrorCls : ""}`}
                        autoComplete="new-password"
                      />
                      <FieldError message={fieldErrors.confirmPassword} />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#D97706] text-white font-medium py-3 rounded-xl hover:bg-[#B45309] transition-all disabled:opacity-60"
                    >
                      {loading ? t(lang, "common.loading") : t(lang, "auth.forgot.apply")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("forgot");
                        setError("");
                        setFieldErrors({});
                      }}
                      className="w-full text-sm text-stone-500 hover:text-[#D97706]"
                    >
                      ← {t(lang, "auth.back")}
                    </button>
                  </motion.form>
                ) : null}
              </AnimatePresence>

              <p className="mt-6 text-center text-xs text-stone-400 leading-relaxed">
                {t(lang, "auth.privacyNote")}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
