import { adminApi } from './apiClient.js';

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const fetchAdminUsers = async (params = {}) => {
  const response = await adminApi.getUsers(params);
  const list = Array.isArray(response?.data)
    ? response.data
    : response?.data?.users || response?.users || [];

  const p = response?.pagination || response?.data?.pagination || {};
  return {
    users: list,
    pagination: {
      page: p.page || params.page || 1,
      limit: p.limit || params.limit || 10,
      total: p.total ?? list.length,
      pages: p.pages || p.totalPages || 1,
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

export const mapBuyerForUI = (buyer) => ({
  id: String(buyer._id || buyer.id || ''),
  name: buyer.name || '—',
  contactPerson: buyer.contactPerson || buyer.name || '—',
  email: buyer.email || '—',
  phone: buyer.phone || '—',
  city: buyer.address?.city || buyer.city || '—',
  state: buyer.address?.state || buyer.state || '—',
  type: buyer.buyerType || '—',
  registeredDate: buyer.createdAt
    ? new Date(buyer.createdAt).toLocaleDateString('en-IN')
    : '—',
  totalOrders: buyer.totalOrders || 0,
  totalSpend: formatINR(buyer.lifetimeSpend),
  status: normalizeStatus(buyer), // always 'ACTIVE' or 'INACTIVE'
  address:
    typeof buyer.address === 'string'
      ? buyer.address
      : [buyer.address?.line1, buyer.address?.city, buyer.address?.state, buyer.address?.pincode]
          .filter(Boolean)
          .join(', ') || '—',
});