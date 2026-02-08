
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../../types';
import { Button } from '../ui/Button';
import { ChevronDown, LayoutDashboard, LogOut, Menu, X, Home, Building2, Palmtree, Sparkles, ShoppingBag } from 'lucide-react';

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
    { id: 'home', label: 'الرئيسية' },
    { id: 'halls_page', label: 'القاعات' },
    { id: 'chalets_page', label: 'الشاليهات' },
    { id: 'services_page', label: 'الخدمات' },
    { id: 'store_page', label: 'المتجر' },
  ];

  const shouldHideAuthButton = activeTab === 'register' && user?.role === 'vendor' && user.status === 'pending';

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-b border-gray-50 h-24 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            
            {/* Logo & Desktop Nav */}
            <div className="flex items-center">
              <div className="flex items-center cursor-pointer ml-12" onClick={() => onNavigate('home')}>
                <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-16 w-auto object-contain transition-transform hover:scale-105" />
              </div>
              <nav className="hidden lg:flex items-center gap-6">
                {navItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => onNavigate(item.id)} 
                        className={`
                            px-6 py-2.5 rounded-full text-base font-bold transition-all duration-300
                            ${activeTab === item.id 
                                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                : 'text-gray-500 hover:text-primary'}
                        `}
                    >
                        {item.label}
                    </button>
                ))}
              </nav>
            </div>

            {/* Actions */}
            <div className="hidden lg:flex items-center gap-6">
              {!user ? (
                <div className="flex items-center gap-6">
                  <button onClick={() => onNavigate('login')} className="text-base font-bold text-gray-500 hover:text-primary transition-colors">تسجيل الدخول</button>
                  <Button 
                    onClick={() => onNavigate('register')} 
                    className="rounded-xl px-8 h-12 text-base font-bold bg-primary text-white hover:bg-[#3a006b] hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 shadow-lg shadow-primary/20"
                  >
                    انضم إلينا
                  </Button>
                </div>
              ) : !shouldHideAuthButton && (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 bg-white border border-gray-100 py-1.5 px-2 pl-4 rounded-full hover:bg-gray-50 transition-all group shadow-sm hover:shadow">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-black group-hover:scale-110 transition-transform shadow-md shadow-primary/20">
                        {user.full_name?.[0]}
                    </div>
                    <div className="text-right hidden xl:block">
                        <p className="text-xs font-black text-gray-900 leading-tight">{user.full_name}</p>
                    </div>
                    <ChevronDown className="w-3 h-3 text-gray-400 mr-1" />
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-4 w-64 bg-white border border-gray-100 rounded-3xl shadow-xl ring-1 ring-black/5 overflow-hidden animate-in fade-in slide-in-from-top-2 z-[110] text-right">
                      <div className="p-5 border-b border-gray-50 bg-gray-50/50">
                        <p className="text-sm font-black text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-400 mt-1 font-mono font-bold">{user.email}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        <button onClick={() => { onNavigate('dashboard'); setIsUserMenuOpen(false); }} className="w-full flex items-center justify-end gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors">
                            لوحة التحكم <LayoutDashboard className="w-4 h-4" />
                        </button>
                        <button onClick={() => { onLogout(); setIsUserMenuOpen(false); }} className="w-full flex items-center justify-end gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors">
                            خروج <LogOut className="w-4 h-4" />
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
            <div className="lg:hidden bg-white border-t border-gray-100 py-6 px-4 animate-in slide-in-from-top-5 h-screen overflow-y-auto">
                <nav className="flex flex-col gap-3">
                    {navItems.map(item => (
                        <button 
                            key={item.id}
                            onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }} 
                            className={`w-full text-right px-6 py-4 rounded-2xl text-sm font-bold flex items-center justify-end gap-3 ${activeTab === item.id ? 'bg-primary/5 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                    <div className="h-px bg-gray-100 my-4"></div>
                    {!user ? (
                        <div className="space-y-3">
                            <button onClick={() => { onNavigate('login'); setIsMobileMenuOpen(false); }} className="w-full text-right px-6 py-4 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50">تسجيل الدخول</button>
                            <button onClick={() => { onNavigate('register'); setIsMobileMenuOpen(false); }} className="w-full text-center py-4 rounded-2xl text-sm font-black bg-primary text-white shadow-lg shadow-primary/20">انضم إلينا</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <button onClick={() => { onNavigate('dashboard'); setIsMobileMenuOpen(false); }} className="w-full text-right px-6 py-4 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50">لوحة التحكم</button>
                            <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="w-full text-right px-6 py-4 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50">تسجيل الخروج</button>
                        </div>
                    )}
                </nav>
            </div>
        )}
    </header>
  );
};
