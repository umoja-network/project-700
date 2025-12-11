import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ActivityChartProps {
  data: any[];
  type: 'customers' | 'leads';
  groupBy?: 'location' | 'status';
  onBarClick?: (data: { month: string; category: string }) => void;
}

// Helper to determine location based on GPS
const getLocation = (item: any): string => {
  if (item.gps) {
    const parts = item.gps.split(',').map((p: string) => parseFloat(p.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const lat = parts[0];
      const lon = parts[1];

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

const STATUS_COLORS: Record<string, string> = {
  // Shared / Customer Statuses
  'Active': '#10b981',    // Emerald-500
  'New': '#ec4899',       // Pink-500 (Consistent with Badges)
  'Blocked': '#ef4444',   // Red-500
  'Inactive': '#9ca3af',  // Gray-400
  
  // Lead Statuses
  'In Progress': '#3b82f6', // Blue-500
  'Won': '#10b981',       // Emerald-500
  'Lost': '#9ca3af'       // Gray-400
};

const LOCATION_COLORS: Record<string, string> = {
  'Gauteng': '#8b5cf6', // Violet-500
  'Limpopo': '#ec4899', // Pink-500
  'Other': '#9ca3af'    // Gray-400
};

export const ActivityChart: React.FC<ActivityChartProps> = ({ data, type, groupBy = 'location', onBarClick }) => {
  // Aggregate data by month and grouping key
  const { chartData, keys } = useMemo(() => {
    const stats = new Map<string, Record<string, number>>();

    data.forEach(item => {
      // Prioritize date_add, fallback to created_at
      const dateStr = item.date_add || item.created_at;
      if (!dateStr) return;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      // Key for sorting: YYYY-MM
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!stats.has(key)) {
        stats.set(key, {});
      }
      
      const entry = stats.get(key)!;
      let groupKey = 'Other';

      if (groupBy === 'location') {
        groupKey = getLocation(item);
      } else {
        // Status Grouping
        const rawStatus = (item.status || 'New').toLowerCase();
        
        if (type === 'customers') {
          if (rawStatus === 'active') groupKey = 'Active';
          else if (rawStatus === 'new') groupKey = 'New';
          else if (rawStatus === 'blocked') groupKey = 'Blocked';
          else if (['inactive', 'disable', 'disabled'].includes(rawStatus)) groupKey = 'Inactive';
          else groupKey = 'Other';
        } else {
          // Leads
          if (rawStatus === 'new') groupKey = 'New';
          else if (['in progress', 'qualification', 'activation', 'pending'].includes(rawStatus)) groupKey = 'In Progress';
          else if (rawStatus === 'won') groupKey = 'Won';
          else if (rawStatus === 'lost') groupKey = 'Lost';
          else groupKey = 'Other';
        }
      }

      entry[groupKey] = (entry[groupKey] || 0) + 1;
    });

    if (stats.size === 0) return { chartData: [], keys: [] };

    // Convert to array and sort chronologically
    const sortedKeys = Array.from(stats.keys()).sort();
    
    // Take the last 6 months
    const recentKeys = sortedKeys.slice(-6);

    const processedData = recentKeys.map(key => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      return {
        name: monthName,
        fullName: `${monthName} ${year}`,
        ...stats.get(key)
      };
    });

    // Determine consistent keys for rendering bars based on config
    let finalKeys: string[] = [];
    if (groupBy === 'location') {
       finalKeys = ['Gauteng', 'Limpopo', 'Other'];
    } else if (type === 'customers') {
       finalKeys = ['Active', 'New', 'Blocked', 'Inactive'];
    } else {
       finalKeys = ['New', 'In Progress', 'Won', 'Lost'];
    }

    return { chartData: processedData, keys: finalKeys };
  }, [data, type, groupBy]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
        No date activity data available
      </div>
    );
  }

  const getBarColor = (key: string) => {
    if (groupBy === 'location') return LOCATION_COLORS[key] || '#9ca3af';
    return STATUS_COLORS[key] || '#9ca3af';
  };

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12 }} 
            allowDecimals={false}
          />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelFormatter={(label, payload) => {
              if (payload && payload.length > 0) {
                return payload[0].payload.fullName;
              }
              return label;
            }}
          />
          <Legend iconType="circle" height={36} />
          {keys.map((key) => (
             <Bar 
               key={key} 
               dataKey={key} 
               fill={getBarColor(key)} 
               name={key} 
               radius={[4, 4, 0, 0]} 
               onClick={(data) => {
                 if (onBarClick && data && data.payload) {
                   onBarClick({ month: data.payload.fullName, category: key });
                 }
               }}
               cursor={onBarClick ? 'pointer' : 'default'}
             />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};