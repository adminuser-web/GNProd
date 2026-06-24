import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { GoldButton } from './GoldButton';
import { enquiryService } from '../features/enquiries/services/enquiryService';
import { Enquiry, EnquiryType } from '../features/enquiries/types';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';

interface EnquiryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  source: Enquiry['source'];
  productRef?: Enquiry['productRef'];
  defaultType?: EnquiryType;
  title?: string;
  description?: string;
}

export function EnquiryDrawer({ 
  isOpen, 
  onClose, 
  source, 
  productRef, 
  defaultType = 'product_enquiry',
  title = "Send an Enquiry",
  description = "Have questions about a bat or a custom build? Send us a message and our experts will get back to you soon."
}: EnquiryDrawerProps) {
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;
  
  const [formData, setFormData] = useState({
    customerName: user?.displayName || '',
    customerEmail: user?.email || '',
    customerPhone: '',
    type: defaultType,
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerPhone || !formData.message) {
      toast.error('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    try {
      await enquiryService.submitEnquiry({
        userId: user?.uid,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        type: formData.type as EnquiryType,
        message: formData.message,
        source,
        productRef,
        priority: 'normal',
      });
      toast.success('Your enquiry has been sent. We will get back to you shortly.');
      onClose();
      // Reset form
      setFormData({
        customerName: user?.displayName || '',
        customerEmail: user?.email || '',
        customerPhone: '',
        type: defaultType,
        message: ''
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit enquiry');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-bg border-l border-[#c5a059]/20 shadow-2xl z-[100] flex flex-col transform transition-transform duration-300">
        <div className="flex justify-between items-center p-6 border-b border-[#c5a059]/20">
          <h2 className="text-lg font-bold tracking-[0.2em] uppercase text-content">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-[#c5a059] transition-colors p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-muted text-sm mb-6 leading-relaxed">
            {description}
          </p>
          
          {productRef && (
            <div className="mb-6 bg-surface border border-[#c5a059]/20 p-4 text-xs font-mono text-content">
              <strong>Ref:</strong> {productRef.seriesName} {productRef.subSeriesName ? `/ ${productRef.subSeriesName}` : ''}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#c5a059] mb-1">Enquiry Type *</label>
              <select 
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full bg-surface border border-[#c5a059]/30 text-content px-4 py-3 text-sm focus:border-[#c5a059] focus:outline-none"
              >
                <option value="product_enquiry">Product Enquiry</option>
                <option value="custom_build">Custom Build Request</option>
                <option value="bulk_order">Bulk Order</option>
                <option value="pro_consultation">Pro Consultation</option>
                <option value="cleft_selection">Request Cleft Selection</option>
                <option value="general">General Question</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#c5a059] mb-1">Name *</label>
              <input 
                type="text" 
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                required
                className="w-full bg-surface border border-[#c5a059]/30 text-content px-4 py-3 text-sm focus:border-[#c5a059] focus:outline-none"
                placeholder="Full Name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#c5a059] mb-1">Phone *</label>
                <input 
                  type="tel" 
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  required
                  className="w-full bg-surface border border-[#c5a059]/30 text-content px-4 py-3 text-sm focus:border-[#c5a059] focus:outline-none"
                  placeholder="+91"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#c5a059] mb-1">Email (Optional)</label>
                <input 
                  type="email" 
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleChange}
                  className="w-full bg-surface border border-[#c5a059]/30 text-content px-4 py-3 text-sm focus:border-[#c5a059] focus:outline-none"
                  placeholder="name@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#c5a059] mb-1">Message *</label>
              <textarea 
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={4}
                className="w-full bg-surface border border-[#c5a059]/30 text-content px-4 py-3 text-sm focus:border-[#c5a059] focus:outline-none resize-none"
                placeholder="Tell us what you are looking for..."
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-[#c5a059]/20 bg-surface">
          <GoldButton 
            className="w-full" 
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? 'Sending...' : (
              <span className="flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> Send Enquiry
              </span>
            )}
          </GoldButton>
        </div>
      </div>
    </>
  );
}
