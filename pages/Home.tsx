
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, SAUDI_CITIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Sparkles, Star, MapPin, Zap, Palmtree, Plus, 
  ShieldCheck, Award, CreditCard, ArrowLeft, ArrowUpRight, ArrowRight, Users
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
  const [loading, setLoading] = useState(true);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);

  // Hero Animation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000); // Change every 5 seconds
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, rRes, sRes] = await Promise.all([
        supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true).eq('type', 'hall').limit(6),
        supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true).in('type', ['chalet', 'resort']).limit(6),
        supabase.from('services').select('*, vendor:vendor_id(*)').eq('is_active', true).limit(6)
      ]);
      setHalls(hRes.data || []);
      setResorts(rRes.data || []);
      setServices(sRes.data || []);
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
        onClick={() => onNavigate('hall_details', { item, type: type === 'hall' ? 'hall' : 'service' })} 
        className="group relative cursor-pointer text-right transition-all duration-500 hover:-translate-y-2"
    >
        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
            <div className="relative aspect-[4/3] overflow-hidden">
                <img 
                    src={item.image_url || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt={item.name} 
                />
                <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-xl text-[10px] font-black shadow-lg">{label}</div>
            </div>
            <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start flex-row-reverse">
                    <div className="space-y-0.5 text-right flex-1">
                        <h3 className="text-lg font-black text-gray-900 group-hover:text-primary transition-colors truncate">{item.name}</h3>
                        <div className="flex items-center justify-end gap-1 text-gray-400 font-bold text-xs">
                            <span>{item.city || item.category || 'عام'}</span>
                            <MapPin className="w-3 h-3 text-primary/60" />
                        </div>
                    </div>
                </div>
                <div className="pt-4 border-t border-gray-50 mt-auto flex justify-between items-center">
                    <PriceTag amount={item.price_per_night || item.price} className="text-xl text-primary" />
                    {type === 'hall' && (
                         <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold">
                            <Star className="w-3 h-3 fill-current" /> 4.9
                         </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
      
      {/* 1. Hero Section - 95% Width & Auto Animation */}
      <section className="relative w-full pt-28 pb-8 flex justify-center">
        <div className="w-[95%] h-[600px] md:h-[700px] relative rounded-[3rem] overflow-hidden shadow-2xl group">
          {/* Background Images with Fade Transition */}
          {HERO_IMAGES.map((img, index) => (
            <div 
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentHeroImage ? 'opacity-100' : 'opacity-0'}`}
            >
              <img 
                src={img} 
                className="w-full h-full object-cover" 
                alt={`Luxury Resort ${index + 1}`} 
              />
              <div className="absolute inset-0 bg-black/40"></div>
            </div>
          ))}

          {/* Content Container */}
          <div className="relative z-10 h-full flex items-center justify-start px-8 md:px-24 text-right font-tajawal">
            <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-right-8 duration-1000">
              <h1 className="text-4xl lg:text-7xl font-black text-white leading-[1.2] tracking-tight drop-shadow-lg">
                عش التجربة <br /> الأمثل <span className="text-primary">للفخامة</span>
              </h1>
              <p className="text-white/90 text-lg lg:text-2xl font-medium leading-relaxed max-w-xl drop-shadow-md">
                اجعل مناسبتك ذكرى لا تُنسى مع المزيج المثالي من الفخامة والراحة المصممة خصيصاً لتفوق توقعاتك.
              </p>
            </div>
          </div>

          {/* Bottom Scroll Indicator Style element */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
              <div className="w-[1px] h-12 bg-white/50"></div>
          </div>
        </div>
      </section>

      {/* 2. Main Content Areas */}
      <section className="py-32 px-6 lg:px-20 max-w-7xl mx-auto space-y-32">
          {/* Halls */}
          <div>
            <SectionHeader title="أفخم القاعات" icon={Sparkles} subtitle="مختارات ملكية" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {loading ? [1,2,3].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>) : halls.map(h => renderCard(h, 'hall', 'قاعة'))}
            </div>
          </div>

          {/* Resorts */}
          <div>
            <SectionHeader title="شاليهات ومنتجعات" icon={Palmtree} subtitle="استجمام ورفاهية" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {loading ? [1,2,3].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>) : resorts.map(r => renderCard(r, 'hall', 'شاليه'))}
            </div>
          </div>

          {/* Services */}
          <div>
            <SectionHeader title="خدمات المناسبات" icon={Zap} subtitle="تجهيزات متكاملة" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {loading ? [1,2,3].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>) : services.map(s => renderCard(s, 'service', 'خدمة'))}
            </div>
          </div>
      </section>

      {/* 3. Stats Section */}
      <section className="py-32 px-6 lg:px-20 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 items-stretch">
            <div className="lg:w-1/2 min-h-[500px] relative overflow-hidden rounded-[3rem] shadow-2xl">
                <img 
                    src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200" 
                    className="absolute inset-0 w-full h-full object-cover" 
                    alt="Atmosphere" 
                />
            </div>
            <div className="lg:w-1/2 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#F9FAFB] rounded-[2.5rem] p-10 flex flex-col justify-center space-y-6 border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">إجمالي القاعات</span>
                    <div className="w-full h-px bg-gray-200"></div>
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-primary text-4xl font-black">+</span>
                        <span className="text-6xl font-black text-[#111827]">180</span>
                    </div>
                    <p className="text-sm font-bold text-gray-500 text-right">قاعات فخمة وأجنحة ملكية</p>
                </div>
                <div className="bg-[#F9FAFB] rounded-[2.5rem] p-10 flex flex-col justify-center space-y-6 border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">الزوار سنوياً</span>
                    <div className="w-full h-px bg-gray-200"></div>
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-primary text-4xl font-black">+</span>
                        <span className="text-6xl font-black text-[#111827]">8500</span>
                    </div>
                    <p className="text-sm font-bold text-gray-500 text-right">عميل سعيد بخدماتنا</p>
                </div>
                <div className="bg-[#F9FAFB] rounded-[2.5rem] p-10 flex flex-col justify-center space-y-6 border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">قائمة الخدمات</span>
                    <div className="w-full h-px bg-gray-200"></div>
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-primary text-4xl font-black">+</span>
                        <span className="text-6xl font-black text-[#111827]">65</span>
                    </div>
                    <p className="text-sm font-bold text-gray-500 text-right">باقات طعام وضيافة منوعة</p>
                </div>
                <div className="relative rounded-[2.5rem] overflow-hidden group shadow-lg">
                    <img 
                        src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        alt="Quality" 
                    />
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};
