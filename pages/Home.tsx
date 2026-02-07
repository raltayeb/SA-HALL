
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, POSItem, SAUDI_CITIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag, SaudiRiyalIcon } from '../components/ui/PriceTag';
import { 
  Search, MapPin, Users, Star, 
  Sparkles, ChevronDown, Play, 
  Quote, ArrowLeft, ShieldCheck, Zap, CreditCard, Clock, Award, 
  Home as HomeIcon, Palmtree, ShoppingBag, Package
} from 'lucide-react';

interface HomeProps {
  user: UserProfile | null;
  onLoginClick: () => void;
  onRegisterClick?: () => void;
  onBrowseHalls: (filters?: any) => void;
  onNavigate: (tab: string, item?: any) => void;
  onLogout: () => void;
}

export const Home: React.FC<HomeProps> = ({ user, onLoginClick, onRegisterClick, onBrowseHalls, onNavigate, onLogout }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [resorts, setResorts] = useState<Hall[]>([]); // Chalets/Resorts
  const [services, setServices] = useState<Service[]>([]);
  const [storeItems, setStoreItems] = useState<POSItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Hero Filter State
  const [filterCity, setFilterCity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterBudget, setFilterBudget] = useState(150000);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Halls
      const { data: hData } = await supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true).eq('type', 'hall').limit(6);
      setHalls(hData as any[] || []);

      // 2. Fetch Chalets/Resorts
      const { data: rData } = await supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true).in('type', ['chalet', 'resort']).limit(6);
      setResorts(rData as any[] || []);

      // 3. Fetch Services
      const { data: sData } = await supabase.from('services').select('*, vendor:vendor_id(*)').eq('is_active', true).limit(6);
      setServices(sData as any[] || []);

      // 4. Fetch Platform Store Items (Admin Products)
      const { data: pData } = await supabase.from('pos_items').select('*, vendor:vendor_id!inner(role)').eq('vendor.role', 'super_admin').limit(8);
      setStoreItems(pData as any[] || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchClick = () => {
    onBrowseHalls({ city: filterCity, type: filterType, budget: filterBudget });
  };

  const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string, icon: any, subtitle: string }) => (
    <div className="flex flex-col items-center text-center space-y-3 mb-12">
        <div className="flex items-center gap-2 text-primary bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10">
            <Icon className="w-4 h-4 fill-current" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{subtitle}</span>
        </div>
        <h2 className="text-4xl font-black tracking-tight text-[#111827]">{title}</h2>
        <div className="w-16 h-1 bg-primary rounded-full"></div>
    </div>
  );

  const renderCard = (item: any, type: 'hall' | 'service', label: string) => (
    <div 
        key={item.id} 
        onClick={() => onNavigate('hall_details', { item, type })} 
        className="group relative cursor-pointer text-right transition-all duration-500 hover:-translate-y-2"
    >
        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden">
            <img 
            src={item.image_url || 'https://via.placeholder.com/400'} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt={item.name} 
            />
            <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-xl text-[10px] font-black shadow-lg">{label}</div>
        </div>
        <div className="p-6 space-y-4 flex-1 flex flex-col">
            <div className="flex justify-between items-start flex-row-reverse">
                <div className="space-y-0.5 text-right flex-1">
                    <h3 className="text-lg font-black text-[#111827] group-hover:text-primary transition-colors truncate">{item.name}</h3>
                    <div className="flex items-center justify-end gap-1 text-gray-400 font-bold text-xs">
                        <span>{item.city || item.category || 'عام'}</span>
                        <MapPin className="w-3 h-3 text-primary/60" />
                    </div>
                </div>
                <div className="text-left shrink-0">
                    <div className="flex items-center gap-1 text-primary text-lg font-black">
                        <span>{new Intl.NumberFormat('en-US').format(item.price_per_night || item.price)}</span>
                        <span className="text-[10px]">SAR</span>
                    </div>
                </div>
            </div>
            {type === 'hall' && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50 mt-auto">
                    <div className="flex items-center justify-end gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>{item.capacity} ضيف</span>
                        <Users className="w-4 h-4 text-primary/70" />
                    </div>
                    <div className="flex items-center justify-end gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-50 pr-3">
                        <span>4.9 تقييم</span>
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    </div>
                </div>
            )}
        </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-24 overflow-hidden px-6 lg:px-20 w-full">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover" 
            alt="Luxury Wedding Hall Background" 
          />
          <div className="absolute inset-0 bg-gradient-to-l from-white/10 via-transparent to-black/50"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-right space-y-8 animate-in fade-in slide-in-from-right-10 duration-1000">
            <h1 className="text-5xl md:text-6xl font-black leading-tight tracking-tighter text-white drop-shadow-2xl">
              اكتشف قاعة <br />
              <span className="text-white/90 italic">أحلامك المثالية</span>
            </h1>
            <p className="text-white/90 text-lg md:text-xl font-medium max-w-lg leading-relaxed drop-shadow-md">
              الوجهة الأولى لحجز القاعات، الشاليهات، والخدمات المساندة لمناسبتك في المملكة.
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-left-10 duration-1000 delay-200">
            <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md ml-auto shadow-2xl space-y-8 text-right">
              <h3 className="text-2xl font-black text-gray-900">ابحث عن أفضل مكان لمناسبتك</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ps-1">الموقع</label>
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <MapPin className="w-5 h-5 text-primary" />
                    <select 
                      className="bg-transparent border-none text-sm font-bold w-full outline-none appearance-none cursor-pointer"
                      value={filterCity}
                      onChange={e => setFilterCity(e.target.value)}
                    >
                      <option value="all">كل مدن المملكة</option>
                      {SAUDI_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                    <span>أقصى ميزانية</span>
                    <span className="text-primary font-black">{new Intl.NumberFormat('ar-SA').format(filterBudget)} ر.س</span>
                  </div>
                  <input 
                    type="range" min="5000" max="300000" step="5000"
                    className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-primary"
                    value={filterBudget}
                    onChange={e => setFilterBudget(Number(e.target.value))}
                  />
                </div>
                <Button onClick={handleSearchClick} className="w-full h-14 rounded-2xl font-black text-lg bg-[#111827] text-white hover:bg-black shadow-xl mt-4">ابحث الآن</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Halls Section */}
      <section className="w-full py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
          <SectionHeader title="أفخم القاعات والقصور" icon={Sparkles} subtitle="مختارات ملكية" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? Array.from({length: 3}).map((_, i) => <div key={i} className="aspect-[4/5] bg-gray-100 animate-pulse rounded-[2.5rem]"></div>) : halls.map(h => renderCard(h, 'hall', 'قاعة'))}
          </div>
          <div className="text-center pt-10">
            <Button onClick={() => onBrowseHalls({ type: 'hall' })} className="rounded-full px-12 h-14 font-black bg-[#111827] text-white hover:bg-black transition-all text-lg shadow-xl">عرض المزيد</Button>
          </div>
        </div>
      </section>

      {/* Resorts/Chalets Section */}
      <section className="w-full py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
          <SectionHeader title="شاليهات ومنتجعات فاخرة" icon={Palmtree} subtitle="استجمام ورفاهية" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? Array.from({length: 3}).map((_, i) => <div key={i} className="aspect-[4/5] bg-gray-100 animate-pulse rounded-[2.5rem]"></div>) : resorts.map(h => renderCard(h, 'hall', 'منتجع'))}
          </div>
          <div className="text-center pt-10">
            <Button onClick={() => onBrowseHalls({ type: 'resort' })} variant="outline" className="rounded-full px-12 h-14 font-black text-lg">استكشف الشاليهات</Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="w-full py-20 bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
          <SectionHeader title="خدمات المناسبات المتكاملة" icon={Award} subtitle="كل ما تحتاجه" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? Array.from({length: 3}).map((_, i) => <div key={i} className="aspect-[4/5] bg-gray-100 animate-pulse rounded-[2.5rem]"></div>) : services.map(s => renderCard(s, 'service', s.category))}
          </div>
        </div>
      </section>

      {/* Store Section (Admin Products) */}
      <section className="w-full py-24 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-6 lg:px-20 relative z-10">
          <div className="flex flex-col items-center text-center space-y-3 mb-16">
             <div className="flex items-center gap-2 text-white bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                <ShoppingBag className="w-4 h-4 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">متجر المنصة</span>
             </div>
             <h2 className="text-4xl font-black tracking-tight">منتجات حصرية لشركائنا وعملائنا</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             {loading ? Array.from({length: 4}).map((_, i) => <div key={i} className="aspect-square bg-white/10 animate-pulse rounded-[2rem]"></div>) : storeItems.map(item => (
                <div key={item.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:bg-white/10 transition-all group cursor-pointer text-center">
                   <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 text-white group-hover:scale-110 transition-transform">
                      <Package className="w-8 h-8" />
                   </div>
                   <h4 className="font-bold text-lg mb-1">{item.name}</h4>
                   <PriceTag amount={item.price} className="justify-center text-primary text-xl font-black" />
                   <Button className="w-full mt-4 rounded-xl font-bold bg-white text-gray-900 hover:bg-gray-200">طلب الآن</Button>
                </div>
             ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-6 lg:px-20 py-20 bg-white border-t border-gray-100 text-right">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
             <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">© 2025 SA HALL. ALL RIGHTS RESERVED.</p>
             <div className="flex gap-6 text-xs font-bold text-gray-500">
                <a href="#" className="hover:text-primary">الخصوصية</a>
                <a href="#" className="hover:text-primary">الشروط</a>
                <a href="#" className="hover:text-primary">تواصل معنا</a>
             </div>
        </div>
      </footer>
    </div>
  );
};
