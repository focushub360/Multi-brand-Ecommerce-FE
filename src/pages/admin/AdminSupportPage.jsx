import React, { useState, useEffect, useMemo, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
  getAdminSupportTickets,
  updateTicketStatus,
  addAdminReplyToTicket,
  syncAdminComplaints
} from '../../services/adminService';
import {
  Search,
  Eye,
  CheckCircle2,
  Send,
  Lock,
  X,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Download,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  HelpCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

const EXACT_CATEGORIES = [
  'Account & Verification',
  'Product & Catalog',
  'Inventory & Stock',
  'Orders & Delivery',
  'Payments & Settlements',
  'Store Settings',
  'Technical Issues',
  'Other / General'
];

const STATUS_TABS = [
  'All',
  'Open',
  'Under Review',
  'In Progress',
  'Waiting for Dealer',
  'Resolved',
  'Closed'
];

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Ticket Drawer
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [replyStatusUpdate, setReplyStatusUpdate] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [statusReasonModal, setStatusReasonModal] = useState(null); // { targetStatus: '' }
  const [statusReasonText, setStatusReasonText] = useState('');

  const replyFileInputRef = useRef(null);

  const loadData = () => {
    setTickets(getAdminSupportTickets());
  };

  useEffect(() => {
    document.title = 'Dealer Support Tickets | GROVE Admin';
    window.scrollTo(0, 0);
    loadData();
    syncAdminComplaints()
      .then(() => {
        loadData();
      })
      .catch(() => {});

    // Polling every 25s for live ticket updates
    const interval = setInterval(() => {
      if (!document.hidden) {
        syncAdminComplaints()
          .then(() => loadData())
          .catch(() => {});
      }
    }, 25000);

    return () => clearInterval(interval);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const dealerSnap = t.dealerSnapshot || {};
      const matchSearch =
        !q ||
        t.id?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q) ||
        t.requesterName?.toLowerCase().includes(q) ||
        dealerSnap.businessName?.toLowerCase().includes(q) ||
        dealerSnap.ownerName?.toLowerCase().includes(q) ||
        dealerSnap.dealerCode?.toLowerCase().includes(q);

      const matchTab = activeTab === 'All' || t.status === activeTab;
      const matchCategory = categoryFilter === 'All' || t.category === categoryFilter;

      return matchSearch && matchTab && matchCategory;
    });
  }, [tickets, searchQuery, activeTab, categoryFilter]);

  const handleOpenTicket = (ticket) => {
    // Refresh with freshest stored ticket object
    const all = getAdminSupportTickets();
    const fresh = all.find((item) => (item.id || item._id) === (ticket.id || ticket._id)) || ticket;
    setSelectedTicket(fresh);
    setReplyText('');
    setIsInternalNote(false);
    setReplyStatusUpdate('');
    setReplyAttachments([]);
    setIsDetailOpen(true);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`File "${file.name}" exceeds 10MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setReplyAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
            size: file.size,
            url: reader.result
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeReplyAttachment = (index) => {
    setReplyAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && replyAttachments.length === 0) return;
    if (!selectedTicket) return;

    try {
      const updated = await addAdminReplyToTicket(
        selectedTicket.id,
        replyText.trim(),
        isInternalNote,
        replyStatusUpdate || null,
        replyAttachments
      );
      loadData();
      if (updated) setSelectedTicket(updated);
      setReplyText('');
      setReplyAttachments([]);
      setReplyStatusUpdate('');
      showToast(isInternalNote ? 'Confidential note logged.' : 'Admin reply transmitted to dealer.');
    } catch (error) {
      showToast(error.message || 'Unable to send reply.');
    }
  };

  const handleApplyStatusChange = async (newStatus, reason = '') => {
    if (!selectedTicket) return;
    try {
      const updated = await updateTicketStatus(selectedTicket.id, newStatus, reason, reason);
      loadData();
      if (updated) setSelectedTicket(updated);
      setStatusReasonModal(null);
      setStatusReasonText('');
      showToast(`Ticket #${selectedTicket.id} status updated to ${newStatus}.`);
    } catch (error) {
      showToast(error.message || 'Unable to update ticket status.');
    }
  };

  const promptStatusChange = (status) => {
    if (status === 'Waiting for Dealer' || status === 'Resolved' || status === 'Closed') {
      setStatusReasonModal({ targetStatus: status });
      setStatusReasonText('');
    } else {
      handleApplyStatusChange(status);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'Open':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'Under Review':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      case 'In Progress':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Waiting for Dealer':
        return 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'Closed':
        return 'bg-neutral-100 text-neutral-800 border-neutral-300';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
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
        title="Dealer Support Tickets"
        subtitle="Manage, review, track, and resolve dealer inquiries, stock discrepancies, and operational disputes."
        badge={`${tickets.length} Total Tickets`}
        breadcrumbs={[{ label: 'Dealer Support Tickets' }]}
      />

      {/* Status Filter Tabs (6 exact statuses) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[#C1C8C2]/40">
        {STATUS_TABS.map((tab) => {
          const count = tab === 'All' ? tickets.length : tickets.filter((t) => t.status === tab).length;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#012D1D] text-white shadow-2xs'
                  : 'bg-white text-[#3F4943] hover:bg-[#F3FCF3]'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === tab ? 'bg-[#AEEECB] text-[#012D1D]' : 'bg-[#E3EBE4] text-[#717973]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Category Filters */}
      <div className="bg-white rounded-3xl border border-[#C1C8C2]/60 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 text-[#717973] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Ticket ID, Dealer Name, or Subject..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60 text-xs font-medium text-[#151D18] focus:outline-none focus:border-[#012D1D]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60 text-xs font-semibold text-[#151D18] focus:outline-none cursor-pointer w-full md:w-auto"
          >
            <option value="All">All Categories</option>
            {EXACT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-3xl border border-[#C1C8C2]/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#C1C8C2]/50 bg-[#F8FAF8] text-[#717973] font-mono uppercase text-[10px]">
                <th className="py-3 px-4 font-bold">Ticket ID</th>
                <th className="py-3 px-4 font-bold">Subject & Category</th>
                <th className="py-3 px-4 font-bold">Dealer Name & Code</th>
                <th className="py-3 px-4 font-bold">Created Date</th>
                <th className="py-3 px-3 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C1C8C2]/30">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#717973]">
                    No support tickets match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((tck) => {
                  const dealerSnap = tck.dealerSnapshot || {};
                  const businessName = dealerSnap.businessName || tck.concernedDealer || tck.requesterName;
                  const dealerCode = dealerSnap.dealerCode || '';

                  return (
                    <tr
                      key={tck.id}
                      onClick={() => handleOpenTicket(tck)}
                      className="hover:bg-[#F8FAF8] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#012D1D] block">#{tck.id}</span>
                      </td>

                      <td className="py-3.5 px-4 max-w-sm">
                        <span className="font-bold text-[#151D18] block truncate">{tck.subject}</span>
                        <span className="text-[10px] font-mono text-[#717973] inline-flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
                            {tck.category || 'Other / General'}
                          </span>
                          {(tck.attachments?.length > 0 || tck.messages?.some((m) => m.attachments?.length > 0)) && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold">
                              <Paperclip className="w-3 h-3" />
                              <span>Has Attachment</span>
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#3F4943]">
                        <span className="font-bold text-[#151D18] block">{businessName}</span>
                        {dealerCode ? (
                          <span className="text-[10px] font-mono text-[#717973] block">{dealerCode}</span>
                        ) : (
                          <span className="text-[10px] text-[#717973] block">{tck.requesterName}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#717973] font-mono text-[11px]">
                        {tck.createdAt || 'Recent'}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${getStatusBadge(
                            tck.status
                          )}`}
                        >
                          {tck.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenTicket(tck)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#C1C8C2]/60 text-xs font-bold text-[#012D1D] hover:bg-[#F3FCF3] cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details & Resolution Drawer */}
      {isDetailOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-end animate-fadeIn">
          <div className="fixed inset-0 bg-[#012D1D]/50 backdrop-blur-xs" onClick={() => setIsDetailOpen(false)} />
          <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl p-6 z-10 flex flex-col space-y-4 overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#C1C8C2]/40 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#012D1D] bg-[#E7F0E8] px-2 py-0.5 rounded">
                    #{selectedTicket.id}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getStatusBadge(
                      selectedTicket.status
                    )}`}
                  >
                    {selectedTicket.status}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-[#012D1D] mt-1 leading-tight">
                  {selectedTicket.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 rounded-xl text-[#717973] hover:text-[#151D18] hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dealer Details Card */}
            <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#C1C8C2]/40 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#C1C8C2]/30">
                <span className="font-bold text-[#012D1D] flex items-center gap-1.5 text-xs">
                  <Building2 className="w-4 h-4 text-[#2C694E]" />
                  <span>Dealer Snapshot & Information</span>
                </span>
                <span className="text-[10px] font-mono text-[#717973]">
                  Code: <strong>{selectedTicket.dealerSnapshot?.dealerCode || '—'}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#717973] shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#717973] block">Business Name</span>
                    <span className="font-bold text-[#151D18]">
                      {selectedTicket.dealerSnapshot?.businessName || selectedTicket.requesterName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[#717973] shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#717973] block">Contact Person</span>
                    <span className="font-bold text-[#151D18]">
                      {selectedTicket.dealerSnapshot?.ownerName || selectedTicket.requesterName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#717973] shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#717973] block">Phone</span>
                    <span className="font-bold text-[#151D18]">
                      {selectedTicket.dealerSnapshot?.phone || '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#717973] shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#717973] block">Official Email</span>
                    <span className="font-bold text-[#151D18]">
                      {selectedTicket.dealerSnapshot?.email || selectedTicket.requesterEmail || '—'}
                    </span>
                  </div>
                </div>

                {selectedTicket.dealerSnapshot?.storeAddress && (
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-[#717973] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-[#717973] block">Store Address</span>
                      <span className="text-neutral-700 font-medium">
                        {selectedTicket.dealerSnapshot.storeAddress}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ticket Metadata Bar & Quick Actions */}
            <div className="p-3 rounded-2xl bg-white border border-[#C1C8C2]/40 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div>
                  <span className="text-[10px] font-mono text-[#717973] block">Category</span>
                  <span className="font-bold text-[#151D18]">{selectedTicket.category || 'Other / General'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#717973] block">Submitted</span>
                  <span className="font-bold text-[#151D18]">{selectedTicket.createdAt}</span>
                </div>
                {selectedTicket.orderId && selectedTicket.orderId !== '—' && (
                  <div>
                    <span className="text-[10px] font-mono text-[#717973] block">Order Ref</span>
                    <span className="font-bold text-[#151D18] font-mono">{selectedTicket.orderId}</span>
                  </div>
                )}
              </div>

              {/* Status Update Controls */}
              <div className="pt-2 border-t border-[#C1C8C2]/30 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono uppercase font-bold text-[#717973]">
                  Update Ticket Status:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    'Open',
                    'Under Review',
                    'In Progress',
                    'Waiting for Dealer',
                    'Resolved',
                    'Closed'
                  ].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => promptStatusChange(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedTicket.status === st
                          ? 'bg-[#012D1D] text-white shadow-2xs'
                          : 'bg-[#F8FAF8] text-[#3F4943] border border-[#C1C8C2]/50 hover:bg-[#E7F0E8]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Update Modal Prompt */}
              {statusReasonModal && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950">
                      Set Status to "{statusReasonModal.targetStatus}":
                    </span>
                    <button
                      type="button"
                      onClick={() => setStatusReasonModal(null)}
                      className="text-neutral-500 hover:text-neutral-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={statusReasonText}
                    onChange={(e) => setStatusReasonText(e.target.value)}
                    placeholder={
                      statusReasonModal.targetStatus === 'Waiting for Dealer'
                        ? 'Reason / what info is needed from dealer...'
                        : 'Reason / resolution explanation for dealer...'
                    }
                    className="h-9 px-3 rounded-lg bg-white border border-amber-300 text-xs text-neutral-800 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setStatusReasonModal(null)}
                      className="px-2.5 py-1 text-xs text-neutral-600 hover:underline"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyStatusChange(statusReasonModal.targetStatus, statusReasonText.trim())
                      }
                      className="px-3 py-1 rounded-lg bg-[#012D1D] text-white text-xs font-bold hover:bg-[#1B4332]"
                    >
                      Confirm Status Update
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Conversation Messages Thread */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              <span className="text-[10px] font-mono uppercase font-bold text-[#717973] block">
                Complete Conversation History (Immutable)
              </span>

              {selectedTicket.messages?.map((msg, mIdx) => {
                const isAdmin = msg.senderRole === 'admin';
                return (
                  <div
                    key={msg.id || mIdx}
                    className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${
                      isAdmin
                        ? 'bg-[#F3FCF3] border border-[#AEEECB]/70 ml-6 shadow-2xs'
                        : 'bg-white border border-[#C1C8C2]/50 mr-6 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className={`font-bold ${isAdmin ? 'text-[#0E5138]' : 'text-[#012D1D]'}`}>
                        {msg.sender || (isAdmin ? 'GROVE Platform Operations' : 'Dealer')}
                      </span>
                      <span className="text-[#717973]">{msg.timestamp}</span>
                    </div>

                    <p className="text-[#151D18] leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#C1C8C2]/30">
                        {msg.attachments.map((att, aIdx) => (
                          <a
                            key={aIdx}
                            href={att.url}
                            download={att.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EDF6ED] border border-[#C1C8C2]/60 text-[11px] font-semibold text-[#012D1D] hover:bg-[#AEEECB]/40 transition-colors"
                          >
                            {att.type.includes('pdf') ? (
                              <FileText className="w-3 h-3 text-rose-600" />
                            ) : (
                              <ImageIcon className="w-3 h-3 text-emerald-700" />
                            )}
                            <span className="truncate max-w-[140px]">{att.name}</span>
                            <Download className="w-3 h-3 text-[#717973]" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Internal Notes Strip */}
              {selectedTicket.internalNotes && selectedTicket.internalNotes.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-900 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>Confidential Admin Internal Notes (Not Visible to Dealer)</span>
                  </span>
                  {selectedTicket.internalNotes.map((note, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs">
                      {note}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply & Attachment Form */}
            <form onSubmit={handleSendReply} className="pt-3 border-t border-[#C1C8C2]/40 space-y-2.5 text-xs shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#151D18]">Reply to Dealer / Request Information</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-amber-900 text-[11px]">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Save as Private Internal Note</span>
                </label>
              </div>

              {/* Attachments preview chip */}
              {replyAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-1">
                  {replyAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#E7F0E8] border border-[#C1C8C2]/60 text-xs text-[#012D1D] font-medium"
                    >
                      <Paperclip className="w-3 h-3 text-[#2C694E]" />
                      <span className="truncate max-w-[140px]">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => removeReplyAttachment(idx)}
                        className="p-0.5 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                rows="3"
                required={replyAttachments.length === 0}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  isInternalNote
                    ? 'Enter confidential platform note (e.g. Carrier surveyor appointed)...'
                    : 'Compose reply to dealer or detail what additional info is required...'
                }
                className={`w-full p-3 rounded-2xl border text-xs focus:outline-none ${
                  isInternalNote
                    ? 'bg-amber-50/50 border-amber-300'
                    : 'bg-[#F8FAF8] border-[#C1C8C2]/60 focus:border-[#012D1D]'
                }`}
              />

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => replyFileInputRef.current?.click()}
                    className="h-9 px-3 rounded-xl border border-[#C1C8C2]/60 hover:bg-neutral-100 text-[#012D1D] text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attach Files</span>
                  </button>
                  <input
                    ref={replyFileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  {/* Optional status change with reply */}
                  {!isInternalNote && (
                    <select
                      value={replyStatusUpdate}
                      onChange={(e) => setReplyStatusUpdate(e.target.value)}
                      className="h-9 px-2.5 rounded-xl border border-[#C1C8C2]/60 text-[11px] font-semibold text-[#151D18] bg-[#F8FAF8]"
                    >
                      <option value="">Keep current status ({selectedTicket.status})</option>
                      <option value="Waiting for Dealer">Set: Waiting for Dealer</option>
                      <option value="In Progress">Set: In Progress</option>
                      <option value="Resolved">Set: Resolved</option>
                      <option value="Closed">Set: Closed</option>
                    </select>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#012D1D] hover:bg-[#1B4332] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isInternalNote ? 'Log Private Note' : 'Send Admin Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
