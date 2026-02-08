
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, POSItem } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Sparkles, Star, MapPin, Zap, Palmtree, ArrowLeft, ShoppingBag, ShoppingCart, ChevronLeft, Package,
  ArrowRight, ShieldCheck, CreditCard, Award
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
  const [resorts, setResorts] = useState<Hall[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<POSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);

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

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
      
      <section className="relative w-full pt-28 pb-8 flex justify-center">
        <div className="w-[95%] h-[600px] md:h-[750px] relative rounded-[3rem] overflow-hidden group ring-1 ring-black/5 bg-gray-900">
          
          {HERO_IMAGES.map((img, index) => (
            <div 
              key={index}
              className={`absolute inset-0 transition-all duration-[2000ms] ease-in-out transform ${index === currentHeroImage ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}
            >
              <img src={img} className="w-full h-full object-cover" alt="Hero" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
            </div>
          ))}

          <div className="relative z-10 h-full flex items-center justify-start px-8 md:px-24 text-right font-tajawal">
            <div className="max-w-3xl space-y-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white w-fit">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs md:text-sm font-bold tracking-wide">الوجهة الأولى للمناسبات الفاخرة</span>
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.1] tracking-tight">
                  حيث تكتمل <br /> 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">لحظات الفرح</span>
                </h1>
                <div className="w-32 h-2 bg-gradient-to-l from-primary to-transparent rounded-full"></div>
              </div>
              <p className="text-gray-200 text-lg md:text-2xl font-medium leading-relaxed max-w-2xl border-r-4 border-white/20 pr-6">
                نجمع لك أرقى القاعات وأفخم الخدمات في منصة واحدة، لتكون مناسبتك ذكرى لا تُنسى.
              </p>
            </div>
          </div>

          <div className="absolute bottom-12 left-12 flex gap-3">
             {HERO_IMAGES.map((_, i) => (
                <button key={i} onClick={() => setCurrentHeroImage(i)} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentHeroImage ? 'w-12 bg-white' : 'w-3 bg-white/30'}`}></button>
             ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 lg:px-20 max-w-7xl mx-auto space-y-32">
          
          <div className="space-y-12">
            <SectionHeader title="أفخم القاعات" icon={Sparkles} subtitle="مساحات ملكية" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? [1,2,3].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>) : halls.map(h => renderCard(h, 'hall', 'قاعة'))}
            </div>
            <div className="flex justify-center pt-8">
                <Button variant="outline" onClick={() => onNavigate('halls_page')} className="h-12 px-10 rounded-xl font-bold border-2 border-gray-100 text-gray-500 hover:border-primary hover:text-primary transition-all gap-2">عرض جميع القاعات <ArrowLeft className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Store CTA Redesign */}
          <div className="relative bg-white border border-gray-100 rounded-[4rem] overflow-hidden p-12 lg:p-24">
             <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="text-right space-y-8">
                   <div className="inline-flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest bg-primary/5 px-4 py-2 rounded-xl">
                      <ShoppingBag className="w-4 h-4" /> متجر المنصة المعتمد
                   </div>
                   <h2 className="text-4xl lg:text-6xl font-black text-gray-900 leading-tight">كل ما تحتاجه <br/> لمناسبتك في <span className="text-primary">مكان واحد</span></h2>
                   <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-lg">نوفر لشركائنا وعملائنا أرقى التجهيزات، من أنظمة الصوت والإضاءة وحتى أدوات الضيافة الفاخرة بأسعار حصرية.</p>
                   <div className="flex flex-wrap gap-4 pt-4">
                      <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
                         <ShieldCheck className="w-5 h-5 text-green-500" />
                         <span className="text-xs font-bold text-gray-600">منتجات مضمونة</span>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
                         <CreditCard className="w-5 h-5 text-blue-500" />
                         <span className="text-xs font-bold text-gray-600">دفع آمن</span>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
                         <Award className="w-5 h-5 text-yellow-500" />
                         <span className="text-xs font-bold text-gray-600">جودة عالية</span>
                      </div>
                   </div>
                   <Button onClick={() => onNavigate('store_page')} className="h-16 px-10 rounded-[2rem] bg-primary text-white hover:bg-black font-black text-xl gap-3 shadow-none mt-4 transition-all hover:scale-[1.02]">
                      زيارة المتجر الحصري <ArrowLeft className="w-6 h-6" />
                   </Button>
                </div>
                <div className="relative">
                   <div className="aspect-square bg-primary/5 rounded-[3rem] border border-primary/10 overflow-hidden group">
                      <img src="https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Store Items" />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>
                   </div>
                   <div className="absolute -bottom-8 -right-8 bg-white border border-gray-100 p-8 rounded-[2.5rem] hidden lg:block animate-bounce duration-[3000ms]">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl">+120</div>
                         <div className="text-right"><p className="text-xs font-black text-gray-900">منتج جديد</p><p className="text-[10px] font-bold text-gray-400">تمت إضافتها هذا الشهر</p></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-12">
            <SectionHeader title="شاليهات ومنتجعات" icon={Palmtree} subtitle="خصوصية وراحة" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? [1,2,3].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>) : resorts.map(r => renderCard(r, 'hall', 'شاليه'))}
            </div>
          </div>
      </section>

      <section className="py-32 px-6 lg:px-20 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 text-right order-2 lg:order-1">
                <div className="space-y-4">
                    <span className="text-primary font-black text-sm uppercase tracking-widest">لماذا القاعة؟</span>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">شريككم الأول في صناعة الذكريات</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 space-y-3">
                        <div className="text-primary text-4xl font-black">+180</div>
                        <p className="text-sm font-bold text-gray-500">قاعة فاخرة تم تقييمها واعتمادها.</p>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 space-y-3">
                        <div className="text-primary text-4xl font-black">+8500</div>
                        <p className="text-sm font-bold text-gray-500">حجز ناجح تم تنفيذه عبر منصتنا.</p>
                    </div>
                </div>
            </div>
            <div className="relative order-1 lg:order-2">
                <div className="aspect-[4/5] rounded-[3rem] overflow-hidden border-8 border-gray-50">
                    <img src="https://i.ytimg.com/vi/fynjsdbrr1s/maxresdefault.jpg" className="w-full h-full object-cover" alt="Atmosphere" />
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};
