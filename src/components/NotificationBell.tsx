import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../features/notifications/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationBellProps {
  roleTarget?: 'customer' | 'admin';
  className?: string;
}

export function NotificationBell({ roleTarget = 'customer', className = '' }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(roleTarget);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (id: string, read: boolean) => {
    if (!read) {
      markAsRead(id);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted hover:text-[#c5a059] transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold border border-bg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-line shadow-2xl z-50 rounded-sm overflow-hidden">
          <div className="flex justify-between items-center p-3 border-b border-line bg-bg">
            <h3 className="text-xs font-bold uppercase tracking-widest text-content">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllAsRead()}
                className="text-[10px] uppercase tracking-widest text-[#c5a059] hover:text-[#d4af37] flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted text-xs">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 border-b border-line hover:bg-bg transition-colors flex flex-col gap-1 ${!notif.read ? 'bg-[#c5a059]/5' : ''}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className={`text-sm ${!notif.read ? 'font-semibold text-content text-[#c5a059]' : 'text-content'}`}>
                      {notif.title}
                    </h4>
                    {!notif.read && (
                      <span className="w-2 h-2 shrink-0 rounded-full bg-[#c5a059] mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-muted/60">
                      {notif.createdAt?.toDate ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                    </span>
                    {notif.link ? (
                      <Link 
                        to={notif.link}
                        onClick={() => handleNotificationClick(notif.id, notif.read)}
                        className="text-[10px] font-bold uppercase tracking-widest text-[#c5a059] hover:underline"
                      >
                        View Details
                      </Link>
                    ) : (
                      !notif.read && (
                        <button 
                          onClick={() => markAsRead(notif.id)}
                          className="text-[10px] uppercase tracking-widest text-muted hover:text-content"
                        >
                          Mark as read
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
