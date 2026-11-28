/**
 * ==============================================================================
 * GROVE Fullstack REST API Client
 * ==============================================================================
 * Centralized HTTP client connecting the React frontend directly to the
 * production Express / MongoDB backend. Supports Bearer token authorization,
 * standardized payload unwrapping, query string serialization, and error parsing.
 * ==============================================================================
 */

const rawBaseUrl = import.meta.env.VITE_API_URL || 'https://multi-brand-ecommerce-be.onrender.com/api/v1';
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

// Unified token storage keys
export const TOKEN_STORAGE_KEY = 'grove_auth_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'grove_refresh_token';

/**
 * Retrieves the currently active authorization token.
 * Checks primary token key, with fallbacks to role-specific storage keys.
 */
export function getAuthToken(targetEndpoint = '') {
  try {
    const ep = String(targetEndpoint || '').toLowerCase();
    const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';

    // If endpoint or current page is dealer-related, prioritize dealer token
    if (ep.includes('/dealer') || (!ep.includes('/admin') && !ep.includes('/my-orders') && pathname.startsWith('/dealer'))) {
      const dealerToken = localStorage.getItem('grove_dealer_token');
      if (dealerToken) return dealerToken;
      const dealer = localStorage.getItem('grove_dealer_user');
      if (dealer) {
        const parsed = JSON.parse(dealer);
        if (parsed.token) return parsed.token;
      }
    }

    // If endpoint or current page is admin-related, prioritize admin token
    if (ep.includes('/admin') || (!ep.includes('/dealer') && !ep.includes('/my-orders') && pathname.startsWith('/admin'))) {
      const adminToken = localStorage.getItem('grove_admin_token');
      if (adminToken) return adminToken;
      const admin = localStorage.getItem('grove_admin_user');
      if (admin) {
        const parsed = JSON.parse(admin);
        if (parsed.token) return parsed.token;
      }
    }

    // If endpoint or current page is customer/cart/account, prioritize customer token
    if (ep.includes('/my-orders') || ep.includes('/cart') || pathname.startsWith('/account')) {
      const customerToken = localStorage.getItem('grove_customer_token');
      if (customerToken) return customerToken;
      const customer = localStorage.getItem('grove_current_user');
      if (customer) {
        const parsed = JSON.parse(customer);
        if (parsed.token) return parsed.token;
      }
    }

    const directToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (directToken) return directToken;

    // Fallbacks if token was stored in a session object
    const customer = localStorage.getItem('grove_current_user');
    if (customer) {
      const parsed = JSON.parse(customer);
      if (parsed.token) return parsed.token;
    }

    const dealer = localStorage.getItem('grove_dealer_user');
    if (dealer) {
      const parsed = JSON.parse(dealer);
      if (parsed.token) return parsed.token;
    }

    const admin = localStorage.getItem('grove_admin_user');
    if (admin) {
      const parsed = JSON.parse(admin);
      if (parsed.token) return parsed.token;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Sets the active authentication token.
 */
export function setAuthToken(token, role = null) {
  if (!token) return;

  localStorage.setItem(TOKEN_STORAGE_KEY, token);

  if (role === 'admin') {
    localStorage.setItem('grove_admin_token', token);
  } else if (role === 'dealer') {
    localStorage.setItem('grove_dealer_token', token);
  } else if (role === 'user' || role === 'customer') {
    localStorage.setItem('grove_customer_token', token);
  }
}

export function clearAuthToken() {
  [
    TOKEN_STORAGE_KEY,
    REFRESH_TOKEN_STORAGE_KEY,
    'grove_admin_token',
    'grove_dealer_token',
    'grove_customer_token'
  ].forEach(key => localStorage.removeItem(key));
}

/**
 * Serializes an object into URL search parameters
 */
function buildQueryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const str = query.toString();
  return str ? `?${str}` : '';
}

let refreshPromise = null;

/**
 * Core HTTP Request Dispatcher
 */


/**
 * Core HTTP Request Dispatcher
 */
async function request(endpoint, options = {}) {
  const {
    skipAuth = false,
    _retry = false,
    ...fetchOptions
  } = options;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const token = skipAuth ? null : getAuthToken(endpoint);

  const headers = {
    Accept: 'application/json',
    ...(fetchOptions.body && !(fetchOptions.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {})
  };

  const config = {
    ...fetchOptions,
    headers,
    credentials: 'include'
  };

  if (
    fetchOptions.body &&
    typeof fetchOptions.body === 'object' &&
    !(fetchOptions.body instanceof FormData)
  ) {
    config.body = JSON.stringify(fetchOptions.body);
  }

  try {
    const res = await fetch(url, config);

    console.log('GROVE API REQUEST:', {
      url,
      method: config.method,
      status: res.status
    });

    // Handle empty response
    if (res.status === 204) {
      return { success: true };
    }

    // Handle expired access token
    if (
      res.status === 401 &&
      !skipAuth &&
      !_retry &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/refresh-token')
    ) {
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const storedRefreshToken = localStorage.getItem(
              REFRESH_TOKEN_STORAGE_KEY
            );

            const refreshRes = await fetch(
              `${API_BASE_URL}/auth/refresh-token`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                  refreshToken: storedRefreshToken || undefined
                })
              }
            );

            const refreshJson = await refreshRes.json().catch(() => null);

            if (!refreshRes.ok) {
              throw new Error(
                refreshJson?.message || 'Token refresh failed'
              );
            }

            const newAccessToken = refreshJson?.data?.accessToken;

            if (!newAccessToken) {
              throw new Error('No access token returned');
            }

            setAuthToken(newAccessToken);

            if (refreshJson?.data?.refreshToken) {
              localStorage.setItem(
                REFRESH_TOKEN_STORAGE_KEY,
                refreshJson.data.refreshToken
              );
            }

            // Update stored customer session if present
            const rawCustomer = localStorage.getItem('grove_current_user');

            if (rawCustomer) {
              try {
                const customer = JSON.parse(rawCustomer);
                customer.token = newAccessToken;

                localStorage.setItem(
                  'grove_current_user',
                  JSON.stringify(customer)
                );
              } catch (error) {
                console.warn('Could not update customer session:', error);
              }
            }

            return newAccessToken;
          })();
        }

        const freshToken = await refreshPromise;

        return await request(endpoint, {
          ...fetchOptions,
          _retry: true,
          headers: {
            ...fetchOptions.headers,
            Authorization: `Bearer ${freshToken}`
          }
        });
      } catch (refreshError) {
        console.error('GROVE TOKEN REFRESH ERROR:', refreshError);

        clearAuthToken();
        localStorage.removeItem('grove_current_user');

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('grove_auth_changed'));
        }

        throw refreshError;
      } finally {
        refreshPromise = null;
      }
    }

    // Parse response
    const data = await res.json().catch(() => null);

    // Handle API errors
    if (!res.ok) {
      console.error('GROVE API ERROR:', {
        url,
        method: config.method,
        status: res.status,
        response: data
      });

      const message =
        data?.message ||
        data?.error ||
        (Array.isArray(data?.errors)
          ? data.errors.map((e) => e.message || String(e)).join(', ')
          : null) ||
        `HTTP Error ${res.status}: ${res.statusText}`;

      const error = new Error(message);

      error.status = res.status;
      error.code = data?.code;
      error.data = data;
      error.url = url;
      error.method = config.method;

      throw error;
    }

    return data;
  } catch (error) {
    console.error('GROVE REQUEST FAILED:', {
      url,
      method: config.method,
      status: error.status,
      message: error.message
    });

    throw error;
  }
}



export const apiClient = {
  // Authenticated GET
  get: (endpoint, params, headers) =>
    request(
      `${endpoint}${buildQueryString(params)}`,
      {
        method: 'GET',
        headers
      }
    ),

  // Public GET - no Bearer token
  getPublic: (endpoint, params, headers) =>
    request(
      `${endpoint}${buildQueryString(params)}`,
      {
        method: 'GET',
        headers,
        skipAuth: true
      }
    ),

  post: (endpoint, body, headers) =>
    request(endpoint, {
      method: 'POST',
      body,
      headers
    }),

  put: (endpoint, body, headers) =>
    request(endpoint, {
      method: 'PUT',
      body,
      headers
    }),

  patch: (endpoint, body, headers) =>
    request(endpoint, {
      method: 'PATCH',
      body,
      headers
    }),

  delete: (endpoint, headers) =>
    request(endpoint, {
      method: 'DELETE',
      headers
    })
};

/* ==========================================================================
   MODULE-SPECIFIC API CONSUMPTION METHODS
   ========================================================================== */

/**
 * 1. Authentication APIs
 */
export const authApi = {
  login: async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    if (res?.data?.accessToken) {
      setAuthToken(res.data.accessToken);
    }
    if (res?.data?.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, res.data.refreshToken);
    }
    return res.data;
  },

  register: async (userData) => {
    const res = await apiClient.post('/auth/register', userData);
    if (res?.data?.accessToken) {
      setAuthToken(res.data.accessToken);
    }
    if (res?.data?.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, res.data.refreshToken);
    }
    return res.data;
  },

  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearAuthToken();
    }
  },

  firstTimePassword: async (newPassword, confirmPassword) => {
    const res = await apiClient.post('/auth/first-time-password', {
      newPassword,
      confirmPassword
    });
    return res.data;
  },

  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    const res = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword
    });
    return res.data;
  },

  registerDealer: async (applicationData) => {
    const res = await apiClient.post('/dealers/apply', applicationData);
    return res.data;
  }
};

/**
 * 2. Products APIs
 */
export const productsApi = {
  getAll: async (params = {}) => {
    const res = await apiClient.get('/products', params);
    return res.data;
  },

  getByIdOrSlug: async (idOrSlug) => {
    const res = await apiClient.get(`/products/${idOrSlug}`);
    return res.data;
  },

  getMyProducts: async (params = {}) => {
    const res = await apiClient.get('/products/dealer/my-products', params);
    return res.data;
  },

  create: async (productData) => {
    const res = await apiClient.post('/products', productData);
    return res.data;
  },

  update: async (id, updateData) => {
    const res = await apiClient.put(`/products/${id}`, updateData);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/products/${id}`);
    return res.data;
  }
};

/**
 * 3. Categories APIs
 */

export const categoriesApi = {
  // Customer - public categories
  getAll: async () => {
    const res = await apiClient.getPublic('/categories');
    return res.data;
  },

  // Admin - all categories including inactive
  getAllAdmin: async () => {
    const res = await apiClient.get('/categories/admin/all');
    return res.data;
  },

  // Public category details
  getBySlug: async (slug) => {
    const res = await apiClient.getPublic(
      `/categories/${encodeURIComponent(slug)}`
    );
    return res.data;
  },

  // Admin category management
  create: async (categoryData) => {
    const res = await apiClient.post('/categories', categoryData);
    return res.data;
  },

  update: async (id, updateData) => {
    const res = await apiClient.put(
      `/categories/${id}`,
      updateData
    );
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/categories/${id}`);
    return res.data;
  },

  addSubcategory: async (id, subcategory) => {
    const res = await apiClient.post(
      `/categories/${id}/subcategories`,
      subcategory
    );
    return res.data;
  }
};


/**
 * 4. Orders APIs
 */
export const ordersApi = {
  checkout: async (orderPayload) => {
    const res = await apiClient.post('/orders/checkout', orderPayload);
    return res.data;
  },

  getMyOrders: async () => {
    const res = await apiClient.get('/orders/my-orders');
    return res.data;
  },

  getMyOrderById: async (orderId) => {
    const res = await apiClient.get(`/orders/my-orders/${orderId}`);
    return res.data;
  },

  cancelOrder: async (orderId, reason = 'Customer request') => {
    const res = await apiClient.post(`/orders/my-orders/${orderId}/cancel`, { reason });
    return res.data;
  },

  getDealerOrders: async () => {
    const res = await apiClient.get('/orders/dealer/my-orders');
    return res.data;
  },

  getDealerOrderById: async (id) => {
    const res = await apiClient.get(`/orders/dealer/my-orders/${id}`);
    return res.data;
  },

  updateDealerOrderStatus: async (id, statusData) => {
    const res = await apiClient.patch(`/orders/dealer/my-orders/${id}/status`, statusData);
    return res.data;
  },

  getAdminOrders: async () => {
    const res = await apiClient.get('/orders/admin');
    return res.data;
  },

  getAdminOrderById: async (id) => {
    const res = await apiClient.get(`/orders/admin/${id}`);
    return res.data;
  }
};

/**
 * 5. Delivery Addresses APIs
 */
export const addressesApi = {
  getAll: async () => {
    const res = await apiClient.get('/addresses');
    return res.data;
  },

  create: async (addressData) => {
    const res = await apiClient.post('/addresses', addressData);
    return res.data;
  },

  update: async (id, addressData) => {
    const res = await apiClient.put(`/addresses/${id}`, addressData);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/addresses/${id}`);
    return res.data;
  },

  setDefault: async (id) => {
    const res = await apiClient.patch(`/addresses/${id}/default`);
    return res.data;
  }
};

/**
 * 6. Cart APIs
 */
export const cartApi = {
  get: async () => {
    const res = await apiClient.get('/cart');
    return res.data;
  },

  addItem: async (productId, quantity = 1) => {
    const res = await apiClient.post('/cart/items', { productId, quantity });
    return res.data;
  },

  updateQty: async (productId, quantity) => {
    const res = await apiClient.patch(`/cart/items/${productId}`, { quantity });
    return res.data;
  },

  removeItem: async (productId) => {
    const res = await apiClient.delete(`/cart/items/${productId}`);
    return res.data;
  },

  clear: async () => {
    const res = await apiClient.delete('/cart');
    return res.data;
  }
};

/**
 * 7. Wishlist APIs
 */
export const wishlistApi = {
  get: async () => {
    const res = await apiClient.get('/wishlist');
    return res.data;
  },

  toggle: async (productId) => {
    const res = await apiClient.post('/wishlist/toggle', { productId });
    return res.data;
  },

  remove: async (productId) => {
    const res = await apiClient.delete(`/wishlist/${productId}`);
    return res.data;
  }
};

/**
 * 7b. Customer Support Ticket APIs
 */
export const customerSupportApi = {
  createTicket: async (ticketData) => {
    const res = await apiClient.post('/complaints', ticketData);
    return res.data;
  },
  getMyTickets: async () => {
    const res = await apiClient.get('/complaints/my-tickets');
    return res.data;
  },
  replyToTicket: async (ticketId, text, attachments = []) => {
    const res = await apiClient.post(`/complaints/${ticketId}/messages`, { text, attachments });
    return res.data;
  },
  reopenTicket: async (ticketId, reason = '') => {
    const res = await apiClient.post(`/complaints/${ticketId}/reopen`, { reason });
    return res.data;
  },
  getNotifications: async () => {
    const res = await apiClient.get('/complaints/customer/notifications');
    return res.data;
  },
  markNotificationRead: async (id) => {
    const res = await apiClient.patch(`/complaints/customer/notifications/${id}/read`);
    return res.data;
  }
};

/**
 * 8. Dealer Operations APIs
 */
export const dealerApi = {
  getProfile: async () => {
    const res = await apiClient.get('/dealers/profile');
    return res.data;
  },

  updateStoreSettings: async (settings) => {
    const res = await apiClient.put('/dealers/store-settings', settings);
    return res.data;
  },

  verifyBankDetails: async (bankData) => {
    const res = await apiClient.put('/dealers/bank-details/verify', bankData);
    return res.data;
  },

  submitOnboardingBankDetails: async (bankData) => {
    const res = await apiClient.put('/dealers/onboarding/bank-details', bankData);
    return res.data;
  },

  getInventory: async () => {
    const res = await apiClient.get('/inventory/my-inventory');
    return res.data;
  },

  adjustStock: async (productId, payload) => {
    const res = await apiClient.patch(`/inventory/${productId}/stock`, payload);
    return res.data;
  },

  getSettlements: async () => {
    const res = await apiClient.get('/settlements/my-settlements');
    return res.data;
  },

  getAnalytics: async (range = '30D') => {
    const res = await apiClient.get(`/analytics/dealer?range=${range}`);
    return res.data;
  },

  createSupportTicket: async (ticketData) => {
    const res = await apiClient.post('/complaints', ticketData);
    return res.data;
  },

  getMySupportTickets: async () => {
    const res = await apiClient.get('/complaints/my-tickets');
    return res.data;
  },

  replyToSupportTicket: async (ticketId, text, attachments = []) => {
    const res = await apiClient.post(`/complaints/${ticketId}/messages`, { text, attachments });
    return res.data;
  },

  reopenSupportTicket: async (ticketId, reason = '') => {
    const res = await apiClient.post(`/complaints/${ticketId}/reopen`, { reason });
    return res.data;
  },

  getDealerNotifications: async () => {
    const res = await apiClient.get('/complaints/dealer/notifications');
    return res.data;
  },

  markDealerNotificationRead: async (id) => {
    const res = await apiClient.patch(`/complaints/dealer/notifications/${id}/read`);
    return res.data;
  }
};

/**
 * 9. Admin Platform APIs
 */
export const adminApi = {
  getOverview: async () => {
    const res = await apiClient.get('/analytics/admin');
    return res.data;
  },

  getProducts: async (params = {}) => {
    const res = await apiClient.get('/products/admin', params);
    return res.data;
  },
  updateProduct: async (id, payload) => {
    const res = await apiClient.put(`/products/admin/${id}`, payload);
    return res.data;
  },
  deleteProduct: async (id) => {
    const res = await apiClient.delete(`/products/admin/${id}`);
    return res.data;
  },
  adjustInventoryStock: async (productId, payload) => {
    const res = await apiClient.patch(`/inventory/admin/${productId}/stock`, payload);
    return res.data;
  },
  getInventoryTransactions: async (params = {}) => {
    const res = await apiClient.get('/inventory/admin/transactions', params);
    return res.data;
  },

  getDealers: async () => {
    const res = await apiClient.get('/admin/dealers');
    return res.data;
  },

  getDealerById: async (id) => {
    const res = await apiClient.get(`/admin/dealers/${id}`);
    return res.data;
  },

  updateDealer: async (id, payload) => {
    const res = await apiClient.put(`/admin/dealers/${id}`, payload);
    return res.data;
  },
  resetDealerCredentials: async (id) => {
    const res = await apiClient.post(`/admin/dealers/${id}/reset-credentials`);
    return res.data;
  },

  approveDealer: async (id, payload = {}) => {
    const res = await apiClient.post(`/admin/dealers/${id}/approve`, payload);
    return res.data;
  },

  verifyDealerKyc: async (id, payload = {}) => {
    const res = await apiClient.patch(`/admin/dealers/${id}/verify-kyc`, payload);
    return res.data;
  },

  rejectDealer: async (id, reason) => {
    const res = await apiClient.post(`/admin/dealers/${id}/reject`, { reason });
    return res.data;
  },

  toggleDealerStatus: async (id, status, reason = '') => {
    const res = await apiClient.patch(`/admin/dealers/${id}/status`, { status, reason });
    return res.data;
  },

  getInventory: async () => {
    const res = await apiClient.get('/inventory/global');
    return res.data;
  },

  getLocations: async () => {
    const res = await apiClient.get('/dealer-locations');
    return res.data;
  },
  createLocation: async (payload) => {
    const res = await apiClient.post('/dealer-locations', payload);
    return res.data;
  },
  updateLocation: async (id, payload) => {
    const res = await apiClient.put(`/dealer-locations/${id}`, payload);
    return res.data;
  },
  deleteLocation: async (id) => {
    const res = await apiClient.delete(`/dealer-locations/${id}`);
    return res.data;
  },

  getPayments: async () => {
    const res = await apiClient.get('/payments');
    return res.data;
  },

  getSettlements: async () => {
    const res = await apiClient.get('/settlements');
    return res.data;
  },

  getComplaints: async (params = {}) => {
    const res = await apiClient.get('/complaints/admin/all', params);
    return res.data;
  },

  updateComplaintStatus: async (ticketId, status, note = '', reason = '') => {
    const res = await apiClient.patch(`/complaints/admin/${ticketId}/status`, { status, note, reason });
    return res.data;
  },
  replyToComplaint: async (ticketId, text, internalNote = false, status = null, attachments = []) => {
    const res = await apiClient.post(`/complaints/admin/${ticketId}/replies`, {
      text,
      internalNote,
      ...(status ? { status } : {}),
      attachments: attachments || []
    });
    return res.data;
  },

  getAuditLogs: async () => {
    const res = await apiClient.get('/admin/audit-logs');
    return res.data;
  },

  getSettings: async () => {
    const res = await apiClient.get('/admin/settings');
    return res.data;
  },

  updateSettings: async (settings) => {
    const res = await apiClient.put('/admin/settings', settings);
    return res.data;
  },

 

  getNotifications: async () => {
    const res = await apiClient.get('/admin/notifications');
    return res.data;
  },

  getNotificationCounts: async () => {
    const res = await apiClient.get('/admin/notifications/counts');
    return res.data;
  },

  markNotificationAsRead: async (id) => {
    const res = await apiClient.patch(`/admin/notifications/${id}/read`);
    return res.data;
  },

  markAllNotificationsAsRead: async () => {
    const res = await apiClient.patch('/admin/notifications/mark-all-read');
    return res.data;
  },

  // ADMIN BUYER MANAGEMENT
  getUsers: async (params = {}) => {
    const res = await apiClient.get('/admin/users', params);
    return res;
  },
  getUserStats: async () => {
  const res = await apiClient.get('/admin/users/stats');
  return res.data;
},

getUserById: async (id) => {
  const res = await apiClient.get(`/admin/users/${id}`);
  return res.data;
},

  updateUserStatus: async (id, status) => {
    return await apiClient.patch(`/admin/users/${id}/status`, { status });
  },

  deleteUser: async (id) => {
    return await apiClient.delete(`/admin/users/${id}`);
  },
};



export default apiClient;
