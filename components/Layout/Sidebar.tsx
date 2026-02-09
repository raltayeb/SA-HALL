
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { UserProfile, Hall } from '../../types';
import { 
  LayoutDashboard, Users, Building2, ClipboardList, Search, Ticket, LogOut, 
  Sparkles, Heart, CalendarDays, Settings, Palette, X, ShoppingCart, Tag, 
  ChevronDown, LayoutGrid, FileText, BarChart3, ShieldCheck, Layers, Inbox, Bell,
  Receipt, Wallet, UserCheck, Store, Palmtree
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
  siteName?: string;
  platformLogo?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout, isOpen, setIsOpen, siteName = "القاعة", platformLogo }) => {
  const [vendorHalls, setVendorHalls] = useState<Hall[]>([]);
  const { unreadCount, markAllAsRead } = useNotifications();

  useEffect(() => {
    if (user?.role === 'vendor') {
      supabase.from('halls').select('*').eq('vendor_id', user.id).then(({ data }) => {
        if (data) setVendorHalls(data);
      });
    }
  }, [user]);

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
          { id: 'admin_users', label: 'المستخدمين', icon: <Users className="w-5 h-5" /> },
          { id: 'subscriptions', label: 'الشركاء والاشتراكات', icon: <Building2 className="w-5 h-5" /> },
          { id: 'admin_store', label: 'إدارة المتجر (POS)', icon: <Store className="w-5 h-5" /> }, 
        ]
      },
      {
        title: "الإعدادات والمحتوى",
        items: [
          { id: 'admin_categories', label: 'التصنيفات', icon: <Layers className="w-5 h-5" /> },
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
          { id: 'dashboard', label: 'لوحة المعلومات', icon: <LayoutGrid className="w-5 h-5" /> },
          { id: 'calendar', label: 'التقويم والحجوزات', icon: <CalendarDays className="w-5 h-5" /> },
        ]
      },
      {
        title: "المالية والمشتريات",
        items: [
          { id: 'accounting', label: 'الفواتير والحسابات', icon: <Receipt className="w-5 h-5" /> },
          { id: 'vendor_marketplace', label: 'متجر المنصة', icon: <ShoppingCart className="w-5 h-5" /> }, 
          { id: 'coupons', label: 'العروض والخصم', icon: <Tag className="w-5 h-5" /> },
        ]
      },
      {
        title: "إدارة الأصول",
        items: [
          { id: 'my_halls', label: 'القاعات', icon: <Building2 className="w-5 h-5" /> },
          { id: 'my_chalets', label: 'الشاليهات', icon: <Palmtree className="w-5 h-5" /> },
          { id: 'my_services', label: 'الخدمات', icon: <Sparkles className="w-5 h-5" /> },
          { id: 'hall_bookings', label: 'سجل الحجوزات', icon: <ClipboardList className="w-5 h-5" /> },
          { id: 'my_clients', label: 'إدارة العملاء', icon: <UserCheck className="w-5 h-5" /> },
        ]
      },
      {
        title: "المتجر",
        items: [
          { id: 'brand_settings', label: 'الهوية والتواصل', icon: <Palette className="w-5 h-5" /> },
        ]
      }
    ];
  } else {
    // GUEST / USER VIEW - RESTRICTED TO ONLY BOOKINGS
    menuGroups = [
      {
        title: "حسابي",
        items: [
          { id: 'my_bookings', label: 'سجل الحجوزات', icon: <Ticket className="w-5 h-5" /> },
        ]
      }
    ];
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
      
      <aside className={`
        fixed inset-y-4 right-4 z-50 w-72 bg-white/95 backdrop-blur-md border border-gray-100 rounded-[2.5rem] transition-transform duration-300 ease-in-out flex flex-col overflow-hidden
        ${isOpen ? 'translate-x-0' : 'translate-x-[110%] lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="h-28 flex items-center px-6 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
          <div className="flex items-center gap-4 w-full">
            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center p-2 overflow-hidden group">
                <img src={platformLogo || "https://dash.hall.sa/logo.svg"} alt="Logo" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-ruqaa text-primary leading-none mt-1">القاعة</h1>
              <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg w-fit mt-1 border border-gray-100">
                {user.role === 'super_admin' ? 'الإدارة العليا' : user.role === 'vendor' ? 'شريك أعمال' : 'منصة الزوار'}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="mr-auto lg:hidden text-gray-400" onClick={() => setIsOpen(false)}><X className="w-5 h-5" /></Button>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-6">
            <div className="bg-gray-50/50 p-4 rounded-[2rem] border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center text-sm font-black text-primary uppercase">
                  {user.full_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{user.full_name}</p>
                  <p className="text-[9px] font-bold text-gray-400 truncate">{user.email}</p>
              </div>
              <button 
                onClick={() => { setActiveTab(user.role === 'vendor' ? 'hall_bookings' : 'my_bookings'); markAllAsRead(); }} 
                className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white border hover:border-primary/20 transition-colors text-gray-400 hover:text-primary"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
                )}
              </button>
            </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2 px-4 space-y-8 custom-scrollbar">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="px-4 text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map(item => (
                    <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsOpen(false); }}
                    className={`
                        w-full flex items-center gap-3 px-4 py-3.5 rounded-[1.2rem] transition-all duration-300 text-sm font-bold group relative overflow-hidden
                        ${activeTab === item.id 
                        ? 'bg-primary text-white' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                    `}
                    >
                    <div className={`relative z-10 ${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-primary transition-colors'}`}>{item.icon}</div>
                    <span className="relative z-10">{item.label}</span>
                    {activeTab === item.id && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20"></div>
                    )}
                    </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
            <button 
              onClick={onLogout}
              className="w-full h-14 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 rounded-[1.5rem] text-sm font-black transition-all border border-transparent hover:border-red-100"
            >
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </button>
        </div>
      </aside>
    </>
  );
};
