
export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  type: string;
  status: 'new' | 'pending' | 'converted' | 'lost';
  created_at?: string;
  added_by?: string;
  added_by_id?: number;
  partner_id?: number;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  login?: string;
  status: 'active' | 'blocked' | 'inactive' | 'new';
  tariff_id?: number;
  balance?: number;
  street_1?: string;
  city?: string;
  created_at?: string;
  added_by?: string;
  added_by_id?: number;
  partner_id?: number;
}

export interface CustomerBilling {
  id: number;
  customer_id: number;
  balance: number;
  tariff_id: number;
}

export interface CustomerNote {
  id: number;
  customer_id: number;
  admin_id: number | string;
  admin_name?: string;
  note: string;
  date_created: string; // or created_at
}

export interface InventoryItem {
  id: number;
  description: string;
  mac_address?: string;
  serial_number?: string;
  customer_id?: number;
  status?: string;
  price?: number;
}

export interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  totalLeads: number;
  pendingLeads: number;
  conversionRate: string;
}

export interface ApiResponse<T> {
  data: T;
  isMock: boolean;
}

export interface AdminUser {
  id: number;
  admin_id?: number | string;
  name: string;
  username: string;
  Password?: string;
  created_at?: string;
}

export interface LeadComment {
  id: number;
  admin_id: number | string;
  admin_Name: string;
  lead_id: number;
  lead_name?: string;
  comment: string;
  date: string;
  template_id?: number;
}

export interface Template {
  id: number;
  Template: string;
}