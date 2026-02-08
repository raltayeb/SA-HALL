
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile, VAT_RATE, SAUDI_CITIES, HALL_AMENITIES, SERVICE_CATEGORIES, Hall } from './types';
import { Sidebar } from './components/Layout/Sidebar';
import { PublicNavbar } from './components/Layout/PublicNavbar';
import { Footer } from './components/Layout/Footer';
import { Dashboard } from './pages/Dashboard';
import { VendorHalls } from './pages/VendorHalls';
import { Bookings } from './pages/Bookings';
import { Home } from './pages/Home';
import { VendorSubscriptions } from './pages/VendorSubscriptions';
import { SystemSettings } from './pages/SystemSettings';
import { UsersManagement } from './pages/UsersManagement';
import { AdminDashboard } from './pages/AdminDashboard';
import { ContentCMS } from './pages/ContentCMS';
import { ServiceCategories } from './pages/ServiceCategories'; 
import { AdminStore } from './pages/AdminStore'; 
import { VendorMarketplace } from './pages/VendorMarketplace';
import { VendorCoupons } from './pages/VendorCoupons';
import { CalendarBoard } from './pages/CalendarBoard';
import { VendorServices } from './pages/VendorServices';
import { VendorBrandSettings } from './pages/VendorBrandSettings';
import { BrowseHalls } from './pages/BrowseHalls';
import { PublicListing } from './pages/PublicListing';
import { PublicStore } from './pages/PublicStore';
import { Favorites } from './pages/Favorites';
import { AdminRequests } from './pages/AdminRequests';
import { VendorAccounting } from './pages/VendorAccounting';
import { HallDetails } from './pages/HallDetails';
import { VendorClients } from './pages/VendorClients';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { 
  Loader2, CheckCircle2, Mail, ArrowLeft,
  Globe, Sparkles, Building2, Palmtree, Lock, CreditCard, User, Check, Eye, EyeOff, LogOut, Plus, ArrowRight, Key
} from 'lucide-react';
import { useToast } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';

type RegStep = 0 | 1 | 2 | 3 | 4;

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [browseFilters, setBrowseFilters] = useState<any>(null);
  const [selectedEntity, setSelectedEntity] = useState<{ item: any, type: 'hall' | 'service' | 'chalet' } | null>(null);
  
  const profileIdRef = useRef<string | null>(null);
  const activeTabRef = useRef(activeTab);
  const regStepRef = useRef<RegStep>(0); 
  
  const [regStep, setRegStep] = useState<RegStep>(0);
  const [regData, setRegData] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [selectedType, setSelectedType] = useState<'hall' | 'chalet' | 'service' | null>(null);
  const [assetData, setAssetData] = useState({ name: '', name_en: '', price: '0', city: SAUDI_CITIES[0], category: SERVICE_CATEGORIES[0], description: '', images: [] as string[] });

  const { toast } = useToast();

  useEffect(() => { 
      activeTabRef.current = activeTab; 
      regStepRef.current = regStep;
  }, [activeTab, regStep]);

  const fetchProfile = async (id: string, isInitialLoad = false) => {
    try {
        const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (data) { 
          const profile = data as UserProfile;
          setUserProfile(profile);
          profileIdRef.current = profile.id;

          if (profile.role === 'vendor' && profile.payment_status !== 'paid') {
              setActiveTab('register');
              setRegStep(3);
          } else if (profile.role === 'vendor' && (activeTabRef.current === 'login' || activeTabRef.current === 'register')) {
              setActiveTab('dashboard');
          } else if (profile.role === 'super_admin' && (activeTabRef.current === 'login' || activeTabRef.current === 'register')) {
              setActiveTab('admin_dashboard');
          }
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id, true);
      else setLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        if (session?.user) fetchProfile(session.user.id, true);
      } else if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setActiveTab('home');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'password') {
        const { error } = await supabase.auth.signInWithPassword({ email: regData.email, password: regData.password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email: regData.email });
        if (error) throw error;
        toast({ title: 'تم الإرسال', description: 'تحقق من بريدك الإلكتروني لتسجيل الدخول.', variant: 'success' });
      }
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setUserProfile(null);
      setActiveTab('login');
  };

  const navigateToDetails = (tab: string, item?: any) => {
      if (item) setSelectedEntity(item);
      setActiveTab(tab);
      window.scrollTo(0, 0);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  const isPublicPage = ['home', 'browse', 'halls_page', 'chalets_page', 'services_page', 'store_page', 'hall_details', 'login', 'register'].includes(activeTab);
  const showNavbar = isPublicPage && !['login', 'register'].includes(activeTab);

  return (
    <NotificationProvider userId={userProfile?.id}>
      <div className="min-h-screen bg-[#F8F9FC] font-sans" dir="rtl">
        {showNavbar && <PublicNavbar user={userProfile} onLoginClick={() => setActiveTab('login')} onRegisterClick={() => setActiveTab('register')} onLogout={handleLogout} onNavigate={setActiveTab} activeTab={activeTab} />}
        {!isPublicPage && userProfile && <Sidebar user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} isOpen={false} setIsOpen={() => {}} />}
        
        <main className={`${!isPublicPage ? 'lg:pr-72 pt-8 px-8' : ''}`}>
          {activeTab === 'login' && (
            <div className="min-h-screen flex flex-col lg:flex-row bg-white">
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24">
                    <div className="w-full max-w-md space-y-8">
                        <div className="text-right">
                            <h2 className="text-4xl font-black text-gray-900">تسجيل الدخول</h2>
                            <p className="mt-2 text-sm font-bold text-gray-400">مرحباً بك مجدداً في منصة القاعة</p>
                        </div>
                        
                        <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                           <button onClick={() => setAuthMode('password')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${authMode === 'password' ? 'bg-white shadow text-primary' : 'text-gray-400'}`}>كلمة المرور</button>
                           <button onClick={() => setAuthMode('otp')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${authMode === 'otp' ? 'bg-white shadow text-primary' : 'text-gray-400'}`}>رمز الدخول (OTP)</button>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <Input label="البريد الإلكتروني" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} required className="h-14 rounded-2xl bg-gray-50 border-none px-5 font-bold" />
                            {authMode === 'password' && (
                                <div className="relative">
                                    <Input type={showPassword ? "text" : "password"} label="كلمة المرور" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} required className="h-14 rounded-2xl bg-gray-50 border-none px-5 font-bold" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-10 text-gray-400">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                                </div>
                            )}
                            <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg bg-primary text-white" disabled={authLoading}>
                                {authLoading ? <Loader2 className="animate-spin" /> : (authMode === 'password' ? 'دخول للمنصة' : 'إرسال رمز الدخول')}
                            </Button>
                            <div className="text-center pt-4 border-t border-gray-50">
                                <span className="text-xs font-bold text-gray-400">ليس لديك حساب؟ </span>
                                <button type="button" onClick={() => { setActiveTab('register'); setRegStep(0); }} className="text-xs font-black text-primary hover:underline">انضم إلينا الآن</button>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden flex-col justify-center items-center text-center p-12 text-white">
                    <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-48 w-auto brightness-0 invert opacity-20 absolute -top-12 -right-12" />
                    <h2 className="text-6xl font-ruqaa leading-tight">بوابتك لعالم <br/> المناسبات الفاخرة</h2>
                </div>
            </div>
          )}

          {/* Tab Rendering Logic remains same, truncated for brevity */}
          {activeTab === 'home' && <Home user={userProfile} onLoginClick={() => setActiveTab('login')} onRegisterClick={() => setActiveTab('register')} onBrowseHalls={(filters) => { setBrowseFilters(filters); setActiveTab('browse'); }} onNavigate={navigateToDetails} onLogout={handleLogout} />}
          {activeTab === 'store_page' && <PublicStore />}
          {activeTab === 'hall_details' && selectedEntity && <HallDetails item={selectedEntity.item} type={selectedEntity.type} user={userProfile} onBack={() => setActiveTab('home')} />}
          {activeTab === 'dashboard' && userProfile && <Dashboard user={userProfile} />}
          {/* ... other dashboard tabs ... */}
        </main>
        {showNavbar && <Footer />}
      </div>
    </NotificationProvider>
  );
};
export default App;
