// @ts-nocheck
import React, { useState } from 'react';
import { useEnquiries } from '../../features/enquiries/hooks/useEnquiries';
import { enquiryService } from '../../features/enquiries/services/enquiryService';
import { EnquiryStatus } from '../../features/enquiries/types';
import { Skeleton } from '../Skeleton';
import { clsx } from 'clsx';
import { Mail, Phone, Calendar, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { qualifyEnquiry, draftEnquiryReply } from '../../features/aiSuggestions/aiService';

export function AdminEnquiriesPage() {
  const { enquiries, loading } = useEnquiries();
  const [filter, setFilter] = useState<EnquiryStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [draftingId, setDraftingId] = useState<string | null>(null);

  const filteredEnquiries = enquiries.filter(enq => {
    if (filter !== 'all' && enq.status !== filter) return false;
    if (search) {
      const term = search.toLowerCase();
      return (enq.customerName || enq.name || '').toLowerCase().includes(term) ||
             (enq.customerEmail || enq.email || '').toLowerCase().includes(term) ||
             (enq.customerPhone || enq.phone || '').toLowerCase().includes(term);
    }
    return true;
  });

  const handleStatusChange = async (id: string, status: EnquiryStatus) => {
    try {
      await enquiryService.updateEnquiryStatus(id, status);
      toast.success('Status updated');
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  const handleAiDraft = (enq: any) => {
    setDraftingId(enq.id);
    const cName = enq.customerName || enq.name || 'Customer';
    const pOfInterest = enq.productRef?.seriesName || enq.productOfInterest || '';
    const email = enq.customerEmail || enq.email;
    setTimeout(() => {
        const draft = draftEnquiryReply(cName, pOfInterest);
        const subject = encodeURIComponent(`RE: Your enquiry about ${pOfInterest || 'Grainood bats'}`);
        const body = encodeURIComponent(draft);
        if (email) {
          window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
          toast.info("Opened email client with AI draft.");
        } else {
          toast.warning("No email addresses provided for this enquiry");
        }
        setDraftingId(null);
    }, 600);
  };

  const statusColors: Record<EnquiryStatus, string> = {
    new: '#3b82f6',
    in_review: '#f59e0b',
    responded: '#8b5cf6',
    waiting_for_customer: '#ec4899',
    converted_to_order: '#10b981',
    closed: '#6b7280'
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <Skeleton key={i} variant="rectangular" className="h-32" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <p className="text-[11px] tracking-[0.4em] uppercase text-premium-gold-text mb-2">Sales Intent</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-content">Enquiries</h1>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 relative z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input 
            type="text" 
            placeholder="Search name, email, phone..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface border border-[#c5a059]/30 pl-10 pr-4 py-2 text-xs text-content focus:outline-none focus:border-[#c5a059]"
          />
        </div>
        <select 
          value={filter}
          onChange={e => setFilter(e.target.value as any)}
          className="bg-surface border border-[#c5a059]/30 text-content text-xs px-4 py-2 focus:outline-none"
        >
          <option value="all">All Enquiries</option>
          <option value="new">New</option>
          <option value="in_review">In Review</option>
          <option value="responded">Responded</option>
          <option value="waiting_for_customer">Waiting for Customer</option>
          <option value="converted_to_order">Converted to Order</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredEnquiries.length === 0 ? (
          <div className="bg-surface border border-[#c5a059]/20 p-8 text-center text-muted uppercase tracking-widest text-xs">
            No enquiries found.
          </div>
        ) : (
          filteredEnquiries.map(enq => {
            const aiLabel = qualifyEnquiry(enq.message, enq.productRef?.seriesName || enq.productOfInterest || '');
            const phone = enq.customerPhone || enq.phone || '';
            const email = enq.customerEmail || enq.email || '';
            const name = enq.customerName || enq.name || 'Anonymous';
            const productDisplay = enq.productRef ? `${enq.productRef.seriesName} ${enq.productRef.subSeriesName || ''}` : (enq.productOfInterest || 'General Enquiry');

            return (
              <div key={enq.id} className="bg-surface border border-[#c5a059]/20 p-6 flex flex-col md:flex-row gap-6 justify-between items-start">
                <div className="space-y-3 flex-1 w-full relative z-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold text-[#c5a059] border border-[#c5a059]/30 px-1.5 py-0.5 bg-[#c5a059]/10">
                          {enq.type?.replace(/_/g, ' ') || 'General Enquiry'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-content tracking-wider uppercase mb-1">{name}</h3>
                      <p className="text-xs text-muted font-mono">{productDisplay}</p>
                      
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-purple-400 border border-purple-500/20 px-2 py-1 bg-purple-500/10 flex items-center gap-1 w-max">
                           <Sparkles className="w-3 h-3" /> AI Label: {aiLabel}
                        </span>
                      </div>
                    </div>
                    <div className="md:hidden">
                      <span 
                        className="px-3 py-1 text-[9px] uppercase tracking-widest rounded-sm border inline-block ml-4 shrink-0" 
                        style={{ color: statusColors[enq.status] || '#6b7280', borderColor: (statusColors[enq.status] || '#6b7280') + '40', backgroundColor: (statusColors[enq.status] || '#6b7280') + '10' }}
                      >
                        {enq.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs text-muted/80">
                    <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-[#c5a059] transition-colors"><Mail className="w-3 h-3" /> {email || 'N/A'}</a>
                    <a href={`tel:${phone}`} className="flex items-center gap-2 hover:text-[#c5a059] transition-colors"><Phone className="w-3 h-3" /> {phone || 'N/A'}</a>
                  </div>
                  
                  <div className="bg-bg/50 border border-line p-4 text-sm text-content/90 font-light italic leading-relaxed">
                    "{enq.message}"
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted mt-4">
                    <Calendar className="w-3 h-3" />
                    {enq.createdAt?.toDate ? enq.createdAt.toDate().toLocaleString() : 'N/A'}
                  </div>
                </div>

                <div className="flex flex-col gap-4 w-full md:w-auto mt-4 md:mt-0 relative z-10 shrink-0">
                  <div className="hidden md:block self-end text-right">
                    <span 
                      className="px-3 py-1 text-[9px] uppercase tracking-widest rounded-sm border inline-block" 
                      style={{ color: statusColors[enq.status] || '#6b7280', borderColor: (statusColors[enq.status] || '#6b7280') + '40', backgroundColor: (statusColors[enq.status] || '#6b7280') + '10' }}
                    >
                      {enq.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-2 relative">
                    <label className="text-[10px] uppercase tracking-widest text-muted">Change Status</label>
                    <select
                      value={enq.status}
                      onChange={(e) => handleStatusChange(enq.id!, e.target.value as EnquiryStatus)}
                      className="bg-bg border border-[#c5a059]/30 text-content text-xs px-3 py-2 w-full md:w-40 focus:border-[#c5a059] focus:outline-none"
                    >
                      <option value="new">New</option>
                      <option value="in_review">In Review</option>
                      <option value="responded">Responded</option>
                      <option value="waiting_for_customer">Waiting for Customer</option>
                      <option value="converted_to_order">Converted to Order</option>
                      <option value="closed">Closed</option>
                    </select>

                    <button 
                      onClick={() => handleAiDraft(enq)}
                      disabled={draftingId === enq.id}
                      className="mt-2 text-center text-[10px] tracking-widest uppercase text-purple-300 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 px-4 py-2 transition-colors relative z-20 flex items-center justify-center gap-2"
                    >
                      {draftingId === enq.id ? 'Drafting...' : <><Sparkles className="w-3 h-3" /> AI Draft Reply</>}
                    </button>
                    
                    {phone && (
                      <a 
                        href={`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${name}, I'm reaching out regarding your enquiry for ${productDisplay}.`)}`}
                        target="_blank" rel="noreferrer"
                        className="mt-1 text-center text-[10px] tracking-widest uppercase text-bg bg-[#c5a059] hover:bg-premium-gold-text px-4 py-2 transition-colors relative z-20"
                      >
                        Reply via WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
