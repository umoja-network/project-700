
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface LocationPieChartProps {
  data: { name: string; value: number; color: string }[];
  onSliceClick?: (locationName: string) => void;
}

export const LocationPieChart: React.FC<LocationPieChartProps> = ({ data, onSliceClick }) => {
  if (!data || data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        No location data available.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            onClick={(data) => {
              if (data?.payload?.name && onSliceClick) {
                onSliceClick(data.payload.name);
              }
            }}
            cursor={onSliceClick ? "pointer" : "default"}
          >
            {data.map((entry, index) => (
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
