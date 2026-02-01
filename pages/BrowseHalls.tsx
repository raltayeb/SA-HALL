
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
  LayoutGrid, SlidersHorizontal, RotateCcw, Check, LogOut, LayoutDashboard, CalendarDays, Settings, ClipboardList,
  ChevronDown, Grid3X3, List, Home as HomeIcon
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
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

  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<number>(150000);

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

  const filteredData = data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const itemPrice = item.price_per_night || item.price;
    const matchesPrice = itemPrice <= priceRange;
    return matchesSearch && matchesPrice;
  });

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      {/* Header Search - Realeast style */}
      <header className="sticky top-0 z-[100] w-full border-b border-gray-100 bg-white/95 backdrop-blur-md px-6 lg:px-20 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-12">
          <div className="flex items-center gap-10">
            <div onClick={onBack} className="flex items-center gap-2 cursor-pointer group shrink-0">
              <Diamond className="w-7 h-7 text-primary fill-current" />
              <h2 className="text-4xl font-ruqaa text-primary leading-none mt-1">قاعه</h2>
            </div>
            
            <div className="hidden xl:flex items-center h-12 min-w-[500px] rounded-2xl border border-gray-100 bg-gray-50 px-6 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <Search className="w-5 h-5 text-gray-400 me-4" />
              <input 
                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-start placeholder:text-gray-300 text-gray-700" 
                placeholder="ابحث عن مكان، مدينة، أو خدمة..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex bg-gray-50 border rounded-xl p-1 shrink-0">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}><Grid3X3 className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}><List className="w-4 h-4" /></button>
             </div>
             {!user ? (
               <Button onClick={onLoginClick} className="px-6 h-10 rounded-xl font-black text-xs bg-[#111827] text-white">دخول</Button>
             ) : (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 bg-gray-50 border p-1 rounded-full hover:shadow-md transition-all">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-black text-[10px] uppercase">{user.full_name?.[0]}</div>
                    <ChevronDown className="w-3 h-3 text-gray-400 mx-1" />
                  </button>
                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-3 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[110] text-right">
                      <div className="p-2">
                        <button onClick={() => onNavigate('dashboard')} className="w-full flex items-center justify-end gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase text-gray-600 hover:bg-gray-50">لوحة التحكم <LayoutDashboard className="w-4 h-4" /></button>
                        <button onClick={onLogout} className="w-full flex items-center justify-end gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase text-red-600 hover:bg-red-50">خروج <LogOut className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-20 py-16 flex flex-col lg:flex-row gap-16">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-72 shrink-0 space-y-12 text-right">
             <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight text-gray-900">قائمة القاعات</h2>
                <div className="flex items-center justify-end gap-2 text-gray-400 font-bold">
                   <ChevronDown className="w-3 h-3" /> <span>المملكة العربية السعودية</span> <MapPin className="w-4 h-4 text-primary" />
                </div>
             </div>

             <div className="space-y-6">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 block ps-1">التصنيف</label>
                <div className="flex flex-wrap gap-2">
                   {['الكل', 'فندق', 'فيلا', 'منتجع', 'قصر'].map((cat, i) => (
                      <button 
                        key={i} 
                        className={`flex-1 min-w-[100px] py-3 rounded-xl border text-[10px] font-black transition-all ${i === 0 ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white border-gray-200 text-gray-500 hover:border-primary'}`}
                      >
                        {cat}
                      </button>
                   ))}
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ps-1">
                   <span>الميزانية</span>
                   <span className="text-primary font-black">{priceRange/1000}K ر.س</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full relative">
                   <div className="absolute inset-y-0 left-0 bg-primary w-3/4 rounded-full"></div>
                </div>
                <input 
                  type="range" 
                  min="5000" 
                  max="150000" 
                  step="5000" 
                  className="w-full accent-primary" 
                  value={priceRange} 
                  onChange={e => setPriceRange(parseInt(e.target.value))} 
                />
             </div>

             <div className="pt-6 border-t border-gray-100">
                <Button variant="outline" className="w-full h-12 rounded-xl border-gray-200 gap-3 font-black text-xs text-gray-700">
                   تصفية متقدمة <SlidersHorizontal className="w-4 h-4" />
                </Button>
             </div>
          </aside>

          {/* Results Grid */}
          <section className="flex-1 space-y-10">
             <div className="flex justify-between items-center text-right">
                <p className="text-xs font-bold text-gray-400">تم العثور على <span className="text-primary font-black">{filteredData.length}</span> نتيجة مطابقة</p>
                <button onClick={() => setSearch('')} className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors flex items-center gap-2">إعادة ضبط <RotateCcw className="w-3 h-3" /></button>
             </div>

             {loading ? (
                <div className="grid md:grid-cols-2 gap-8">
                   {Array.from({length: 4}).map((_, i) => <div key={i} className="aspect-[4/5] bg-gray-50 animate-pulse rounded-[2.5rem]"></div>)}
                </div>
             ) : (
                <div className={`${viewMode === 'grid' ? 'grid md:grid-cols-2 gap-8' : 'flex flex-col gap-6'}`}>
                   {filteredData.map((item) => (
                      <div key={item.id} className={`bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden group hover:shadow-2xl transition-all text-right ${viewMode === 'list' ? 'flex' : ''}`} onClick={() => setSelectedItem({ item, type: mode === 'halls' ? 'hall' : 'service' })}>
                         <div className={`relative ${viewMode === 'grid' ? 'aspect-video' : 'w-72 shrink-0'} overflow-hidden`}>
                            <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={item.name} />
                            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-[9px] font-black text-primary shadow-sm border border-white/50">متاح</div>
                         </div>
                         <div className="p-8 space-y-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start flex-row-reverse">
                               <div className="space-y-1">
                                  <h3 className="text-2xl font-black leading-tight tracking-tight text-gray-900 group-hover:text-primary transition-colors">{item.name}</h3>
                                  <p className="text-[10px] text-gray-400 font-bold">{item.city}, السعودية</p>
                               </div>
                               <div className="text-left">
                                  <PriceTag amount={mode === 'halls' ? item.price_per_night : item.price} className="text-2xl text-gray-900 font-black" />
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">/{mode === 'halls' ? 'الليلة' : 'الخدمة'}</p>
                               </div>
                            </div>

                            <div className="mt-auto grid grid-cols-3 gap-4 pt-6 border-t border-gray-50">
                               <div className="flex flex-col items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                  <Users className="w-4 h-4 text-primary" /> {mode === 'halls' ? `${item.capacity} ضيف` : 'طاقم كامل'}
                               </div>
                               <div className="flex flex-col items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-x border-gray-50">
                                  <Star className="w-4 h-4 text-primary" /> 4.9 ممتاز
                               </div>
                               <div className="flex flex-col items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                  <MapPin className="w-4 h-4 text-primary" /> {item.city}
                               </div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </section>
      </main>
      
      {selectedItem && <HallDetailPopup item={selectedItem.item} type={selectedItem.type} user={user} onClose={() => setSelectedItem(null)} />}
    </div>
  );
};
