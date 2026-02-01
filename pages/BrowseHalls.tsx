
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, SAUDI_CITIES, HALL_AMENITIES, SERVICE_CATEGORIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Input } from '../components/ui/Input';
import { 
  Search, MapPin, Star, Users, ArrowRight, ArrowLeft, 
  ChevronRight, ChevronLeft, Filter, X, 
  Diamond, ShoppingBag, Info, Loader2,
  Calendar as CalendarIcon, Package, Sparkles, Building2, User
} from 'lucide-react';
import { HallDetailPopup } from '../components/Home/HallDetailPopup';
// Fixed: Imported useToast from context
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
  
  // Fixed: Initialized toast using useToast hook
  const { toast } = useToast();
  
  // Filter States
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

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

  const filteredData = data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesPrice = item.price_per_night ? (item.price_per_night >= priceRange[0] && item.price_per_night <= priceRange[1]) : (item.price >= priceRange[0] && item.price <= priceRange[1]);
    
    if (mode === 'halls') {
      const matchesAmenities = selectedAmenities.length === 0 || 
        selectedAmenities.every(a => item.amenities?.includes(a));
      return matchesSearch && matchesPrice && matchesAmenities;
    }
    return matchesSearch && matchesPrice;
  });

  return (
    <div className="min-h-screen bg-[#f7f6f8] dark:bg-[#191022] text-slate-900 dark:text-white font-sans selection:bg-primary selection:text-white">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-[#302839] bg-white/80 dark:bg-[#191022]/80 backdrop-blur-md px-4 md:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-row-reverse">
          <div className="flex items-center gap-8 flex-row-reverse">
            <div className="flex items-center gap-3 flex-row-reverse">
              <div className="text-primary">
                <Diamond className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black font-serif tracking-tight">Luxury Halls</h2>
            </div>
            
            <div className="hidden lg:flex items-center h-11 min-w-[300px] rounded-xl overflow-hidden border border-slate-200 dark:border-[#302839] bg-white dark:bg-[#302839] flex-row-reverse">
              <div className="px-4 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input 
                className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-right px-4" 
                placeholder={mode === 'halls' ? 'ابحث عن قاعة...' : 'ابحث عن خدمة...'} 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 flex-row-reverse">
             <nav className="hidden md:flex items-center gap-8 flex-row-reverse">
                <button onClick={onBack} className="text-slate-600 dark:text-slate-300 text-sm font-bold hover:text-primary transition-all">الرئيسية</button>
                <button className={`text-sm font-bold transition-all ${mode === 'halls' ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}>القاعات</button>
                <button className={`text-sm font-bold transition-all ${mode === 'services' ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}>الخدمات</button>
             </nav>
             <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden md:block"></div>
             {!user ? (
               <button 
                onClick={onLoginClick}
                className="flex items-center justify-center rounded-xl h-11 px-8 bg-primary text-white text-sm font-black tracking-wide shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
               >
                 تسجيل دخول
               </button>
             ) : (
               <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                 <span className="text-xs font-black text-primary">{user.full_name}</span>
                 <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                    {/* Fixed: User icon is now correctly imported */}
                    <User className="w-4 h-4" />
                 </div>
               </div>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-10 py-10">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-10 text-sm font-bold text-slate-400 flex-row-reverse">
          <button onClick={onBack} className="hover:text-primary">الرئيسية</button>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-slate-900 dark:text-white">
            {mode === 'halls' ? 'استكشاف القاعات في المملكة' : 'الخدمات المميزة'}
          </span>
        </nav>

        <div className="flex flex-col lg:flex-row-reverse gap-10">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="sticky top-28 space-y-6 bg-white dark:bg-[#1f1629] p-8 rounded-[2rem] border border-slate-200 dark:border-[#302839] shadow-soft text-right">
              <div className="flex items-center justify-between flex-row-reverse border-b dark:border-white/5 pb-4">
                <h2 className="text-xl font-black font-serif">الفلاتر</h2>
                <button 
                  onClick={() => { setSelectedCity('all'); setSelectedAmenities([]); setPriceRange([0, 100000]); }} 
                  className="text-primary text-xs font-black hover:underline"
                >إعادة تعيين</button>
              </div>

              {/* City Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 flex-row-reverse">
                  <MapPin className="text-primary w-5 h-5" />
                  <p className="font-black text-sm">المدينة</p>
                </div>
                <select 
                  className="w-full h-12 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-sm font-bold px-4 text-right outline-none"
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                >
                  <option value="all">كل المدن</option>
                  {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Amenities - Halls Only */}
              {mode === 'halls' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex-row-reverse cursor-pointer">
                    <Sparkles className="text-slate-400 w-5 h-5" />
                    <p className="font-black text-sm">المميزات</p>
                  </div>
                  <div className="pr-10 space-y-3">
                    {HALL_AMENITIES.map(am => (
                      <label key={am} className="flex items-center gap-3 cursor-pointer group flex-row-reverse">
                        <input 
                          type="checkbox" 
                          checked={selectedAmenities.includes(am)}
                          onChange={() => toggleAmenity(am)}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" 
                        />
                        <span className="text-xs font-bold text-slate-500 group-hover:text-primary transition-all">{am}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Price range display */}
              <div className="space-y-4 pt-4 border-t dark:border-white/5">
                 <p className="font-black text-sm">النطاق السعري</p>
                 <div className="flex justify-between flex-row-reverse text-[10px] font-black uppercase text-slate-400">
                    <span>100k ر.س</span>
                    <span>0 ر.س</span>
                 </div>
                 <input 
                  type="range" 
                  min="0" max="100000" step="1000"
                  className="w-full accent-primary"
                  value={priceRange[1]}
                  onChange={e => setPriceRange([0, parseInt(e.target.value)])}
                 />
                 <div className="text-center font-black text-xs text-primary">
                    أقل من <PriceTag amount={priceRange[1]} className="inline-flex" />
                 </div>
              </div>
            </div>
          </aside>

          {/* Listings Grid */}
          <section className="flex-1">
            <div className="flex items-center justify-between mb-10 flex-row-reverse">
              <div className="text-right">
                <h1 className="text-3xl md:text-4xl font-black font-serif tracking-tight mb-2">
                  {mode === 'halls' ? 'القاعات الملكية في المملكة' : 'أرقى خدمات المناسبات'}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">
                  اكتشف {filteredData.length} خيار متاح حالياً لمناسبتك القادمة.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white dark:bg-[#1f1629] border border-slate-200 dark:border-[#302839] rounded-xl px-4 py-2 cursor-pointer shadow-sm flex-row-reverse">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">ترتيب حسب:</span>
                <span className="text-xs font-black text-primary">الأعلى سعراً</span>
                <ChevronLeft className="w-4 h-4 text-primary -rotate-90" />
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[4/5] bg-white dark:bg-white/5 animate-pulse rounded-[2.5rem]"></div>)}
              </div>
            ) : filteredData.length === 0 ? (
              <div className="py-32 text-center bg-white dark:bg-white/5 rounded-[3rem] border-2 border-dashed dark:border-white/10 opacity-60">
                 <Search className="w-16 h-16 mx-auto mb-6 text-slate-400" />
                 <p className="text-2xl font-black">لم يتم العثور على نتائج تطابق بحثك</p>
                 <p className="text-slate-500 mt-2 font-bold">حاول تغيير الفلاتر أو البحث عن شيء آخر.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredData.map((item) => (
                  <div 
                    key={item.id} 
                    className="group bg-white dark:bg-[#1f1629] rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-[#302839] hover:border-primary/40 transition-all duration-500 shadow-soft hover:shadow-2xl flex flex-col"
                  >
                    <div className="relative h-72 overflow-hidden">
                      <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={item.image_url} alt={item.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                      
                      <div className="absolute top-6 right-6 bg-white/95 dark:bg-black/60 backdrop-blur-xl px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xl">
                        <Star className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]" />
                        <span className="text-xs font-black">4.9</span>
                      </div>
                      
                      {item.is_active && (
                         <div className="absolute bottom-6 right-6">
                            <span className="bg-primary text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">مميز</span>
                         </div>
                      )}
                    </div>

                    <div className="p-8 space-y-6 flex-1 flex flex-col text-right">
                      <div className="flex justify-between items-start flex-row-reverse gap-4">
                        <h3 className="text-2xl font-black leading-tight group-hover:text-primary transition-colors">{item.name}</h3>
                        <PriceTag amount={mode === 'halls' ? item.price_per_night : item.price} className="text-2xl text-primary shrink-0" iconSize={22} />
                      </div>

                      <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-500 flex-row-reverse">
                        <MapPin className="w-4 h-4 text-primary" />
                        {mode === 'halls' ? item.city : item.category}
                      </div>

                      <div className="flex justify-between items-center py-4 border-y border-slate-100 dark:border-white/5 flex-row-reverse">
                         {mode === 'halls' ? (
                           <>
                              <div className="flex items-center gap-2 flex-row-reverse">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">{item.capacity} ضيف</span>
                              </div>
                              <div className="flex items-center gap-2 flex-row-reverse">
                                <Sparkles className="w-4 h-4 text-slate-400" />
                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">أرقى الأجنحة</span>
                              </div>
                              <div className="flex items-center gap-2 flex-row-reverse">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">موقع متميز</span>
                              </div>
                           </>
                         ) : (
                           <>
                              <div className="flex items-center gap-2 flex-row-reverse">
                                <Package className="w-4 h-4 text-slate-400" />
                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">{item.category}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-row-reverse">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">{item.vendor?.business_name || 'بائع موثق'}</span>
                              </div>
                           </>
                         )}
                      </div>

                      <div className="mt-auto pt-4">
                        <button 
                          onClick={() => {
                            if (mode === 'halls') {
                              setSelectedHall(item);
                            } else {
                              // Fixed: toast is now correctly called from useToast hook
                              toast({ title: 'معاينة الخدمة', description: 'يرجى اختيار قاعة لإضافة هذه الخدمة إليها.' });
                            }
                          }}
                          className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 group-hover:shadow-primary/40 active:scale-95"
                        >
                          {mode === 'halls' ? 'احجز الآن' : 'عرض التفاصيل'}
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Placeholder */}
            <div className="mt-20 flex justify-center items-center gap-4 flex-row-reverse">
              <button className="w-12 h-12 rounded-xl border border-slate-200 dark:border-[#302839] text-slate-400 hover:border-primary hover:text-primary transition-all flex items-center justify-center">
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="flex gap-2 flex-row-reverse">
                <button className="w-12 h-12 rounded-xl bg-primary text-white font-black shadow-lg">1</button>
                <button className="w-12 h-12 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-[#302839] text-slate-600 dark:text-slate-300 font-black hover:border-primary transition-all">2</button>
                <button className="w-12 h-12 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-[#302839] text-slate-600 dark:text-slate-300 font-black hover:border-primary transition-all">3</button>
              </div>
              <button className="w-12 h-12 rounded-xl border border-slate-200 dark:border-[#302839] text-slate-400 hover:border-primary hover:text-primary transition-all flex items-center justify-center">
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-40 border-t border-slate-200 dark:border-[#302839] py-20 bg-white dark:bg-[#141118]">
        <div className="max-w-7xl mx-auto px-4 md:px-10 flex flex-col md:flex-row-reverse justify-between items-center gap-10">
          <div className="flex items-center gap-4 text-primary flex-row-reverse">
            <Diamond className="w-10 h-10 opacity-30 grayscale" />
            <h2 className="text-slate-400 dark:text-slate-600 text-2xl font-black font-serif italic tracking-tight uppercase">Luxury Halls</h2>
          </div>
          <div className="flex gap-10 text-slate-400 dark:text-slate-500 text-sm font-black flex-row-reverse">
            <a className="hover:text-primary transition-colors" href="#">سياسة الخصوصية</a>
            <a className="hover:text-primary transition-colors" href="#">شروط الخدمة</a>
            <a className="hover:text-primary transition-colors" href="#">الدعم الفني</a>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold">© 2024 LUXURY HALLS SAUDI ARABIA. جميع الحقوق محفوظة.</p>
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
