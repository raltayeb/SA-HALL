
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, SAUDI_CITIES, HALL_AMENITIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Search, MapPin, Star, Users, ArrowRight, ArrowLeft, 
  ChevronRight, ChevronLeft, Filter, X, 
  Diamond, ShoppingBag, Info, Loader2,
  Calendar as CalendarIcon, Package, Sparkles, Building2, User,
  LayoutGrid, SlidersHorizontal, RotateCcw
} from 'lucide-react';
import { HallDetailPopup } from '../components/Home/HallDetailPopup';
import { useToast } from '../context/ToastContext';

interface BrowseHallsProps {
  user: UserProfile | null;
  mode: 'halls' | 'services';
  onBack: () => void;
  onLoginClick: () => void;
}

export const BrowseHalls: React.FC<BrowseHallsProps> = ({ user, mode, onBack, onLoginClick }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedHall, setSelectedHall] = useState<(Hall & { vendor?: UserProfile }) | null>(null);
  
  const { toast } = useToast();
  
  // Filter States
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<number>(100000);
  const [capacity, setCapacity] = useState<number>(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'halls') {
        let query = supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true);
        if (selectedCity !== 'all') query = query.eq('city', selectedCity);
        const { data: res, error } = await query;
        if (error) throw error;
        setData(res || []);
      } else {
        let query = supabase.from('services').select('*, vendor:vendor_id(*)').eq('is_active', true);
        const { data: res, error } = await query;
        if (error) throw error;
        setData(res || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mode, selectedCity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleAmenity = (am: string) => {
    setSelectedAmenities(prev => 
      prev.includes(am) ? prev.filter(a => a !== am) : [...prev, am]
    );
  };

  const resetFilters = () => {
    setSelectedCity('all');
    setSelectedAmenities([]);
    setPriceRange(100000);
    setCapacity(0);
    setSearch('');
  };

  const filteredData = data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const itemPrice = item.price_per_night || item.price;
    const matchesPrice = itemPrice <= priceRange;
    
    if (mode === 'halls') {
      const matchesAmenities = selectedAmenities.length === 0 || 
        selectedAmenities.every(a => item.amenities?.includes(a));
      const matchesCapacity = capacity === 0 || item.capacity >= capacity;
      return matchesSearch && matchesPrice && matchesAmenities && matchesCapacity;
    }
    return matchesSearch && matchesPrice;
  });

  return (
    <div className="min-h-screen bg-[#0f0a14] text-white font-sans selection:bg-primary selection:text-white">
      {/* Global Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0f0a14]/80 backdrop-blur-xl px-6 lg:px-40 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between flex-row-reverse">
          <div className="flex items-center gap-10 flex-row-reverse">
            <div onClick={onBack} className="flex items-center gap-3 flex-row-reverse cursor-pointer group">
              <div className="text-[#D4AF37] group-hover:scale-110 transition-transform">
                <Diamond className="w-8 h-8 fill-current" />
              </div>
              <h2 className="text-xl font-black tracking-tight uppercase">
                LUXURY<span className="text-[#D4AF37]">VENUES</span>
              </h2>
            </div>
            
            <div className="hidden lg:flex items-center h-12 min-w-[400px] rounded-2xl border border-white/10 bg-white/5 flex-row-reverse px-4 focus-within:border-[#D4AF37]/50 transition-colors">
              <Search className="w-5 h-5 text-white/20" />
              <input 
                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-right px-4 placeholder:text-white/20" 
                placeholder={mode === 'halls' ? 'ابحث عن قاعة ملكية...' : 'ابحث عن خدمات الضيافة...'} 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 flex-row-reverse">
             <nav className="hidden md:flex items-center gap-8 flex-row-reverse">
                <button onClick={onBack} className="text-white/60 text-sm font-bold hover:text-white transition-all">الرئيسية</button>
                <button onClick={() => fetchData()} className={`text-sm font-bold transition-all ${mode === 'halls' ? 'text-[#D4AF37]' : 'text-white/60 hover:text-white'}`}>القاعات</button>
                <button className={`text-sm font-bold transition-all ${mode === 'services' ? 'text-[#D4AF37]' : 'text-white/60 hover:text-white'}`}>الخدمات</button>
             </nav>
             {!user ? (
               <button 
                onClick={onLoginClick}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-xl text-sm font-black transition-all shadow-soft-primary"
               >
                 دخول الشركاء
               </button>
             ) : (
               <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                 <span className="text-xs font-black text-white/80">{user.full_name}</span>
                 <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                 </div>
               </div>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-40 py-12">
        {/* Cinematic Breadcrumbs */}
        <nav className="flex items-center gap-3 mb-12 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex-row-reverse">
          <button onClick={onBack} className="hover:text-[#D4AF37] transition-colors">الرئيسية</button>
          <ChevronLeft className="w-3 h-3" />
          <span className="text-[#D4AF37]">
            {mode === 'halls' ? 'القاعات الملكية في المملكة' : 'أرقى خدمات المناسبات'}
          </span>
        </nav>

        <div className="flex flex-col lg:flex-row-reverse gap-16">
          {/* Luxury Sidebar Filters */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="sticky top-32 space-y-8 text-right animate-in fade-in slide-in-from-right-10 duration-700">
              <div className="flex items-center justify-between flex-row-reverse border-b border-white/5 pb-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  تصفية النتائج <SlidersHorizontal className="w-5 h-5 text-[#D4AF37]" />
                </h2>
                <button 
                  onClick={resetFilters} 
                  className="text-white/40 hover:text-[#D4AF37] transition-colors flex items-center gap-2 text-[10px] font-black uppercase"
                >
                  <RotateCcw className="w-3 h-3" /> إعادة تعيين
                </button>
              </div>

              {/* City Filter */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">المدينة</label>
                <div className="relative group">
                  <select 
                    className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 text-sm font-bold text-right appearance-none focus:border-[#D4AF37]/50 focus:ring-0 transition-all outline-none"
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                  >
                    <option value="all">كل مدن المملكة</option>
                    {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-hover:text-[#D4AF37] transition-colors" />
                </div>
              </div>

              {/* Capacity Filter - Halls Only */}
              {mode === 'halls' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">السعة الاستيعابية</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[0, 200, 500, 1000].map(cap => (
                      <button 
                        key={cap}
                        onClick={() => setCapacity(cap)}
                        className={`h-12 rounded-xl border font-bold text-xs transition-all ${capacity === cap ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-white/5 bg-white/5 text-white/40 hover:border-white/20'}`}
                      >
                        {cap === 0 ? 'الكل' : `+${cap} ضيف`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Range Slider */}
              <div className="space-y-6 pt-4">
                 <div className="flex justify-between items-center flex-row-reverse">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">الميزانية</label>
                    <span className="text-xs font-black text-[#D4AF37]">
                      <PriceTag amount={priceRange} className="inline-flex" />
                    </span>
                 </div>
                 <input 
                  type="range" 
                  min="5000" max="150000" step="5000"
                  className="w-full accent-[#D4AF37] h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                  value={priceRange}
                  onChange={e => setPriceRange(parseInt(e.target.value))}
                 />
                 <div className="flex justify-between flex-row-reverse text-[10px] font-bold text-white/20">
                    <span>150k ر.س</span>
                    <span>5k ر.س</span>
                 </div>
              </div>

              {/* Amenities - Halls Only */}
              {mode === 'halls' && (
                <div className="space-y-4 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">المرافق والمميزات</label>
                  <div className="space-y-3">
                    {HALL_AMENITIES.slice(0, 5).map(am => (
                      <label key={am} className="flex items-center gap-4 cursor-pointer group flex-row-reverse">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedAmenities.includes(am) ? 'border-[#D4AF37] bg-[#D4AF37] text-black' : 'border-white/10 bg-white/5 group-hover:border-white/30'}`}>
                          {selectedAmenities.includes(am) && <RotateCcw className="w-3 h-3 rotate-45" />}
                        </div>
                        <input 
                          type="checkbox" 
                          hidden
                          checked={selectedAmenities.includes(am)}
                          onChange={() => toggleAmenity(am)}
                        />
                        <span className={`text-xs font-bold transition-colors ${selectedAmenities.includes(am) ? 'text-white' : 'text-white/40 group-hover:text-white'}`}>{am}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Cinematic Listings Grid */}
          <section className="flex-1">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 flex-row-reverse gap-6">
              <div className="text-right">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
                  {mode === 'halls' ? 'نخبة القاعات الملكية' : 'أرقى خدمات الضيافة'}
                </h1>
                <p className="text-white/40 text-lg font-medium">
                  {filteredData.length} اختيار متاح حالياً يطابق تفضيلاتك
                </p>
              </div>
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-3 cursor-pointer hover:bg-white/10 transition-colors flex-row-reverse group">
                <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">ترتيب:</span>
                <span className="text-xs font-black text-[#D4AF37]">الأعلى سعراً</span>
                <ChevronLeft className="w-4 h-4 text-[#D4AF37] group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-[4/5] bg-white/5 animate-pulse rounded-[3rem]"></div>
                ))}
              </div>
            ) : filteredData.length === 0 ? (
              <div className="py-40 text-center bg-white/5 rounded-[4rem] border-2 border-dashed border-white/5 animate-in fade-in duration-1000">
                 <Search className="w-20 h-20 mx-auto mb-8 text-white/10" />
                 <h3 className="text-3xl font-black mb-4">لم نجد ما تبحث عنه</h3>
                 <p className="text-white/30 text-lg font-bold">جرب تغيير الفلاتر أو مدينة البحث</p>
                 <Button onClick={resetFilters} variant="outline" className="mt-8 rounded-2xl h-14 px-10 border-white/10 text-white/60 hover:text-white">إعادة تعيين الفلاتر</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {filteredData.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => mode === 'halls' ? setSelectedHall(item) : null}
                    className="group bg-white/5 rounded-[3rem] overflow-hidden border border-white/10 hover:border-[#D4AF37]/30 transition-all duration-700 shadow-2xl flex flex-col cursor-pointer hover:-translate-y-2"
                  >
                    <div className="relative h-[450px] overflow-hidden">
                      <img className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110" src={item.image_url} alt={item.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a14] via-transparent to-transparent opacity-90"></div>
                      
                      {/* Top Badges */}
                      <div className="absolute top-8 inset-x-8 flex justify-between items-start flex-row-reverse">
                         <div className="bg-black/50 backdrop-blur-xl px-5 py-2 rounded-full flex items-center gap-2 shadow-2xl border border-white/10">
                            <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                            <span className="text-xs font-black">4.9</span>
                         </div>
                         <div className="bg-primary/90 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl">
                           مميز
                         </div>
                      </div>

                      {/* Floating Info */}
                      <div className="absolute bottom-8 inset-x-8 text-right space-y-4">
                         <div className="space-y-1">
                            <h3 className="text-3xl font-black leading-none group-hover:text-[#D4AF37] transition-colors">{item.name}</h3>
                            <p className="text-white/60 font-bold flex items-center justify-end gap-2 text-sm">
                              {mode === 'halls' ? item.city : item.category} <MapPin className="w-4 h-4 text-[#D4AF37]" />
                            </p>
                         </div>
                         <div className="flex justify-between items-center flex-row-reverse border-t border-white/10 pt-6">
                            <PriceTag amount={mode === 'halls' ? item.price_per_night : item.price} className="text-3xl text-[#D4AF37]" iconSize={26} />
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/5 border border-white/10">
                               <Users className="w-4 h-4 text-white/40" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                  {mode === 'halls' ? `${item.capacity} ضيف` : item.category}
                               </span>
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="p-8 pt-2">
                       <button 
                        className="w-full bg-white text-black hover:bg-[#D4AF37] hover:text-black font-black py-5 rounded-[2rem] transition-all flex items-center justify-center gap-3 shadow-2xl group/btn"
                       >
                         {mode === 'halls' ? 'احجز تجربتك الملكية' : 'عرض تفاصيل الخدمة'}
                         <ArrowLeft className="w-5 h-5 group-hover/btn:-translate-x-2 transition-transform" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-24 flex justify-center items-center gap-6 flex-row-reverse">
              <button className="w-16 h-16 rounded-[2rem] border border-white/10 text-white/40 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all flex items-center justify-center">
                <ChevronRight className="w-8 h-8" />
              </button>
              <div className="flex gap-3 flex-row-reverse">
                <button className="w-16 h-16 rounded-[2rem] bg-[#D4AF37] text-black font-black shadow-soft-primary scale-110">1</button>
                <button className="w-16 h-16 rounded-[2rem] bg-white/5 border border-white/10 text-white/40 font-black hover:border-white/30 transition-all">2</button>
                <button className="w-16 h-16 rounded-[2rem] bg-white/5 border border-white/10 text-white/40 font-black hover:border-white/30 transition-all">3</button>
              </div>
              <button className="w-16 h-16 rounded-[2rem] border border-white/10 text-white/40 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all flex items-center justify-center">
                <ChevronLeft className="w-8 h-8" />
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-40 border-t border-white/5 py-24 bg-black">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-40 flex flex-col md:flex-row-reverse justify-between items-center gap-16">
          <div className="flex items-center gap-4 text-[#D4AF37] flex-row-reverse">
            <Diamond className="w-12 h-12 opacity-50 fill-current" />
            <div className="text-right">
               <h2 className="text-2xl font-black tracking-tight uppercase">Luxury Halls</h2>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Kingdom of Saudi Arabia</p>
            </div>
          </div>
          <div className="flex gap-16 text-white/30 text-sm font-black flex-row-reverse uppercase tracking-widest">
            <a className="hover:text-[#D4AF37] transition-colors" href="#">الخصوصية</a>
            <a className="hover:text-[#D4AF37] transition-colors" href="#">الشروط</a>
            <a className="hover:text-[#D4AF37] transition-colors" href="#">الدعم</a>
          </div>
          <p className="text-white/10 text-[10px] font-black uppercase tracking-[0.4em]">© 2024 LUXURYVENUES. ALL RIGHTS RESERVED.</p>
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
