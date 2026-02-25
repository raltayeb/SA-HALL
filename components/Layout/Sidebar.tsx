
import React from 'react';
import { UserProfile } from '../../types';
import {
  LayoutDashboard, Users, Building2, ClipboardList,
  CalendarDays, Settings, X, Tag,
  FileText, BarChart3, Layers, Inbox, Bell,
  Receipt, Store, LogOut, Star, Megaphone, UserCheck
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useNotifications } from '../../context/NotificationContext';

interface SidebarProps {
  user: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  platformLogo?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout, isOpen, setIsOpen, platformLogo }) => {
  const { unreadCount, markAllAsRead } = useNotifications();

  if (!user) return null;

  let menuGroups = [];

  if (user.role === 'super_admin') {
    menuGroups = [
      {
        title: "لوحة القيادة",
        items: [
          { id: 'admin_dashboard', label: 'نظرة عامة', icon: <BarChart3 className="w-5 h-5" /> },
          { id: 'admin_requests', label: 'الطلبات والترقيات', icon: <Inbox className="w-5 h-5" /> },
        ]
      },
      {
        title: "إدارة المنصة",
        items: [
          { id: 'admin_halls', label: 'إدارة القاعات', icon: <Building2 className="w-5 h-5" /> },
          { id: 'admin_subscribers', label: 'إدارة المشتركين', icon: <UserCheck className="w-5 h-5" /> },
          { id: 'admin_store', label: 'إدارة المتجر (POS)', icon: <Store className="w-5 h-5" /> },
        ]
      },
      {
        title: "الإعدادات والمحتوى",
        items: [
          { id: 'admin_cms', label: 'إدارة المحتوى', icon: <FileText className="w-5 h-5" /> },
          { id: 'settings', label: 'إعدادات النظام', icon: <Settings className="w-5 h-5" /> },
        ]
      }
    ];
  } else if (user.role === 'vendor') {
    menuGroups = [
      {
        title: "الرئيسية",
        items: [
          { id: 'dashboard', label: 'لوحة المعلومات', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'calendar', label: 'التقويم', icon: <CalendarDays className="w-5 h-5" /> },
          { id: 'hall_bookings', label: 'سجل الحجوزات', icon: <ClipboardList className="w-5 h-5" /> },
        ]
      },
      {
        title: "المالية والمشتريات",
        items: [
          { id: 'accounting', label: 'الفواتير والحسابات', icon: <Receipt className="w-5 h-5" /> },
          { id: 'coupons', label: 'الخصومات والعروض', icon: <Tag className="w-5 h-5" /> },
          { id: 'vendor_marketplace', label: 'متجر المنصة', icon: <Store className="w-5 h-5" /> },
        ]
      },
      {
        title: "إدارة الأصول",
        items: [
          { id: 'my_halls', label: 'القاعات', icon: <Building2 className="w-5 h-5" /> },
          // Chalets removed
        ]
      },
      {
        title: "الإعدادات",
        items: [
          { id: 'brand_settings', label: 'إعدادات المنشأة', icon: <Settings className="w-5 h-5" /> },
        ]
      }
    ];
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
      
      <aside className={`
        fixed inset-y-4 right-4 z-50 w-72 bg-white/95 backdrop-blur-md border border-gray-200 rounded-[2rem] transition-transform duration-300 ease-in-out flex flex-col overflow-hidden
        ${isOpen ? 'translate-x-0' : 'translate-x-[110%] lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="h-24 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-4 w-full">
            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center p-2 overflow-hidden group">
                <img src={platformLogo || "https://dash.hall.sa/logo.svg"} alt="Logo" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-ruqaa text-primary leading-none mt-1">القاعة</h1>
              <span className="text-[10px] font-bold text-gray-400 mt-1">
                {user.role === 'super_admin' ? 'الإدارة العليا' : user.role === 'vendor' ? 'شريك أعمال' : ''}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="mr-auto lg:hidden text-gray-400" onClick={() => setIsOpen(false)}><X className="w-5 h-5" /></Button>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-black text-primary uppercase">
                  {user.full_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{user.full_name}</p>
                  <p className="text-[9px] font-bold text-gray-400 truncate">{user.email}</p>
              </div>
              <button 
                onClick={() => { setActiveTab(user.role === 'vendor' ? 'hall_bookings' : 'guest_dashboard'); markAllAsRead(); }} 
                className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-primary text-gray-400 hover:text-primary transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
            </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2 px-4 space-y-6 custom-scrollbar">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="px-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map(item => (
                    <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsOpen(false); }}
                    className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-bold border
                        ${activeTab === item.id 
                        ? 'bg-primary text-white border-primary' 
                        : 'text-gray-500 bg-white border-transparent hover:bg-gray-50 hover:border-gray-100 hover:text-gray-900'}
                    `}
                    >
                    <div className={activeTab === item.id ? 'text-white' : 'text-gray-400'}>{item.icon}</div>
                    <span>{item.label}</span>
                    </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
            <button 
              onClick={onLogout}
              className="w-full h-12 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-red-100"
            >
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </button>
        </div>
      </aside>
    </>
  );
};
