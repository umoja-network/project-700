
import React from 'react';
import { DashboardStats } from '../types';
import { Users, UserPlus, TrendingUp, Activity } from 'lucide-react';

interface StatsCardsProps {
  stats: DashboardStats;
  onCardClick?: (type: string) => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, onCardClick }) => {
  const cards = [
    {
      id: 'total_customers',
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'bg-pink-500',
      trend: '+12% from last month',
      trendUp: true,
      clickable: true
    },
    {
      id: 'active_customers',
      title: 'Active Customers',
      value: stats.activeCustomers,
      icon: Activity,
      color: 'bg-emerald-500',
      trend: '+5% new active',
      trendUp: true,
      clickable: true
    },
    {
      id: 'pending_leads',
      title: 'Pending Leads',
      value: stats.pendingLeads,
      icon: UserPlus,
      color: 'bg-amber-500',
      trend: '-2% processed',
      trendUp: false,
      clickable: true
    },
    {
      id: 'conversion_rate',
      title: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: 'bg-purple-500',
      trend: '+1.5% improvement',
      trendUp: true,
      clickable: false
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div 
            key={card.id} 
            onClick={() => card.clickable && onCardClick && onCardClick(card.id)}
            className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-all 
              ${card.clickable ? 'cursor-pointer hover:shadow-md hover:border-pink-200 hover:bg-gray-50' : ''}
            `}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{card.title}</p>
                <h3 className="text-3xl font-bold text-gray-800">{card.value}</h3>
              </div>
              <div className={`p-3 rounded-lg ${card.color} bg-opacity-10`}>
                <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={`font-medium ${card.trendUp ? 'text-green-600' : 'text-red-500'}`}>
                {card.trend}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
