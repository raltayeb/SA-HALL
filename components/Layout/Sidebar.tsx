
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { UserProfile, Hall, Service } from '../../types';
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
  ShieldCheck,
  Settings,
  Palette,
  X,
  User as UserIcon,
  ShoppingCart,
  Tag,
  ChevronDown,
  LayoutGrid
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

  const menuGroups = [
    {
      title: "عام",
      items: [
        { id: 'dashboard', label: 'الرئيسية', icon: <LayoutGrid className="w-5 h-5" /> },
        ...(user.role === 'vendor' ? [{ id: 'calendar', label: 'التقويم', icon: <CalendarDays className="w-5 h-5" /> }] : []),
      ]
    },
    {
      title: "الأصول",
      items: user.role === 'super_admin' ? [
        { id: 'subscriptions', label: 'المشتركين', icon: <Users className="w-5 h-5" /> },
      ] : user.role === 'vendor' ? [
        { id: 'my_halls', label: 'قاعاتي', icon: <Building2 className="w-5 h-5" /> },
        { id: 'my_services', label: 'خدماتي', icon: <Sparkles className="w-5 h-5" /> },
      ] : [
        { id: 'browse', label: 'تصفح القاعات', icon: <Search className="w-5 h-5" /> },
        { id: 'my_favorites', label: 'المفضلة', icon: <Heart className="w-5 h-5" /> },
      ]
    },
    ...(user.role === 'vendor' ? [{
      title: "العمليات",
      items: [
        { id: 'pos', label: 'المبيعات (POS)', icon: <ShoppingCart className="w-5 h-5" /> },
        { id: 'coupons', label: 'الكوبونات والخصم', icon: <Tag className="w-5 h-5" /> },
        { id: 'hall_bookings', label: 'الحجوزات', icon: <ClipboardList className="w-5 h-5" /> },
      ]
    }] : []),
    {
      title: "الإعدادات",
      items: [
        ...(user.role === 'vendor' ? [{ id: 'brand_settings', label: 'هوية المتجر', icon: <Palette className="w-5 h-5" /> }] : []),
        ...(user.role === 'super_admin' ? [{ id: 'settings', label: 'إعدادات المنصة', icon: <Settings className="w-5 h-5" /> }] : []),
        ...(user.role === 'user' ? [{ id: 'my_bookings', label: 'حجوزاتي', icon: <Ticket className="w-5 h-5" /> }] : []),
      ]
    }
  ].filter(group => group.items.length > 0);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] lg:hidden" onClick={() => setIsOpen(false)} />}
      
      <aside className={`
        fixed inset-y-0 right-0 z-[110] w-[280px] transition-transform duration-300 ease-in-out lg:p-4
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full bg-white lg:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col overflow-hidden">
          
          {/* Header & Context Selector */}
          <div className="p-8 pb-4 space-y-6">
            <div className="flex items-center justify-between flex-row-reverse">
              <div className="flex flex-col items-end">
                <h1 className="text-2xl font-ruqaa text-primary leading-tight">القاعة</h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">بوابة الشركاء</p>
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

            {/* Hall Selector (Context) - Floating appearance */}
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

          {/* Navigation Groups */}
          <div className="flex-1 px-4 overflow-y-auto no-scrollbar space-y-8 pt-4">
            {menuGroups.map((group, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className="px-4 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] text-right">{group.title}</h3>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setIsOpen(false); }}
                      className={`
                        w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-300 group
                        ${activeTab === item.id 
                          ? 'bg-primary text-white shadow-[0_10px_20px_rgba(75,0,130,0.2)]' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-primary'}
                      `}
                    >
                      <span className={`shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-right">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Profile & Logout Section (Matching Screenshot) */}
          <div className="p-4 mt-auto">
            <div className="bg-gray-50 rounded-[2rem] p-6 space-y-6">
              <div className="flex items-center gap-4 flex-row-reverse text-right">
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-primary font-black text-lg shadow-sm">
                  {user.full_name?.[0]?.toUpperCase() || <UserIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-black truncate text-gray-900">{user.full_name || 'Seller'}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    {user.role === 'vendor' ? 'شريك بائع' : user.role === 'super_admin' ? 'مدير عام' : 'عميل'}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={onLogout} 
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-black text-red-500 bg-white hover:bg-red-50 rounded-2xl transition-all border border-red-50 shadow-sm group"
              >
                <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
