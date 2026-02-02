
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile, SystemSettings as ISystemSettings } from './types';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { VendorHalls } from './pages/VendorHalls';
import { VendorServices } from './pages/VendorServices';
import { BrowseHalls } from './pages/BrowseHalls';
import { UsersManagement } from './pages/UsersManagement';
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
import { PriceTag } from './components/ui/PriceTag';
import { Menu, Loader2, X, ShieldAlert, Sparkles, Building2, ChevronRight, CheckCircle2 } from 'lucide-react';
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
  const lastFetchedUserId = useRef<string | null>(null);

  // Vendor Plan State
  const [plannedHalls, setPlannedHalls] = useState(1);
  const [plannedServices, setPlannedServices] = useState(0);
  
  const [initialBrowseFilters, setInitialBrowseFilters] = useState<any>(null);
  
  const [siteSettings, setSiteSettings] = useState<ISystemSettings>({
    site_name: 'القاعة',
    commission_rate: 0.10,
    vat_enabled: true,
    platform_logo_url: '',
    hall_listing_fee: 500,
    service_listing_fee: 300
  } as any);
  
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('user');

  const fetchSiteSettings = async () => {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
      if (data?.value) setSiteSettings(data.value);
    } catch (err) { console.error(err); }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setUserProfile(data as UserProfile);
        lastFetchedUserId.current = userId;
        // If logged in as vendor or admin, go to dashboard
        if (data.role !== 'user' && activeTab === 'home') {
          setActiveTab('dashboard');
        }
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
    if (isRegister && role === 'vendor' && regStep === 1) {
      setRegStep(2);
      return;
    }

    setAuthLoading(true);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ 
          email, password, 
          options: { data: { full_name: fullName, role: role, is_enabled: true } } 
        });
        if (error) throw error;
        toast({ title: 'تفعيل الحساب', description: 'يرجى مراجعة بريدك الإلكتروني.', variant: 'default' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      setShowAuthModal(false);
      setRegStep(1);
    } catch (error: any) { 
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); 
    } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setActiveTab('home');
  };

  const handleBrowseHalls = (filters?: any) => {
    setInitialBrowseFilters(filters || null);
    setBrowseMode('halls');
    setActiveTab('browse');
  };

  const openAuth = (mode: 'login' | 'register', targetRole: string = 'user') => {
    setIsRegister(mode === 'register');
    setRole(targetRole);
    setRegStep(1);
    setShowAuthModal(true);
  };

  const planTotal = (plannedHalls * 500) + (plannedServices * 300);

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-primary gap-4">
      <div className="text-7xl font-ruqaa animate-pulse text-primary">القاعة</div>
      <Loader2 className="w-10 h-10 animate-spin opacity-20" />
    </div>
  );

  const isMarketplace = activeTab === 'home' || activeTab === 'browse';

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]" dir="rtl">
      {!isMarketplace && userProfile && (
        <Sidebar 
          user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} 
          onLogout={handleLogout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} 
          siteName={siteSettings.site_name} platformLogo={siteSettings.platform_logo_url}
        />
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[1000] bg-white/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-lg bg-white border border-gray-100 rounded-[3rem] p-12 shadow-2xl relative animate-in zoom-in-95">
             <button onClick={() => setShowAuthModal(false)} className="absolute top-8 left-8 p-3 hover:bg-gray-50 rounded-full transition-colors"><X className="w-5 h-5" /></button>
             
             <div className="text-center space-y-4 mb-8">
                <div className="text-6xl font-ruqaa text-primary mx-auto">القاعة</div>
                <h2 className="text-3xl font-black text-gray-900">
                  {isRegister ? (regStep === 1 ? 'انضم كشريك نجاح' : 'اختر خطة الاشتراك') : 'بوابة الشركاء'}
                </h2>
                <p className="text-sm text-gray-400 font-bold">
                  {isRegister ? (regStep === 1 ? 'ابدأ رحلتك معنا اليوم' : 'خصص سعتك التشغيلية على المنصة') : 'مرحباً بك مجدداً في مساحتك الخاصة'}
                </p>
             </div>

             <form onSubmit={handleAuth} className="space-y-6 text-right">
                {regStep === 1 ? (
                  <>
                    {isRegister && <Input placeholder="اسم النشاط التجاري / الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-14 rounded-2xl text-right font-bold bg-gray-50 border-none shadow-inner" />}
                    <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required className="h-14 rounded-2xl text-right font-bold bg-gray-50 border-none shadow-inner" />
                    <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required className="h-14 rounded-2xl text-right font-bold bg-gray-50 border-none shadow-inner" />
                    
                    {isRegister && (
                      <div className="p-1.5 bg-gray-50 rounded-2xl flex gap-2 border border-gray-100 shadow-inner">
                        <button type="button" onClick={() => setRole('user')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${role === 'user' ? 'bg-primary text-white shadow-lg' : 'text-gray-400'}`}>عميل</button>
                        <button type="button" onClick={() => setRole('vendor')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${role === 'vendor' ? 'bg-primary text-white shadow-lg' : 'text-gray-400'}`}>بائع (شريك)</button>
                      </div>
                    )}

                    <Button type="submit" className="w-full h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" disabled={authLoading}>
                      {authLoading ? <Loader2 className="animate-spin" /> : (isRegister ? (role === 'vendor' ? 'التالي: اختيار الخطة' : 'إنشاء حساب جديد') : 'دخول المنصة')}
                    </Button>
                  </>
                ) : (
                  /* Plan Selection Step for Vendors */
                  <div className="space-y-8 animate-in slide-in-from-left-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2 justify-end">عدد القاعات <Building2 className="w-3.5 h-3.5" /></label>
                          <div className="flex items-center bg-gray-50 rounded-2xl p-2 border border-gray-100 shadow-inner">
                             <button type="button" onClick={() => setPlannedHalls(Math.max(1, plannedHalls-1))} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-black">-</button>
                             <input type="number" readOnly className="flex-1 bg-transparent border-none text-center font-black text-xl" value={plannedHalls} />
                             <button type="button" onClick={() => setPlannedHalls(plannedHalls+1)} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-black">+</button>
                          </div>
                          <p className="text-[9px] text-center text-gray-400 font-bold">500 ر.س / لكل قاعة</p>
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2 justify-end">عدد الخدمات <Sparkles className="w-3.5 h-3.5" /></label>
                          <div className="flex items-center bg-gray-50 rounded-2xl p-2 border border-gray-100 shadow-inner">
                             <button type="button" onClick={() => setPlannedServices(Math.max(0, plannedServices-1))} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-black">-</button>
                             <input type="number" readOnly className="flex-1 bg-transparent border-none text-center font-black text-xl" value={plannedServices} />
                             <button type="button" onClick={() => setPlannedServices(plannedServices+1)} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-black">+</button>
                          </div>
                          <p className="text-[9px] text-center text-gray-400 font-bold">300 ر.س / لكل خدمة</p>
                       </div>
                    </div>

                    <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10 space-y-6">
                       <div className="flex justify-between items-center flex-row-reverse">
                          <span className="text-xs font-black text-gray-500 uppercase tracking-widest">إجمالي التكلفة</span>
                          <div className="flex items-center gap-2">
                             <span className="text-4xl font-black text-primary">{planTotal}</span>
                             <span className="text-xs font-bold text-primary">ر.س</span>
                          </div>
                       </div>
                       <ul className="space-y-3">
                          <li className="flex items-center justify-end gap-2 text-[10px] font-bold text-primary/70"><CheckCircle2 className="w-3 h-3" /> دفع لمرة واحدة</li>
                          <li className="flex items-center justify-end gap-2 text-[10px] font-bold text-primary/70"><CheckCircle2 className="w-3 h-3" /> لوحة تحكم بائع متكاملة</li>
                       </ul>
                    </div>

                    <div className="flex gap-4">
                      <Button type="button" variant="outline" onClick={() => setRegStep(1)} className="flex-1 h-14 rounded-2xl font-black border-gray-100">رجوع</Button>
                      <Button type="submit" className="flex-[2] h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" disabled={authLoading}>
                        {authLoading ? <Loader2 className="animate-spin" /> : 'تأكيد ودفع'}
                      </Button>
                    </div>
                  </div>
                )}
             </form>

             <button 
                onClick={() => { setIsRegister(!isRegister); setRegStep(1); }} 
                className="w-full mt-8 text-[11px] font-black text-primary hover:underline uppercase tracking-widest flex items-center justify-center gap-2"
             >
                {isRegister ? 'لديك حساب بائع؟ سجل دخول' : 'ليس لديك حساب؟ انضم كشريك الآن'}
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
             </button>
          </div>
        </div>
      )}

      <main className={`${!isMarketplace && userProfile ? 'lg:pr-[280px]' : ''}`}>
        <div className={`mx-auto w-full ${!isMarketplace && userProfile ? 'p-6 lg:p-10' : ''}`}>
          {!isMarketplace && userProfile && (
            <div className="lg:hidden flex justify-start mb-6">
               <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(true)} className="rounded-xl border-gray-100 bg-white">
                  <Menu className="w-5 h-5 text-primary" />
               </Button>
            </div>
          )}

          {activeTab === 'home' && (
            <Home 
              user={userProfile} onLoginClick={() => openAuth('login', 'vendor')} 
              onRegisterClick={() => openAuth('register', 'vendor')}
              onBrowseHalls={handleBrowseHalls}
              onBrowseServices={() => { setActiveTab('browse'); setBrowseMode('services'); }}
              onNavigate={setActiveTab} onLogout={handleLogout}
            />
          )}
          {activeTab === 'browse' && (
            <BrowseHalls 
              user={userProfile} mode={browseMode} onBack={() => setActiveTab('home')}
              onLoginClick={() => openAuth('login')} onNavigate={setActiveTab} onLogout={handleLogout}
              initialFilters={initialBrowseFilters}
            />
          )}
          {activeTab === 'dashboard' && userProfile && <Dashboard user={userProfile} />}
          {activeTab === 'calendar' && userProfile && <CalendarBoard user={userProfile} />}
          {activeTab === 'my_halls' && userProfile && <VendorHalls user={userProfile} />}
          {activeTab === 'my_services' && userProfile && <VendorServices user={userProfile} />}
          {activeTab === 'pos' && userProfile && <VendorPOS user={userProfile} />}
          {activeTab === 'coupons' && userProfile && <VendorCoupons user={userProfile} />}
          {activeTab === 'my_favorites' && userProfile && <Favorites user={userProfile} />}
          {activeTab === 'subscriptions' && <VendorSubscriptions />}
          {activeTab === 'settings' && <SystemSettings />}
          {activeTab === 'brand_settings' && userProfile && <VendorBrandSettings user={userProfile} onUpdate={fetchProfile} />}
          {['all_bookings', 'hall_bookings', 'my_bookings'].includes(activeTab) && userProfile && <Bookings user={userProfile} />}
        </div>
      </main>
    </div>
  );
};

export default App;
