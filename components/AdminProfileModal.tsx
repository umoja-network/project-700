
import React, { useState, useEffect } from 'react';
import { X, Hash, AtSign, Edit2, Save, Loader2, Lock } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';
import { toast } from 'react-hot-toast';

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: {
    id?: number;
    admin_id: number | string;
    name: string;
    username: string;
  };
  onAdminUpdate?: (updatedData: { username: string }) => void;
  readOnly?: boolean;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({ isOpen, onClose, admin, onAdminUpdate, readOnly }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewUsername(admin.username);
      setNewPassword('');
      setIsEditing(false);
    }
  }, [isOpen, admin]);

  const handleSave = async () => {
    if (!newUsername.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const updates: any = {
        username: newUsername
      };

      // Only update password if user typed something
      if (newPassword.trim()) {
        updates.password = newPassword;
      }
      
      // Update via Supabase Service
      await SupabaseService.updateAdmin(admin.admin_id, updates);

      toast.success('Profile updated successfully');
      
      if (onAdminUpdate) {
        onAdminUpdate({ username: newUsername });
      }
      
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit Profile' : 'Admin Profile'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
           <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
                 {admin.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{admin.name}</h3>
              <span className="text-sm text-pink-600 font-medium bg-pink-50 px-3 py-1 rounded-full mt-1">
                {readOnly ? 'View Only Access' : 'Super Administrator'}
              </span>
           </div>

           {isEditing ? (
             <div className="space-y-4 animate-in fade-in">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Username</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
             </div>
           ) : (
             <div className="space-y-4 animate-in fade-in">
               <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <Hash className="w-5 h-5 text-gray-400" />
                  <div>
                     <p className="text-xs text-gray-500 uppercase font-semibold">Admin ID</p>
                     <p className="text-gray-900 font-medium">{admin.admin_id}</p>
                  </div>
               </div>
               <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <AtSign className="w-5 h-5 text-gray-400" />
                   <div>
                     <p className="text-xs text-gray-500 uppercase font-semibold">Username</p>
                     <p className="text-gray-900 font-medium">{admin.username}</p>
                  </div>
               </div>
             </div>
           )}
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="px-4 py-2 bg-pink-600 text-white font-medium rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </>
            ) : (
              <>
                {!readOnly && (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                )}
                <button 
                  onClick={onClose} 
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </>
            )}
        </div>
      </div>
    </div>
  );
};
