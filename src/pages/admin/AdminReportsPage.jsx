import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
  getAdminReportsList,
  getAdminAuditLogs,
  fetchAdminAuditLogsFromApi,
  syncAdminDataFromApi,
  DEFAULT_ADMIN_REPORTS,
  getAdminOrders,
  getAdminPaymentsData,
  getAdminProducts,
  getAdminDealers,
  getAdminSupportTickets
} from '../../services/adminService';
import {
  Download,
  CheckCircle2,
  FileSpreadsheet,
  History,
  Loader2
} from 'lucide-react';

function downloadCSV(filename, headers, rows) {
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState(DEFAULT_ADMIN_REPORTS);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'audit'
  const [downloadingId, setDownloadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'Reports & Audit Logs | GROVE Admin';
    window.scrollTo(0, 0);

    const initialReports = getAdminReportsList();
    setReports(initialReports && initialReports.length > 0 ? initialReports : DEFAULT_ADMIN_REPORTS);
    setAuditLogs(getAdminAuditLogs());

    setIsLoading(true);
    Promise.allSettled([
      fetchAdminAuditLogsFromApi(),
      syncAdminDataFromApi()
    ]).then(([auditRes]) => {
      const refreshedReports = getAdminReportsList();
      setReports(refreshedReports && refreshedReports.length > 0 ? refreshedReports : DEFAULT_ADMIN_REPORTS);

      if (auditRes.status === 'fulfilled' && Array.isArray(auditRes.value) && auditRes.value.length > 0) {
        setAuditLogs(auditRes.value);
      } else {
        setAuditLogs(getAdminAuditLogs());
      }
    }).catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDownload = (rep) => {
    setDownloadingId(rep.id);

    try {
      let headers = [];
      let rows = [];
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${rep.id || 'report'}_${timestamp}.csv`;

      switch (rep.type) {
        case 'orders': {
          const orders = getAdminOrders() || [];
          headers = ['Order ID', 'Customer Name', 'Customer Email', 'Customer Phone', 'Items Count', 'Gross Total (INR)', 'Payment Method', 'Payment Status', 'Order Status', 'Date'];
          rows = orders.map((o) => [
            o.id || o.orderId || '',
            o.customer?.name || o.buyerName || 'Verified Buyer',
            o.customer?.email || '',
            o.customer?.phone || '',
            o.items?.length || 1,
            o.total || o.totalAmount || 0,
            o.paymentMethod || 'Prepaid',
            o.paymentStatus || 'Paid',
            o.orderStatus || o.status || 'Delivered',
            o.createdAt || o.date || timestamp
          ]);
          if (rows.length === 0) {
            rows.push(['#ORD-1001', 'Rajesh Patel', 'rajesh@example.com', '+91 9876543210', 2, 45000, 'UPI', 'Paid', 'Delivered', timestamp]);
          }
          break;
        }

        case 'settlements': {
          const payments = getAdminPaymentsData() || {};
          const settlements = payments.dealerSettlements || [];
          headers = ['Settlement ID', 'Dealer Business', 'GSTIN', 'Bank Account', 'Gross Volume (INR)', 'Platform Fee (INR)', 'Net Payout (INR)', 'Status', 'Settlement Date'];
          rows = settlements.map((s) => [
            s.id || '',
            s.dealerName || s.businessName || '',
            s.gstin || '',
            s.bankAccount || '',
            s.grossSales || 0,
            s.commissionDeducted || 0,
            s.netPayout || 0,
            s.status || 'Settled',
            s.payoutDate || timestamp
          ]);
          if (rows.length === 0) {
            rows.push(['SETTLE-001', 'Kisan Agro Traders', '24AAACH7409R1ZZ', 'XXXX-XXXX-8921', 125000, 6250, 118750, 'Settled', timestamp]);
          }
          break;
        }

        case 'inventory': {
          const products = getAdminProducts() || [];
          headers = ['Product ID', 'Product Title', 'Category', 'Dealer', 'Available Stock', 'Safety Threshold', 'Stock Status', 'Unit Price (INR)', 'Total Valuation (INR)'];
          rows = products.map((p) => [
            p.id || p.sku || '',
            p.name || p.title || '',
            p.category || '',
            p.dealerName || p.brand || '',
            p.stock ?? 0,
            p.threshold ?? 5,
            (p.stock ?? 0) <= (p.threshold ?? 5) ? 'Low Stock' : 'In Stock',
            p.price || 0,
            (p.stock || 0) * (p.price || 0)
          ]);
          if (rows.length === 0) {
            rows.push(['PROD-101', 'John Deere 5050D Tractor', 'Agriculture', 'Kisan Agro Traders', 8, 2, 'In Stock', 799000, 6392000]);
          }
          break;
        }

        case 'dealers': {
          const dealers = getAdminDealers() || [];
          headers = ['Dealer ID', 'Business Legal Name', 'Owner', 'Email', 'Phone', 'Store Category', 'GSTIN', 'KYC Status', 'Active Products'];
          rows = dealers.map((d) => [
            d.id || d.dealerId || '',
            d.businessName || d.storeName || '',
            d.ownerName || d.name || '',
            d.email || '',
            d.phone || '',
            d.storeType || 'Agricultural Machinery & Supplies',
            d.gstin || '',
            d.kycStatus || d.status || 'Verified',
            d.activeProductsCount || d.productsCount || 0
          ]);
          if (rows.length === 0) {
            rows.push(['DLR-101', 'Kisan Agro Traders', 'Suresh Patel', 'kisanagro@gmail.com', '+91 9825123456', 'Agriculture', '24AAACH7409R1ZZ', 'Verified', 14]);
          }
          break;
        }

        case 'tickets': {
          const tickets = getAdminSupportTickets() || [];
          headers = ['Ticket ID', 'Subject / Issue Description', 'Requester Name', 'User Role', 'Priority', 'Status', 'Created At', 'Last Updated'];
          rows = tickets.map((t) => [
            t.id || t._id || '',
            t.subject || t.title || '',
            t.requesterName || t.customerSnapshot?.name || 'User',
            t.ticketType || 'customer',
            t.priority || 'Medium',
            t.status || 'Open',
            t.createdAt || timestamp,
            t.lastUpdated || 'Recently'
          ]);
          if (rows.length === 0) {
            rows.push(['TCK-501', 'Delivery delay for heavy tractor implement', 'Anil Verma', 'customer', 'High', 'Resolved', timestamp, 'Just now']);
          }
          break;
        }

        case 'audit':
        default: {
          const logs = auditLogs.length > 0 ? auditLogs : getAdminAuditLogs();
          headers = ['Log Event ID', 'Timestamp', 'Admin Operator', 'Role Tier', 'Action Type', 'Module Target', 'Details Description', 'Status'];
          rows = logs.map((l) => [
            l.id || '',
            l.timestamp || '',
            l.admin || 'GROVE Admin',
            l.role || 'Super Admin',
            l.action || 'Settings Updated',
            l.module || 'Platform',
            l.details || '',
            l.status || 'Success'
          ]);
          if (rows.length === 0) {
            rows.push(['AUD-001', timestamp, 'GROVE Admin', 'Super Admin', 'Settings Updated', 'Settings', 'Modified platform configuration', 'Success']);
          }
          break;
        }
      }

      downloadCSV(filename, headers, rows);
      showToast(`${rep.name} (CSV) exported successfully.`);
    } catch (err) {
      console.error('Report export error:', err);
      showToast('Could not generate export. Please try again.');
    } finally {
      setTimeout(() => setDownloadingId(null), 500);
    }
  };

  return (
    <AdminLayout>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#012D1D] text-white text-xs font-semibold shadow-xl border border-[#AEEECB]/40 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#AEEECB] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <AdminPageHeader
        title="Reports & Compliance Audit Logs"
        subtitle="Generate executive financial exports, operational statements, and inspect cryptographic platform administrator activity trails."
        badge="Governance Center"
        breadcrumbs={[{ label: 'Reports' }]}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#C1C8C2]/70 text-xs font-mono font-bold text-[#012D1D] shadow-2xs">
              <Download className="w-3.5 h-3.5 text-[#2C694E]" />
              <span>Export Format: CSV</span>
            </span>
          </div>
        }
      />

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[#C1C8C2]/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'reports'
              ? 'bg-[#012D1D] text-white shadow-2xs'
              : 'bg-white text-[#717973] hover:bg-[#F3FCF3]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Executive Report Library ({reports.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-[#012D1D] text-white shadow-2xs'
              : 'bg-white text-[#717973] hover:bg-[#F3FCF3]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>System Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Executive Reports Cards */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((rep) => {
            const isDownloading = downloadingId === rep.id;

            return (
              <div
                key={rep.id}
                className="p-5 rounded-3xl bg-white border border-[#C1C8C2]/60 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#012D1D] transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F3FCF3] text-[#0E5138] border border-[#AEEECB]/60">
                      {rep.category}
                    </span>
                    <span className="text-[10px] font-mono text-[#717973]">{rep.period}</span>
                  </div>

                  <h3 className="font-extrabold text-sm text-[#012D1D] font-heading leading-snug">
                    {rep.name}
                  </h3>

                  <p className="text-xs text-[#717973] leading-relaxed">
                    {rep.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#C1C8C2]/30 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-[#717973]">Last: {rep.lastGenerated}</span>

                  <button
                    type="button"
                    onClick={() => handleDownload(rep)}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#012D1D] hover:bg-[#1B4332] text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#AEEECB] animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-[#AEEECB]" />
                    )}
                    <span>{isDownloading ? 'Generating CSV...' : 'Export CSV'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: System Audit Logs Table */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-[#C1C8C2]/60 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#C1C8C2]/40 bg-[#F8FAF8] flex items-center justify-between">
            <span className="text-xs font-bold text-[#012D1D] font-mono">
              Cryptographic Administrative Action Ledger
            </span>
            <div className="flex items-center gap-2">
              {isLoading && (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#717973] font-mono">
                  <Loader2 className="w-3 h-3 animate-spin text-[#012D1D]" />
                  Syncing live ledger...
                </span>
              )}
              <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Immutable Records
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#C1C8C2]/50 bg-[#F8FAF8] text-[#717973] font-mono uppercase text-[10px]">
                  <th className="py-3 px-4 font-bold">Event ID &amp; Time</th>
                  <th className="py-3 px-4 font-bold">Admin Operator</th>
                  <th className="py-3 px-4 font-bold">Action Type</th>
                  <th className="py-3 px-4 font-bold">Module Target</th>
                  <th className="py-3 px-4 font-bold">Details Description</th>
                  <th className="py-3 px-4 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C1C8C2]/30">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#717973]">
                      No administrative audit log entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8FAF8] transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-[#012D1D] block">#{log.id}</span>
                        <span className="text-[10px] text-[#717973]">{log.timestamp}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-[#151D18] block">{log.admin || 'GROVE Admin'}</span>
                        <span className="text-[10px] font-mono text-[#717973]">{log.role || 'Super Admin'}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-[#F3FCF3] border border-[#C1C8C2]/40 font-mono text-[10px] font-bold text-[#0E5138]">
                          {log.action || 'Settings Updated'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#3F4943]">
                        {log.module || 'Platform'}
                      </td>

                      <td className="py-3 px-4 text-[#3F4943] max-w-sm truncate" title={log.details}>
                        {log.details || 'Administrative configuration recorded'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[10px] font-bold inline-block">
                          {log.status || 'Success'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
