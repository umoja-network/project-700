import React, { useState } from 'react';
import { LayoutDashboard, Users, UserPlus, LogOut, ChevronLeft, ChevronRight, Truck } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'customers' | 'leads' | 'deliveries';
  setActiveTab: (tab: 'dashboard' | 'customers' | 'leads' | 'deliveries') => void;
  newCustomerCount: number;
  newLeadCount: number;
  onLogout: () => void;
  userName?: string;
  onProfileClick: () => void;
}

export const DashboardLayout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab,
  newCustomerCount,
  newLeadCount,
  onLogout,
  userName = 'Admin',
  onProfileClick
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
    { id: 'customers', label: 'Customers', icon: Users, badge: newCustomerCount },
    { id: 'leads', label: 'Leads', icon: UserPlus, badge: newLeadCount },
    { id: 'deliveries', label: 'Deliveries', icon: Truck, badge: 0 },
  ] as const;

  return (
    <>
      <aside 
        className={`hidden md:flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 relative ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Toggle Button */}
        <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-9 z-50 bg-white border border-gray-200 text-gray-500 rounded-full p-1 shadow-md hover:bg-gray-100 hover:text-pink-600 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Header */}
        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} border-b border-slate-800 transition-all duration-300 h-[89px]`}>
          {!isCollapsed ? (
             <div className="flex items-center gap-3 animate-in fade-in duration-200">
              <img 
                src="https://thabisot33.github.io/logo/Umoja%20Logo%20Web_320x86_png.png" 
                alt="Umoja Portal" 
                className="h-12 w-auto object-contain"
              />
             </div>
          ) : (
            <div className="flex items-center justify-center">
               <img 
                  src="https://thabisot33.github.io/logo/Umoja%20Logo%20Web_320x86_png.png" 
                  alt="Umoja Portal" 
                  className="w-12 h-auto object-contain"
               />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeCount = item.badge || 0;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : ''}
                className={`relative w-full flex items-center rounded-lg transition-all duration-200 group ${
                  isCollapsed ? 'justify-center py-3 px-0' : 'space-x-3 px-4 py-3'
                } ${
                  isActive 
                    ? 'bg-pink-600 text-white shadow-md shadow-pink-900/20' 
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center relative">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  
                  {/* Collapsed Badge (Notification Dot) */}
                  {isCollapsed && badgeCount > 0 && (
                     <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-sm ring-2 ring-slate-900 animate-in zoom-in">
                       {badgeCount > 9 ? '9+' : badgeCount}
                     </span>
                  )}
                </div>

                {!isCollapsed && (
                  <>
                    <span className="font-medium flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis animate-in fade-in duration-200">
                      {item.label}
                    </span>
                    {badgeCount > 0 && (
                       <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm animate-in fade-in zoom-in">
                         {badgeCount > 99 ? '99+' : badgeCount}
                       </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          
          {/* Admin Profile Section */}
          <button 
            onClick={onProfileClick}
            className={`w-full flex items-center mb-6 transition-all duration-300 hover:bg-slate-800 rounded-lg p-2 ${isCollapsed ? 'justify-center' : 'gap-3 text-left'}`}
            title="View Profile"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold shadow-md shrink-0 border border-slate-700">
               {userName.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
                <span className="text-sm font-semibold text-white truncate">{userName}</span>
                <span className="text-xs text-slate-500 truncate">Administrator</span>
              </div>
            )}
          </button>

          <div className="space-y-2">
             <button 
              onClick={onLogout}
              title={isCollapsed ? "Logout" : ""}
              className={`w-full flex items-center rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-slate-400 ${
                isCollapsed ? 'justify-center py-3' : 'space-x-3 px-4 py-3'
              }`}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in duration-200">Logout</span>}
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-gray-50">
        {children}
      </div>
    </>
  );
};