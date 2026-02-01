
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Search, MapPin, Users, Star, 
  Sparkles, Building2, 
  ChevronLeft,
  Diamond, Calendar as CalendarIcon, Send, Globe, User, Share2, Package
} from 'lucide-react';
import { HallDetailPopup } from '../components/Home/HallDetailPopup';

interface HomeProps {
  user: UserProfile | null;
  onLoginClick: () => void;
  onBrowseHalls: () => void;
  onBrowseServices: () => void;
}

export const Home: React.FC<HomeProps> = ({ user, onLoginClick, onBrowseHalls, onBrowseServices }) => {
  const [halls, setHalls] = useState<(Hall & { vendor?: UserProfile })[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingHalls, setLoadingHalls] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedHall, setSelectedHall] = useState<(Hall & { vendor?: UserProfile }) | null>(null);

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
      const { data, error } = await supabase.from('services').select('*').eq('is_active', true).limit(3);
      if (error) throw error;
      setServices(data || []);
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
    <div className="min-h-screen bg-[#0f0a14] text-white selection:bg-primary selection:text-white font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#0f0a14]/80 backdrop-blur-md border-b border-white/10 px-6 lg:px-40 py-4">
        <div className="flex items-center justify-between max-w-[1200px] mx-auto flex-row-reverse">
          <div className="flex items-center gap-3 flex-row-reverse text-right">
            <div className="text-[#D4AF37]">
              <Diamond className="w-8 h-8 fill-current" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight uppercase">
              LUXURY<span className="text-[#D4AF37]">VENUES</span>
            </h2>
          </div>
          
          <div className="hidden md:flex items-center gap-10 flex-row-reverse">
            <button onClick={onBrowseHalls} className="text-white/80 hover:text-white text-sm font-medium transition-colors">اكتشف القاعات</button>
            <button onClick={onBrowseServices} className="text-white/80 hover:text-white text-sm font-medium transition-colors">خدماتنا</button>
            <a className="text-white/80 hover:text-white text-sm font-medium transition-colors" href="#">كونسيرج خاص</a>
            <a className="text-white/80 hover:text-white text-sm font-medium transition-colors" href="#">اتصل بنا</a>
          </div>

          <div className="flex gap-4 flex-row-reverse">
            {!user ? (
              <>
                <button 
                  onClick={onLoginClick}
                  className="hidden sm:flex items-center justify-center rounded-lg h-10 px-6 bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all border border-primary/50 shadow-lg shadow-primary/20"
                >
                  أضف قاعتك
                </button>
                <button 
                  onClick={onLoginClick}
                  className="flex items-center justify-center rounded-lg h-10 px-6 bg-white/5 hover:bg-white/10 text-white text-sm font-bold border border-white/10 transition-all"
                >
                  دخول
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                <span className="text-xs font-bold">{user.full_name}</span>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden px-6 lg:px-40">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover" 
            alt="Hero Background" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0a14]/70 via-[#0f0a14]/40 to-[#0f0a14]"></div>
        </div>

        <div className="relative z-10 max-w-4xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-20 duration-1000">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.3em]">
            شبكة القاعات الأكثر تميزاً بالمملكة
          </div>
          <h1 className="text-5xl md:text-8xl font-black leading-tight tracking-tight">
            بساطة متناهية <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-white to-[#D4AF37]">بفخامة مطلقة</span>
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto font-light text-lg md:text-xl leading-relaxed">
            ننتقي لك أفخم المساحات والوجهات في المملكة لتناسب أرقى احتفالاتك ومناسباتك الخاصة.
          </p>

          {/* Hero Search Box (No city filter buttons) */}
          <div className="w-full max-w-5xl mt-12 mx-auto">
            <div className="flex flex-col md:flex-row-reverse items-stretch bg-[#211c27]/80 backdrop-blur-lg border border-white/10 rounded-2xl p-2 gap-2 shadow-2xl">
              <div className="flex flex-1 items-center px-6 border-b md:border-b-0 md:border-l border-white/10 py-4 md:py-0 flex-row-reverse">
                <Search className="text-[#D4AF37] ml-4 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="ابحث عن قاعة أو مدينة..." 
                  className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-white/40 text-sm md:text-base text-right"
                />
              </div>
              <button 
                onClick={onBrowseHalls}
                className="bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 min-w-[200px]"
              >
                <Search className="w-5 h-5" />
                ابحث عن مساحة
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Halls Section */}
      <section className="max-w-7xl mx-auto px-6 lg:px-40 py-20">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6 mb-12 flex-row-reverse">
          <div className="text-right">
            <span className="text-[#D4AF37] text-xs font-bold tracking-widest uppercase mb-2 block">اختياراتنا المنتقاة</span>
            <h2 className="text-white text-3xl md:text-4xl font-bold tracking-tight">القاعات المميزة</h2>
          </div>
          <button onClick={onBrowseHalls} className="text-[#D4AF37] text-sm font-bold flex items-center gap-2 hover:underline flex-row-reverse">
            عرض المجموعة الكاملة <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {loadingHalls ? (
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="aspect-[4/3] bg-white/5 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {halls.map((hall) => (
              <div 
                key={hall.id} 
                onClick={() => setSelectedHall(hall)}
                className="group cursor-pointer animate-in fade-in duration-700"
              >
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-6 border border-white/5 shadow-xl transition-all duration-500 group-hover:scale-[1.03]">
                  <img src={hall.image_url} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt={hall.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                  
                  <div className="absolute top-4 right-4 bg-primary/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                    بريميوم
                  </div>
                  
                  <div className="absolute bottom-4 inset-x-4 flex justify-between items-center text-white flex-row-reverse">
                    <div className="flex items-center gap-1.5 flex-row-reverse">
                      <Star className="w-4 h-4 text-[#D4AF37] fill-current" />
                      <span className="text-sm font-bold">4.9</span>
                    </div>
                    <p className="text-sm font-medium">يبدأ من <span className="text-[#D4AF37]">
                      <PriceTag amount={hall.price_per_night} className="inline-block" />
                    </span></p>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 text-right group-hover:text-[#D4AF37] transition-colors">{hall.name}</h3>
                <div className="flex items-center justify-end text-white/50 text-sm flex-row-reverse">
                  <MapPin className="text-sm ml-2 w-4 h-4" />
                  {hall.city}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* NEW: Featured Services Section */}
      <section className="max-w-7xl mx-auto px-6 lg:px-40 py-20 bg-white/5 rounded-[4rem] border border-white/5 my-20">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6 mb-12 flex-row-reverse">
          <div className="text-right">
            <span className="text-[#D4AF37] text-xs font-bold tracking-widest uppercase mb-2 block">خدمات متكاملة</span>
            <h2 className="text-white text-3xl md:text-4xl font-bold tracking-tight">خدمات الضيافة والتنظيم</h2>
          </div>
          <button onClick={onBrowseServices} className="text-[#D4AF37] text-sm font-bold flex items-center gap-2 hover:underline flex-row-reverse">
            عرض كافة الخدمات <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {loadingServices ? (
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="aspect-[4/3] bg-white/5 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div 
                key={service.id} 
                onClick={onBrowseServices}
                className="group cursor-pointer animate-in fade-in duration-700"
              >
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-6 border border-white/5 shadow-xl transition-all duration-500 group-hover:scale-[1.03]">
                  <img src={service.image_url} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt={service.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                  
                  <div className="absolute top-4 right-4 bg-[#D4AF37]/90 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                    {service.category}
                  </div>
                  
                  <div className="absolute bottom-4 inset-x-4 flex justify-end text-white">
                    <PriceTag amount={service.price} className="text-xl text-[#D4AF37]" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 text-right group-hover:text-[#D4AF37] transition-colors">{service.name}</h3>
                <div className="flex items-center justify-end text-white/50 text-sm flex-row-reverse">
                  <Package className="text-sm ml-2 w-4 h-4" />
                  {service.category}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stats Section */}
      <section className="px-6 lg:px-40 py-24 bg-primary/5 border-y border-white/5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-[1200px] mx-auto text-center flex-row-reverse">
          <div>
            <div className="text-4xl font-black text-[#D4AF37] mb-2">+250</div>
            <div className="text-xs text-white/40 font-black uppercase tracking-widest">قاعة حصرية</div>
          </div>
          <div>
            <div className="text-4xl font-black text-[#D4AF37] mb-2">+15k</div>
            <div className="text-xs text-white/40 font-black uppercase tracking-widest">فعالية ناجحة</div>
          </div>
          <div>
            <div className="text-4xl font-black text-[#D4AF37] mb-2">12</div>
            <div className="text-xs text-white/40 font-black uppercase tracking-widest">مدينة رئيسية</div>
          </div>
          <div>
            <div className="text-4xl font-black text-[#D4AF37] mb-2">24/7</div>
            <div className="text-xs text-white/40 font-black uppercase tracking-widest">كونسيرج VIP</div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="px-6 lg:px-40 py-24">
        <div className="bg-gradient-to-br from-primary to-[#2a004a] rounded-[3rem] p-16 relative overflow-hidden text-center flex flex-col items-center shadow-2xl">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 relative z-10 tracking-tight">هل تملك مساحة استثنائية؟</h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl relative z-10 leading-relaxed">
            انضم إلى أفخم شبكة للقاعات في المملكة واستقبل كبار الشخصيات والباحثين عن التميز.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 relative z-10">
            <button onClick={onLoginClick} className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-primary px-12 py-4 rounded-xl font-bold text-lg transition-all shadow-lg">
              كن شريكاً معنا
            </button>
            <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-12 py-4 rounded-xl font-bold text-lg transition-all">
              تعرف على المزيد
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-40 py-24 border-t border-white/10 bg-[#0f0a14]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20 flex-row-reverse text-right">
          <div className="col-span-1 md:col-span-1 flex flex-col items-end">
            <div className="flex items-center gap-3 text-white mb-6 flex-row-reverse">
              <div className="text-[#D4AF37]">
                <Diamond className="w-8 h-8 fill-current" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">LUXURY<span className="text-[#D4AF37]">VENUES</span></h2>
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-xs">إعادة تعريف معايير الفخامة للمناسبات في السعودية. من القاعات الكبرى إلى المساحات الحصرية الخاصة.</p>
            <div className="flex gap-4">
              <a className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-all" href="#"><Globe className="w-4 h-4" /></a>
              <a className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-all" href="#"><User className="w-4 h-4" /></a>
              <a className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-all" href="#"><Share2 className="w-4 h-4" /></a>
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-8">أهم المدن</h4>
            <ul className="space-y-4 text-sm text-white/50 font-medium">
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">الرياض</a></li>
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">جدة</a></li>
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">الدمام</a></li>
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">الخبر</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-8">خدماتنا</h4>
            <ul className="space-y-4 text-sm text-white/50 font-medium">
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">تخطيط الفعاليات</a></li>
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">ضيافة متميزة</a></li>
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">كونسيرج VIP</a></li>
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">باقات الشركات</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-8">النشرة البريدية</h4>
            <p className="text-sm text-white/50 mb-6 font-medium">اشترك لتصلك دعوات حصرية لأرقى القاعات الجديدة.</p>
            <div className="relative">
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pr-6 pl-12 text-sm focus:border-[#D4AF37] focus:ring-0 text-right outline-none" 
                placeholder="البريد الإلكتروني"
              />
              <button className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-white/5 gap-6 text-xs text-white/20 font-black uppercase tracking-widest flex-row-reverse">
          <p>© 2024 LUXURYVENUES SAUDI. جميع الحقوق محفوظة.</p>
          <div className="flex gap-10">
            <a className="hover:text-white transition-colors" href="#">سياسة الخصوصية</a>
            <a className="hover:text-white transition-colors" href="#">شروط الخدمة</a>
          </div>
        </div>
      </footer>

      {selectedHall && (
        <HallDetailPopup 
          hall={selectedHall} 
          user={user} 
          onClose={() => setSelectedHall(null)} 
        />
      )}
    </div>
  );
};
