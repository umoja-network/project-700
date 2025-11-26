
import { API_CONFIG } from '../constants';
import { Customer, Lead, InventoryItem, CustomerBilling, CustomerNote, ApiResponse } from '../types';

// Mock Data Generators for fallback
const generateMockLeads = (count: number): Lead[] => {
  const statuses: Lead['status'][] = ['new', 'pending', 'converted', 'lost'];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1000,
    name: `Lead Prospect ${i + 1}`,
    email: `prospect${i + 1}@example.com`,
    phone: `+1-555-01${String(i).padStart(2, '0')}`,
    address: `${i * 12} Market St, Business City`,
    type: 'residential',
    status: statuses[Math.floor(Math.random() * statuses.length)],
    created_at: new Date().toISOString(),
    added_by: 'api',
    added_by_id: Math.random() > 0.2 ? 10 : 5, // 80% ID 10, 20% ID 5
    partner_id: Math.random() > 0.3 ? 4 : 1 // 70% Partner 4, 30% Partner 1
  }));
};

const generateMockCustomers = (count: number): Customer[] => {
  // Added 'new' to the available statuses
  const statuses: Customer['status'][] = ['active', 'blocked', 'inactive', 'new'];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 5000, // Matches MockBilling IDs
    name: `Customer Entity ${i + 1}`,
    email: `customer${i + 1}@client.net`,
    phone: `+1-555-99${String(i).padStart(2, '0')}`,
    login: `cust_${i + 1}`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    tariff_id: 1, // Default, will be updated by billing
    balance: 0, // Default, will be updated by billing
    street_1: `${i * 45} Park Avenue`,
    city: 'Metropolis',
    created_at: new Date().toISOString(),
    added_by: 'api',
    added_by_id: Math.random() > 0.2 ? 10 : 5, // 80% ID 10, 20% ID 5
    partner_id: Math.random() > 0.3 ? 4 : 1 // 70% Partner 4, 30% Partner 1
  }));
};

const generateMockBilling = (count: number): CustomerBilling[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 100,
    customer_id: i + 5000, // Matches MockCustomer IDs
    balance: parseFloat((Math.random() * 200 - 50).toFixed(2)),
    tariff_id: Math.floor(Math.random() * 5) + 1
  }));
};

const generateMockInventory = (count: number, customerIds: number[]): InventoryItem[] => {
  return Array.from({ length: count }, (_, i) => {
    // Randomly assign some items to customers, others unassigned
    const assignToCustomer = Math.random() > 0.3; 
    const customerId = assignToCustomer ? customerIds[Math.floor(Math.random() * customerIds.length)] : undefined;
    
    return {
      id: i + 9000,
      description: `Router Model X-${i}`,
      mac_address: `00:1A:2B:3C:4D:${String(i).padStart(2, '0')}`,
      serial_number: `SN${Date.now()}${i}`,
      customer_id: customerId,
      status: customerId ? 'used' : 'in_stock',
      price: 150.00
    };
  });
};

const generateMockNotes = (customerId: number): CustomerNote[] => {
  // Generate 0-5 random notes for a customer
  const count = Math.floor(Math.random() * 6);
  return Array.from({ length: count }, (_, i) => ({
    id: i + 10000 + customerId,
    customer_id: customerId,
    admin_id: 1,
    admin_name: 'Super Admin',
    note: `Automated system note: Check connection status on ${new Date(Date.now() - i * 86400000).toLocaleDateString()}`,
    date_created: new Date(Date.now() - i * 100000000).toISOString()
  }));
};

export const SplynxService = {
  async getLeads(): Promise<ApiResponse<Lead[]>> {
    try {
      const response = await fetch(API_CONFIG.LEADS_URL, {
        method: 'GET',
        headers: API_CONFIG.HEADERS
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      return { data: list, isMock: false };

    } catch (error) {
      console.warn('Fetching Leads failed (likely CORS). Falling back to mock data.', error);
      return { 
        data: generateMockLeads(15), 
        isMock: true 
      };
    }
  },

  async getCustomers(): Promise<ApiResponse<Customer[]>> {
    try {
      const response = await fetch(API_CONFIG.CUSTOMERS_URL, {
        method: 'GET',
        headers: API_CONFIG.HEADERS
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      return { data: list, isMock: false };

    } catch (error) {
      console.warn('Fetching Customers failed (likely CORS). Falling back to mock data.', error);
      return { 
        data: generateMockCustomers(25), 
        isMock: true 
      };
    }
  },

  async getCustomerBilling(): Promise<ApiResponse<CustomerBilling[]>> {
    try {
      const response = await fetch(API_CONFIG.CUSTOMER_BILLING_URL, {
        method: 'GET',
        headers: API_CONFIG.HEADERS
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      return { data: list, isMock: false };

    } catch (error) {
      console.warn('Fetching Customer Billing failed (likely CORS). Falling back to mock data.', error);
      return { 
        data: generateMockBilling(25), 
        isMock: true 
      };
    }
  },

  async getCustomerNotes(customerId: number): Promise<ApiResponse<CustomerNote[]>> {
    try {
      const response = await fetch(API_CONFIG.CUSTOMER_NOTES_URL, {
        method: 'GET',
        headers: API_CONFIG.HEADERS
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const rawList = Array.isArray(data) ? data : (data.data || []);
      
      // Map specific API keys to our interface with robust fallbacks
      let list: CustomerNote[] = rawList.map((item: any) => ({
        id: item.id || Math.random(), // Fallback ID if missing
        customer_id: item['/customer_id'] || item.customer_id || customerId, 
        admin_id: item['/administrator_id'] || item.admin_id || item.administrator_id, 
        // Try various keys for comment/note
        note: item['/comment'] || item.comment || item.note || '', 
        // Try various keys for date
        date_created: item['/datetime'] || item.datetime || item.date_created || item.date || new Date().toISOString(), 
        // Map name from API if available (as seen in posted data), fallback to admin_name or undefined
        admin_name: item.name || item.admin_name 
      }));
      
      // Filter for the specific customer
      list = list.filter(note => String(note.customer_id) === String(customerId));
      
      return { data: list, isMock: false };

    } catch (error) {
      console.warn('Fetching Customer Notes failed (likely CORS). Falling back to mock data.', error);
      return { 
        data: generateMockNotes(customerId), 
        isMock: true 
      };
    }
  },

  async addCustomerNote(noteData: any): Promise<boolean> {
    try {
      const response = await fetch(API_CONFIG.CUSTOMER_NOTES_URL, {
        method: 'POST',
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify(noteData)
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      return true;
    } catch (error) {
       console.warn('Adding Customer Note failed (likely CORS). Simulating success.', error);
       return true; // Simulate success for demo
    }
  },

  async getInventoryItems(): Promise<ApiResponse<InventoryItem[]>> {
    try {
      const response = await fetch(API_CONFIG.INVENTORY_URL, {
        method: 'GET',
        headers: API_CONFIG.HEADERS
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      return { data: list, isMock: false };
    } catch (error) {
      console.warn('Fetching Inventory failed (likely CORS). Falling back to mock data.', error);
      // We need customer IDs to link mocks. We'll generate a consistent set if we were stateful, 
      // but here we'll just assume standard mock IDs 5000-5024 exist.
      const mockCustomerIds = Array.from({ length: 25 }, (_, i) => i + 5000);
      return {
        data: generateMockInventory(40, mockCustomerIds),
        isMock: true
      };
    }
  }
};
