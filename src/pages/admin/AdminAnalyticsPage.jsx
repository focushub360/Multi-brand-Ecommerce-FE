import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
  getAdminAnalytics,
  fetchAdminAnalyticsFromApi
} from '../../services/adminService';
import { RefreshCw, Package, Store, BarChart3, TrendingUp, Calendar } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('monthly'); // 'daily', 'weekly', 'monthly'
  const [analytics, setAnalytics] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await fetchAdminAnalyticsFromApi();
      if (data) {
        setAnalytics(data);
      } else {
        setAnalytics(getAdminAnalytics());
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setAnalytics(getAdminAnalytics());
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    document.title = 'Sales & Analytics | GROVE Admin';
    window.scrollTo(0, 0);
    const initial = getAdminAnalytics();
    if (initial && initial.kpis) {
      setAnalytics(initial);
    }
    loadData();
  }, []);

  // Scoped data based on active period filter ('daily' | 'weekly' | 'monthly')
  const activePeriodData = useMemo(() => {
    if (!analytics) return null;
    return analytics.periods?.[period] || null;
  }, [analytics, period]);

  const kpis = useMemo(() => {
    if (activePeriodData?.kpis) return activePeriodData.kpis;
    return analytics?.kpis || {
      totalGmv: '₹0',
      growthPercent: '0%',
      totalOrders: 0,
      avgOrderValue: '₹0',
      commissionEarned: '₹0',
      periodLabel: ''
    };
  }, [activePeriodData, analytics]);

  const trendData = useMemo(() => {
    if (activePeriodData?.trend && activePeriodData.trend.length > 0) return activePeriodData.trend;
    if (period === 'daily') return analytics?.dailyTrend || [];
    if (period === 'weekly') return analytics?.weeklyTrend || [];
    return analytics?.monthlyTrend || [];
  }, [activePeriodData, analytics, period]);

  const categoryBreakdown = useMemo(() => {
    if (activePeriodData?.categoryBreakdown && activePeriodData.categoryBreakdown.length > 0) {
      return activePeriodData.categoryBreakdown;
    }
    return analytics?.categoryBreakdown || [];
  }, [activePeriodData, analytics]);

  const dealerSalesRanking = useMemo(() => {
    if (activePeriodData?.dealerSalesRanking && activePeriodData.dealerSalesRanking.length > 0) {
      return activePeriodData.dealerSalesRanking;
    }
    return analytics?.dealerSalesRanking || [];
  }, [activePeriodData, analytics]);

  const topProducts = analytics?.topProducts || [];

  // SVG Chart calculation with safe division guarding
  const maxRevenue = trendData.length > 0 ? Math.max(...trendData.map((d) => Number(d.revenue || 0)), 1) : 1;
  const chartHeight = 180;
  const chartWidth = 600;
  const paddingX = 45;
  const paddingY = 30;
  const availableWidth = chartWidth - paddingX * 2;
  const availableHeight = chartHeight - paddingY * 2;

  const points = trendData.map((d, index) => {
    const x = paddingX + (index / Math.max(1, trendData.length - 1)) * availableWidth;
    const y = chartHeight - paddingY - (Number(d.revenue || 0) / maxRevenue) * availableHeight;
    return { ...d, x, y };
  });

  const pathD = points.reduce((acc, point, i) => {
    return i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Platform Commercial Intelligence"
        subtitle="Aggregated gross merchandising volume (GMV), dealer cohort revenue shares, and agricultural category velocity directly from database."
        badge="Live Database Analytics"
        breadcrumbs={[{ label: 'Analytics' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#C1C8C2]/60 text-xs font-semibold text-[#012D1D] hover:bg-[#F3FCF3] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Refresh live metrics from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-700' : 'text-[#717973]'}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Live DB'}</span>
            </button>
            <div className="inline-flex p-1 rounded-xl bg-white border border-[#C1C8C2]/60 shadow-2xs">
              {['daily', 'weekly', 'monthly'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold capitalize transition-all cursor-pointer ${
                    period === p
                      ? 'bg-[#012D1D] text-white shadow-2xs'
                      : 'text-[#717973] hover:text-[#012D1D]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* 1. KPIs - Dynamically updated based on active filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-[#C1C8C2]/60 shadow-2xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-[#717973]">Gross Merchandising Value</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F3FCF3] text-[#012D1D] border border-[#C1C8C2]/40 capitalize font-bold">
              {period}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <span className="text-2xl font-black text-[#012D1D] font-heading">{kpis.totalGmv}</span>
            <span className={`text-[11px] font-mono font-bold ${kpis.growthPercent?.startsWith('-') ? 'text-rose-600' : 'text-emerald-600'}`}>
              {kpis.growthPercent}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#717973] block mt-1">
            {period === 'daily' && kpis.todayGmv ? `7D Window • Today: ${kpis.todayGmv}` : (kpis.periodLabel || 'All-time volume')}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#C1C8C2]/60 shadow-2xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-[#717973]">Total Orders Fulfilled</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F3FCF3] text-[#012D1D] border border-[#C1C8C2]/40 capitalize font-bold">
              {period}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <span className="text-2xl font-black text-[#012D1D] font-heading">{kpis.totalOrders}</span>
            <span className="text-[11px] font-mono text-emerald-600 font-bold capitalize">Checkouts</span>
          </div>
          <span className="text-[10px] font-mono text-[#717973] block mt-1">
            {period === 'daily' && kpis.todayOrders !== undefined ? `Today: ${kpis.todayOrders} fulfilled` : 'Completed orders'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#C1C8C2]/60 shadow-2xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-[#717973]">Average Order Value (AOV)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F3FCF3] text-[#012D1D] border border-[#C1C8C2]/40 capitalize font-bold">
              {period}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <span className="text-2xl font-black text-[#012D1D] font-heading">{kpis.avgOrderValue}</span>
            <span className="text-[11px] font-mono text-[#717973]">per ticket</span>
          </div>
          <span className="text-[10px] font-mono text-[#717973] block mt-1">
            Ticket size for {period}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-300 shadow-2xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-800">Net Commission Retained</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-[#0E5138] capitalize font-bold">
              {period}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <span className="text-2xl font-black text-[#0E5138] font-heading">{kpis.commissionEarned}</span>
            <span className="text-[11px] font-mono text-emerald-700 font-bold">5.0% take</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 block mt-1">
            Platform Retained Revenue
          </span>
        </div>
      </div>

      {/* 2. SVG Sales Trend Chart */}
      <div className="bg-white rounded-3xl border border-[#C1C8C2]/60 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-[#012D1D] font-heading">
              Sales Velocity &amp; Revenue Curve ({period.toUpperCase()})
            </h3>
            <p className="text-xs text-[#717973]">
              Dynamic database aggregation of completed checkout volumes in INR ({kpis.periodLabel || period}).
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#0E5138] bg-[#F3FCF3] px-2.5 py-1 rounded-full border border-[#C1C8C2]/40">
            Live {period.toUpperCase()} Feed
          </span>
        </div>

        <div className="relative w-full overflow-hidden py-2">
          {trendData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-[#717973] font-mono">
              No sales telemetry recorded for the selected period.
            </div>
          ) : (
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-48 sm:h-56 overflow-visible">
              <defs>
                <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#AEEECB" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#AEEECB" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid */}
              {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
                <line
                  key={i}
                  x1={paddingX}
                  y1={chartHeight - paddingY - ratio * availableHeight}
                  x2={chartWidth - paddingX}
                  y2={chartHeight - paddingY - ratio * availableHeight}
                  stroke="#E3EBE4"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
              ))}

              {areaD && <path d={areaD} fill="url(#analyticsGradient)" />}
              {pathD && <path d={pathD} fill="none" stroke="#012D1D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

              {points.map((pt, idx) => {
                const isHovered = hoveredIndex === idx;
                return (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {isHovered && <circle cx={pt.x} cy={pt.y} r="8" fill="#AEEECB" fillOpacity="0.7" />}
                    <circle cx={pt.x} cy={pt.y} r={isHovered ? 5 : 4} fill={isHovered ? '#012D1D' : '#ffffff'} stroke="#012D1D" strokeWidth="2" />
                    {isHovered && (
                      <g>
                        <rect x={Math.max(10, Math.min(chartWidth - 120, pt.x - 55))} y={Math.max(10, pt.y - 32)} width="110" height="24" rx="6" fill="#012D1D" />
                        <text x={Math.max(10, Math.min(chartWidth - 120, pt.x - 55)) + 55} y={Math.max(10, pt.y - 32) + 16} textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                          {pt.displayRev || `₹${pt.revenue}`} ({pt.orders} {pt.orders === 1 ? 'order' : 'orders'})
                        </text>
                      </g>
                    )}
                    <text x={pt.x} y={chartHeight - 8} textAnchor="middle" fill="#717973" fontSize="10" fontFamily="monospace" fontWeight="bold">
                      {pt.period}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* 3. Category Breakdown & Dealer Leaderboard Grid - Aligned with active period */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#C1C8C2]/60 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-[#012D1D] font-heading">
                Category GMV Share ({period.toUpperCase()})
              </h3>
              <p className="text-xs text-[#717973]">Gross volume breakdown across verticals for this period.</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F3FCF3] text-[#012D1D] font-bold border border-[#C1C8C2]/40 capitalize">
              {period}
            </span>
          </div>

          <div className="space-y-4">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-[#717973] italic py-4 text-center">No category distribution data recorded for this period.</p>
            ) : (
              categoryBreakdown.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#151D18]">{cat.category}</span>
                    <span className="font-mono font-bold text-[#012D1D]">{cat.sharePercent}% ({cat.revenue})</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                    <div style={{ width: `${Math.min(100, Math.max(0, cat.sharePercent))}%` }} className={`h-full ${cat.color || 'bg-[#012D1D]'}`} />
                  </div>
                  <span className="text-[10px] font-mono text-[#717973] block">{cat.orders} completed checkouts</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dealer Sales Ranking (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#C1C8C2]/60 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-[#012D1D] font-heading">
                Dealer GMV Leaderboard ({period.toUpperCase()})
              </h3>
              <p className="text-xs text-[#717973]">Merchant enterprises ranked by sales volume in this period.</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F3FCF3] text-[#012D1D] font-bold border border-[#C1C8C2]/40 capitalize">
              {period}
            </span>
          </div>

          <div className="overflow-x-auto">
            {dealerSalesRanking.length === 0 ? (
              <p className="text-xs text-[#717973] italic py-4 text-center">No dealer sales ranking recorded for this period.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#C1C8C2]/40 text-[#717973] font-mono uppercase text-[10px]">
                    <th className="pb-2 font-bold">Dealer</th>
                    <th className="pb-2 font-bold text-center">Orders</th>
                    <th className="pb-2 font-bold text-right">GMV</th>
                    <th className="pb-2 font-bold text-right">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C1C8C2]/30">
                  {dealerSalesRanking.map((dealer, idx) => (
                    <tr key={dealer.dealerId || idx} className="hover:bg-[#F8FAF8]">
                      <td className="py-2.5 font-bold text-[#151D18]">{dealer.dealerName}</td>
                      <td className="py-2.5 text-center font-mono text-[#717973]">{dealer.orders}</td>
                      <td className="py-2.5 text-right font-mono font-black text-[#012D1D]">{dealer.revenue}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-emerald-700">{dealer.sharePercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 4. Top Selling Products (Live Database Performance) */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#C1C8C2]/60 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-[#012D1D] font-heading">Top Performing Products</h3>
              <p className="text-xs text-[#717973]">Best-selling catalog items ordered by total checkout volume.</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#0E5138] bg-[#F3FCF3] px-2.5 py-1 rounded-full border border-[#C1C8C2]/40">
              {topProducts.length} Top Items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#C1C8C2]/40 text-[#717973] font-mono uppercase text-[10px]">
                  <th className="pb-2 font-bold">Product</th>
                  <th className="pb-2 font-bold">SKU</th>
                  <th className="pb-2 font-bold">Category</th>
                  <th className="pb-2 font-bold">Dealer</th>
                  <th className="pb-2 font-bold text-center">Units Sold</th>
                  <th className="pb-2 font-bold text-right">Gross Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C1C8C2]/30">
                {topProducts.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-[#F8FAF8]">
                    <td className="py-2.5 font-bold text-[#151D18]">{p.name}</td>
                    <td className="py-2.5 font-mono text-[#717973]">{p.sku}</td>
                    <td className="py-2.5 text-[#3F4943]">{p.category || 'General'}</td>
                    <td className="py-2.5 text-[#3F4943]">{p.dealer || '—'}</td>
                    <td className="py-2.5 text-center font-mono font-bold text-[#012D1D]">{p.totalSales || 0}</td>
                    <td className="py-2.5 text-right font-mono font-black text-[#012D1D]">₹{Number(p.revenue || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
