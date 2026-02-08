
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, Service, UserProfile } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
// Added Sparkles to the imported icons from lucide-react
import { MapPin, Users, Star, ArrowLeft, ArrowRight, Loader2, Filter, Search, ChevronLeft, Sparkles } from 'lucide-react';

interface PublicListingProps {
  type: 'hall' | 'chalet' | 'service';
  title: string;
  subtitle: string;
  onNavigate: (tab: string, item?: any) => void;
}

export const PublicListing: React.FC<PublicListingProps> = ({ type, title, subtitle, onNavigate }) => {
  const [featuredItems, setFeaturedItems] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const table = type === 'service' ? 'services' : 'halls';
      
      let featuredQuery = supabase.from(table).select('*, vendor:vendor_id(*)').eq('is_active', true).limit(5);
      if (type === 'hall') featuredQuery = featuredQuery.eq('type', 'hall');
      if (type === 'chalet') featuredQuery = featuredQuery.eq('type', 'chalet');
      
      const { data: featured } = await featuredQuery;
      setFeaturedItems(featured || []);

      let allQuery = supabase.from(table).select('*, vendor:vendor_id(*)').eq('is_active', true);
      if (type === 'hall') allQuery = allQuery.eq('type', 'hall');
      if (type === 'chalet') allQuery = allQuery.eq('type', 'chalet');
      
      const { data: all } = await allQuery;
      setItems(all || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % (featuredItems.length || 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [featuredItems]);

  const paginatedItems = items.slice(0, page * ITEMS_PER_PAGE);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FC] pt-32 pb-20 font-tajawal">
      {/* Boxed Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 text-primary border border-primary/10">
                <Sparkles className="w-4 h-4 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">تصفح الخيارات</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">{title}</h1>
            <p className="text-gray-500 font-bold max-w-2xl mx-auto text-lg leading-relaxed">{subtitle}</p>
        </div>

        {/* Featured Items Section - Refined Carousel */}
        {featuredItems.length > 0 && (
            <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            خلف كل حجز <span className="text-primary">قصة نجاح</span>
                        </h2>
                        <div className="w-12 h-1 bg-primary rounded-full"></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setActiveSlide(prev => prev === 0 ? featuredItems.length - 1 : prev - 1)} className="p-3 rounded-2xl bg-white border border-gray-100 hover:border-primary/20 text-gray-400 hover:text-primary transition-all"><ArrowRight className="w-5 h-5" /></button>
                        <button onClick={() => setActiveSlide(prev => (prev + 1) % featuredItems.length)} className="p-3 rounded-2xl bg-white border border-gray-100 hover:border-primary/20 text-gray-400 hover:text-primary transition-all"><ArrowLeft className="w-5 h-5" /></button>
                    </div>
                </div>
                
                <div className="relative w-full aspect-[16/8] md:aspect-[21/9] rounded-[3rem] overflow-hidden border border-gray-100 group">
                    {featuredItems.map((item, idx) => (
                        <div 
                            key={item.id} 
                            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === activeSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}
                        >
                            <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-[10000ms] scale-100 group-hover:scale-110" alt={item.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                            <div className="absolute bottom-0 right-0 p-8 md:p-16 text-white text-right max-w-3xl space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-primary text-white text-[10px] font-black">اختيار الخبراء</div>
                                <h3 className="text-3xl md:text-6xl font-black leading-tight tracking-tight">{item.name}</h3>
                                <p className="text-white/70 font-medium text-lg line-clamp-2 leading-relaxed border-r-4 border-primary/50 pr-6">{item.description}</p>
                                <div className="flex items-center gap-8 pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-small font-black text-primary uppercase tracking-widest mb-1">يبدأ من</span>
                                        <PriceTag amount={item.price_per_night || item.price} className="text-3xl md:text-4xl font-black text-white" />
                                    </div>
                                    <Button onClick={() => onNavigate('hall_details', { item, type })} className="h-14 px-10 rounded-2xl bg-white text-primary hover:bg-gray-100 font-black text-lg border-none">
                                        احجز الآن
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Filter and Grid Section */}
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-100 pb-8">
                <div className="text-right">
                    <h2 className="text-2xl font-black text-gray-900">كافة الخيارات المتاحة</h2>
                    <p className="text-sm text-gray-400 font-bold">تم العثور على {items.length} مكان متميز</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <input className="w-full h-14 bg-white border border-gray-100 rounded-2xl px-12 text-right font-bold outline-none focus:border-primary/30 transition-all" placeholder="ابحث بالاسم أو المدينة..." />
                        <Search className="w-5 h-5 text-gray-300 absolute right-4 top-1/2 -translate-y-1/2" />
                    </div>
                    <button className="h-14 w-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center hover:border-primary/20 transition-all text-gray-400 hover:text-primary">
                        <Filter className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Grid of Items - Flat Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                {paginatedItems.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => onNavigate('hall_details', { item, type })}
                        className="group bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden hover:border-primary/20 transition-all duration-500 cursor-pointer flex flex-col h-full"
                    >
                        <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
                            <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                            <div className="absolute top-5 right-5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 border border-gray-100/50">
                                <MapPin className="w-3 h-3 text-primary" /> {item.city || 'كل المناطق'}
                            </div>
                            <div className="absolute top-5 left-5 bg-primary text-white px-3 py-1.5 rounded-xl text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity">
                                متاح الآن
                            </div>
                        </div>
                        <div className="p-8 flex-1 flex flex-col space-y-5 text-right">
                            <div className="flex justify-between items-start flex-row-reverse">
                                <div className="flex items-center gap-1 text-yellow-500 text-xs font-black bg-yellow-50 px-2 py-1 rounded-lg">
                                    <Star className="w-3.5 h-3.5 fill-current" /> 4.9
                                </div>
                                <h3 className="text-xl font-black text-gray-900 group-hover:text-primary transition-colors line-clamp-1 flex-1 text-right">{item.name}</h3>
                            </div>
                            
                            <p className="text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed min-h-[40px]">{item.description}</p>
                            
                            <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between flex-row-reverse">
                                <PriceTag amount={item.price_per_night || item.price} className="text-2xl font-black text-primary" />
                                <div className="flex gap-4">
                                    {type !== 'service' && (
                                        <div className="text-[10px] font-black text-gray-400 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                            <Users className="w-3.5 h-3.5" /> {item.capacity} ضيف
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="pt-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 duration-500">
                                <div className="text-primary text-xs font-black flex items-center justify-end gap-1">
                                    <span>مشاهدة التفاصيل</span>
                                    <ChevronLeft className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Show More Button - REFINED */}
            {paginatedItems.length < items.length && (
                <div className="flex justify-center pt-12 border-t border-gray-50">
                    <Button 
                        onClick={() => setPage(p => p + 1)} 
                        variant="outline" 
                        className="h-14 px-12 rounded-2xl font-black border-2 border-gray-100 text-gray-400 hover:border-primary hover:text-primary transition-all gap-2"
                    >
                        تصفح المزيد من الخيارات <ArrowLeft className="w-5 h-5" />
                    </Button>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};
