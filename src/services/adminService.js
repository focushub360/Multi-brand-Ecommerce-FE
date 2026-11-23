import { adminApi, productsApi, ordersApi, categoriesApi } from './apiClient.js';

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
    platformName: 'GROVE Multi-Brand Marketplace',
    supportEmail: 'support@grove.com',
    helplineNumber: '+91 1800 200 4567',
    defaultCurrency: 'INR (₹)',
    timezone: 'Asia/Kolkata (IST)',
    maintenanceMode: false
  },
  commissions: {
    defaultCommissionRate: 5.0,
    agricultureCommissionRate: 4.5,
    electronicsCommissionRate: 7.0,
    automotiveCommissionRate: 6.0,
    payoutCycleDays: 7,
    autoApproveKYC: false
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

/**
 * Asynchronously synchronizes all admin collections from the live backend MongoDB API.
 */
export async function syncAdminDataFromApi() {
  let ordersSyncError = null;
  let analyticsSyncError = null;
  try {
    const [dealersRes, prodsRes, ordersRes, catsRes, locsRes, setsRes, complsRes, logsRes, settingsRes, usersRes, paymentsRes, inventoryRes, overviewRes] =
      await Promise.allSettled([
        adminApi.getDealers(),
        adminApi.getProducts({ limit: 100 }),
        ordersApi.getAdminOrders(),
        categoriesApi.getAll(),
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
      const orders = ordersRes.value?.data?.orders || ordersRes.value?.orders ||
        (Array.isArray(ordersRes.value?.data) ? ordersRes.value.data : null) ||
        (Array.isArray(ordersRes.value) ? ordersRes.value : []);
      if (Array.isArray(orders)) {
        saveAdminOrders(orders.map((order) => {
          const shipping = order.shippingAddress || {};
          const customerSnapshot = order.customerSnapshot || {};
          const dealers = Array.isArray(order.dealers) ? order.dealers : [];
          const total = Number(order.pricing?.total ?? order.amount ?? 0);
          return {
            ...order,
            id: String(order.orderNumber || order.id || order._id || ''),
            amount: total,
            amountFormatted: `₹${total.toLocaleString('en-IN')}`,
            customer: {
              ...(order.customer || {}),
              name: customerSnapshot.name || order.customer?.name || 'Customer',
              email: customerSnapshot.email || order.customer?.email || '',
              phone: shipping.mobile || customerSnapshot.phone || order.customer?.phone || '',
              city: shipping.city || customerSnapshot.city || '',
              state: shipping.state || customerSnapshot.state || '',
              address: [shipping.house, shipping.street, shipping.landmark, shipping.city, shipping.state, shipping.pincode]
                .filter(Boolean).join(', ')
            },
            dealerName: dealers.map((dealer) => dealer.businessName).filter(Boolean).join(', ') || order.dealerName || '—',
            paymentMethod: order.payment?.methodLabel || order.payment?.method || '—',
            paymentStatus: order.payment?.status === 'Completed' ? 'Paid' : order.payment?.status || 'Pending',
            items: (order.items || []).map((item) => ({ ...item, quantity: Number(item.quantity || 0) })),
            orderStatus: order.orderStatus || 'Unknown',
            date: order.createdAt || order.date || ''
          };
        }));
      }
    } else {
      ordersSyncError = ordersRes.reason?.message || 'Could not load orders from the server.';
    }
    if (overviewRes.status === 'rejected') {
      analyticsSyncError = overviewRes.reason?.message || 'Could not load sales analytics from the server.';
    }

    if (catsRes.status === 'fulfilled') {
      const categories = catsRes.value?.categories || (Array.isArray(catsRes.value) ? catsRes.value : []);
      if (categories.length > 0) {
        saveAdminCategories(categories.map((c) => ({
          ...c,
          id: c.slug || c.id || c._id
        })));
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
      const logs = logsRes.value?.auditLogs || (Array.isArray(logsRes.value) ? logsRes.value : []);
      if (logs.length > 0) {
        const current = getAdminReportsData();
        saveAdminReportsData({
          ...current,
          auditLogs: logs.map((l) => ({
            ...l,
            id: l.logId || l.id || l._id,
            timestamp: l.createdAt || 'Today'
          }))
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
      const settings = settingsRes.value?.settings || settingsRes.value?.data || settingsRes.value;
      if (settings && typeof settings === 'object') saveAdminSettings(settings);
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

    if (overviewRes.status === 'fulfilled') {
      const overview = overviewRes.value?.data || overviewRes.value || {};
      const k = overview.kpis || {};
      const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
      const categoryRows = overview.categoryDistribution || overview.categoryBreakdown || [];
      const categoryRevenueTotal = categoryRows.reduce((sum, row) => sum + Number(row.revenue || row.amount || 0), 0);
      const categoryColors = ['bg-[#012D1D]', 'bg-[#2C694E]', 'bg-[#AEEECB]', 'bg-[#6B9B78]', 'bg-[#B9C8A8]'];
      const categoryBreakdown = categoryRows.map((row, index) => {
        const revenue = Number(row.revenue || row.amount || 0);
        return {
          category: row.category || row.name || 'Other',
          revenue: money(revenue),
          sharePercent: categoryRevenueTotal ? Math.round((revenue / categoryRevenueTotal) * 100) : 0,
          orders: Number(row.orders || 0),
          color: categoryColors[index % categoryColors.length]
        };
      });
      const dealerRows = overview.dealerPerformance || overview.dealerSalesRanking || [];
      const dealerRevenueTotal = dealerRows.reduce((sum, row) => sum + Number(row.grossRevenue ?? row.revenue ?? 0), 0);
      const dealerSalesRanking = dealerRows
        .map((row) => {
          const revenue = Number(row.grossRevenue ?? row.revenue ?? 0);
          return {
            dealerName: row.name || row.dealerName || 'Dealer',
            orders: Number(row.totalOrders ?? row.orders ?? 0),
            revenue: money(revenue),
            sharePercent: dealerRevenueTotal ? Math.round((revenue / dealerRevenueTotal) * 100) : 0
          };
        })
        .sort((a, b) => Number(b.revenue.replace(/[^\d.-]/g, '')) - Number(a.revenue.replace(/[^\d.-]/g, '')));
      const normalizeTrend = (rows = []) => rows.map((row) => ({
        ...row,
        revenue: Number(row.revenue || 0),
        displayRev: money(row.revenue),
        orders: Number(row.orders || 0)
      }));
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
      localStorage.setItem(STORAGE_KEYS.ANALYTICS_DATA, JSON.stringify({
        kpis: {
          totalGmv: money(k.grossGMV), growthPercent: '—', totalOrders: k.totalOrders || 0,
          avgOrderValue: money(k.avgOrderValue), commissionEarned: money(k.commissionEarned)
        },
        dailyTrend: normalizeTrend(overview.dailyTrend || []),
        weeklyTrend: normalizeTrend(overview.weeklyTrend || []),
        monthlyTrend: normalizeTrend(monthly),
        topProducts: (overview.topProducts || []).map((product) => ({
          ...product,
          unitsSold: Number(product.totalSales || product.unitsSold || 0),
          revenue: money(product.revenue)
        })),
        categoryBreakdown,
        dealerSalesRanking
      }));
    }
    return { ordersError: ordersSyncError, analyticsError: analyticsSyncError };
  } catch (err) {
    console.warn('Backend admin sync warning:', err.message);
    return {
      ordersError: ordersSyncError || err.message || 'Could not load admin data.',
      analyticsError: analyticsSyncError || err.message || 'Could not load admin data.'
    };
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

export function getAdminCategories() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES_LIST);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading admin categories:', e);
  }
  return [];
}

export function saveAdminCategories(categories) {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES_LIST, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving admin categories:', e);
  }
}

export function createAdminCategory(catData) {
  const categories = getAdminCategories();
  const nextId = `cat-${catData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 8)}`;
  const newCat = {
    id: nextId,
    name: catData.name,
    slug: catData.slug || nextId,
    description: catData.description || 'Specialized catalog classification.',
    icon: catData.icon || 'Layers',
    commissionRate: parseFloat(catData.commissionRate) || 5.0,
    productCount: 0,
    status: 'Active',
    subcategories: []
  };

  const updated = [...categories, newCat];
  saveAdminCategories(updated);
  recordAdminAuditLog('Category Created', 'Categories', `Created category: ${newCat.name}`);
  return newCat;
}

export function updateAdminCategory(id, fields) {
  const categories = getAdminCategories();
  const updated = categories.map((c) => (c.id === id ? { ...c, ...fields } : c));
  saveAdminCategories(updated);
  recordAdminAuditLog('Category Updated', 'Categories', `Updated category: ${id}`);
  return updated.find((c) => c.id === id);
}

export function addSubcategory(catId, subcat) {
  const categories = getAdminCategories();
  const updated = categories.map((c) => {
    if (c.id === catId) {
      const subId = `sub-${catId}-${Date.now().toString().slice(-3)}`;
      const newSub = {
        id: subId,
        name: subcat.name,
        slug: subcat.slug || subcat.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        productCount: 0,
        status: 'Active'
      };
      return { ...c, subcategories: [...c.subcategories, newSub] };
    }
    return c;
  });
  saveAdminCategories(updated);
  recordAdminAuditLog('Subcategory Added', 'Categories', `Added subcategory ${subcat.name} to ${catId}`);
  return updated.find((c) => c.id === catId);
}

export function deleteAdminCategory(id) {
  const categories = getAdminCategories();
  const target = categories.find((c) => c.id === id);
  const updated = categories.filter((c) => c.id !== id);
  saveAdminCategories(updated);
  if (target) {
    recordAdminAuditLog('Category Deleted', 'Categories', `Deleted category: ${target.name} (#${id})`);
  }
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
          dailyTrend: Array.isArray(parsed.dailyTrend) ? parsed.dailyTrend : [],
          weeklyTrend: Array.isArray(parsed.weeklyTrend) ? parsed.weeklyTrend : [],
          monthlyTrend: Array.isArray(parsed.monthlyTrend) ? parsed.monthlyTrend : [],
          topProducts: Array.isArray(parsed.topProducts) ? parsed.topProducts : [],
          categoryBreakdown: Array.isArray(parsed.categoryBreakdown) ? parsed.categoryBreakdown : [],
          dealerSalesRanking: Array.isArray(parsed.dealerSalesRanking) ? parsed.dealerSalesRanking : []
        };
      }
    }
  } catch {}
  return {
    kpis: { totalGmv: '₹0', growthPercent: '—', totalOrders: 0, avgOrderValue: '₹0', commissionEarned: '₹0' },
    dailyTrend: [], weeklyTrend: [], monthlyTrend: [], topProducts: [], categoryBreakdown: [], dealerSalesRanking: []
  };
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

export function updateTicketStatus(id, newStatus, newPriority = null) {
  const tickets = getAdminSupportTickets();
  const updated = tickets.map((t) => {
    if (t.id === id) {
      return {
        ...t,
        status: newStatus || t.status,
        priority: newPriority || t.priority,
        lastUpdated: 'Just now'
      };
    }
    return t;
  });
  saveAdminSupportTickets(updated);
  recordAdminAuditLog('Ticket Status Updated', 'Support', `Ticket #${id} marked as ${newStatus}`);
  return updated.find((t) => t.id === id);
}

export function addAdminReplyToTicket(id, message, isInternalNote = false) {
  const tickets = getAdminSupportTickets();
  const updated = tickets.map((t) => {
    if (t.id === id) {
      if (isInternalNote) {
        return {
          ...t,
          internalNotes: [...(t.internalNotes || []), message],
          lastUpdated: 'Just now'
        };
      } else {
        const newMsg = {
          id: `m_${Date.now()}`,
          sender: 'GROVE Admin Operations',
          senderRole: 'admin',
          timestamp: 'Just now',
          text: message
        };
        return {
          ...t,
          messages: [...(t.messages || []), newMsg],
          lastUpdated: 'Just now'
        };
      }
    }
    return t;
  });
  saveAdminSupportTickets(updated);
  return updated.find((t) => t.id === id);
}

// ==========================================
// 12. REPORTS & AUDIT LOGS SERVICE
// ==========================================

export function getAdminReportsData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS_DATA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.warn('Could not read admin reports cache:', error);
  }
  return { availableReports: [], auditLogs: [] };
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
  return getAdminReportsData().availableReports || [];
}

export function getAdminAuditLogs() {
  return getAdminReportsData().auditLogs || [];
}

export function recordAdminAuditLog(action, module, details) {
  try {
    const data = getAdminReportsData();
    const logs = data.auditLogs || [];
    const newEntry = {
      id: `AUD_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      admin: 'GROVE Admin',
      role: 'Super Admin',
      action,
      module,
      details,
      timestamp: 'Just now',
      status: 'Success'
    };
    const updated = [newEntry, ...logs.slice(0, 49)];
    saveAdminReportsData({ auditLogs: updated });
  } catch {}
}

// ==========================================
// 13. PLATFORM SETTINGS SERVICE
// ==========================================

export function getAdminSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS_DATA);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultAdminSettings;
}

export function saveAdminSettings(updated) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS_DATA, JSON.stringify(updated));
    recordAdminAuditLog('Settings Updated', 'Settings', 'Modified platform configuration');
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}

/** Persist supported platform settings through the authenticated admin API. */
export async function updateAdminSettings(updated) {
  const general = updated.general || {};
  const commission = updated.commission || updated.commissions || {};
  const notifications = updated.notifications || {};

  const definedValues = (values) => Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const payload = {
    general: definedValues({
      marketplaceName: general.marketplaceName ?? general.platformName,
      supportEmail: general.supportEmail,
      supportPhone: general.supportPhone ?? general.helplineNumber,
      defaultCurrency: general.defaultCurrency,
      maintenanceMode: general.maintenanceMode
    }),
    commission: definedValues({
      defaultCommissionRate: commission.defaultCommissionRate,
      minPayoutThreshold: commission.minPayoutThreshold,
      escrowHoldPeriodDays: commission.escrowHoldPeriodDays,
      taxTcsRate: commission.taxTcsRate
    }),
    notifications: definedValues({
      emailOnNewKyc: notifications.emailOnNewKyc,
      emailOnLowStock: notifications.emailOnLowStock,
      emailDailySummary: notifications.emailDailySummary,
      emailOnEscalatedDispute: notifications.emailOnEscalatedDispute
    })
  };
  Object.keys(payload).forEach((group) => {
    if (Object.keys(payload[group]).length === 0) delete payload[group];
  });
  if (Object.keys(payload).length === 0) {
    throw new Error('There are no platform settings supported by the server to save.');
  }

  const response = await adminApi.updateSettings(payload);
  const saved = response?.data || response?.settings || response;
  saveAdminSettings({ ...updated, ...saved });
  return saved;
}
