
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Search, MapPin, Users, Star, 
  Sparkles, Building2, 
  ChevronLeft, ArrowLeft,
  Diamond, Calendar as CalendarIcon, Send, Globe, User, Share2, Package, LogOut, LayoutDashboard, CalendarDays, Settings, ClipboardList
} from 'lucide-react';
import { HallDetailPopup } from '../components/Home/HallDetailPopup';

interface HomeProps {
  user: UserProfile | null;
  onLoginClick: () => void;
  onBrowseHalls: () => void;
  onBrowseServices: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

export const Home: React.FC<HomeProps> = ({ user, onLoginClick, onBrowseHalls, onBrowseServices, onNavigate, onLogout }) => {
  const [halls, setHalls] = useState<(Hall & { vendor?: UserProfile })[]>([]);
  const [services, setServices] = useState<(Service & { vendor?: UserProfile })[]>([]);
  const [loadingHalls, setLoadingHalls] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<{ item: any, type: 'hall' | 'service' } | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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

  const fetchHalls = useCallback(async () => {
    setLoadingHalls(true);
    try {
      const { data, error } = await supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true).limit(3);
      if (error) throw error;
      setHalls(data as any[] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHalls(false);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const { data, error } = await supabase.from('services').select('*, vendor:vendor_id(*)').eq('is_active', true).limit(3);
      if (error) throw error;
      setServices(data as any[] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    fetchHalls();
    fetchServices();
  }, [fetchHalls, fetchServices]);

  return (
    <div className="min-h-screen bg-[#0f0a14] text-white selection:bg-[#4B0082] selection:text-white font-sans overflow-x-hidden">
      {/* Navbar */}
      <header className="sticky top-0 z-[100] bg-[#0f0a14]/90 backdrop-blur-md border-b border-white/5 px-6 lg:px-20 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="text-[#D4AF37] group-hover:scale-110 transition-transform duration-300">
                <Diamond className="w-8 h-8 fill-current" />
              </div>
              <h2 className="text-xl font-black tracking-tighter uppercase">
                Royal<span className="text-[#D4AF37]">Venues</span>
              </h2>
            </div>
            
            <nav className="hidden xl:flex items-center gap-8">
              <button onClick={onBrowseHalls} className="text-white/40 hover:text-[#D4AF37] text-xs font-bold transition-colors">القاعات</button>
              <button onClick={onBrowseServices} className="text-white/40 hover:text-[#D4AF37] text-xs font-bold transition-colors">الخدمات</button>
              <a className="text-white/40 hover:text-[#D4AF37] text-xs font-bold transition-colors" href="#">الكونسيرج</a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {!user ? (
              <button 
                onClick={onLoginClick}
                className="bg-[#D4AF37] text-black px-6 py-2 rounded-xl text-sm font-black transition-all hover:bg-white active:scale-95"
              >
                دخول
              </button>
            ) : (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-3 bg-black border border-white/10 ps-4 pe-1.5 py-1.5 rounded-full hover:bg-white/5 transition-all shadow-xl"
                >
                  <span className="text-xs font-bold text-white/90 hidden sm:inline">{user.full_name}</span>
                  <div className="w-8 h-8 rounded-full bg-[#4B0082] flex items-center justify-center text-white">
                    <User className="w-4 h-4" />
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute left-0 mt-3 w-60 bg-[#191022] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[110]">
                    <div className="p-5 border-b border-white/5 text-right">
                      <p className="text-sm font-bold text-white truncate">{user.full_name}</p>
                      <p className="text-[10px] text-white/30 font-medium truncate mt-1">{user.email}</p>
                    </div>
                    <div className="p-2 space-y-1">
                      <button onClick={() => onNavigate('dashboard')} className="w-full flex items-center justify-end gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-white/50 hover:bg-white/5 hover:text-[#D4AF37] transition-all">لوحة التحكم <LayoutDashboard className="w-4 h-4" /></button>
                      <button onClick={() => onNavigate('calendar')} className="w-full flex items-center justify-end gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-white/50 hover:bg-white/5 hover:text-[#D4AF37] transition-all">التقويم <CalendarDays className="w-4 h-4" /></button>
                      <button onClick={() => onNavigate(user.role === 'vendor' ? 'hall_bookings' : 'my_bookings')} className="w-full flex items-center justify-end gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-white/50 hover:bg-white/5 hover:text-[#D4AF37] transition-all">الحجوزات <ClipboardList className="w-4 h-4" /></button>
                    </div>
                    <div className="p-2 bg-white/5">
                      <button onClick={onLogout} className="w-full flex items-center justify-end gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-all">تسجيل الخروج <LogOut className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden px-6 lg:px-20">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover" 
            alt="Royal Hero" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0a14]/60 via-[#0f0a14]/40 to-[#0f0a14]"></div>
        </div>

        <div className="relative z-10 max-w-4xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#4B0082]/30 border border-[#4B0082]/30 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest backdrop-blur-xl">
            أفخم منصة لحجز المناسبات في المملكة
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter uppercase">
            Define <span className="text-[#D4AF37]">Excellence</span>
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto font-medium text-lg">
            ننتقي لك الوجهات الأكثر تميزاً لخلق ذكريات تليق بمناسبتك الملكية.
          </p>

          <div className="w-full max-w-2xl mt-10 mx-auto">
            <div className="flex flex-col md:flex-row items-stretch bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2 gap-2 shadow-2xl">
              <div className="flex flex-1 items-center px-6 py-3 group">
                <Search className="text-[#D4AF37] me-4 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="ابحث عن قاعة، مدينة، أو خدمة..." 
                  className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-white/20 text-base font-bold text-start"
                />
              </div>
              <button 
                onClick={onBrowseHalls}
                className="bg-[#D4AF37] text-black px-8 py-3 rounded-xl font-black text-sm transition-all hover:bg-white shadow-xl"
              >
                اكتشف الآن
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Halls */}
      <section className="max-w-7xl mx-auto px-6 lg:px-20 py-20 space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="text-start space-y-2">
            <span className="text-[#D4AF37] text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
              <div className="w-8 h-px bg-[#D4AF37]/30"></div> Private Collection
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter">أرقى القاعات المختارة</h2>
          </div>
          <button onClick={onBrowseHalls} className="text-white/30 hover:text-[#D4AF37] text-[10px] font-black flex items-center gap-2 uppercase tracking-widest transition-all">
            عرض الكل <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {loadingHalls ? (
            [1, 2, 3].map(i => <div key={i} className="aspect-[4/5] bg-white/5 animate-pulse rounded-2xl"></div>)
          ) : (
            halls.map((hall) => (
              <div key={hall.id} onClick={() => setSelectedEntity({ item: hall, type: 'hall' })} className="group cursor-pointer space-y-5 animate-in fade-in duration-500">
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-xl border border-white/5">
                  <img src={hall.image_url} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={hall.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a14] via-transparent to-transparent opacity-80"></div>
                  <div className="absolute bottom-6 inset-x-6 flex justify-between items-end">
                     <div className="text-start">
                        <PriceTag amount={hall.price_per_night} className="text-2xl text-white mb-1" />
                        <p className="text-[10px] text-white/30 font-bold uppercase">لليلة الواحدة</p>
                     </div>
                     <div className="bg-white/10 backdrop-blur-xl border border-white/10 w-10 h-10 rounded-xl flex items-center justify-center text-[#D4AF37]">
                        <ArrowLeft className="w-5 h-5" />
                     </div>
                  </div>
                </div>
                <div className="text-start px-2 space-y-1">
                  <h3 className="text-xl font-black text-white group-hover:text-[#D4AF37] transition-colors leading-tight">{hall.name}</h3>
                  <div className="flex items-center gap-4 text-white/30 text-[10px] font-bold uppercase">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#D4AF37]" /> {hall.city}</span>
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#D4AF37]" /> {hall.capacity} ضيف</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-white/[0.02] border-y border-white/5 py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="text-start space-y-2">
              <span className="text-[#D4AF37] text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
                 <div className="w-8 h-px bg-[#D4AF37]/30"></div> Tailored Services
              </span>
              <h2 className="text-3xl font-black tracking-tighter">خدمات الضيافة الملكية</h2>
            </div>
            <button onClick={onBrowseServices} className="text-white/30 hover:text-[#D4AF37] text-[10px] font-black flex items-center gap-2 uppercase tracking-widest transition-all">
              عرض كافة الخدمات <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {loadingServices ? (
              [1, 2, 3].map(i => <div key={i} className="aspect-video bg-white/5 animate-pulse rounded-2xl"></div>)
            ) : (
              services.map((service) => (
                <div key={service.id} onClick={() => setSelectedEntity({ item: service, type: 'service' })} className="group cursor-pointer space-y-4">
                  <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg border border-white/5">
                    <img src={service.image_url} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={service.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a14] via-transparent to-transparent opacity-70"></div>
                    <div className="absolute top-4 start-4 bg-[#D4AF37] text-black px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                      {service.category}
                    </div>
                    <div className="absolute bottom-4 end-4">
                       <PriceTag amount={service.price} className="text-lg text-white" iconSize={16} />
                    </div>
                  </div>
                  <div className="text-start px-1">
                    <h3 className="text-lg font-black text-white group-hover:text-[#D4AF37] transition-colors leading-tight mb-1">{service.name}</h3>
                    <p className="text-[10px] text-white/30 font-bold flex items-center gap-2 uppercase">
                       <Package className="w-3.5 h-3.5 text-[#D4AF37]" /> {service.vendor?.business_name || 'مزود خدمة معتمد'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-20 py-20 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20 text-start">
            <div className="space-y-8">
              <div className="flex items-center gap-3 text-white">
                <div className="text-[#D4AF37]">
                  <Diamond className="w-10 h-10 fill-current" />
                </div>
                <h2 className="text-xl font-black tracking-tighter uppercase">Royal<span className="text-[#D4AF37]">Venues</span></h2>
              </div>
              <p className="text-white/30 text-xs font-medium leading-relaxed max-w-xs">نحن نعيد تعريف مفهوم الفخامة في تنظيم وحجز المناسبات الكبرى في المملكة العربية السعودية.</p>
              <div className="flex gap-5">
                <a className="text-white/20 hover:text-[#D4AF37] transition-all" href="#"><Globe className="w-5 h-5" /></a>
                <a className="text-white/20 hover:text-[#D4AF37] transition-all" href="#"><User className="w-5 h-5" /></a>
                <a className="text-white/20 hover:text-[#D4AF37] transition-all" href="#"><Share2 className="w-5 h-5" /></a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-black text-[10px] uppercase tracking-[0.3em] mb-8">المدن</h4>
              <ul className="space-y-4 text-xs text-white/30 font-bold">
                <li><a className="hover:text-white transition-colors" href="#">الرياض</a></li>
                <li><a className="hover:text-white transition-colors" href="#">جدة</a></li>
                <li><a className="hover:text-white transition-colors" href="#">مكة المكرمة</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-black text-[10px] uppercase tracking-[0.3em] mb-8">الخدمات</h4>
              <ul className="space-y-4 text-xs text-white/30 font-bold">
                <li><a className="hover:text-white transition-colors" href="#">تخطيط المناسبات</a></li>
                <li><a className="hover:text-white transition-colors" href="#">الضيافة الملكية</a></li>
                <li><a className="hover:text-white transition-colors" href="#">الكونسيرج الخاص</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-white font-black text-[10px] uppercase tracking-[0.3em] mb-8">النشرة الحصرية</h4>
              <div className="relative group">
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 ps-5 pe-12 text-xs font-bold focus:border-[#D4AF37] transition-all outline-none" 
                  placeholder="البريد الإلكتروني"
                />
                <button className="absolute end-4 top-1/2 -translate-y-1/2 text-[#D4AF37]">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-white/5 gap-6 text-[10px] text-white/10 font-bold uppercase tracking-widest">
            <p>© 2024 ROYAL VENUES SAUDI. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-10">
              <a className="hover:text-white transition-colors" href="#">الخصوصية</a>
              <a className="hover:text-white transition-colors" href="#">الشروط</a>
            </div>
          </div>
        </div>
      </footer>

      {selectedEntity && (
        <HallDetailPopup 
          item={selectedEntity.item} 
          type={selectedEntity.type}
          user={user} 
          onClose={() => setSelectedEntity(null)} 
        />
      )}
    </div>
  );
};
