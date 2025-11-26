
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface ActivityChartProps {
  data: any[];
  type: 'customers' | 'leads';
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ data, type }) => {
  // Aggregate data simply for visualization
  // In a real app, this would group by date
  const chartData = [
    { name: 'Jan', value: Math.floor(data.length * 0.1) },
    { name: 'Feb', value: Math.floor(data.length * 0.15) },
    { name: 'Mar', value: Math.floor(data.length * 0.12) },
    { name: 'Apr', value: Math.floor(data.length * 0.25) },
    { name: 'May', value: Math.floor(data.length * 0.18) },
    { name: 'Jun', value: Math.floor(data.length * 0.2) },
  ];

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
          />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="value" fill="#db2777" radius={[4, 4, 0, 0]}>
             {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#db2777' : '#f472b6'} />
              ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
