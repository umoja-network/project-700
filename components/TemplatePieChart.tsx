
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TemplatePieChartProps {
  data: { name: string; value: number }[];
}

const COLORS = ['#db2777', '#9333ea', '#2563eb', '#0d9488', '#d97706', '#dc2626', '#4b5563'];

export const TemplatePieChart: React.FC<TemplatePieChartProps> = ({ data }) => {
  if (!data || data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        No template data available.
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
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
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
