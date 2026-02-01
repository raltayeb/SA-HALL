
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Search, MapPin, Users, Star, 
  Sparkles, Building2, 
  ChevronLeft, ArrowLeft,
  Diamond, Calendar as CalendarIcon, Send, Globe, User, Share2, Package, LogOut, LayoutDashboard, CalendarDays, Settings, ClipboardList,
  Play, ChevronDown, CheckCircle2, Quote, ArrowRight, Home as HomeIcon
} from 'lucide-react';
import { HallDetailPopup } from '../components/Home/HallDetailPopup';

interface HomeProps {
  user: UserProfile | null;
  onLoginClick: () => void;
  onBrowseHalls: () => void;
  onBrowseServices: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

export const Home: React.FC<HomeProps> = ({ user, onLoginClick, onBrowseHalls, onBrowseServices, onNavigate, onLogout }) => {
  const [halls, setHalls] = useState<(Hall & { vendor?: UserProfile })[]>([]);
  const [loadingHalls, setLoadingHalls] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<{ item: any, type: 'hall' | 'service' } | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchHalls = useCallback(async () => {
    setLoadingHalls(true);
    try {
      const { data, error } = await supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true).limit(6);
      if (error) throw error;
      setHalls(data as any[] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHalls(false);
    }
  }, []);

  useEffect(() => {
    fetchHalls();
  }, [fetchHalls]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      {/* Luxury Navbar */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 lg:px-20 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="text-primary transition-transform group-hover:rotate-12">
                <Diamond className="w-8 h-8 fill-current" />
              </div>
              <h1 className="text-4xl font-ruqaa leading-none tracking-tighter text-primary mt-1">
                قاعه
              </h1>
            </div>
            <nav className="hidden lg:flex items-center gap-8">
              <button className="text-xs font-bold text-primary border-b-2 border-primary pb-1">الرئيسية</button>
              <button onClick={onBrowseHalls} className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">القاعات</button>
              <button className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">الباقات</button>
              <button className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">إدارة المناسبات</button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {!user ? (
              <div className="flex items-center gap-4">
                <button onClick={onLoginClick} className="text-xs font-bold text-gray-600 hover:text-primary">دخول</button>
                <Button onClick={onLoginClick} className="rounded-full px-6 h-10 text-xs font-black bg-[#111827] hover:bg-black text-white">انضم إلينا</Button>
              </div>
            ) : (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 bg-white border p-1 rounded-full hover:shadow-md transition-all">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-black">{user.full_name?.[0]}</div>
                  <span className="text-[11px] font-bold ps-1 pe-2">{user.full_name}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400 me-2" />
                </button>
                {isUserMenuOpen && (
                  <div className="absolute left-0 mt-3 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[110] text-right">
                    <div className="p-4 border-b border-gray-50">
                      <p className="text-xs font-bold text-gray-900">{user.full_name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{user.email}</p>
                    </div>
                    <div className="p-2 space-y-1">
                      <button onClick={() => onNavigate('dashboard')} className="w-full flex items-center justify-end gap-3 px-4 py-3 rounded-xl text-[11px] font-bold text-gray-600 hover:bg-gray-50">لوحة التحكم <LayoutDashboard className="w-4 h-4" /></button>
                      <button onClick={onLogout} className="w-full flex items-center justify-end gap-3 px-4 py-3 rounded-xl text-[11px] font-bold text-red-600 hover:bg-red-50">خروج <LogOut className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Widget - Realeast Style */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden px-6 lg:px-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover" 
            alt="Venue" 
          />
          <div className="absolute inset-0 bg-gradient-to-l from-white/10 via-transparent to-black/40"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-right space-y-8 animate-in fade-in slide-in-from-right-10 duration-1000">
            <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter text-white drop-shadow-2xl">
              اكتشف قاعة <br />
              <span className="text-white/90 italic">أحلامك المثالية</span>
            </h1>
            <p className="text-white/90 text-lg md:text-xl font-medium max-w-lg leading-relaxed drop-shadow-md">
              سواء كنت تبحث عن ملاذ هادئ، منتجع حديث، أو قاعة زفاف فسيحة، نحن هنا لإرشادك في كل خطوة لاختيار المكان الأمثل لمناسبتك.
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-left-10 duration-1000 delay-200">
            <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md ml-auto shadow-2xl space-y-8 text-right">
              <h3 className="text-2xl font-black text-gray-900">ابحث عن أفضل مكان لمناسبتك</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">يرجى ملء التفاصيل التالية</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ps-1">الموقع</label>
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <MapPin className="w-5 h-5 text-primary" />
                    <select className="bg-transparent border-none text-sm font-bold w-full outline-none appearance-none">
                      <option>الرياض، السعودية</option>
                      <option>جدة، السعودية</option>
                      <option>الدمام، السعودية</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-300" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ps-1">نوع القاعة</label>
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <HomeIcon className="w-5 h-5 text-primary" />
                    <select className="bg-transparent border-none text-sm font-bold w-full outline-none appearance-none">
                      <option>قاعة فندقية</option>
                      <option>منتجع خارجي</option>
                      <option>قصر أفراح</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-300" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-bold">
                    <Users className="w-4 h-4 text-primary" /> 300+ ضيف
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-bold">
                    <Star className="w-4 h-4 text-primary" /> 5 نجوم
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                    <span>أقصى ميزانية</span>
                    <span className="text-primary font-black">150,000 ر.س</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-primary w-2/3"></div>
                  </div>
                </div>

                <Button onClick={onBrowseHalls} className="w-full h-14 rounded-2xl font-black text-lg bg-[#111827] text-white hover:bg-black shadow-xl mt-4">ابحث الآن</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Listing - Marketplace Grid */}
      <section className="max-w-7xl mx-auto px-6 lg:px-20 py-24 space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 text-right">
          <div className="space-y-3">
            <h2 className="text-4xl font-black tracking-tight">قاعات شائعة</h2>
            <div className="flex items-center gap-2 text-gray-400 font-bold">
              <MapPin className="w-4 h-4" /> <span>المملكة العربية السعودية</span> <ChevronDown className="w-3 h-3" />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {['الكل', 'فنادق', 'فيلات', 'منتجعات'].map((cat, i) => (
              <button key={i} className={`px-6 py-2.5 rounded-full text-[10px] font-black border transition-all whitespace-nowrap ${i === 0 ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white border-gray-200 text-gray-500 hover:border-primary'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {loadingHalls ? (
            Array.from({length: 3}).map((_, i) => <div key={i} className="aspect-[4/5] bg-gray-100 animate-pulse rounded-[2rem]"></div>)
          ) : (
            halls.map((hall) => (
              <div key={hall.id} onClick={() => setSelectedEntity({ item: hall, type: 'hall' })} className="realeast-card group overflow-hidden cursor-pointer text-right">
                <div className="relative aspect-video overflow-hidden">
                  <img src={hall.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={hall.name} />
                  <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-lg text-[10px] font-black shadow-lg">مميز</div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center flex-row-reverse">
                    <PriceTag amount={hall.price_per_night} className="text-2xl text-primary font-black" />
                    <Button variant="outline" className="rounded-xl h-8 px-4 text-[10px] font-bold">التفاصيل</Button>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 group-hover:text-primary transition-colors truncate">{hall.name}</h3>
                  <p className="text-[10px] font-bold text-gray-400">{hall.city}, السعودية</p>
                  
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-50">
                    <div className="flex flex-col items-center gap-1 text-[9px] font-black uppercase text-gray-400">
                      <Users className="w-3.5 h-3.5 text-primary" /> {hall.capacity} ضيف
                    </div>
                    <div className="flex flex-col items-center gap-1 text-[9px] font-black uppercase text-gray-400 border-x border-gray-50">
                      <Star className="w-3.5 h-3.5 text-primary" /> 4.9 تقييم
                    </div>
                    <div className="flex flex-col items-center gap-1 text-[9px] font-black uppercase text-gray-400">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {hall.city}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="text-center pt-8">
          <Button onClick={onBrowseHalls} variant="outline" className="rounded-2xl px-12 h-14 font-black border-[#111827] hover:bg-[#111827] hover:text-white transition-all text-lg">مشاهدة الكل</Button>
        </div>
      </section>

      {/* Video Highlight */}
      <section className="max-w-7xl mx-auto px-6 lg:px-20 py-24">
        <div className="relative aspect-video rounded-[3rem] overflow-hidden shadow-2xl group border border-gray-100">
          <img 
            src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms]" 
            alt="Wedding Highlights" 
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <button className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-xl border border-white/40 flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-all active:scale-95 group">
              <Play className="w-10 h-10 fill-current ms-1" />
              <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping"></div>
            </button>
          </div>
        </div>
      </section>

      {/* How it Works - Split Section */}
      <section className="bg-white border-y border-gray-100 py-32 overflow-hidden text-right">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 space-y-24">
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-black tracking-tighter">كيف تعمل المنصة؟</h2>
            <div className="w-20 h-1.5 bg-primary mx-auto rounded-full"></div>
          </div>

          <div className="grid lg:grid-cols-2 gap-20">
            {/* Buyers */}
            <div className="space-y-12">
              <div className="bg-primary/10 text-primary py-3 px-8 rounded-2xl inline-block text-xs font-black uppercase tracking-widest border border-primary/10">للعملاء (أصحاب المناسبات)</div>
              <div className="space-y-12">
                {[
                  { id: '1', title: 'البحث والاكتشاف', desc: 'ابحث عن قاعات بناءً على تفضيلاتك (الموقع، الميزانية، السعة) واستكشف القوائم المفصلة.' },
                  { id: '2', title: 'التواصل والزيارة', desc: 'تواصل مع أصحاب القاعات أو الوكلاء لتحديد موعد لزيارة القاعة أو استكشافها افتراضياً.' },
                  { id: '3', title: 'التأكيد والحجز', desc: 'تفاوض على الشروط، وقع العقود، واحجز ليلة العمر بكل سهولة وأمان.' }
                ].map((item) => (
                  <div key={item.id} className="flex gap-8 group">
                    <div className="text-4xl font-black text-gray-100 group-hover:text-primary/20 transition-colors shrink-0">{item.id}</div>
                    <div className="space-y-2 border-r-2 border-gray-50 pr-8">
                      <h4 className="text-xl font-black text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sellers */}
            <div className="space-y-12">
              <div className="bg-gray-100 text-gray-600 py-3 px-8 rounded-2xl inline-block text-xs font-black uppercase tracking-widest border border-gray-100">للبائعين (أصحاب القاعات)</div>
              <div className="space-y-12">
                {[
                  { id: '1', title: 'إدراج قاعتك', desc: 'اعرض قاعتك أمام آلاف العملاء الباحثين عن التميز في جميع أنحاء المملكة.' },
                  { id: '2', title: 'إدارة الحجوزات', desc: 'استخدم تقويمنا الذكي لإدارة التوفر، وتلقي الطلبات، والتواصل مع العملاء.' },
                  { id: '3', title: 'توسيع نطاق عملك', desc: 'احصل على تقارير مفصلة، وقم بتحسين مبيعاتك، وكن الوجهة الأولى للمناسبات.' }
                ].map((item) => (
                  <div key={item.id} className="flex gap-8 group">
                    <div className="text-4xl font-black text-gray-100 group-hover:text-primary/20 transition-colors shrink-0">{item.id}</div>
                    <div className="space-y-2 border-r-2 border-gray-50 pr-8">
                      <h4 className="text-xl font-black text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us - Comparison Table style */}
      <section className="max-w-4xl mx-auto px-6 lg:px-20 py-32 space-y-16 text-right">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black tracking-tight">لماذا تختار رويال فينيوز؟</h2>
        </div>

        <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-xl">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-8 text-xs font-black uppercase tracking-widest text-gray-400">المميزات</th>
                <th className="p-8 text-center bg-primary/5">
                  <div className="flex flex-col items-center gap-2">
                    <Diamond className="w-5 h-5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Royal Venues</span>
                  </div>
                </th>
                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">الطرق التقليدية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { label: 'المرونة في الحجز', royal: true, traditional: true },
                { label: 'سهولة الوصول والاختيار', royal: true, traditional: false },
                { label: 'تحكم أكبر في الميزانية', royal: true, traditional: false },
                { label: 'شفافية كاملة في الأسعار', royal: true, traditional: false }
              ].map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                  <td className="p-8 text-sm font-bold text-gray-700">{row.label}</td>
                  <td className="p-8 text-center bg-primary/5">
                    <CheckCircle2 className="w-6 h-6 text-primary mx-auto" />
                  </td>
                  <td className="p-8 text-center">
                    {row.traditional ? <CheckCircle2 className="w-6 h-6 text-gray-200 mx-auto" /> : <div className="w-6 h-0.5 bg-gray-100 mx-auto rounded-full"></div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-center">
           <Button className="rounded-full px-12 h-14 bg-[#111827] text-white hover:bg-black font-black text-lg">اكتشف قاعتك الآن</Button>
        </div>
      </section>

      {/* Best Service Provider - Vendors Section */}
      <section className="max-w-7xl mx-auto px-6 lg:px-20 py-24 space-y-12 text-right">
        <div className="flex justify-between items-end">
           <h2 className="text-4xl font-black tracking-tight">أفضل مزودي الخدمات <span className="text-primary text-xl font-bold">هذا الشهر</span></h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
           {[1,2,3,4].map(i => (
             <div key={i} className="bg-white border border-gray-100 p-8 rounded-[2rem] text-center space-y-4 hover:shadow-xl transition-all group">
                <div className="relative inline-block">
                  <img src={`https://i.pravatar.cc/150?u=${i}`} className="w-24 h-24 rounded-full border-4 border-gray-50 mx-auto" alt="Vendor" />
                  <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-[8px] font-black px-2 py-1 rounded-full text-white shadow-lg">4.9 ★</div>
                </div>
                <div>
                   <h4 className="text-sm font-black text-gray-900">محمد العبدالله</h4>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">تنسيق حفلات</p>
                </div>
                <Button variant="ghost" className="rounded-xl text-[10px] font-black uppercase text-primary hover:bg-primary/5">عرض الملف</Button>
             </div>
           ))}
        </div>
      </section>

      {/* Testimonials - Card Section */}
      <section className="bg-gray-50 py-32 border-y border-gray-100 text-right">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 space-y-16">
          <div className="text-center space-y-4">
            <span className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Testimonials</span>
            <h2 className="text-4xl font-black tracking-tight">ماذا يقول عملاؤنا عنا؟</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'أحمد السعيد', role: 'عريس', text: 'كانت تجربة رائعة! الموقع سهل جداً والخيارات المتاحة متنوعة وتناسب كل الميزانيات. أنصح به بشدة.' },
              { name: 'ليلى الحربي', role: 'منظمة حفلات', text: 'أفضل أداة عملت بها لتنسيق القاعات لعملائي. الشفافية في الأسعار والتوفر توفر الكثير من الوقت.' },
              { name: 'خالد الفهد', role: 'صاحب قاعة', text: 'زادت مبيعاتي بنسبة 40% بعد الانضمام للمنصة. لوحة التحكم سهلة جداً لإدارة الحجوزات.' }
            ].map((t, i) => (
              <div key={i} className="bg-white border border-gray-100 p-10 rounded-[2.5rem] shadow-sm space-y-8 relative overflow-hidden group">
                <Quote className="absolute -top-4 -left-4 w-24 h-24 text-gray-50 rotate-12 transition-transform group-hover:scale-110" />
                <p className="text-base text-gray-600 font-medium leading-relaxed italic relative z-10">"{t.text}"</p>
                <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black">{t.name[0]}</div>
                  <div>
                    <h5 className="text-sm font-black text-gray-900">{t.name}</h5>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Footer */}
      <footer className="px-6 lg:px-20 py-32 bg-white border-t border-gray-100 text-right relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 space-y-24">
          <div className="text-center space-y-12 max-w-4xl mx-auto">
             <div className="flex justify-center gap-2">
                {[1,2,3,4,5].map(i => <img key={i} src={`https://i.pravatar.cc/100?u=${i}`} className="w-10 h-10 rounded-full border-4 border-white -ml-4 first:ml-0 shadow-sm" alt="user" />)}
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-[10px] font-black border-4 border-white -ml-4 shadow-sm text-white">+10K</div>
             </div>
             <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight">جاهز للحجز، البيع، أو التأجير؟ <br /> نحن هنا لإرشادك في كل خطوة!</h2>
             <div className="flex flex-col md:flex-row items-center justify-center gap-4">
               <Button onClick={onBrowseHalls} className="rounded-full px-12 h-16 bg-[#111827] text-white hover:bg-black font-black text-xl shadow-2xl">استكشف القاعات الآن</Button>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 border-t border-gray-100 pt-20">
             <div className="col-span-2 space-y-8">
                <div className="flex items-center gap-2">
                   <Diamond className="w-8 h-8 text-primary fill-current" />
                   <h2 className="text-4xl font-ruqaa text-primary leading-none mt-1">قاعه</h2>
                </div>
                <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-xs">نحن نعيد تعريف مفهوم الفخامة في حجز وإدارة المناسبات الكبرى في المملكة العربية السعودية، لنخلق ذكريات خالدة تليق بتطلعاتك.</p>
                <div className="flex gap-4">
                   {[Globe, User, Share2].map((Icon, i) => (
                     <button key={i} className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all"><Icon className="w-5 h-5" /></button>
                   ))}
                </div>
             </div>

             {[
               { title: 'البحث والبيع', links: ['طلب عرض', 'التسعير', 'المراجعات', 'قصص نجاح'] },
               { title: 'الحجز', links: ['حجز قاعة', 'الباقات', 'دليل العرسان'] },
               { title: 'الشركة', links: ['من نحن', 'كيف نعمل', 'تواصل معنا'] },
               { title: 'قانوني', links: ['الشروط', 'الخصوصية', 'ملفات الكوكيز'] }
             ].map((group, i) => (
               <div key={i} className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-900">{group.title}</h4>
                  <ul className="space-y-3">
                     {group.links.map((link, j) => (
                       <li key={j}><a href="#" className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">{link}</a></li>
                     ))}
                  </ul>
               </div>
             ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-gray-100 gap-6 text-[9px] text-gray-400 font-black uppercase tracking-widest">
             <p>© 2025 ROYAL VENUES SAUDI. THE PLATINUM EXPERIENCE.</p>
             <div className="flex gap-10">
                <a href="#" className="hover:text-primary">الخصوصية</a>
                <a href="#" className="hover:text-primary">الشروط</a>
             </div>
          </div>
        </div>
      </footer>

      {selectedEntity && (
        <HallDetailPopup 
          item={selectedEntity.item} 
          type={selectedEntity.type}
          user={user} 
          onClose={() => setSelectedEntity(null)} 
        />
      )}
    </div>
  );
};
