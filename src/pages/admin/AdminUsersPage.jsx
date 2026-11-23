import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
<<<<<<< HEAD
  fetchAdminUsers,
  fetchAdminUserStats,
  changeAdminUserStatus,
  deleteAdminUser,
  mapBuyerForUI,
} from '../../services/adminUserService';
import { Search, CheckCircle2, Eye, UserCheck, UserX, X } from 'lucide-react';

export default function AdminUsersPage() {
  const [buyers, setBuyers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

=======
  getAdminCustomers,
  toggleCustomerStatus,
  syncAdminDataFromApi
} from '../../services/adminService';
import {
  Search,
  CheckCircle2,
  Eye,
  UserCheck,
  UserX,
  X
} from 'lucide-react';

export default function AdminUsersPage() {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Customer Detail Drawer
>>>>>>> origin/boomika
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

<<<<<<< HEAD
=======
  const loadData = () => {
    setCustomers(getAdminCustomers());
  };

  useEffect(() => {
    document.title = 'User Management | GROVE Admin';
    window.scrollTo(0, 0);
    loadData();
    syncAdminDataFromApi().then(() => {
      loadData();
    }).catch(() => {});
  }, []);

>>>>>>> origin/boomika
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

<<<<<<< HEAD
  const loadBuyers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter !== 'All') params.buyerType = typeFilter;
      if (statusFilter !== 'All') params.status = statusFilter;

      const result = await fetchAdminUsers(params);
      setBuyers(result.users.map(mapBuyerForUI));
      setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to load buyers:', err);
      setError(err.message || 'Unable to load buyers.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStats(await fetchAdminUserStats());
    } catch (err) {
      console.error('Failed to load buyer statistics:', err);
    }
  };

  useEffect(() => {
    document.title = 'User Management | GROVE Admin';
    window.scrollTo(0, 0);
    loadStats();
  }, []);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Any filter change goes back to page 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => {
    loadBuyers();
  }, [page, debouncedSearch, typeFilter, statusFilter]);

  // Local filtering as a fallback if the backend ignores the query params
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return buyers.filter((c) => {
      const matchSearch =
        !q ||
        [c.name, c.contactPerson, c.email, c.city, c.phone].some((v) =>
          String(v).toLowerCase().includes(q)
        );
      const matchType = typeFilter === 'All' || c.type === typeFilter;
      const matchStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [buyers, searchQuery, typeFilter, statusFilter]);

  const handleToggleStatus = async (buyer) => {
    try {
      const nextStatus = buyer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await changeAdminUserStatus(buyer.id, nextStatus);
      await Promise.all([loadBuyers(), loadStats()]);
      setSelectedCustomer((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      showToast(`Buyer ${nextStatus === 'ACTIVE' ? 'reactivated' : 'deactivated'}.`);
    } catch (err) {
      console.error('Failed to update buyer status:', err);
      setError(err.message || 'Unable to update buyer status.');
    }
  };

  const handleDelete = async (buyer) => {
    if (!window.confirm(`Delete the account for ${buyer.name}? This cannot be undone.`)) return;
    try {
      await deleteAdminUser(buyer.id);
      setIsDetailOpen(false);
      setSelectedCustomer(null);
      showToast('Buyer account deleted.');
      loadStats();
      if (buyers.length === 1 && page > 1) {
        setPage((p) => p - 1); // effect reloads the previous page
      } else {
        await loadBuyers();
      }
    } catch (err) {
      console.error('Failed to delete buyer:', err);
      setError(err.message || 'Unable to delete buyer account.');
    }
  };

  const statusLabel = (s) => (s === 'ACTIVE' ? 'Active' : 'Inactive');
  const hasFilters = searchQuery || typeFilter !== 'All' || statusFilter !== 'All';

=======
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q);

      const matchType = typeFilter === 'All' || c.type === typeFilter;
      const matchStatus = statusFilter === 'All' || c.status === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [customers, searchQuery, typeFilter, statusFilter]);

  const handleToggleStatus = (id, e) => {
    if (e) e.stopPropagation();
    const updated = toggleCustomerStatus(id);
    loadData();
    if (selectedCustomer && selectedCustomer.id === id) {
      setSelectedCustomer(updated);
    }
    showToast(`Account status updated for ${updated?.name || 'customer'}.`);
  };

>>>>>>> origin/boomika
  return (
    <AdminLayout>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#012D1D] text-white text-xs font-semibold shadow-xl border border-[#AEEECB]/40 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#AEEECB] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <AdminPageHeader
        title="User & Buyer Management"
        subtitle="Manage verified farm buyers, agricultural cooperatives (FPOs), agritech companies, and retail farm accounts."
<<<<<<< HEAD
        badge={`${pagination.total} Registered Buyers`}
        breadcrumbs={[{ label: 'Users' }]}
      />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white border border-[#C1C8C2]/60 shadow-2xs">
            <span className="text-[10px] font-mono uppercase font-bold text-[#717973]">Total Buyers</span>
            <span className="text-2xl font-black text-[#012D1D] block mt-1">{stats.totalBuyers ?? 0}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-emerald-300 shadow-2xs">
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-800">Active Accounts</span>
            <span className="text-2xl font-black text-[#0E5138] block mt-1">{stats.activeAccounts ?? 0}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#C1C8C2]/60 shadow-2xs">
            <span className="text-[10px] font-mono uppercase font-bold text-[#717973]">FPO Cooperatives</span>
            <span className="text-2xl font-black text-[#012D1D] block mt-1">{stats.fpoCount ?? 0}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-rose-300 shadow-2xs">
            <span className="text-[10px] font-mono uppercase font-bold text-rose-800">Inactive / Suspended</span>
            <span className="text-2xl font-black text-rose-900 block mt-1">{stats.inactiveAccounts ?? 0}</span>
          </div>
        </div>
      )}

      {/* Filters */}
=======
        badge={`${customers.length} Registered Buyers`}
        breadcrumbs={[{ label: 'Users' }]}
      />

      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-[#C1C8C2]/60 shadow-2xs">
          <span className="text-[10px] font-mono uppercase font-bold text-[#717973]">Total Buyers</span>
          <span className="text-2xl font-black text-[#012D1D] block mt-1">{customers.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-emerald-300 shadow-2xs">
          <span className="text-[10px] font-mono uppercase font-bold text-emerald-800">Active Accounts</span>
          <span className="text-2xl font-black text-[#0E5138] block mt-1">
            {customers.filter((c) => c.status === 'Active').length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#C1C8C2]/60 shadow-2xs">
          <span className="text-[10px] font-mono uppercase font-bold text-[#717973]">FPO Cooperatives</span>
          <span className="text-2xl font-black text-[#012D1D] block mt-1">
            {customers.filter((c) => c.type === 'FPO Cooperative').length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-rose-300 shadow-2xs">
          <span className="text-[10px] font-mono uppercase font-bold text-rose-800">Inactive / Suspended</span>
          <span className="text-2xl font-black text-rose-900 block mt-1">
            {customers.filter((c) => c.status !== 'Active').length}
          </span>
        </div>
      </div>

      {/* 2. Filters */}
>>>>>>> origin/boomika
      <div className="bg-white rounded-3xl border border-[#C1C8C2]/60 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#717973] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by buyer name, contact person, city, or phone..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60 text-xs font-medium text-[#151D18] focus:outline-none focus:border-[#012D1D]"
            />
          </div>

<<<<<<< HEAD
          <div className="flex items-center gap-1 flex-wrap">
            
=======
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60 text-xs font-semibold text-[#151D18]"
            >
              <option value="All">All Buyer Types</option>
              <option value="FPO Cooperative">FPO Cooperative</option>
              <option value="Commercial Agritech">Commercial Agritech</option>
              <option value="Agro Retailer">Agro Retailer</option>
              <option value="Institutional Buyer">Institutional Buyer</option>
              <option value="Individual Farmer">Individual Farmer</option>
            </select>
>>>>>>> origin/boomika

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60 text-xs font-semibold text-[#151D18]"
            >
              <option value="All">All Statuses</option>
<<<<<<< HEAD
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            {hasFilters && (
=======
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            {(searchQuery || typeFilter !== 'All' || statusFilter !== 'All') && (
>>>>>>> origin/boomika
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('All');
                  setStatusFilter('All');
                }}
                className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">{error}</div>
      )}
      {loading && <div className="text-xs text-[#717973]">Loading buyers...</div>}

      {/* Table */}
=======
      {/* 3. Customer Table */}
>>>>>>> origin/boomika
      <div className="bg-white rounded-3xl border border-[#C1C8C2]/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#C1C8C2]/50 bg-[#F8FAF8] text-[#717973] font-mono uppercase text-[10px]">
                <th className="py-3 px-4 font-bold">Buyer Account</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold">Contact Info</th>
                <th className="py-3 px-4 font-bold">Registered Date</th>
                <th className="py-3 px-3 font-bold text-center">Orders</th>
                <th className="py-3 px-4 font-bold text-right">Lifetime Spend</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C1C8C2]/30">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-[#717973]">
<<<<<<< HEAD
                    {loading ? 'Loading...' : 'No buyer accounts found matching filters.'}
=======
                    No buyer accounts found matching filters.
>>>>>>> origin/boomika
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setIsDetailOpen(true);
                    }}
                    className="hover:bg-[#F8FAF8] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#012D1D] text-[#AEEECB] font-mono font-bold text-xs flex items-center justify-center shrink-0">
<<<<<<< HEAD
                          {String(cust.name).substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-extrabold text-[#151D18] truncate max-w-[200px]">{cust.name}</span>
=======
                          {cust.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-extrabold text-[#151D18] truncate max-w-[200px]">
                            {cust.name}
                          </span>
>>>>>>> origin/boomika
                          <span className="text-[11px] text-[#717973]">
                            {cust.contactPerson} • {cust.city}, {cust.state}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#3F4943]">
                      <span className="px-2 py-0.5 rounded-full bg-[#F3FCF3] border border-[#C1C8C2]/50 text-[10px] font-mono font-bold text-[#0E5138]">
                        {cust.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#3F4943]">
                      <span className="block font-medium">{cust.email}</span>
                      <span className="text-[10px] font-mono text-[#717973]">{cust.phone}</span>
                    </td>

<<<<<<< HEAD
                    <td className="py-3.5 px-4 text-[#717973] font-mono text-[11px]">{cust.registeredDate}</td>
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-[#012D1D]">{cust.totalOrders}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-[#0E5138]">{cust.totalSpend}</td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          cust.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {statusLabel(cust.status)}
=======
                    <td className="py-3.5 px-4 text-[#717973] font-mono text-[11px]">
                      {cust.registeredDate}
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono font-bold text-[#012D1D]">
                      {cust.totalOrders}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-black text-[#0E5138]">
                      {cust.totalSpend}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        cust.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}>
                        {cust.status}
>>>>>>> origin/boomika
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-[#717973] hover:text-[#012D1D] hover:bg-[#F3FCF3]"
                          title="Inspect Buyer File"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
<<<<<<< HEAD
                          onClick={() => handleToggleStatus(cust)}
                          className={`p-1.5 rounded-lg ${
                            cust.status === 'ACTIVE'
                              ? 'text-rose-700 hover:bg-rose-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={cust.status === 'ACTIVE' ? 'Deactivate Buyer' : 'Reactivate Buyer'}
                        >
                          {cust.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
=======
                          onClick={(e) => handleToggleStatus(cust.id, e)}
                          className={`p-1.5 rounded-lg ${
                            cust.status === 'Active'
                              ? 'text-rose-700 hover:bg-rose-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={cust.status === 'Active' ? 'Deactivate Buyer' : 'Reactivate Buyer'}
                        >
                          {cust.status === 'Active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
>>>>>>> origin/boomika
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
<<<<<<< HEAD

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 text-xs border-t border-[#C1C8C2]/40">
          <span>Page {pagination.page} of {pagination.pages || 1}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={page >= (pagination.pages || 1) || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
=======
      </div>

      {/* Customer Detail Drawer */}
>>>>>>> origin/boomika
      {isDetailOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="fixed inset-0 bg-[#012D1D]/50 backdrop-blur-xs" onClick={() => setIsDetailOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl p-6 z-10 flex flex-col space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#C1C8C2]/40 shrink-0">
              <h3 className="font-extrabold text-base text-[#012D1D]">Buyer Dossier</h3>
              <button type="button" onClick={() => setIsDetailOpen(false)} className="p-1 rounded-xl text-[#717973]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-[#F8FAF8] rounded-2xl border border-[#C1C8C2]/40 space-y-2">
                <span className="font-black text-sm text-[#012D1D] block">{selectedCustomer.name}</span>
                <span className="text-[11px] font-mono text-[#717973] block">Type: {selectedCustomer.type}</span>
                <p className="text-[11px] text-[#3F4943]">{selectedCustomer.address}</p>
                <div className="pt-2 border-t border-[#C1C8C2]/30 text-[11px] font-mono space-y-1">
                  <div>Email: <strong>{selectedCustomer.email}</strong></div>
                  <div>Phone: <strong>{selectedCustomer.phone}</strong></div>
                  <div>Registered: <strong>{selectedCustomer.registeredDate}</strong></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-center">
                  <span className="text-[10px] font-mono text-[#717973] uppercase">Total Orders</span>
                  <span className="text-xl font-black text-[#012D1D] block mt-0.5">{selectedCustomer.totalOrders}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-center">
                  <span className="text-[10px] font-mono text-[#717973] uppercase">Lifetime Spend</span>
                  <span className="text-xl font-black text-[#0E5138] block mt-0.5">{selectedCustomer.totalSpend}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#C1C8C2]/60 space-y-2">
                <span className="font-bold text-[#151D18] block">Account Governance</span>
                <button
                  type="button"
<<<<<<< HEAD
                  onClick={() => handleToggleStatus(selectedCustomer)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                    selectedCustomer.status === 'ACTIVE'
=======
                  onClick={() => handleToggleStatus(selectedCustomer.id)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                    selectedCustomer.status === 'Active'
>>>>>>> origin/boomika
                      ? 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
<<<<<<< HEAD
                  {selectedCustomer.status === 'ACTIVE' ? 'Deactivate Buyer Account' : 'Reactivate Buyer Account'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedCustomer)}
                  className="w-full py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700"
                >
                  Delete Buyer Account
=======
                  {selectedCustomer.status === 'Active' ? 'Deactivate Buyer Account' : 'Reactivate Buyer Account'}
>>>>>>> origin/boomika
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
<<<<<<< HEAD
}
=======
}

>>>>>>> origin/boomika
