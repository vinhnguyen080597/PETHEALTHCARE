import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Dimensions, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { getAdminProductAnalyticsDashboard } from '../api';
import type { AccountProfile, BreederProfile, PetFeedPost } from '../types';
import type { AdminConsoleSection } from '../constants/adminConsoleNav';
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
} from '../utils/adminHomeAnalytics';
import { BRAND } from '../theme/brand';

type AdminHomeAnalyticsProps = {
  token: string | null;
  accounts: AccountProfile[];
  posts: PetFeedPost[];
  breeders: BreederProfile[];
  ops: {
    pendingListings: number;
    openReports: number;
    pendingBreeders: number;
    pendingRequests: number;
  };
  onSectionChange: (section: AdminConsoleSection) => void;
  onOpenCreateNews: () => void;
  onSetListingPending: () => void;
  onSetReportOpen: () => void;
  onSetBreederPending: () => void;
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
  const up = (delta ?? 0) > 0;
  const down = (delta ?? 0) < 0;
  return (
    <View className="min-w-[46%] flex-1 rounded-2xl border border-[#E8DFD0] bg-white p-3.5">
      <Text className="text-[10px] font-bold uppercase tracking-wide text-[#8B7355]">{label}</Text>
      <Text className="mt-1.5 text-2xl font-bold text-[#2B1E19]">{value}</Text>
      {typeof delta === 'number' ? (
        <Text
          className={`mt-1 text-[11px] font-semibold ${
            up ? 'text-emerald-700' : down ? 'text-red-700' : 'text-[#8B7355]'
          }`}
        >
          {formatDelta(delta)} {hint ? <Text className="font-medium text-[#8B7355]">{hint}</Text> : null}
        </Text>
      ) : hint ? (
        <Text className="mt-1 text-[11px] text-[#8B7355]">{hint}</Text>
      ) : null}
    </View>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-3 rounded-2xl border border-[#E8DFD0] bg-white p-4">
      <Text className="mb-3 text-sm font-bold text-[#2B1E19]">{title}</Text>
      {children}
    </View>
  );
}

function PieLegend({
  data,
}: {
  data: Array<{ name: string; value: number; color?: string }>;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <View className="mt-3 flex-row flex-wrap gap-x-3 gap-y-1">
      {data.map((item) => (
        <View key={item.name} className="mb-1 flex-row items-center gap-1.5">
          <View
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color || '#D97706' }}
          />
          <Text className="text-[11px] font-medium text-[#5C4A3A]">
            {item.name}{' '}
            <Text className="text-[#8B7355]">
              {item.value} ({Math.round((item.value / total) * 100)}%)
            </Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

export function AdminHomeAnalytics({
  token,
  accounts,
  posts,
  breeders,
  ops,
  onSectionChange,
  onOpenCreateNews,
  onSetListingPending,
  onSetReportOpen,
  onSetBreederPending,
}: AdminHomeAnalyticsProps) {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<HomeRangePreset>('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [analytics, setAnalytics] = useState<ProductAnalyticsDashboard | null>(null);
  const [todayAnalytics, setTodayAnalytics] = useState<ProductAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const chartWidth = Math.min(Dimensions.get('window').width - 64, 360);

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
  const farmSpeciesData = useMemo(() => breederSpeciesSlices(breeders), [breeders]);
  const breedData = useMemo(() => breedInterestSlices(posts, range), [posts, range]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    void Promise.all([
      getAdminProductAnalyticsDashboard(token, range.days).then((res) => res.data),
      range.days === 1
        ? Promise.resolve(null)
        : getAdminProductAnalyticsDashboard(token, 1).then((res) => res.data),
    ])
      .then(([rangeData, todayData]) => {
        if (cancelled) return;
        setAnalytics(rangeData);
        setTodayAnalytics(range.days === 1 ? rangeData : todayData);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAnalytics(null);
        setTodayAnalytics(null);
        setError(err instanceof Error ? err.message : 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, range.days]);

  const lineUsers = growthData.map((row, index) => ({
    value: row.users,
    label: index % Math.max(1, Math.ceil(growthData.length / 5)) === 0 ? row.date.slice(5) : '',
  }));
  const lineBreeders = growthData.map((row) => ({ value: row.breeders }));

  const peakBars = (analytics?.peakHours ?? []).map((row) => ({
    value: row.count,
    label: row.hour % 4 === 0 ? String(row.hour) : '',
    frontColor: '#D97706',
  }));

  const pieFarm = farmSpeciesData.map((item) => ({
    value: item.value,
    color: item.color || '#D97706',
    text: '',
  }));
  const pieBreed = breedData.map((item) => ({
    value: item.value,
    color: item.color || '#D97706',
    text: '',
  }));

  const chips: Array<{ key: HomeRangePreset; label: string }> = [
    { key: 'today', label: t('adminConsole.home.range.today') },
    { key: '7d', label: t('adminConsole.home.range.7d') },
    { key: '30d', label: t('adminConsole.home.range.30d') },
    { key: 'custom', label: t('adminConsole.home.range.custom') },
  ];

  return (
    <View className="mt-5">
      <Text className="mb-1 text-sm text-[#8B7355]">{t('adminConsole.home.subtitle')}</Text>

      <View className="mb-3 rounded-2xl border border-[#E8DFD0] bg-white p-3">
        <Text className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#8B7355]">
          {t('adminConsole.home.range.label')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {chips.map((chip) => (
            <Pressable
              key={chip.key}
              onPress={() => setPreset(chip.key)}
              className={`rounded-full px-3 py-2 ${
                preset === chip.key ? 'bg-[#FFF1DE]' : 'bg-[#F3EDE3]'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  preset === chip.key ? 'text-[#B45309]' : 'text-[#5C4A3A]'
                }`}
              >
                {chip.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {preset === 'custom' ? (
          <View className="mt-3 flex-row gap-2">
            <TextInput
              className="min-h-[44px] flex-1 rounded-xl border border-[#E8DFD0] bg-[#FCFBFA] px-3 text-sm text-[#2B1E19]"
              placeholder={t('adminConsole.home.range.from')}
              placeholderTextColor="#B8A990"
              value={customFrom}
              onChangeText={setCustomFrom}
            />
            <TextInput
              className="min-h-[44px] flex-1 rounded-xl border border-[#E8DFD0] bg-[#FCFBFA] px-3 text-sm text-[#2B1E19]"
              placeholder={t('adminConsole.home.range.to')}
              placeholderTextColor="#B8A990"
              value={customTo}
              onChangeText={setCustomTo}
            />
          </View>
        ) : null}
      </View>

      <View className="mb-3 flex-row flex-wrap gap-3">
        <KpiCard
          label={t('adminConsole.home.kpi.newUsersToday')}
          value={newUsersToday}
          delta={deltaPercent(newUsersToday, newUsersYesterday)}
          hint={t('adminConsole.home.kpi.vsYesterday')}
        />
        <KpiCard
          label={t('adminConsole.home.kpi.trafficToday')}
          value={loading ? '…' : (todayAnalytics?.kpis.totalEvents ?? '—')}
          delta={todayAnalytics?.kpis.totalEventsDeltaPct}
          hint={
            typeof todayAnalytics?.kpis.activeUsers === 'number'
              ? t('adminConsole.home.kpi.trafficTodayHint', {
                  users: todayAnalytics.kpis.activeUsers,
                })
              : t('adminConsole.home.kpi.vsYesterday')
          }
        />
        <KpiCard
          label={t('adminConsole.home.kpi.traffic')}
          value={loading ? '…' : (analytics?.kpis.totalEvents ?? '—')}
          delta={analytics?.kpis.totalEventsDeltaPct}
          hint={t('adminConsole.home.kpi.vsPrev')}
        />
        <KpiCard
          label={t('adminConsole.home.kpi.activeUsers')}
          value={loading ? '…' : (analytics?.kpis.activeUsers ?? '—')}
          delta={analytics?.kpis.activeUsersDeltaPct}
          hint={t('adminConsole.home.kpi.vsPrev')}
        />
        <KpiCard
          label={t('adminConsole.home.kpi.newUsers')}
          value={newUsers}
          delta={deltaPercent(newUsers, prevNewUsers)}
          hint={t('adminConsole.home.kpi.vsPrev')}
        />
        <KpiCard
          label={t('adminConsole.home.kpi.conversion')}
          value={
            loading ? '…' : analytics ? `${analytics.kpis.conversionRate}%` : '—'
          }
          delta={analytics?.kpis.conversionRateDeltaPct}
          hint={t('adminConsole.home.kpi.vsPrev')}
        />
        <KpiCard
          label={t('adminConsole.home.kpi.newBreeders')}
          value={newBreeders}
          delta={deltaPercent(newBreeders, prevNewBreeders)}
          hint={t('adminConsole.home.kpi.vsPrev')}
        />
        <KpiCard
          label={t('adminConsole.home.kpi.newPosts')}
          value={newPosts}
          delta={deltaPercent(newPosts, prevNewPosts)}
          hint={t('adminConsole.home.kpi.vsPrev')}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={BRAND.loadingSpinner} className="mb-3" />
      ) : null}
      {error ? (
        <Text className="mb-3 text-xs text-amber-800">{t('adminConsole.home.analyticsUnavailable')}</Text>
      ) : (
        <Text className="mb-3 text-[11px] text-[#B8A990]">{t('adminConsole.home.kpi.activeUsersNote')}</Text>
      )}

      <ChartCard title={t('adminConsole.home.chart.growth')}>
        {growthData.every((row) => row.users === 0 && row.breeders === 0) ? (
          <Text className="py-8 text-center text-sm text-[#8B7355]">{t('adminConsole.home.emptyChart')}</Text>
        ) : (
          <>
            <View className="mb-2 flex-row gap-4">
              <Text className="text-[11px] font-semibold text-[#D97706]">
                ● {t('adminConsole.home.chart.users')}
              </Text>
              <Text className="text-[11px] font-semibold text-[#059669]">
                ● {t('adminConsole.home.chart.breeders')}
              </Text>
            </View>
            <LineChart
              data={lineUsers}
              data2={lineBreeders}
              height={180}
              width={chartWidth}
              color1="#D97706"
              color2="#059669"
              startFillColor1="#FED7AA"
              startFillColor2="#A7F3D0"
              endFillColor1="#FFF7ED"
              endFillColor2="#ECFDF5"
              startOpacity={0.45}
              endOpacity={0.05}
              areaChart
              curved
              thickness={2}
              hideDataPoints
              yAxisColor="#E8DFD0"
              xAxisColor="#E8DFD0"
              yAxisTextStyle={{ color: '#8B7355', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#8B7355', fontSize: 10 }}
              noOfSections={4}
              spacing={Math.max(18, Math.floor(chartWidth / Math.max(growthData.length, 1)) - 4)}
            />
          </>
        )}
      </ChartCard>

      <ChartCard title={t('adminConsole.home.chart.peakHours')}>
        {peakBars.every((row) => row.value === 0) ? (
          <Text className="py-8 text-center text-sm text-[#8B7355]">{t('adminConsole.home.emptyChart')}</Text>
        ) : (
          <BarChart
            data={peakBars}
            height={180}
            width={chartWidth}
            barWidth={8}
            spacing={4}
            roundedTop
            hideRules={false}
            rulesColor="#F0E6D8"
            yAxisColor="#E8DFD0"
            xAxisColor="#E8DFD0"
            yAxisTextStyle={{ color: '#8B7355', fontSize: 10 }}
            xAxisLabelTextStyle={{ color: '#8B7355', fontSize: 9 }}
            noOfSections={4}
          />
        )}
      </ChartCard>

      <ChartCard title={t('adminConsole.home.chart.farmSpecies')}>
        {farmSpeciesData.length === 0 ? (
          <Text className="py-8 text-center text-sm text-[#8B7355]">{t('adminConsole.home.emptyChart')}</Text>
        ) : (
          <View className="items-center">
            <PieChart data={pieFarm} donut radius={78} innerRadius={48} />
            <PieLegend data={farmSpeciesData} />
          </View>
        )}
      </ChartCard>

      <ChartCard title={t('adminConsole.home.chart.breeds')}>
        {breedData.length === 0 ? (
          <Text className="py-8 text-center text-sm text-[#8B7355]">{t('adminConsole.home.emptyChart')}</Text>
        ) : (
          <View className="items-center">
            <PieChart data={pieBreed} donut radius={78} innerRadius={48} />
            <PieLegend data={breedData} />
          </View>
        )}
      </ChartCard>

      <View className="mb-3 rounded-2xl border border-[#E8DFD0] bg-white p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-[#2B1E19]">{t('adminConsole.home.ops.title')}</Text>
          <Pressable onPress={() => onSectionChange('requests')}>
            <Text className="text-xs font-semibold text-[#B45309]">
              {t('adminConsole.home.ops.openQueue')}
            </Text>
          </Pressable>
        </View>
        <View className="gap-2">
          <Pressable
            onPress={() => {
              onSetListingPending();
              onSectionChange('listings');
            }}
            className="rounded-xl border border-[#E8DFD0] bg-[#FCFBFA] px-4 py-3 active:bg-[#FFF8F0]"
          >
            <Text className="text-2xl font-bold text-[#D97706]">{ops.pendingListings}</Text>
            <Text className="mt-1 text-xs font-medium text-[#5C4A3A]">
              {t('adminConsole.home.ops.listings')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              onSetReportOpen();
              onSectionChange('reports');
            }}
            className="rounded-xl border border-[#E8DFD0] bg-[#FCFBFA] px-4 py-3 active:bg-[#FFF8F0]"
          >
            <Text className="text-2xl font-bold text-[#D97706]">{ops.openReports}</Text>
            <Text className="mt-1 text-xs font-medium text-[#5C4A3A]">
              {t('adminConsole.home.ops.reports')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              onSetBreederPending();
              onSectionChange('breeders');
            }}
            className="rounded-xl border border-[#E8DFD0] bg-[#FCFBFA] px-4 py-3 active:bg-[#FFF8F0]"
          >
            <Text className="text-2xl font-bold text-[#D97706]">{ops.pendingBreeders}</Text>
            <Text className="mt-1 text-xs font-medium text-[#5C4A3A]">
              {t('adminConsole.home.ops.breeders')}
            </Text>
          </Pressable>
        </View>
        <Text className="mt-3 text-xs text-[#8B7355]">
          {t('adminConsole.home.ops.requestsTotal')}:{' '}
          <Text className="font-semibold text-[#2B1E19]">{ops.pendingRequests}</Text>
        </Text>
      </View>

      <Pressable
        className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-2xl bg-[#D97706] py-3.5 active:opacity-90"
        onPress={onOpenCreateNews}
      >
        <Text className="text-sm font-bold text-white">{t('adminPost.createTitle')}</Text>
      </Pressable>
    </View>
  );
}
