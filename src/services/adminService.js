import { adminApi, productsApi, ordersApi, categoriesApi } from './apiClient.js';
import { getStoredAdmin, setStoredAdmin } from '../utils/adminAuth.js';

const defaultDashboardData = {
  kpis: {
    totalDealers: { value: 0, growth: '—', subtext: 'Approved dealers' },
    totalCustomers: { value: 0, growth: '—', subtext: 'Registered users' },
    totalProducts: { value: 0, growth: '—', subtext: 'Catalog products' },
    totalOrders: { value: 0, growth: '—', subtext: 'All time' },
    totalRevenue: { value: '₹0', growth: '—', subtext: 'Gross platform volume' },
    pendingTickets: { value: 0, urgentCount: 0, subtext: 'Open complaints' }
  },
  salesOverview: {
    Today: { gmv: '₹0', growth: '—', orders: 0, aov: '₹0', platformCommission: '₹0' },
    '7D': { gmv: '₹0', growth: '—', orders: 0, aov: '₹0', platformCommission: '₹0' },
    '30D': { gmv: '₹0', growth: '—', orders: 0, aov: '₹0', platformCommission: '₹0' },
    Year: { gmv: '₹0', growth: '—', orders: 0, aov: '₹0', platformCommission: '₹0' }
  },
  revenueTrend: [],
  orderStatusSummary: [],
  topSellingProducts: [],
  dealerPerformance: [],
  recentOrders: [],
  recentTickets: []
};

const defaultAdminSettings = {
  general: {
    marketplaceName: 'GROVE Agritech & Commercial Marketplace',
    platformName: 'GROVE Agritech & Commercial Marketplace',
    supportEmail: 'operations@grove.com',
    supportPhone: '+91 80000 12345',
    helplineNumber: '+91 80000 12345',
    defaultCurrency: 'INR (₹)',
    timezone: 'Asia/Kolkata (IST)',
    maintenanceMode: false,
    systemVersion: '2.4.0'
  },
  commission: {
    defaultCommissionRate: 5.0,
    minPayoutThreshold: 10000,
    escrowHoldPeriodDays: 3,
    taxTcsRate: 1.0
  },
  commissions: {
    defaultCommissionRate: 5.0,
    agricultureCommissionRate: 4.5,
    electronicsCommissionRate: 7.0,
    automotiveCommissionRate: 6.0,
    payoutCycleDays: 7,
    autoApproveKYC: false
  },
  notifications: {
    emailOnNewKyc: true,
    emailOnLowStock: true,
    emailDailySummary: true,
    emailOnEscalatedDispute: true
  },
  security: {
    twoFactorAdmin: true,
    sessionTimeoutMinutes: 60,
    passwordExpirationDays: 90,
    enforceStrongPasswords: true
  }
};

const STORAGE_KEYS = {
  DASHBOARD_DATA: 'grove_admin_dashboard_data',
  DEALERS_LIST: 'grove_admin_dealers_list',
  PRODUCTS_LIST: 'grove_admin_products_list',
  ORDERS_LIST: 'grove_admin_orders_list',
  CUSTOMERS_LIST: 'grove_admin_customers_list',
  LOCATIONS_LIST: 'grove_admin_locations_list',
  CATEGORIES_LIST: 'grove_admin_categories_list',
  ANALYTICS_DATA: 'grove_admin_analytics_data',
  PAYMENTS_DATA: 'grove_admin_payments_data',
  SUPPORT_TICKETS: 'grove_admin_support_tickets',
  REPORTS_DATA: 'grove_admin_reports_data',
  SETTINGS_DATA: 'grove_admin_settings_data',
  INVENTORY_LOGS: 'grove_admin_inventory_logs'
};

// Module-level deduplication to prevent slamming backend with 13 parallel calls on every render
let inFlightAdminSyncPromise = null;
let lastAdminSyncTime = 0;
const ADMIN_SYNC_TTL_MS = 20 * 1000; // 20 seconds cache

/**
 * Lightweight sync for complaints/tickets only (used by support pages to avoid fetching all 13 collections)
 */
export async function syncAdminComplaints() {
  try {
    const res = await adminApi.getComplaints();
    const rawComplaints = res?.data || res?.tickets || (Array.isArray(res) ? res : []);
    if (Array.isArray(rawComplaints)) {
      const mapped = rawComplaints.map((c) => ({
        id: c.ticketId || String(c._id),
        _id: String(c._id || c.ticketId),
        ticketType: c.ticketType || (c.customerSnapshot?.email ? 'customer' : 'dealer'),
        requesterName: c.requesterName || (c.customerSnapshot?.name || c.dealerSnapshot?.businessName || 'User'),
        requesterEmail: c.requesterEmail || (c.customerSnapshot?.email || c.dealerSnapshot?.email || ''),
        requesterRole: c.requesterRole || (c.ticketType === 'customer' || c.customerSnapshot?.email ? 'Customer' : 'Dealer'),
        concernedDealer: c.concernedDealerName || c.dealerSnapshot?.businessName || 'GROVE',
        dealerSnapshot: c.dealerSnapshot || {},
        customerSnapshot: c.customerSnapshot || {},
        orderSnapshot: c.orderSnapshot || null,
        subject: c.subject,
        category: c.category || 'Other / General',
        status: c.status || 'Open',
        orderId: c.orderNumber || c.orderSnapshot?.orderNumber || '—',
        attachments: c.attachments || [],
        statusHistory: c.statusHistory || [],
        createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
        lastUpdated: 'Recently',
        messages: (c.messages || []).map((m) => ({
          id: String(m._id || m.id || Math.random()),
          sender: m.senderName || (m.senderRole === 'admin' ? 'GROVE Platform Operations' : (c.ticketType === 'customer' ? 'Customer' : 'Dealer')),
          senderRole: m.senderRole || 'dealer',
          timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Recent',
          text: m.text,
          attachments: m.attachments || []
        })),
        internalNotes: (c.internalNotes || []).map((n) => n.note || String(n))
      }));
      saveAdminSupportTickets(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Backend complaints fetch warning:', err.message);
  }
  return getAdminSupportTickets();
}

/**
 * Asynchronously synchronizes all admin collections from the live backend MongoDB API.
 * Debounced with 20s TTL and in-flight promise sharing.
 */
export async function syncAdminDataFromApi(force = false) {
  const now = Date.now();
  if (!force && (now - lastAdminSyncTime < ADMIN_SYNC_TTL_MS)) {
    return true;
  }
  if (inFlightAdminSyncPromise) {
    return inFlightAdminSyncPromise;
  }

  inFlightAdminSyncPromise = (async () => {
    try {
      await doSyncAdminDataFromApi();
      lastAdminSyncTime = Date.now();
      return true;
    } finally {
      inFlightAdminSyncPromise = null;
    }
  })();

  return inFlightAdminSyncPromise;
}

async function doSyncAdminDataFromApi() {
  try {
    const [dealersRes, prodsRes, ordersRes, catsRes, locsRes, setsRes, complsRes, logsRes, settingsRes, usersRes, paymentsRes, inventoryRes, overviewRes] =
      await Promise.allSettled([
        adminApi.getDealers(),
        adminApi.getProducts({ limit: 100 }),
        ordersApi.getAdminOrders(),
        categoriesApi.getAllAdmin ? categoriesApi.getAllAdmin().catch(() => categoriesApi.getAll()) : categoriesApi.getAll(),
        adminApi.getLocations(),
        adminApi.getSettlements(),
        adminApi.getComplaints(),
        adminApi.getAuditLogs(),
        adminApi.getSettings(),
        adminApi.getUsers(),
        adminApi.getPayments(),
        adminApi.getInventoryTransactions({ limit: 100 }),
        adminApi.getOverview()
      ]);

    if (dealersRes.status === 'fulfilled') {
      const dealers = dealersRes.value?.dealers || (Array.isArray(dealersRes.value) ? dealersRes.value : []);
      if (dealers.length > 0) {
        saveAdminDealers(dealers.map((d) => ({
          ...d,
          id: d.dealerCode || d.id || d._id,
          status: d.status === 'APPROVED' ? 'Active' : d.status === 'PENDING' ? 'Pending KYC' : 'Suspended'
        })));
      }
    }

    if (prodsRes.status === 'fulfilled') {
      const prods = prodsRes.value?.products || prodsRes.value?.data?.products || prodsRes.value?.data || (Array.isArray(prodsRes.value) ? prodsRes.value : []);
      if (prods.length > 0) {
        saveAdminProducts(prods.map((p) => ({
          ...p,
          id: p.id || p._id,
          category: p.categoryName || p.category,
          dealerId: p.dealerCode || 'DEALER_001',
          stock: p.stock,
          price: p.price,
          mrp: p.mrp || p.price
        })));
      }
    }

    if (ordersRes.status === 'fulfilled') {
      const orders = ordersRes.value?.orders || (Array.isArray(ordersRes.value) ? ordersRes.value : []);
      if (orders.length > 0) {
        saveAdminOrders(orders.map((o) => ({
          ...o,
          id: o.orderNumber || o.id,
          amount: o.pricing?.total || o.amount,
          amountFormatted: `₹${Number(o.pricing?.total || o.amount || 0).toLocaleString('en-IN')}`,
          orderStatus: o.orderStatus,
          paymentStatus: o.payment?.status === 'Completed' ? 'Paid' : 'Pending',
          date: o.createdAt
        })));
      }
    }

    if (catsRes.status === 'fulfilled') {
      const rawCategories = catsRes.value?.categories || catsRes.value?.data || (Array.isArray(catsRes.value) ? catsRes.value : []);
      if (Array.isArray(rawCategories) && rawCategories.length > 0) {
        saveAdminCategories(rawCategories.map(normalizeCategory).filter(Boolean));
      }
    }

    if (locsRes.status === 'fulfilled') {
      const locs = locsRes.value?.locations || (Array.isArray(locsRes.value) ? locsRes.value : []);
      if (locs.length > 0) {
        saveAdminLocations(locs.map((l) => ({
          ...l,
          id: l.hubCode || l.id || l._id
        })));
      }
    }

    if (complsRes.status === 'fulfilled') {
      const tickets = complsRes.value?.tickets || (Array.isArray(complsRes.value) ? complsRes.value : []);
      if (tickets.length > 0) {
        saveAdminSupportTickets(tickets.map((t) => ({
          ...t,
          id: t.ticketId || t.id || t._id
        })));
      }
    }

    if (logsRes.status === 'fulfilled') {
      const logs = logsRes.value?.data || logsRes.value?.auditLogs || logsRes.value?.logs || (Array.isArray(logsRes.value) ? logsRes.value : []);
      if (Array.isArray(logs) && logs.length > 0) {
        const current = getAdminReportsData();
        saveAdminReportsData({
          ...current,
          auditLogs: logs.map(normalizeAuditLog).filter(Boolean)
        });
      }
    }

    if (inventoryRes.status === 'fulfilled') {
      const movements = inventoryRes.value?.data || inventoryRes.value || [];
      if (Array.isArray(movements)) {
        localStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(movements.map((entry) => ({
          id: entry._id, sku: entry.product?.sku || '', productName: entry.product?.name || 'Product',
          dealer: entry.dealer?.businessName || 'Dealer', delta: `${entry.quantityChange >= 0 ? '+' : ''}${entry.quantityChange}`,
          newStock: entry.balanceAfter, reason: entry.reason,
          timestamp: entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-IN') : '',
          admin: entry.performedBy?.name || entry.performedBy?.email || 'System'
        }))));
      }
    }

    if (settingsRes.status === 'fulfilled') {
      const rawSettings = settingsRes.value?.data || settingsRes.value?.settings || settingsRes.value;
      if (rawSettings && typeof rawSettings === 'object') {
        saveAdminSettings(normalizeAdminSettings(rawSettings));
      }
    }

    if (usersRes.status === 'fulfilled') {
      const users = usersRes.value?.users || usersRes.value?.data || (Array.isArray(usersRes.value) ? usersRes.value : []);
      if (Array.isArray(users)) {
        saveAdminCustomers(users.map((u) => ({
          ...u,
          id: u.id || u._id,
          name: u.name,
          email: u.email,
          phone: u.phone || '—',
          status: u.status === 'ACTIVE' ? 'Active' : 'Suspended',
          ordersCount: u.ordersCount || 0,
          totalSpent: u.totalSpent || 0
        })));
      }
    }

    if (paymentsRes.status === 'fulfilled') {
      const result = paymentsRes.value?.data || paymentsRes.value || {};
      const rows = result.payments || [];
      const settlements = setsRes.status === 'fulfilled' ? (setsRes.value?.data || setsRes.value || []) : [];
      const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
      const summary = result.summary || {};
      localStorage.setItem(STORAGE_KEYS.PAYMENTS_DATA, JSON.stringify({
        summary: {
          totalVolume: money(summary.totalVolume), escrowHeld: money(summary.escrowHeld),
          settledToDealers: money(summary.settledToDealers),
          commissionRetained: money(settlements.reduce((total, item) => total + Number(item.commissionDeducted || 0), 0))
        },
        transactions: rows.map((p) => ({
          id: p.transactionId || p._id, orderId: p.orderNumber || p.order || '—',
          customer: p.customerName || '—', dealer: p.dealerName || '—',
          amount: Number(p.amount || 0), amountFormatted: money(p.amount),
          paymentMethod: p.paymentMethod || '—',
          status: ({ COMPLETED: 'Completed', FAILED: 'Failed', REFUNDED: 'Refunded', PENDING: 'Pending' })[p.status] || p.status
        })),
        dealerSettlements: settlements.map((s) => ({
          id: s.settlementId || s._id, dealerName: s.dealerName || s.dealer?.businessName || '—',
          bankAccount: 'Restricted', orderCount: s.dealerOrders?.length || 0,
          grossSalesFormatted: money(s.grossAmount), commissionDeductedFormatted: money(s.commissionDeducted),
          netPayoutFormatted: money(s.netPayout),
          status: ({ SETTLED: 'Settled', HELD: 'Pending Clearance', PROCESSING: 'Pending Clearance', FAILED: 'Failed' })[s.status] || s.status
        }))
      }));
    }

    if (complsRes.status === 'fulfilled') {
      const rawComplaints = complsRes.value?.data || complsRes.value?.tickets || (Array.isArray(complsRes.value) ? complsRes.value : []);
      if (Array.isArray(rawComplaints)) {
        const mapped = rawComplaints.map((c) => ({
          id: c.ticketId || String(c._id),
          _id: String(c._id || c.ticketId),
          ticketType: c.ticketType || (c.customerSnapshot?.email ? 'customer' : 'dealer'),
          requesterName: c.requesterName || (c.customerSnapshot?.name || c.dealerSnapshot?.businessName || 'User'),
          requesterEmail: c.requesterEmail || (c.customerSnapshot?.email || c.dealerSnapshot?.email || ''),
          requesterRole: c.requesterRole || (c.ticketType === 'customer' || c.customerSnapshot?.email ? 'Customer' : 'Dealer'),
          concernedDealer: c.concernedDealerName || c.dealerSnapshot?.businessName || 'GROVE',
          dealerSnapshot: c.dealerSnapshot || {},
          customerSnapshot: c.customerSnapshot || {},
          orderSnapshot: c.orderSnapshot || null,
          subject: c.subject,
          category: c.category || 'Other / General',
          status: c.status || 'Open',
          orderId: c.orderNumber || c.orderSnapshot?.orderNumber || '—',
          attachments: c.attachments || [],
          statusHistory: c.statusHistory || [],
          createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
          lastUpdated: 'Recently',
          messages: (c.messages || []).map((m) => ({
            id: String(m._id || m.id || Math.random()),
            sender: m.senderName || (m.senderRole === 'admin' ? 'GROVE Platform Operations' : 'Dealer'),
            senderRole: m.senderRole || 'dealer',
            timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Recent',
            text: m.text,
            attachments: m.attachments || []
          })),
          internalNotes: (c.internalNotes || []).map((n) => n.note || String(n))
        }));
        saveAdminSupportTickets(mapped);
      }
    }

    if (overviewRes.status === 'fulfilled') {
      const overview = overviewRes.value?.data || overviewRes.value || {};
      const k = overview.kpis || {};
      const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
      const summarize = (rows = []) => {
        const orders = rows.reduce((sum, row) => sum + Number(row.orders || 0), 0);
        const revenue = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
        return { orders, revenue, aov: orders ? Math.round(revenue / orders) : 0 };
      };
      const daily = overview.dailyTrend || [];
      const monthly = overview.monthlyTrend || [];
      const lastMonth = summarize(monthly.slice(-1));
      const sevenDays = summarize(daily.slice(-7));
      const thisYear = summarize(monthly.slice(-12));
      const support = complsRes.status === 'fulfilled' ? (complsRes.value?.tickets || complsRes.value?.data || []) : [];
      const openTickets = support.filter((ticket) => !['CLOSED', 'RESOLVED'].includes(String(ticket.status || '').toUpperCase()));
      const statusRows = overview.orderStatusSummary || [];
      const colors = ['bg-purple-500', 'bg-amber-500', 'bg-teal-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500'];
      const totalStatus = statusRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
      saveAdminDashboardData({
        kpis: {
          totalDealers: { value: k.activeDealers || 0, growth: '—', subtext: 'Approved dealers' },
          totalCustomers: { value: k.registeredBuyers || 0, growth: '—', subtext: 'Registered users' },
          totalProducts: { value: k.totalProducts || 0, growth: '—', subtext: 'Catalog products' },
          totalOrders: { value: k.totalOrders || 0, growth: '—', subtext: 'All time' },
          totalRevenue: { value: money(k.grossGMV), growth: '—', subtext: 'Gross platform volume' },
          pendingTickets: { value: openTickets.length, urgentCount: openTickets.filter((t) => String(t.priority).toUpperCase() === 'URGENT').length, subtext: 'Open complaints' }
        },
        salesOverview: {
          Today: { gmv: money(summarize(daily.slice(-1)).revenue), growth: '—', orders: summarize(daily.slice(-1)).orders, aov: money(summarize(daily.slice(-1)).aov), platformCommission: money(k.commissionEarned) },
          '7D': { gmv: money(sevenDays.revenue), growth: '—', orders: sevenDays.orders, aov: money(sevenDays.aov), platformCommission: money(k.commissionEarned) },
          '30D': { gmv: money(lastMonth.revenue), growth: '—', orders: lastMonth.orders, aov: money(lastMonth.aov), platformCommission: money(k.commissionEarned) },
          Year: { gmv: money(thisYear.revenue), growth: '—', orders: thisYear.orders, aov: money(thisYear.aov), platformCommission: money(k.commissionEarned) }
        },
        revenueTrend: monthly.map((row) => ({ month: row.period, revenue: Number(row.revenue || 0), displayRev: money(row.revenue), orders: row.orders || 0 })),
        orderStatusSummary: statusRows.map((row, index) => ({ ...row, percent: totalStatus ? Math.round((row.count / totalStatus) * 100) : 0, color: colors[index % colors.length] })),
        topSellingProducts: (overview.topProducts || []).map((p) => ({ ...p, dealer: p.dealer || '—', unitsSold: p.totalSales || 0, revenue: money(p.revenue) })),
        dealerPerformance: (overview.dealerPerformance || []).map((d) => ({ ...d, tier: 'Dealer', grossRevenue: money(d.grossRevenue) })),
        recentOrders: getAdminOrders().slice(0, 5).map((o) => ({ ...o, customer: o.customer?.name || 'Customer', dealer: o.dealerName || '—' })),
        recentTickets: openTickets.slice(0, 5).map((t) => ({ id: t.ticketId || t._id, priority: t.priority || 'Normal', subject: t.subject || t.title || 'Dealer complaint', requester: t.requesterName || t.createdBy?.name || '—', category: t.category || 'Support', date: t.createdAt || '' }))
      });
      // Category Breakdown derivation
      const totalGmvNum = Number(k.grossGMV || 0);
      const catPalette = ['bg-[#012D1D]', 'bg-[#2C694E]', 'bg-[#AEEECB]', 'bg-emerald-600', 'bg-teal-700', 'bg-amber-600'];
      const rawCategoryList = overview.categoryBreakdown || overview.categoryDistribution || [];
      const categoryBreakdown = rawCategoryList.map((cat, i) => {
        const catRev = Number(cat.rawRevenue ?? cat.revenue ?? 0);
        const sharePercent = cat.sharePercent !== undefined 
          ? Number(cat.sharePercent) 
          : (totalGmvNum > 0 ? Math.round((catRev / totalGmvNum) * 100) : 0);
        return {
          category: cat.category || 'General',
          rawRevenue: catRev,
          revenue: typeof cat.revenue === 'string' && cat.revenue.startsWith('₹') ? cat.revenue : money(catRev),
          sharePercent,
          orders: Number(cat.orders || 0),
          color: cat.color || catPalette[i % catPalette.length]
        };
      });

      // Dealer Sales Ranking derivation
      const rawDealerRanking = overview.dealerSalesRanking || overview.dealerPerformance || [];
      const dealerSalesRanking = rawDealerRanking.map((d) => {
        const dRev = Number(d.rawRevenue ?? d.grossRevenue ?? d.revenue ?? 0);
        const sharePercent = d.sharePercent !== undefined
          ? Number(d.sharePercent)
          : (totalGmvNum > 0 ? Math.round((dRev / totalGmvNum) * 100) : 0);
        return {
          dealerId: d.dealerId || d.id || '',
          dealerName: d.dealerName || d.name || '—',
          orders: Number(d.orders ?? d.totalOrders ?? 0),
          rawRevenue: dRev,
          revenue: typeof d.revenue === 'string' && d.revenue.startsWith('₹') ? d.revenue : money(dRev),
          sharePercent
        };
      }).sort((a, b) => b.rawRevenue - a.rawRevenue);

      localStorage.setItem(STORAGE_KEYS.ANALYTICS_DATA, JSON.stringify({
        kpis: {
          totalGmv: money(k.grossGMV),
          growthPercent: k.growthPercent || '+0%',
          totalOrders: k.totalOrders || 0,
          avgOrderValue: money(k.avgOrderValue),
          commissionEarned: money(k.commissionEarned)
        },
        periods: overview.periods || null,
        dailyTrend: (overview.dailyTrend || daily).map((row) => ({ ...row, displayRev: row.displayRev || money(row.revenue) })),
        weeklyTrend: (overview.weeklyTrend || []).map((row) => ({ ...row, displayRev: row.displayRev || money(row.revenue) })),
        monthlyTrend: (overview.monthlyTrend || monthly).map((row) => ({ ...row, displayRev: row.displayRev || money(row.revenue) })),
        topProducts: overview.topProducts || [],
        categoryBreakdown,
        dealerSalesRanking
      }));
    }
  } catch (err) {
    console.warn('Backend admin sync warning:', err.message);
  }
}

// ==========================================
// 1. DASHBOARD OVERVIEW SERVICE
// ==========================================

export function getAdminDashboardData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DASHBOARD_DATA);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && parsed.kpis?.totalDealers) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading admin dashboard data:', e);
  }
  return defaultDashboardData;
}

export function saveAdminDashboardData(data) {
  try {
    localStorage.setItem(STORAGE_KEYS.DASHBOARD_DATA, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving admin dashboard data:', e);
  }
}

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const lakh = (n) => `₹${(Number(n || 0) / 100000).toFixed(2)}L`;
const orderDate = (o) => new Date(o.createdAt || o.date || 0);

export function getAdminKPIs() {
  const dealers = getAdminDealers();
  const orders = getAdminOrders();
  const gmv = orders
    .filter((o) => o.orderStatus !== 'Cancelled')
    .reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const pendingKyc = dealers.filter((d) => d.status === 'Pending KYC').length;
  const openTickets = getAdminSupportTickets().filter(
    (t) => !['resolved', 'closed'].includes(String(t.status).toLowerCase())
  );

  return {
    totalDealers: { value: dealers.length, growth: '0%', subtext: `${pendingKyc} pending approval` },
    totalCustomers: { value: getAdminCustomers().length, growth: '0%', subtext: 'Registered buyers' },
    totalProducts: { value: getAdminProducts().length, growth: '0%', subtext: 'Catalog SKUs' },
    totalOrders: { value: orders.length, growth: '0%', subtext: 'All time' },
    totalRevenue: { value: lakh(gmv), growth: '0%', subtext: 'Gross platform volume' },
    pendingTickets: {
      value: openTickets.length,
      urgentCount: openTickets.filter((t) => String(t.priority).toLowerCase() === 'urgent').length,
      subtext: 'Awaiting response',
    },
  };
}

export function getAdminSalesOverview(range = '30D') {
  const days = { Today: 1, '7D': 7, '30D': 30, Year: 365 }[range] || 30;
  const since = Date.now() - days * 86400000;
  const list = getAdminOrders().filter(
    (o) => o.orderStatus !== 'Cancelled' && orderDate(o).getTime() >= since
  );
  const gmv = list.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  return {
    gmv: inr(gmv),
    growth: '0%',
    orders: list.length,
    aov: inr(list.length ? Math.round(gmv / list.length) : 0),
    platformCommission: inr(Math.round(gmv * 0.05)),
  };
}

export function getAdminRevenueTrend() {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleString('en-IN', { month: 'short' }),
      revenue: 0,
      orders: 0,
    };
  });
  getAdminOrders().forEach((o) => {
    if (o.orderStatus === 'Cancelled') return;
    const d = orderDate(o);
    const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) {
      m.revenue += (Number(o.amount) || 0) / 100000; // in lakhs
      m.orders += 1;
    }
  });
  return months.map((m) => ({ ...m, displayRev: `₹${m.revenue.toFixed(2)}L` }));
}

export function getAdminOrderStatusSummary() {
  const orders = getAdminOrders();
  const total = orders.length || 1;
  const defs = [
    ['Placed', 'bg-purple-500'],
    ['Processing', 'bg-amber-500'],
    ['Packed', 'bg-teal-500'],
    ['Shipped', 'bg-blue-500'],
    ['Delivered', 'bg-emerald-500'],
    ['Cancelled', 'bg-rose-500'],
  ];
  return defs.map(([status, color]) => {
    const count = orders.filter((o) => o.orderStatus === status).length;
    return { status, color, count, percent: Math.round((count / total) * 100) };
  });
}

export function getAdminTopSellingProducts() {
  return getAdminProducts()
    .slice()
    .sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      dealer: p.dealerName || '—',
      unitsSold: p.totalSales || 0,
      revenue: inr((p.totalSales || 0) * (p.price || 0)),
    }));
}

export function getAdminDealerPerformance() {
  return getAdminDealers().slice(0, 5).map((d) => ({
    dealerId: d.id,
    name: d.businessName || d.name || '—',
    tier: d.tier || '—',
    location: d.businessAddress?.city || d.city || '—',
    activeProducts: d.activeListings || 0,
    totalOrders: d.totalOrders || 0,
    fulfillmentSLA: d.fulfillmentSLA || '—',
    grossRevenue: d.grossRevenue || '₹0',
  }));
}

export function getAdminRecentOrders() {
  return getAdminOrders().slice(0, 5).map((o) => ({
    id: o.id,
    orderStatus: o.orderStatus || 'Placed',
    amountFormatted: o.amountFormatted || inr(o.amount),
    customer: o.customer?.name || 'Customer',
    date: o.createdAt || o.date ? orderDate(o).toLocaleDateString('en-IN') : '—',
    dealer: o.dealerName || '—',
    paymentMethod: o.paymentMethod || '—',
  }));
}

export function getAdminRecentTickets() {
  return getAdminSupportTickets().slice(0, 5).map((t) => ({
    id: t.id,
    priority: t.priority || 'Normal',
    date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : '—',
    subject: t.subject || t.title || 'Support request',
    requester: t.requester || t.customerName || '—',
    category: t.category || 'General',
  }));
}


// ==========================================
// 2. DEALER MANAGEMENT SERVICE
// ==========================================

export function getAdminDealers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DEALERS_LIST);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading admin dealers:', e);
  }
  return [];
}

export function saveAdminDealers(dealers) {
  try {
    localStorage.setItem(STORAGE_KEYS.DEALERS_LIST, JSON.stringify(dealers));
  } catch (e) {
    console.error('Error saving admin dealers:', e);
  }
}

export function getAdminDealerById(id) {
  const dealers = getAdminDealers();
  return dealers.find((d) => d.id === id) || null;
}

export function createAdminDealer(dealerData) {
  const dealers = getAdminDealers();
  const nextNumber = dealers.length + 1;
  const newId = `DEALER_${String(nextNumber).padStart(3, '0')}`;

  const newDealer = {
    id: newId,
    businessName: dealerData.businessName || 'New Agro Dealership Enterprise',
    contactPerson: dealerData.contactPerson || 'Authorized Representative',
    email: dealerData.email || 'dealer@grove.com',
    phone: dealerData.phone || '+91 98000 00000',
    city: dealerData.city || 'Pune',
    state: dealerData.state || 'Maharashtra',
    pincode: dealerData.pincode || '411001',
    warehouseAddress: dealerData.warehouseAddress || `${dealerData.city || 'Pune'} Regional Logistics Depot`,
    gstin: (dealerData.gstin || '27XXXXX0000X0Z0').toUpperCase(),
    pan: (dealerData.pan || 'XXXXX0000X').toUpperCase(),
    tier: dealerData.tier || 'Bronze Tier',
    status: dealerData.status || 'Pending KYC',
    commissionRate: parseFloat(dealerData.commissionRate) || 5.0,
    activeListings: 0,
    totalOrders: 0,
    grossRevenue: '₹0',
    grossRevenueNumeric: 0,
    fulfillmentSLA: '100.0%',
    payoutHold: dealerData.status === 'Pending KYC',
    bankDetails: {
      accountName: dealerData.bankAccountName || dealerData.businessName || 'Merchant Enterprise Account',
      accountNumber: dealerData.bankAccountNumber || '—',
      ifsc: (dealerData.bankIfsc || '—').toUpperCase(),
      bankName: dealerData.bankName || 'State Bank of India'
    },
    kycDocuments: [
      { name: 'GSTIN Registration Certificate', status: dealerData.status === 'Active' ? 'Verified' : 'Under Review', uploadDate: 'Just now' },
      { name: 'Bank Cancelled Cheque', status: dealerData.status === 'Active' ? 'Verified' : 'Under Review', uploadDate: 'Just now' },
      { name: 'Warehouse Lease Deed', status: dealerData.status === 'Active' ? 'Verified' : 'Pending Upload', uploadDate: '—' }
    ],
    joinedDate: 'Today'
  };

  const updated = [newDealer, ...dealers];
  saveAdminDealers(updated);
  return newDealer;
}

export function updateAdminDealer(id, updatedFields) {
  const dealers = getAdminDealers();
  const updated = dealers.map((d) => (d.id === id ? { ...d, ...updatedFields } : d));
  saveAdminDealers(updated);
  return updated.find((d) => d.id === id);
}

export function toggleDealerStatus(id) {
  const dealers = getAdminDealers();
  const target = dealers.find((d) => d.id === id);
  if (!target) return null;
  const newStatus = target.status === 'Active' ? 'Suspended' : 'Active';
  const updated = dealers.map((d) => (d.id === id ? { ...d, status: newStatus } : d));
  saveAdminDealers(updated);
  return updated.find((d) => d.id === id);
}

export function approveDealerKYC(id) {
  const dealers = getAdminDealers();
  const updated = dealers.map((d) => {
    if (d.id === id) {
      return {
        ...d,
        status: 'Active',
        payoutHold: false,
        kycDocuments: (d.kycDocuments || []).map((doc) => ({ ...doc, status: 'Verified' }))
      };
    }
    return d;
  });
  saveAdminDealers(updated);
  return updated.find((d) => d.id === id);
}

export function toggleDealerPayoutHold(id) {
  const dealers = getAdminDealers();
  const updated = dealers.map((d) => {
    if (d.id === id) {
      return { ...d, payoutHold: !d.payoutHold };
    }
    return d;
  });
  saveAdminDealers(updated);
  return updated.find((d) => d.id === id);
}

// ==========================================
// 3. PRODUCT MANAGEMENT SERVICE
// ==========================================

export function getAdminProducts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS_LIST);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading admin products:', e);
  }
  return [];
}

export function saveAdminProducts(products) {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS_LIST, JSON.stringify(products));
  } catch (e) {
    console.error('Error saving admin products:', e);
  }
}

export function getAdminProductById(id) {
  const products = getAdminProducts();
  return products.find((p) => p.id === id) || null;
}

export async function updateAdminProduct(id, updatedFields) {
  const result = await adminApi.updateProduct(id, updatedFields);
  const actual = result?.data || result;
  const products = getAdminProducts();
  const updated = products.map((p) => (String(p.id) === String(id) ? { ...p, ...actual, id: actual._id || actual.id || id } : p));
  saveAdminProducts(updated);
  return updated.find((p) => p.id === id);
}

export async function deleteAdminProduct(id) {
  await adminApi.deleteProduct(id);
  const products = getAdminProducts();
  const target = products.find((p) => p.id === id);
  const updated = products.filter((p) => p.id !== id);
  saveAdminProducts(updated);
  if (target) {
  }
  return true;
}

export function approveProductListing(id) {
  return updateAdminProduct(id, { status: 'Active' });
}

export function rejectProductListing(id, reason = 'MSRP compliance failure') {
  return updateAdminProduct(id, { status: 'Rejected', rejectionReason: reason });
}

// ==========================================
// 4. INVENTORY MANAGEMENT SERVICE
// ==========================================

export function getAdminInventorySummary() {
  const products = getAdminProducts();
  const totalStockUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= (p.threshold || 10)).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const inStockCount = products.filter((p) => p.stock > (p.threshold || 10)).length;

  return {
    totalStockUnits,
    totalSkus: products.length,
    lowStockCount,
    outOfStockCount,
    inStockCount
  };
}

export function getAdminInventoryMovementLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY_LOGS);
    if (raw) return JSON.parse(raw);
  } catch {}

  return [];
}

export async function adjustAdminInventoryStock(productId, newQuantity, reason) {
  const products = getAdminProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) throw new Error('Product not found. Refresh inventory and try again.');

  const oldStock = product.stock;
  const delta = newQuantity - oldStock;
  const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;

  const response = await adminApi.adjustInventoryStock(productId, {
    quantityChange: delta,
    reason: reason || 'Admin stock correction',
    referenceId: `ADMIN-${Date.now()}`
  });
  if (response?.success === false) throw new Error(response.message || 'Inventory adjustment failed.');
  await syncAdminDataFromApi();
  return { sku: product.sku, productName: product.name, dealer: product.dealerName, delta: deltaStr, newStock: newQuantity, reason };
}

// ==========================================
// 5. ORDER MANAGEMENT SERVICE
// ==========================================

export function getAdminOrders() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ORDERS_LIST);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading admin orders:', e);
  }
  return [];
}

export function saveAdminOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS_LIST, JSON.stringify(orders));
  } catch (e) {
    console.error('Error saving admin orders:', e);
  }
}

export function getAdminOrderById(id) {
  const orders = getAdminOrders();
  return orders.find((o) => o.id === id) || null;
}

export function updateAdminOrderStatus(id, newStatus, trackingNumber = '', carrier = '') {
  const orders = getAdminOrders();
  const updated = orders.map((o) => {
    if (o.id === id) {
      return {
        ...o,
        orderStatus: newStatus,
        trackingNumber: trackingNumber || o.trackingNumber,
        carrier: carrier || o.carrier
      };
    }
    return o;
  });
  saveAdminOrders(updated);
  recordAdminAuditLog('Order Status Updated', 'Orders', `Order #${id} status changed to ${newStatus}`);
  return updated.find((o) => o.id === id);
}

export function getAdminOrderKPIs() {
  const orders = getAdminOrders();
  const totalCount = orders.length;
  const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const placedCount = orders.filter((o) => o.orderStatus === 'Placed').length;
  const processingCount = orders.filter((o) => o.orderStatus === 'Processing').length;
  const shippedCount = orders.filter((o) => o.orderStatus === 'Shipped').length;
  const deliveredCount = orders.filter((o) => o.orderStatus === 'Delivered').length;

  return {
    totalCount,
    totalAmountFormatted: `₹${totalAmount.toLocaleString('en-IN')}`,
    placedCount,
    processingCount,
    shippedCount,
    deliveredCount
  };
}

// ==========================================
// 6. USER / CUSTOMER MANAGEMENT SERVICE
// ==========================================

export function getAdminCustomers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS_LIST);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading admin customers:', e);
  }
  return [];
}

export function saveAdminCustomers(customers) {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS_LIST, JSON.stringify(customers));
  } catch (e) {
    console.error('Error saving admin customers:', e);
  }
}

export function toggleCustomerStatus(id) {
  const customers = getAdminCustomers();
  const updated = customers.map((c) => {
    if (c.id === id) {
      const next = c.status === 'Active' ? 'Inactive' : 'Active';
      return { ...c, status: next };
    }
    return c;
  });
  saveAdminCustomers(updated);
  recordAdminAuditLog('Customer Status Toggled', 'Users', `Customer #${id} status changed`);
  return updated.find((c) => c.id === id);
}

// ==========================================
// 7. DEALER LOCATIONS SERVICE
// ==========================================

export function getAdminLocations() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LOCATIONS_LIST);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading admin locations:', e);
  }
  return [];
}

export function saveAdminLocations(locations) {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCATIONS_LIST, JSON.stringify(locations));
  } catch (e) {
    console.error('Error saving admin locations:', e);
  }
}

export function createAdminLocation(locationData) {
  const locations = getAdminLocations();
  const nextNum = locations.length + 1;
  const newLoc = {
    id: `LOC_${String(nextNum).padStart(3, '0')}`,
    hubCode: locationData.hubCode || `HUB-DEP-${nextNum}`,
    dealerId: locationData.dealerId || 'DEALER_001',
    dealerName: locationData.dealerName || 'Apex Agri-Tech & Machinery',
    hubType: locationData.hubType || 'Regional Spares Depot',
    city: locationData.city || 'Pune',
    state: locationData.state || 'Maharashtra',
    pincode: locationData.pincode || '411001',
    address: locationData.address || `${locationData.city} Industrial Zone`,
    contactPhone: locationData.contactPhone || '+91 98000 00000',
    capacityTons: Number(locationData.capacityTons) || 200,
    serviceRadiusKm: Number(locationData.serviceRadiusKm) || 120,
    activePinCodesCount: Number(locationData.activePinCodesCount) || 30,
    status: locationData.status || 'Operational'
  };

  const updated = [newLoc, ...locations];
  saveAdminLocations(updated);
  recordAdminAuditLog('Location Added', 'Locations', `Registered depot ${newLoc.hubCode} in ${newLoc.city}`);
  return newLoc;
}

export function updateAdminLocation(id, fields) {
  const locations = getAdminLocations();
  const updated = locations.map((loc) => (loc.id === id ? { ...loc, ...fields } : loc));
  saveAdminLocations(updated);
  recordAdminAuditLog('Location Updated', 'Locations', `Updated location #${id}`);
  return updated.find((loc) => loc.id === id);
}

export function deleteAdminLocation(id) {
  const locations = getAdminLocations();
  const updated = locations.filter((loc) => loc.id !== id);
  saveAdminLocations(updated);
  recordAdminAuditLog('Location Deleted', 'Locations', `Deleted location #${id}`);
  return true;
}

// ==========================================
// 8. CATEGORY MANAGEMENT SERVICE
// ==========================================

// ==========================================
// 8. CATEGORY MANAGEMENT SERVICE
// ==========================================

export function normalizeCategory(category) {
  if (!category) return null;
  return {
    ...category,
    id: String(category._id || category.id),
    name: category.name || '',
    slug: category.slug || '',
    description: category.description || '',
    image: category.image || (Array.isArray(category.images) && category.images[0]) || '',
    images: Array.isArray(category.images) ? category.images : (category.image ? [category.image] : []),
    icon: category.icon || 'Layers',
    commissionRate: Number(category.commissionRate ?? 5),
    status: category.status || 'Active',
    subcategories: (category.subcategories || []).map((sub) => ({
      ...sub,
      id: String(sub._id || sub.id || sub.slug || Math.random()),
      name: typeof sub === 'string' ? sub : (sub.name || ''),
      slug: typeof sub === 'string' ? sub.toLowerCase().replace(/[^a-z0-9]+/g, '-') : (sub.slug || '')
    }))
  };
}

export async function fetchAdminCategoriesFromApi() {
  try {
    const res = await (categoriesApi.getAllAdmin ? categoriesApi.getAllAdmin() : categoriesApi.getAll());
    const raw = res?.data || res?.categories || (Array.isArray(res) ? res : []);
    if (Array.isArray(raw)) {
      const normalized = raw.map(normalizeCategory).filter(Boolean);
      saveAdminCategories(normalized);
      return normalized;
    }
  } catch (error) {
    console.warn('Error fetching admin categories from API:', error.message);
  }
  return getAdminCategories();
}

export function getAdminCategories() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES_LIST);

    if (stored !== null) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Error reading admin categories:', error);
  }

  return [];
}

export function saveAdminCategories(categories) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.CATEGORIES_LIST,
      JSON.stringify(categories)
    );
  } catch (error) {
    console.error('Error saving admin categories:', error);
  }
}

// CREATE CATEGORY
export async function createAdminCategory(catData) {
  const response = await categoriesApi.create(catData);

  const createdCategory =
    response?.category ||
    response?.data?.category ||
    response?.data ||
    response;

  const newCategory = normalizeCategory(createdCategory);

  const categories = getAdminCategories();

  saveAdminCategories([
    ...categories.filter((c) => c.id !== newCategory.id),
    newCategory
  ]);

  return newCategory;
}

// UPDATE CATEGORY
export async function updateAdminCategory(id, fields) {
  const response = await categoriesApi.update(id, fields);

  const updatedCategory =
    response?.category ||
    response?.data?.category ||
    response?.data ||
    response;

  const normalized = normalizeCategory(updatedCategory);

  const categories = getAdminCategories();

  const updated = categories.map((category) =>
    String(category.id) === String(id)
      ? normalized
      : category
  );

  saveAdminCategories(updated);

  return normalized;
}

// ADD SUBCATEGORY
export async function addSubcategory(catId, subcat) {
  const response = await categoriesApi.addSubcategory(catId, subcat);

  const updatedCategory =
    response?.category ||
    response?.data?.category ||
    response?.data ||
    response;

  const normalized = normalizeCategory(updatedCategory);

  const categories = getAdminCategories();

  const updated = categories.map((category) =>
    String(category.id) === String(catId)
      ? normalized
      : category
  );

  saveAdminCategories(updated);

  return normalized;
}

// DELETE CATEGORY
export async function deleteAdminCategory(id) {
  await categoriesApi.delete(id);

  const categories = getAdminCategories();

  saveAdminCategories(
    categories.filter(
      (category) => String(category.id) !== String(id)
    )
  );

  return true;
}
// ==========================================
// 9. SALES & ANALYTICS SERVICE
// ==========================================

export function getAdminAnalytics(period = 'monthly') {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ANALYTICS_DATA);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.kpis) {
        return {
          ...parsed,
          categoryBreakdown: Array.isArray(parsed.categoryBreakdown) ? parsed.categoryBreakdown : [],
          dealerSalesRanking: Array.isArray(parsed.dealerSalesRanking) ? parsed.dealerSalesRanking : [],
          dailyTrend: Array.isArray(parsed.dailyTrend) ? parsed.dailyTrend : [],
          weeklyTrend: Array.isArray(parsed.weeklyTrend) ? parsed.weeklyTrend : [],
          monthlyTrend: Array.isArray(parsed.monthlyTrend) ? parsed.monthlyTrend : [],
          topProducts: Array.isArray(parsed.topProducts) ? parsed.topProducts : []
        };
      }
    }
  } catch {}
  return {
    kpis: { totalGmv: '₹0', growthPercent: '0%', totalOrders: 0, avgOrderValue: '₹0', commissionEarned: '₹0' },
    dailyTrend: [],
    weeklyTrend: [],
    monthlyTrend: [],
    topProducts: [],
    categoryBreakdown: [],
    dealerSalesRanking: []
  };
}

/**
 * Directly fetches live platform sales and revenue analytics from the live backend API.
 */
export async function fetchAdminAnalyticsFromApi() {
  try {
    const res = await adminApi.getOverview();
    const overview = res?.data || res || {};
    const k = overview.kpis || {};
    const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
    const totalGmvNum = Number(k.grossGMV || 0);
    const catPalette = ['bg-[#012D1D]', 'bg-[#2C694E]', 'bg-[#AEEECB]', 'bg-emerald-600', 'bg-teal-700', 'bg-amber-600'];

    const rawCategoryList = overview.categoryBreakdown || overview.categoryDistribution || [];
    const categoryBreakdown = rawCategoryList.map((cat, i) => {
      const catRev = Number(cat.rawRevenue ?? cat.revenue ?? 0);
      const sharePercent = cat.sharePercent !== undefined 
        ? Number(cat.sharePercent) 
        : (totalGmvNum > 0 ? Math.round((catRev / totalGmvNum) * 100) : 0);
      return {
        category: cat.category || 'General',
        rawRevenue: catRev,
        revenue: typeof cat.revenue === 'string' && cat.revenue.startsWith('₹') ? cat.revenue : money(catRev),
        sharePercent,
        orders: Number(cat.orders || 0),
        color: cat.color || catPalette[i % catPalette.length]
      };
    });

    const rawDealerRanking = overview.dealerSalesRanking || overview.dealerPerformance || [];
    const dealerSalesRanking = rawDealerRanking.map((d) => {
      const dRev = Number(d.rawRevenue ?? d.grossRevenue ?? d.revenue ?? 0);
      const sharePercent = d.sharePercent !== undefined
        ? Number(d.sharePercent)
        : (totalGmvNum > 0 ? Math.round((dRev / totalGmvNum) * 100) : 0);
      return {
        dealerId: d.dealerId || d.id || '',
        dealerName: d.dealerName || d.name || '—',
        orders: Number(d.orders ?? d.totalOrders ?? 0),
        rawRevenue: dRev,
        revenue: typeof d.revenue === 'string' && d.revenue.startsWith('₹') ? d.revenue : money(dRev),
        sharePercent
      };
    }).sort((a, b) => b.rawRevenue - a.rawRevenue);

    const formatted = {
      kpis: {
        totalGmv: money(k.grossGMV),
        growthPercent: k.growthPercent || '+0%',
        totalOrders: Number(k.totalOrders || 0),
        avgOrderValue: money(k.avgOrderValue),
        commissionEarned: money(k.commissionEarned)
      },
      periods: overview.periods || null,
      dailyTrend: (overview.dailyTrend || []).map((row) => ({ ...row, displayRev: row.displayRev || money(row.revenue) })),
      weeklyTrend: (overview.weeklyTrend || []).map((row) => ({ ...row, displayRev: row.displayRev || money(row.revenue) })),
      monthlyTrend: (overview.monthlyTrend || []).map((row) => ({ ...row, displayRev: row.displayRev || money(row.revenue) })),
      topProducts: overview.topProducts || [],
      categoryBreakdown,
      dealerSalesRanking
    };

    localStorage.setItem(STORAGE_KEYS.ANALYTICS_DATA, JSON.stringify(formatted));
    return formatted;
  } catch (err) {
    console.warn('Direct admin analytics fetch failed, falling back to cache:', err.message);
    return getAdminAnalytics();
  }
}

// ==========================================
// 10. PAYMENTS & SETTLEMENTS SERVICE
// ==========================================

export function getAdminPaymentSummary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS_DATA);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    summary: { totalVolume: '₹0', escrowHeld: '₹0', settledToDealers: '₹0', commissionRetained: '₹0' },
    transactions: [], dealerSettlements: []
  };
}

export const getAdminPaymentsData = getAdminPaymentSummary;

// ==========================================
// 11. SUPPORT & COMPLAINTS SERVICE
// ==========================================

export function getAdminSupportTickets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SUPPORT_TICKETS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export function saveAdminSupportTickets(tickets) {
  try {
    localStorage.setItem(STORAGE_KEYS.SUPPORT_TICKETS, JSON.stringify(tickets));
  } catch (e) {
    console.error('Error saving support tickets:', e);
  }
}

export async function updateTicketStatus(id, newStatus, note = '', reason = '') {
  try {
    await adminApi.updateComplaintStatus(id, newStatus, note, reason);
  } catch (err) {
    console.warn('Backend ticket status update warning:', err.message);
  }

  const tickets = getAdminSupportTickets();
  const updated = tickets.map((t) => {
    if (t.id === id || t._id === id) {
      return {
        ...t,
        status: newStatus || t.status,
        lastUpdated: 'Just now'
      };
    }
    return t;
  });
  saveAdminSupportTickets(updated);
  recordAdminAuditLog('Ticket Status Updated', 'Support', `Ticket #${id} marked as ${newStatus}`);
  return updated.find((t) => t.id === id || t._id === id);
}

export async function addAdminReplyToTicket(id, message, isInternalNote = false, status = null, attachments = []) {
  try {
    await adminApi.replyToComplaint(id, message, isInternalNote, status, attachments);
  } catch (err) {
    console.warn('Backend admin reply warning:', err.message);
  }

  const tickets = getAdminSupportTickets();
  const updated = tickets.map((t) => {
    if (t.id === id || t._id === id) {
      if (isInternalNote) {
        return {
          ...t,
          internalNotes: [...(t.internalNotes || []), message],
          lastUpdated: 'Just now'
        };
      } else {
        const newMsg = {
          id: `m_${Date.now()}`,
          sender: 'GROVE Platform Operations',
          senderRole: 'admin',
          timestamp: 'Just now',
          text: message,
          attachments: attachments || []
        };
        return {
          ...t,
          status: status || (t.status === 'Open' ? 'In Progress' : t.status),
          messages: [...(t.messages || []), newMsg],
          lastUpdated: 'Just now'
        };
      }
    }
    return t;
  });
  saveAdminSupportTickets(updated);
  return updated.find((t) => t.id === id || t._id === id);
}

// ==========================================
// 12. REPORTS & AUDIT LOGS SERVICE
// ==========================================

export const DEFAULT_ADMIN_REPORTS = [
  {
    id: 'rep_sales_gmv',
    name: 'Gross Marketplace Volume & Financial Ledger',
    category: 'Financial',
    period: 'Current Month (Nov 2026)',
    description: 'Comprehensive breakdown of customer orders, gross transaction volume, dealer payouts, and net platform commissions.',
    lastGenerated: 'Today, Real-time',
    type: 'orders'
  },
  {
    id: 'rep_dealer_settlements',
    name: 'Dealer Payout & Escrow Settlement Statement',
    category: 'Merchant Operations',
    period: 'Active Cycle (7-Day)',
    description: 'Cleared settlements, pending escrow holds, UTR transfer references, and 1% TDS/TCS tax withholding compliance ledger.',
    lastGenerated: 'Nov 27, 2026',
    type: 'settlements'
  },
  {
    id: 'rep_inventory_valuation',
    name: 'Catalog Inventory & Depot Stock Valuation',
    category: 'Inventory & Logistics',
    period: 'Real-time Snapshot',
    description: 'SKU quantities on hand, safety stock breach alerts, unit pricing, and aggregate warehouse inventory valuation.',
    lastGenerated: 'Today',
    type: 'inventory'
  },
  {
    id: 'rep_merchant_compliance',
    name: 'Merchant Enterprise KYC & Compliance Audit',
    category: 'Governance & Risk',
    period: 'Quarterly Audit (Q3)',
    description: 'Onboarded dealers, GSTIN tax validation status, commercial store classifications, and verification approval audit.',
    lastGenerated: 'Yesterday',
    type: 'dealers'
  },
  {
    id: 'rep_support_sla',
    name: 'Cargo Disputes & Customer Support SLA Log',
    category: 'Customer Success',
    period: 'Past 30 Days',
    description: 'Transit damage complaints, resolution time tracking, dealer escalations, and customer satisfaction ratings.',
    lastGenerated: 'Nov 26, 2026',
    type: 'tickets'
  },
  {
    id: 'rep_audit_trail',
    name: 'Cryptographic Security & System Action Ledger',
    category: 'Security & Compliance',
    period: 'All-time Immutable',
    description: 'Full chronological administrative action log, operator IP addresses, and taxonomy configuration revisions.',
    lastGenerated: 'Real-time',
    type: 'audit'
  }
];

export function normalizeAuditLog(l) {
  if (!l) return null;

  let formattedTime = 'Recently';
  if (l.createdAt || l.timestamp) {
    const dateObj = new Date(l.createdAt || l.timestamp);
    if (!isNaN(dateObj.getTime())) {
      formattedTime = dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) + ', ' + dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else {
      formattedTime = String(l.timestamp || l.createdAt);
    }
  }

  let adminName = 'GROVE Admin';
  let adminRole = 'Super Admin';

  if (l.actor && typeof l.actor === 'object') {
    adminName = l.actor.name || l.actor.email || adminName;
    adminRole = l.actor.role || l.actorRole || adminRole;
  } else if (l.admin) {
    adminName = l.admin;
    adminRole = l.role || adminRole;
  } else if (l.actorRole) {
    adminRole = l.actorRole;
  }

  if (adminRole === 'SUPER_ADMIN') adminRole = 'Super Admin';
  if (adminRole === 'ADMIN') adminRole = 'Administrator';
  if (adminRole === 'DEALER') adminRole = 'Merchant Partner';

  const actionRaw = l.action || 'Administrative Action';
  let formattedAction = actionRaw;
  const actionMap = {
    'PLATFORM_SETTINGS_UPDATED': 'Settings Updated',
    'CATEGORY_CREATED': 'Category Created',
    'CATEGORY_UPDATED': 'Category Updated',
    'CATEGORY_DELETED': 'Category Deleted',
    'DEALER_APPROVED': 'Dealer Approved',
    'DEALER_SUSPENDED': 'Dealer Suspended',
    'SETTLEMENT_PROCESSED': 'Settlement Processed',
    'INVENTORY_ADJUSTED': 'Stock Adjusted',
    'PRODUCT_CREATED': 'Product Added',
    'PRODUCT_UPDATED': 'Product Updated',
    'ORDER_CANCELLED': 'Order Cancelled',
    'REFUND_ISSUED': 'Refund Processed'
  };

  if (actionMap[actionRaw]) {
    formattedAction = actionMap[actionRaw];
  } else if (actionRaw.includes('_')) {
    formattedAction = actionRaw
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  let targetModule = l.targetEntity || l.module || 'Platform';
  if (targetModule === 'AdminSettings') targetModule = 'Settings';
  if (targetModule === 'Category') targetModule = 'Catalog';
  if (targetModule === 'Dealer') targetModule = 'Dealers';
  if (targetModule === 'Product') targetModule = 'Products';

  let cleanDetails = l.details || 'Administrative action recorded';
  if (cleanDetails.includes('Sensitive platform settings updated: {')) {
    cleanDetails = 'Modified platform configuration (General & Commission policies)';
  } else if (cleanDetails.startsWith('{') && cleanDetails.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleanDetails);
      cleanDetails = Object.keys(parsed).map((k) => `${k} updated`).join(', ');
    } catch {}
  }

  return {
    id: l.logId || l._id || l.id || `AUD_${Date.now()}`,
    timestamp: formattedTime,
    admin: adminName,
    role: adminRole,
    action: formattedAction,
    module: targetModule,
    details: cleanDetails,
    status: l.status || 'Success'
  };
}

export function getAdminReportsData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS_DATA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return {
          availableReports: (Array.isArray(parsed.availableReports) && parsed.availableReports.length > 0)
            ? parsed.availableReports
            : DEFAULT_ADMIN_REPORTS,
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs.map(normalizeAuditLog).filter(Boolean) : []
        };
      }
    }
  } catch (error) {
    console.warn('Could not read admin reports cache:', error);
  }
  return { availableReports: DEFAULT_ADMIN_REPORTS, auditLogs: [] };
}

export function saveAdminReportsData(data) {
  try {
    const current = getAdminReportsData();
    localStorage.setItem(STORAGE_KEYS.REPORTS_DATA, JSON.stringify({ ...current, ...data }));
  } catch (error) {
    console.warn('Could not save admin reports cache:', error);
  }
}

export function getAdminReportsList() {
  const data = getAdminReportsData();
  return (data.availableReports && data.availableReports.length > 0)
    ? data.availableReports
    : DEFAULT_ADMIN_REPORTS;
}

export function getAdminAuditLogs() {
  return getAdminReportsData().auditLogs || [];
}

export async function fetchAdminAuditLogsFromApi() {
  try {
    const res = await adminApi.getAuditLogs();
    const rawLogs = res?.data || res?.logs || (Array.isArray(res) ? res : []);
    if (Array.isArray(rawLogs) && rawLogs.length > 0) {
      const normalized = rawLogs.map(normalizeAuditLog).filter(Boolean);
      const current = getAdminReportsData();
      saveAdminReportsData({ ...current, auditLogs: normalized });
      return normalized;
    }
  } catch (err) {
    console.warn('Direct fetchAdminAuditLogsFromApi warning:', err.message);
  }
  return getAdminAuditLogs();
}

export function recordAdminAuditLog(action, module, details) {
  try {
    const data = getAdminReportsData();
    const logs = data.auditLogs || [];
    const newEntry = normalizeAuditLog({
      logId: `AUD_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      admin: 'GROVE Admin',
      actorRole: 'Super Admin',
      action,
      targetEntity: module,
      details,
      createdAt: new Date().toISOString(),
      status: 'Success'
    });
    const updated = [newEntry, ...logs.slice(0, 49)];
    saveAdminReportsData({ auditLogs: updated });
  } catch {}
}

// ==========================================
// 13. PLATFORM SETTINGS SERVICE
// ==========================================

export function normalizeAdminSettings(settings) {
  const currentAdmin = getStoredAdmin() || {};
  const general = settings?.general || {};
  const commission = settings?.commission || settings?.commissions || {};
  const notifications = settings?.notifications || {};

  return {
    ...settings,
    general: {
      marketplaceName: general.marketplaceName || general.platformName || 'GROVE Agritech & Commercial Marketplace',
      supportEmail: general.supportEmail || 'operations@grove.com',
      supportPhone: general.supportPhone || general.helplineNumber || '+91 80000 12345',
      defaultCurrency: general.defaultCurrency || 'INR (₹)',
      maintenanceMode: Boolean(general.maintenanceMode),
      systemVersion: general.systemVersion || '2.4.0'
    },
    commission: {
      defaultCommissionRate: Number(commission.defaultCommissionRate ?? 5.0),
      minPayoutThreshold: Number(commission.minPayoutThreshold ?? 10000),
      escrowHoldPeriodDays: Number(commission.escrowHoldPeriodDays ?? 3),
      taxTcsRate: Number(commission.taxTcsRate ?? 1.0)
    },
    notifications: {
      emailOnNewKyc: notifications.emailOnNewKyc !== false,
      emailOnLowStock: notifications.emailOnLowStock !== false,
      emailDailySummary: notifications.emailDailySummary !== false,
      emailOnEscalatedDispute: notifications.emailOnEscalatedDispute !== false
    },
    profile: {
      name: settings?.profile?.name || currentAdmin.name || 'Super Admin',
      email: settings?.profile?.email || currentAdmin.email || 'admin@grove.com',
      department: settings?.profile?.department || currentAdmin.department || 'Platform Operations',
      role: settings?.profile?.role || currentAdmin.role || 'Super Admin'
    },
    roles: (Array.isArray(settings?.roles) && settings.roles.length > 0) ? settings.roles : [
      {
        id: 'super_admin',
        name: 'Super Administrator',
        description: 'Complete unrestricted access across all platform modules, taxonomy, settlements, and admin controls.',
        isSystem: true,
        usersCount: 1
      },
      {
        id: 'ops_specialist',
        name: 'Platform Operations Specialist',
        description: 'Manages dealer approvals, catalog taxonomy, ticket resolution, and dispatch tracking.',
        isSystem: false,
        usersCount: 3
      },
      {
        id: 'finance_auditor',
        name: 'Finance & Settlements Auditor',
        description: 'Controls escrow releases, merchant payouts, bank reconciliation, and tax filings.',
        isSystem: false,
        usersCount: 2
      },
      {
        id: 'compliance_officer',
        name: 'Catalog & Compliance Officer',
        description: 'Audits product specifications, dealer certifications, and counterfeit protection.',
        isSystem: false,
        usersCount: 2
      }
    ]
  };
}

export function getAdminSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS_DATA);
    if (raw) return normalizeAdminSettings(JSON.parse(raw));
  } catch {}
  return normalizeAdminSettings(defaultAdminSettings);
}

export function saveAdminSettings(updated) {
  try {
    const normalized = normalizeAdminSettings(updated);
    localStorage.setItem(STORAGE_KEYS.SETTINGS_DATA, JSON.stringify(normalized));
  } catch (e) {
    console.error('Error saving settings cache:', e);
  }
}

export async function fetchAdminSettingsFromApi() {
  try {
    const res = await adminApi.getSettings();
    const raw = res?.data || res?.settings || res;
    if (raw && typeof raw === 'object') {
      const normalized = normalizeAdminSettings(raw);
      localStorage.setItem(STORAGE_KEYS.SETTINGS_DATA, JSON.stringify(normalized));
      return normalized;
    }
  } catch (err) {
    console.warn('Direct fetchAdminSettingsFromApi warning:', err.message);
  }
  return getAdminSettings();
}

/** Persist supported platform settings through the authenticated admin API. */
export async function updateAdminSettings(updated) {
  const normalized = normalizeAdminSettings(updated);
  const general = normalized.general || {};
  const commission = normalized.commission || {};
  const notifications = normalized.notifications || {};

  const payload = {
    general: {
      marketplaceName: general.marketplaceName,
      supportEmail: general.supportEmail,
      supportPhone: general.supportPhone,
      defaultCurrency: general.defaultCurrency,
      maintenanceMode: Boolean(general.maintenanceMode)
    },
    commission: {
      defaultCommissionRate: Number(commission.defaultCommissionRate),
      minPayoutThreshold: Number(commission.minPayoutThreshold),
      escrowHoldPeriodDays: Number(commission.escrowHoldPeriodDays),
      taxTcsRate: Number(commission.taxTcsRate)
    },
    notifications: {
      emailOnNewKyc: Boolean(notifications.emailOnNewKyc),
      emailOnLowStock: Boolean(notifications.emailOnLowStock),
      emailDailySummary: Boolean(notifications.emailDailySummary),
      emailOnEscalatedDispute: Boolean(notifications.emailOnEscalatedDispute)
    }
  };

  const response = await adminApi.updateSettings(payload);
  const savedBackend = response?.data || response?.settings || response;

  // If profile was updated, update stored admin session
  if (normalized.profile) {
    const currentAdmin = getStoredAdmin();
    if (currentAdmin) {
      setStoredAdmin({
        ...currentAdmin,
        name: normalized.profile.name || currentAdmin.name,
        email: normalized.profile.email || currentAdmin.email,
        department: normalized.profile.department || currentAdmin.department
      });
    }
  }

  const finalSettings = normalizeAdminSettings({ ...normalized, ...savedBackend });
  saveAdminSettings(finalSettings);
  return finalSettings;
}
