
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, SAUDI_CITIES, SERVICE_CATEGORIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Search, MapPin, Star, Users, List, Grid3X3, SlidersHorizontal, Filter
} from 'lucide-react';

interface BrowseHallsProps {
  user: UserProfile | null;
  mode: 'halls' | 'services'; // Basic mode, but we can refine with filters
  onBack: () => void;
  onNavigate: (tab: string, item?: any) => void;
  initialFilters?: any;
}

export const BrowseHalls: React.FC<BrowseHallsProps> = ({ user, mode, onBack, onNavigate, initialFilters }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filters
  const [selectedCity, setSelectedCity] = useState<string>(initialFilters?.city || 'all');
  const [priceRange, setPriceRange] = useState<number>(initialFilters?.budget || 300000);
  const [selectedType, setSelectedType] = useState<string>(initialFilters?.type || 'all'); // hall, chalet, etc.
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // For Services

  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.city) setSelectedCity(initialFilters.city);
      if (initialFilters.budget) setPriceRange(initialFilters.budget);
      if (initialFilters.type) setSelectedType(initialFilters.type);
    }
  }, [initialFilters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'halls') {
        let query = supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true);
        
        // Filter logic applied in JS for flexibility or DB for performance. 
        // Let's do DB filtering for strict fields
        if (selectedCity !== 'all') query = query.eq('city', selectedCity);
        
        // Handle Types (Hall vs Chalet vs All)
        if (selectedType !== 'all') {
            if (selectedType === 'resort' || selectedType === 'chalet') {
                query = query.in('type', ['chalet', 'resort', 'lounge']);
            } else {
                query = query.eq('type', selectedType);
            }
        }

        const { data: res, error } = await query;
        if (error) throw error;
        setData(res || []);
      } else {
        // Services
        let query = supabase.from('services').select('*, vendor:vendor_id(*)').eq('is_active', true);
        if (selectedCategory !== 'all') query = query.eq('category', selectedCategory);
        const { data: res, error } = await query;
        if (error) throw error;
        setData(res || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mode, selectedCity, selectedType, selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const itemPrice = item.price_per_night || item.price;
    const matchesPrice = itemPrice <= priceRange;
    
    // Additional City Check for Services (if services have city in future, currently they don't explicitly in DB schema but logic can expand)
    // For halls, DB filter handles city.
    
    return matchesSearch && matchesPrice;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#111827] pb-20 pt-24">
      
      <main className="max-w-7xl mx-auto px-6 lg:px-20 py-10 flex flex-col lg:flex-row gap-10">
          
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-72 shrink-0 space-y-8 h-fit lg:sticky lg:top-24 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-black flex items-center gap-2"><SlidersHorizontal className="w-5 h-5" /> الفلترة</h3>
                <button onClick={() => { setSelectedCity('all'); setPriceRange(300000); setSearch(''); setSelectedType('all'); setSelectedCategory('all'); }} className="text-xs font-bold text-primary hover:underline">إعادة تعيين</button>
             </div>

             <div className="space-y-4">
                <label className="text-xs font-black uppercase text-gray-400 tracking-widest">بحث</label>
                <div className="relative">
                    <input 
                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-10 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        placeholder={mode === 'halls' ? "اسم القاعة..." : "اسم الخدمة..."}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
             </div>

             {mode === 'halls' && (
                 <div className="space-y-4">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest">نوع المكان</label>
                    <select 
                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-bold outline-none cursor-pointer"
                        value={selectedType}
                        onChange={e => setSelectedType(e.target.value)}
                    >
                        <option value="all">الكل</option>
                        <option value="hall">قاعات ومراسم</option>
                        <option value="chalet">شاليهات ومنتجعات</option>
                    </select>
                 </div>
             )}

             {mode === 'services' && (
                 <div className="space-y-4">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest">التصنيف</label>
                    <select 
                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-bold outline-none cursor-pointer"
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                    >
                        <option value="all">كل الخدمات</option>
                        {SERVICE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                 </div>
             )}

             {mode === 'halls' && (
                <div className="space-y-4">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest">المدينة</label>
                    <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedCity('all')} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedCity === 'all' ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>الكل</button>
                    {SAUDI_CITIES.slice(0, 6).map(city => (
                        <button key={city} onClick={() => setSelectedCity(city)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedCity === city ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>{city}</button>
                    ))}
                    </div>
                </div>
             )}

             <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-black uppercase text-gray-400 tracking-widest">
                   <span>نطاق السعر</span>
                   <span className="text-primary">{new Intl.NumberFormat('en-US').format(priceRange)} ر.س</span>
                </div>
                <input 
                  type="range" min="100" max="300000" step="100" 
                  className="w-full accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
                  value={priceRange} onChange={e => setPriceRange(Number(e.target.value))} 
                />
             </div>
          </aside>

          {/* Results */}
          <section className="flex-1">
             <div className="flex justify-between items-center mb-6">
                <div className="text-sm font-bold text-gray-500">تم العثور على {filteredData.length} نتيجة</div>
                <div className="flex bg-white border border-gray-100 p-1 rounded-xl shadow-sm">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-primary' : 'text-gray-400'}`}><Grid3X3 className="w-5 h-5" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-100 text-primary' : 'text-gray-400'}`}><List className="w-5 h-5" /></button>
                </div>
             </div>
             
             {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {Array.from({length: 6}).map((_, i) => <div key={i} className="aspect-[4/5] bg-gray-200 animate-pulse rounded-[2rem]"></div>)}
                </div>
             ) : (
                <div className={`${viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-8' : 'flex flex-col gap-6'}`}>
                   {filteredData.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => onNavigate('hall_details', { item, type: mode === 'halls' ? 'hall' : 'service' })}
                        className={`group bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all cursor-pointer ${viewMode === 'list' ? 'flex items-center p-2' : ''}`}
                      >
                         <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-48 h-32 rounded-[2rem]' : 'aspect-[4/3]'}`}>
                            <img src={item.image_url || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                            {viewMode === 'grid' && mode === 'halls' && <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black shadow-sm">{item.city}</div>}
                            {viewMode === 'grid' && mode === 'services' && <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black shadow-sm">{item.category}</div>}
                         </div>
                         
                         <div className={`p-6 space-y-3 ${viewMode === 'list' ? 'flex-1 py-2' : ''}`}>
                            <div className="flex justify-between items-start">
                               <div>
                                  <h3 className="text-lg font-black text-gray-900 group-hover:text-primary transition-colors line-clamp-1">{item.name}</h3>
                                  {viewMode === 'list' && <p className="text-xs text-gray-400 font-bold">{mode === 'halls' ? item.city : item.category}</p>}
                               </div>
                               {viewMode === 'grid' && (
                                  <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold bg-yellow-50 px-2 py-1 rounded-lg">
                                     <Star className="w-3 h-3 fill-current" /> 4.9
                                  </div>
                               )}
                            </div>
                            
                            {viewMode === 'grid' && mode === 'halls' && (
                               <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {item.capacity}</span>
                                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {item.city}</span>
                               </div>
                            )}

                            <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                               <PriceTag amount={mode === 'halls' ? item.price_per_night : item.price} className="text-xl text-primary" />
                               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">التفاصيل</span>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </section>
      </main>
    </div>
  );
};
