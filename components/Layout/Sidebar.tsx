
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
  Wallet,
  ShieldCheck,
  Settings
} from 'lucide-react';

interface SidebarProps {
  user: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout, isOpen, setIsOpen }) => {
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
        { id: 'my_halls', label: 'قاعاتي', icon: <Building2 className="w-5 h-5" /> },
        { id: 'my_services', label: 'خدماتي', icon: <Sparkles className="w-5 h-5" /> },
        { id: 'hall_bookings', label: 'حجوزات القاعات', icon: <ClipboardList className="w-5 h-5" /> },
        { id: 'earnings', label: 'الأرباح والتحصيلات', icon: <Wallet className="w-5 h-5" /> },
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
      <aside className={`fixed top-4 bottom-4 right-4 z-50 w-64 bg-card/95 backdrop-blur-md border border-border rounded-2xl flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-[110%] lg:translate-x-0'}`}>
        <div className="p-8 border-b border-border/50 flex items-center gap-2">
          <div className="bg-primary/10 p-2.5 rounded-xl"><Building2 className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-black text-primary tracking-tighter">SA Hall</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">SaaS Edition</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {items.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === item.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
              <span className="shrink-0">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border/50 bg-muted/20 rounded-b-2xl">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary shadow-sm"><User className="w-5 h-5" /></div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-black truncate">{user.full_name}</p>
              <p className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-tighter">{user.role}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
            <LogOut className="w-4 h-4" /><span>تسجيل خروج</span>
          </button>
        </div>
      </aside>
    </>
  );
};
