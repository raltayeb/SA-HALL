
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile, SystemSettings as ISystemSettings } from './types';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { VendorHalls } from './pages/VendorHalls';
import { VendorServices } from './pages/VendorServices';
import { BrowseHalls } from './pages/BrowseHalls';
import { Bookings } from './pages/Bookings';
import { VendorSubscriptions } from './pages/VendorSubscriptions';
import { SystemSettings } from './pages/SystemSettings';
import { Favorites } from './pages/Favorites';
import { CalendarBoard } from './pages/CalendarBoard';
import { VendorBrandSettings } from './pages/VendorBrandSettings';
import { VendorPOS } from './pages/VendorPOS';
import { VendorCoupons } from './pages/VendorCoupons';
import { Home } from './pages/Home';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Menu, Loader2, X, Sparkles, Building2, ChevronLeft, Minus, Plus } from 'lucide-react';
import { useToast } from './context/ToastContext';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [browseMode, setBrowseMode] = useState<'halls' | 'services'>('halls');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [regStep, setRegStep] = useState(1);

  const [plannedHalls, setPlannedHalls] = useState(1);
  const [plannedServices, setPlannedServices] = useState(0);
  
  const [siteSettings, setSiteSettings] = useState<ISystemSettings>({
    site_name: 'القاعة',
    hall_listing_fee: 500,
    service_listing_fee: 300
  } as any);
  
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const fetchSiteSettings = async () => {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
      if (data?.value) setSiteSettings(data.value);
    } catch (err) { console.error(err); }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setUserProfile(data as UserProfile);
        if (activeTab === 'home') setActiveTab('dashboard');
      }
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchSiteSettings();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else { setUserProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister && regStep === 1) {
      setRegStep(2);
      return;
    }

    setAuthLoading(true);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ 
          email, password, 
          options: { data: { full_name: fullName, role: 'vendor', is_enabled: true } } 
        });
        if (error) throw error;
        toast({ title: 'نجاح', description: 'تم إرسال رابط التفعيل لبريدك الإلكتروني.', variant: 'default' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      setShowAuthModal(false);
      setRegStep(1);
    } catch (error: any) { 
      toast({ title: 'خطأ', description: error.message || 'حدث خطأ في الاتصال بقاعدة البيانات', variant: 'destructive' }); 
    } finally { setAuthLoading(false); }
  };

  const openAuth = (mode: 'login' | 'register') => {
    setIsRegister(mode === 'register');
    setRegStep(1);
    setShowAuthModal(true);
  };

  const hallFee = Number(siteSettings?.hall_listing_fee) || 500;
  const serviceFee = Number(siteSettings?.service_listing_fee) || 300;
  const planTotal = (plannedHalls * hallFee) + (plannedServices * serviceFee);

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-primary">
      <div className="text-7xl font-ruqaa animate-pulse">القاعة</div>
    </div>
  );

  const isMarketplace = activeTab === 'home' || activeTab === 'browse';

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]" dir="rtl">
      {!isMarketplace && userProfile && (
        <Sidebar 
          user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} 
          onLogout={() => supabase.auth.signOut()} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} 
          siteName={siteSettings.site_name}
        />
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[1000] bg-black/20 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-[480px] bg-white border border-gray-100 rounded-[3.5rem] p-12 shadow-[0_50px_100px_-20px_rgba(75,0,130,0.15)] relative animate-in zoom-in-95">
             <button onClick={() => setShowAuthModal(false)} className="absolute top-10 left-10 text-gray-300 hover:text-gray-500 transition-colors"><X className="w-6 h-6" /></button>
             
             <div className="text-center space-y-2 mb-12">
                <div className="text-7xl font-ruqaa text-primary mb-2">القاعة</div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">
                  {isRegister ? (regStep === 1 ? 'انضم كشريك نجاح' : 'اختر خطة الاشتراك') : 'بوابة الشركاء'}
                </h2>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                  {isRegister ? (regStep === 1 ? 'ابدأ رحلتك معنا اليوم كبائع معتمد' : 'خصص سعتك التشغيلية على المنصة') : 'مرحباً بك مجدداً'}
                </p>
             </div>

             <form onSubmit={handleAuth} className="space-y-8 text-right">
                {regStep === 1 ? (
                  <div className="space-y-4">
                    {isRegister && <Input placeholder="اسم النشاط" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-14 rounded-2xl text-right font-bold bg-gray-50 border-none px-6" />}
                    <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required className="h-14 rounded-2xl text-right font-bold bg-gray-50 border-none px-6" />
                    <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required className="h-14 rounded-2xl text-right font-bold bg-gray-50 border-none px-6" />
                    <Button type="submit" className="w-full h-16 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20" disabled={authLoading}>
                      {authLoading ? <Loader2 className="animate-spin" /> : (isRegister ? 'التالي: اختيار الخطة' : 'دخول المنصة')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-10 animate-in slide-in-from-left-4">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-3">
                          <label className="text-[11px] font-bold text-gray-400 flex items-center gap-2 justify-end px-1">عدد القاعات <Building2 className="w-3 h-3" /></label>
                          <div className="flex items-center bg-gray-50 rounded-full p-1 border border-gray-100 shadow-inner">
                             <button type="button" onClick={() => setPlannedHalls(plannedHalls + 1)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-primary font-bold hover:bg-primary hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
                             <input type="number" readOnly className="flex-1 bg-transparent border-none text-center font-black text-2xl text-gray-900 focus:ring-0" value={plannedHalls} />
                             <button type="button" onClick={() => setPlannedHalls(Math.max(1, plannedHalls - 1))} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-primary font-bold hover:bg-primary hover:text-white transition-all"><Minus className="w-4 h-4" /></button>
                          </div>
                          <p className="text-[10px] text-center text-gray-400 font-bold">{hallFee} ر.س / لكل قاعة</p>
                       </div>
                       <div className="space-y-3">
                          <label className="text-[11px] font-bold text-gray-400 flex items-center gap-2 justify-end px-1">عدد الخدمات <Sparkles className="w-3 h-3" /></label>
                          <div className="flex items-center bg-gray-50 rounded-full p-1 border border-gray-100 shadow-inner">
                             <button type="button" onClick={() => setPlannedServices(plannedServices + 1)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-primary font-bold hover:bg-primary hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
                             <input type="number" readOnly className="flex-1 bg-transparent border-none text-center font-black text-2xl text-gray-900 focus:ring-0" value={plannedServices} />
                             <button type="button" onClick={() => setPlannedServices(Math.max(0, plannedServices - 1))} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-primary font-bold hover:bg-primary hover:text-white transition-all"><Minus className="w-4 h-4" /></button>
                          </div>
                          <p className="text-[10px] text-center text-gray-400 font-bold">{serviceFee} ر.س / لكل خدمة</p>
                       </div>
                    </div>

                    <div className="bg-[#F8F4FF] p-12 rounded-[2.5rem] text-center shadow-inner space-y-1">
                       <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">إجمالي التكلفة</span>
                       <div className="flex items-center gap-2 justify-center">
                          <span className="text-sm font-bold text-primary mt-1">ر.س</span>
                          <span className="text-5xl font-black text-primary leading-none tracking-tighter">{planTotal}</span>
                       </div>
                    </div>

                    <div className="flex gap-4">
                      <Button type="submit" className="flex-[2] h-16 rounded-2xl font-black text-xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20" disabled={authLoading}>
                        {authLoading ? <Loader2 className="animate-spin" /> : 'تأكيد ودفع'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setRegStep(1)} className="flex-1 h-16 rounded-2xl font-black text-lg border-gray-200 text-gray-400 hover:bg-gray-50">رجوع</Button>
                    </div>
                  </div>
                )}
             </form>

             <button 
                onClick={() => { setIsRegister(!isRegister); setRegStep(1); }} 
                className="w-full mt-10 text-[11px] font-black text-primary hover:underline uppercase tracking-[0.2em] flex items-center justify-center gap-2 group"
             >
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                {isRegister ? 'لديك حساب بائع؟ سجل دخول' : 'ليس لديك حساب؟ انضم كشريك الآن'}
             </button>
          </div>
        </div>
      )}

      <main className={`${!isMarketplace && userProfile ? 'lg:pr-[280px]' : ''}`}>
        <div className={`mx-auto w-full ${!isMarketplace && userProfile ? 'p-6 lg:p-10' : ''}`}>
          {activeTab === 'home' && (
            <Home 
              user={userProfile} onLoginClick={() => openAuth('login')} 
              onRegisterClick={() => openAuth('register')}
              onBrowseHalls={() => { setActiveTab('browse'); }}
              onBrowseServices={() => { setActiveTab('browse'); setBrowseMode('services'); }}
              onNavigate={setActiveTab} onLogout={() => supabase.auth.signOut()}
            />
          )}
          {activeTab === 'dashboard' && userProfile && <Dashboard user={userProfile} />}
          {activeTab === 'my_halls' && userProfile && <VendorHalls user={userProfile} />}
          {activeTab === 'my_services' && userProfile && <VendorServices user={userProfile} />}
          {activeTab === 'all_bookings' && userProfile && <Bookings user={userProfile} />}
        </div>
      </main>
    </div>
  );
};

export default App;
