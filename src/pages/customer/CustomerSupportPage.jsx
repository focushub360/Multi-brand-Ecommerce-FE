import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  HelpCircle,
  MessageSquare,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  Send,
  RotateCcw,
  ChevronDown,
  Download,
  PhoneCall,
  Mail,
  ShieldCheck,
  ExternalLink,
  Search,
  ArrowRight
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { getStoredCustomer } from '../../utils/auth';
import { getCustomerOrders, syncCustomerOrders } from '../../services/orderService';
import {
  CUSTOMER_TICKET_CATEGORIES,
  CUSTOMER_TICKET_STATUSES,
  getStoredCustomerTickets,
  fetchCustomerTickets,
  submitCustomerTicket,
  replyToCustomerTicket,
  reopenCustomerTicket
} from '../../services/customerSupportService';

const STATUS_TABS = [
  'All',
  'Open',
  'Under Review',
  'In Progress',
  'Waiting for Customer',
  'Resolved',
  'Closed'
];

export default function CustomerSupportPage() {
  const navigate = useNavigate();
  const customer = getStoredCustomer();

  // Form Fields
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState(CUSTOMER_TICKET_CATEGORIES[0]);
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketOrderId, setTicketOrderId] = useState('');
  const [ticketAttachments, setTicketAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Customer Orders (for Order ID selection helper)
  const [customerOrders, setCustomerOrders] = useState([]);

  // Tickets List & Tab Filter
  const [tickets, setTickets] = useState(() => getStoredCustomerTickets(customer?.id));
  const [activeStatusTab, setActiveStatusTab] = useState('All');
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  // Thread Reply State
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [isReplying, setIsReplying] = useState(false);

  // Reopen State
  const [reopenTargetId, setReopenTargetId] = useState(null);
  const [reopenReason, setReopenReason] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  const fileInputRef = useRef(null);
  const replyFileInputRef = useRef(null);

  const loadData = async () => {
    if (!customer?.id) return;
    const local = getStoredCustomerTickets(customer.id);
    if (local && local.length > 0) setTickets(local);
    const fresh = await fetchCustomerTickets(customer.id);
    if (fresh) setTickets(fresh);

    // Load customer orders for easy order selection
    const orders = getCustomerOrders(customer.id);
    setCustomerOrders(orders);
    syncCustomerOrders(customer.id).then((synced) => {
      if (synced && synced.length > 0) setCustomerOrders(synced);
    });
  };

  useEffect(() => {
    document.title = 'Help & Customer Support | GROVE';
    window.scrollTo(0, 0);
    loadData();

    const handleUpdate = () => {
      if (customer?.id) {
        setTickets(getStoredCustomerTickets(customer.id));
        fetchCustomerTickets(customer.id).then((fresh) => {
          if (fresh) setTickets(fresh);
        });
      }
    };

    window.addEventListener('grove_customer_tickets_updated', handleUpdate);

    // Live sync polling every 25s
    const interval = setInterval(() => {
      if (!document.hidden && customer?.id) {
        fetchCustomerTickets(customer.id).then((fresh) => {
          if (fresh) setTickets(fresh);
        });
      }
    }, 25000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('grove_customer_tickets_updated', handleUpdate);
    };
  }, [customer?.id]);

  const handleFileUpload = (e, isReply = false) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setToastMessage(`File "${file.name}" exceeds 10MB limit.`);
        setTimeout(() => setToastMessage(''), 4000);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const item = {
          name: file.name,
          type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
          size: file.size,
          url: reader.result
        };

        if (isReply) {
          setReplyAttachments((prev) => [...prev, item]);
        } else {
          setTicketAttachments((prev) => [...prev, item]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeAttachment = (index, isReply = false) => {
    if (isReply) {
      setReplyAttachments((prev) => prev.filter((_, i) => i !== index));
    } else {
      setTicketAttachments((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await submitCustomerTicket(
        {
          subject: ticketSubject.trim(),
          category: ticketCategory,
          description: ticketDescription.trim(),
          orderNumber: ticketOrderId.trim(),
          attachments: ticketAttachments
        },
        customer?.id
      );

      setToastMessage(`Support ticket #${created.ticketId || 'TCK'} created successfully. Support desk notified.`);
      setTicketSubject('');
      setTicketDescription('');
      setTicketOrderId('');
      setTicketAttachments([]);
      await loadData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      setToastMessage(err.message || 'Failed to submit support ticket.');
      setTimeout(() => setToastMessage(''), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyTicket = async (e, ticketId) => {
    e.preventDefault();
    if (!replyMessage.trim() && replyAttachments.length === 0) return;

    setIsReplying(true);
    try {
      await replyToCustomerTicket(ticketId, replyMessage.trim(), replyAttachments, customer?.id);
      setReplyMessage('');
      setReplyAttachments([]);
      await loadData();
      setToastMessage('Reply submitted to support operations.');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      setToastMessage(err.message || 'Failed to post reply.');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setIsReplying(false);
    }
  };

  const handleReopenTicket = async (ticketId) => {
    if (!reopenReason.trim()) {
      setToastMessage('Please enter a reason for reopening the ticket.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setIsReopening(true);
    try {
      await reopenCustomerTicket(ticketId, reopenReason.trim(), customer?.id);
      setReopenTargetId(null);
      setReopenReason('');
      await loadData();
      setToastMessage(`Ticket #${ticketId} reopened as Open.`);
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      setToastMessage(err.message || 'Failed to reopen ticket.');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setIsReopening(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Under Review':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'In Progress':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Waiting for Customer':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Closed':
        return 'bg-neutral-100 text-neutral-700 border-neutral-300';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  const filteredTickets = useMemo(() => {
    if (activeStatusTab === 'All') return tickets;
    return tickets.filter((t) => t.status === activeStatusTab);
  }, [tickets, activeStatusTab]);

  return (
    <div className="min-h-screen bg-[#F3FCF3]/40 flex flex-col">
      <div className="border-b border-neutral-200/70 bg-white/80 backdrop-blur-xs sticky top-0 z-30">
        <Navbar darkText={true} />
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#012D1D] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs sm:text-sm font-semibold animate-fade-in border border-[#AEEECB]/30">
            <CheckCircle2 className="w-4 h-4 text-[#AEEECB]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Account Header & Tabs Navigation */}
        <div className="flex flex-col gap-4 pb-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) navigate(-1);
                  else navigate('/');
                }}
                className="p-2 sm:p-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-gray-950 hover:bg-gray-50 active:scale-95 shadow-2xs transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Go Back"
                aria-label="Go Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-semibold mb-1">
                  <Link to="/" className="hover:text-[#1B4332] transition-colors">Home</Link>
                  <span>/</span>
                  <span>My Account</span>
                  <span>/</span>
                  <span className="text-neutral-900 font-bold">Help & Support</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2.5">
                  <span>Customer Help & Support</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E9F3ED] text-[#1B4332] border border-[#c4e3cf]">
                    24/7 Desk
                  </span>
                </h1>
              </div>
            </div>

            {/* Quick Contact Desk */}
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="tel:180041947683"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#C1C8C2]/60 text-xs font-bold text-[#012D1D] hover:bg-[#F3FCF3] transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#2C694E]" />
                <span>1800-419-GROVE</span>
              </a>
              <a
                href="mailto:support@grove.com"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#C1C8C2]/60 text-xs font-bold text-[#012D1D] hover:bg-[#F3FCF3] transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#2C694E]" />
                <span>support@grove.com</span>
              </a>
            </div>
          </div>

          {/* Account Sub-navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1">
            <Link
              to="/account/orders"
              className="px-4 py-2 rounded-xl text-xs font-bold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5"
            >
              <Package className="w-4 h-4 text-neutral-500" />
              <span>My Orders</span>
            </Link>
            <Link
              to="/account/addresses"
              className="px-4 py-2 rounded-xl text-xs font-bold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5"
            >
              <MapPin className="w-4 h-4 text-neutral-500" />
              <span>Delivery Addresses</span>
            </Link>
            <div className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1B4332] text-white flex items-center gap-1.5 shadow-xs">
              <HelpCircle className="w-4 h-4 text-[#AEEECB]" />
              <span>Help & Support</span>
            </div>
          </div>
        </div>

        {/* 2-Column Split: Raise Support Ticket (Left 7 cols) & FAQ / Help Info (Right 5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Raise Support Ticket Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-[#C1C8C2]/40 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C1C8C2]/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2C694E]"></span>
                <h2 className="text-base sm:text-lg font-bold text-[#151D18]">
                  Raise a Support Ticket
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#717973]">Direct Customer Support</span>
            </div>

            <form onSubmit={handleSubmitTicket} className="flex flex-col gap-4">
              {/* Field 1: Subject */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Title of the issue (e.g. Broken packaging or payment deducted twice)"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                />
              </div>

              {/* Field 2: Category (Exact 9 options) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all cursor-pointer"
                >
                  {CUSTOMER_TICKET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 3: Order ID (Optional) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                    Order ID <span className="text-[#717973] font-normal">(Optional, for order disputes)</span>
                  </label>
                  {customerOrders.length > 0 && (
                    <span className="text-[11px] text-[#2C694E] font-medium">
                      Select below or enter custom Order #
                    </span>
                  )}
                </div>

                {customerOrders.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={ticketOrderId}
                      onChange={(e) => setTicketOrderId(e.target.value)}
                      className="h-11 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/40 text-xs font-medium text-[#151D18] focus:outline-none focus:bg-white focus:border-[#2C694E] cursor-pointer"
                    >
                      <option value="">-- Select from your recent orders --</option>
                      {customerOrders.map((o) => (
                        <option key={o.orderId || o.id} value={o.orderId || o.id}>
                          #{o.orderId || o.id} - ₹{Number(o.total || o.pricing?.total || 0).toLocaleString('en-IN')} ({o.status})
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={ticketOrderId}
                      onChange={(e) => setTicketOrderId(e.target.value)}
                      placeholder="Or type order # (e.g. GRV-354234)"
                      className="h-11 px-3.5 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/40 text-xs font-medium text-[#151D18] focus:outline-none focus:bg-white focus:border-[#2C694E]"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={ticketOrderId}
                    onChange={(e) => setTicketOrderId(e.target.value)}
                    placeholder="e.g. GRV-354234"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/40 text-xs font-medium text-[#151D18] focus:outline-none focus:bg-white focus:border-[#2C694E]"
                  />
                )}
              </div>

              {/* Field 4: Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="Provide detailed explanation of the issue, symptoms, expected resolution..."
                  className="w-full p-3.5 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] resize-y transition-colors leading-relaxed"
                />
              </div>

              {/* Field 5: Attachment (Optional) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                    Attachment <span className="text-[#717973] font-normal">(Optional, Screenshots or PDF up to 10MB)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2C694E] hover:text-[#012D1D] hover:underline cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Upload Attachment</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, false)}
                  />
                </div>

                {/* Uploaded Attachment Chips */}
                {ticketAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ticketAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E7F0E8] border border-[#C1C8C2]/60 text-xs text-[#012D1D] font-medium"
                      >
                        {att.type.includes('pdf') ? (
                          <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        )}
                        <span className="truncate max-w-[160px]">{att.name}</span>
                        <span className="text-[10px] text-[#717973]">({formatFileSize(att.size)})</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx, false)}
                          className="p-0.5 hover:text-red-600 transition-colors cursor-pointer"
                          aria-label="Remove attachment"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-6 rounded-xl bg-[#1B4332] text-white text-xs sm:text-sm font-bold hover:bg-[#012D1D] active:scale-95 transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Send className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick FAQ / Guidelines (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-[#C1C8C2]/40 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C1C8C2]/30">
              <h2 className="text-base sm:text-lg font-bold text-[#151D18]">
                Common Questions
              </h2>
              <span className="text-xs font-semibold text-[#717973]">Support Guide</span>
            </div>

            <div className="flex flex-col gap-3 text-xs leading-relaxed text-[#414844]">
              <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/30">
                <h4 className="font-bold text-[#151D18] mb-1">When will I receive a reply?</h4>
                <p>Support responses are processed within 2 to 4 business hours. You will receive an in-app notice and email notification when an admin responds.</p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/30">
                <h4 className="font-bold text-[#151D18] mb-1">What does "Waiting for Customer" mean?</h4>
                <p>Our operations desk requires additional information (such as proof photos, consignment receipts, or confirmation) to resolve your issue. Please view the thread and reply.</p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/30">
                <h4 className="font-bold text-[#151D18] mb-1">Can I reopen a resolved ticket?</h4>
                <p>Yes. If your problem is not fixed to your satisfaction after resolution, click "Reopen Ticket" on the ticket card below.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Previously Submitted Tickets Section */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-[#C1C8C2]/40 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#C1C8C2]/30 gap-2">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-[#2C694E]" />
              <h2 className="text-base sm:text-lg font-bold text-[#151D18]">
                My Previously Submitted Tickets
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E7F0E8] text-[#151D18] text-xs font-mono font-bold">
                {tickets.length}
              </span>
            </div>
            <span className="text-xs text-[#717973]">
              Live tracking synchronized with GROVE Support Desk
            </span>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {STATUS_TABS.map((tab) => {
              const count = tab === 'All' ? tickets.length : tickets.filter((t) => t.status === tab).length;
              const isActive = activeStatusTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveStatusTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#012D1D] text-white shadow-xs'
                      : 'bg-[#F8FAF8] text-[#414844] hover:bg-[#E7F0E8] hover:text-[#151D18] border border-[#C1C8C2]/40'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-[#C1C8C2]/40 text-[#414844]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tickets List */}
          {filteredTickets.length === 0 ? (
            <div className="py-12 text-center text-[#717973] flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-[#AEEECB]" />
              <p className="text-sm font-semibold text-[#151D18]">No support tickets in this view</p>
              <p className="text-xs">Any tickets you submit above will appear here with full conversation history and live admin responses.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#C1C8C2]/30">
              {filteredTickets.map((t) => {
                const ticketId = t.ticketId || t._id;
                const isExpanded = expandedTicketId === ticketId;
                const status = t.status || 'Open';
                const isResolved = status === 'Resolved';
                const isWaitingForCustomer = status === 'Waiting for Customer';

                return (
                  <div key={ticketId} className="py-4 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[#012D1D] bg-[#F8FAF8] px-2 py-0.5 rounded border border-[#C1C8C2]/40">
                            #{ticketId}
                          </span>
                          <span className="font-bold text-sm text-[#151D18]">
                            {t.subject}
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(status)}`}>
                            {status}
                          </span>
                          {isWaitingForCustomer && (
                            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                              Action Required: Reply to Support
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[#717973] flex-wrap">
                          <span>Category: <strong className="text-[#151D18]">{t.category || 'Other / General'}</strong></span>
                          {t.orderNumber && (
                            <>
                              <span>•</span>
                              <span>Order: <strong className="text-[#151D18] font-mono">#{t.orderNumber}</strong></span>
                            </>
                          )}
                          <span>•</span>
                          <span>Submitted: <strong className="text-[#151D18]">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</strong></span>
                          {t.updatedAt && (
                            <>
                              <span>•</span>
                              <span>Updated: <strong className="text-[#151D18]">{new Date(t.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong></span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {/* Reopen button for Resolved tickets */}
                        {isResolved && (
                          <button
                            type="button"
                            onClick={() => {
                              setReopenTargetId(reopenTargetId === ticketId ? null : ticketId);
                              setReopenReason('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reopen Ticket</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedTicketId(isExpanded ? null : ticketId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C1C8C2]/60 hover:bg-[#F3FCF3] text-xs font-bold text-[#012D1D] transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{isExpanded ? 'Hide Thread' : `View Thread (${(t.messages || []).length})`}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Reopen Reason Prompt Box */}
                    {reopenTargetId === ticketId && (
                      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-300 flex flex-col gap-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-900">
                            Reopen Ticket #{ticketId} (Explain why issue is not resolved):
                          </span>
                          <button
                            type="button"
                            onClick={() => setReopenTargetId(null)}
                            className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                          placeholder="e.g. Issue persists, payment refund not received..."
                          className="h-10 px-3 rounded-lg bg-white border border-emerald-300 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReopenTargetId(null)}
                            className="px-3 py-1.5 text-xs text-neutral-600 font-semibold hover:underline cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isReopening || !reopenReason.trim()}
                            onClick={() => handleReopenTicket(ticketId)}
                            className="px-4 py-1.5 rounded-lg bg-[#012D1D] text-white text-xs font-bold hover:bg-[#1B4332] disabled:opacity-50 cursor-pointer"
                          >
                            {isReopening ? 'Reopening...' : 'Confirm Reopen'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Expandable Conversation Thread */}
                    {isExpanded && (
                      <div className="mt-2 p-4 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/40 flex flex-col gap-4 animate-fade-in">
                        {/* Linked Order Snapshot if available */}
                        {t.orderSnapshot && (
                          <div className="p-3 rounded-xl bg-white border border-[#C1C8C2]/40 flex items-center justify-between gap-3 flex-wrap text-xs">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-[#2C694E]" />
                              <div>
                                <span className="font-bold text-[#151D18]">Linked Order #{t.orderSnapshot.orderNumber}</span>
                                <span className="text-[11px] text-[#717973] block">
                                  ₹{Number(t.orderSnapshot.totalAmount || 0).toLocaleString('en-IN')} • {t.orderSnapshot.orderStatus}
                                </span>
                              </div>
                            </div>
                            <Link
                              to={`/account/orders/${t.orderSnapshot.orderNumber}`}
                              className="text-xs font-bold text-[#2C694E] hover:underline inline-flex items-center gap-1"
                            >
                              <span>View Order Details</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        )}

                        {/* Unmodifiable Complete Conversation Messages */}
                        <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                          {(t.messages && t.messages.length > 0) ? (
                            t.messages.map((m, mIdx) => {
                              const isAdmin = m.senderRole === 'admin';
                              return (
                                <div
                                  key={mIdx}
                                  className={`p-3.5 rounded-xl text-xs flex flex-col gap-2 max-w-[85%] ${
                                    isAdmin
                                      ? 'bg-white border border-[#2C694E]/30 self-start text-[#151D18] shadow-2xs'
                                      : 'bg-[#012D1D] text-white self-end shadow-2xs'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-4">
                                    <span className={`font-bold ${isAdmin ? 'text-[#0E5138]' : 'text-[#AEEECB]'}`}>
                                      {m.senderName || (isAdmin ? 'GROVE Support Operations' : 'You (Customer)')}
                                    </span>
                                    <span className={`text-[10px] ${isAdmin ? 'text-[#717973]' : 'text-neutral-300'}`}>
                                      {m.timestamp ? new Date(m.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                                    </span>
                                  </div>

                                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>

                                  {/* Attachments */}
                                  {m.attachments && m.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1 border-t border-white/10">
                                      {m.attachments.map((att, aIdx) => (
                                        <a
                                          key={aIdx}
                                          href={att.url}
                                          download={att.name}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                                            isAdmin
                                              ? 'bg-[#F3FCF3] border-[#C1C8C2]/60 text-[#012D1D] hover:bg-[#E7F0E8]'
                                              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                                          }`}
                                        >
                                          {att.type.includes('pdf') ? (
                                            <FileText className="w-3 h-3 text-rose-500" />
                                          ) : (
                                            <ImageIcon className="w-3 h-3 text-emerald-400" />
                                          )}
                                          <span className="truncate max-w-[140px]">{att.name}</span>
                                          <Download className="w-3 h-3 opacity-70" />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-[#717973] italic">No messages recorded in this support ticket.</p>
                          )}
                        </div>

                        {/* Reply Form */}
                        {status !== 'Closed' ? (
                          <form onSubmit={(e) => handleReplyTicket(e, ticketId)} className="flex flex-col gap-2 pt-2 border-t border-[#C1C8C2]/30">
                            {/* Uploaded Reply Attachment Chips */}
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
                                      onClick={() => removeAttachment(idx, true)}
                                      className="p-0.5 hover:text-red-600 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                placeholder={isWaitingForCustomer ? "Support requested additional details — reply here..." : "Type your message to support desk..."}
                                className={`flex-1 h-10 px-3.5 rounded-xl bg-white border text-xs text-[#151D18] focus:outline-none ${
                                  isWaitingForCustomer ? 'border-amber-400 focus:border-amber-600' : 'border-[#C1C8C2]/40 focus:border-[#2C694E]'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => replyFileInputRef.current?.click()}
                                className="h-10 px-3 rounded-xl border border-[#C1C8C2]/60 hover:bg-neutral-100 text-[#012D1D] text-xs font-bold flex items-center gap-1 cursor-pointer"
                                title="Attach screenshot or PDF"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Attach</span>
                              </button>
                              <input
                                ref={replyFileInputRef}
                                type="file"
                                multiple
                                accept="image/*,.pdf,application/pdf"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, true)}
                              />
                              <button
                                type="submit"
                                disabled={isReplying || (!replyMessage.trim() && replyAttachments.length === 0)}
                                className="h-10 px-4 rounded-xl bg-[#1B4332] text-white text-xs font-bold hover:bg-[#012D1D] disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{isReplying ? 'Sending...' : 'Reply'}</span>
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="text-xs text-neutral-700 bg-neutral-100 p-3 rounded-xl border border-neutral-300 flex items-center gap-2 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-neutral-600 shrink-0" />
                            <span>This ticket has been officially closed by GROVE support desk.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
