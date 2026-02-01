
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, SAUDI_CITIES, HALL_AMENITIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Search, MapPin, Star, Users, ArrowRight, ArrowLeft, 
  ChevronRight, ChevronLeft, Filter, X, 
  Diamond, ShoppingBag, Info, Loader2,
  Calendar as CalendarIcon, Package, Sparkles, Building2, User,
  LayoutGrid, SlidersHorizontal, RotateCcw, Check, LogOut, LayoutDashboard, CalendarDays, Settings, ClipboardList
} from 'lucide-react';
import { HallDetailPopup } from '../components/Home/HallDetailPopup';
import { useToast } from '../context/ToastContext';

interface BrowseHallsProps {
  user: UserProfile | null;
  mode: 'halls' | 'services';
  onBack: () => void;
  onLoginClick: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

export const BrowseHalls: React.FC<BrowseHallsProps> = ({ user, mode, onBack, onLoginClick, onNavigate, onLogout }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<{ item: any, type: 'hall' | 'service' } | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter States
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<number>(150000);
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
    setPriceRange(150000);
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
    <div className="min-h-screen bg-[#0f0a14] text-white font-sans selection:bg-[#4B0082] selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-[100] w-full border-b border-white/5 bg-[#0f0a14]/95 backdrop-blur-md px-6 lg:px-20 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div onClick={onBack} className="flex items-center gap-2 cursor-pointer group">
              <div className="text-[#D4AF37] group-hover:scale-110 transition-transform duration-300">
                <Diamond className="w-8 h-8 fill-current" />
              </div>
              <h2 className="text-xl font-black tracking-tighter uppercase">
                Royal<span className="text-[#D4AF37]">Venues</span>
              </h2>
            </div>
            
            <div className="hidden xl:flex items-center h-10 min-w-[400px] rounded-xl border border-white/10 bg-white/5 px-4 focus-within:border-[#D4AF37]/50 transition-all shadow-inner">
              <Search className="w-4 h-4 text-[#D4AF37] me-3" />
              <input 
                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-start placeholder:text-white/10" 
                placeholder={mode === 'halls' ? 'ابحث عن القاعة...' : 'ابحث عن الخدمات...'} 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
             <nav className="hidden md:flex items-center gap-8">
                <button onClick={onBack} className="text-white/30 text-xs font-bold hover:text-white transition-all">الرئيسية</button>
                <button onClick={() => fetchData()} className={`text-xs font-bold transition-all ${mode === 'halls' ? 'text-[#D4AF37]' : 'text-white/30 hover:text-white'}`}>القاعات</button>
             </nav>
             {!user ? (
               <button onClick={onLoginClick} className="bg-[#D4AF37] text-black px-6 py-2 rounded-xl text-xs font-black transition-all hover:bg-white active:scale-95 shadow-xl">دخول</button>
             ) : (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 bg-black border border-white/10 ps-4 pe-1.5 py-1.5 rounded-full hover:bg-white/5 transition-all shadow-xl">
                    <span className="text-xs font-bold text-white/90 hidden sm:inline">{user.full_name}</span>
                    <div className="w-8 h-8 rounded-full bg-[#4B0082] flex items-center justify-center text-white shadow-xl">
                      <User className="w-4 h-4" />
                    </div>
                  </button>
                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-3 w-60 bg-[#191022] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[110]">
                      <div className="p-5 border-b border-white/5 text-right"><p className="text-sm font-bold text-white truncate">{user.full_name}</p></div>
                      <div className="p-2 space-y-1">
                        <button onClick={() => onNavigate('dashboard')} className="w-full flex items-center justify-end gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-white/50 hover:bg-white/5 hover:text-[#D4AF37] transition-all">لوحة التحكم <LayoutDashboard className="w-4 h-4" /></button>
                        <button onClick={onLogout} className="w-full flex items-center justify-end gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-all">خروج <LogOut className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-20 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="sticky top-28 space-y-10 text-start">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2">الفلترة <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" /></h2>
                <button onClick={resetFilters} className="text-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors flex items-center gap-1 text-[10px] font-black uppercase"><RotateCcw className="w-3 h-3" /> Reset</button>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/10 block ps-1">المدينة</label>
                <div className="relative">
                  <select 
                    className="w-full h-12 rounded-xl border border-white/10 bg-white/5 ps-4 pe-10 text-xs font-bold text-start appearance-none focus:border-[#D4AF37]/50 focus:ring-0 outline-none"
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                  >
                    <option value="all">كل المملكة</option>
                    {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <MapPin className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37]" />
                </div>
              </div>

              <div className="space-y-6 pt-4">
                 <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/10">الميزانية</label>
                    <PriceTag amount={priceRange} className="text-xs font-black text-[#D4AF37]" />
                 </div>
                 <input type="range" min="5000" max="150000" step="5000" className="w-full accent-[#D4AF37] h-1 bg-white/10 rounded-full appearance-none cursor-pointer" value={priceRange} onChange={e => setPriceRange(parseInt(e.target.value))} />
              </div>
            </div>
          </aside>

          {/* Listings */}
          <section className="flex-1">
            <div className="text-start space-y-1 mb-10">
              <h1 className="text-3xl font-black tracking-tight">{mode === 'halls' ? 'نخبة قاعات المملكة' : 'أرقى خدمات التنظيم'}</h1>
              <p className="text-white/20 text-sm font-medium">تم العثور على {filteredData.length} اختيار حصري.</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[4/5] bg-white/5 animate-pulse rounded-3xl"></div>)}
              </div>
            ) : filteredData.length === 0 ? (
              <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20"><Search className="w-20 h-20 mx-auto mb-6" /><h3 className="text-2xl font-black">لا توجد نتائج</h3></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
                {filteredData.map((item) => (
                  <div key={item.id} onClick={() => setSelectedItem({ item, type: mode === 'halls' ? 'hall' : 'service' })} className="group cursor-pointer space-y-4 animate-in fade-in duration-500">
                    <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                      <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={item.image_url} alt={item.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a14] via-transparent to-transparent opacity-90"></div>
                      <div className="absolute bottom-8 inset-x-8 flex justify-between items-end">
                         <div className="text-start">
                            <PriceTag amount={mode === 'halls' ? item.price_per_night : item.price} className="text-3xl text-white mb-1" />
                            <p className="text-[10px] text-white/30 font-black uppercase">{mode === 'halls' ? 'للحدث الواحد' : 'Professional Fee'}</p>
                         </div>
                         <div className="bg-[#4B0082] w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110"><ArrowLeft className="w-6 h-6" /></div>
                      </div>
                    </div>
                    <div className="text-start px-4 space-y-1">
                      <h3 className="text-xl font-black text-white group-hover:text-[#D4AF37] transition-colors tracking-tight leading-tight">{item.name}</h3>
                      <div className="flex items-center gap-3 text-white/20 text-[10px] font-bold uppercase">
                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#D4AF37]" /> {mode === 'halls' ? item.city : item.vendor?.business_name}</span>
                        {mode === 'halls' && <span className="flex items-center gap-1.5 text-[#D4AF37]"><Sparkles className="w-3.5 h-3.5" /> Premium</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      {selectedItem && <HallDetailPopup item={selectedItem.item} type={selectedItem.type} user={user} onClose={() => setSelectedItem(null)} />}
    </div>
  );
};
