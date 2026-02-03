
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
  const lastFetchedUserId = useRef<string | null>(null);

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
        if (activeTab === 'home') {
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
    if (isRegister && regStep === 1) {
      setRegStep(2);
      return;
    }

    setAuthLoading(true);
    try {
      if (isRegister) {
        // IMPORTANT: Data must match what handle_new_user trigger expects
        const { error, data } = await supabase.auth.signUp({ 
          email, password, 
          options: { 
            data: { 
              full_name: fullName, 
              role: 'vendor', 
              is_enabled: true 
            } 
          } 
        });
        
        if (error) throw error;
        
        toast({ 
          title: 'تفعيل الحساب', 
          description: 'يرجى مراجعة بريدك الإلكتروني لتنشيط حسابك كبائع.', 
          variant: 'default' 
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      setShowAuthModal(false);
      setRegStep(1);
    } catch (error: any) { 
      toast({ 
        title: 'فشل العملية', 
        description: error.message || 'حدث خطأ في قاعدة البيانات، يرجى المحاولة لاحقاً', 
        variant: 'destructive' 
      }); 
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

  const openAuth = (mode: 'login' | 'register') => {
    setIsRegister(mode === 'register');
    setRegStep(1);
    setShowAuthModal(true);
  };

  const hallFee = Number(siteSettings?.hall_listing_fee) || 500;
  const serviceFee = Number(siteSettings?.service_listing_fee) || 300;
  const planTotal = (plannedHalls * hallFee) + (plannedServices * serviceFee);

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
        <div className="fixed inset-0 z-[1000] bg-black/10 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-[420px] bg-white border border-gray-100 rounded-[3rem] p-10 shadow-[0_50px_100px_-20px_rgba(75,0,130,0.15)] relative animate-in zoom-in-95">
             <button onClick={() => setShowAuthModal(false)} className="absolute top-8 left-8 p-2 hover:bg-gray-50 rounded-full transition-all text-gray-300"><X className="w-5 h-5" /></button>
             
             <div className="text-center space-y-2 mb-10">
                <div className="text-6xl font-ruqaa text-primary mx-auto mb-4">القاعة</div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">
                  {isRegister ? (regStep === 1 ? 'انضم كشريك نجاح' : 'اختر خطة الاشتراك') : 'بوابة الشركاء'}
                </h2>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                  {isRegister ? (regStep === 1 ? 'ابدأ رحلتك معنا اليوم كبائع معتمد' : 'خصص سعتك التشغيلية على المنصة') : 'مرحباً بك مجدداً'}
                </p>
             </div>

             <form onSubmit={handleAuth} className="space-y-6 text-right">
                {regStep === 1 ? (
                  <div className="space-y-4">
                    {isRegister && <Input placeholder="اسم النشاط التجاري" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-14 rounded-2xl text-right font-bold bg-gray-50 border-none px-6" />}
                    <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required className="h-14 rounded-2xl text-right font-bold bg-gray-50 border-none px-6" />
                    <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required className="h-14 rounded-2xl text-right font-bold bg-gray-50 border-none px-6" />
                    
                    <Button type="submit" className="w-full h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/10" disabled={authLoading}>
                      {authLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (isRegister ? 'التالي: اختيار الخطة' : 'دخول المنصة')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-10 animate-in slide-in-from-left-4">
                    <div className="grid grid-cols-2 gap-6">
                       {/* Hall Counter */}
                       <div className="space-y-3">
                          <label className="text-[11px] font-bold uppercase text-gray-400 flex items-center gap-2 justify-end px-1">عدد القاعات <Building2 className="w-3 h-3" /></label>
                          <div className="flex items-center bg-gray-50 rounded-[1.5rem] p-1 border border-gray-100 shadow-inner group">
                             <button type="button" onClick={() => setPlannedHalls(plannedHalls + 1)} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary border border-gray-100 hover:bg-primary hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
                             <input type="number" readOnly className="flex-1 bg-transparent border-none text-center font-black text-2xl text-gray-900 focus:ring-0" value={plannedHalls} />
                             <button type="button" onClick={() => setPlannedHalls(Math.max(1, plannedHalls - 1))} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary border border-gray-100 hover:bg-primary hover:text-white transition-all"><Minus className="w-4 h-4" /></button>
                          </div>
                          <p className="text-[10px] text-center text-gray-400 font-bold">{hallFee} ر.س / لكل قاعة</p>
                       </div>

                       {/* Service Counter */}
                       <div className="space-y-3">
                          <label className="text-[11px] font-bold uppercase text-gray-400 flex items-center gap-2 justify-end px-1">عدد الخدمات <Sparkles className="w-3 h-3" /></label>
                          <div className="flex items-center bg-gray-50 rounded-[1.5rem] p-1 border border-gray-100 shadow-inner group">
                             <button type="button" onClick={() => setPlannedServices(plannedServices + 1)} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary border border-gray-100 hover:bg-primary hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
                             <input type="number" readOnly className="flex-1 bg-transparent border-none text-center font-black text-2xl text-gray-900 focus:ring-0" value={plannedServices} />
                             <button type="button" onClick={() => setPlannedServices(Math.max(0, plannedServices - 1))} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary border border-gray-100 hover:bg-primary hover:text-white transition-all"><Minus className="w-4 h-4" /></button>
                          </div>
                          <p className="text-[10px] text-center text-gray-400 font-bold">{serviceFee} ر.س / لكل خدمة</p>
                       </div>
                    </div>

                    {/* Total Price Box */}
                    <div className="bg-[#F8F4FF] p-8 rounded-[2.5rem] border border-primary/5 space-y-1 text-center shadow-inner">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">إجمالي التكلفة</span>
                       <div className="flex items-center gap-2 justify-center">
                          <span className="text-4xl font-black text-primary leading-none">{planTotal}</span>
                          <span className="text-lg font-bold text-primary mt-1">ر.س</span>
                       </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <Button type="submit" className="flex-[2] h-16 rounded-2xl font-black text-xl shadow-[0_20px_40px_-10px_rgba(75,0,130,0.3)] bg-primary hover:bg-primary/90 text-white" disabled={authLoading}>
                        {authLoading ? <Loader2 className="animate-spin w-6 h-6" /> : 'تأكيد ودفع'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setRegStep(1)} className="flex-1 h-16 rounded-2xl font-black text-lg border-gray-100 text-gray-400 hover:bg-gray-50">رجوع</Button>
                    </div>
                  </div>
                )}
             </form>

             <button 
                onClick={() => { setIsRegister(!isRegister); setRegStep(1); }} 
                className="w-full mt-10 text-[10px] font-black text-primary hover:underline uppercase tracking-[0.3em] flex items-center justify-center gap-2 group"
             >
                <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                {isRegister ? 'لديك حساب بائع؟ سجل دخول' : 'ليس لديك حساب؟ انضم كشريك الآن'}
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
              user={userProfile} onLoginClick={() => openAuth('login')} 
              onRegisterClick={() => openAuth('register')}
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
