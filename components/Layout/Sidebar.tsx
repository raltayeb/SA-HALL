
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { UserProfile, Hall } from '../../types';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  ClipboardList, 
  Search, 
  Ticket, 
  LogOut, 
  Sparkles,
  Heart,
  CalendarDays,
  Settings,
  Palette,
  X,
  ShoppingCart,
  Tag,
  ChevronDown,
  LayoutGrid,
  FileText,
  BarChart3,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { Button } from '../ui/Button';

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
        title: "نظرة عامة",
        items: [
          { id: 'admin_dashboard', label: 'لوحة القيادة', icon: <BarChart3 className="w-5 h-5" /> },
        ]
      },
      {
        title: "إدارة المستخدمين",
        items: [
          { id: 'admin_users', label: 'كافة المستخدمين', icon: <Users className="w-5 h-5" /> },
          { id: 'subscriptions', label: 'البائعين والاشتراكات', icon: <Building2 className="w-5 h-5" /> },
        ]
      },
      {
        title: "المحتوى والنظام",
        items: [
          { id: 'admin_categories', label: 'تصنيفات الخدمات', icon: <Layers className="w-5 h-5" /> },
          { id: 'admin_cms', label: 'إدارة الصفحات (CMS)', icon: <FileText className="w-5 h-5" /> },
          { id: 'settings', label: 'إعدادات المنصة', icon: <Settings className="w-5 h-5" /> },
        ]
      }
    ];
  } else if (user.role === 'vendor') {
    menuGroups = [
      {
        title: "عام",
        items: [
          { id: 'dashboard', label: 'الرئيسية', icon: <LayoutGrid className="w-5 h-5" /> },
          { id: 'calendar', label: 'التقويم', icon: <CalendarDays className="w-5 h-5" /> },
        ]
      },
      {
        title: "الأصول",
        items: [
          { id: 'my_halls', label: 'قاعاتي', icon: <Building2 className="w-5 h-5" /> },
          { id: 'my_services', label: 'خدماتي', icon: <Sparkles className="w-5 h-5" /> },
        ]
      },
      {
        title: "العمليات",
        items: [
          { id: 'pos', label: 'المبيعات (POS)', icon: <ShoppingCart className="w-5 h-5" /> },
          { id: 'coupons', label: 'الكوبونات والخصم', icon: <Tag className="w-5 h-5" /> },
          { id: 'hall_bookings', label: 'الحجوزات', icon: <ClipboardList className="w-5 h-5" /> },
        ]
      },
      {
        title: "الإعدادات",
        items: [
          { id: 'brand_settings', label: 'هوية المتجر', icon: <Palette className="w-5 h-5" /> },
        ]
      }
    ];
  } else {
    // User
    menuGroups = [
      {
        title: "الرئيسية",
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
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] lg:hidden" onClick={() => setIsOpen(false)} />}
      
      <aside className={`
        fixed inset-y-0 right-0 z-[110] w-[280px] transition-transform duration-300 ease-in-out lg:p-4
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full bg-white lg:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="p-8 pb-4 space-y-6">
            <div className="flex items-center justify-between flex-row-reverse">
              <div className="flex flex-col items-end">
                <h1 className="text-2xl font-ruqaa text-primary leading-tight">القاعة</h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {user.role === 'super_admin' ? 'الإدارة العليا' : user.role === 'vendor' ? 'بوابة الشركاء' : 'حساب شخصي'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/5 shadow-inner">
                {platformLogo ? (
                   <img src={platformLogo} alt="Logo" className="w-8 h-8 object-contain" />
                ) : (
                   <span className="text-2xl font-ruqaa text-primary">ق</span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsOpen(false)}><X className="w-5 h-5" /></Button>
            </div>

            {/* Hall Selector (Vendor Only) */}
            {user.role === 'vendor' && (
              <div className="relative group">
                <select 
                  className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 pr-10 text-right text-xs font-black appearance-none focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                  value={selectedContextId}
                  onChange={(e) => setSelectedContextId(e.target.value)}
                >
                  <option value="all">كافة القاعات</option>
                  {vendorHalls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 group-hover:text-primary transition-colors" />
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-8 no-scrollbar">
            {menuGroups.map((group, idx) => (
              <div key={idx} className="space-y-3 text-right">
                <h3 className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-2">{group.title}</h3>
                <div className="space-y-1">
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setIsOpen(false); }}
                      className={`
                        w-full flex items-center justify-end gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold text-xs group relative overflow-hidden
                        ${activeTab === item.id 
                          ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-primary'}
                      `}
                    >
                      <span className="z-10">{item.label}</span>
                      <div className={`z-10 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                        {item.icon}
                      </div>
                      {activeTab === item.id && <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-50 bg-gray-50/30 space-y-3">
             <div className="flex items-center gap-3 justify-end px-2">
                <div className="text-right">
                   <p className="text-xs font-black text-gray-900">{user.full_name}</p>
                   <p className="text-[10px] text-gray-400 font-bold">{user.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-xs font-black text-gray-400 shadow-sm">
                   {user.full_name?.[0]}
                </div>
             </div>
             <button 
                onClick={onLogout}
                className="w-full h-12 flex items-center justify-center gap-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-2xl font-bold text-xs transition-all"
             >
                <LogOut className="w-4 h-4" /> تسجيل الخروج
             </button>
          </div>
        </div>
      </aside>
    </>
  );
};
