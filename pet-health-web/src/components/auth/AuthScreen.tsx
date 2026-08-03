"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

const AUTH_HERO =
  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=1400&h=1800&fit=crop&auto=format";

type AuthTab = "login" | "register";

const inputCls =
  "w-full px-4 py-3 bg-white border border-[#F0E6D8] rounded-xl text-sm text-[#2B1E19] placeholder:text-stone-400 focus:outline-none focus:border-[#D97706] focus:ring-4 focus:ring-amber-500/10 transition-all duration-200";

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

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
      <path d="M13.6 9.4c0-2 1.6-2.9 1.7-3-.9-1.3-2.4-1.5-2.9-1.5-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.3 1 8.4.7 1 1.5 2.2 2.6 2.1 1 0 1.4-.7 2.7-.7s1.6.7 2.7.7c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.1-3.1zM11.5 3.6c.6-.7 1-1.7.9-2.6-.8 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.5 1 .1 1.9-.5 2.5-1.2z" />
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

  const [tab, setTab] = useState<AuthTab>(
    tabParam === "register" || initialTab === "register" ? "register" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialNote, setSocialNote] = useState("");

  useEffect(() => {
    if (tabParam === "register") setTab("register");
    else if (tabParam === "login") setTab("login");
  }, [tabParam]);

  const switchTab = (nextTab: AuthTab) => {
    setTab(nextTab);
    setError("");
    setInfo("");
    setSocialNote("");
    setStep("form");
    const params = new URLSearchParams(search.toString());
    if (nextTab === "register") params.set("tab", "register");
    else params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `/login?${qs}` : "/login", { scroll: false });
  };

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(lang, "auth.loginError"));
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  const onSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(lang, "auth.signupError"));
      setInfo(t(lang, "auth.signupOk"));
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "auth.signupError"));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otp, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(lang, "auth.otpError"));
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "auth.otpError"));
    } finally {
      setLoading(false);
    }
  };

  const onSocial = (provider: "google" | "apple") => {
    setSocialNote(t(lang, "auth.socialSoon"));
    void provider;
  };

  return (
    <div className="bg-[#FDFBF7] text-[#2B1E19]">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-2 lg:min-h-[calc(100vh-7.5rem)] lg:rounded-2xl lg:overflow-hidden lg:border lg:border-[#F0E6D8] lg:bg-white/40 lg:shadow-[0_20px_50px_-28px_rgba(180,83,9,0.35)]">
          {/* Branding panel */}
          <aside className="relative hidden lg:flex min-h-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={AUTH_HERO}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
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
                  🛡️ {t(lang, "auth.escrowBadge")}
                </p>
              </div>
            </div>
          </aside>

          {/* Form panel */}
          <section className="relative flex flex-col justify-center px-0 sm:px-2 lg:px-10 xl:px-14 py-2 lg:py-10 bg-[#FDFBF7] lg:bg-[#FDFBF7]">
            <div className="w-full max-w-[420px] mx-auto">
              {/* Mobile hero strip */}
              <div className="lg:hidden mb-6 rounded-2xl overflow-hidden relative h-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={AUTH_HERO}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2B1E19]/80 via-[#92400E]/40 to-transparent" />
                <p className="absolute bottom-3 left-4 right-4 font-display text-lg font-semibold text-white leading-snug">
                  {t(lang, "auth.heroTitle")}
                </p>
              </div>

              {step === "form" ? (
              <>
                <div className="relative flex p-1 rounded-full bg-[#F3E2C8]/60 border border-[#F0E6D8] mb-7">
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

                <div className="space-y-3 mb-5">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => onSocial("google")}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-[#F0E6D8] bg-white text-sm font-medium text-[#2B1E19] hover:border-amber-300 hover:bg-amber-50/40 transition-colors"
                  >
                    <GoogleIcon />
                    {t(lang, "auth.continueGoogle")}
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => onSocial("apple")}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-[#F0E6D8] bg-white text-sm font-medium text-[#2B1E19] hover:border-amber-300 hover:bg-amber-50/40 transition-colors"
                  >
                    <AppleIcon />
                    {t(lang, "auth.continueApple")}
                  </motion.button>
                </div>

                {socialNote && (
                  <p className="mb-4 text-xs text-amber-800 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl px-3 py-2">
                    {socialNote}
                  </p>
                )}

                <div className="relative flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-[#F0E6D8]" />
                  <span className="text-xs text-stone-400 font-medium whitespace-nowrap">
                    {t(lang, "auth.orEmail")}
                  </span>
                  <div className="flex-1 h-px bg-[#F0E6D8]" />
                </div>

                <AnimatePresence mode="wait">
                  <motion.form
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={tab === "login" ? onLogin : onSignup}
                    className="space-y-4"
                  >
                    {tab === "register" && (
                      <div>
                        <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                          {t(lang, "auth.displayName")}
                        </label>
                        <input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className={inputCls}
                          autoComplete="name"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                        {t(lang, "auth.email")}
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls}
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                        {t(lang, "auth.password")}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={tab === "register" ? 6 : undefined}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputCls} pr-11`}
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
                    </div>

                    {error && (
                      <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        {error}
                      </p>
                    )}

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
                  </motion.form>
                </AnimatePresence>
              </>
            ) : (
              <motion.form
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={onVerifyOtp}
                className="space-y-4"
              >
                <h2 className="font-display text-2xl font-semibold text-[#2B1E19]">
                  {t(lang, "auth.verifyOtp")}
                </h2>
                {info && (
                  <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    {info}
                  </p>
                )}
                <div>
                  <label className="block text-xs font-medium text-[#6E5A51] mb-1.5">
                    {t(lang, "auth.otp")}
                  </label>
                  <input
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className={inputCls}
                    autoComplete="one-time-code"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D97706] text-white font-medium py-3 rounded-xl hover:bg-[#B45309] hover:shadow-lg hover:shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {loading ? t(lang, "common.loading") : t(lang, "auth.verifyOtp")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setError("");
                  }}
                  className="w-full text-sm text-stone-500 hover:text-[#D97706] transition-colors"
                >
                  ← {t(lang, "auth.back")}
                </button>
              </motion.form>
            )}

            <p className="mt-6 text-center text-xs text-stone-400 leading-relaxed">
              🔒 {t(lang, "auth.privacyNote")}
            </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
