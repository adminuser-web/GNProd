import React from 'react';
import { useLocation } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { BRAND } from '../types';
import { clsx } from 'clsx';
import { MessageCircle } from 'lucide-react';

export function FloatingWhatsApp() {
  const { isDrawerOpen } = useOrder();
  const location = useLocation();

  if (isDrawerOpen) return null;

  // Check if we are on a product page to adjust bottom position on mobile
  const isProductPage = location.pathname.startsWith('/collection/');

  return (
    <a
      href={`https://wa.me/${BRAND.whatsappNumber}?text=Hi%20Grainood`}
      target="_blank"
      rel="noreferrer"
      className={clsx(
        "fixed right-6 z-dropdown flex items-center justify-center transition-transform hover:-translate-y-1",
        isProductPage ? "bottom-24 lg:bottom-8" : "bottom-8"
      )}
      aria-label="Chat on WhatsApp"
    >
      <div className="w-14 h-14 rounded-full bg-surface border border-[#c5a059] flex items-center justify-center text-[#c5a059] shadow-sm hover:bg-[#c5a059] hover:text-bg transition-colors duration-300">
        <MessageCircle size={24} />
      </div>
    </a>
  );
}
