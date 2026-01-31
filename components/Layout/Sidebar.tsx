
import React from 'react';
import { UserProfile } from '../../types';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  ClipboardList, 
  Search, 
  Ticket, 
  LogOut, 
  User,
  Sparkles,
  Heart,
  CalendarDays,
  ShieldCheck,
  Settings,
  Bell,
  Palette
} from 'lucide-react';

interface SidebarProps {
  user: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  siteName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout, isOpen, setIsOpen, siteName = "SA Hall" }) => {
  if (!user) return null;

  const getMenuItems = () => {
    const common = [{ id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard className="w-5 h-5" /> }];
    
    if (user.role === 'super_admin') {
      return [
        ...common,
        { id: 'subscriptions', label: 'اشتراكات البائعين', icon: <ShieldCheck className="w-5 h-5" /> },
        { id: 'users', label: 'المستخدمين', icon: <Users className="w-5 h-5" /> },
        { id: 'settings', label: 'إعدادات المنصة', icon: <Settings className="w-5 h-5" /> },
      ];
    }
    
    if (user.role === 'vendor') {
      return [
        ...common,
        { id: 'calendar', label: 'لوحة المواعيد', icon: <CalendarDays className="w-5 h-5" /> },
        { id: 'my_halls', label: 'قاعاتي', icon: <Building2 className="w-5 h-5" /> },
        { id: 'my_services', label: 'خدماتي', icon: <Sparkles className="w-5 h-5" /> },
        { id: 'hall_bookings', label: 'حجوزات القاعات', icon: <ClipboardList className="w-5 h-5" /> },
        { id: 'brand_settings', label: 'الهوية والتواصل', icon: <Palette className="w-5 h-5" /> },
      ];
    }
    
    return [
      ...common,
      { id: 'browse', label: 'تصفح القاعات', icon: <Search className="w-5 h-5" /> },
      { id: 'my_favorites', label: 'المفضلة', icon: <Heart className="w-5 h-5" /> },
      { id: 'my_bookings', label: 'حجوزاتي', icon: <Ticket className="w-5 h-5" /> },
    ];
  };

  const items = getMenuItems();

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={`fixed top-0 bottom-0 right-0 z-50 w-64 bg-card border-l flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-[100%] lg:translate-x-0'}`}>
        <div className="p-6 border-b flex flex-col items-center text-center">
          {user.custom_logo_url ? (
            <img src={user.custom_logo_url} alt={user.business_name || siteName} className="w-20 h-20 object-contain mb-3 rounded-xl" />
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-3">
              <Building2 className="w-8 h-8" />
            </div>
          )}
          <h1 className="text-lg font-black text-primary tracking-tighter leading-tight">
            {user.role === 'vendor' ? (user.business_name || siteName) : siteName}
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          {items.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' : 'text-muted-foreground hover:bg-muted'}`}>
              <span className="shrink-0">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t bg-muted/20">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
            <LogOut className="w-4 h-4" /><span>تسجيل خروج</span>
          </button>
        </div>
      </aside>
    </>
  );
};
