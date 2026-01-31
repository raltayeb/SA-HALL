import React from 'react';
import { UserProfile } from '../../types';

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
    const common = [{ id: 'dashboard', label: 'لوحة التحكم', icon: '📊' }];
    
    if (user.role === 'super_admin') {
      return [
        ...common,
        { id: 'all_bookings', label: 'جميع الحجوزات', icon: '📅' },
        { id: 'users', label: 'المستخدمين', icon: '👥' },
      ];
    }
    
    if (user.role === 'vendor') {
      return [
        ...common,
        { id: 'my_halls', label: 'قاعاتي', icon: '🏰' },
        { id: 'hall_bookings', label: 'حجوزات القاعات', icon: '📝' },
      ];
    }
    
    // User
    return [
      ...common,
      { id: 'browse', label: 'تصفح القاعات', icon: '🔍' },
      { id: 'my_bookings', label: 'حجوزاتي', icon: '🎫' },
    ];
  };

  const items = getMenuItems();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Sidebar Container */}
      <aside 
        className={`
          fixed top-4 bottom-4 right-4 z-50 w-64 
          bg-card/95 backdrop-blur-md border border-border rounded-xl
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-[110%] lg:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-border/50">
          <h1 className="text-2xl font-bold text-primary tracking-tight">SA Hall</h1>
          <p className="text-xs text-muted-foreground mt-1">منصة الأفراح السعودية</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${activeTab === item.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary font-bold">
              {user.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <span>🚪</span> تسجيل خروج
          </button>
        </div>
      </aside>
    </>
  );
};