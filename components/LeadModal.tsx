import React, { useState, useEffect } from 'react';
import { Lead, AdminUser, LeadComment, Template } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { SupabaseService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { X, UserPlus, Mail, Phone, MapPin, Tag, Calendar, MessageSquare, Send, Clock, User, FileText, ExternalLink } from 'lucide-react';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  currentUser: AdminUser | null;
  readOnly?: boolean;
}

export const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, lead, currentUser, readOnly }) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<LeadComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && lead) {
      fetchComments();
      fetchTemplates();
    } else {
      setComments([]);
      setComment('');
      setTemplates([]);
      setSelectedTemplateId(null);
    }
  }, [isOpen, lead]);

  const fetchComments = async () => {
    if (!lead) return;
    setIsLoadingComments(true);

    try {
       // Use Supabase for comments if configured
       if (isSupabaseConfigured) {
          const leadComments = await SupabaseService.getLeadComments(lead.id);
          setComments(leadComments);
       } else {
          // Fallback to Google Sheets (legacy) if Supabase not available, 
          // though prompt requested Supabase.
          const allComments = await GoogleSheetsService.fetchSheet<LeadComment>('Comments');
          const leadComments = allComments
            .filter(c => Number(c.lead_id) === Number(lead.id))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setComments(leadComments);
       }
    } catch (error) {
       console.error('Error fetching comments:', error);
       toast.error('Could not load comment history');
    } finally {
      setIsLoadingComments(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const allTemplates = await GoogleSheetsService.fetchSheet<Template>('Templates');
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = Number(e.target.value);
    const template = templates.find(t => t.id === tId);
    
    if (template) {
      setComment(template.Template);
      setSelectedTemplateId(template.id);
    } else {
      setSelectedTemplateId(null);
      if (e.target.value === "") {
        setComment('');
      }
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!currentUser) {
      toast.error('You must be logged in to add comments');
      return;
    }

    setIsSubmitting(true);

    try {
      const adminId = currentUser.admin_id || currentUser.id;
      const dateStr = new Date().toISOString();

      if (isSupabaseConfigured) {
          await SupabaseService.addLeadComment({
            lead_id: lead!.id,
            lead_name: lead!.name,
            admin_id: adminId,
            admin_Name: currentUser.name,
            comment: comment,
            date: dateStr
          });
      } else {
          // Legacy fallback
          await GoogleSheetsService.addComment(
            lead!.id,
            adminId,
            currentUser.name,
            comment,
            selectedTemplateId || undefined
          );
      }

      toast.success('Comment added successfully');
      setComment('');
      setSelectedTemplateId(null);
      fetchComments(); // Refresh list
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                <a 
                  href={`https://portal.umoja.network/admin/crm/leads/view?id=${lead.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-600 hover:underline flex items-center gap-2 transition-colors"
                  title="Open in Splynx Portal"
                >
                  {lead.name}
                  <ExternalLink className="w-5 h-5 text-gray-400" />
                </a>
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                 <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  lead.status.toLowerCase() === 'new' ? 'bg-pink-100 text-pink-700 border-pink-200' :
                  lead.status.toLowerCase() === 'in progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  lead.status.toLowerCase() === 'won' ? 'bg-green-100 text-green-700 border-green-200' :
                  'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                </span>
                <span>ID: {lead.id}</span>
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

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-gray-900">{lead.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</p>
                {lead.phone ? (
                  <a 
                    href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                    className="text-gray-900 hover:text-pink-600 hover:underline transition-colors font-medium"
                  >
                    {lead.phone}
                  </a>
                ) : (
                  <p className="text-gray-900">N/A</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</p>
                <p className="text-gray-900">{lead.street_1 || lead.address || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="flex items-start gap-4 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</p>
                  <p className="text-gray-900 capitalize">{lead.type}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Added</p>
                  <p className="text-gray-900">
                    {lead.date_add ? new Date(lead.date_add).toLocaleDateString() : (lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200"></div>

          {/* Comment History Section (Scrollable) */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comment History
                </h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{comments.length}</span>
             </div>

            {/* Comment History List */}
            <div className="space-y-3">
              {isLoadingComments ? (
                 <div className="text-center py-4 text-gray-400 text-sm">Loading comments...</div>
              ) : comments.length > 0 ? (
                comments.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-pink-100 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-pink-500" />
                        <span className="text-xs font-bold text-gray-700">{item.admin_Name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(item.date)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 pl-5">{item.comment}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-sm text-gray-400">No comments yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Input Section - Hidden if readOnly */}
        {!readOnly && (
        <div className="p-4 bg-white border-t border-gray-100 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
             {/* Template Selector */}
             <div className="mb-2 flex items-center gap-2 animate-in fade-in">
                <FileText className="w-4 h-4 text-gray-400" />
                <select 
                    className="flex-1 text-sm border-gray-200 bg-gray-50 rounded-md px-2 py-1.5 text-gray-600 focus:ring-1 focus:ring-pink-500 focus:border-pink-500 focus:outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                    onChange={handleTemplateChange}
                    value={selectedTemplateId || ""}
                >
                    <option value="">Select a template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.Template.length > 50 ? t.Template.substring(0, 50) + '...' : t.Template}
                      </option>
                    ))}
                </select>
             </div>

             <div className="flex gap-2">
                <input 
                    type="text" 
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      if (selectedTemplateId && e.target.value === "") {
                        setSelectedTemplateId(null);
                      }
                    }}
                    placeholder="Type your comment here..."
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                        }
                    }}
                />
                <button 
                    onClick={handleAddComment}
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