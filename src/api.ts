import { Order, OrderItem, OrderStatus, Employee, ProductionAssignment, EmployeeReport, User, Client, OrderHistory, Payment, Product } from './types';

const API_BASE = '/api';

const handleResponse = async (res: Response) => {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText} - ${text.substring(0, 100)}`);
    }
    throw new Error(`Expected JSON but received non-JSON response: ${text.substring(0, 100)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || `API Error: ${res.status} ${res.statusText}`);
  }
  return data;
};

export const api = {
  getOrders: async (includeInactive: boolean = false): Promise<Order[]> => {
    const res = await fetch(`${API_BASE}/orders?includeInactive=${includeInactive}`);
    return handleResponse(res);
  },
  getOrder: async (id: number): Promise<Order> => {
    const res = await fetch(`${API_BASE}/orders/${id}`);
    return handleResponse(res);
  },
  createOrder: async (order: Partial<Order> & { user_name?: string }): Promise<{ id: number; order_number: string }> => {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    return handleResponse(res);
  },
  addItems: async (orderId: number, items: Partial<OrderItem>[]): Promise<{ items: OrderItem[] }> => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    return handleResponse(res);
  },
  updateStatus: async (orderId: number, status: OrderStatus, user_name?: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, user_name }),
    });
    await handleResponse(res);
  },
  updateDesignVersionStatus: async (versionId: number, orderId: number, status: string, client_comments: string, user_name?: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/design-versions/${versionId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, client_comments, order_id: orderId, user_name }),
    });
    await handleResponse(res);
  },
  recordPayment: async (orderId: number, type: 'advance' | 'total', amount: number, user_name?: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount, user_name }),
    });
    await handleResponse(res);
  },
  uploadDesign: async (orderId: number, formData: FormData, user_name?: string): Promise<void> => {
    if (user_name) formData.append('created_by', user_name);
    const res = await fetch(`${API_BASE}/orders/${orderId}/design-version`, {
      method: 'POST',
      body: formData,
    });
    await handleResponse(res);
  },
  uploadReferences: async (orderId: number, formData: FormData, user_name?: string): Promise<void> => {
    if (user_name) formData.append('uploaded_by', user_name);
    const res = await fetch(`${API_BASE}/orders/${orderId}/references`, {
      method: 'POST',
      body: formData,
    });
    await handleResponse(res);
  },
  getStats: async (): Promise<{ activeOrders: number; monthlySales: number; delayedOrders: number }> => {
    const res = await fetch(`${API_BASE}/stats`);
    return handleResponse(res);
  },
  updateOrder: async (id: number, order: Partial<Order> & { user_name?: string }): Promise<void> => {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    await handleResponse(res);
  },
  getOrderHistory: async (id: number): Promise<OrderHistory[]> => {
    const res = await fetch(`${API_BASE}/orders/${id}/history`);
    return handleResponse(res);
  },
  login: async (pin: string): Promise<User> => {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    return handleResponse(res);
  },
  getEmployees: async (includeInactive: boolean = false): Promise<Employee[]> => {
    const res = await fetch(`${API_BASE}/employees?includeInactive=${includeInactive}`);
    return handleResponse(res);
  },
  createEmployee: async (formData: FormData): Promise<{ id: number }> => {
    const res = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },
  updateEmployee: async (id: number, formData: FormData): Promise<void> => {
    const res = await fetch(`${API_BASE}/employees/${id}`, {
      method: 'PUT',
      body: formData,
    });
    await handleResponse(res);
  },
  // Product API
  getProducts: async (): Promise<Product[]> => {
    const res = await fetch(`${API_BASE}/products`);
    return handleResponse(res);
  },
  createProduct: async (product: Partial<Product>): Promise<{ id: number }> => {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    return handleResponse(res);
  },
  updateProduct: async (id: number, product: Partial<Product>): Promise<void> => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    await handleResponse(res);
  },
  createAssignment: async (assignment: Partial<ProductionAssignment>): Promise<{ id: number }> => {
    const res = await fetch(`${API_BASE}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignment),
    });
    return handleResponse(res);
  },
  getEmployeeReport: async (): Promise<EmployeeReport[]> => {
    const res = await fetch(`${API_BASE}/reports/employees`);
    return handleResponse(res);
  },
  getClients: async (includeInactive: boolean = false): Promise<Client[]> => {
    const res = await fetch(`${API_BASE}/clients?includeInactive=${includeInactive}`);
    return handleResponse(res);
  },
  searchClients: async (q: string): Promise<Client[]> => {
    const res = await fetch(`${API_BASE}/clients/search?q=${q}`);
    return handleResponse(res);
  },
  createClient: async (client: Partial<Client>): Promise<{ id: number }> => {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    return handleResponse(res);
  },
  updateClient: async (id: number, client: Partial<Client>): Promise<void> => {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    await handleResponse(res);
  },
  getPayments: async (orderId: number): Promise<Payment[]> => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/payments`);
    return handleResponse(res);
  },
  addPayment: async (orderId: number, data: FormData | (Partial<Payment> & { user_name?: string })): Promise<void> => {
    const isFormData = data instanceof FormData;
    const res = await fetch(`${API_BASE}/orders/${orderId}/payments`, {
      method: 'POST',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? data : JSON.stringify(data),
    });
    await handleResponse(res);
  },
  uploadItemDesign: async (itemId: number, formData: FormData): Promise<{ path: string }> => {
    const res = await fetch(`${API_BASE}/items/${itemId}/design`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },
};
