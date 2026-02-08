
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

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-gray-100 h-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            
            <div className="flex items-center gap-8">
              <div 
                className="flex items-center cursor-pointer shrink-0" 
                onClick={() => onNavigate('home')}
              >
                <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-10 w-auto object-contain transition-transform hover:scale-105" />
                <span className="mr-3 text-2xl font-ruqaa text-primary hidden sm:block">القاعة</span>
              </div>

              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => onNavigate(item.id)} 
                        className={`
                            px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 border border-transparent
                            ${activeTab === item.id 
                                ? 'bg-primary/5 text-primary' 
                                : 'text-gray-500 hover:text-primary hover:bg-gray-50'}
                        `}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {!user ? (
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => onNavigate('register')} 
                    className="rounded-xl px-5 h-11 text-xs font-black bg-primary text-white hover:bg-primary/90 transition-all border-none gap-2 hidden md:flex"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>انضم إلينا</span>
                  </Button>
                  <button 
                    onClick={() => onNavigate('login')} 
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-primary hover:bg-gray-50 rounded-xl transition-all flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>دخول</span>
                  </button>
                </div>
              ) : (
                <div className="relative" ref={menuRef}>
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} 
                    className="flex items-center gap-3 bg-gray-50 border border-gray-100 py-1.5 px-1.5 pr-4 rounded-full hover:bg-gray-100 transition-all group"
                  >
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-black text-gray-900 leading-tight truncate max-w-[100px]">{user.full_name}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-primary flex items-center justify-center text-xs font-black group-hover:bg-primary group-hover:text-white transition-all">
                        {user.full_name?.[0].toUpperCase()}
                    </div>
                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-3 w-56 bg-white border border-gray-100 rounded-2xl ring-1 ring-black/5 overflow-hidden animate-in fade-in slide-in-from-top-2 z-[110] text-right">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <p className="text-xs font-black text-gray-900 truncate">{user.full_name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{user.email}</p>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        <button onClick={() => { onNavigate('dashboard'); setIsUserMenuOpen(false); }} className="w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors">
                            <LayoutDashboard className="w-4 h-4" />
                            <span>لوحة التحكم</span>
                        </button>
                        <div className="h-px bg-gray-100 mx-2 my-1"></div>
                        <button onClick={() => { onLogout(); setIsUserMenuOpen(false); }} className="w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors">
                            <LogOut className="w-4 h-4" />
                            <span>تسجيل خروج</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="lg:hidden">
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                  className="p-2 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>

          </div>
        </div>

        {isMobileMenuOpen && (
            <div className="lg:hidden bg-white border-t border-gray-100 py-4 px-4 animate-in slide-in-from-top-5 absolute w-full">
                <nav className="flex flex-col gap-2">
                    {navItems.map(item => (
                        <button 
                            key={item.id}
                            onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }} 
                            className={`w-full text-right px-4 py-3.5 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === item.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                    {!user && (
                        <div className="pt-4 mt-2 border-t border-gray-100">
                           <Button 
                                onClick={() => { onNavigate('register'); setIsMobileMenuOpen(false); }} 
                                className="w-full rounded-xl h-12 font-black bg-primary text-white"
                            >
                                انضم إلينا
                            </Button>
                        </div>
                    )}
                </nav>
            </div>
        )}
    </header>
  );
};
