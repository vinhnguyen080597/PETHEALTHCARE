"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import { adminConsoleHref } from "@/lib/admin/consoleNav";
import {
  breedInterestSlices,
  breederSpeciesSlices,
  countCreatedInRange,
  deltaPercent,
  formatDelta,
  growthSeriesFromEntities,
  previousRange,
  resolveHomeRange,
  todayHomeRange,
  type HomeRangePreset,
  type ProductAnalyticsDashboard,
} from "@/lib/admin/homeAnalytics";

const CHART_COLORS = ["#D97706", "#059669", "#0284C7", "#B45309", "#7C3AED", "#C4B5A5"];

type AccountLike = {
  created_at?: string;
  primary_role?: string;
};

type PostLike = {
  created_at?: string;
  breed?: string;
  status?: string;
};

type BreederLike = {
  created_at?: string;
  verification_status?: string;
  primary_species?: string[] | null;
};

type OpsCounts = {
  pendingListings: number;
  openReports: number;
  pendingBreeders: number;
  pendingRequests: number;
};

type AdminHomeDashboardProps = {
  lang: Lang;
  accounts: AccountLike[];
  posts: PostLike[];
  breeders: BreederLike[];
  ops: OpsCounts;
  onRefresh: () => void;
  fetchDashboard: (days: number) => Promise<ProductAnalyticsDashboard | null>;
};

function KpiCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string | number;
  delta?: number;
  hint?: string;
}) {
  const deltaPositive = (delta ?? 0) > 0;
  const deltaNegative = (delta ?? 0) < 0;
  return (
    <div className="rounded-2xl border border-[#E8DFD0] bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8B7355]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#2B1E19]">{value}</p>
      {typeof delta === "number" ? (
        <p
          className={`mt-1 text-xs font-semibold ${
            deltaPositive ? "text-emerald-700" : deltaNegative ? "text-red-700" : "text-[#8B7355]"
          }`}
        >
          {formatDelta(delta)}{" "}
          <span className="font-medium text-[#8B7355]">{hint}</span>
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[#8B7355]">{hint}</p>
      ) : null}
    </div>
  );
}

function ChartCard({
  title,
  children,
  legend,
}: {
  title: string;
  children: ReactNode;
  legend?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E8DFD0] bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-[#2B1E19]">{title}</h3>
      <div className="h-56 w-full">{children}</div>
      {legend ? <div className="mt-3">{legend}</div> : null}
    </div>
  );
}

function PieLegend({ data }: { data: Array<{ name: string; value: number }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {data.map((item, index) => (
        <li key={item.name} className="flex items-center gap-1.5 text-[11px] text-[#5C4A3A]">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
          />
          <span className="font-medium">{item.name}</span>
          <span className="text-[#8B7355]">
            {item.value} ({Math.round((item.value / total) * 100)}%)
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AdminHomeDashboard({
  lang,
  accounts,
  posts,
  breeders,
  ops,
  onRefresh,
  fetchDashboard,
}: AdminHomeDashboardProps) {
  const [preset, setPreset] = useState<HomeRangePreset>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [analytics, setAnalytics] = useState<ProductAnalyticsDashboard | null>(null);
  const [todayAnalytics, setTodayAnalytics] = useState<ProductAnalyticsDashboard | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");

  const range = useMemo(
    () => resolveHomeRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );
  const prev = useMemo(() => previousRange(range), [range]);
  const todayRange = useMemo(() => todayHomeRange(), []);
  const yesterdayRange = useMemo(() => previousRange(todayRange), [todayRange]);

  const newUsers = countCreatedInRange(accounts, range);
  const prevNewUsers = countCreatedInRange(accounts, prev);
  const newUsersToday = countCreatedInRange(accounts, todayRange);
  const newUsersYesterday = countCreatedInRange(accounts, yesterdayRange);
  const newBreeders = countCreatedInRange(breeders, range);
  const prevNewBreeders = countCreatedInRange(breeders, prev);
  const newPosts = countCreatedInRange(posts, range);
  const prevNewPosts = countCreatedInRange(posts, prev);

  const growthData = useMemo(
    () => growthSeriesFromEntities(accounts, breeders, range),
    [accounts, breeders, range],
  );
  const breedData = useMemo(() => breedInterestSlices(posts, range), [posts, range]);
  const farmSpeciesData = useMemo(() => breederSpeciesSlices(breeders), [breeders]);

  useEffect(() => {
    let cancelled = false;
    setAnalyticsLoading(true);
    setAnalyticsError("");
    void Promise.all([
      fetchDashboard(range.days),
      range.days === 1 ? Promise.resolve(null) : fetchDashboard(1),
    ])
      .then(([rangeData, todayData]) => {
        if (cancelled) return;
        setAnalytics(rangeData);
        setTodayAnalytics(range.days === 1 ? rangeData : todayData);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAnalytics(null);
          setTodayAnalytics(null);
          setAnalyticsError(err instanceof Error ? err.message : "error");
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchDashboard, range.days]);

  const trafficVisits = analytics?.kpis.totalEvents;
  const trafficToday = todayAnalytics?.kpis.totalEvents;
  const trafficTodayUsers = todayAnalytics?.kpis.activeUsers;

  const peakHours = analytics?.peakHours ?? [];

  const rangeChips: Array<{ key: HomeRangePreset; labelKey: EnKey }> = [
    { key: "today", labelKey: "admin.home.range.today" },
    { key: "7d", labelKey: "admin.home.range.7d" },
    { key: "30d", labelKey: "admin.home.range.30d" },
    { key: "custom", labelKey: "admin.home.range.custom" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#2B1E19]">{t(lang, "admin.home.title")}</h1>
          <p className="mt-1 text-sm text-[#8B7355]">{t(lang, "admin.home.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-full border border-[#E8DFD0] bg-white px-3 py-1.5 text-xs font-semibold text-[#5C4A3A] hover:bg-[#FFF8F0]"
        >
          {t(lang, "admin.refresh")}
        </button>
      </div>

      {/* Tier 1 — Global time filter */}
      <div className="rounded-2xl border border-[#E8DFD0] bg-white p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-[#8B7355]">
          {t(lang, "admin.home.range.label")}
        </p>
        <div className="flex flex-wrap gap-2">
          {rangeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setPreset(chip.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                preset === chip.key
                  ? "bg-[#FFF1DE] text-[#B45309]"
                  : "bg-[#F3EDE3] text-[#5C4A3A] hover:bg-[#EFE6D8]"
              }`}
            >
              {t(lang, chip.labelKey)}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs text-[#8B7355]">
              {t(lang, "admin.home.range.from")}
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-xl border border-[#E8DFD0] bg-[#FCFBFA] px-3 py-2 text-sm text-[#2B1E19]"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#8B7355]">
              {t(lang, "admin.home.range.to")}
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-[#E8DFD0] bg-[#FCFBFA] px-3 py-2 text-sm text-[#2B1E19]"
              />
            </label>
          </div>
        ) : null}
      </div>

      {/* Tier 2 — KPI cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label={t(lang, "admin.home.kpi.newUsersToday")}
          value={newUsersToday}
          delta={deltaPercent(newUsersToday, newUsersYesterday)}
          hint={t(lang, "admin.home.kpi.vsYesterday")}
        />
        <KpiCard
          label={t(lang, "admin.home.kpi.trafficToday")}
          value={analyticsLoading ? "…" : (trafficToday ?? "—")}
          delta={todayAnalytics?.kpis.totalEventsDeltaPct}
          hint={
            typeof trafficTodayUsers === "number"
              ? t(lang, "admin.home.kpi.trafficTodayHint").replace(
                  "{users}",
                  String(trafficTodayUsers),
                )
              : t(lang, "admin.home.kpi.vsYesterday")
          }
        />
        <KpiCard
          label={t(lang, "admin.home.kpi.traffic")}
          value={analyticsLoading ? "…" : (trafficVisits ?? "—")}
          delta={analytics?.kpis.totalEventsDeltaPct}
          hint={t(lang, "admin.home.kpi.vsPrev")}
        />
        <KpiCard
          label={t(lang, "admin.home.kpi.activeUsers")}
          value={analyticsLoading ? "…" : (analytics?.kpis.activeUsers ?? "—")}
          delta={analytics?.kpis.activeUsersDeltaPct}
          hint={t(lang, "admin.home.kpi.vsPrev")}
        />
        <KpiCard
          label={t(lang, "admin.home.kpi.newUsers")}
          value={newUsers}
          delta={deltaPercent(newUsers, prevNewUsers)}
          hint={t(lang, "admin.home.kpi.vsPrev")}
        />
        <KpiCard
          label={t(lang, "admin.home.kpi.conversion")}
          value={
            analyticsLoading
              ? "…"
              : analytics
                ? `${analytics.kpis.conversionRate}%`
                : "—"
          }
          delta={analytics?.kpis.conversionRateDeltaPct}
          hint={t(lang, "admin.home.kpi.vsPrev")}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-2">
        <KpiCard
          label={t(lang, "admin.home.kpi.newBreeders")}
          value={newBreeders}
          delta={deltaPercent(newBreeders, prevNewBreeders)}
          hint={t(lang, "admin.home.kpi.vsPrev")}
        />
        <KpiCard
          label={t(lang, "admin.home.kpi.newPosts")}
          value={newPosts}
          delta={deltaPercent(newPosts, prevNewPosts)}
          hint={t(lang, "admin.home.kpi.vsPrev")}
        />
      </div>
      {analyticsError ? (
        <p className="text-xs text-amber-800">{t(lang, "admin.home.analyticsUnavailable")}</p>
      ) : (
        <p className="text-[11px] text-[#B8A990]">{t(lang, "admin.home.kpi.activeUsersNote")}</p>
      )}

      {/* Tier 3 — Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title={t(lang, "admin.home.chart.growth")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={growthData}>
              <CartesianGrid stroke="#F0E6D8" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8B7355" }} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8B7355" }} width={28} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="users"
                name={t(lang, "admin.home.chart.users")}
                stroke="#D97706"
                fill="#FED7AA"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="breeders"
                name={t(lang, "admin.home.chart.breeders")}
                stroke="#059669"
                fill="#A7F3D0"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t(lang, "admin.home.chart.peakHours")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={peakHours}>
              <CartesianGrid stroke="#F0E6D8" strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#8B7355" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8B7355" }} width={28} />
              <Tooltip />
              <Bar dataKey="count" name={t(lang, "admin.home.chart.events")} fill="#D97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={t(lang, "admin.home.chart.farmSpecies")}
          legend={farmSpeciesData.length > 0 ? <PieLegend data={farmSpeciesData} /> : null}
        >
          {farmSpeciesData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[#8B7355]">
              {t(lang, "admin.home.emptyChart")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={farmSpeciesData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {farmSpeciesData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title={t(lang, "admin.home.chart.breeds")}
          legend={breedData.length > 0 ? <PieLegend data={breedData} /> : null}
        >
          {breedData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[#8B7355]">
              {t(lang, "admin.home.emptyChart")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breedData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {breedData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Tier 4 — Operational queue */}
      <div className="rounded-2xl border border-[#E8DFD0] bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#2B1E19]">{t(lang, "admin.home.ops.title")}</h2>
          <Link
            href={adminConsoleHref({ section: "requests" })}
            className="text-xs font-semibold text-[#B45309] hover:underline"
          >
            {t(lang, "admin.home.ops.openQueue")}
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link
            href={adminConsoleHref({ section: "listings", listingStatus: "pending_review" })}
            className="rounded-xl border border-[#E8DFD0] bg-[#FCFBFA] px-4 py-3 hover:border-[#D97706]/50"
          >
            <p className="text-2xl font-bold text-[#D97706]">{ops.pendingListings}</p>
            <p className="mt-1 text-xs font-medium text-[#5C4A3A]">
              {t(lang, "admin.home.ops.listings")}
            </p>
          </Link>
          <Link
            href={adminConsoleHref({ section: "reports", reportStatus: "open" })}
            className="rounded-xl border border-[#E8DFD0] bg-[#FCFBFA] px-4 py-3 hover:border-[#D97706]/50"
          >
            <p className="text-2xl font-bold text-[#D97706]">{ops.openReports}</p>
            <p className="mt-1 text-xs font-medium text-[#5C4A3A]">
              {t(lang, "admin.home.ops.reports")}
            </p>
          </Link>
          <Link
            href={adminConsoleHref({ section: "breeders", breederStatus: "waiting" })}
            className="rounded-xl border border-[#E8DFD0] bg-[#FCFBFA] px-4 py-3 hover:border-[#D97706]/50"
          >
            <p className="text-2xl font-bold text-[#D97706]">{ops.pendingBreeders}</p>
            <p className="mt-1 text-xs font-medium text-[#5C4A3A]">
              {t(lang, "admin.home.ops.breeders")}
            </p>
          </Link>
        </div>
        <p className="mt-3 text-xs text-[#8B7355]">
          {t(lang, "admin.home.ops.requestsTotal")}:{" "}
          <span className="font-semibold text-[#2B1E19]">{ops.pendingRequests}</span>
        </p>
      </div>
    </div>
  );
}
