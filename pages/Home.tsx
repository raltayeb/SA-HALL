import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, SAUDI_CITIES, POSItem } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Sparkles, Star, MapPin, Zap, Palmtree, ArrowLeft, ShoppingBag, ShoppingCart, ChevronLeft, Package
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

export const Home: React.FC<HomeProps> = ({ user, onLoginClick, onRegisterClick, onBrowseHalls, onNavigate, onLogout }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [resorts, setResorts] = useState<Hall[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<POSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);

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
      const [hRes, rRes, sRes, pRes] = await Promise.all([
        supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true).eq('type', 'hall').limit(3),
        supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true).in('type', ['chalet', 'resort']).limit(3),
        supabase.from('services').select('*, vendor:vendor_id(*)').eq('is_active', true).limit(3),
        supabase.from('pos_items').select('*, vendor:vendor_id!inner(role)').eq('vendor.role', 'super_admin').gt('stock', 0).limit(4)
      ]);
      setHalls(hRes.data || []);
      setResorts(rRes.data || []);
      setServices(sRes.data || []);
      setProducts(pRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
                {type === 'hall' && (
                        <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold">
                        <Star className="w-3 h-3 fill-current" /> 4.9
                        </div>
                )}
            </div>
        </div>
    </div>
  );

  const renderProductCard = (product: POSItem) => (
    <div key={product.id} onClick={() => onNavigate('store_page')} className="group bg-white border border-primary/10 rounded-[2rem] p-6 hover:border-primary/30 transition-all cursor-pointer flex flex-col text-center">
        <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-300 group-hover:bg-primary/5 group-hover:text-primary transition-colors relative overflow-hidden">
            {product.image_url ? (
                <img src={product.image_url} className="w-full h-full object-cover" />
            ) : (
                <Package className="w-10 h-10" />
            )}
            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-lg text-[8px] font-black border border-gray-100">باقي {product.stock}</div>
        </div>
        <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{product.name}</h3>
        <p className="text-[10px] font-bold text-gray-400 mb-3">{product.category}</p>
        <div className="mt-auto pt-3 border-t border-gray-100 flex flex-col gap-2">
            <PriceTag amount={product.price} className="justify-center text-lg font-black text-primary" />
            <div className="text-[10px] font-black text-primary flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>تسوّق الآن</span>
                <ChevronLeft className="w-3 h-3" />
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
      
      {/* 1. Hero Section (Buttons Removed) */}
      <section className="relative w-full pt-28 pb-8 flex justify-center">
        <div className="w-[95%] h-[600px] md:h-[750px] relative rounded-[3rem] overflow-hidden shadow-2xl group ring-1 ring-black/5 bg-gray-900">
          
          {/* Background Images with Fade Transition */}
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
          <div className="relative z-10 h-full flex items-center justify-start px-8 md:px-24 text-right font-tajawal">
            <div className="max-w-3xl space-y-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white shadow-lg w-fit">
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
              
              <p className="text-gray-200 text-lg md:text-2xl font-medium leading-relaxed max-w-2xl drop-shadow-md border-r-4 border-white/20 pr-6">
                نجمع لك أرقى القاعات وأفخم الخدمات في منصة واحدة، لتكون مناسبتك ذكرى لا تُنسى بكل معاني الفخامة.
              </p>
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

      {/* 2. Main Sections with Show More Buttons */}
      <section className="py-24 px-6 lg:px-20 max-w-7xl mx-auto space-y-32">
          
          {/* Halls */}
          <div className="space-y-12">
            <SectionHeader title="أفخم القاعات" icon={Sparkles} subtitle="مساحات ملكية" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? [1,2,3].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>) : halls.map(h => renderCard(h, 'hall', 'قاعة'))}
            </div>
            <div className="flex justify-center pt-8">
                <Button variant="outline" onClick={() => onNavigate('halls_page')} className="h-12 px-10 rounded-xl font-bold border-2 border-gray-100 text-gray-500 hover:border-primary hover:text-primary transition-all gap-2">
                    عرض جميع القاعات <ArrowLeft className="w-4 h-4" />
                </Button>
            </div>
          </div>

          {/* Resorts */}
          <div className="space-y-12">
            <SectionHeader title="شاليهات ومنتجعات" icon={Palmtree} subtitle="خصوصية وراحة" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? [1,2,3].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>) : resorts.map(r => renderCard(r, 'hall', 'شاليه'))}
            </div>
            <div className="flex justify-center pt-8">
                <Button variant="outline" onClick={() => onNavigate('chalets_page')} className="h-12 px-10 rounded-xl font-bold border-2 border-gray-100 text-gray-500 hover:border-primary hover:text-primary transition-all gap-2">
                    عرض جميع الشاليهات <ArrowLeft className="w-4 h-4" />
                </Button>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-12">
            <SectionHeader title="خدمات المناسبات" icon={Zap} subtitle="تجهيز احترافي" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? [1,2,3].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>) : services.map(s => renderCard(s, 'service', 'خدمة'))}
            </div>
            <div className="flex justify-center pt-8">
                <Button variant="outline" onClick={() => onNavigate('services_page')} className="h-12 px-10 rounded-xl font-bold border-2 border-gray-100 text-gray-500 hover:border-primary hover:text-primary transition-all gap-2">
                    تصفح كافة الخدمات <ArrowLeft className="w-4 h-4" />
                </Button>
            </div>
          </div>

          {/* Redesigned Store Section (Light Mode & Brand Color) */}
          {products.length > 0 && (
            <div className="bg-primary/[0.03] border border-primary/10 rounded-[4rem] p-12 lg:p-20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -mr-48 -mt-48"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-[100px] -ml-32 -mb-32"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                <div className="text-right space-y-4">
                    <div className="flex items-center justify-end gap-2 text-primary">
                        <ShoppingBag className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">متجر المنصة الحصري</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">تجهيزات ومعدات <br/> <span className="text-primary">للمناسبات الفاخرة</span></h2>
                </div>
                <Button onClick={() => onNavigate('store_page')} className="h-14 px-8 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black shadow-none border-none gap-2">
                    زيارة المتجر <ShoppingCart className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                  {products.map(p => renderProductCard(p))}
              </div>
            </div>
          )}
      </section>

      {/* 3. Stats Section */}
      <section className="py-32 px-6 lg:px-20 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 text-right order-2 lg:order-1">
                <div className="space-y-4">
                    <span className="text-primary font-black text-sm uppercase tracking-widest">لماذا القاعة؟</span>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">شريككم الأول في <br/> صناعة الذكريات السعيدة</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 space-y-3">
                        <div className="text-primary text-4xl font-black">+180</div>
                        <p className="text-sm font-bold text-gray-500">قاعة فاخرة تم تقييمها واعتمادها من قبل خبرائنا.</p>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 space-y-3">
                        <div className="text-primary text-4xl font-black">+8500</div>
                        <p className="text-sm font-bold text-gray-500">حجز ناجح تم تنفيذه عبر منصتنا خلال العام الماضي.</p>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 space-y-3">
                        <div className="text-primary text-4xl font-black">+65</div>
                        <p className="text-sm font-bold text-gray-500">خدمة احترافية من ضيافة وتصوير وكوشات متميزة.</p>
                    </div>
                    <div className="bg-primary text-white p-8 rounded-[2rem] border-none space-y-3 flex flex-col justify-center">
                        <p className="text-lg font-black leading-tight">انضم إلينا اليوم وابدأ تجربة استثنائية.</p>
                        <button onClick={() => onNavigate('register')} className="mt-2 flex items-center gap-2 font-bold text-xs hover:gap-4 transition-all">سجل الآن <ArrowLeft className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
            <div className="relative order-1 lg:order-2">
                <div className="aspect-[4/5] rounded-[3rem] overflow-hidden border-8 border-gray-50">
                    <img 
                        src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200" 
                        className="w-full h-full object-cover" 
                        alt="Atmosphere" 
                    />
                </div>
                <div className="absolute -bottom-8 -left-8 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl hidden md:block max-w-[200px] text-center">
                    <div className="flex justify-center gap-1 text-yellow-500 mb-2"><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /></div>
                    <p className="text-xs font-black text-gray-900">أعلى تصنيف رضا عملاء في المملكة</p>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};