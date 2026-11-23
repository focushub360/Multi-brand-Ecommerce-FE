import { customerSupportApi } from './apiClient';

export const CUSTOMER_TICKET_CATEGORIES = [
  'Account & Login Issues',
  'Product & Catalog Issues',
  'Cart & Wishlist Issues',
  'Order-Related Issues',
  'Payment & Refund Issues',
  'Delivery & Tracking Issues',
  'Address & Location Issues',
  'Technical Issues',
  'Other / General'
];

export const CUSTOMER_TICKET_STATUSES = [
  'Open',
  'Under Review',
  'In Progress',
  'Waiting for Customer',
  'Resolved',
  'Closed'
];

export function getStoredCustomerTickets(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`grove_customer_tickets_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredCustomerTickets(userId, tickets) {
  if (!userId) return;
  try {
    localStorage.setItem(`grove_customer_tickets_${userId}`, JSON.stringify(tickets));
  } catch {}
}

export async function fetchCustomerTickets(userId) {
  if (!userId) return [];
  try {
    const res = await customerSupportApi.getMyTickets();
    const tickets = res?.data || res?.tickets || (Array.isArray(res) ? res : []);
    if (Array.isArray(tickets)) {
      saveStoredCustomerTickets(userId, tickets);
      return tickets;
    }
  } catch (err) {
    console.warn('Backend customer tickets fetch warning:', err.message);
  }
  return getStoredCustomerTickets(userId);
}

export async function submitCustomerTicket(ticketData, userId) {
  try {
    const res = await customerSupportApi.createTicket({
      subject: ticketData.subject,
      category: ticketData.category || 'Other / General',
      description: ticketData.description || ticketData.message,
      message: ticketData.description || ticketData.message,
      orderNumber: ticketData.orderNumber || '',
      attachments: ticketData.attachments || []
    });
    const ticket = res?.data || res;
    if (userId) {
      const existing = getStoredCustomerTickets(userId);
      const updated = [ticket, ...existing.filter((t) => (t.ticketId || t._id) !== (ticket.ticketId || ticket._id))];
      saveStoredCustomerTickets(userId, updated);
      window.dispatchEvent(new Event('grove_customer_tickets_updated'));
    }
    return ticket;
  } catch (err) {
    console.warn('Backend create customer ticket error:', err.message);
    throw err;
  }
}

export async function replyToCustomerTicket(ticketId, message, attachments = [], userId) {
  try {
    const res = await customerSupportApi.replyToTicket(ticketId, message, attachments);
    const updated = res?.data || res;
    if (userId) {
      await fetchCustomerTickets(userId);
      window.dispatchEvent(new Event('grove_customer_tickets_updated'));
    }
    return updated;
  } catch (err) {
    console.warn('Backend reply customer ticket error:', err.message);
    throw err;
  }
}

export async function reopenCustomerTicket(ticketId, reason = '', userId) {
  try {
    const res = await customerSupportApi.reopenTicket(ticketId, reason);
    const updated = res?.data || res;
    if (userId) {
      await fetchCustomerTickets(userId);
      window.dispatchEvent(new Event('grove_customer_tickets_updated'));
    }
    return updated;
  } catch (err) {
    console.warn('Backend reopen customer ticket error:', err.message);
    throw err;
  }
}

export async function fetchCustomerNotifications(userId) {
  if (!userId) return [];
  try {
    const res = await customerSupportApi.getNotifications();
    const notifs = res?.data || (Array.isArray(res) ? res : []);
    if (Array.isArray(notifs)) {
      localStorage.setItem(`grove_customer_inapp_notifs_${userId}`, JSON.stringify(notifs));
      return notifs;
    }
  } catch (err) {
    console.warn('Backend customer notifications fetch warning:', err.message);
  }
  return [];
}

export async function markCustomerNotificationAsRead(notifId, userId) {
  try {
    await customerSupportApi.markNotificationRead(notifId);
    if (userId) {
      await fetchCustomerNotifications(userId);
    }
  } catch (err) {
    console.warn('Backend mark customer notification read error:', err.message);
  }
}
