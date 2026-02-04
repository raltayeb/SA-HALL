
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { UserProfile, Hall } from '../../types';
import { 
  LayoutDashboard, Users, Building2, ClipboardList, Search, Ticket, LogOut, 
  Sparkles, Heart, CalendarDays, Settings, Palette, X, ShoppingCart, Tag, 
  ChevronDown, LayoutGrid, FileText, BarChart3, ShieldCheck, Layers, Inbox, Bell,
  Receipt, Wallet
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
  const [selectedContextId, setSelectedContextId] = useState<string>('all');
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
        title: "المالية",
        items: [
          { id: 'accounting', label: 'الفواتير والحسابات', icon: <Receipt className="w-5 h-5" /> },
          { id: 'pos', label: 'نقاط البيع (POS)', icon: <ShoppingCart className="w-5 h-5" /> },
          { id: 'coupons', label: 'العروض والخصم', icon: <Tag className="w-5 h-5" /> },
        ]
      },
      {
        title: "إدارة الأصول",
        items: [
          { id: 'my_halls', label: 'القاعات', icon: <Building2 className="w-5 h-5" /> },
          { id: 'my_services', label: 'الخدمات', icon: <Sparkles className="w-5 h-5" /> },
          { id: 'hall_bookings', label: 'سجل الحجوزات', icon: <ClipboardList className="w-5 h-5" /> },
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
    menuGroups = [
      {
        title: "حسابي",
        items: [
          { id: 'browse', label: 'تصفح القاعات', icon: <Search className="w-5 h-5" /> },
          { id: 'my_favorites', label: 'المفضلة', icon: <Heart className="w-5 h-5" /> },
          { id: 'my_bookings', label: 'حجوزاتي', icon: <Ticket className="w-5 h-5" /> },
        ]
      }
    ];
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
      
      <aside className={`
        fixed inset-y-4 right-4 z-50 w-72 bg-card border border-border rounded-3xl transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : 'translate-x-[110%] lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="h-24 flex items-center px-6 border-b border-border/40">
          <div className="flex items-center gap-4 w-full">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
                {/* Logo Placeholder */}
                <span className="font-ruqaa text-2xl pb-2">ق</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-ruqaa text-foreground leading-none mt-1">القاعة</h1>
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full w-fit mt-1">
                {user.role === 'super_admin' ? 'الإدارة العليا' : user.role === 'vendor' ? 'شريك أعمال' : 'حساب شخصي'}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="mr-auto lg:hidden text-muted-foreground" onClick={() => setIsOpen(false)}><X className="w-5 h-5" /></Button>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-4">
            <div className="bg-muted/40 p-3 rounded-2xl border border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background border flex items-center justify-center text-sm font-bold text-primary uppercase shadow-sm">
                  {user.full_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{user.full_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <button 
                onClick={() => { setActiveTab('hall_bookings'); markAllAsRead(); }} 
                className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background transition-colors text-muted-foreground"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>
            </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2 px-4 space-y-6 custom-scrollbar">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="px-3 text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 opacity-70">{group.title}</h3>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsOpen(false); }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-bold group relative
                    ${activeTab === item.id 
                      ? 'bg-primary text-white' 
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}
                  `}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {activeTab === item.id && (
                    <div className="absolute left-4 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/40">
            <button 
              onClick={onLogout}
              className="w-full h-12 flex items-center justify-center gap-2 text-destructive hover:bg-destructive/5 rounded-2xl text-sm font-bold transition-all border border-transparent hover:border-destructive/10"
            >
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </button>
        </div>
      </aside>
    </>
  );
};
