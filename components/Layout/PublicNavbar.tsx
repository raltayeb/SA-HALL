
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../../types';
import { Button } from '../ui/Button';
import { ChevronDown, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';

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
    { id: 'browse', label: 'القاعات' },
    { id: 'packages', label: 'الباقات' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo & Desktop Nav */}
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onNavigate('home')}>
                <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-12 w-auto object-contain" />
              </div>
              <nav className="hidden lg:flex items-center gap-6">
                {navItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => item.id === 'packages' ? {} : onNavigate(item.id)} 
                        className={`text-sm font-bold transition-all duration-200 ${activeTab === item.id || (activeTab === 'hall_details' && item.id === 'browse') ? 'text-primary border-b-2 border-primary pb-1' : 'text-gray-500 hover:text-primary'}`}
                    >
                        {item.label}
                    </button>
                ))}
              </nav>
            </div>

            {/* Actions */}
            <div className="hidden lg:flex items-center gap-4">
              {!user ? (
                <div className="flex items-center gap-4">
                  <button onClick={() => onNavigate('login')} className={`text-sm font-bold transition-colors ${activeTab === 'login' ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>بوابة الشركاء</button>
                  <Button onClick={() => onNavigate('register')} className="rounded-xl px-6 h-11 text-xs font-black bg-[#111827] hover:bg-black text-white shadow-lg shadow-black/10">
                    كن شريك نجاح
                  </Button>
                </div>
              ) : (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 bg-gray-50 border border-gray-200 py-1.5 px-2 pl-4 rounded-full hover:shadow-md transition-all">
                    <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">
                        {user.full_name?.[0]}
                    </div>
                    <div className="text-right hidden xl:block">
                        <p className="text-[10px] font-bold text-gray-900 leading-tight">{user.full_name}</p>
                    </div>
                    <ChevronDown className="w-3 h-3 text-gray-400 mr-1" />
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-3 w-60 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[110] text-right">
                      <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                        <p className="text-sm font-bold text-gray-900">{user.full_name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{user.email}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        <button onClick={() => { onNavigate('dashboard'); setIsUserMenuOpen(false); }} className="w-full flex items-center justify-end gap-3 px-4 py-3 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors">
                            لوحة التحكم <LayoutDashboard className="w-4 h-4" />
                        </button>
                        <button onClick={() => { onLogout(); setIsUserMenuOpen(false); }} className="w-full flex items-center justify-end gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">
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
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 rounded-lg hover:bg-gray-100">
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
            <div className="lg:hidden bg-white border-t border-gray-100 py-4 px-4 shadow-lg animate-in slide-in-from-top-5">
                <nav className="flex flex-col gap-2">
                    {navItems.map(item => (
                        <button 
                            key={item.id}
                            onClick={() => { item.id === 'packages' ? {} : onNavigate(item.id); setIsMobileMenuOpen(false); }} 
                            className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold ${activeTab === item.id ? 'bg-primary/5 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                    <div className="h-px bg-gray-100 my-2"></div>
                    {!user ? (
                        <>
                            <button onClick={() => { onNavigate('login'); setIsMobileMenuOpen(false); }} className="w-full text-right px-4 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">بوابة الشركاء</button>
                            <button onClick={() => { onNavigate('register'); setIsMobileMenuOpen(false); }} className="w-full text-center py-3 rounded-xl text-sm font-bold bg-[#111827] text-white">كن شريك نجاح</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => { onNavigate('dashboard'); setIsMobileMenuOpen(false); }} className="w-full text-right px-4 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">لوحة التحكم</button>
                            <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="w-full text-right px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50">تسجيل الخروج</button>
                        </>
                    )}
                </nav>
            </div>
        )}
    </header>
  );
};
