
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, SAUDI_CITIES, Hall } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Input } from '../components/ui/Input';
import { 
  Search, MapPin, Star, Users, Filter, SlidersHorizontal, 
  ArrowLeft, ArrowRight, LayoutGrid, List, Check, X,
  Building2, Palmtree, Sparkles, ChevronLeft
} from 'lucide-react';

interface BrowseHallsProps {
  user: UserProfile | null;
  mode: 'halls' | 'services'; 
  onBack: () => void;
  onNavigate: (tab: string, item?: any) => void;
  initialFilters?: any;
}

export const BrowseHalls: React.FC<BrowseHallsProps> = ({ user, mode, onBack, onNavigate, initialFilters }) => {
  // --- Data State ---
  const [rawData, setRawData] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- Filter State ---
  const [filters, setFilters] = useState({
    search: '',
    city: initialFilters?.city || 'all',
    type: initialFilters?.type || 'all',
    minPrice: '',
    maxPrice: '',
    minCapacity: 0,
  });

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Halls
      const { data: halls, error: hError } = await supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true);
      
      // Fetch Chalets (now in a separate table)
      const { data: chalets, error: cError } = await supabase.from('chalets').select('*, vendor:vendor_id(*)').eq('is_active', true);
      
      if (hError || cError) throw hError || cError;

      // Merge and normalize (inject 'type' for chalets as they are now in a separate table without type column sometimes)
      const combinedData = [
          ...(halls || []).map(h => ({ ...h, type: 'hall' })),
          ...(chalets || []).map(c => ({ ...c, type: 'chalet' }))
      ];

      setRawData(combinedData as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Filtering Logic ---
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      // 1. Search Text
      if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      
      // 2. City
      if (filters.city !== 'all' && item.city !== filters.city) return false;
      
      // 3. Type
      if (filters.type !== 'all') {
          if (filters.type === 'hall' && item.type !== 'hall') return false;
          if (filters.type === 'chalet' && item.type !== 'chalet') return false;
      }

      // 4. Price Range
      const price = Number(item.price_per_night);
      if (filters.minPrice && price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && price > Number(filters.maxPrice)) return false;

      // 5. Capacity
      const cap = Number(item.capacity);
      if (filters.minCapacity > 0 && cap < filters.minCapacity) return false;

      return true;
    });
  }, [rawData, filters]);

  // --- Render Helpers ---
  const handleFilterChange = (key: string, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
      setFilters({
          search: '',
          city: 'all',
          type: 'all',
          minPrice: '',
          maxPrice: '',
          minCapacity: 0
      });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-gray-900 pb-20 pt-28 font-tajawal" dir="rtl">
      
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header & Mobile Filter Toggle */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
             <div>
                <h1 className="text-3xl font-black text-gray-900">تصفح القاعات والشاليهات</h1>
                <p className="text-gray-500 font-bold mt-2 text-sm">اختر المكان الأنسب لمناسبتك من بين {filteredData.length} خيار متاح</p>
             </div>
             <button 
                onClick={() => setShowMobileFilters(true)} 
                className="lg:hidden flex items-center gap-2 bg-white border border-gray-200 px-6 py-3 rounded-2xl font-bold text-sm w-full md:w-auto justify-center"
             >
                <Filter className="w-4 h-4" /> تصفية النتائج
             </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 relative items-start">
              
              {/* --- SIDEBAR FILTERS (Sticky on Desktop) --- */}
              <aside className={`
                  lg:w-80 shrink-0 space-y-8 lg:sticky lg:top-32 h-fit bg-white border border-gray-100 rounded-[2.5rem] p-6
                  ${showMobileFilters ? 'fixed inset-0 z-[100] m-0 rounded-none overflow-y-auto' : 'hidden lg:block'}
              `}>
                 <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                    <h3 className="text-lg font-black flex items-center gap-2 text-gray-900">
                        <SlidersHorizontal className="w-5 h-5 text-primary" /> خيارات البحث
                    </h3>
                    {showMobileFilters && (
                        <button onClick={() => setShowMobileFilters(false)} className="p-2 bg-gray-50 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                    )}
                    <button onClick={clearFilters} className="text-xs font-bold text-primary hover:underline">مسح الكل</button>
                 </div>

                 {/* 1. Search */}
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">اسم المكان</label>
                    <div className="relative">
                        <input 
                            className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 pl-10 text-sm font-bold focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-gray-300"
                            placeholder="ابحث بالاسم..."
                            value={filters.search}
                            onChange={e => handleFilterChange('search', e.target.value)}
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                 </div>

                 {/* 2. Type Selector */}
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">نوع المكان</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'all', label: 'الكل', icon: LayoutGrid },
                            { id: 'hall', label: 'قاعات', icon: Building2 },
                            { id: 'chalet', label: 'منتجعات', icon: Palmtree }
                        ].map(type => (
                            <button 
                                key={type.id}
                                onClick={() => handleFilterChange('type', type.id)}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all ${filters.type === type.id ? 'bg-primary text-white border-primary' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                            >
                                <type.icon className="w-5 h-5" />
                                <span className="text-[10px] font-bold">{type.label}</span>
                            </button>
                        ))}
                    </div>
                 </div>

                 {/* 3. City */}
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">المدينة</label>
                    <div className="relative">
                        <select 
                            className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-sm font-bold outline-none cursor-pointer appearance-none text-gray-700 focus:bg-white focus:border-primary/20 transition-all"
                            value={filters.city}
                            onChange={e => handleFilterChange('city', e.target.value)}
                        >
                            <option value="all">كل المدن</option>
                            {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <MapPin className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                 </div>

                 {/* 4. Price Range */}
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">الميزانية (لليلة الواحدة)</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            placeholder="من" 
                            className="flex-1 h-12 rounded-xl bg-gray-50 border border-gray-100 px-4 text-sm font-bold focus:bg-white focus:border-primary/20 outline-none transition-all"
                            value={filters.minPrice}
                            onChange={e => handleFilterChange('minPrice', e.target.value)}
                        />
                        <span className="text-gray-300">-</span>
                        <input 
                            type="number" 
                            placeholder="إلى" 
                            className="flex-1 h-12 rounded-xl bg-gray-50 border border-gray-100 px-4 text-sm font-bold focus:bg-white focus:border-primary/20 outline-none transition-all"
                            value={filters.maxPrice}
                            onChange={e => handleFilterChange('maxPrice', e.target.value)}
                        />
                    </div>
                 </div>

                 {/* 5. Capacity */}
                 <div className="space-y-4 pt-2">
                    <div className="flex justify-between">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">السعة (أفراد)</label>
                        <span className="text-xs font-black text-primary">{filters.minCapacity}+</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" max="2000" step="50"
                        value={filters.minCapacity}
                        onChange={e => handleFilterChange('minCapacity', Number(e.target.value))}
                        className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                 </div>

                 {showMobileFilters && (
                     <Button onClick={() => setShowMobileFilters(false)} className="w-full h-14 rounded-2xl font-black text-lg mt-8 bg-primary text-white">
                         إظهار النتائج ({filteredData.length})
                     </Button>
                 )}
              </aside>

              {/* --- MAIN CONTENT --- */}
              <section className="flex-1 min-w-0 space-y-6">
                 
                 {/* Top Controls */}
                 <div className="flex flex-row justify-between items-center bg-white p-2 pl-4 rounded-[1.5rem] border border-gray-100">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-white bg-black px-3 py-1.5 rounded-xl ml-2 hidden sm:inline-block">نتائج البحث</span>
                       <span className="text-sm font-bold text-gray-500">{filteredData.length} مكان</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-gray-400 hidden sm:inline">عرض:</span>
                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-primary border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid className="w-4 h-4" /></button>
                            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-primary border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}><List className="w-4 h-4" /></button>
                        </div>
                    </div>
                 </div>

                 {/* Results Grid */}
                 {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1,2,3,4,5,6].map(i => <div key={i} className="bg-gray-100 rounded-[2.5rem] aspect-[4/3] animate-pulse"></div>)}
                    </div>
                 ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-white border border-gray-100 rounded-[2.5rem]">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Search className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">لم نجد نتائج مطابقة</h3>
                        <p className="text-gray-400 font-bold max-w-xs mx-auto mb-8">جرب تغيير معايير البحث أو إزالة بعض الفلاتر لرؤية المزيد من الخيارات.</p>
                        <Button onClick={clearFilters} variant="outline" className="h-12 px-8 rounded-xl font-bold border-gray-200">إزالة كافة الفلاتر</Button>
                    </div>
                 ) : (
                    <div className={viewMode === 'grid' ? "grid md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                        {filteredData.map(item => (
                            <div 
                                key={item.id} 
                                onClick={() => onNavigate('hall_details', { item, type: item.type === 'hall' ? 'hall' : 'chalet' })}
                                className={`
                                    group bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden cursor-pointer
                                    hover:border-primary/30 transition-all duration-300 relative
                                    ${viewMode === 'list' ? 'flex flex-row items-stretch min-h-[200px]' : 'flex flex-col'}
                                `}
                            >
                                {/* Image */}
                                <div className={`relative overflow-hidden bg-gray-100 ${viewMode === 'list' ? 'w-2/5' : 'aspect-[4/3]'}`}>
                                    <img 
                                        src={item.image_url || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                        alt={item.name}
                                    />
                                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 border border-gray-100">
                                        <MapPin className="w-3 h-3 text-primary" /> {item.city}
                                    </div>
                                    <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Users className="w-3 h-3" /> {item.capacity}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className={`p-6 flex flex-col ${viewMode === 'list' ? 'w-3/5 justify-center' : ''}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${item.type === 'hall' ? 'bg-purple-500' : 'bg-blue-500'}`}></span>
                                                <span className="text-[10px] font-bold text-gray-400">{item.type === 'hall' ? 'قاعة أفراح' : 'شاليه / منتجع'}</span>
                                            </div>
                                            <h3 className="font-black text-lg text-gray-900 group-hover:text-primary transition-colors line-clamp-1">{item.name}</h3>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-black bg-yellow-50 text-yellow-600 px-2 py-1 rounded-lg border border-yellow-100">
                                            <Star className="w-3 h-3 fill-current" /> 4.9
                                        </div>
                                    </div>

                                    {/* Description - Show only in Grid or short in List */}
                                    <p className="text-xs text-gray-500 font-medium line-clamp-2 leading-relaxed mb-6 mt-2">
                                        {item.description || 'استمتع بتجربة فريدة ومميزة في هذا المكان الرائع..'}
                                    </p>

                                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">سعر الليلة يبدأ من</span>
                                            <PriceTag amount={item.price_per_night} className="text-xl font-black text-gray-900" />
                                        </div>
                                        <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                            <ChevronLeft className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}

              </section>
          </div>
      </main>
    </div>
  );
};
