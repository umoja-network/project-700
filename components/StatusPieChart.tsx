
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StatusPieChartProps {
  activeCount: number;
  newCount: number;
  blockedCount: number;
  inactiveCount: number;
  onSliceClick: (status: 'active' | 'new' | 'blocked' | 'inactive') => void;
}

export const StatusPieChart: React.FC<StatusPieChartProps> = ({ 
  activeCount, 
  newCount, 
  blockedCount,
  inactiveCount,
  onSliceClick 
}) => {
  const data = [
    { name: `Active (${activeCount})`, value: activeCount, color: '#10b981', status: 'active' },    // Emerald-500
    { name: `New (${newCount})`, value: newCount, color: '#3b82f6', status: 'new' },             // Blue-500
    { name: `Blocked (${blockedCount})`, value: blockedCount, color: '#ef4444', status: 'blocked' }, // Red-500
    { name: `Disable (${inactiveCount})`, value: inactiveCount, color: '#9ca3af', status: 'inactive' } // Gray-400
  ];

  // We keep all data points even if value is 0 so they appear in the Legend
  const chartData = data;

  if (chartData.every(d => d.value === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        No customer data available.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2} 
            dataKey="value"
            onClick={(data) => {
              if (data?.payload?.status) {
                onSliceClick(data.payload.status);
              }
            }}
            cursor="pointer"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{ 
               backgroundColor: '#fff', 
               borderRadius: '8px', 
               border: 'none', 
               boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
             }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
