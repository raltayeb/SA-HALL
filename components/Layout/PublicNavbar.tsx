
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../../types';
import { Button } from '../ui/Button';
import { 
  ChevronDown, LayoutDashboard, LogOut, Menu, X, Home, 
  Building2, Palmtree, Sparkles, ShoppingBag, LogIn, UserPlus 
} from 'lucide-react';

interface PublicNavbarProps {
  user: UserProfile | null;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  activeTab: string;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ 
  user, onLoginClick, onRegisterClick, onNavigate, onLogout, activeTab 
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: <Home className="w-4 h-4" /> },
    { id: 'halls_page', label: 'القاعات', icon: <Building2 className="w-4 h-4" /> },
    { id: 'chalets_page', label: 'الشاليهات', icon: <Palmtree className="w-4 h-4" /> },
    { id: 'services_page', label: 'الخدمات', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'store_page', label: 'المتجر', icon: <ShoppingBag className="w-4 h-4" /> },
  ];

  const shouldHideAuthButton = activeTab === 'register' && user?.role === 'vendor' && user.status === 'pending';

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-gray-100 shadow-none">
        {/* Boxed Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20">
          <div className="flex items-center justify-between h-full">
            
            {/* Logo & Desktop Nav */}
            <div className="flex items-center h-full">
              <div className="flex items-center cursor-pointer ml-10" onClick={() => onNavigate('home')}>
                <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-10 w-auto object-contain transition-transform hover:scale-105" />
              </div>
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => onNavigate(item.id)} 
                        className={`
                            px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 border border-transparent
                            ${activeTab === item.id 
                                ? 'bg-primary text-white' 
                                : 'text-gray-500 hover:text-primary hover:bg-gray-50'}
                        `}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
              </nav>
            </div>

            {/* Actions */}
            <div className="hidden lg:flex items-center gap-4">
              {!user ? (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => onNavigate('login')} 
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-primary hover:bg-gray-50 rounded-xl transition-all flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>دخول</span>
                  </button>
                  <Button 
                    onClick={() => onNavigate('register')} 
                    className="rounded-xl px-6 h-11 text-sm font-black bg-primary text-white hover:bg-[#3a006b] transition-all shadow-none border-none gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>سجل الآن</span>
                  </Button>
                </div>
              ) : !shouldHideAuthButton && (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 bg-gray-50 border border-gray-100 py-1.5 px-1.5 pr-4 rounded-full hover:bg-gray-100 transition-all group">
                    <div className="text-right hidden xl:block">
                        <p className="text-xs font-black text-gray-900 leading-tight">{user.full_name}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-primary flex items-center justify-center text-xs font-black group-hover:bg-primary group-hover:text-white transition-all">
                        {user.full_name?.[0]}
                    </div>
                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-3 w-56 bg-white border border-gray-200 rounded-2xl shadow-none ring-1 ring-black/5 overflow-hidden animate-in fade-in slide-in-from-top-2 z-[110] text-right">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <p className="text-xs font-black text-gray-900 truncate">{user.full_name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{user.email}</p>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        <button onClick={() => { onNavigate('dashboard'); setIsUserMenuOpen(false); }} className="w-full flex items-center justify-end gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors">
                            <span>لوحة التحكم</span>
                            <LayoutDashboard className="w-4 h-4" />
                        </button>
                        <div className="h-px bg-gray-100 mx-2 my-1"></div>
                        <button onClick={() => { onLogout(); setIsUserMenuOpen(false); }} className="w-full flex items-center justify-end gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors">
                            <span>خروج</span>
                            <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center">
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
            <div className="lg:hidden bg-white border-t border-gray-100 py-4 px-4 animate-in slide-in-from-top-5 h-screen overflow-y-auto">
                <nav className="flex flex-col gap-2">
                    {navItems.map(item => (
                        <button 
                            key={item.id}
                            onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }} 
                            className={`w-full text-right px-4 py-3.5 rounded-xl text-sm font-bold flex items-center justify-end gap-3 transition-colors ${activeTab === item.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <span>{item.label}</span>
                            {item.icon}
                        </button>
                    ))}
                    <div className="h-px bg-gray-100 my-2"></div>
                    {!user ? (
                        <div className="flex flex-col gap-2">
                            <button onClick={() => { onNavigate('login'); setIsMobileMenuOpen(false); }} className="w-full text-right px-4 py-3.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-end gap-3">
                                <span>تسجيل الدخول</span>
                                <LogIn className="w-5 h-5" />
                            </button>
                            <button onClick={() => { onNavigate('register'); setIsMobileMenuOpen(false); }} className="w-full text-center py-3.5 rounded-xl text-sm font-black bg-primary text-white flex items-center justify-center gap-3">
                                <UserPlus className="w-5 h-5" />
                                <span>انضم إلينا</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <button onClick={() => { onNavigate('dashboard'); setIsMobileMenuOpen(false); }} className="w-full text-right px-4 py-3.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-end gap-3">
                                <span>لوحة التحكم</span>
                                <LayoutDashboard className="w-5 h-5" />
                            </button>
                            <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="w-full text-right px-4 py-3.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 flex items-center justify-end gap-3">
                                <span>تسجيل الخروج</span>
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </nav>
            </div>
        )}
    </header>
  );
};
