import React, { useState, useEffect, useMemo } from 'react';
import { SplynxService } from './services/splynxService';
import { GoogleSheetsService } from './services/googleSheetsService';
import { SupabaseService } from './services/supabaseService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { Customer, Lead, DashboardStats, InventoryItem, AdminUser, LeadComment, Delivery } from './types';
import { DashboardLayout } from './components/DashboardLayout';
import { StatsCards } from './components/StatsCards';
import { DataTable } from './components/DataTable';
import { ActivityChart } from './components/ActivityChart';
import { StatusPieChart } from './components/StatusPieChart';
import { TemplatePieChart } from './components/TemplatePieChart';
import { LocationPieChart } from './components/LocationPieChart';
import { CustomerModal } from './components/CustomerModal';
import { LeadModal } from './components/LeadModal';
import { CustomerListModal } from './components/CustomerListModal';
import { LeadListModal } from './components/LeadListModal';
import { AdminProfileModal } from './components/AdminProfileModal';
import { DeliveryModal } from './components/DeliveryModal';
import { LoginPage } from './components/LoginPage';
import { Toaster, toast } from 'react-hot-toast';
import { GOOGLE_SHEETS_CONFIG } from './constants';
import { 
  Search, 
  RefreshCw,
  CheckCheck,
} from 'lucide-react';

// Helper to determine location based on GPS
const getCustomerLocation = (c: Customer): string => {
  if (c.gps) {
    const parts = c.gps.split(',').map(p => parseFloat(p.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const lat = parts[0];
      const lon = parts[1];

      // Rough Geofencing based on Latitude
      // Limpopo: Lat roughly -22.0 to -25.3
      if (lat >= -25.3 && lat <= -22.0) {
        return 'Limpopo';
      } 
      // Gauteng: Lat roughly -25.3 to -28.0, Lon 27.0 to 29.5
      else if (lat < -25.3 && lat >= -28.0 && lon >= 27.0 && lon <= 29.5) {
        return 'Gauteng';
      }
    }
  } 
  return 'Other';
};

// Helper to determine status for filtering
const getStatus = (item: any, type: 'customers' | 'leads'): string => {
  const rawStatus = (item.status || 'New').toLowerCase();
  
  if (type === 'customers') {
    if (rawStatus === 'active') return 'Active';
    if (rawStatus === 'new') return 'New';
    if (rawStatus === 'blocked') return 'Blocked';
    if (['inactive', 'disable', 'disabled'].includes(rawStatus)) return 'Inactive';
    return 'Inactive';
  } else {
    // Leads
    if (rawStatus === 'new') return 'New';
    if (['in progress', 'qualification', 'activation', 'pending'].includes(rawStatus)) return 'In Progress';
    if (rawStatus === 'won') return 'Won';
    if (rawStatus === 'lost') return 'Lost';
    return 'In Progress';
  }
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'leads' | 'deliveries'>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
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
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [isAdminProfileOpen, setIsAdminProfileOpen] = useState(false);
  
  // Pie Chart Modal State
  const [statusListModal, setStatusListModal] = useState<{
    isOpen: boolean;
    title: string;
    customers: Customer[];
  }>({ isOpen: false, title: '', customers: [] });

  const [leadListModal, setLeadListModal] = useState<{
    isOpen: boolean;
    title: string;
    leads: Lead[];
  }>({ isOpen: false, title: '', leads: [] });

  // Template Chart Stats
  const [leadTemplateStats, setLeadTemplateStats] = useState<{name: string, value: number, templateKey: string}[]>([]);
  const [allComments, setAllComments] = useState<LeadComment[]>([]);

  // Check for stored session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('umoja_user') || sessionStorage.getItem('umoja_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentAdmin(user);
        setIsAuthenticated(true);
      } catch (e) {
        console.error('Failed to parse stored session');
        localStorage.removeItem('umoja_user');
        sessionStorage.removeItem('umoja_user');
      }
    }
  }, []);

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

      // Fetch Read Statuses from Supabase
      try {
        if (isSupabaseConfigured) {
          const [readCustIds, readLdIds] = await Promise.all([
            SupabaseService.getReadStatus('Customers'),
            SupabaseService.getReadStatus('Leads')
          ]);
          setViewedCustomerIds(readCustIds);
          setViewedLeadIds(readLdIds);
        }
      } catch (err) {
        console.warn('Failed to fetch read status from Supabase', err);
      }

      // Pre-calculate valid lead IDs for Project 700 (partner_id = 4)
      const validProject700LeadIds = new Set(
        leadsData.data
          .filter((l: any) => l.partner_id === 4)
          .map((l: any) => l.id)
      );

      // Fetch Deliveries
      try {
        const deliveriesData = await GoogleSheetsService.fetchSheet<Delivery>('Deliverd_Devices', GOOGLE_SHEETS_CONFIG.DELIVERY_SPREADSHEET_ID);
        setDeliveries(deliveriesData);
      } catch (err) {
        console.warn('Failed to fetch delivery data', err);
      }

      // Fetch comments for Lead Template Pie Chart (Google Sheets)
      try {
        const commentsData = await GoogleSheetsService.fetchSheet<LeadComment>('Comments');
        
        if (commentsData) {
          setAllComments(commentsData);
          // Use a Map to track unique Lead IDs per template
          const statsMap = new Map<string, { leadIds: Set<number>, label: string, key: string }>();
          
          commentsData.forEach((c) => {
            const leadId = Number(c.lead_id);
            // Only count if lead belongs to Project 700 (partner_id === 4)
            if (!validProject700LeadIds.has(leadId)) return;

            const isOther = !c.template_id;
            const key = isOther ? 'other' : String(c.template_id);
            // Use comment as label, default to 'Other' or 'Template #ID' if comment missing
            let label = isOther ? 'Other' : (c.comment || `Template ${c.template_id}`);
            
            // Truncate label if too long for the chart
            if (label && label.length > 20) label = label.substring(0, 20) + '...';
    
            if (!statsMap.has(key)) {
              statsMap.set(key, { leadIds: new Set<number>(), label: label || 'Unknown', key });
            }
            
            const entry = statsMap.get(key)!;
            entry.leadIds.add(leadId);
          });
          
          const chartData = Array.from(statsMap.values())
            .map(v => ({ 
                name: v.label, 
                value: v.leadIds.size, // Count unique leads
                templateKey: v.key 
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
            
          setLeadTemplateStats(chartData);
        }
      } catch (err) {
        console.warn("Failed to fetch comments for stats", err);
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

  // Calculate location stats (Gauteng vs Limpopo) based on GPS
  const locationStats = useMemo(() => {
    const stats: Record<string, number> = { Gauteng: 0, Limpopo: 0, Other: 0 };

    apiCustomers.forEach(c => {
      const location = getCustomerLocation(c);
      if (stats[location] !== undefined) {
        stats[location]++;
      } else {
        stats['Other']++;
      }
    });

    return [
      { name: 'Gauteng', value: stats.Gauteng, color: '#8b5cf6' }, // Violet-500
      { name: 'Limpopo', value: stats.Limpopo, color: '#ec4899' }, // Pink-500
      { name: 'Other', value: stats.Other, color: '#9ca3af' }      // Gray-400
    ].filter(i => i.value > 0);
  }, [apiCustomers]);

  // Calculate notification counts (Items that are status "new" AND haven't been viewed yet)
  const newCustomerCount = useMemo(() => {
    return apiCustomers.filter(c => (c.status || '').toLowerCase() === 'new' && !viewedCustomerIds.has(c.id)).length;
  }, [apiCustomers, viewedCustomerIds]);

  const newLeadCount = useMemo(() => {
    return apiLeads.filter(l => (l.status || '').toLowerCase() === 'new' && !viewedLeadIds.has(l.id)).length;
  }, [apiLeads, viewedLeadIds]);

  const stats: DashboardStats = useMemo(() => {
    const activeCustomers = apiCustomers.filter(c => (c.status || '').toLowerCase() === 'active').length;
    
    // Calculate new and lost leads separately
    const newLeads = apiLeads.filter(l => (l.status || '').toLowerCase() === 'new').length;
    const lostLeads = apiLeads.filter(l => (l.status || '').toLowerCase() === 'lost').length;
    
    // Calculate pending installations: Active customers with no assigned devices
    const pendingInstallations = apiCustomers.filter(c => {
       const isActive = (c.status || '').toLowerCase() === 'active';
       const hasDevices = inventory.some(i => i.customer_id === c.id);
       return isActive && !hasDevices;
    }).length;

    // Calculate Collections: Disabled status with no assigned devices
    const collectionsCount = apiCustomers.filter(c => {
      const isStatusDisabled = ['inactive', 'disable', 'disabled'].includes((c.status || '').toLowerCase());
      const hasDevices = inventory.some(i => i.customer_id === c.id);
      return isStatusDisabled && !hasDevices;
    }).length;

    return {
      totalCustomers: apiCustomers.length,
      activeCustomers,
      totalLeads: apiLeads.length,
      newLeads,
      lostLeads,
      pendingInstallations,
      collectionsCount,
      conversionRate: apiLeads.length > 0 ? ((apiCustomers.length / (apiCustomers.length + apiLeads.length)) * 100).toFixed(1) : '0',
    };
  }, [apiCustomers, apiLeads, inventory]);

  const filteredCustomers = useMemo(() => {
    return apiCustomers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = false;
      if (customerStatusFilter === 'all') {
        matchesStatus = true;
      } else if (customerStatusFilter === 'pending_installations') {
        // Special filter for Pending Installations
        const isActive = (c.status || '').toLowerCase() === 'active';
        const hasDevices = inventory.some(i => i.customer_id === c.id);
        matchesStatus = isActive && !hasDevices;
      } else if (customerStatusFilter === 'collections') {
        // Special filter for Collections (Disabled w/o devices)
        const isStatusDisabled = ['inactive', 'disable', 'disabled'].includes((c.status || '').toLowerCase());
        const hasDevices = inventory.some(i => i.customer_id === c.id);
        matchesStatus = isStatusDisabled && !hasDevices;
      } else {
        matchesStatus = (c.status || '').toLowerCase() === customerStatusFilter.toLowerCase();
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [apiCustomers, searchTerm, customerStatusFilter, inventory]);

  const filteredLeads = useMemo(() => {
    return apiLeads.filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            l.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = leadStatusFilter === 'all' || (l.status || '').toLowerCase() === leadStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [apiLeads, searchTerm, leadStatusFilter]);

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
       const searchLower = searchTerm.toLowerCase();
       return (
         (d.Name && String(d.Name).toLowerCase().includes(searchLower)) ||
         (d['Customer ID'] && String(d['Customer ID']).toLowerCase().includes(searchLower)) ||
         (d['Router Barcode'] && String(d['Router Barcode']).toLowerCase().includes(searchLower))
       );
    });
  }, [deliveries, searchTerm]);

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

  const handleLocationClick = (locationName: string) => {
    const filtered = apiCustomers.filter(c => getCustomerLocation(c) === locationName);
    setStatusListModal({
      isOpen: true,
      title: `Customers in ${locationName}`,
      customers: filtered
    });
  };

  const handleTemplateSliceClick = (data: { name: string, value: number, templateKey: string }) => {
     const { templateKey, name } = data;
     
     // Filter comments based on key
     const relevantComments = allComments.filter(c => {
        if (templateKey === 'other') {
           return !c.template_id;
        }
        return String(c.template_id) === templateKey;
     });
     
     // Get unique lead IDs
     const leadIds = new Set(relevantComments.map(c => Number(c.lead_id)));
     
     // Filter leads using apiLeads (which is already filtered by partner_id=4)
     // This ensures we only show valid leads for this project
     const relevantLeads = apiLeads.filter(l => leadIds.has(l.id));
     
     setLeadListModal({
        isOpen: true,
        title: `Leads: ${name}`,
        leads: relevantLeads
     });
  };

  // Factory for Bar Chart Click Handler (Enhanced for multidimensional filtering)
  const createBarClickHandler = (sourceData: any[], type: 'customers' | 'leads', titlePrefix: string) => {
    return (data: { month: string; location: string; status?: string }) => {
        const { month, location, status } = data;
        const [monthName, yearStr] = month.split(' ');
        const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
        const year = parseInt(yearStr);
        
        const filtered = sourceData.filter(item => {
            // Prioritize date_add, fallback to created_at
            const dateStr = item.date_add || item.created_at;
            if (!dateStr) return false;
            
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return false;

            // Check month/year match
            if (d.getMonth() !== monthIndex || d.getFullYear() !== year) return false;
            
            // Check location match
            if (getCustomerLocation(item) !== location) return false;

            // Check status match only if specified and not "All"
            if (status && status !== 'All' && getStatus(item, type) !== status) return false;
            
            return true;
        });

        const displayStatus = (!status || status === 'All') ? 'All' : status;
        
        if (type === 'customers') {
            setStatusListModal({
                isOpen: true,
                title: `${titlePrefix}: ${displayStatus} in ${location} (${month})`,
                customers: filtered as Customer[]
            });
        } else {
             setLeadListModal({
                isOpen: true,
                title: `${titlePrefix}: ${displayStatus} in ${location} (${month})`,
                leads: filtered as Lead[]
            });
        }
    }
  };

  // Handle Stat Card Click
  const handleStatCardClick = (type: string) => {
    if (type === 'total_customers') {
      setCustomerStatusFilter('all');
      setActiveTab('customers');
    } else if (type === 'active_customers') {
      setCustomerStatusFilter('active');
      setActiveTab('customers');
    } else if (type === 'new_leads') {
      setLeadStatusFilter('New');
      setActiveTab('leads');
    } else if (type === 'lost_leads') {
      setLeadStatusFilter('Lost');
      setActiveTab('leads');
    } else if (type === 'pending_installations') {
      setCustomerStatusFilter('pending_installations');
      setActiveTab('customers');
    } else if (type === 'collections') {
      setCustomerStatusFilter('collections');
      setActiveTab('customers');
    }
  };

  // Mark items as viewed when clicked
  const handleCustomerClick = (customer: Customer) => {
    if ((customer.status || '').toLowerCase() === 'new' && !viewedCustomerIds.has(customer.id)) {
      const newSet = new Set(viewedCustomerIds);
      newSet.add(customer.id);
      setViewedCustomerIds(newSet);
      
      // Update in Supabase
      if (isSupabaseConfigured) {
        SupabaseService.markCustomerAsRead(customer);
      }
    }
    setSelectedCustomer(customer);
  };

  const handleLeadClick = (lead: Lead) => {
    if ((lead.status || '').toLowerCase() === 'new' && !viewedLeadIds.has(lead.id)) {
      const newSet = new Set(viewedLeadIds);
      newSet.add(lead.id);
      setViewedLeadIds(newSet);
      
      // Update in Supabase
      if (isSupabaseConfigured) {
        SupabaseService.markLeadAsRead(lead);
      }
    }
    setSelectedLead(lead);
  };

  const handleDeliveryClick = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
  };

  // Mark All As Viewed Handlers
  const handleMarkAllCustomersViewed = () => {
    const newIds = new Set(viewedCustomerIds);
    const idsToSync: number[] = [];
    
    let count = 0;
    apiCustomers.forEach(c => {
      if ((c.status || '').toLowerCase() === 'new' && !newIds.has(c.id)) {
        newIds.add(c.id);
        idsToSync.push(c.id);
        count++;
      }
    });
    
    if (count > 0) {
      setViewedCustomerIds(newIds);
      if (isSupabaseConfigured) {
        SupabaseService.markAllCustomersAsRead(idsToSync, apiCustomers);
      }
      toast.success(`Marked ${count} customers as open`);
    } else {
      toast('No new customers to mark', { icon: 'ℹ️' });
    }
  };

  const handleMarkAllLeadsViewed = () => {
    const newIds = new Set(viewedLeadIds);
    const idsToSync: number[] = [];
    
    let count = 0;
    apiLeads.forEach(l => {
      if ((l.status || '').toLowerCase() === 'new' && !newIds.has(l.id)) {
        newIds.add(l.id);
        idsToSync.push(l.id);
        count++;
      }
    });
    
    if (count > 0) {
      setViewedLeadIds(newIds);
      if (isSupabaseConfigured) {
        SupabaseService.markAllLeadsAsRead(idsToSync, apiLeads);
      }
      toast.success(`Marked ${count} leads as open`);
    } else {
      toast('No new leads to mark', { icon: 'ℹ️' });
    }
  };

  const handleLogin = async (username: string, password: string, rememberMe: boolean): Promise<void> => {
    let userToAuth: AdminUser | null = null;

    // General Login (View Only)
    if (username === 'Admin' && password === 'admin') {
      userToAuth = {
        id: 0,
        admin_id: 0,
        name: 'General',
        username: 'Admin',
        role: 'viewer'
      };
    } else {
        // Supabase Login
        try {
            if (!isSupabaseConfigured) {
                throw new Error('Database connection not configured. Please use Admin/admin or set API keys.');
            }
            console.log("Checking Supabase for Admin...");
            const adminUser = await SupabaseService.authenticateAdmin(username, password);
            if (adminUser) {
                userToAuth = adminUser;
            }
        } catch (e: any) {
            console.error("Supabase Auth check failed", e);
             if (e.message.includes("Database connection not configured")) {
                 throw e;
             }
        }
    }

    if (userToAuth) {
        // Remove sensitive data before storing
        const safeUser = { ...userToAuth };
        delete safeUser.Password; 
        delete safeUser.password;

        setCurrentAdmin(safeUser);
        setIsAuthenticated(true);
        toast.success(`Welcome back, ${safeUser.name}!`);

        // Store Session
        if (rememberMe) {
            localStorage.setItem('umoja_user', JSON.stringify(safeUser));
            // Ensure session storage is clear so we don't have conflicting states if logic changes
            sessionStorage.removeItem('umoja_user');
        } else {
            sessionStorage.setItem('umoja_user', JSON.stringify(safeUser));
            localStorage.removeItem('umoja_user');
        }
        return;
    }

    throw new Error('Invalid username or password');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentAdmin(null);
    setActiveTab('dashboard');
    
    // Clear Session
    localStorage.removeItem('umoja_user');
    sessionStorage.removeItem('umoja_user');

    toast.success('Logged out successfully');
  };

  const handleAdminUpdate = (updatedData: { username: string }) => {
    if (currentAdmin) {
      const updated = {
        ...currentAdmin,
        username: updatedData.username
      };
      setCurrentAdmin(updated);
      
      // Update storage if it exists to keep session valid with new name
      if (localStorage.getItem('umoja_user')) {
          localStorage.setItem('umoja_user', JSON.stringify(updated));
      }
      if (sessionStorage.getItem('umoja_user')) {
          sessionStorage.setItem('umoja_user', JSON.stringify(updated));
      }
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

  const isReadOnly = currentAdmin?.role === 'viewer';

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
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pie Chart 1: Customer Status */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-md font-semibold text-gray-800 mb-6">Customer Status</h3>
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
                
                {/* Pie Chart 2: Customer Location */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-md font-semibold text-gray-800 mb-6">Customer Location</h3>
                  <p className="text-xs text-gray-400 mb-4">Distribution by Province (GPS)</p>
                  <LocationPieChart 
                    data={locationStats} 
                    onSliceClick={handleLocationClick}
                  />
                </div>

                {/* Pie Chart 3: Lead Templates */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-md font-semibold text-gray-800 mb-6">Lead Comments</h3>
                  <p className="text-xs text-gray-400 mb-4">Distribution by template (Click to view leads)</p>
                  <TemplatePieChart 
                    data={leadTemplateStats} 
                    onSliceClick={handleTemplateSliceClick} 
                  />
                </div>
              </section>
              
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Activity Charts */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-md font-semibold text-gray-800 mb-6">Customer Trend</h3>
                  <ActivityChart 
                    data={apiCustomers} 
                    type="customers" 
                    onBarClick={createBarClickHandler(apiCustomers, 'customers', 'Customers')}
                  />
                </div>
                
                 <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-md font-semibold text-gray-800 mb-6">Lead Generation Trend</h3>
                  <ActivityChart 
                    data={apiLeads} 
                    type="leads" 
                    onBarClick={createBarClickHandler(apiLeads, 'leads', 'Leads')}
                  />
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
                        { key: 'status', label: 'Status' }
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
                        { key: 'phone', label: 'Phone' },
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
                    <option value="pending_installations">Pending Installation</option>
                    <option value="collections">Collections</option>
                  </select>
                  <button 
                    onClick={handleMarkAllCustomersViewed}
                    disabled={newCustomerCount === 0}
                    className={`px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-600 flex items-center gap-2 transition-colors ${newCustomerCount === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:text-pink-600'}`}
                    title="Mark all new customers as open"
                  >
                     <CheckCheck className="w-4 h-4" />
                     Mark All Open
                  </button>
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
                </div>
                <div className="flex gap-2 items-center">
                   <select 
                    value={leadStatusFilter} 
                    onChange={(e) => setLeadStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="New">New</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                  <button 
                    onClick={handleMarkAllLeadsViewed}
                    disabled={newLeadCount === 0}
                    className={`px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-600 flex items-center gap-2 transition-colors ${newLeadCount === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:text-pink-600'}`}
                    title="Mark all new leads as open"
                  >
                     <CheckCheck className="w-4 h-4" />
                     Mark All Open
                  </button>
                </div>
              </div>
              <DataTable 
                data={filteredLeads} 
                columns={[
                  { key: 'id', label: 'ID' },
                  { key: 'name', label: 'Name' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'status', label: 'Status' },
                  { key: 'type', label: 'Type' }
                ]}
                type="lead"
                onRowClick={handleLeadClick}
                highlightRow={(row) => (row.status || '').toLowerCase() === 'new' && !viewedLeadIds.has(row.id)}
              />
            </div>
          )}

          {activeTab === 'deliveries' && (
             <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Deliveries History</h2>
                </div>
                <div className="flex gap-2 items-center">
                   <button className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">Export</button>
                </div>
              </div>
              <DataTable 
                data={filteredDeliveries} 
                columns={[
                  { key: 'Time', label: 'Date' },
                  { key: 'Name', label: 'Name' },
                  { key: 'Agent', label: 'Agent' }
                ]}
                type="customer" // reusing styling
                onRowClick={handleDeliveryClick}
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
        readOnly={isReadOnly}
      />

      <LeadModal 
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        currentUser={currentAdmin}
        readOnly={isReadOnly}
      />

      <DeliveryModal
        isOpen={!!selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
        delivery={selectedDelivery}
      />

      <CustomerListModal
        isOpen={statusListModal.isOpen}
        onClose={() => setStatusListModal({ ...statusListModal, isOpen: false })}
        title={statusListModal.title}
        customers={statusListModal.customers}
        onCustomerClick={handleCustomerClick}
      />
      
      <LeadListModal
        isOpen={leadListModal.isOpen}
        onClose={() => setLeadListModal({ ...leadListModal, isOpen: false })}
        title={leadListModal.title}
        leads={leadListModal.leads}
        onLeadClick={handleLeadClick}
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
        readOnly={isReadOnly}
      />

      <Toaster position="bottom-right" />
    </div>
  );
};

export default App;