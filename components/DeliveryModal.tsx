import React from 'react';
import { Delivery } from '../types';
import { X, Truck, Calendar, User, Barcode, Hash } from 'lucide-react';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery | null;
}

export const DeliveryModal: React.FC<DeliveryModalProps> = ({ isOpen, onClose, delivery }) => {
  if (!isOpen || !delivery) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Delivery Details</h2>
              <p className="text-sm text-gray-500">ID: {delivery['Customer ID']}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
           
           <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
             <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
             <div>
               <p className="text-xs font-semibold text-gray-500 uppercase">Date & Time</p>
               <p className="text-gray-900 font-medium">{delivery.Time}</p>
             </div>
           </div>

           <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
             <User className="w-5 h-5 text-gray-400 mt-0.5" />
             <div>
               <p className="text-xs font-semibold text-gray-500 uppercase">Customer Name</p>
               <p className="text-gray-900 font-medium">{delivery.Name}</p>
             </div>
           </div>

           <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
             <Hash className="w-5 h-5 text-gray-400 mt-0.5" />
             <div>
               <p className="text-xs font-semibold text-gray-500 uppercase">Customer ID</p>
               <p className="text-gray-900 font-medium">{delivery['Customer ID']}</p>
             </div>
           </div>

           <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
             <Barcode className="w-5 h-5 text-gray-400 mt-0.5" />
             <div>
               <p className="text-xs font-semibold text-gray-500 uppercase">Router Barcode</p>
               <p className="text-gray-900 font-mono text-sm break-all">{delivery['Router Barcode'] || 'N/A'}</p>
             </div>
           </div>

           <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
             <Barcode className="w-5 h-5 text-gray-400 mt-0.5" />
             <div>
               <p className="text-xs font-semibold text-gray-500 uppercase">SIM Barcode</p>
               <p className="text-gray-900 font-mono text-sm break-all">
                 {/* Updated to match the exact column header "SIM Barcode" from the screenshot */}
                 {delivery['SIM Barcode'] || 'N/A'}
               </p>
             </div>
           </div>

           <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
             <User className="w-5 h-5 text-gray-400 mt-0.5" />
             <div>
               <p className="text-xs font-semibold text-gray-500 uppercase">Agent</p>
               <p className="text-gray-900 font-medium">{delivery.Agent}</p>
             </div>
           </div>

        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};