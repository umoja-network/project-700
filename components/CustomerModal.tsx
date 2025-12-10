import React, { useState, useEffect } from 'react';
import { Customer, InventoryItem, CustomerNote, AdminUser } from '../types';
import { SplynxService } from '../services/splynxService';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { toast } from 'react-hot-toast';
import { X, Smartphone, User, MapPin, CreditCard, Mail, Phone, Hash, StickyNote, Send, Calendar, ExternalLink } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  devices: InventoryItem[];
  currentUser: AdminUser | null;
  readOnly?: boolean;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, customer, devices, currentUser, readOnly }) => {
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      fetchNotes(customer.id);
    } else {
      setNotes([]);
      setComment('');
    }
  }, [isOpen, customer]);

  const fetchNotes = async (customerId: number) => {
    setLoadingNotes(true);
    try {
      const response = await SplynxService.getCustomerNotes(customerId);
      let notesData = response.data;
      
      // If we have real data (or mock data with IDs we want to resolve), resolve Admin Names
      if (!response.isMock || notesData.some(n => !n.admin_name)) {
        // Extract unique admin IDs from the notes that need resolution
        const adminIdsToResolve = Array.from(new Set(
          notesData
            .filter(n => !n.admin_name) // Only resolve if name is missing
            .map(n => n.admin_id)
            .filter(id => id !== undefined && id !== null)
        ));

        if (adminIdsToResolve.length > 0) {
          try {
            const allAdmins = await GoogleSheetsService.fetchSheet<AdminUser>('Admin');
            const adminMap = new Map<string, string>();
            
            allAdmins.forEach(admin => {
               // Check if this admin is in our resolve list
               if (admin.admin_id && adminIdsToResolve.includes(admin.admin_id)) {
                  adminMap.set(String(admin.admin_id), admin.name);
               }
            });

            // Merge names into notes
            notesData = notesData.map(note => ({
              ...note,
              admin_name: note.admin_name || adminMap.get(String(note.admin_id)) || `Admin #${note.admin_id}`
            }));
          } catch (sheetErr) {
            console.error("Failed to resolve admins from backup", sheetErr);
          }
        }
      }

      // Sort notes by date descending (newest first)
      const sortedNotes = notesData.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
      setNotes(sortedNotes);
    } catch (error) {
      console.error("Failed to fetch customer notes", error);
      toast.error("Failed to load notes");
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!currentUser) {
      toast.error('You must be logged in to add comments');
      return;
    }
    
    if (!customer) return;

    setIsSubmitting(true);

    const now = new Date();
    // Use local time offset logic similar to snippet if strict precision needed, 
    // but toISOString is generally safer for APIs. The snippet used local time string construction.
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString().slice(0, 19).replace("T", " ");

    const noteData = {
      customer_id: customer.id,
      datetime: localDateTime,
      administrator_id: currentUser.admin_id || currentUser.id,
      name: currentUser.name,
      type: "comment",
      title: "Customer Comment",
      comment: comment,
      is_done: "1",
      is_send: "1", 
      is_pinned: "0"
    };

    try {
      const success = await SplynxService.addCustomerNote(noteData);
      if (success) {
        toast.success('Comment added successfully');
        
        // Optimistically add the new note to the UI
        const newNote: CustomerNote = {
          id: Date.now(), // Temporary ID
          customer_id: customer.id,
          admin_id: currentUser.admin_id || currentUser.id || 0,
          admin_name: currentUser.name,
          note: comment,
          date_created: localDateTime
        };
        
        setNotes(prev => [newNote, ...prev]);
        setComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown Date';
    try {
      // Use en-ZA to match the snippet style (e.g. 12 Oct 2023, 14:30)
      const date = new Date(dateString.replace(" ", "T")); // Handle potential "YYYY-MM-DD HH:MM:SS" format
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                <a 
                  href={`https://portal.umoja.network/admin/customers/view?id=${customer.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-pink-600 hover:underline flex items-center gap-2 transition-colors"
                  title="Open in Splynx Portal"
                >
                  {customer.name}
                  <ExternalLink className="w-5 h-5 text-gray-400" />
                </a>
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  customer.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 
                  customer.status === 'blocked' ? 'bg-red-100 text-red-700 border-red-200' : 
                  'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {customer.status.toUpperCase()}
                </span>
                <span>ID: {customer.id}</span>
              </div>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Customer Details Grid */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Email Address</p>
                  <p className="text-gray-900 font-medium">{customer.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  {customer.phone ? (
                    <a 
                      href={`tel:${customer.phone.replace(/\s+/g, '')}`} 
                      className="text-gray-900 font-medium hover:text-pink-600 hover:underline transition-colors"
                    >
                      {customer.phone}
                    </a>
                  ) : (
                    <p className="text-gray-900 font-medium">N/A</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hash className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Login</p>
                  <p className="text-gray-900 font-medium">{customer.login || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-gray-900 font-medium">
                    {customer.street_1}
                    {customer.city && `, ${customer.city}`}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Billing</p>
                  <p className="text-gray-900 font-medium">
                    Balance: <span className={customer.balance && customer.balance < 0 ? 'text-red-600' : 'text-green-600'}>
                      R{customer.balance?.toFixed(2)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Tariff ID: {customer.tariff_id}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Date Added</p>
                  <p className="text-gray-900 font-medium">
                    {customer.date_add ? new Date(customer.date_add).toLocaleDateString() : (customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-gray-200"></div>

          {/* Assigned Devices */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Assigned Devices</h3>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                {devices.length}
              </span>
            </div>

            {devices.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">MAC Address</th>
                      <th className="px-4 py-3 font-medium">Serial Number</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {devices.map((device) => (
                      <tr key={device.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{device.description}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono">{device.mac_address || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{device.serial_number || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs capitalize">
                            {device.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500">
                No devices assigned to this customer.
              </div>
            )}
          </section>

          <div className="h-px bg-gray-200"></div>

          {/* Notes History */}
          <section>
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Comment History</h3>
                </div>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                  {notes.length}
                </span>
             </div>

             <div className="space-y-3">
                {loadingNotes ? (
                   <div className="text-center py-4 text-gray-400 text-sm">Loading comments...</div>
                ) : notes.length > 0 ? (
                  notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 border-l-4 border-pink-600 rounded-r-md p-3 mb-2 transition-colors">
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <span>{formatDate(note.date_created)}</span>
                        <span>•</span>
                        <span className="font-semibold text-gray-700">{note.admin_name || `Admin #${note.admin_id}`}</span>
                      </div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">{note.note}</div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500">
                    <p className="text-sm">No comments available for this customer.</p>
                  </div>
                )}
             </div>
          </section>
        </div>

        {/* Fixed Input Section - Hidden if readOnly */}
        {!readOnly && (
        <div className="p-4 bg-white border-t border-gray-100 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
             <div className="flex gap-2">
                <input 
                    type="text" 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Type your comment here..."
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNote();
                        }
                    }}
                />
                <button 
                    onClick={handleAddNote}
                    disabled={isSubmitting || !comment.trim()}
                    className="bg-pink-600 text-white p-2 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[40px]"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div>
        )}
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end flex-shrink-0">
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