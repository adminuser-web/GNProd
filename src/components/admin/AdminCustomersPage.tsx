import React, { useState, useEffect } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import { useCustomers, Customer } from "../../features/crm/hooks/useCustomers";
import { crmService } from "../../features/crm/services/crmService";
import { RevealSection } from "../Reveal";
import { GoldButton } from "../GoldButton";
import { toast } from "sonner";
import {
  Search,
  User,
  MapPin,
  Phone,
  Mail,
  ShoppingBag,
  DollarSign,
  ArrowLeft,
  Clock,
  Save,
  Copy,
  MessageSquarePlus,
  CalendarDays,
  Home
} from "lucide-react";
import { clsx } from "clsx";
import { ticketService } from "../../features/support/services/ticketService";
import { useAuth } from "../../context/AuthContext";
import { PageHeader, EmptyState } from "./ui";

function Customer360({
  customer,
  onBack,
}: {
  customer: Customer;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Overview' | 'Orders' | 'Saved Builds' | 'Support' | 'Notes'>('Overview');
  const [note, setNote] = useState("");
  const [loadingNote, setLoadingNote] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [whatsappTemplateType, setWhatsappTemplateType] = useState('general');

  useEffect(() => {
    async function fetchNote() {
      if (customer.userId) {
        setLoadingNote(true);
        try {
          const fetchedNote = await crmService.getCustomerNote(customer.userId);
          setNote(fetchedNote);
        } catch (error) {
          console.error("Failed to fetch note", error);
        }
        setLoadingNote(false);
      } else {
        setLoadingNote(false);
      }
    }
    fetchNote();
  }, [customer.userId]);

  const handleSaveNote = async () => {
    if (!customer.userId) return;
    setSavingNote(true);
    try {
      await crmService.updateCustomerNote(customer.userId, note);
      toast.success("Admin note saved successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleCopyWhatsApp = () => {
    let text = `Hi ${customer.name.split(" ")[0]},\n\n`;
    if (whatsappTemplateType === 'payment') text += `This is a quick reminder regarding your pending payment.\n\nBest,\nSupport Team`;
    else if (whatsappTemplateType === 'order') text += `We have an update regarding your recent order.\n\nBest,\nSupport Team`;
    else if (whatsappTemplateType === 'support') text += `Following up on your recent support request.\n\nBest,\nSupport Team`;
    else if (whatsappTemplateType === 'build') text += `We noticed you saved a beautiful bat build! Do you have any questions before ordering?\n\nBest,\nSupport Team`;
    else text += `This is regarding your recent request with us.\n\nBest,\nSupport Team`;
    
    navigator.clipboard.writeText(text).then(() => {
      toast.success("WhatsApp message template copied to clipboard!");
    }).catch((err) => {
      toast.error("Failed to copy. Clipboard access restricted.");
      console.error(err);
    });
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim() || !customer.userId)
      return;

    setCreatingTicket(true);
    try {
      await ticketService.createTicket({
        userId: customer.userId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone || "",
        subject: ticketSubject,
        description: ticketMessage,
        type: "general",
        status: "open",
        messages: [
          {
            sender: "admin",
            text: ticketMessage,
            createdAt: new Date().toISOString(),
          },
        ],
      } as any);
      setShowTicketModal(false);
      setTicketSubject("");
      setTicketMessage("");
      toast.success("Ticket created successfully. It will appear on the Support board.");
    } catch (error) {
      console.error("Failed to create ticket", error);
      toast.error("Failed to create ticket.");
    } finally {
      setCreatingTicket(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <button
        onClick={onBack}
        className="text-[10px] uppercase tracking-widest text-muted hover:text-[#c5a059] flex items-center transition-colors mb-4 font-bold border border-transparent px-2 -ml-2 py-1"
      >
        <ArrowLeft className="w-3 h-3 mr-2" /> Back to Customers
      </button>

      {/* Customer Header */}
      <RevealSection className="bg-surface border border-[#c5a059]/20 p-6 md:p-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 relative">
        <div className="flex items-start md:items-center gap-6 w-full xl:w-auto">
          <div className="w-16 h-16 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-[#c5a059]" />
          </div>
          <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-center md:gap-4 justify-between w-full">
              <div>
                <h2 className="text-xl font-bold tracking-widest uppercase text-content flex items-center gap-2 flex-wrap">
                  {customer.name}
                  {!customer.hasAccount && (
                    <span className="text-[8px] px-2 py-0.5 uppercase tracking-widest border border-[#c5a059]/40 text-[#c5a059] bg-[#c5a059]/10 font-bold rounded-sm">
                      Guest
                    </span>
                  )}
                </h2>
                {customer.userId && (
                  <p className="text-[9px] mt-1 text-muted uppercase tracking-widest font-mono">
                    ID: {customer.userId}
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-4 md:mt-0 opacity-80 hover:opacity-100 transition-opacity whitespace-nowrap">
                {customer.phone && (
                   <div className="flex items-center">
                     <select 
                       value={whatsappTemplateType}
                       onChange={(e) => setWhatsappTemplateType(e.target.value)}
                       className="text-[9px] uppercase font-bold tracking-widest text-muted border border-[#c5a059]/30 border-r-0 px-2 py-1.5 focus:outline-none bg-surface"
                     >
                       <option value="general">General</option>
                       <option value="payment">Payment Follow-up</option>
                       <option value="order">Order Update</option>
                       <option value="support">Support Update</option>
                       <option value="build">Build Follow-up</option>
                     </select>
                     <button
                       onClick={handleCopyWhatsApp}
                       className="text-[9px] uppercase font-bold tracking-widest text-[#c5a059] border border-[#c5a059]/30 px-3 py-1.5 hover:bg-[#c5a059]/10 flex items-center gap-1.5 group transition-colors"
                     >
                       <Copy className="w-3 h-3" />
                       Copy WA Msg
                     </button>
                   </div>
                )}
                {customer.userId && (
                   <button
                     onClick={() => setShowTicketModal(true)}
                     className="text-[9px] uppercase font-bold tracking-widest text-[#c5a059] border border-[#c5a059]/30 px-3 py-1.5 hover:bg-[#c5a059]/10 flex items-center gap-1.5 group transition-colors"
                   >
                     <MessageSquarePlus className="w-3 h-3" />
                     Open Ticket
                   </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-5 text-[11px] text-muted w-full font-medium">
              <span className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                {customer.email || "N/A"}
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                {customer.phone || "N/A"}
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                DOB: {customer.dob || "Unknown"}
              </span>
              <span className="flex items-start gap-2 sm:col-span-2 md:col-span-3 mt-1">
                <Home className="w-3.5 h-3.5 text-[#c5a059] shrink-0 mt-0.5" />
                <span className="leading-relaxed whitespace-pre-line">
                  {typeof customer.address === 'object' && customer.address !== null
                    ? [(customer.address as any).line1, (customer.address as any).line2, (customer.address as any).city, (customer.address as any).state, (customer.address as any).pincode, (customer.address as any).country].filter(Boolean).join(', ')
                    : (customer.address || "No address on file.")}
                  {customer.city && typeof customer.address !== 'object' && `\n${customer.city}`}
                  {customer.state && typeof customer.address !== 'object' && `, ${customer.state}`}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="text-left xl:text-right shrink-0 border-t xl:border-t-0 xl:border-l border-[#c5a059]/10 pt-6 xl:pt-0 xl:pl-8 w-full xl:w-auto h-full flex flex-col justify-center">
          <p className="text-[10px] uppercase tracking-widest text-muted font-bold">
            Lifetime Value (Confirmed)
          </p>
          <p className="text-2xl md:text-4xl font-mono tracking-tight text-premium-gold-text mt-1 font-bold">
            ₹{customer.lifetimeSpend.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted uppercase tracking-widest mt-2 flex items-center xl:justify-end gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#c5a059]" /> Reg:{" "}
            {customer.registeredDate
              ? customer.registeredDate.toLocaleDateString()
              : "Guest"}
          </p>
          {customer.lastOrderDate && (
             <p className="text-[10px] text-muted uppercase tracking-widest mt-1 flex items-center xl:justify-end gap-1.5">
               <ShoppingBag className="w-3.5 h-3.5 text-[#c5a059]" /> Last Order: {customer.lastOrderDate.toLocaleDateString()}
             </p>
          )}
          <p className="text-[10px] text-muted uppercase tracking-widest mt-1 flex items-center xl:justify-end gap-1.5">
             <User className="w-3.5 h-3.5 text-[#c5a059]" /> Profile: {[customer.name, customer.phone, customer.email, customer.city, customer.state, customer.dob].filter(Boolean).length >= 4 ? 'Complete' : 'Incomplete'}
          </p>
        </div>
      </RevealSection>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[#c5a059]/10 text-[10px] font-bold tracking-widest uppercase overflow-x-auto w-full no-scrollbar">
        {['Overview', 'Orders', 'Saved Builds', 'Support', 'Notes'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={clsx(
              "pb-3 px-2 border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab ? "border-[#c5a059] text-[#c5a059]" : "border-transparent text-muted hover:text-content"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Metrics Row */}
      {activeTab === 'Overview' && (
      <RevealSection
        delay={100}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-surface border border-[#c5a059]/10 p-5 flex flex-col justify-between">
          <h3 className="text-[10px] tracking-widest uppercase text-muted font-bold flex items-center gap-2 mb-3">
            <ShoppingBag className="w-3.5 h-3.5 text-[#c5a059]" /> Total Orders
          </h3>
          <p className="text-2xl font-bold text-content font-mono">
            {customer.orders.length}
          </p>
        </div>
        <div className="bg-surface border border-[#c5a059]/10 p-5 flex flex-col justify-between">
          <h3 className="text-[10px] tracking-widest uppercase text-muted font-bold flex items-center gap-2 mb-3">
            <DollarSign className="w-3.5 h-3.5 text-[#c5a059]" /> Avg Order
          </h3>
          <p className="text-2xl font-bold text-content font-mono">
            ₹{Math.round(customer.averageOrderValue).toLocaleString()}
          </p>
        </div>
        <div className="bg-surface border border-[#c5a059]/10 p-5 flex flex-col justify-between">
          <h3 className="text-[10px] tracking-widest uppercase text-muted font-bold mb-3">
            Pref. Series
          </h3>
          <p className="text-lg font-bold text-content uppercase tracking-wider truncate">
            {customer.preferredSeries}
          </p>
          <p className="text-[9px] text-premium-gold-text font-bold uppercase tracking-widest mt-1 truncate">
            {customer.preferredSubSeries}
          </p>
        </div>
        <div className="bg-surface border border-[#c5a059]/10 p-5 flex flex-col justify-between">
          <h3 className="text-[10px] tracking-widest uppercase text-muted font-bold mb-3">
            Saved Builds
          </h3>
          <p className="text-2xl font-bold text-content font-mono">
            {customer.savedBuilds.length}
          </p>
        </div>
      </RevealSection>
      )}

      {activeTab === 'Orders' && (
        <div className="space-y-8">
          <RevealSection delay={150}>
            <div className="flex items-center justify-between mb-4 border-b border-[#c5a059]/10 pb-2">
              <h3 className="text-[11px] font-bold tracking-widest text-[#c5a059] uppercase">
                Order History
              </h3>
            </div>
            {customer.orders.length === 0 ? (
              <p className="text-[10px] text-muted italic uppercase tracking-widest p-6 border border-dashed border-[#c5a059]/10 text-center">
                No orders discovered.
              </p>
            ) : (
              <div className="space-y-3">
                {customer.orders.map((order) => {
                   const isPaid = order.payment?.status === "confirmed" || order.paymentStatus === "confirmed";
                   return (
                  <Link
                    to={`/admin/orders?id=${order.id}`}
                    key={order.id}
                    className="block group"
                  >
                    <div className="bg-surface border border-[#c5a059]/10 p-4 hover:border-[#c5a059]/30 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold font-mono text-content uppercase group-hover:text-[#c5a059] transition-colors">
                            #{order.receiptNumber || order.id.substring(0, 8)}
                          </span>
                          <span className="text-[9px] text-[#c5a059]/60 tracking-widest uppercase flex items-center">
                            • {new Date(
                              order.createdAt?.toMillis
                                ? order.createdAt.toMillis()
                                : order.createdAt || 0,
                            ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <p className="text-[10px] text-content uppercase tracking-widest truncate max-w-[200px] sm:max-w-xs">
                          {order.items?.length || 0} Items • {order.items?.map((i:any) => i.product?.name || i.productName).join(", ")}
                        </p>
                      </div>
                      <div className="flex flex-row items-center justify-between w-full sm:w-auto gap-4">
                        <span
                          className={clsx(
                            "px-2 py-1 text-[9px] font-bold uppercase tracking-widest border border-transparent whitespace-nowrap",
                            order.status === "Delivered"
                              ? "bg-green-500/10 text-green-500"
                              : order.status === "Cancelled"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-[#c5a059]/10 text-[#c5a059]"
                          )}
                        >
                          {order.status || "ORDER PLACED"}
                        </span>
                        <div className="text-right flex flex-col items-end">
                           <span className="text-sm font-bold text-content font-mono">
                             ₹{(order.totalPrice || order.pricing?.total || 0).toLocaleString()}
                           </span>
                           {!isPaid && order.status !== 'Cancelled' && (
                              <span className="text-[8px] uppercase tracking-widest text-red-400 mt-0.5">Unpaid</span>
                           )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )})}
              </div>
            )}
          </RevealSection>
        </div>
      )}

      {activeTab === 'Saved Builds' && (
        <div className="space-y-8">
          <RevealSection delay={200}>
            <div className="flex items-center justify-between mb-4 border-b border-[#c5a059]/10 pb-2">
              <h3 className="text-[11px] font-bold tracking-widest text-[#c5a059] uppercase">
                Saved Builds
              </h3>
            </div>
            {customer.savedBuilds.length === 0 ? (
              <p className="text-[10px] text-muted italic uppercase tracking-widest p-6 border border-dashed border-[#c5a059]/10 text-center">
                No saved builds found.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customer.savedBuilds.map((build) => (
                  <div
                    key={build.id}
                    className="bg-bg border border-[#c5a059]/10 p-4 hover:border-[#c5a059]/30 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-content tracking-widest uppercase mb-1 line-clamp-1">
                        {build.productName || "Custom Build"}
                      </p>
                      <span className="text-[9px] text-muted tracking-widest uppercase">
                        {new Date(
                          build.createdAt?.toMillis
                            ? build.createdAt.toMillis()
                            : build.createdAt || 0,
                        ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric"})}
                      </span>
                    </div>
                    <div className="mt-4 flex justify-between items-end">
                      <p className="text-sm text-[#c5a059] font-bold font-mono">
                        ₹{(build.pricing?.total || 0).toLocaleString()}
                      </p>
                      <Link to={`/admin/builds?id=${build.id}`} className="text-[9px] font-bold uppercase tracking-widest hover:underline text-content">
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </RevealSection>
        </div>
      )}

      {activeTab === 'Support' && (
        <div className="space-y-8">
          <RevealSection delay={250}>
            <div className="flex items-center justify-between mb-4 border-b border-[#c5a059]/10 pb-2">
              <h3 className="text-[11px] font-bold tracking-widest text-[#c5a059] uppercase">
                Service Records
              </h3>
            </div>

            {customer.tickets.length === 0 ? (
              <p className="text-[10px] text-muted italic uppercase tracking-widest p-6 border border-dashed border-[#c5a059]/10 text-center">
                No support tickets found.
              </p>
            ) : (
              <div className="space-y-3">
                {customer.tickets.map((t) => (
                  <Link
                    to={`/admin/support?id=${t.id}`}
                    key={t.id}
                    className="block group"
                  >
                    <div className="bg-bg border border-[#c5a059]/10 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-[#c5a059]/30 transition-colors">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#c5a059] mb-1 block">
                          {t.type ? t.type.replace(/_/g, " ") : "General"}
                        </span>
                        <p className="text-xs text-content group-hover:text-[#c5a059] transition-colors truncate max-w-sm">
                          {t.subject}
                        </p>
                      </div>
                      <span
                        className={clsx(
                          "text-[9px] font-bold uppercase tracking-widest border px-2 py-1 whitespace-nowrap",
                          t.status === "open"
                            ? "border-red-500/30 text-red-500 bg-red-500/10"
                            : t.status === "under_review"
                              ? "border-yellow-500/30 text-yellow-500 bg-yellow-500/10"
                              : "border-green-500/30 text-green-500 bg-green-500/10",
                        )}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </RevealSection>
        </div>
      )}

      {activeTab === 'Notes' && (
        <RevealSection delay={300}>
          <div className="bg-surface border border-[#c5a059]/20 p-6 flex flex-col shadow-sm max-w-3xl">
            <h3 className="text-[11px] font-bold tracking-widest text-[#c5a059] uppercase mb-4 flex items-center justify-between border-b border-[#c5a059]/10 pb-2">
              Admin Internal Notes
              {loadingNote && (
                <span className="w-3 h-3 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin"></span>
              )}
            </h3>
            {customer.userId ? (
              <div className="flex-1 flex flex-col">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Capture preferences, pain points, VIP status, or other internal notes..."
                  className="flex-1 min-h-[300px] w-full bg-bg border border-[#c5a059]/20 p-4 text-xs focus:outline-none focus:border-[#c5a059] transition-colors resize-none text-content font-mono placeholder:font-sans placeholder-muted/50 mb-4 tracking-wide leading-relaxed"
                />
                <GoldButton
                  onClick={handleSaveNote}
                  disabled={savingNote || loadingNote}
                  className="text-[10px] py-3 px-4 w-full uppercase font-bold tracking-widest flex items-center justify-center gap-2"
                >
                  {savingNote ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Notes
                    </>
                  )}
                </GoldButton>
              </div>
            ) : (
              <div className="p-6 bg-bg border border-dashed border-[#c5a059]/20 text-center flex flex-col items-center">
                <User className="w-6 h-6 text-muted mb-2" />
                <p className="text-[10px] text-muted uppercase tracking-widest">
                  Guest User
                </p>
                <p className="text-[9px] text-muted/60 mt-2 uppercase tracking-widest">
                  Admin notes require a registered account.
                </p>
              </div>
            )}
          </div>
        </RevealSection>
      )}

      {showTicketModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/80 ">
          <RevealSection className="bg-surface border border-[#c5a059]/30 p-8 w-full max-w-lg shadow-sm">
            <h2 className="text-lg font-bold tracking-widest uppercase text-content mb-6">
              Open Support Ticket
            </h2>
            <p className="text-xs text-muted mb-6">
              Create a ticket on behalf of{" "}
              <span className="text-[#c5a059] font-bold">{customer.name}</span>.
            </p>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm focus:outline-none focus:border-[#c5a059] text-content placeholder-muted/50 transition-colors"
                  placeholder="e.g. Missing Accessories in Order"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">
                  Initial Message
                </label>
                <textarea
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  className="w-full bg-bg border border-[#c5a059]/20 p-3 text-sm focus:outline-none focus:border-[#c5a059] text-content placeholder-muted/50 transition-colors h-32 resize-none"
                  placeholder="Hi there, checking on..."
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="flex-1 py-3 text-[10px] font-bold tracking-widest uppercase border border-transparent text-muted hover:text-content transition-colors bg-bg"
                >
                  Cancel
                </button>
                <GoldButton
                  type="submit"
                  disabled={creatingTicket}
                  className="flex-1 py-3 text-[10px] font-bold tracking-widest uppercase"
                >
                  {creatingTicket ? "Creating..." : "Create Ticket"}
                </GoldButton>
              </div>
            </form>
          </RevealSection>
        </div>
      )}
    </div>
  );
}

type FilterOption =
  | "all"
  | "with_orders"
  | "repeat"
  | "open_support"
  | "high_value"
  | "saved_builds"
  | "no_orders"
  | "recently_joined";

export function AdminCustomersPage() {
  const { customers, loading } = useCustomers();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");

  useEffect(() => {
    // Prefer router state (no PII/ids in the URL); keep query-string as a
    // backward-compatible fallback for any old links.
    const userId = (location.state as { userId?: string } | null)?.userId || searchParams.get("userId");
    if (userId && customers.length > 0 && !selectedCustomerId) {
      const match = customers.find((c) => c.userId === userId);
      if (match) setSelectedCustomerId(match.id);
    }
  }, [location.state, searchParams, customers, selectedCustomerId]);

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8 pb-16 font-sans">
         <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-[#c5a059]/10 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-surface/50 animate-pulse border border-[#c5a059]/20" />
                <div className="w-48 h-8 bg-surface/50 animate-pulse border border-[#c5a059]/20" />
              </div>
              <div className="w-32 h-3 bg-surface/30 animate-pulse rounded mt-2" />
            </div>
            <div className="flex flex-col lg:flex-row w-full xl:w-auto gap-4">
              <div className="w-full lg:w-48 h-9 bg-surface/30 animate-pulse border border-[#c5a059]/20" />
              <div className="w-full lg:w-64 h-9 bg-surface/30 animate-pulse border border-[#c5a059]/20" />
            </div>
         </div>
         <div className="hidden lg:grid grid-cols-12 gap-4 p-4 border-b border-[#c5a059]/20">
            <div className="col-span-4 h-3 bg-surface/30 animate-pulse" />
            <div className="col-span-1 h-3 bg-surface/30 animate-pulse" />
            <div className="col-span-2 h-3 bg-surface/30 animate-pulse" />
            <div className="col-span-2 h-3 bg-surface/30 animate-pulse" />
            <div className="col-span-2 h-3 bg-surface/30 animate-pulse" />
            <div className="col-span-1 h-3 bg-surface/30 animate-pulse" />
         </div>
         <div className="flex flex-col gap-4 lg:gap-2">
           {[1,2,3,4,5].map(k => (
              <div key={k} className="h-24 lg:h-16 bg-surface/20 animate-pulse border border-[#c5a059]/10" />
           ))}
         </div>
      </div>
    );
  }

  const filteredCustomers = customers.filter((c) => {
    let matchesFilter = true;
    if (activeFilter === "with_orders") matchesFilter = c.orders.length > 0;
    else if (activeFilter === "no_orders") matchesFilter = c.orders.length === 0;
    else if (activeFilter === "repeat") matchesFilter = c.orders.length > 1;
    else if (activeFilter === "open_support")
      matchesFilter = c.tickets.some(
        (t) => t.status === "open" || t.status === "under_review",
      );
    else if (activeFilter === "high_value")
      matchesFilter = c.lifetimeSpend >= 100000;
    else if (activeFilter === "saved_builds")
      matchesFilter = c.savedBuilds.length > 0;
    else if (activeFilter === "recently_joined") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchesFilter = c.registeredDate ? c.registeredDate > thirtyDaysAgo : false;
    }

    if (!matchesFilter) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term) ||
      c.city.toLowerCase().includes(term) ||
      c.orders.some(o => o.id.toLowerCase().includes(term) || o.receiptNumber?.toLowerCase().includes(term)) ||
      (c.userId && c.userId.toLowerCase().includes(term))
    );
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  if (selectedCustomer) {
    return (
      <Customer360
        customer={selectedCustomer}
        onBack={() => setSelectedCustomerId(null)}
      />
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-16 font-sans border-t border-transparent h-full flex flex-col">
      <RevealSection className="shrink-0">
        <PageHeader
          eyebrow="Relationships"
          title="Customers CRM"
          description={`Showing ${filteredCustomers.length} ${filteredCustomers.length === 1 ? 'customer' : 'customers'}`}
          actions={
        <div className="flex flex-col lg:flex-row w-full xl:w-auto gap-4 shrink-0">
          {/* Filters */}
          <div className="relative w-full lg:w-48 shrink-0">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as FilterOption)}
              className="w-full appearance-none bg-surface border border-[#c5a059]/30 px-3 py-2 pr-8 text-[10px] min-h-[36px] font-bold tracking-widest uppercase transition-colors text-[#c5a059] focus:outline-none focus:border-[#c5a059] cursor-pointer"
            >
              {[
                { id: "all", label: "All Customers" },
                { id: "with_orders", label: "With Orders" },
                { id: "no_orders", label: "No Orders Yet" },
                { id: "saved_builds", label: "Saved Builds" },
                { id: "repeat", label: "Repeat" },
                { id: "high_value", label: "High Value" },
                { id: "recently_joined", label: "Recently Joined" },
                { id: "open_support", label: "Needs Support" },
              ].map((f) => (
                <option key={f.id} value={f.id} className="bg-bg text-content">
                  {f.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#c5a059]">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
              </svg>
            </div>
          </div>

          <div className="relative w-full lg:w-64 shrink-0">
            <input
              type="text"
              placeholder="Search name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-[#c5a059]/20 pl-9 pr-4 py-2 text-[10px] min-h-[36px] uppercase tracking-widest focus:outline-none focus:border-[#c5a059] transition-colors text-content placeholder-muted"
            />
            <Search className="w-3.5 h-3.5 text-[#c5a059] absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
          }
        />
      </RevealSection>

      <div className="flex-1 overflow-hidden flex flex-col w-full pb-10">
        {filteredCustomers.length === 0 ? (
          <div className="border border-[#c5a059]/10 border-dashed bg-surface/30">
            <EmptyState icon={User} title="No customers found" description="Try adjusting your filters or search query." />
          </div>
        ) : (
          <div className="flex flex-col w-full h-full overflow-y-auto mt-2">
            {/* Desktop Table Header */}
            <div className="hidden lg:grid grid-cols-12 gap-4 p-4 text-[9px] font-bold tracking-[0.2em] uppercase text-muted border-b border-[#c5a059]/20 sticky top-0 bg-bg z-raised w-full mb-2">
              <div className="col-span-4">Customer</div>
              <div className="col-span-1 text-center">Orders</div>
              <div className="col-span-2 text-right">Confirmed Spend</div>
              <div className="col-span-2">Last Active</div>
              <div className="col-span-2 text-center">Tickets & Builds</div>
              <div className="col-span-1 text-right">Pref. Series</div>
            </div>

            {/* List Body (Table rows on Desktop, Cards on Mobile) */}
            <div className="flex flex-col gap-4 lg:gap-2 w-full relative">
              {filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className="group bg-surface/40 hover:bg-surface/80 border border-[#c5a059]/10 hover:border-[#c5a059]/30 transition-colors p-5 lg:p-4 flex flex-col lg:grid lg:grid-cols-12 gap-y-4 lg:gap-4 items-start lg:items-center cursor-pointer relative"
                >
                  <div className="col-span-4 hover:opacity-80 transition-opacity w-full flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-bg border border-[#c5a059]/20 flex flex-shrink-0 items-center justify-center group-hover:border-[#c5a059]/50 transition-colors">
                       <User className="w-4 h-4 text-[#c5a059]" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-xs uppercase tracking-wider font-bold text-content truncate group-hover:text-[#c5a059] transition-colors">{c.name}</p>
                       <p className="text-[10px] text-muted tracking-widest uppercase mt-0.5 truncate">
                         {c.email || c.phone || 'Guest'}
                         {c.city && <span className="hidden sm:inline"> • {c.city}</span>}
                       </p>
                     </div>
                  </div>

                  {/* Mobile Only: Orders & Spend Inline */}
                  <div className="lg:hidden flex justify-between items-center w-full border-t border-[#c5a059]/10 pt-3">
                     <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-premium-gold-text tracking-widest uppercase">{c.orders.length} order(s)</span>
                     </div>
                     <div className="text-right">
                       <p className="text-xs font-bold text-[#c5a059] font-mono">₹{c.lifetimeSpend.toLocaleString()}</p>
                       <p className="text-[8px] text-muted uppercase tracking-widest mt-0.5">Spend</p>
                     </div>
                  </div>

                  {/* Desktop Only: Orders Count */}
                  <div className="hidden lg:flex col-span-1 justify-center">
                    <span className="text-xs font-bold text-[#c5a059] bg-[#c5a059]/10 px-2 py-0.5 border border-[#c5a059]/20">{c.orders.length}</span>
                  </div>

                  {/* Desktop Only: Confirmed Spend */}
                  <div className="hidden lg:flex col-span-2 flex-col items-end">
                    <p className="text-xs font-bold text-content font-mono">₹{c.lifetimeSpend.toLocaleString()}</p>
                    <p className="text-[9px] text-muted uppercase tracking-widest mt-0.5">AOV: ₹{Math.round(c.averageOrderValue).toLocaleString()}</p>
                  </div>

                  {/* Last Active (Visible both logic) */}
                  <div className="col-span-2 w-full flex flex-row lg:flex-col justify-between items-center lg:items-start lg:block border-t border-[#c5a059]/10 pt-3 lg:border-t-0 lg:pt-0">
                     <span className="lg:hidden text-[9px] uppercase tracking-widest text-[#c5a059] font-bold">Last Active</span>
                     <div className="text-right lg:text-left flex flex-col items-end lg:items-start">
                       {c.lastOrderDate ? (
                          <p className="text-[9px] text-content uppercase tracking-widest flex items-center gap-1.5 font-bold">
                            <Clock className="w-3.5 h-3.5 text-[#c5a059] hidden lg:block" /> {c.lastOrderDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric"})}
                          </p>
                       ) : (
                          <p className="text-[10px] text-muted uppercase tracking-widest">-</p>
                       )}
                       <p className="hidden lg:block text-[8px] text-muted uppercase tracking-widest mt-1">
                          Reg: {c.registeredDate ? c.registeredDate.toLocaleDateString("en-US", { month: "short", year: "numeric", day: "numeric" }) : 'Guest'}
                       </p>
                     </div>
                  </div>

                  {/* Analytics Badges */}
                  <div className="col-span-2 w-full flex items-center lg:justify-center gap-2 border-t border-[#c5a059]/10 pt-3 lg:border-t-0 lg:pt-0">
                    {c.tickets.length > 0 && (
                       <span className={clsx(
                         "px-2 py-1 border text-[9px] font-bold uppercase tracking-widest whitespace-nowrap",
                         c.tickets.some(t => t.status === "open") ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-[#c5a059]/10 text-premium-gold-text border-[#c5a059]/20"
                       )}>
                         {c.tickets.length} Ticket(s)
                       </span>
                    )}
                    {c.savedBuilds.length > 0 && (
                       <span className="px-2 py-1 border text-[9px] font-bold uppercase tracking-widest whitespace-nowrap bg-blue-500/10 text-blue-500 border-blue-500/20">
                         {c.savedBuilds.length} Build(s)
                       </span>
                    )}
                    {c.tickets.length === 0 && c.savedBuilds.length === 0 && (
                      <span className="text-[9px] text-muted uppercase tracking-widest italic">-</span>
                    )}
                  </div>

                  {/* Preferred Series & Arrow Action */}
                  <div className="hidden lg:flex col-span-1 justify-end items-center w-full gap-4">
                     {c.preferredSeries !== "N/A" ? (
                       <div className="flex flex-col items-end">
                         <span className="text-[10px] font-bold text-content uppercase tracking-widest truncate">{c.preferredSeries}</span>
                         <span className="text-[8px] text-[#c5a059] uppercase tracking-widest mt-0.5 truncate">{c.preferredSubSeries}</span>
                       </div>
                     ) : (
                       <span className="text-[10px] text-muted uppercase tracking-widest italic">-</span>
                     )}
                     <ArrowLeft className="w-4 h-4 text-[#c5a059] opacity-0 group-hover:opacity-100 transition-opacity rotate-180" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
