
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, SAUDI_CITIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Search, MapPin, Users, Star, ArrowLeft, 
  Sparkles, ShieldCheck, Building2, LayoutGrid,
  Filter, ChevronLeft, ArrowRight, Play, Compass
} from 'lucide-react';
import { HallDetailPopup } from '../components/Home/HallDetailPopup';

export const Home: React.FC<{ user: UserProfile | null }> = ({ user }) => {
  const [halls, setHalls] = useState<(Hall & { vendor?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedHall, setSelectedHall] = useState<(Hall & { vendor?: UserProfile }) | null>(null);

  const fetchHalls = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true);
      if (selectedCity !== 'all') {
        query = query.eq('city', selectedCity);
      }
      const { data, error } = await query;
      if (error) throw error;
      setHalls(data as any[] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCity]);

  useEffect(() => {
    fetchHalls();
  }, [fetchHalls]);

  const filteredHalls = halls.filter(h => 
    h.name.toLowerCase().includes(search.toLowerCase()) || 
    h.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fafafa] pb-32 selection:bg-primary selection:text-white">
      {/* Luxury Navbar (Standalone) */}
      <nav className="h-24 px-10 flex items-center justify-between border-b border-black/5 sticky top-0 bg-white/80 backdrop-blur-2xl z-[100] flex-row-reverse">
        <div className="flex items-center gap-4 flex-row-reverse">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-xl">
             <Building2 className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-black">SA HALL</span>
        </div>
        <div className="hidden md:flex items-center gap-12 flex-row-reverse text-right">
           {['الرئيسية', 'القاعات الملكية', 'عن المنصة', 'تواصل'].map(item => (
             <button key={item} className="text-sm font-black text-black/60 hover:text-black transition-colors uppercase tracking-widest">{item}</button>
           ))}
        </div>
        <div className="flex items-center gap-4 flex-row-reverse">
           <Button variant="ghost" className="font-black text-xs px-6">دخول الشركاء</Button>
           <Button className="rounded-full px-8 h-12 font-black shadow-soft-primary">اكتشف الآن</Button>
        </div>
      </nav>

      {/* Luxury Hero */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden px-10">
        <div className="absolute inset-0 z-0">
           <img 
            src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover scale-105" 
            alt="Hero Background" 
           />
           <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-[#fafafa] via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-5xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-20 duration-1000">
           <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.3em]">
              <Sparkles className="w-4 h-4 text-primary" /> تجربة ملكية لحجز قاعاتك
           </div>
           <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] text-center">
             وجهتك الأولى <br />
             <span className="text-primary italic serif">لأرقى المناسبات</span>
           </h1>
           <p className="text-white/80 max-w-2xl mx-auto font-medium text-xl leading-relaxed">
             نحن لا نحجز قاعات، بل نصنع مساحة مثالية لكل احتفال يستحق الخلود في أفخم الوجهات بالمملكة.
           </p>

           {/* Search Box */}
           <div className="max-w-4xl mx-auto mt-16 p-2 bg-white rounded-[3rem] shadow-2xl flex flex-col md:flex-row-reverse items-center gap-2">
              <div className="flex-1 w-full relative flex flex-row-reverse items-center">
                 <Search className="mr-6 w-5 h-5 text-black/20" />
                 <input 
                  type="text" 
                  placeholder="ابحث عن اسم القاعة أو المدينة..." 
                  className="w-full h-16 pr-4 pl-4 bg-transparent outline-none font-bold text-black text-xl text-right placeholder:text-black/20"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                 />
              </div>
              <div className="flex items-center gap-2 p-2 w-full md:w-auto flex-row-reverse overflow-x-auto no-scrollbar">
                  {SAUDI_CITIES.map(city => (
                    <button 
                      key={city}
                      onClick={() => setSelectedCity(city)}
                      className={`px-8 h-12 rounded-full text-xs font-black transition-all whitespace-nowrap ${selectedCity === city ? 'bg-primary text-white shadow-soft-primary' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                    >{city}</button>
                  ))}
                  <button 
                    onClick={() => setSelectedCity('all')}
                    className={`px-8 h-12 rounded-full text-xs font-black transition-all whitespace-nowrap ${selectedCity === 'all' ? 'bg-black text-white' : 'bg-muted/50 text-muted-foreground'}`}
                  >الكل</button>
              </div>
           </div>
        </div>
      </section>

      {/* Featured Grid Section */}
      <section className="max-w-7xl mx-auto px-10 mt-20">
         <div className="flex items-center justify-between mb-16 flex-row-reverse">
            <div className="text-right">
               <h2 className="text-4xl font-black text-black tracking-tight">قاعاتنا الفاخرة</h2>
               <p className="text-black/40 font-bold mt-2">مجموعة مختارة بعناية لأرقى المناسبات والاحتفالات</p>
            </div>
            <div className="flex gap-4">
               <Button variant="outline" className="rounded-full h-14 px-10 gap-3 font-black border-2 border-black/5 hover:border-primary">
                  تصفية متقدمة <Filter className="w-5 h-5" />
               </Button>
            </div>
         </div>

         {loading ? (
           <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
             {[1, 2, 3].map(i => <div key={i} className="aspect-[4/5] bg-black/5 animate-pulse rounded-[4rem]"></div>)}
           </div>
         ) : (
           <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
             {filteredHalls.map((hall) => (
               <div 
                key={hall.id} 
                onClick={() => setSelectedHall(hall)}
                className="group relative flex flex-col cursor-pointer animate-in fade-in duration-700"
               >
                 <div className="aspect-[3/4] rounded-[4rem] overflow-hidden bg-black/5 relative shadow-soft group-hover:shadow-2xl transition-all duration-700">
                    {hall.image_url ? (
                      <img src={hall.image_url} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt={hall.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-10"><Building2 className="w-20 h-20" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                    
                    {/* Floating Info Over Image */}
                    <div className="absolute top-8 right-8 bg-white/95 backdrop-blur-xl px-5 py-2 rounded-full text-[10px] font-black shadow-xl flex items-center gap-2">
                       <Star className="w-3.5 h-3.5 text-primary fill-primary" /> 4.9 • {hall.city}
                    </div>

                    <div className="absolute bottom-10 inset-x-10 text-right space-y-2">
                       <h3 className="text-3xl font-black text-white tracking-tight">{hall.name}</h3>
                       <div className="flex items-center justify-end gap-3 text-white/70 text-xs font-bold">
                          <span className="flex items-center gap-1 flex-row-reverse">{hall.capacity} ضيف <Users className="w-4 h-4" /></span>
                          <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                          <span className="flex items-center gap-1 flex-row-reverse">{hall.city} <MapPin className="w-4 h-4" /></span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="mt-8 flex items-center justify-between flex-row-reverse px-4">
                    <div className="text-right">
                       <span className="text-[10px] text-black/40 font-black uppercase tracking-widest block">السعر التقديري</span>
                       <PriceTag amount={hall.price_per_night} className="text-2xl text-black" iconSize={20} />
                    </div>
                    <Button variant="ghost" className="rounded-full w-14 h-14 bg-black text-white hover:bg-primary transition-all shadow-xl">
                       <ChevronLeft className="w-6 h-6" />
                    </Button>
                 </div>
               </div>
             ))}
           </div>
         )}
      </section>

      {/* Luxury Footer (Standalone) */}
      <footer className="mt-40 bg-black py-24 px-10 text-white">
         <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 text-right">
            <div className="md:col-span-2 space-y-8">
               <h3 className="text-4xl font-black tracking-tighter">SA HALL</h3>
               <p className="text-white/40 text-lg leading-relaxed max-w-md ml-auto">
                 نحن نؤمن أن كل مناسبة هي عمل فني يستحق المكان الأنسب والتفاصيل الأدق. منصتنا تجمع لك صفوة القاعات في المملكة.
               </p>
               <div className="flex justify-end gap-4">
                  {[1, 2, 3].map(i => <div key={i} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-primary transition-all cursor-pointer"></div>)}
               </div>
            </div>
            <div className="space-y-6">
               <h4 className="text-sm font-black uppercase tracking-[0.2em] text-primary">روابط سريعة</h4>
               <ul className="space-y-4 text-white/60 font-bold">
                  {['اكتشف القاعات', 'انضم كبائع', 'الشروط والأحكام', 'سياسة الخصوصية'].map(item => <li key={item} className="hover:text-white transition-colors cursor-pointer">{item}</li>)}
               </ul>
            </div>
            <div className="space-y-6">
               <h4 className="text-sm font-black uppercase tracking-[0.2em] text-primary">تواصل معنا</h4>
               <ul className="space-y-4 text-white/60 font-bold">
                  <li>الرياض، المملكة العربية السعودية</li>
                  <li>contact@sahall.com</li>
                  <li>+966 800 123 4567</li>
               </ul>
            </div>
         </div>
         <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-white/10 flex justify-between items-center flex-row-reverse text-[10px] font-black uppercase tracking-widest text-white/20">
            <span>حقوق الطبع محفوظة © ٢٠٢٥ SA HALL</span>
            <span>تصميم وبناء بواسطة المبدعين</span>
         </div>
      </footer>

      {selectedHall && (
        <HallDetailPopup 
          hall={selectedHall} 
          user={user} 
          onClose={() => setSelectedHall(null)} 
        />
      )}
    </div>
  );
};
