
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
    const common = [{ id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-4 h-4" /> }];
    
    if (user.role === 'super_admin') {
      return [
        ...common,
        { id: 'subscriptions', label: 'الاشتراكات', icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'users', label: 'المستخدمين', icon: <Users className="w-4 h-4" /> },
        { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-4 h-4" /> },
      ];
    }
    
    if (user.role === 'vendor') {
      return [
        ...common,
        { id: 'calendar', label: 'التقويم', icon: <CalendarDays className="w-4 h-4" /> },
        { id: 'my_halls', label: 'قاعاتي', icon: <Building2 className="w-4 h-4" /> },
        { id: 'my_services', label: 'خدماتي', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'hall_bookings', label: 'الحجوزات', icon: <ClipboardList className="w-4 h-4" /> },
        { id: 'brand_settings', label: 'هوية المتجر', icon: <Palette className="w-4 h-4" /> },
      ];
    }
    
    return [
      ...common,
      { id: 'browse', label: 'تصفح القاعات', icon: <Search className="w-4 h-4" /> },
      { id: 'my_favorites', label: 'المفضلة', icon: <Heart className="w-4 h-4" /> },
      { id: 'my_bookings', label: 'حجوزاتي', icon: <Ticket className="w-4 h-4" /> },
    ];
  };

  const items = getMenuItems();
  const logoToDisplay = user.role === 'vendor' ? user.custom_logo_url : platformLogo;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
      
      <aside className={`
        fixed inset-y-0 inset-inline-start-0 z-50 w-64 bg-card border-e shadow-2xl flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Header/Logo Area */}
        <div className="p-6 flex flex-col items-end gap-4 border-b border-border/50">
          <div className="flex items-center justify-between w-full lg:justify-end">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden rounded-full h-8 w-8" 
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            
            <div className="relative h-10 w-10 shrink-0">
              <div className="absolute -inset-1 bg-primary/20 rounded-[1.125rem] blur-sm"></div>
              {logoToDisplay ? (
                <img src={logoToDisplay} alt="Logo" className="relative h-full w-full object-contain bg-card rounded-lg border p-1" />
              ) : (
                <div className="relative h-full w-full bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20">
                  <Building2 className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-sm font-black text-primary tracking-tight uppercase line-clamp-1">
              {user.role === 'vendor' ? (user.business_name || siteName) : siteName}
            </h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">بوابة الشركاء</p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto no-scrollbar">
          {items.map((item) => (
            <button 
              key={item.id} 
              onClick={() => { setActiveTab(item.id); setIsOpen(false); }} 
              className={`
                w-full flex items-center justify-end gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all group
                ${activeTab === item.id 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-primary'}
              `}
            >
              <span>{item.label}</span>
              <span className={`shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
            </button>
          ))}
        </nav>
        
        {/* Footer Info Section */}
        <div className="p-4 border-t border-border/50">
          <div className="bg-muted/30 p-4 rounded-[1.125rem] border border-border/40 space-y-4">
            <div className="flex items-center justify-end gap-3">
              <div className="text-right overflow-hidden">
                <p className="text-xs font-bold leading-none truncate">{user.full_name}</p>
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-60">
                  {user.role === 'vendor' ? 'بائع' : user.role === 'super_admin' ? 'مدير' : 'عميل'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs border border-primary/10">
                {user.full_name?.[0] || <UserIcon className="w-4 h-4" />}
              </div>
            </div>
            <button 
              onClick={onLogout} 
              className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black text-destructive hover:bg-destructive/10 rounded-lg transition-all border border-destructive/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
