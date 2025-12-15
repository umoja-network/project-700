import React, { useMemo, useState } from 'react';
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
import { Layers, BarChart as BarChartIcon } from 'lucide-react';

interface ActivityChartProps {
  data: any[];
  type: 'customers' | 'leads';
  groupBy?: string; // Kept for compatibility but ignored in new logic
  onBarClick?: (data: { month: string; location: string; status?: string }) => void;
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

// Helper to determine status
const getStatus = (item: any, type: 'customers' | 'leads'): string => {
  const rawStatus = (item.status || 'New').toLowerCase();
  
  if (type === 'customers') {
    if (rawStatus === 'active') return 'Active';
    if (rawStatus === 'new') return 'New';
    if (rawStatus === 'blocked') return 'Blocked';
    if (['inactive', 'disable', 'disabled'].includes(rawStatus)) return 'Inactive';
    return 'Inactive'; // Default fallback
  } else {
    // Leads
    if (rawStatus === 'new') return 'New';
    if (['in progress', 'qualification', 'activation', 'pending'].includes(rawStatus)) return 'In Progress';
    if (rawStatus === 'won') return 'Won';
    if (rawStatus === 'lost') return 'Lost';
    return 'In Progress'; // Default fallback
  }
};

// Color Palette Definition
// Gauteng: Light variants
// Limpopo: Dark variants
// Other: Standard variants
const COLOR_MAP: Record<string, Record<string, string>> = {
  Gauteng: {
    'Active': '#86efac',      // Light Green (green-300)
    'New': '#93c5fd',         // Light Blue (blue-300)
    'Blocked': '#fca5a5',     // Light Red (red-300)
    'Inactive': '#d1d5db',    // Light Grey (gray-300)
    'In Progress': '#fdba74', // Light Orange (orange-300)
    'Won': '#86efac',         // Light Green
    'Lost': '#fca5a5'         // Light Red
  },
  Limpopo: {
    'Active': '#14532d',      // Dark Green (green-900)
    'New': '#1e3a8a',         // Dark Blue (blue-900)
    'Blocked': '#7f1d1d',     // Dark Red (red-900)
    'Inactive': '#374151',    // Dark Grey (gray-700)
    'In Progress': '#7c2d12', // Dark Orange (orange-900)
    'Won': '#14532d',         // Dark Green
    'Lost': '#7f1d1d'         // Dark Red
  },
  Other: {
    'Active': '#22c55e',      // Green (green-500)
    'New': '#3b82f6',         // Blue (blue-500)
    'Blocked': '#ef4444',     // Red (red-500)
    'Inactive': '#6b7280',    // Grey (gray-500)
    'In Progress': '#f97316', // Orange (orange-500)
    'Won': '#22c55e',         // Green
    'Lost': '#ef4444'         // Red
  }
};

// Simple view colors (Totals per location)
const LOCATION_COLORS: Record<string, string> = {
  Gauteng: '#8b5cf6', // Violet-500
  Limpopo: '#ec4899', // Pink-500
  Other: '#9ca3af'    // Gray-400
};

const getBarColor = (location: string, status: string): string => {
  return COLOR_MAP[location]?.[status] || '#9ca3af';
};

export const ActivityChart: React.FC<ActivityChartProps> = ({ data, type, onBarClick }) => {
  const [showStatusStack, setShowStatusStack] = useState(true);

  // Aggregate data by month -> location -> status
  const { chartData, locations, statuses } = useMemo(() => {
    const stats = new Map<string, Record<string, number>>();

    // Define strict order for stacks
    const statusList = type === 'customers' 
       ? ['Active', 'New', 'Blocked', 'Inactive']
       : ['Won', 'In Progress', 'New', 'Lost']; 

    const locationList = ['Gauteng', 'Limpopo', 'Other'];

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
      const location = getLocation(item);
      const status = getStatus(item, type);

      // Composite key for Recharts: "Location_Status"
      const compositeKey = `${location}_${status}`;
      entry[compositeKey] = (entry[compositeKey] || 0) + 1;

      // Accumulate totals per location for simple view
      entry[location] = (entry[location] || 0) + 1;
    });

    if (stats.size === 0) return { chartData: [], locations: [], statuses: [] };

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

    return { 
      chartData: processedData, 
      locations: locationList, 
      statuses: statusList 
    };
  }, [data, type]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
        No date activity data available
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full">
      {/* Toggle Button */}
      <div className="absolute top-[-40px] right-0 z-10">
        <button
          onClick={() => setShowStatusStack(!showStatusStack)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:text-pink-600 hover:border-pink-200 shadow-sm transition-all"
          title={showStatusStack ? "Switch to Location Totals" : "Switch to Status Breakdown"}
        >
          {showStatusStack ? (
            <>
              <Layers className="w-3.5 h-3.5" />
              <span>Status View</span>
            </>
          ) : (
             <>
              <BarChartIcon className="w-3.5 h-3.5" />
              <span>Simple View</span>
            </>
          )}
        </button>
      </div>

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
            formatter={(value: number, name: string) => {
              if (showStatusStack) {
                // Parse "Gauteng_Active" back to "Active (Gauteng)"
                const [loc, stat] = name.split('_');
                if (stat) return [value, `${stat} (${loc})`];
                return [value, name];
              } else {
                return [value, `${name} Total`];
              }
            }}
          />
          <Legend 
            height={36}
            content={
              showStatusStack ? (
                <div className="flex flex-col items-center gap-2 mt-2">
                   <div className="flex flex-wrap justify-center gap-4">
                    <span className="text-xs font-semibold text-gray-500">Legend:</span>
                    {statuses.map((status) => (
                      <div key={status} className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                           {/* Show the 3 shades for the legend */}
                           <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLOR_MAP.Gauteng[status] }} title="Gauteng" />
                           <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLOR_MAP.Other[status] }} title="Other" />
                           <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLOR_MAP.Limpopo[status] }} title="Limpopo" />
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-gray-400 flex gap-3">
                     <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-gray-200" style={{ backgroundColor: '#e2e8f0' }}></div> Light: Gauteng</span>
                     <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-gray-500" style={{ backgroundColor: '#64748b' }}></div> Medium: Other</span>
                     <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-gray-800" style={{ backgroundColor: '#1e293b' }}></div> Dark: Limpopo</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center gap-6 mt-2">
                   {locations.map(loc => (
                      <div key={loc} className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: LOCATION_COLORS[loc] }} />
                         <span className="text-xs font-medium text-gray-600">{loc}</span>
                      </div>
                   ))}
                </div>
              )
            }
          />
          
          {showStatusStack ? (
            // Grouped by Location (stackId=Location), Stacked by Status
            locations.map((location) => 
              statuses.map((status) => (
                <Bar 
                  key={`${location}_${status}`}
                  dataKey={`${location}_${status}`}
                  name={`${location}_${status}`} // Used for tooltip mapping
                  stackId={location} // Stacks items for this location
                  fill={getBarColor(location, status)}
                  radius={[0, 0, 0, 0]} // Square corners for stack segments
                  onClick={(data) => {
                     if (onBarClick && data && data.payload) {
                       onBarClick({ 
                         month: data.payload.fullName, 
                         location, 
                         status 
                       });
                     }
                  }}
                  cursor={onBarClick ? 'pointer' : 'default'}
                />
              ))
            )
          ) : (
            // Simple View: Grouped by Location (No Status Stacking)
            locations.map((location) => (
              <Bar 
                key={location}
                dataKey={location}
                name={location}
                fill={LOCATION_COLORS[location]}
                radius={[4, 4, 0, 0]} 
                onClick={(data) => {
                   if (onBarClick && data && data.payload) {
                        onBarClick({
                            month: data.payload.fullName,
                            location,
                            status: 'All'
                        });
                   }
                }}
                cursor={onBarClick ? 'pointer' : 'default'}
              />
            ))
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};