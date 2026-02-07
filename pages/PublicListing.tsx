
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, Service, UserProfile } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { MapPin, Users, Star, ArrowLeft, ArrowRight, Loader2, Filter, Search } from 'lucide-react';

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
      
      // 1. Fetch Featured (Simulated by taking top rated or random for now, real implementation would use is_featured flag)
      // We will take 5 items for carousel
      let featuredQuery = supabase.from(table).select('*, vendor:vendor_id(*)').eq('is_active', true).limit(5);
      if (type === 'hall') featuredQuery = featuredQuery.eq('type', 'hall');
      if (type === 'chalet') featuredQuery = featuredQuery.eq('type', 'chalet');
      
      const { data: featured } = await featuredQuery;
      setFeaturedItems(featured || []);

      // 2. Fetch All Items (Pagination logic done client side for simplicity here, or use range)
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

  // Carousel Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % (featuredItems.length || 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [featuredItems]);

  const paginatedItems = items.slice(0, page * ITEMS_PER_PAGE);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FC] pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-4">
            <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">{title}</h1>
            <p className="text-gray-500 font-bold max-w-2xl mx-auto text-lg">{subtitle}</p>
        </div>

        {/* Featured Carousel */}
        {featuredItems.length > 0 && (
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-black text-primary flex items-center gap-2">
                        <Star className="w-6 h-6 fill-current" /> {type === 'service' ? 'خدمات مميزة' : 'الأكثر طلباً'}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => setActiveSlide(prev => prev === 0 ? featuredItems.length - 1 : prev - 1)} className="p-3 rounded-full bg-white border border-gray-100 hover:bg-gray-50 transition-colors"><ArrowRight className="w-5 h-5" /></button>
                        <button onClick={() => setActiveSlide(prev => (prev + 1) % featuredItems.length)} className="p-3 rounded-full bg-white border border-gray-100 hover:bg-gray-50 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                    </div>
                </div>
                
                <div className="relative w-full aspect-[16/8] md:aspect-[21/9] rounded-[3rem] overflow-hidden shadow-2xl group">
                    {featuredItems.map((item, idx) => (
                        <div 
                            key={item.id} 
                            className={`absolute inset-0 transition-all duration-700 ease-in-out ${idx === activeSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}
                        >
                            <img src={item.image_url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            <div className="absolute bottom-0 right-0 p-8 md:p-12 text-white text-right max-w-3xl space-y-4">
                                <span className="bg-primary/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black">مميز</span>
                                <h3 className="text-3xl md:text-5xl font-black leading-tight">{item.name}</h3>
                                <p className="text-white/80 font-bold text-lg line-clamp-2 md:line-clamp-none pl-10">{item.description}</p>
                                <div className="flex items-center gap-6 pt-2">
                                    <PriceTag amount={item.price_per_night || item.price} className="text-3xl md:text-4xl font-black text-white" />
                                    <Button onClick={() => onNavigate('hall_details', { item, type })} className="h-14 px-8 rounded-2xl bg-white text-black hover:bg-gray-100 font-black text-lg">
                                        عرض التفاصيل
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* All Items Grid */}
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900">تصفح الكل</h2>
                <div className="flex gap-3">
                    <div className="relative hidden md:block">
                        <input className="h-12 bg-white border border-gray-100 rounded-xl px-10 text-right font-bold w-64 outline-none focus:ring-1 ring-primary/20" placeholder="بحث..." />
                        <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <button className="h-12 w-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-50"><Filter className="w-5 h-5 text-gray-500" /></button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {paginatedItems.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => onNavigate('hall_details', { item, type })}
                        className="group bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col h-full"
                    >
                        <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                            <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black shadow-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-primary" /> {item.city}
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col space-y-4 text-right">
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-black text-gray-900 group-hover:text-primary transition-colors line-clamp-1">{item.name}</h3>
                                <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold bg-yellow-50 px-2 py-1 rounded-lg">
                                    <Star className="w-3 h-3 fill-current" /> 4.9
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 font-bold line-clamp-2 leading-relaxed">{item.description}</p>
                            
                            <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                <PriceTag amount={item.price_per_night || item.price} className="text-xl font-black text-primary" />
                                {type !== 'service' && (
                                    <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5" /> {item.capacity} ضيف
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {paginatedItems.length < items.length && (
                <div className="text-center pt-8">
                    <Button onClick={() => setPage(p => p + 1)} variant="outline" className="h-14 px-10 rounded-2xl font-black border-2 border-gray-200 text-gray-500 hover:text-primary hover:border-primary">
                        عرض المزيد
                    </Button>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};
