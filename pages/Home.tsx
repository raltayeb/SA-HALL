
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, SAUDI_CITIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Sparkles, Star, MapPin, Zap, ArrowLeft, ShoppingBag, Store, Search, Users, Calendar, Coins
} from 'lucide-react';

interface HomeProps {
  user: UserProfile | null;
  onLoginClick: () => void;
  onRegisterClick?: () => void;
  onBrowseHalls: (filters?: any) => void;
  onNavigate: (tab: string, item?: any) => void;
  onLogout: () => void;
}

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=2000",
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=2000",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2000",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=2000"
];

const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string, icon: any, subtitle: string }) => (
  <div className="flex flex-col items-center text-center space-y-3 mb-12">
      <div className="flex items-center gap-2 text-primary bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10">
          <Icon className="w-4 h-4 fill-current" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{subtitle}</span>
      </div>
      <h2 className="text-4xl font-black tracking-tight text-gray-900">{title}</h2>
      <div className="w-16 h-1 bg-primary rounded-full"></div>
  </div>
);

export const Home: React.FC<HomeProps> = ({ user, onLoginClick, onRegisterClick, onBrowseHalls, onNavigate, onLogout }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);

  // Search State
  const [searchFilters, setSearchFilters] = useState({
      city: 'all',
      date: '',
      menCount: '',
      womenCount: '',
      pricePerPerson: ''
  });

  // Hero Animation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: hData } = await supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true).eq('type', 'hall').limit(4);
      // Removed Chalets fetch
      const { data: sData } = await supabase.from('services').select('*, vendor:vendor_id(*)').eq('is_active', true).limit(4);
      
      setHalls(hData || []);
      setServices(sData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleHeroSearch = (e: React.FormEvent) => {
      e.preventDefault();
      onBrowseHalls(searchFilters);
  };

  const renderCard = (item: any, type: 'hall' | 'service', label: string) => (
    <div 
        key={item.id} 
        onClick={() => onNavigate('hall_details', { item, type })} 
        className="group relative cursor-pointer text-right transition-all duration-300 border border-gray-100 rounded-[2.5rem] overflow-hidden bg-white hover:border-primary/20"
    >
        <div className="relative aspect-[4/3] overflow-hidden">
            <img 
                src={item.image_url || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                alt={item.name} 
            />
            <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-xl text-[10px] font-black">{label}</div>
        </div>
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-start flex-row-reverse">
                <div className="space-y-0.5 text-right flex-1">
                    <h3 className="text-lg font-black text-gray-900 group-hover:text-primary transition-colors truncate">{item.name}</h3>
                    <div className="flex items-center justify-end gap-1 text-gray-400 font-bold text-xs">
                        <span>{item.city || item.category || 'عام'}</span>
                        <MapPin className="w-3 h-3 text-primary/60" />
                    </div>
                </div>
            </div>
            <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                <PriceTag amount={item.price_per_night || item.price} className="text-xl text-primary" />
                {type !== 'service' && (
                        <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold">
                        <Star className="w-3 h-3 fill-current" /> 4.9
                        </div>
                )}
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
      
      {/* 1. Hero Section */}
      <section className="relative w-full pt-28 pb-8 flex justify-center">
        <div className="w-[98%] max-w-[1920px] h-[700px] md:h-[800px] relative rounded-[3rem] overflow-hidden group ring-1 ring-black/5 bg-gray-900">
          
          {/* Background Images */}
          {HERO_IMAGES.map((img, index) => (
            <div 
              key={index}
              className={`absolute inset-0 transition-all duration-[2000ms] ease-in-out transform ${index === currentHeroImage ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}
            >
              <img 
                src={img} 
                className="w-full h-full object-cover" 
                alt={`Luxury Venue ${index + 1}`} 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
            </div>
          ))}

          {/* Content Container */}
          <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-24 text-right font-tajawal">
            <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white w-fit">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs md:text-sm font-bold tracking-wide">الوجهة الأولى للمناسبات الفاخرة</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.1] tracking-tight drop-shadow-xl">
                  حيث تكتمل <br /> 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
                    لحظات الفرح
                  </span>
                </h1>
                <div className="w-32 h-2 bg-gradient-to-l from-primary to-transparent rounded-full opacity-80"></div>
              </div>
              
              {/* Search Bar - Integrated into Hero */}
              <div className="pt-6">
                <form 
                    onSubmit={handleHeroSearch}
                    className="bg-white/95 backdrop-blur shadow-2xl rounded-[2.5rem] p-3 flex flex-col md:flex-row items-center gap-2 max-w-full lg:max-w-fit"
                >
                    {/* Region */}
                    <div className="flex flex-col gap-1 px-4 py-2 border-l border-gray-100 min-w-[140px] w-full md:w-auto">
                        <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> المنطقة</label>
                        <select 
                            value={searchFilters.city}
                            onChange={(e) => setSearchFilters({...searchFilters, city: e.target.value})}
                            className="bg-transparent text-sm font-black text-gray-900 outline-none cursor-pointer appearance-none"
                        >
                            <option value="all">كل المدن</option>
                            {SAUDI_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                    </div>

                    {/* Date */}
                    <div className="flex flex-col gap-1 px-4 py-2 border-l border-gray-100 min-w-[140px] w-full md:w-auto">
                        <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> اليوم</label>
                        <input 
                            type="date"
                            value={searchFilters.date}
                            onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})}
                            className="bg-transparent text-sm font-black text-gray-900 outline-none cursor-pointer"
                        />
                    </div>

                    {/* Attendance */}
                    <div className="flex flex-col gap-1 px-4 py-2 border-l border-gray-100 min-w-[160px] w-full md:w-auto">
                        <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><Users className="w-3 h-3" /> الحضور (رجال/نساء)</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number"
                                placeholder="رجال"
                                value={searchFilters.menCount}
                                onChange={(e) => setSearchFilters({...searchFilters, menCount: e.target.value})}
                                className="w-12 bg-transparent text-sm font-black text-gray-900 outline-none border-b border-gray-100"
                            />
                            <span className="text-gray-300">/</span>
                            <input 
                                type="number"
                                placeholder="نساء"
                                value={searchFilters.womenCount}
                                onChange={(e) => setSearchFilters({...searchFilters, womenCount: e.target.value})}
                                className="w-12 bg-transparent text-sm font-black text-gray-900 outline-none border-b border-gray-100"
                            />
                        </div>
                    </div>

                    {/* Price Per Person */}
                    <div className="flex flex-col gap-1 px-4 py-2 min-w-[140px] w-full md:w-auto">
                        <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><Coins className="w-3 h-3" /> ميزانية الفرد</label>
                        <input 
                            type="number"
                            placeholder="ر.س"
                            value={searchFilters.pricePerPerson}
                            onChange={(e) => setSearchFilters({...searchFilters, pricePerPerson: e.target.value})}
                            className="bg-transparent text-sm font-black text-gray-900 outline-none placeholder:text-gray-300"
                        />
                    </div>

                    {/* Search Button */}
                    <Button 
                        type="submit"
                        className="h-14 w-full md:w-14 rounded-full bg-primary text-white p-0 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                    >
                        <Search className="w-6 h-6" />
                    </Button>
                </form>
              </div>

            </div>
          </div>

          {/* Bottom Indicators */}
          <div className="absolute bottom-12 left-12 flex items-center gap-6 z-20">
              <div className="flex gap-3">
                 {HERO_IMAGES.map((_, i) => (
                    <button 
                        key={i} 
                        onClick={() => setCurrentHeroImage(i)}
                        className={`h-1.5 rounded-full transition-all duration-500 shadow-sm ${i === currentHeroImage ? 'w-12 bg-white' : 'w-3 bg-white/30 hover:bg-white/50'}`}
                    ></button>
                 ))}
              </div>
          </div>
        </div>
      </section>

      {/* Main Sections */}
      <section className="py-24 px-6 lg:px-12 w-full max-w-[1920px] mx-auto space-y-32">
          
          {/* Halls */}
          <div className="space-y-12">
            <SectionHeader title="أفخم القاعات" icon={Sparkles} subtitle="مساحات ملكية" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? [1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>) : halls.map(h => renderCard(h, 'hall', 'قاعة'))}
            </div>
          </div>

          {/* Chalets Section Removed */}

          {/* Services */}
          <div className="space-y-12">
            <SectionHeader title="خدمات المناسبات" icon={Zap} subtitle="تجهيز احترافي" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? [1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>) : services.map(s => renderCard(s, 'service', 'خدمة'))}
            </div>
          </div>

          {/* Store CTA Section */}
          <div className="w-full">
            <div className="relative rounded-[3rem] overflow-hidden min-h-[500px] flex items-center group border border-gray-100">
              <div className="absolute inset-0">
                 <img
                   src="https://www.arabiaweddings.com/sites/default/files/styles/max980/public/articles/2019/11/mideaval_wedding_in_saudi_arabia_4.jpg?itok=LQ8x27vo"
                   className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
                   alt="Store Background"
                 />
              </div>

              <div className="relative z-10 w-full md:w-1/2 p-8 md:p-12 md:mr-12 lg:mr-24">
                 <div className="bg-white/95 backdrop-blur-md p-10 md:p-14 rounded-[2.5rem] border border-white/50 text-right space-y-6">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-purple-50 border border-purple-100 text-primary">
                        <Store className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">متجر القاعة</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight">كل ما تحتاجه <br /> <span className="text-primary">لإكمال فرحتك</span></h2>
                    <p className="text-lg text-gray-600 font-medium leading-relaxed">تصفح متجرنا الحصري الذي يوفر لك أرقى التجهيزات، من أثاث فاخر وإضاءة احترافية، لتجعل من مناسبتك حدثاً استثنائياً.</p>
                    <div className="pt-4">
                        <Button
                        onClick={() => onNavigate('store_page')}
                        className="h-14 px-10 rounded-2xl bg-gray-900 text-white hover:bg-black font-black text-base border-none gap-3 shadow-none transition-transform active:scale-95"
                        >
                        زيارة المتجر <ShoppingBag className="w-5 h-5" />
                        </Button>
                    </div>
                 </div>
              </div>
            </div>
          </div>
      </section>
    </div>
  );
};
