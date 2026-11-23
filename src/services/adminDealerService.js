import { adminApi } from './apiClient.js';

const CACHE_KEY = 'grove_admin_features_dealers_cache';

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCache = (list) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {}
};

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const mapDealerForUI = (d) => {
  const raw = String(d.status || '').toUpperCase();
  const status =
    raw === 'APPROVED' || raw === 'ACTIVE' ? 'Active'
    : raw === 'PENDING' ? 'Pending KYC'
    : raw === 'UNDER_REVIEW' ? 'Under Review'
    : raw === 'SUSPENDED' ? 'Suspended'
    : raw === 'REJECTED' ? 'Rejected'
    : d.status || 'Pending KYC';

  return {
    id: String(d._id || d.id || ''),
    dealerCode: d.dealerCode || '',
    businessName: d.businessName || '—',
    primaryCategory: d.primaryCategoryName || d.primaryCategory?.name || '',
    contactPerson: d.ownerName || d.contactPerson || '—',
    email: d.officialEmail || d.email || '',
    phone: d.phone || '',
    city: d.businessAddress?.city || d.city || '—',
    state: d.businessAddress?.state || d.state || '—',
    pincode: d.businessAddress?.pincode || d.pincode || '',
    warehouseAddress: d.warehouseAddress || '—',
    gstin: d.gstin || '',
    pan: d.pan || '',
    tier: d.tier || 'Silver Tier',
    commissionRate: d.commissionRate ?? 5.0,
    status,
    payoutHold: !!d.payoutHold,
    fulfillmentSLA: `${parseFloat(d.storeSettings?.fulfillmentSLA ?? d.fulfillmentSLA ?? 98).toFixed(1)}%`,
    activeListings: d.activeListings ?? d.productCount ?? 0,
    totalOrders: d.totalOrders ?? 0,
    grossRevenue: formatINR(d.grossRevenue ?? d.totalRevenue ?? 0),
    joinedDate: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN') : '—',
    bankDetails: d.bankDetails || {
      bankName: d.bankName || '—',
      accountName: d.bankAccountName || '—',
      accountNumber: d.bankAccountNumber || '—',
      ifsc: d.bankIfsc || '—',
    },
    kycDocuments: Array.isArray(d.kycDocuments)
      ? d.kycDocuments.map((doc) => ({
          name: doc.name || doc.type || 'Document',
          uploadDate: doc.uploadDate || doc.uploadedAt || '—',
          status: doc.status || 'Pending',
        }))
      : [],
    approvalHistory: Array.isArray(d.approvalHistory) ? d.approvalHistory : [],
  };
};

export const cacheAdminDealers = (list) => writeCache(list);
export const getAdminDealers = () => readCache();

const patchDealer = (id, patch) => {
  const list = readCache();
  const idx = list.findIndex((d) => String(d.id) === String(id));
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  writeCache(list);
  return list[idx];
};

export const approveDealerKYC = (id) =>
  patchDealer(id, { status: 'Active', payoutHold: false });

export const toggleDealerPayoutHold = (id) => {
  const current = readCache().find((d) => String(d.id) === String(id));
  return patchDealer(id, { payoutHold: !current?.payoutHold });
};

export const updateAdminDealer = async (id, patch) => {
  const updated = await adminApi.updateDealer(id, patch);
  const mapped = mapDealerForUI(updated?.data || updated);
  patchDealer(id, mapped);
  return mapped;
};

export const createAdminDealer = (form) => {
  const created = mapDealerForUI({
    id: `DLR-${Date.now().toString().slice(-6)}`,
    ...form,
    ownerName: form.contactPerson,
    officialEmail: form.email,
    status: 'PENDING',
    bankDetails: {
      bankName: form.bankName,
      accountName: form.bankAccountName,
      accountNumber: form.bankAccountNumber,
      ifsc: form.bankIfsc,
    },
  });
  writeCache([created, ...readCache()]);
  return created;
};
