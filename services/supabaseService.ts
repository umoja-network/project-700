
import { supabase } from './supabaseClient';
import { AdminUser, Customer, Lead, LeadComment } from '../types';

export const SupabaseService = {
  // Auth Methods
  async authenticateAdmin(username: string, password: string): Promise<AdminUser | null> {
    try {
      // Using maybeSingle() to prevent errors if 0 rows returned
      // Note: Querying 'Password' column (Capital P) as requested
      const { data, error } = await supabase
        .from('Admin')
        .select('admin_id, name, username, Password')
        .eq('username', username)
        .eq('Password', password)
        .maybeSingle();

      if (error) {
        console.error('Supabase Auth Error:', error.message || error);
        return null;
      }

      if (!data) return null;

      return {
        id: typeof data.admin_id === 'number' ? data.admin_id : parseInt(data.admin_id as string, 10) || 0,
        admin_id: data.admin_id,
        name: data.name,
        username: data.username,
        role: 'admin'
      };
    } catch (err: any) {
      console.error('Supabase Auth Exception:', err.message || err);
      return null;
    }
  },

  async updateAdmin(adminId: number | string, updates: Partial<AdminUser>): Promise<boolean> {
    const payload: any = {};
    if (updates.username) payload.username = updates.username;
    // Map internal password field to the DB column 'Password'
    if (updates.password) payload.Password = updates.password;

    const { error } = await supabase
      .from('Admin')
      .update(payload)
      .eq('admin_id', adminId);

    if (error) {
        console.error('Supabase Update Error:', error.message || error);
        throw error;
    }
    return true;
  },

  // Customer/Lead Read Status Methods
  async getReadStatus(table: 'Customers' | 'Leads') {
    const { data, error } = await supabase
      .from(table)
      .select(table === 'Customers' ? 'customer_id' : 'lead_id')
      .eq('read', true);
    
    if (error) {
      console.error(`Error fetching read status for ${table}:`, error.message || error);
      return new Set<number>();
    }

    const idKey = table === 'Customers' ? 'customer_id' : 'lead_id';
    return new Set<number>(data?.map((item: any) => Number(item[idKey])) || []);
  },

  async markCustomerAsRead(customer: Customer) {
    if (!customer || !customer.id) return;

     const { error } = await supabase
      .from('Customers')
      .upsert({ 
        customer_id: Number(customer.id), 
        customer_name: customer.name || 'Unknown',
        read: true 
      }); // Relies on customer_id being the Primary Key

    if (error) console.error('Error marking customer as read:', error.message || error);
  },

  async markLeadAsRead(lead: Lead) {
    if (!lead || !lead.id) return;

    const { error } = await supabase
      .from('Leads')
      .upsert({ 
        lead_id: Number(lead.id), 
        lead_name: lead.name || 'Unknown',
        read: true 
      }); // Relies on lead_id being the Primary Key

    if (error) console.error('Error marking lead as read:', error.message || JSON.stringify(error, null, 2));
  },
  
  async markAllCustomersAsRead(ids: number[], allCustomers: Customer[]) {
    if (ids.length === 0) return;
    
    const upsertData = ids.map(id => {
      const c = allCustomers.find(cust => cust.id === id);
      return {
        customer_id: id,
        customer_name: c?.name || 'Unknown',
        read: true
      };
    });

    const { error } = await supabase
      .from('Customers')
      .upsert(upsertData);

    if (error) console.error('Error marking all customers as read:', error.message || error);
  },

  async markAllLeadsAsRead(ids: number[], allLeads: Lead[]) {
    if (ids.length === 0) return;

    const upsertData = ids.map(id => {
      const l = allLeads.find(lead => lead.id === id);
      return {
        lead_id: id,
        lead_name: l?.name || 'Unknown',
        read: true
      };
    });

    const { error } = await supabase
      .from('Leads')
      .upsert(upsertData);
      
    if (error) console.error('Error marking all leads as read:', error.message || error);
  },

  // Comments Methods
  async getLeadComments(leadId: number): Promise<LeadComment[]> {
    const { data, error } = await supabase
      .from('Comments')
      .select('*')
      .eq('lead_id', leadId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error.message || error);
      return [];
    }
    return data as LeadComment[];
  },

  async addLeadComment(comment: Partial<LeadComment>): Promise<boolean> {
     const { error } = await supabase
       .from('Comments')
       .insert([{
         admin_id: comment.admin_id,
         lead_id: comment.lead_id,
         lead_name: comment.lead_name || '',
         comment: comment.comment,
         date: comment.date,
         admin_Name: comment.admin_Name
       }]);

     if (error) {
        console.error('Error adding comment:', error.message || error);
        return false;
     }
     return true;
  }
};
