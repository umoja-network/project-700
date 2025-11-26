
import React from 'react';

interface Column {
  key: string;
  label: string;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  type: 'customer' | 'lead';
  onRowClick?: (item: any) => void;
  highlightRow?: (item: any) => boolean;
}

export const DataTable: React.FC<DataTableProps> = ({ data, columns, type, onRowClick, highlightRow }) => {
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700 border-green-200',
      converted: 'bg-green-100 text-green-700 border-green-200',
      new: 'bg-pink-100 text-pink-700 border-pink-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      blocked: 'bg-red-100 text-red-700 border-red-200',
      lost: 'bg-gray-100 text-gray-600 border-gray-200',
      inactive: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    const defaultStyle = 'bg-gray-100 text-gray-600 border-gray-200';
    
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status.toLowerCase()] || defaultStyle}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (data.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        No records found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-200">
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, index) => {
            const isHighlighted = highlightRow ? highlightRow(row) : false;
            
            return (
              <tr 
                key={row.id || index} 
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors group border-l-4 
                  ${onRowClick ? 'cursor-pointer' : ''}
                  ${isHighlighted 
                    ? 'bg-pink-50/80 border-pink-500 hover:bg-pink-100/50' 
                    : 'border-transparent hover:bg-gray-50 hover:border-pink-400'
                  }
                `}
              >
                {columns.map((col) => (
                  <td key={`${row.id}-${col.key}`} className={`px-6 py-4 whitespace-nowrap text-sm ${isHighlighted ? 'font-semibold text-pink-900' : 'text-gray-700'}`}>
                    {col.key === 'status' ? (
                      getStatusBadge(row[col.key])
                    ) : col.key === 'balance' ? (
                      <span className={row[col.key] < 0 ? 'text-red-600 font-medium' : ''}>
                        R{Number(row[col.key]).toFixed(2)}
                      </span>
                    ) : (
                      row[col.key]
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button className="text-pink-600 hover:text-pink-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
