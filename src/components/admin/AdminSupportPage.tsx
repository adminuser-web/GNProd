import React, { useState, useEffect } from 'react';
import { Filter, ArrowLeft, MessageSquare, Package, Clock, Send, Search, Check, X, FileText, User } from 'lucide-react';
import { SupportTicket, OrderRecord } from '../../types';
import { GoldButton } from '../GoldButton';
import { clsx } from 'clsx';
import { ticketService } from '../../features/support/services/ticketService';
import { useAllTickets } from '../../features/support/hooks/useTickets';
import { Link, useSearchParams } from 'react-router-dom';
import { orderService } from '../../features/orders/services/orderService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, EmptyState } from './ui';

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-green-500/10 text-green-500 border-green-500/20',
    under_review: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    waiting_for_customer: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    resolved: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    closed: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };
  const label = status.replace(/_/g, ' ');
  return (
    <span className={clsx("px-2 py-1 text-[9px] font-bold uppercase tracking-widest border whitespace-nowrap", styles[status] || styles.open)}>
      {label}
    </span>
  );
}

import { draftSupportReply } from '../../features/aiSuggestions/aiService';

function AdminTicketDetailDrawer({ ticket, onBack }: { ticket: SupportTicket, onBack: () => void }) {
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [linkedOrder, setLinkedOrder] = useState<OrderRecord | null>(null);
  const [internalNotes, setInternalNotes] = useState<any[]>([]);

  useEffect(() => {
    if (!ticket.id) return;
    const unsubscribe = ticketService.subscribeToTicketNotes(ticket.id, setInternalNotes);
    return () => unsubscribe();
  }, [ticket.id]);

  useEffect(() => {
    if (!ticket.orderId) return;
    const fetchOrder = async () => {
      try {
        const fetchedOrder = await orderService.getOrder(ticket.orderId!);
        if (fetchedOrder) {
          setLinkedOrder(fetchedOrder as OrderRecord);
        }
      } catch (err) {
        console.error("Failed to load linked order summary", err);
      }
    };
    fetchOrder();
  }, [ticket.orderId]);

  const handleAiDraft = () => {
    setDrafting(true);
    setTimeout(() => {
       const draft = draftSupportReply(ticket.type, { name: ticket.customerName, email: ticket.customerEmail });
       setReply(draft);
       setDrafting(false);
       toast.success("AI draft applied. Please review before sending.");
    }, 800);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !ticket.id) return;
    
    setSending(true);
    try {
      const updatedMessages = [
        ...ticket.messages,
        {
          sender: 'admin' as const,
          text: reply,
          createdAt: new Date().toISOString(),
        }
      ];

      await ticketService.addAdminReply(ticket.id, updatedMessages);
      toast.success("Reply sent successfully.");
      
      if (ticket.status === 'open' || ticket.status === 'under_review') {
        await handleStatusChange('waiting_for_customer', false);
      }

      setReply('');
    } catch (err) {
      console.error("Error sending reply:", err);
      toast.error("Failed to send reply.");
    }
    setSending(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || !ticket.id) return;
    
    setSending(true);
    try {
      await ticketService.addInternalNote(ticket.id, note, 'Admin');
      toast.success("Internal note saved.");
      setNote('');
    } catch (err) {
      console.error("Error adding note:", err);
      toast.error("Failed to save note.");
    }
    setSending(false);
  };

  const handleStatusChange = async (newStatus: string, explicitlyShowToast = true) => {
    setStatusUpdating(true);
    if (!ticket.id) return;
    try {
      await ticketService.updateTicketStatus(ticket.id, newStatus);
      if (explicitlyShowToast) toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      console.error("Error changing status:", err);
      if (explicitlyShowToast) toast.error("Failed to update status.");
    }
    setStatusUpdating(false);
  };

  const needsApproval = ['warranty_claim', 'repair_request', 'return_request'].includes(ticket.type) && (ticket.status === 'open' || ticket.status === 'under_review');

  return (
    <AnimatePresence>
      {ticket && (
        <div className="fixed inset-0 z-modal flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-bg/90" onClick={onBack}></motion.div>
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.3, ease: 'easeOut' }} className="fixed inset-y-0 right-0 w-full md:w-[600px] xl:w-[800px] bg-surface border-l border-[#c5a059]/10 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-[#c5a059]/10 flex flex-col gap-4 bg-bg shrink-0">
        <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
               <button 
                 onClick={onBack}
                 className="p-1 text-muted hover:text-content transition-colors md:hidden rounded-full hover:bg-surface mt-1"
               >
                 <ArrowLeft className="w-5 h-5" />
               </button>
               <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                     <span className="text-[10px] text-muted tracking-widest uppercase">#{ticket.id?.slice(0,8)}</span>
                     <StatusPill status={ticket.status} />
                     <span className="text-[10px] text-muted tracking-widest uppercase px-2 py-1 bg-surface border border-line">{ticket.type.replace(/_/g, ' ')}</span>
                     {ticket.priority && <span className="text-[10px] text-red-500 font-bold tracking-widest uppercase px-2 py-1 bg-red-500/10 border border-red-500/20">{ticket.priority}</span>}
                  </div>
                  <h2 className="text-lg md:text-xl font-bold tracking-[0.1em] uppercase text-content line-clamp-2 md:leading-normal">{ticket.subject}</h2>
               </div>
            </div>
            
            <button 
              onClick={onBack}
              className="text-muted hover:text-content p-2 hidden md:block transition-colors rounded-full hover:bg-surface"
            >
              <X className="w-5 h-5" />
            </button>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             {needsApproval && (
                <div className="flex items-center gap-2">
                    <GoldButton onClick={() => handleStatusChange('approved')} disabled={statusUpdating} className="text-[10px] py-1.5 px-3">
                        <Check className="w-3 h-3 mr-2" /> Approve
                    </GoldButton>
                    <GoldButton onClick={() => handleStatusChange('rejected')} disabled={statusUpdating} variant="outline" className="text-[10px] py-1.5 px-3 border-red-500/50 text-red-500 hover:bg-red-500/10">
                        <X className="w-3 h-3 mr-2" /> Reject
                    </GoldButton>
                </div>
             )}
            <div className="relative w-full sm:w-auto ml-auto">
              <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={statusUpdating}
                  className="w-full bg-bg border border-[#c5a059]/30 text-[10px] text-[#c5a059] font-bold uppercase tracking-widest py-2 pl-3 pr-8 focus:outline-none focus:border-[#c5a059] appearance-none cursor-pointer"
              >
                  <option value="open">Open</option>
                  <option value="under_review">Under Review</option>
                  <option value="waiting_for_customer">Waiting for Customer</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#c5a059]">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
              </div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col md:flex-row bg-surface">
         {/* Left Side: Context & Notes */}
         <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-r border-[#c5a059]/10 p-4 md:p-6 flex flex-col gap-6 bg-surface/50 shrink-0 h-auto md:h-full md:overflow-y-auto">
             
             {/* Customer Data */}
             <div className="space-y-1">
                <p className="text-[9px] font-bold tracking-widest uppercase text-muted mb-2 flex items-center gap-1"><User className="w-3 h-3"/> Customer Info</p>
                <p className="text-xs font-bold text-content break-words max-w-full uppercase tracking-wider">{ticket.customerName}</p>
                <p className="text-[10px] tracking-widest text-muted break-words uppercase">{ticket.customerEmail}</p>
                {ticket.customerPhone && <p className="text-[10px] tracking-widest text-muted uppercase">{ticket.customerPhone}</p>}
             </div>
             
             {/* Order Data */}
             {ticket.orderCode && (
                 <div className="flex flex-col gap-2 pt-6 border-t border-[#c5a059]/10">
                    <p className="text-[9px] font-bold tracking-widest uppercase text-muted flex items-center gap-1"><Package className="w-3 h-3"/> Linked Order</p>
                    <Link to={`/admin/orders`} className="text-xs font-bold uppercase tracking-wider text-premium-gold-text hover:underline break-words">
                      {ticket.orderCode}
                    </Link>
                    {linkedOrder && (
                      <div className="mt-2 text-[10px] space-y-1.5 text-content uppercase tracking-wider bg-bg p-3 border border-[#c5a059]/10">
                         {linkedOrder.items.map((item, i) => (
                           <div key={i} className="flex gap-2">
                             <span className="text-muted shrink-0">{item.quantity}x</span> 
                             <span className="truncate">{item.productName}</span>
                           </div>
                         ))}
                      </div>
                    )}
                 </div>
             )}

             {/* Description & Attachments */}
             <div className="flex flex-col gap-2 pt-6 border-t border-[#c5a059]/10">
                 <p className="text-[9px] font-bold tracking-widest uppercase text-muted">Original Request</p>
                 <div className="text-[11px] text-content/80 whitespace-pre-wrap leading-relaxed">{ticket.description}</div>
                 
                 {ticket.attachments && ticket.attachments.length > 0 && (
                    <div className="mt-4">
                        <p className="text-[9px] font-bold tracking-widest uppercase text-muted mb-2">Attachments</p>
                        <div className="flex overflow-x-auto gap-2 pb-2">
                            {ticket.attachments.map((att, i) => (
                                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 border border-[#c5a059]/20 relative group bg-bg flex flex-col items-center justify-center shrink-0">
                                    {att.contentType?.startsWith('image/') ? (
                                      <img src={att.url} alt="Attachment" className="w-full h-full object-cover" />
                                    ) : (
                                      <>
                                        <FileText className="w-5 h-5 text-muted mb-1" />
                                        <span className="text-[7px] text-muted truncate w-[90%] text-center uppercase tracking-widest">{att.name || 'File'}</span>
                                      </>
                                    )}
                                    <div className="absolute inset-0 bg-bg/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[#c5a059] text-[9px] font-bold tracking-widest uppercase">View</div>
                                </a>
                            ))}
                        </div>
                    </div>
                 )}
             </div>

             {/* Internal Notes */}
             <div className="pt-6 border-t border-[#c5a059]/10 flex flex-col flex-1 min-h-0">
                 <p className="text-[9px] font-bold tracking-widest uppercase text-premium-gold-text mb-4">Internal Notes</p>
                 <div className="space-y-4 mb-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                    {(!internalNotes || internalNotes.length === 0) && (
                        <p className="text-[10px] uppercase tracking-widest text-muted italic">No internal notes yet.</p>
                    )}
                    {internalNotes && internalNotes.map((n, i) => (
                        <div key={i} className="bg-bg border-l-2 border-[#c5a059] p-3 text-[11px] text-content">
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-[#c5a059]">{n.createdBy || 'Admin'}</span>
                              <span className="text-[8px] uppercase tracking-widest text-muted shrink-0 break-words text-right">{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}</span>
                            </div>
                            <div className="whitespace-pre-wrap">{n.text}</div>
                        </div>
                    ))}
                 </div>
                 <form onSubmit={handleAddNote} className="shrink-0 mt-auto pt-2">
                    <textarea 
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Type admin note..."
                        className="w-full bg-bg border border-[#c5a059]/20 p-3 text-[11px] focus:outline-none focus:border-[#c5a059] mb-2 resize-none"
                        rows={2}
                    />
                    <GoldButton type="submit" disabled={sending} className="w-full text-[10px] py-1.5 uppercase tracking-widest" variant="outline">
                        {sending ? 'Saving...' : 'Save Note'}
                    </GoldButton>
                 </form>
             </div>
         </div>

         {/* Right Side: Conversation Thread */}
         <div className="flex-1 flex flex-col bg-bg w-full h-[50vh] md:h-full">
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
                {ticket.messages.map((msg, idx) => {
                    const isAdmin = msg.sender === 'admin';
                    const isSystem = msg.sender === 'system';
                    
                    if (isSystem) {
                        return (
                            <div key={idx} className="flex justify-center my-6">
                                <div className="bg-surface border border-line text-muted px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] rounded-sm text-center">
                                    {msg.text}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={idx} className={clsx("flex flex-col w-full", isAdmin ? "items-end" : "items-start")}>
                            <div className="flex items-center gap-2 mb-1 px-1">
                                {!isAdmin && <User className="w-3 h-3 text-muted" />}
                                <span className={clsx("text-[9px] font-bold uppercase tracking-widest", isAdmin ? "text-[#c5a059]" : "text-muted")}>
                                  {isAdmin ? 'Admin' : ticket.customerName}
                                </span>
                                <span className="text-[8px] text-muted/50 uppercase tracking-widest">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div 
                                className={clsx(
                                    "max-w-[90%] md:max-w-[85%] p-4 text-[13px] leading-relaxed whitespace-pre-wrap break-words",
                                    isAdmin 
                                        ? "bg-surface border border-[#c5a059]/20 text-content" 
                                        : "bg-surface/50 border border-line text-content"
                                )}
                            >
                                {msg.text}
                                {msg.attachments && msg.attachments.length > 0 && (
                                   <div className="mt-3 flex gap-2 overflow-x-auto">
                                     {msg.attachments.map((att, i) => (
                                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 border border-line flex-shrink-0 relative group bg-bg flex flex-col items-center justify-center">
                                          {att.contentType?.startsWith('image/') ? (
                                            <img src={att.url} alt={att.name || "Attachment"} className="w-full h-full object-cover" />
                                          ) : (
                                            <>
                                              <FileText className="w-5 h-5 text-muted mb-1" />
                                              <span className="text-[7px] text-muted truncate w-[90%] text-center">{att.name || 'File'}</span>
                                            </>
                                          )}
                                        </a>
                                     ))}
                                   </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="p-4 md:p-6 border-t border-[#c5a059]/10 bg-surface shrink-0">
                <form onSubmit={handleReply}>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-[#c5a059]">Quick Reply Templates</label>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={handleAiDraft}
                          disabled={drafting}
                          className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[9px] uppercase tracking-widest p-1.5 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                        >
                          {drafting ? "Drafting..." : "AI Draft Reply"}
                        </button>
                        <select 
                          onChange={(e) => {
                            if(e.target.value) setReply(e.target.value);
                            e.target.value = "";
                          }}
                          className="bg-bg border border-[#c5a059]/20 text-[10px] uppercase tracking-widest p-1.5 focus:outline-none focus:border-[#c5a059] max-w-[200px]"
                        >
                          <option value="">Select a template...</option>
                          <option value="Hi there, we noticed your payment for this order is still pending. Please let us know if you need any assistance completing it.">Payment follow-up</option>
                          <option value="We have received your warranty claim. To proceed, please provide clear photos of the damage along with the batch number on the bat.">Warranty evidence request</option>
                          <option value="We have evaluated your request and your repair has been accepted. Please find the shipping instructions attached.">Repair accepted</option>
                          <option value="We have received your return request and are currently reviewing your eligibility. We will update you shortly.">Return request received</option>
                          <option value="Unfortunately, your return request is not eligible under our policy criteria. If you have any questions, please let us know.">Return rejected</option>
                          <option value="We have resolved this issue on our end. If you have any further questions, please feel free to reply to this ticket.">General resolution</option>
                        </select>
                      </div>
                    </div>
                    <textarea 
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        placeholder="Type reply to customer..."
                        rows={3}
                        required
                        className="w-full bg-bg border border-[#c5a059]/20 p-4 text-[13px] focus:outline-none focus:border-[#c5a059] transition-colors resize-none mb-4"
                    />
                    <div className="flex justify-end">
                        <GoldButton type="submit" disabled={sending} className="w-full sm:w-auto uppercase tracking-widest text-[10px] py-3 px-6">
                            <span className="flex items-center gap-2 justify-center">
                                {sending ? 'Sending...' : 'Send Reply'} <Send className="w-3 h-3" />
                            </span>
                        </GoldButton>
                    </div>
                </form>
            </div>
         </div>
      </div>
    </motion.div>
  </div>
  )}
  </AnimatePresence>
  );
}

export function AdminSupportPage() {
  const { tickets, loading } = useAllTickets();
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) as SupportTicket | undefined;

  // Filter Logic
  const filteredTickets = tickets.filter(t => {
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchType = typeFilter === 'all' || t.type === typeFilter;
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter || (priorityFilter === 'normal' && !t.priority);
      const matchSearch = searchQuery === '' || 
          t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.orderCode && t.orderCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (t.id && t.id.toLowerCase().includes(searchQuery.toLowerCase()));
          
      let matchDate = true;
      if (dateFilter !== 'all') {
          const tDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date();
          const now = new Date();
          const p7 = new Date(now.setDate(now.getDate() - 7));
          const p30 = new Date(now.setDate(now.getDate() - 23)); // 30 total
          if (dateFilter === '7days') matchDate = tDate >= p7;
          if (dateFilter === '30days') matchDate = tDate >= p30;
      }
      
      return matchStatus && matchType && matchPriority && matchSearch && matchDate;
  });

  return (
    <div className="w-full animate-fade-in pb-10 space-y-4 min-h-screen">
       <PageHeader
          eyebrow="Customer Care"
          title="Support Hub"
          description="Manage customer queries, returns, and warranties."
          actions={
          <div className="flex flex-col lg:flex-row w-full xl:w-auto gap-4 shrink-0">
              <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto hide-scrollbar pb-2 lg:pb-0">
                  <div className="relative w-full lg:w-40 shrink-0">
                      <select 
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full appearance-none bg-surface border border-[#c5a059]/30 px-3 py-2 pr-8 text-[10px] min-h-[36px] font-bold tracking-widest uppercase transition-colors text-[#c5a059] focus:outline-none focus:border-[#c5a059] cursor-pointer"
                      >
                          <option value="all" className="bg-bg text-content">All Status</option>
                          <option value="open" className="bg-bg text-content">Open</option>
                          <option value="under_review" className="bg-bg text-content">Reviewing</option>
                          <option value="waiting_for_customer" className="bg-bg text-content">Waiting</option>
                          <option value="approved" className="bg-bg text-content">Approved</option>
                          <option value="rejected" className="bg-bg text-content">Rejected</option>
                          <option value="resolved" className="bg-bg text-content">Resolved</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#c5a059]">
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                      </div>
                  </div>
                  <div className="relative w-full lg:w-40 shrink-0">
                      <select 
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="w-full appearance-none bg-surface border border-[#c5a059]/30 px-3 py-2 pr-8 text-[10px] min-h-[36px] font-bold tracking-widest uppercase transition-colors text-[#c5a059] focus:outline-none focus:border-[#c5a059] cursor-pointer"
                      >
                          <option value="all" className="bg-bg text-content">All Types</option>
                          <option value="order_query" className="bg-bg text-content">Order Query</option>
                          <option value="return_request" className="bg-bg text-content">Return Req</option>
                          <option value="warranty_claim" className="bg-bg text-content">Warranty Claim</option>
                          <option value="repair_request" className="bg-bg text-content">Repair</option>
                          <option value="general" className="bg-bg text-content">General</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#c5a059]">
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                      </div>
                  </div>
                  <div className="relative w-full lg:w-40 shrink-0">
                      <select 
                          value={priorityFilter}
                          onChange={(e) => setPriorityFilter(e.target.value)}
                          className="w-full appearance-none bg-surface border border-[#c5a059]/30 px-3 py-2 pr-8 text-[10px] min-h-[36px] font-bold tracking-widest uppercase transition-colors text-[#c5a059] focus:outline-none focus:border-[#c5a059] cursor-pointer"
                      >
                          <option value="all" className="bg-bg text-content">All Priorities</option>
                          <option value="normal" className="bg-bg text-content">Normal</option>
                          <option value="high" className="bg-bg text-content">High</option>
                          <option value="urgent" className="bg-bg text-content">Urgent</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#c5a059]">
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                      </div>
                  </div>
                  <div className="relative w-full lg:w-40 shrink-0">
                      <select 
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                          className="w-full appearance-none bg-surface border border-[#c5a059]/30 px-3 py-2 pr-8 text-[10px] min-h-[36px] font-bold tracking-widest uppercase transition-colors text-[#c5a059] focus:outline-none focus:border-[#c5a059] cursor-pointer"
                      >
                          <option value="all" className="bg-bg text-content">All Dates</option>
                          <option value="7days" className="bg-bg text-content">Last 7 Days</option>
                          <option value="30days" className="bg-bg text-content">Last 30 Days</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#c5a059]">
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                      </div>
                  </div>
              </div>
              <div className="relative w-full lg:w-64 shrink-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="SEARCH TICKETS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface border border-[#c5a059]/30 pl-10 pr-4 py-2 min-h-[36px] text-[10px] font-bold tracking-widest uppercase text-content focus:outline-none focus:border-[#c5a059] transition-colors"
                />
              </div>
          </div>
          }
       />

       {loading ? (
         <div className="space-y-4">
             <div className="hidden lg:grid grid-cols-12 gap-4 p-4 border-b border-[#c5a059]/20">
                <div className="col-span-5 h-3 bg-surface/30 animate-pulse" />
                <div className="col-span-2 h-3 bg-surface/30 animate-pulse" />
                <div className="col-span-3 h-3 bg-surface/30 animate-pulse" />
                <div className="col-span-2 h-3 bg-surface/30 animate-pulse" />
             </div>
             {[1,2,3,4,5].map(k => (
                <div key={k} className="h-24 lg:h-16 bg-surface/20 animate-pulse border border-[#c5a059]/10" />
             ))}
         </div>
       ) : filteredTickets.length === 0 ? (
           <div className="bg-surface border border-[#c5a059]/10">
              <EmptyState icon={MessageSquare} title="No requests found" description="Try adjusting your search or filters to see more results." />
           </div>
       ) : (
           <div className="rounded-xl border border-[#c5a059]/15 overflow-hidden w-full">
              {/* Desktop Header */}
              <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2.5 text-[9px] font-bold tracking-[0.2em] uppercase text-muted bg-bg border-b border-[#c5a059]/15 sticky top-0 z-raised w-full">
                  <div className="col-span-5">Ticket Summary</div>
                  <div className="col-span-2 text-center">Status</div>
                  <div className="col-span-3">Customer</div>
                  <div className="col-span-2 text-right">Last Updated</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#c5a059]/10">
                  {filteredTickets.map(ticket => {
                      const date = ticket.updatedAt?.toDate ? ticket.updatedAt.toDate() : new Date();
                      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                      
                      return (
                          <div 
                              key={ticket.id}
                              onClick={() => setSelectedTicketId(ticket.id!)}
                              className="group hover:bg-[#c5a059]/[0.04] transition-colors px-4 py-3 flex flex-col lg:grid lg:grid-cols-12 gap-y-3 lg:gap-3 items-start lg:items-center cursor-pointer relative"
                          >
                              {/* Summary Column */}
                              <div className="col-span-5 w-full pr-4">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[9px] bg-bg border border-[#c5a059]/30 text-[#c5a059] px-1.5 py-0.5 uppercase tracking-widest shrink-0">{ticket.type.replace(/_/g, ' ')}</span>
                                      <span className="text-[13px] font-bold tracking-wider text-content uppercase truncate group-hover:text-premium-gold-text transition-colors">
                                        {ticket.subject}
                                      </span>
                                  </div>
                                  <div className="text-[10px] text-muted truncate mt-0.5 w-full lg:max-w-md">{ticket.description}</div>
                                  <div className="text-[9px] font-mono text-[#c5a059]/60 tracking-widest uppercase mt-1">
                                     #{ticket.id?.slice(0,8)} {ticket.orderCode && `• ORD: ${ticket.orderCode}`}
                                  </div>
                              </div>
                              
                              {/* Status Column */}
                              <div className="col-span-2 w-full flex lg:flex-col lg:items-center justify-between items-center">
                                  <span className="lg:hidden text-[9px] font-bold text-muted uppercase tracking-widest">Status</span>
                                  <div className="flex flex-col items-end lg:items-center gap-2">
                                    <StatusPill status={ticket.status} />
                                    {ticket.priority && <span className="text-[9px] text-red-500 uppercase font-bold tracking-widest">{ticket.priority} PRIORITY</span>}
                                  </div>
                              </div>

                              {/* Customer Column */}
                              <div className="col-span-3 w-full flex lg:flex-col lg:items-start justify-between items-center text-right lg:text-left">
                                  <span className="lg:hidden text-[9px] font-bold text-muted uppercase tracking-widest">Customer</span>
                                  <div className="flex flex-col items-end lg:items-start">
                                     <span className="text-[11px] text-content uppercase font-bold tracking-wider truncate">{ticket.customerName}</span>
                                     <span className="text-[9px] text-muted uppercase tracking-widest truncate mt-0.5">{ticket.customerEmail}</span>
                                  </div>
                              </div>

                              {/* Date Column */}
                              <div className="col-span-2 w-full flex justify-between items-center text-right lg:justify-end mt-2 lg:mt-0 pt-2 lg:pt-0 border-t border-line lg:border-none">
                                  <span className="lg:hidden text-[9px] font-bold text-muted uppercase tracking-widest">Updated</span>
                                  <div className="flex items-center text-[10px] text-muted tracking-widest uppercase">
                                      <Clock className="w-3 h-3 mr-2 shrink-0 opacity-50 hidden lg:block" />
                                      {dateStr}
                                  </div>
                              </div>
                              
                              <ArrowLeft className="hidden lg:block w-4 h-4 text-[#c5a059] opacity-0 group-hover:opacity-100 transition-opacity rotate-180 absolute right-4 top-1/2 -translate-y-1/2" />
                          </div>
                      );
                  })}
              </div>
           </div>
       )}

       <AnimatePresence>
         {selectedTicket && (
            <AdminTicketDetailDrawer ticket={selectedTicket} onBack={() => setSelectedTicketId(null)} />
         )}
       </AnimatePresence>
    </div>
  );
}
