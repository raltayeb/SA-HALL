
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, SAUDI_CITIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag, SaudiRiyalIcon } from '../components/ui/PriceTag';
import { 
  Search, MapPin, Users, Star, 
  Sparkles, Building2, 
  ChevronLeft, ArrowLeft,
  Diamond, Calendar as CalendarIcon, Send, Globe, User, Share2, Package, LogOut, LayoutDashboard, CalendarDays, Settings, ClipboardList,
  Play, ChevronDown, CheckCircle2, Quote, ArrowRight, Home as HomeIcon,
  ShieldCheck, Zap, CreditCard, Clock, Award
} from 'lucide-react';
import { HallDetailPopup } from '../components/Home/HallDetailPopup';

interface HomeProps {
  user: UserProfile | null;
  onLoginClick: () => void;
  onRegisterClick?: () => void;
  onBrowseHalls: (filters?: any) => void;
  onBrowseServices: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

export const Home: React.FC<HomeProps> = ({ user, onLoginClick, onRegisterClick, onBrowseHalls, onBrowseServices, onNavigate, onLogout }) => {
  const [halls, setHalls] = useState<(Hall & { vendor?: UserProfile })[]>([]);
  const [loadingHalls, setLoadingHalls] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<{ item: any, type: 'hall' | 'service' } | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hero Filter State
  const [filterCity, setFilterCity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterBudget, setFilterBudget] = useState(150000);

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
      const { data, error } = await supabase
        .from('halls')
        .select('*, vendor:vendor_id(*)')
        .eq('is_active', true)
        .limit(9);
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

  const handleSearchClick = () => {
    onBrowseHalls({
      city: filterCity,
      type: filterType,
      budget: filterBudget
    });
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      {/* Luxury Navbar */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 lg:px-20 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onNavigate('home')}>
              <div className="text-primary transition-transform group-hover:rotate-12">
                <Diamond className="w-8 h-8 fill-current" />
              </div>
              <h1 className="text-3xl font-ruqaa leading-none tracking-tighter text-primary mt-1">
                قاعه
              </h1>
            </div>
            <nav className="hidden lg:flex items-center gap-8">
              <button className="text-xs font-bold text-primary border-b-2 border-primary pb-1">الرئيسية</button>
              <button onClick={() => onBrowseHalls()} className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">القاعات</button>
              <button className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">الباقات</button>
              <button className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">إدارة المناسبات</button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {!user ? (
              <div className="flex items-center gap-4">
                <button onClick={onLoginClick} className="text-xs font-bold text-gray-600 hover:text-primary">بوابة الشركاء</button>
                <Button onClick={onRegisterClick || onLoginClick} className="rounded-full px-6 h-10 text-xs font-black bg-[#111827] hover:bg-black text-white">كن شريك نجاح</Button>
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

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden px-6 lg:px-20 w-full">
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
              سواء كنت تبحث عن ملاذ هادئ، منتجع حديث، أو قاعة زفاف فسيحة، نحن هنا لإرشادك في كل خطوة لاختيار المكان الأمثل لمناسبتك في المملكة.
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

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ps-1">نوع القاعة</label>
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <HomeIcon className="w-5 h-5 text-primary" />
                    <select 
                      className="bg-transparent border-none text-sm font-bold w-full outline-none appearance-none cursor-pointer"
                      value={filterType}
                      onChange={e => setFilterType(e.target.value)}
                    >
                      <option value="all">كل الأنواع</option>
                      <option value="قاعة فندقية">قاعة فندقية</option>
                      <option value="منتجع خارجي">منتجع خارجي</option>
                      <option value="قصر أفراح">قصر أفراح</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-300" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-bold justify-center">
                    <Users className="w-4 h-4 text-primary" /> 300+ ضيف
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-bold justify-center">
                    <Star className="w-4 h-4 text-primary" /> 5 نجوم
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                    <span>أقصى ميزانية</span>
                    <span className="text-primary font-black">{new Intl.NumberFormat('ar-SA').format(filterBudget)} ر.س</span>
                  </div>
                  <input 
                    type="range" 
                    min="5000" 
                    max="300000" 
                    step="5000"
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

      {/* Popular Listing - 3x3 Grid Section */}
      <section className="w-full py-24 space-y-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
          <div className="flex flex-col items-center text-center space-y-3 mb-16">
            <div className="flex items-center gap-2 text-primary bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10">
              <Sparkles className="w-4 h-4 fill-current" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">مختاراتنا لك</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight text-[#111827]">أبرز القاعات المتاحة</h2>
            <div className="w-16 h-1 bg-primary rounded-full"></div>
          </div>

          {/* Listings Grid - 3 columns, 3 rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loadingHalls ? (
              Array.from({length: 9}).map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-gray-100 animate-pulse rounded-[2.5rem]"></div>
              ))
            ) : (
              halls.map((hall) => (
                <div 
                  key={hall.id} 
                  onClick={() => setSelectedEntity({ item: hall, type: 'hall' })} 
                  className="group relative cursor-pointer text-right transition-all duration-500 hover:-translate-y-2"
                >
                  {/* Clean Creative Card */}
                  <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img 
                        src={hall.image_url || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        alt={hall.name} 
                      />
                      <div className="absolute top-4 right-4 bg-primary text-white px-4 py-1 rounded-xl text-[10px] font-black shadow-lg">مميز</div>
                      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-[9px] font-black text-primary border border-white/50 shadow-sm">متاح للحجز</div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start flex-row-reverse">
                         <div className="space-y-0.5 text-right">
                            <h3 className="text-xl font-black text-[#111827] group-hover:text-primary transition-colors truncate max-w-[180px]">{hall.name}</h3>
                            <div className="flex items-center justify-end gap-1 text-gray-400 font-bold text-xs">
                               <span>{hall.city}, السعودية</span>
                               <MapPin className="w-3 h-3 text-primary/60" />
                            </div>
                         </div>
                         <div className="text-left shrink-0">
                            <div className="flex items-center gap-1 text-primary text-xl font-black">
                              <span>{new Intl.NumberFormat('en-US').format(hall.price_per_night)}</span>
                              <SaudiRiyalIcon size={16} />
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                         <div className="flex items-center justify-end gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <span>{hall.capacity} ضيف</span>
                            <Users className="w-4 h-4 text-primary/70" />
                         </div>
                         <div className="flex items-center justify-end gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-50 pr-3">
                            <span>4.9 تقييم</span>
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="text-center pt-10">
            <Button 
              onClick={() => onBrowseHalls()} 
              className="rounded-full px-12 h-14 font-black bg-[#111827] text-white hover:bg-black transition-all text-lg shadow-xl"
            >
              استكشف كافة القاعات <ArrowLeft className="ms-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Video Highlight Section */}
      <section className="w-full py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
          <div className="relative aspect-video rounded-[3rem] overflow-hidden shadow-2xl group border border-gray-100">
            <img 
              src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=2000" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms]" 
              alt="Wedding Highlights" 
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <button className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-2xl border border-white/40 flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-all active:scale-95 group">
                <Play className="w-10 h-10 fill-current ms-1" />
                <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works - Refined */}
      <section className="w-full bg-white border-y border-gray-100 py-32 overflow-hidden text-right">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 space-y-24">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black tracking-tighter">كيف تعمل المنصة؟</h2>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full"></div>
          </div>

          <div className="grid lg:grid-cols-2 gap-20">
            {/* Buyers */}
            <div className="space-y-12">
              <div className="bg-primary/10 text-primary py-3 px-8 rounded-2xl inline-block text-[10px] font-black uppercase tracking-widest border border-primary/10 text-right">للعملاء (أصحاب المناسبات)</div>
              <div className="space-y-12">
                {[
                  { id: '1', title: 'البحث والاكتشاف', desc: 'ابحث عن قاعات بناءً على تفضيلاتك (الموقع، الميزانية، السعة) واستكشف القوائم المفصلة.' },
                  { id: '2', title: 'التواصل والزيارة', desc: 'تواصل مع مديري القاعات لتحديد موعد لزيارة القاعة أو استكشافها افتراضياً.' },
                  { id: '3', title: 'التأكيد والحجز', desc: 'تفاوض على الشروط، وقع العقود، واحجز ليلة العمر بكل سهولة وأمان.' }
                ].map((item) => (
                  <div key={item.id} className="flex gap-8 group flex-row-reverse text-right">
                    <div className="text-3xl font-black text-gray-100 group-hover:text-primary/20 transition-colors shrink-0">{item.id}</div>
                    <div className="space-y-1 border-l-2 border-gray-50 pl-8 shrink flex-1">
                      <h4 className="text-lg font-black text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sellers */}
            <div className="space-y-12">
              <div className="bg-gray-100 text-gray-600 py-3 px-8 rounded-2xl inline-block text-[10px] font-black uppercase tracking-widest border border-gray-100 text-right">للبائعين (أصحاب القاعات)</div>
              <div className="space-y-12">
                {[
                  { id: '1', title: 'إدراج قاعتك', desc: 'اعرض قاعتك أمام آلاف العملاء الباحثين عن التميز في جميع أنحاء المملكة.' },
                  { id: '2', title: 'إدارة الحجوزات', desc: 'استخدم تقويمنا الذكي لإدارة التوفر، وتلقي الطلبات، والتواصل مع العملاء بشكل رسمي.' },
                  { id: '3', title: 'توسيع نطاق عملك', desc: 'احصل على تقارير مفصلة، وقم بتحسين مبيعاتك، وكن الوجهة الأولى للمناسبات.' }
                ].map((item) => (
                  <div key={item.id} className="flex gap-8 group flex-row-reverse text-right">
                    <div className="text-3xl font-black text-gray-100 group-hover:text-primary/20 transition-colors shrink-0">{item.id}</div>
                    <div className="space-y-1 border-l-2 border-gray-50 pl-8 shrink flex-1">
                      <h4 className="text-lg font-black text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simplified Why Choose Us Section */}
      <section className="w-full bg-gray-50 py-32 overflow-hidden text-right">
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
          <div className="flex flex-col md:flex-row-reverse justify-between items-start gap-20">
            <div className="space-y-12 max-w-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-end gap-2 text-primary font-black uppercase tracking-widest text-xs">
                   <Award className="w-4 h-4" /> لماذا تختار منصتنا؟
                </div>
                <h2 className="text-4xl font-black tracking-tight text-[#111827]">نحن نضع معايير جديدة للفخامة والسهولة</h2>
                <p className="text-gray-500 font-medium leading-relaxed text-lg">
                  تجاوزنا طرق الحجز التقليدية لنقدم لك منصة متكاملة تضمن لك الأمان، الشفافية، والرفاهية في كل خطوة.
                </p>
              </div>

              <div className="space-y-10">
                 {[
                   { icon: ShieldCheck, title: 'أمان وثقة مطلقة', desc: 'حجوزات موثقة وعقود إلكترونية تضمن حقوقك بالكامل.' },
                   { icon: Zap, title: 'سرعة وكفاءة', desc: 'تأكيد فوري للحجوزات وتنسيق مباشر عبر المنصة.' },
                   { icon: CreditCard, title: 'شفافية مالية', desc: 'أسعار واضحة، لا رسوم خفية، مع دعم للفوترة الإلكترونية.' },
                   { icon: Clock, title: 'توفير الوقت', desc: 'استكشف مئات القاعات وقارن بينها في دقائق معدودة.' }
                 ].map((item, idx) => (
                   <div key={idx} className="flex gap-6 flex-row-reverse group">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                         <item.icon className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                         <h4 className="text-lg font-black text-gray-900">{item.title}</h4>
                         <p className="text-sm text-gray-400 font-bold">{item.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>
            </div>

            <div className="hidden lg:block flex-1 relative h-[600px]">
               <div className="absolute inset-0 bg-primary/5 rounded-[4rem] -rotate-3 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=1000" className="w-full h-full object-cover opacity-20" alt="Wedding Detail" />
               </div>
               <div className="absolute top-20 right-20 w-80 h-96 bg-white rounded-[3rem] shadow-2xl p-2 rotate-3 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover rounded-[2.8rem]" alt="Luxury" />
               </div>
               <div className="absolute bottom-20 left-20 w-64 h-80 bg-white rounded-[3rem] shadow-2xl p-2 -rotate-6 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover rounded-[2.8rem]" alt="Decor" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full bg-white py-32 border-y border-gray-100 text-right">
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
              <div key={i} className="bg-gray-50 border border-gray-100 p-10 rounded-[2.5rem] shadow-sm space-y-8 relative overflow-hidden group">
                <Quote className="absolute -top-4 -left-4 w-20 h-20 text-gray-100 rotate-12 transition-transform group-hover:scale-110" />
                <p className="text-base text-gray-600 font-medium leading-relaxed italic relative z-10">"{t.text}"</p>
                <div className="flex items-center gap-4 pt-4 border-t border-gray-200 flex-row-reverse text-right">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">{t.name[0]}</div>
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

      {/* Footer & Refined CTA - Corrected with wedding theme and logical colors */}
      <footer className="w-full px-6 lg:px-20 py-32 bg-[#111827] text-white text-right relative overflow-hidden">
        {/* CORRECTED: High quality wedding background overlay */}
        <div className="absolute inset-0 opacity-20">
           <img src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover" alt="Wedding Background" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10 space-y-24">
          <div className="text-center space-y-12 max-w-4xl mx-auto">
             <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                <div className="flex -space-x-2 flex-row-reverse space-x-reverse">
                   {[1,2,3,4].map(i => <img key={i} src={`https://i.pravatar.cc/100?u=${i+30}`} className="w-8 h-8 rounded-full border-2 border-[#111827]" />)}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">انضم لأكثر من 10,000 عميل سعيد</span>
             </div>
             
             {/* CORRECTED: Normal font style, clean size */}
             <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-white">
                حول مناسبتك القادمة <br />
                إلى ذكرى ملكية
             </h2>
             
             <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                {/* CORRECTED: Button is now Primary Color with White Text */}
                <Button 
                  onClick={() => onBrowseHalls()} 
                  className="rounded-full px-16 h-20 bg-primary text-white hover:bg-primary/90 font-black text-2xl shadow-2xl shadow-primary/40 transition-all hover:scale-105 border-none"
                >
                  استكشف القاعات الآن
                </Button>
                <button onClick={onRegisterClick} className="text-lg font-black border-b-2 border-white/20 hover:border-white text-white transition-all py-2">كن شريكاً في النجاح</button>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 border-t border-white/5 pt-20">
             <div className="col-span-2 space-y-8">
                <div className="flex items-center gap-2 justify-end">
                   <h2 className="text-4xl font-ruqaa text-white leading-none mt-1">قاعه</h2>
                   <Diamond className="w-8 h-8 text-primary fill-current" />
                </div>
                <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-xs ml-auto">نحن نعيد تعريف مفهوم الفخامة في حجز وإدارة المناسبات الكبرى في المملكة العربية السعودية، لنخلق ذكريات خالدة تليق بتطلعاتك.</p>
             </div>

             {[
               { title: 'البحث والبيع', links: ['طلب عرض', 'التسعير', 'المراجعات', 'قصص نجاح'] },
               { title: 'الحجز', links: ['حجز قاعة', 'الباقات', 'دليل العرسان'] },
               { title: 'الشركة', links: ['من نحن', 'كيف نعمل', 'تواصل معنا'] },
               { title: 'قانوني', links: ['الشروط', 'الخصوصية', 'ملفات الكوكيز'] }
             ].map((group, i) => (
               <div key={i} className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">{group.title}</h4>
                  <ul className="space-y-3">
                     {group.links.map((link, j) => (
                       <li key={j}><a href="#" className="text-xs font-bold text-gray-500 hover:text-white transition-colors">{link}</a></li>
                     ))}
                  </ul>
               </div>
             ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-white/5 gap-6 text-[9px] text-gray-400 font-black uppercase tracking-widest">
             <p>© 2025 ROYAL VENUES SAUDI. THE PLATINUM EXPERIENCE.</p>
             <div className="flex gap-10">
                <a href="#" className="hover:text-white">الخصوصية</a>
                <a href="#" className="hover:text-white">الشروط</a>
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
