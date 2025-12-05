
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
}

// Helper to determine location based on GPS
const getLocation = (item: any): 'Gauteng' | 'Limpopo' | 'Other' => {
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

export const ActivityChart: React.FC<ActivityChartProps> = ({ data, type }) => {
  // Aggregate data by month and location
  const chartData = useMemo(() => {
    const stats = new Map<string, { Gauteng: number; Limpopo: number; Other: number }>();

    data.forEach(item => {
      // Prioritize date_add, fallback to created_at
      const dateStr = item.date_add || item.created_at;
      if (!dateStr) return;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      // Key for sorting: YYYY-MM
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!stats.has(key)) {
        stats.set(key, { Gauteng: 0, Limpopo: 0, Other: 0 });
      }

      const location = getLocation(item);
      const entry = stats.get(key)!;
      entry[location]++;
    });

    if (stats.size === 0) return [];

    // Convert to array and sort chronologically
    const sortedKeys = Array.from(stats.keys()).sort();
    
    // Take the last 6 months
    const recentKeys = sortedKeys.slice(-6);

    return recentKeys.map(key => {
      const [year, month] = key.split('-');
      // Month is 0-indexed in JS Date
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      return {
        name: monthName,
        fullName: `${monthName} ${year}`,
        ...stats.get(key)
      };
    });
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
        No date activity data available
      </div>
    );
  }

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
          {/* Grouped Bars (removed stackId) */}
          <Bar dataKey="Gauteng" fill="#8b5cf6" name="Gauteng" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Limpopo" fill="#ec4899" name="Limpopo" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Other" fill="#9ca3af" name="Other" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
