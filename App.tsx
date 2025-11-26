
import React, { useState, useEffect, useMemo } from 'react';
import { SplynxService } from './services/splynxService';
import { supabase } from './services/supabaseClient';
import { Customer, Lead, DashboardStats, InventoryItem, AdminUser } from './types';
import { DashboardLayout } from './components/DashboardLayout';
import { StatsCards } from './components/StatsCards';
import { DataTable } from './components/DataTable';
import { ActivityChart } from './components/ActivityChart';
import { StatusPieChart } from './components/StatusPieChart';
import { TemplatePieChart } from './components/TemplatePieChart';
import { CustomerModal } from './components/CustomerModal';
import { LeadModal } from './components/LeadModal';
import { CustomerListModal } from './components/CustomerListModal';
import { AdminProfileModal } from './components/AdminProfileModal';
import { LoginPage } from './components/LoginPage';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Search, 
  RefreshCw,
} from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'leads'>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMockData, setIsMockData] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  // Filters
  const [customerStatusFilter, setCustomerStatusFilter] = useState<string>('all');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  
  // Track viewed items to handle "New" notifications
  const [viewedCustomerIds, setViewedCustomerIds] = useState<Set<number>>(new Set());
  const [viewedLeadIds, setViewedLeadIds] = useState<Set<number>>(new Set());
  
  // Modal States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAdminProfileOpen, setIsAdminProfileOpen] = useState(false);
  
  // Pie Chart Modal State
  const [statusListModal, setStatusListModal] = useState<{
    isOpen: boolean;
    title: string;
    customers: Customer[];
  }>({ isOpen: false, title: '', customers: [] });

  // Template Chart Stats
  const [leadTemplateStats, setLeadTemplateStats] = useState<{name: string, value: number}[]>([]);

  const fetchData = async (isAutoReload = false) => {
    if (!isAutoReload) setLoading(true);
    try {
      const [leadsData, customersData, billingData, inventoryData] = await Promise.all([
        SplynxService.getLeads(),
        SplynxService.getCustomers(),
        SplynxService.getCustomerBilling(),
        SplynxService.getInventoryItems()
      ]);

      setLeads(leadsData.data);
      setInventory(inventoryData.data);
      
      // Merge billing data into customers
      const mergedCustomers = customersData.data.map(customer => {
        // Find matching billing record by customer_id
        const billing = billingData.data.find(b => b.customer_id === customer.id);
        return {
          ...customer,
          balance: billing ? billing.balance : customer.balance,
          tariff_id: billing ? billing.tariff_id : customer.tariff_id
        };
      });
      setCustomers(mergedCustomers);

      setIsMockData(leadsData.isMock || customersData.isMock || inventoryData.isMock);
      setLastRefreshed(new Date());

      // Fetch comments for Lead Template Pie Chart
      const { data: commentsData, error: commentsError } = await supabase
        .from('Comments')
        .select('template_id, comment');
      
      if (!commentsError && commentsData) {
        const statsMap = new Map<string, { count: number, label: string }>();
        
        commentsData.forEach((c: any) => {
          const isOther = !c.template_id;
          const key = isOther ? 'other' : String(c.template_id);
          // Use comment as label, default to 'Other' or 'Template #ID' if comment missing
          let label = isOther ? 'Other' : (c.comment || `Template ${c.template_id}`);
          
          // Truncate label if too long for the chart
          if (label.length > 20) label = label.substring(0, 20) + '...';
  
          if (!statsMap.has(key)) {
            statsMap.set(key, { count: 0, label });
          }
          
          const entry = statsMap.get(key)!;
          entry.count++;
        });
        
        const chartData = Array.from(statsMap.values())
          .map(v => ({ name: v.label, value: v.count }))
          .sort((a, b) => b.value - a.value);
          
        setLeadTemplateStats(chartData);
      }
      
      if (!isAutoReload && isAuthenticated) {
        if (leadsData.isMock || customersData.isMock || inventoryData.isMock) {
          toast('Using simulation data (CORS blocked real API)', {
              icon: '⚠️',
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
              },
          });
        } else {
          toast.success('Data refreshed successfully');
        }
      }

    } catch (error) {
      console.error("Failed to fetch data", error);
      if (!isAutoReload && isAuthenticated) toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      
      // Auto reload every 5 minutes (300,000 ms)
      const intervalId = setInterval(() => {
        fetchData(true);
      }, 300000);

      return () => clearInterval(intervalId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Filter data based on "partner_id" = 4 requirement and Sort by ID Descending
  const apiCustomers = useMemo(() => {
    return customers
      .filter(c => c.partner_id === 4)
      .sort((a, b) => b.id - a.id);
  }, [customers]);

  const apiLeads = useMemo(() => {
    return leads
      .filter(l => l.partner_id === 4)
      .sort((a, b) => b.id - a.id);
  }, [leads]);

  // Calculate notification counts (Items that are status "new" AND haven't been viewed yet)
  const newCustomerCount = useMemo(() => {
    return apiCustomers.filter(c => (c.status || '').toLowerCase() === 'new' && !viewedCustomerIds.has(c.id)).length;
  }, [apiCustomers, viewedCustomerIds]);

  const newLeadCount = useMemo(() => {
    return apiLeads.filter(l => (l.status || '').toLowerCase() === 'new' && !viewedLeadIds.has(l.id)).length;
  }, [apiLeads, viewedLeadIds]);

  const stats: DashboardStats = useMemo(() => {
    const activeCustomers = apiCustomers.filter(c => (c.status || '').toLowerCase() === 'active').length;
    const pendingLeads = apiLeads.filter(l => {
      const s = (l.status || '').toLowerCase();
      return s === 'new' || s === 'pending';
    }).length;
    // Simulated revenue logic
    const totalRevenue = apiCustomers.reduce((acc, curr) => acc + (curr.balance || 0), 0);

    return {
      totalCustomers: apiCustomers.length,
      activeCustomers,
      totalLeads: apiLeads.length,
      pendingLeads,
      conversionRate: apiLeads.length > 0 ? ((apiCustomers.length / (apiCustomers.length + apiLeads.length)) * 100).toFixed(1) : '0',
    };
  }, [apiCustomers, apiLeads]);

  const filteredCustomers = useMemo(() => {
    return apiCustomers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = customerStatusFilter === 'all' || (c.status || '').toLowerCase() === customerStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [apiCustomers, searchTerm, customerStatusFilter]);

  const filteredLeads = useMemo(() => {
    return apiLeads.filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            l.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = leadStatusFilter === 'all' || (l.status || '').toLowerCase() === leadStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [apiLeads, searchTerm, leadStatusFilter]);

  // Get devices for selected customer
  const selectedCustomerDevices = useMemo(() => {
    if (!selectedCustomer) return [];
    return inventory.filter(item => item.customer_id === selectedCustomer.id);
  }, [selectedCustomer, inventory]);

  // Handle Pie Chart Slice Click
  const handlePieSliceClick = (status: 'active' | 'new' | 'blocked' | 'inactive') => {
    let filtered: Customer[] = [];
    if (status === 'inactive') {
      // Robustly handle inactive/disable/disabled
      filtered = apiCustomers.filter(c => ['inactive', 'disable', 'disabled'].includes((c.status || '').toLowerCase()));
    } else {
      filtered = apiCustomers.filter(c => (c.status || '').toLowerCase() === status);
    }
    
    setStatusListModal({
      isOpen: true,
      title: `${status === 'inactive' ? 'Disable' : status.charAt(0).toUpperCase() + status.slice(1)} Customers`,
      customers: filtered
    });
  };

  // Handle Stat Card Click
  const handleStatCardClick = (type: string) => {
    if (type === 'total_customers') {
      setCustomerStatusFilter('all');
      setActiveTab('customers');
    } else if (type === 'active_customers') {
      setCustomerStatusFilter('active');
      setActiveTab('customers');
    } else if (type === 'pending_leads') {
      setLeadStatusFilter('pending');
      setActiveTab('leads');
    }
  };

  // Mark items as viewed when clicked
  const handleCustomerClick = (customer: Customer) => {
    if ((customer.status || '').toLowerCase() === 'new' && !viewedCustomerIds.has(customer.id)) {
      const newSet = new Set(viewedCustomerIds);
      newSet.add(customer.id);
      setViewedCustomerIds(newSet);
    }
    setSelectedCustomer(customer);
  };

  const handleLeadClick = (lead: Lead) => {
    if ((lead.status || '').toLowerCase() === 'new' && !viewedLeadIds.has(lead.id)) {
      const newSet = new Set(viewedLeadIds);
      newSet.add(lead.id);
      setViewedLeadIds(newSet);
    }
    setSelectedLead(lead);
  };

  const handleLogin = async (username: string, password: string): Promise<void> => {
    const { data, error } = await supabase
      .from('Admin')
      .select('*')
      .eq('username', username)
      .eq('Password', password) // Validating against custom 'Admin' table with 'Password' column
      .single();

    if (error || !data) {
      throw new Error('Invalid username or password');
    }

    setCurrentAdmin(data);
    setIsAuthenticated(true);
    toast.success(`Welcome back, ${data.name}!`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentAdmin(null);
    setActiveTab('dashboard');
    toast.success('Logged out successfully');
  };

  const handleAdminUpdate = (updatedData: { username: string }) => {
    if (currentAdmin) {
      setCurrentAdmin({
        ...currentAdmin,
        username: updatedData.username
      });
    }
  };

  // Helper for case-insensitive status counting
  const countStatus = (data: any[], status: string) => 
    data.filter(item => (item.status || '').toLowerCase() === status).length;

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar & Layout Wrapper */}
      <DashboardLayout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        newCustomerCount={newCustomerCount}
        newLeadCount={newLeadCount}
        onLogout={handleLogout}
        userName={currentAdmin?.name || 'Admin'}
        onProfileClick={() => setIsAdminProfileOpen(true)}
      >
        
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              {activeTab === 'dashboard' ? 'Project 700 Dashboard Overview' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Overview`}
            </h1>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent w-64 transition-all"
                />
              </div>
              <button 
                onClick={() => fetchData()} 
                className="p-2 text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Stats Row */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">Key Metrics</h2>
                  <span className="text-xs text-gray-400">Last updated: {lastRefreshed.toLocaleTimeString()}</span>
                </div>
                <StatsCards stats={stats} onCardClick={handleStatCardClick} />
              </section>

              {/* Charts Grid */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pie Chart 1: Customer Status */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-md font-semibold text-gray-800 mb-6">Customer Status Distribution</h3>
                  <p className="text-xs text-gray-400 mb-4">Click slices to view details</p>
                  <StatusPieChart 
                    activeCount={countStatus(apiCustomers, 'active')}
                    newCount={countStatus(apiCustomers, 'new')}
                    blockedCount={countStatus(apiCustomers, 'blocked')}
                    // Robustly count "Disable" (inactive, disable, disabled)
                    inactiveCount={apiCustomers.filter(c => ['inactive', 'disable', 'disabled'].includes((c.status || '').toLowerCase())).length}
                    onSliceClick={handlePieSliceClick}
                  />
                </div>

                {/* Pie Chart 2: Lead Templates */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-md font-semibold text-gray-800 mb-6">Lead Comment Templates</h3>
                  <p className="text-xs text-gray-400 mb-4">Distribution by template type</p>
                  <TemplatePieChart data={leadTemplateStats} />
                </div>

                {/* Activity Charts */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-md font-semibold text-gray-800 mb-6">Customer Acquisition Trend</h3>
                  <ActivityChart data={apiCustomers} type="customers" />
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-md font-semibold text-gray-800 mb-6">Lead Generation Trend</h3>
                  <ActivityChart data={apiLeads} type="leads" />
                </div>
              </section>

              {/* Recent lists previews */}
              <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                 {/* Recent Customers */}
                 <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800">Recent Customers</h3>
                      <button onClick={() => setActiveTab('customers')} className="text-sm text-pink-600 hover:text-pink-700 font-medium">View All</button>
                    </div>
                    <DataTable 
                      data={apiCustomers.slice(0, 5)} 
                      columns={[
                        { key: 'name', label: 'Name' },
                        { key: 'email', label: 'Email' },
                        { key: 'status', label: 'Status' },
                        { key: 'balance', label: 'Balance' }
                      ]}
                      type="customer"
                      onRowClick={handleCustomerClick}
                      highlightRow={(row) => (row.status || '').toLowerCase() === 'new' && !viewedCustomerIds.has(row.id)}
                    />
                 </div>

                 {/* Recent Leads */}
                 <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800">Recent Leads</h3>
                      <button onClick={() => setActiveTab('leads')} className="text-sm text-pink-600 hover:text-pink-700 font-medium">View All</button>
                    </div>
                    <DataTable 
                      data={apiLeads.slice(0, 5)} 
                      columns={[
                        { key: 'name', label: 'Name' },
                        { key: 'email', label: 'Email' },
                        { key: 'status', label: 'Status' },
                        { key: 'type', label: 'Type' }
                      ]}
                      type="lead"
                      onRowClick={handleLeadClick}
                      highlightRow={(row) => (row.status || '').toLowerCase() === 'new' && !viewedLeadIds.has(row.id)}
                    />
                 </div>
              </section>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">All Customers</h2>
                  <p className="text-sm text-gray-500 mt-1">Filtering by Partner ID: 4</p>
                </div>
                <div className="flex gap-2 items-center">
                   <select 
                    value={customerStatusFilter} 
                    onChange={(e) => setCustomerStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="new">New</option>
                    <option value="blocked">Blocked</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <button className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">Export</button>
                </div>
              </div>
              <DataTable 
                data={filteredCustomers} 
                columns={[
                  { key: 'id', label: 'ID' },
                  { key: 'name', label: 'Name' },
                  { key: 'status', label: 'Status' }
                ]}
                type="customer"
                onRowClick={handleCustomerClick}
                highlightRow={(row) => (row.status || '').toLowerCase() === 'new' && !viewedCustomerIds.has(row.id)}
              />
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">All Leads</h2>
                  <p className="text-sm text-gray-500 mt-1">Filtering by Partner ID: 4</p>
                </div>
                <div className="flex gap-2 items-center">
                   <select 
                    value={leadStatusFilter} 
                    onChange={(e) => setLeadStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="new">New</option>
                    <option value="pending">Pending</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>
              <DataTable 
                data={filteredLeads} 
                columns={[
                  { key: 'id', label: 'ID' },
                  { key: 'name', label: 'Name' },
                  { key: 'phone', label: 'Phone' }
                ]}
                type="lead"
                onRowClick={handleLeadClick}
                highlightRow={(row) => (row.status || '').toLowerCase() === 'new' && !viewedLeadIds.has(row.id)}
              />
            </div>
          )}
        </main>
      </DashboardLayout>

      <CustomerModal 
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
        devices={selectedCustomerDevices}
        currentUser={currentAdmin}
      />

      <LeadModal 
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        currentUser={currentAdmin}
      />

      <CustomerListModal
        isOpen={statusListModal.isOpen}
        onClose={() => setStatusListModal({ ...statusListModal, isOpen: false })}
        title={statusListModal.title}
        customers={statusListModal.customers}
        onCustomerClick={handleCustomerClick}
      />

      <AdminProfileModal
        isOpen={isAdminProfileOpen}
        onClose={() => setIsAdminProfileOpen(false)}
        admin={currentAdmin ? {
          id: currentAdmin.id,
          admin_id: currentAdmin.admin_id || currentAdmin.id || 'N/A',
          name: currentAdmin.name,
          username: currentAdmin.username
        } : { admin_id: 0, name: 'Guest', username: 'guest' }}
        onAdminUpdate={handleAdminUpdate}
      />

      <Toaster position="bottom-right" />
    </div>
  );
};

export default App;
