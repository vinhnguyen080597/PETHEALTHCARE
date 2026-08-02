"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminSection, Lang } from "@/lib/types";
import { t } from "@/i18n";

type PostRow = {
  id: string;
  title?: string;
  status?: string;
  price_note?: string;
  vaccine_status?: string;
  created_at?: string;
  breeder_profile?: { display_name?: string };
};

type BreederRow = {
  id: string;
  user_id?: string;
  display_name?: string;
  verification_status?: string;
  location?: string;
};

type ReportRow = {
  id: string;
  reason?: string;
  status?: string;
  note?: string;
  created_at?: string;
};

type AccountRow = {
  id?: string;
  user_id?: string;
  email?: string;
  display_name?: string;
  primary_role?: string;
};

type FlagRow = {
  key?: string;
  enabled?: boolean;
  label?: string;
};

const navItems: { key: AdminSection; label: string; icon: string }[] = [
  { key: "home", label: "Home", icon: "🏠" },
  { key: "requests", label: "Hàng chờ", icon: "📥" },
  { key: "listings", label: "Tin đăng", icon: "🐾" },
  { key: "breeders", label: "Breeders", icon: "🏡" },
  { key: "reports", label: "Báo cáo", icon: "⚠️" },
  { key: "users", label: "Users", icon: "👥" },
  { key: "features", label: "Feature flags", icon: "🚩" },
  { key: "news", label: "Tin tức", icon: "📝" },
];

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    waiting: "bg-amber-50 text-amber-700 border-amber-200",
    pending_review: "bg-amber-50 text-amber-700 border-amber-200",
    open: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-600 border-red-200",
    resolved: "bg-slate-100 text-slate-500 border-slate-200",
    dismissed: "bg-slate-100 text-slate-400 border-slate-200",
    archived: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[status] || map.waiting}`}
    >
      {status}
    </span>
  );
}

async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`/api/admin${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Admin request failed");
  return data;
}

export function AdminConsole({ lang }: { lang: Lang }) {
  const [section, setSection] = useState<AdminSection>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [breeders, setBreeders] = useState<BreederRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [p, b, r, a, f] = await Promise.all([
        adminFetch("/posts").catch(() => ({ data: [] })),
        adminFetch("/breeders").catch(() => ({ data: [] })),
        adminFetch("/reports").catch(() => ({ data: [] })),
        adminFetch("/accounts").catch(() => ({ data: [] })),
        adminFetch("/feature-flags").catch(() => ({ data: [] })),
      ]);
      setPosts(Array.isArray(p.data) ? p.data : []);
      setBreeders(Array.isArray(b.data) ? b.data : []);
      setReports(Array.isArray(r.data) ? r.data : []);
      setAccounts(Array.isArray(a.data) ? a.data : []);
      setFlags(Array.isArray(f.data) ? f.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pendingPosts = posts.filter((p) => p.status === "pending_review");
  const pendingBreeders = breeders.filter(
    (b) => b.verification_status === "pending_review",
  );
  const openReports = reports.filter(
    (r) => r.status === "open" || r.status === "waiting",
  );

  const updatePost = async (postId: string, status: string) => {
    await adminFetch(`/posts/${postId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    showToast(status === "published" ? "Đã duyệt tin đăng." : "Đã cập nhật tin.");
    await load();
  };

  const updateBreeder = async (userId: string, status: string) => {
    await adminFetch(`/breeders/${userId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    showToast("Đã cập nhật breeder.");
    await load();
  };

  const updateReport = async (reportId: string, status: string) => {
    await adminFetch(`/reports/${reportId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    showToast("Đã cập nhật báo cáo.");
    await load();
  };

  const renderSection = () => {
    if (loading) {
      return <p className="text-sm text-slate-400">{t(lang, "common.loading")}</p>;
    }
    if (error) {
      return (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      );
    }

    switch (section) {
      case "home":
        return (
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-6">Admin Home</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                {
                  label: "Tin chờ duyệt",
                  value: pendingPosts.length,
                  color: "text-violet-600",
                  action: () => setSection("listings"),
                },
                {
                  label: "Breeder chờ xác minh",
                  value: pendingBreeders.length,
                  color: "text-blue-600",
                  action: () => setSection("breeders"),
                },
                {
                  label: "Báo cáo mở",
                  value: openReports.length,
                  color: "text-red-600",
                  action: () => setSection("reports"),
                },
                {
                  label: "Users",
                  value: accounts.length,
                  color: "text-slate-700",
                  action: () => setSection("users"),
                },
              ].map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={m.action}
                  className="bg-white rounded-xl border border-slate-100 p-5 text-left hover:shadow-sm hover:border-blue-100 transition-all"
                >
                  <p className={`text-3xl font-bold mb-1 ${m.color}`}>{m.value}</p>
                  <p className="text-xs text-slate-500 font-medium">{m.label}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case "listings":
      case "requests":
        return (
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-5">
              Duyệt tin đăng
            </h1>
            <div className="space-y-3">
              {(section === "requests" ? pendingPosts : posts).map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-100 p-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <StatusChip status={p.status || "pending_review"} />
                    <span className="text-xs text-slate-300">
                      {p.created_at?.slice(0, 10)}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-slate-900">
                    {p.title}
                  </p>
                  <p className="text-xs text-slate-400 mb-3">
                    {p.breeder_profile?.display_name} · {p.price_note}
                  </p>
                  {p.status === "pending_review" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updatePost(p.id, "published")}
                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-full"
                      >
                        ✓ Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePost(p.id, "archived")}
                        className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-semibold rounded-full"
                      >
                        Archive
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case "breeders":
        return (
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-5">Breeders</h1>
            <div className="space-y-3">
              {breeders.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-xl border border-slate-100 p-5 flex flex-wrap items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900">
                      {b.display_name}
                    </p>
                    <p className="text-xs text-slate-400">{b.location}</p>
                  </div>
                  <StatusChip status={b.verification_status || "unverified"} />
                  {b.verification_status === "pending_review" && b.user_id && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateBreeder(b.user_id!, "verified")}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-full"
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => updateBreeder(b.user_id!, "rejected")}
                        className="px-3 py-1.5 border border-slate-200 text-xs rounded-full"
                      >
                        Từ chối
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case "reports":
        return (
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-5">Báo cáo</h1>
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-slate-100 p-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <StatusChip status={r.status || "open"} />
                    <span className="text-xs text-slate-300">
                      {r.created_at?.slice(0, 10)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {r.reason}
                  </p>
                  <p className="text-xs text-slate-500 mb-3">{r.note}</p>
                  {(r.status === "open" || r.status === "waiting") && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateReport(r.id, "resolved")}
                        className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-full"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReport(r.id, "dismissed")}
                        className="px-3 py-1.5 border border-slate-200 text-xs rounded-full"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case "users":
        return (
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-5">Users</h1>
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              {accounts.map((u, i) => (
                <div
                  key={u.user_id || u.id || i}
                  className="flex items-center gap-4 px-5 py-4 border-b border-slate-50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {u.display_name || "—"}
                    </p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                    {u.primary_role || "sen"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      case "features":
        return (
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-5">
              Feature flags
            </h1>
            <div className="space-y-2">
              {flags.map((f) => (
                <div
                  key={f.key}
                  className="bg-white rounded-xl border border-slate-100 px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {f.label || f.key}
                    </p>
                    <p className="text-xs text-slate-400">{f.key}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      f.enabled
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {f.enabled ? "ON" : "OFF"}
                  </span>
                </div>
              ))}
              {flags.length === 0 && (
                <p className="text-sm text-slate-400">No flags returned.</p>
              )}
            </div>
          </div>
        );
      case "news":
        return (
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-3">
              Tạo tin tức
            </h1>
            <p className="text-sm text-slate-500">
              Tạo announcement qua app mobile / API admin. Web shell sẵn sàng mở
              rộng form sau.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F4F8]">
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 bg-white border-r border-slate-100 flex-shrink-0">
          <div className="p-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t(lang, "admin.console")}
            </p>
          </div>
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSection(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  section === item.key
                    ? "bg-blue-50 text-[#1E6FE8]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="w-5 text-center">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-slate-100">
            <Link
              href="/"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            >
              ← {t(lang, "admin.back")}
            </Link>
          </div>
        </aside>

        <div className="lg:hidden bg-white border-b border-slate-100 px-4 py-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {navItems.find((n) => n.key === section)?.label}
            </p>
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="text-slate-500"
            >
              ☰
            </button>
          </div>
          {mobileNavOpen && (
            <div className="grid grid-cols-4 gap-1 pt-2 pb-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSection(item.key);
                    setMobileNavOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium ${
                    section === item.key
                      ? "bg-blue-50 text-[#1E6FE8]"
                      : "text-slate-500"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        <main className="flex-1 p-5 lg:p-8 overflow-y-auto">{renderSection()}</main>
      </div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
