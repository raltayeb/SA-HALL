
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, SAUDI_CITIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Sparkles, Star, MapPin, Zap, ArrowLeft, ShoppingBag, Store, Search, Users, Calendar, Building2, Palmtree
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

const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string, icon?: any, subtitle?: string }) => (
  <div className="flex flex-col items-center text-center space-y-3 mb-12">
      {subtitle && Icon && (
        <div className="flex items-center gap-2 text-primary bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10">
            <Icon className="w-4 h-4 fill-current" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{subtitle}</span>
        </div>
      )}
      <h2 className="text-4xl font-black tracking-tight text-gray-900">{title}</h2>
      <div className="w-16 h-1 bg-primary rounded-full"></div>
  </div>
);

export const Home: React.FC<HomeProps> = ({ user, onLoginClick, onRegisterClick, onBrowseHalls, onNavigate, onLogout }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [featuredHalls, setFeaturedHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);
  const [searchTab, setSearchTab] = useState<'halls' | 'services'>('halls');
  const [systemLogo, setSystemLogo] = useState('https://dash.hall.sa/logo.svg');

  // Search State
  const [searchFilters, setSearchFilters] = useState({
      city: 'all',
      date: '',
      menCount: '',
      womenCount: '',
      pricePerPerson: ''
  });

  // Fetch system logo
  useEffect(() => {
      const fetchLogo = async () => {
          const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
          if (data?.value?.platform_logo_url) {
              setSystemLogo(data.value.platform_logo_url);
          }
      };
      fetchLogo();
  }, []);

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
      // Fetch featured halls
      const now = new Date().toISOString();
      const { data: featuredData, error: featuredError } = await supabase
        .from('halls')
        .select('*, vendor:vendor_id(*)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .gt('featured_until', now)
        .limit(3);

      if (featuredError) {
        console.error('❌ Featured halls error:', featuredError);
      }
      
      console.log('✅ Featured halls query - Date used:', now);
      console.log('✅ Featured halls data:', featuredData);
      console.log('✅ Featured halls count:', featuredData?.length);
      
      if (featuredData && featuredData.length === 0) {
        // Check if there are any featured halls at all (without date filter)
        const { data: allFeatured } = await supabase
          .from('halls')
          .select('id, name, is_featured, featured_until, is_active')
          .eq('is_featured', true);
        
        console.log('🔍 All featured halls (no date filter):', allFeatured);
        
        if (allFeatured && allFeatured.length > 0) {
          console.log('⚠️ Featured halls exist but expired or future date issue');
          allFeatured.forEach(h => {
            console.log(`Hall: ${h.name}, featured_until: ${h.featured_until}, is_active: ${h.is_active}`);
          });
        } else {
          console.log('⚠️ No featured halls in database at all');
        }
      }

      // Fetch regular halls
      const { data: hData } = await supabase
        .from('halls')
        .select('*, vendor:vendor_id(*)')
        .eq('is_active', true)
        .eq('type', 'hall')
        .limit(4);

      // Fetch services
      const { data: sData } = await supabase
        .from('services')
        .select('*, vendor:vendor_id(*)')
        .eq('is_active', true)
        .limit(4);

      setFeaturedHalls(featuredData || []);
      setHalls(hData || []);
      setServices(sData || []);
    } catch (err) {
      console.error('❌ General error:', err);
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
        className="group relative cursor-pointer text-right transition-all duration-300 border border-gray-100 rounded-[2.5rem] overflow-hidden bg-white hover:border-primary/20 hover:shadow-xl hover:-translate-y-1"
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
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-tajawal">
      
      {/* 1. Hero Section - Redesigned Split */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden bg-gray-900">
          
          {/* Background Images Layer */}
          {HERO_IMAGES.map((img, index) => (
            <div 
              key={index}
              className={`absolute inset-0 transition-all duration-[2000ms] ease-in-out transform ${index === currentHeroImage ? 'opacity-50 scale-105' : 'opacity-0 scale-100'}`}
            >
              <img src={img} className="w-full h-full object-cover" alt={`Hero ${index}`} />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-gray-900/30"></div>
            </div>
          ))}

          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center pt-24 pb-12">
              
              {/* Right Column: Text & Titles (Starts first in RTL) */}
              <div className="text-right space-y-8 animate-in slide-in-from-right duration-1000">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white w-fit">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-xs font-bold tracking-wide">المنصة الأولى لحجز المناسبات</span>
                  </div>
                  
                  <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight">
                      حيث تكتمل <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-l from-purple-400 to-pink-300">لحظات الفرح</span>
                  </h1>
                  
                  <p className="text-white/70 font-bold text-lg max-w-lg leading-relaxed">
                      اكتشف أفخم القاعات، الشاليهات، وخدمات الضيافة في مكان واحد. 
                      نحول مناسبتك إلى ذكرى لا تُنسى بأسهل الطرق.
                  </p>

                  <div className="flex gap-4 pt-4">
                      <div className="flex -space-x-4 space-x-reverse">
                          {[1,2,3,4].map(i => (
                              <div key={i} className="w-12 h-12 rounded-full border-2 border-gray-900 bg-gray-800 flex items-center justify-center text-xs text-white font-bold overflow-hidden">
                                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} className="w-full h-full object-cover" />
                              </div>
                          ))}
                      </div>
                      <div className="flex flex-col justify-center">
                          <div className="flex text-yellow-400 gap-0.5">
                              {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                          </div>
                          <span className="text-white/60 text-xs font-bold">أكثر من 10,000 عميل سعيد</span>
                      </div>
                  </div>
              </div>

              {/* Left Column: Vertical Search Filter Card */}
              <div className="animate-in slide-in-from-left duration-1000 delay-200">
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-2 rounded-[3rem] shadow-2xl">
                      <div className="bg-white rounded-[2.5rem] p-8 shadow-inner">
                          
                          {/* LOGO INSERTED HERE */}
                          <div className="flex justify-center mb-8">
                              <img src={systemLogo} alt="Logo" className="h-32 w-auto object-contain" />
                          </div>

                          {/* Tabs */}
                          <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 mb-6">
                              <button onClick={() => setSearchTab('halls')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${searchTab === 'halls' ? 'bg-white shadow-md text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                                  <Building2 className="w-4 h-4" /> القاعات
                              </button>
                              <button onClick={() => setSearchTab('services')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${searchTab === 'services' ? 'bg-white shadow-md text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                                  <Sparkles className="w-4 h-4" /> الخدمات
                              </button>
                          </div>

                          <form onSubmit={handleHeroSearch} className="space-y-5">
                              {/* City */}
                              <div className="space-y-2">
                                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">المنطقة</label>
                                  <div className="relative">
                                      <select 
                                          value={searchFilters.city}
                                          onChange={(e) => setSearchFilters({...searchFilters, city: e.target.value})}
                                          className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none text-gray-700 cursor-pointer"
                                      >
                                          <option value="all">كل المدن</option>
                                          {SAUDI_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                                      </select>
                                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                  </div>
                              </div>

                              {/* Date */}
                              <div className="space-y-2">
                                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">تاريخ المناسبة</label>
                                  <div className="relative">
                                      <input 
                                          type="date"
                                          value={searchFilters.date}
                                          onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})}
                                          className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-700"
                                      />
                                  </div>
                              </div>

                              {/* Capacity (Only for Halls) */}
                              {searchTab === 'halls' && (
                                  <div className="space-y-2">
                                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">عدد الضيوف المتوقع</label>
                                      <div className="grid grid-cols-2 gap-3">
                                          <div className="relative">
                                              <input 
                                                  type="number" 
                                                  placeholder="رجال" 
                                                  className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 text-center"
                                                  value={searchFilters.menCount}
                                                  onChange={(e) => setSearchFilters({...searchFilters, menCount: e.target.value})}
                                              />
                                              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                                          </div>
                                          <div className="relative">
                                              <input 
                                                  type="number" 
                                                  placeholder="نساء" 
                                                  className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 text-center"
                                                  value={searchFilters.womenCount}
                                                  onChange={(e) => setSearchFilters({...searchFilters, womenCount: e.target.value})}
                                              />
                                              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                                          </div>
                                      </div>
                                  </div>
                              )}

                              <Button 
                                  type="submit" 
                                  className="w-full h-16 rounded-2xl font-black text-lg bg-gray-900 text-white shadow-xl hover:bg-black hover:scale-[1.02] transition-all flex items-center justify-center gap-3 mt-4"
                              >
                                  <Search className="w-5 h-5" />
                                  <span>ابحث الآن</span>
                              </Button>
                          </form>
                      </div>
                  </div>
              </div>

          </div>
      </section>

      {/* Main Sections */}
      <section className="py-24 px-6 lg:px-12 w-full max-w-[1920px] mx-auto space-y-32">

          {/* Featured Halls - Always show section header */}
          <div className="space-y-12">
            <SectionHeader title="قاعات مميزة" icon={Sparkles} />
            
            {featuredHalls.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredHalls.map(h => (
                  <div
                    key={h.id}
                    onClick={() => onNavigate('hall_details', { item: h, type: 'hall' })}
                    className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] h-[450px]"
                  >
                    {/* Full Image Background */}
                    <img
                      src={h.image_url || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      alt={h.name}
                    />
                    
                    {/* Gradient Overlay with Theme Color */}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Featured Badge */}
                    <div className="absolute top-6 right-6 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-1 border border-white/30">
                      <Sparkles className="w-3 h-3" /> مميزة
                    </div>
                    
                    {/* Content - Bottom Section */}
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      {/* Hall Name & Rating */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-black text-white truncate flex-1">{h.name}</h3>
                        <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full mr-3 shrink-0">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-black text-white">4.9</span>
                        </div>
                      </div>
                      
                      {/* Location & Price */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/90">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm font-bold">{h.city}</span>
                        </div>
                        <div className="text-right">
                          <PriceTag amount={h.price_per_night} className="text-lg font-black text-white" />
                          <span className="text-[10px] text-white/70 font-bold">/ لليلة</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-[2rem] border border-gray-100">
                <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-bold text-lg">لا توجد قاعات مميزة حالياً</p>
                <p className="text-gray-400 text-sm mt-2">القاعات المميزة ستظهر هنا عند إضافتها من قبل الإدارة</p>
              </div>
            )}
          </div>

          {/* Halls */}
          <div className="space-y-12">
            <SectionHeader title="القاعات" icon={Sparkles} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? [1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>) : halls.map(h => renderCard(h, 'hall', 'قاعة'))}
            </div>
            
            <div className="flex justify-center pt-8">
                <Button 
                    onClick={() => onNavigate('browse_halls')} 
                    variant="outline" 
                    className="h-14 px-10 rounded-2xl font-black text-base border-2 border-gray-100 hover:border-primary hover:text-primary gap-2 transition-all hover:scale-105"
                >
                    عرض جميع القاعات <ArrowLeft className="w-5 h-5" />
                </Button>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-12">
            <SectionHeader title="خدمات المناسبات" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? [1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>) : services.map(s => renderCard(s, 'service', 'خدمة'))}
            </div>

            <div className="flex justify-center pt-8">
                <Button 
                    onClick={() => onNavigate('browse_services')} 
                    variant="outline" 
                    className="h-14 px-10 rounded-2xl font-black text-base border-2 border-gray-100 hover:border-orange-500 hover:text-orange-600 gap-2 transition-all hover:scale-105"
                >
                    عرض جميع الخدمات <ArrowLeft className="w-5 h-5" />
                </Button>
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
                 <div className="bg-white/95 backdrop-blur-md p-10 md:p-14 rounded-[2.5rem] border border-white/50 text-right space-y-6 shadow-2xl">
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
