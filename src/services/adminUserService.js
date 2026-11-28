import { adminApi } from './apiClient.js';

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const fetchAdminUsers = async (params = {}) => {
  const response = await adminApi.getUsers(params);

  // Extract array of users safely from various response structures
  let list = [];
  if (Array.isArray(response)) {
    list = response;
  } else if (Array.isArray(response?.data)) {
    list = response.data;
  } else if (Array.isArray(response?.users)) {
    list = response.users;
  } else if (Array.isArray(response?.data?.users)) {
    list = response.data.users;
  }

  const p = response?.pagination || response?.data?.pagination || {};
  const total = typeof p.total === 'number' ? p.total : list.length;
  const limit = p.limit || params.limit || 10;
  const page = p.page || params.page || 1;
  const pages = p.pages || p.totalPages || Math.ceil(total / limit) || 1;

  return {
    users: list,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
};

export const fetchAdminUserStats = async () => {
  const response = await adminApi.getUserStats();
  return response?.data || response || {};
};

export const fetchAdminUserById = async (id) => {
  const response = await adminApi.getUserById(id);
  return response?.data || response;
};

export const changeAdminUserStatus = async (id, status) => {
  const response = await adminApi.updateUserStatus(id, status);
  return response?.data || response;
};

export const deleteAdminUser = async (id) => {
  const response = await adminApi.deleteUser(id);
  return response?.data || response;
};

const normalizeStatus = (buyer) => {
  if (buyer.status) {
    const s = String(buyer.status).toUpperCase();
    return s === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
  }
  if (typeof buyer.isActive === 'boolean') return buyer.isActive ? 'ACTIVE' : 'INACTIVE';
  return 'INACTIVE';
};

const formatBuyerType = (type) => {
  if (!type) return 'Individual Farmer';
  const clean = String(type).toUpperCase();
  const map = {
    'INDIVIDUAL_FARMER': 'Individual Farmer',
    'FPO': 'FPO Cooperative',
    'COMMERCIAL_AGRITECH': 'Commercial Agritech'
  };
  return map[clean] || type;
};

export const mapBuyerForUI = (buyer) => ({
  id: String(buyer._id || buyer.id || ''),
  name: buyer.name || '—',
  contactPerson: buyer.contactPerson || buyer.name || '—',
  email: buyer.email || '—',
  phone: buyer.phone || '—',
  city: buyer.address?.city || buyer.city || '',
  state: buyer.address?.state || buyer.state || '',
  rawType: buyer.buyerType || 'INDIVIDUAL_FARMER',
  type: formatBuyerType(buyer.buyerType),
  registeredDate: buyer.createdAt
    ? new Date(buyer.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '—',
  totalOrders: Number(buyer.totalOrders || 0),
  totalSpend: formatINR(buyer.lifetimeSpend),
  status: normalizeStatus(buyer), // always 'ACTIVE' or 'INACTIVE'
  address:
    typeof buyer.address === 'string'
      ? buyer.address
      : [buyer.address?.line1, buyer.address?.city, buyer.address?.state, buyer.address?.pincode]
          .filter(Boolean)
          .join(', ') || 'Online Registered Buyer',
});