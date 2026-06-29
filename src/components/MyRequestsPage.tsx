import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { SupportTicket } from '../types';
import { RevealSection } from './Reveal';
import { GoldButton } from './GoldButton';
import { ArrowLeft, Clock, MessageSquare, X, Filter } from 'lucide-react';
import { clsx } from 'clsx';
import { ticketService } from '../features/support/services/ticketService';
import { useUserTickets } from '../features/support/hooks/useTickets';
import { Skeleton, SkeletonTextLines } from './Skeleton';
import { EmptyState } from './EmptyState';
import { toast } from 'sonner';
import { ImageUpload } from './admin/ImageUpload';

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
    <span className={clsx("px-2 py-1 text-[9px] font-bold uppercase tracking-widest border rounded-sm whitespace-nowrap", styles[status] || styles.open)}>
      {label}
    </span>
  );
}

function TicketDetail({ ticket, onBack }: { ticket: SupportTicket, onBack: () => void }) {
  const { user } = useAuth();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() && !uploadedUrl) return;
    if (!user) return;
    
    setSending(true);
    setUploadError('');
    try {
      let attachments = [];
      if (uploadedUrl && uploadedFile) {
          attachments.push({
             url: uploadedUrl,
             name: uploadedFile.name,
             contentType: uploadedFile.type
          });
      }

      const updatedMessages = [
        ...ticket.messages,
        {
          sender: 'customer' as const,
          text: reply,
          createdAt: new Date().toISOString(),
          ...(attachments.length > 0 ? { attachments } : {})
        }
      ];

      await ticketService.addCustomerReply(ticket.id!, updatedMessages);
      
      // Auto transition back to open/under_review if waiting_for_customer
      if (ticket.status === 'waiting_for_customer') {
          await ticketService.updateTicketStatus(ticket.id!, 'under_review');
      }

      toast.success("Reply sent successfully");
      setReply('');
      setUploadedUrl('');
      setUploadedFile(null);
    } catch (err) {
      console.error("Error sending reply:", err);
      toast.error("Error sending reply");
    }
    setSending(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <button 
        onClick={onBack}
        className="inline-flex items-center text-[10px] uppercase tracking-[0.2em] text-muted hover:text-premium-gold-text transition-colors mb-6 min-h-[44px]"
      >
        <ArrowLeft className="w-3 h-3 mr-2" />
        Back to Requests
      </button>

      <div className="bg-surface border border-[#c5a059]/10 shadow-sm p-6 md:p-10 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <StatusPill status={ticket.status} />
              <span className="text-[10px] text-muted uppercase tracking-widest bg-bg border border-line px-1.5 py-0.5">Type: {ticket.type.replace(/_/g, ' ')}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-[0.1em] text-content uppercase">{ticket.subject}</h1>
            {ticket.orderCode && (
              <p className="text-xs text-content/60 tracking-wider mt-2">Relates to order: <Link to={`/my-orders/${ticket.orderId}`} className="text-[#c5a059] hover:underline">{ticket.orderCode}</Link></p>
            )}
            
             {ticket.eligibility && (
                <div className="flex flex-col gap-2 pt-4">
                    {ticket.eligibility.eligible ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-2 text-xs">Eligible for Return</div>
                    ) : (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-2 text-xs">
                          Not Eligible for Return
                          {ticket.eligibility.reason && <p className="mt-1 text-[10px] opacity-80">{ticket.eligibility.reason}</p>}
                        </div>
                    )}
                </div>
             )}
             
          </div>
          <div className="text-left md:text-right text-xs text-muted">
            <p>Request #{ticket.id?.substring(0,8).toUpperCase()}</p>
          </div>
        </div>

        <div className="space-y-6 mb-8 border-t border-[#c5a059]/10 pt-8">
          {ticket.messages.map((msg, idx) => {
            const isCustomer = msg.sender === 'customer';
            const isSystem = msg.sender === 'system';
            
            if (isSystem) {
                return (
                    <div key={idx} className="flex justify-center my-4">
                        <div className="bg-surface border border-[#c5a059]/10 text-muted px-4 py-2 text-[10px] uppercase tracking-widest rounded-full">
                            {msg.text}
                        </div>
                    </div>
                );
            }

            return (
              <div key={idx} className={clsx("flex flex-col", isCustomer ? "items-end" : "items-start")}>
                <div className="text-[9px] text-muted uppercase tracking-widest mb-1 px-1">
                  {isCustomer ? 'You' : 'Grainood Support'}
                </div>
                <div 
                  className={clsx(
                    "max-w-[85%] md:max-w-[75%] p-4 text-sm leading-relaxed",
                    isCustomer 
                      ? "bg-[#c5a059]/10 border border-[#c5a059]/20 text-content" 
                      : "bg-elevated border border-line text-content"
                  )}
                >
                  {msg.text}
                  {msg.attachments && msg.attachments.length > 0 && (
                     <div className="mt-3 flex gap-2 overflow-x-auto">
                       {msg.attachments.map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 border border-line flex-shrink-0 relative group">
                            {att.contentType?.startsWith('image/') ? (
                              <img src={att.url} alt={att.name || "Attachment"} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted">File</div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">View</div>
                          </a>
                       ))}
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {ticket.status !== 'closed' ? (
          <form onSubmit={handleReply} className="border-t border-[#c5a059]/10 pt-8 relative">
            <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Reply to conversation</label>
            <textarea 
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              className="w-full bg-bg border border-[#c5a059]/20 p-4 text-sm focus:outline-none focus:border-[#c5a059] transition-colors resize-none mb-4"
            />
            {uploadError && <p className="text-red-500 text-xs mb-4">{uploadError}</p>}
            <div className="flex flex-col mb-4 gap-4">
              <div className="w-full">
                <ImageUpload
                  specKey="supportAttachment"
                  supportThemes={false}
                  value={uploadedUrl}
                  onChange={(url, file) => {
                     setUploadedUrl(typeof url === 'string' ? url : (url.light || url.dark || ''));
                     if (file) setUploadedFile(file);
                  }}
                  storagePath={`support/${user!.uid}/${ticket.id}`}
                />
              </div>
              <div className="flex justify-end">
                <GoldButton type="submit" disabled={sending || (!reply.trim() && !uploadedUrl)} variant="solid" className="w-full sm:w-auto">
                  {sending ? 'Sending...' : 'Send'}
                </GoldButton>
              </div>
            </div>
          </form>
        ) : (
          <div className="border-t border-[#c5a059]/10 pt-8 text-center">
            <p className="text-xs text-muted uppercase tracking-widest">This ticket has been closed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MyRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newType, setNewType] = useState('general');
  const [newSubj, setNewSubj] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSubmitting, setNewSubmitting] = useState(false);

  const { tickets, loading } = useUserTickets(user?.uid || undefined);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "My Requests — Grainood";
  }, []);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setNewSubmitting(true);
    try {
      await ticketService.createTicket({
        userId: user.uid,
        type: newType,
        subject: newSubj,
        description: newDesc,
        status: 'open',
        customerName: user.displayName || 'Customer',
        customerEmail: user.email || '',
        messages: [{
          sender: 'customer',
          text: newDesc,
          createdAt: new Date().toISOString()
        }],
      } as any);
      toast.success("Request submitted successfully.");
      setShowNewModal(false);
      setNewSubj('');
      setNewDesc('');
    } catch (err) {
      console.error(err);
      toast.error("Failed to create request.");
    }
    setNewSubmitting(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/my-requests' }, replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);
  const filteredTickets = filterType === 'all' ? tickets : tickets.filter(t => t.type === filterType);

  return (
    <div className="min-h-screen bg-bg text-content pt-32 md:pt-40 pb-20 md:pb-28 font-sans">
      {selectedTicket ? (
        <RevealSection>
          <TicketDetail ticket={selectedTicket} onBack={() => setSelectedTicketId(null)} />
        </RevealSection>
      ) : (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="text-center md:text-left">
                <p className="text-[11px] tracking-[0.4em] uppercase text-premium-gold-text mb-3 block">Support Centre</p>
                <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-content">My Requests</h1>
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
                 <GoldButton onClick={() => setShowNewModal(true)} className="text-[10px] py-2 px-4 whitespace-nowrap uppercase tracking-widest min-h-[44px]">New Request</GoldButton>
                 <div className="flex items-center gap-2">
                   <Filter className="w-4 h-4 text-muted shrink-0" />
                   <select 
                      value={filterType}
                      onChange={e => setFilterType(e.target.value)}
                      className="bg-bg border border-[#c5a059]/20 text-[10px] font-bold text-content uppercase tracking-widest p-2 focus:outline-none focus:border-[#c5a059] min-h-[44px]"
                   >
                      <option value="all">All Types</option>
                      <option value="order_query">Order Query</option>
                      <option value="return_request">Return Request</option>
                      <option value="repair_request">Repair Request</option>
                      <option value="warranty_claim">Warranty Claim</option>
                      <option value="general">General</option>
                   </select>
                 </div>
              </div>
            </div>
          </RevealSection>

          {loading ? (
             <div className="space-y-4">
               {[1, 2, 3].map(i => (
                 <div key={i} className="bg-surface border border-[#c5a059]/10 p-6 md:p-8 flex flex-col md:flex-row justify-between gap-4">
                   <div className="flex-1">
                     <div className="flex gap-2 mb-4">
                       <Skeleton variant="rectangular" className="h-5 w-20" />
                       <Skeleton variant="rectangular" className="h-5 w-24" />
                     </div>
                     <Skeleton variant="text" className="h-6 w-3/4 mb-3" />
                     <Skeleton variant="text" className="h-4 w-1/2" />
                   </div>
                   <Skeleton variant="text" className="h-4 w-32" />
                 </div>
               ))}
             </div>
          ) : (
            <div className="space-y-4">
               {filteredTickets.length === 0 ? (
                  <EmptyState 
                    icon={<MessageSquare size={32} />}
                    title="No support requests yet."
                    description="Raise a request for order help, warranty claim, repair, return, or general support."
                    actionText="View My Orders"
                    actionLink="/my-orders"
                  />
               ) : (
                  filteredTickets.map((ticket, idx) => {
                    const date = ticket.updatedAt?.toDate ? ticket.updatedAt.toDate() : new Date();
                    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    return (
                      <RevealSection key={ticket.id} delay={idx * 50}>
                        <div 
                          onClick={() => setSelectedTicketId(ticket.id!)}
                          className="bg-surface border border-[#c5a059]/10 p-6 md:p-8 shadow-sm hover:border-[#c5a059]/30 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <StatusPill status={ticket.status} />
                              <span className="text-[10px] text-muted tracking-widest uppercase bg-bg border border-line px-1.5 py-0.5">{ticket.type.replace(/_/g, ' ')}</span>
                              {ticket.orderCode && (
                                <span className="text-[10px] text-muted tracking-widest uppercase">&bull; Order: {ticket.orderCode}</span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold tracking-wider text-content group-hover:text-[#c5a059] transition-colors">{ticket.subject}</h3>
                            <p className="text-xs text-muted mt-2 line-clamp-1">{ticket.description || ticket.messages[0]?.text}</p>
                          </div>
                          <div className="flex items-center text-[10px] tracking-widest text-muted md:text-right shrink-0 uppercase">
                            <Clock className="w-3 h-3 mr-2 text-[#c5a059]" />
                            Updated {dateStr}
                          </div>
                        </div>
                      </RevealSection>
                    );
                  })
               )}
            </div>
          )}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-bg/95" onClick={() => setShowNewModal(false)}></div>
          <div className="relative bg-surface border border-[#c5a059]/20 shadow-2xl w-full max-w-lg p-6 md:p-10 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowNewModal(false)}
              className="absolute top-4 right-4 text-muted hover:text-[#c5a059] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold tracking-[0.2em] uppercase text-content mb-8 mt-4">New Request</h2>
            <form onSubmit={handleCreateNew} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Request Type</label>
                <div className="flex gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input 
                      type="radio" 
                      value="general" 
                      checked={newType === 'general'}
                      onChange={(e) => setNewType(e.target.value)}
                      className="accent-[#c5a059]"
                    />
                    <span className="text-sm">General</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input 
                      type="radio" 
                      value="repair_request" 
                      checked={newType === 'repair_request'}
                      onChange={(e) => setNewType(e.target.value)}
                      className="accent-[#c5a059]"
                    />
                    <span className="text-sm">Repair Info</span>
                  </label>
                </div>
                {newType === 'repair_request' && <p className="text-xs text-muted mt-2">If you need a repair from an existing order, please go to My Orders to link it directly.</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Subject</label>
                <input 
                  type="text" 
                  required
                  value={newSubj}
                  onChange={(e) => setNewSubj(e.target.value)}
                  className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm focus:outline-none focus:border-[#c5a059] transition-colors min-h-[44px]"
                  placeholder="Brief description"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Message</label>
                <textarea 
                  required
                  rows={4}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm focus:outline-none focus:border-[#c5a059] transition-colors resize-none min-h-[44px]"
                  placeholder="Provide detailed information..."
                />
              </div>

              <GoldButton type="submit" disabled={newSubmitting} variant="solid" className="w-full min-h-[44px]">
                {newSubmitting ? 'Submitting...' : 'Submit Request'}
              </GoldButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

