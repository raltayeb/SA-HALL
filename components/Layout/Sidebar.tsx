
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
  Sparkles,
  Heart,
  CalendarDays,
  ShieldCheck,
  Settings,
  Palette,
  X,
  User as UserIcon
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

export const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout, isOpen, setIsOpen, siteName = "SA Hall", platformLogo }) => {
  if (!user) return null;

  const getMenuItems = () => {
    const common = [{ id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" /> }];
    
    if (user.role === 'super_admin') {
      return [
        ...common,
        { id: 'subscriptions', label: 'الاشتراكات', icon: <ShieldCheck className="w-5 h-5" /> },
        { id: 'users', label: 'المستخدمين', icon: <Users className="w-5 h-5" /> },
        { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-5 h-5" /> },
      ];
    }
    
    if (user.role === 'vendor') {
      return [
        ...common,
        { id: 'calendar', label: 'التقويم', icon: <CalendarDays className="w-5 h-5" /> },
        { id: 'my_halls', label: 'قاعاتي', icon: <Building2 className="w-5 h-5" /> },
        { id: 'my_services', label: 'خدماتي', icon: <Sparkles className="w-5 h-5" /> },
        { id: 'hall_bookings', label: 'الحجوزات', icon: <ClipboardList className="w-5 h-5" /> },
        { id: 'brand_settings', label: 'هوية المتجر', icon: <Palette className="w-5 h-5" /> },
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
  const logoToDisplay = user.role === 'vendor' ? user.custom_logo_url : platformLogo;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
      
      <aside className={`
        fixed top-4 bottom-4 right-4 z-50 w-72 bg-card border shadow-2xl rounded-[2.5rem] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 lg:translate-x-0 lg:opacity-100'}
      `}>
        {/* Close button for mobile */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute left-4 top-4 lg:hidden rounded-full" 
          onClick={() => setIsOpen(false)}
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="p-8 flex flex-col items-center text-center">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            {logoToDisplay ? (
              <img src={logoToDisplay} alt="Logo" className="relative w-20 h-20 object-contain rounded-2xl bg-card border p-2 shadow-sm" />
            ) : (
              <div className="relative w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                <Building2 className="w-10 h-10" />
              </div>
            )}
          </div>
          <h1 className="mt-4 text-sm font-black text-primary tracking-tighter line-clamp-1">
            {user.role === 'vendor' ? (user.business_name || siteName) : siteName}
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {items.map((item) => (
            <button 
              key={item.id} 
              onClick={() => { setActiveTab(item.id); setIsOpen(false); }} 
              className={`
                w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[13px] font-black transition-all group
                ${activeTab === item.id 
                  ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/25 translate-x-[-4px]' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
              `}
            >
              <span className={`shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 mt-auto">
          <div className="bg-muted/30 p-4 rounded-[2.5rem] border border-border/40 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xs shadow-lg">
                {user.full_name?.[0] || <UserIcon className="w-4 h-4" />}
              </div>
              <div className="text-right overflow-hidden">
                <p className="text-[12px] font-black leading-none truncate">{user.full_name}</p>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-60">
                  {user.role === 'vendor' ? 'بائع' : user.role === 'super_admin' ? 'مدير' : 'عميل'}
                </p>
              </div>
            </div>
            <button 
              onClick={onLogout} 
              className="w-full flex items-center justify-center gap-2 py-3 text-[11px] font-black text-destructive hover:bg-destructive/10 rounded-2xl transition-all active:scale-95 border border-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
