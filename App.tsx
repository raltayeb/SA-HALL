
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile, VAT_RATE } from './types';
import { Sidebar } from './components/Layout/Sidebar';
import { PublicNavbar } from './components/Layout/PublicNavbar';
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
import { Favorites } from './pages/Favorites';
import { AdminRequests } from './pages/AdminRequests';
import { VendorAccounting } from './pages/VendorAccounting';
import { HallDetails } from './pages/HallDetails';
import { VendorClients } from './pages/VendorClients';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { 
  Loader2, X, Clock, AlertOctagon, User, Building2, 
  CreditCard, CheckCircle2, ShieldCheck, Mail, ArrowLeft, ArrowRight,
  Globe, Lock, Sparkles, LogIn
} from 'lucide-react';
import { useToast } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { PriceTag } from './components/ui/PriceTag';
import { formatCurrency } from './utils/currency';

// Steps: 0=Info, 1=OTP, 2=Plan, 3=Payment, 4=Success
type RegStep = 0 | 1 | 2 | 3 | 4;

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [browseFilters, setBrowseFilters] = useState<any>(null);
  const [selectedEntity, setSelectedEntity] = useState<{ item: any, type: 'hall' | 'service' } | null>(null);
  
  const profileIdRef = useRef<string | null>(null);
  const activeTabRef = useRef(activeTab);
  
  const [regStep, setRegStep] = useState<RegStep>(0);
  
  const [regData, setRegData] = useState({
    email: '',
    password: '',
    fullName: '',
    businessName: '',
    phone: '',
  });

  const [planData, setPlanData] = useState({
    halls: 1,
    services: 3
  });

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [otpCode, setOtpCode] = useState('');
  
  const [systemFees, setSystemFees] = useState({ hallFee: 500, serviceFee: 200 });
  const [hyperPayConfig, setHyperPayConfig] = useState({ enabled: false });
  const { toast } = useToast();

  const subtotal = (planData.halls * systemFees.hallFee) + (planData.services * systemFees.serviceFee);
  const vatAmount = subtotal * VAT_RATE;
  const totalAmount = subtotal + vatAmount;

  // Sync ref
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const fetchProfile = async (id: string, isInitialLoad = false) => {
    if (profileIdRef.current === id && !isInitialLoad) {
        setLoading(false);
        return;
    }

    try {
        const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (data) { 
          const profile = data as UserProfile;
          setUserProfile(profile);
          profileIdRef.current = profile.id;

          if (isInitialLoad) {
            const currentTab = activeTabRef.current;
            if (['home', 'browse', 'hall_details', 'login', 'register'].includes(currentTab)) {
               // Stay on public pages
            } else {
                if (profile.role === 'super_admin') setActiveTab('admin_dashboard');
                else if (profile.role === 'vendor' && profile.status === 'approved') setActiveTab('dashboard');
                else if (profile.role === 'user') setActiveTab('browse');
            }
          }
        }
    } catch (error) {
        console.error("Profile fetch error:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, true);
      } else {
        setLoading(false);
      }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) fetchProfile(session.user.id, event === 'SIGNED_IN');
      } else if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        profileIdRef.current = null;
        setLoading(false);
        setActiveTab('home');
      }
    });

    const fetchSystemSettings = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
      if (data?.value) {
        setSystemFees({
          hallFee: Number(data.value.hall_listing_fee) || 500,
          serviceFee: Number(data.value.service_listing_fee) || 200
        });
        if (data.value.payment_gateways) {
            setHyperPayConfig({ enabled: data.value.payment_gateways.hyperpay_enabled });
        }
      }
    };
    fetchSystemSettings();

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: regData.email, password: regData.password });
      if (error) throw error;
      // Success will trigger auth state change
    } catch (err: any) {
      toast({ title: 'خطأ في الدخول', description: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', variant: 'destructive' });
    } finally { setAuthLoading(false); }
  };

  // Improved Vendor Registration Flow
  const handleRegisterStep = async () => {
    setAuthLoading(true);
    try {
        if (regStep === 0) {
            if (!regData.fullName || !regData.email || !regData.password || !regData.businessName) {
                toast({ title: 'نقص بيانات', description: 'يرجى ملء كافة الحقول.', variant: 'destructive' });
                setAuthLoading(false);
                return;
            }
            
            const { error } = await supabase.auth.signUp({ 
                email: regData.email, 
                password: regData.password, 
                options: { 
                    data: { 
                        full_name: regData.fullName, 
                        business_name: regData.businessName,
                        phone: regData.phone,
                        role: 'vendor',
                        status: 'pending',
                        payment_status: 'unpaid'
                    } 
                } 
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    toast({ title: 'الحساب مسجل', description: 'البريد الإلكتروني مسجل مسبقاً، حاول تسجيل الدخول.', variant: 'warning' });
                } else {
                    toast({ title: 'فشل التسجيل', description: error.message, variant: 'destructive' });
                }
            } else {
                toast({ title: 'تم إنشاء الحساب', description: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.', variant: 'success' });
                setRegStep(1); 
            }

        } else if (regStep === 1) {
            if (!otpCode) {
                toast({ title: 'رمز مفقود', description: 'يرجى إدخال رمز التحقق.', variant: 'destructive' });
                setAuthLoading(false);
                return;
            }

            const { data, error } = await supabase.auth.verifyOtp({ email: regData.email, token: otpCode, type: 'signup' });
            
            if (error) {
                toast({ title: 'رمز غير صحيح', description: 'تأكد من الرمز وحاول مرة أخرى.', variant: 'destructive' });
            } else if (data.user) {
                toast({ title: 'تم التحقق', description: 'تم تفعيل البريد الإلكتروني بنجاح.', variant: 'success' });
                setRegStep(2); 
            }

        } else if (regStep === 2) {
            setRegStep(3); 

        } else if (regStep === 3) {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('User not found');

            if (paymentMethod === 'online') {
                await new Promise(r => setTimeout(r, 2000)); 
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    hall_limit: planData.halls,
                    service_limit: planData.services,
                    payment_status: paymentMethod === 'online' ? 'paid' : 'unpaid',
                    status: paymentMethod === 'online' ? 'approved' : 'pending',
                    subscription_plan: 'custom'
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            await supabase.from('notifications').insert([{
                user_id: user.id,
                title: 'اكتمال التسجيل',
                message: paymentMethod === 'online' ? 'تم الدفع وتفعيل الحساب بنجاح.' : 'تم استلام الطلب، بانتظار تحصيل الرسوم لتفعيل الحساب.',
                type: 'system'
            }]);

            setRegStep(4);
        }
    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
        setAuthLoading(false);
    }
  };

  const navigateToDetails = (tab: string, item?: any) => {
      if (item) setSelectedEntity(item);
      setActiveTab(tab);
      window.scrollTo(0, 0);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white flex-col gap-4">
      <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-20 w-auto animate-pulse" />
      <div className="text-xl font-ruqaa text-primary">القاعة</div>
    </div>
  );

  const isPublicPage = ['home', 'browse', 'hall_details', 'login', 'register'].includes(activeTab);

  return (
    <NotificationProvider userId={userProfile?.id}>
      <div className="min-h-screen bg-[#F8F9FC] text-gray-900 font-sans" dir="rtl">
        
        {/* Unified Public Navbar (Available on all public pages, including Login/Register) */}
        {isPublicPage && (
            <PublicNavbar 
                user={userProfile}
                onLoginClick={() => { setActiveTab('login'); window.scrollTo(0,0); }}
                onRegisterClick={() => { setActiveTab('register'); window.scrollTo(0,0); }}
                onLogout={() => { supabase.auth.signOut(); setActiveTab('home'); }}
                onNavigate={(tab) => {
                    if (tab === 'home') setActiveTab('home');
                    else if (tab === 'browse') { setBrowseFilters(null); setActiveTab('browse'); }
                    else if (tab === 'dashboard') setActiveTab('dashboard');
                    else if (tab === 'login') setActiveTab('login');
                    else if (tab === 'register') setActiveTab('register');
                }}
                activeTab={activeTab}
            />
        )}

        {/* Sidebar Navigation (Dashboard) */}
        {!isPublicPage && userProfile && (
          <Sidebar 
            user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} 
            onLogout={() => { supabase.auth.signOut(); setActiveTab('home'); }} isOpen={false} setIsOpen={() => {}}
            platformLogo={userProfile.role === 'vendor' ? userProfile.custom_logo_url : "https://dash.hall.sa/logo.svg"}
          />
        )}

        {/* Main Content Area */}
        <main className={`${!isPublicPage && userProfile ? 'lg:pr-[320px] pt-4 lg:pt-8 px-4 lg:px-8' : ''}`}>
          
          {/* ========== LOGIN PAGE ========== */}
          {activeTab === 'login' && (
            <div className="min-h-screen pt-20 flex flex-col lg:flex-row bg-white">
                {/* Right Column: Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 animate-in slide-in-from-right-4 duration-500">
                    <div className="w-full max-w-md space-y-8">
                        <div className="text-center lg:text-right">
                            <h2 className="text-3xl font-black text-gray-900">تسجيل الدخول</h2>
                            <p className="mt-2 text-sm font-bold text-gray-500">مرحباً بعودتك! الرجاء إدخال بياناتك للمتابعة.</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-6">
                            <Input type="email" label="البريد الإلكتروني" placeholder="name@example.com" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} required className="h-14 rounded-2xl bg-gray-50 border-none px-5 font-bold focus:ring-2 focus:ring-primary/20" />
                            <Input type="password" label="كلمة المرور" placeholder="••••••••" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} required className="h-14 rounded-2xl bg-gray-50 border-none px-5 font-bold focus:ring-2 focus:ring-primary/20" />
                            
                            <div className="flex justify-between items-center text-xs font-bold">
                                <label className="flex items-center gap-2 cursor-pointer text-gray-500">
                                    <input type="checkbox" className="accent-primary rounded" /> تذكرني
                                </label>
                                <a href="#" className="text-primary hover:underline">نسيت كلمة المرور؟</a>
                            </div>

                            <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform" disabled={authLoading}>
                                {authLoading ? <Loader2 className="animate-spin" /> : 'دخول للمنصة'}
                            </Button>
                            
                            <div className="text-center pt-4">
                                <span className="text-xs font-bold text-gray-400">ليس لديك حساب؟ </span>
                                <button type="button" onClick={() => { setActiveTab('register'); window.scrollTo(0,0); }} className="text-xs font-black text-primary hover:underline">انضم كشريك الآن</button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Left Column: Brand (Hidden on mobile) */}
                <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden flex-col justify-center items-center text-center p-12 text-white">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
                    
                    <div className="relative z-10 space-y-10 max-w-lg">
                        <div className="w-40 h-40 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/30 shadow-2xl">
                            <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-24 w-auto brightness-0 invert" />
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-5xl font-ruqaa leading-tight">بوابتك لعالم <br/> المناسبات الفاخرة</h2>
                            <p className="text-white/80 font-bold text-xl leading-relaxed">
                                سجل دخولك لإدارة حجوزاتك، متابعة عملائك، والوصول لأدوات التحكم المتقدمة.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* ========== REGISTER PAGE ========== */}
          {activeTab === 'register' && (
            <div className="min-h-screen pt-20 flex flex-col lg:flex-row bg-white">
                {/* Right Column: Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 animate-in slide-in-from-right-4 duration-500">
                    <div className="w-full max-w-md space-y-8">
                        <div className="text-center lg:text-right">
                            <h2 className="text-3xl font-black text-gray-900">انضم كشريك نجاح</h2>
                            <p className="mt-2 text-sm font-bold text-gray-500">سجل منشأتك وابدأ في استقبال الحجوزات اليوم.</p>
                        </div>

                        {/* Stepper */}
                        {regStep < 4 && (
                          <div className="flex justify-between items-center px-2 relative mb-8">
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 -z-10"></div>
                            {[{i:0, label: 'البيانات'}, {i:1, label: 'التحقق'}, {i:2, label: 'الباقة'}, {i:3, label: 'الدفع'}].map(step => (
                              <div key={step.i} className={`flex flex-col items-center gap-1 ${regStep >= step.i ? 'text-primary' : 'text-gray-300'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${regStep >= step.i ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200'}`}>
                                    {regStep > step.i ? <CheckCircle2 className="w-4 h-4" /> : step.i + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Step 0: Basic Info */}
                        {regStep === 0 && (
                          <div className="space-y-4 animate-in slide-in-from-right-4">
                             <div className="grid grid-cols-2 gap-4">
                                <Input placeholder="الاسم الكامل" value={regData.fullName} onChange={e => setRegData({...regData, fullName: e.target.value})} className="h-12 rounded-xl" />
                                <Input placeholder="اسم النشاط التجاري" value={regData.businessName} onChange={e => setRegData({...regData, businessName: e.target.value})} className="h-12 rounded-xl" />
                             </div>
                             <Input placeholder="رقم الجوال (05xxxxxxxx)" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} className="h-12 rounded-xl" />
                             <Input type="email" placeholder="البريد الإلكتروني" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} className="h-12 rounded-xl" />
                             <Input type="password" placeholder="كلمة المرور" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} className="h-12 rounded-xl" />
                             <div className="flex justify-between items-center pt-4">
                                <button onClick={() => { setActiveTab('login'); window.scrollTo(0,0); }} className="text-xs font-bold text-gray-400 hover:text-primary">لدي حساب بالفعل</button>
                                <Button onClick={handleRegisterStep} disabled={authLoading} className="px-8 rounded-xl font-bold h-12 shadow-lg shadow-primary/20">
                                    {authLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <>التالي <ArrowLeft className="w-4 h-4 mr-2" /></>}
                                </Button>
                             </div>
                          </div>
                        )}

                        {/* Step 1: OTP Verification */}
                        {regStep === 1 && (
                          <div className="space-y-6 animate-in slide-in-from-right-4 text-center">
                            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto text-primary">
                                <Mail className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black">تحقق من بريدك</h3>
                                <p className="text-sm text-gray-500 font-bold">تم إرسال رمز التفعيل إلى {regData.email}</p>
                            </div>
                            <Input 
                                placeholder="أدخل الرمز (6 أرقام)" 
                                className="text-center text-3xl tracking-[0.5em] font-black h-20 rounded-3xl border-2 focus:border-primary" 
                                maxLength={6} 
                                value={otpCode} 
                                onChange={e => setOtpCode(e.target.value)} 
                            />
                            <Button onClick={handleRegisterStep} disabled={authLoading} className="w-full h-14 rounded-2xl font-bold shadow-xl shadow-primary/20 text-lg">
                                {authLoading ? <Loader2 className="animate-spin" /> : 'تفعيل الحساب'}
                            </Button>
                          </div>
                        )}

                        {/* Step 2: Plan */}
                        {regStep === 2 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div className="text-center mb-4"><h4 className="font-black text-xl">صمم باقتك</h4><p className="text-gray-400 font-bold text-sm">ادفع فقط مقابل ما تحتاج</p></div>
                                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-[2rem] border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white rounded-xl border shadow-sm text-primary"><Building2 className="w-6 h-6" /></div>
                                        <div className="text-right"><p className="font-bold text-base">عدد القاعات</p><p className="text-xs text-gray-400 font-bold">{systemFees.hallFee} ر.س / قاعة</p></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setPlanData(p => ({...p, halls: Math.max(1, p.halls - 1)}))} className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center font-bold text-lg hover:bg-gray-100 transition-colors">-</button>
                                        <span className="font-black w-6 text-center text-lg">{planData.halls}</span>
                                        <button onClick={() => setPlanData(p => ({...p, halls: p.halls + 1}))} className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg hover:bg-primary/90 transition-colors">+</button>
                                    </div>
                                </div>
                                <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 flex justify-between items-center">
                                    <span className="font-bold text-base">الإجمالي التقديري</span>
                                    <PriceTag amount={totalAmount} className="text-2xl text-primary" />
                                </div>
                                <Button onClick={handleRegisterStep} className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20">التالي <ArrowLeft className="w-5 h-5 mr-2" /></Button>
                            </div>
                        )}

                        {/* Step 3: Payment */}
                        {regStep === 3 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div className="text-center mb-4"><h4 className="font-black text-xl">اختر طريقة الدفع</h4></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setPaymentMethod('online')} className={`h-32 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-3 transition-all ${paymentMethod === 'online' ? 'border-primary bg-primary/5 text-primary shadow-lg ring-2 ring-primary/20' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                                        <Globe className="w-8 h-8" /> <span className="text-sm font-black">أونلاين</span>
                                    </button>
                                    <button onClick={() => setPaymentMethod('cash')} className={`h-32 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-3 transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary shadow-lg ring-2 ring-primary/20' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                                        <Building2 className="w-8 h-8" /> <span className="text-sm font-black">تحويل / كاش</span>
                                    </button>
                                </div>
                                <Button onClick={handleRegisterStep} disabled={authLoading} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 mt-4">
                                    {authLoading ? <Loader2 className="animate-spin" /> : 'تأكيد ودفع'}
                                </Button>
                            </div>
                        )}

                        {/* Step 4: Success */}
                        {regStep === 4 && (
                          <div className="text-center space-y-8 animate-in zoom-in-95 py-10">
                             <div className="w-32 h-32 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-xl"><CheckCircle2 className="w-16 h-16" /></div>
                             <div className="space-y-2">
                                <h3 className="text-3xl font-black text-gray-900">تم التسجيل بنجاح!</h3>
                                <p className="text-base text-gray-500 font-bold max-w-xs mx-auto">شكراً لانضمامك إلينا. حسابك الآن قيد التفعيل، يمكنك البدء بإعداد ملفك.</p>
                             </div>
                             <Button onClick={() => { fetchProfile((userProfile?.id || ''), true); }} className="px-12 h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">الدخول للوحة التحكم</Button>
                          </div>
                        )}
                    </div>
                </div>

                {/* Left Column: Brand */}
                <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden flex-col justify-center items-center text-center p-12 text-white">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
                    
                    <div className="relative z-10 space-y-10 max-w-lg">
                        <div className="w-40 h-40 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/30 shadow-2xl">
                            <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-24 w-auto brightness-0 invert" />
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-5xl font-ruqaa leading-tight">انضم لنخبة قاعات <br/> المملكة العربية السعودية</h2>
                            <p className="text-white/80 font-bold text-xl leading-relaxed">
                                منصة متكاملة لإدارة الحجوزات، التسويق، والوصول لأكبر شريحة من العملاء الباحثين عن التميز.
                            </p>
                        </div>
                        <div className="flex justify-center gap-8 pt-8">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20"><Sparkles className="w-8 h-8" /></div>
                                <span className="text-xs font-black uppercase tracking-widest">فخامة</span>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20"><ShieldCheck className="w-8 h-8" /></div>
                                <span className="text-xs font-black uppercase tracking-widest">أمان</span>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20"><Globe className="w-8 h-8" /></div>
                                <span className="text-xs font-black uppercase tracking-widest">انتشار</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* Other Pages */}
          {activeTab === 'home' && (
            <Home 
              user={userProfile} onLoginClick={() => { setActiveTab('login'); window.scrollTo(0,0); }}
              onRegisterClick={() => { setActiveTab('register'); window.scrollTo(0,0); }}
              onBrowseHalls={(filters) => { setBrowseFilters(filters); setActiveTab('browse'); }} 
              onNavigate={navigateToDetails} onLogout={() => { supabase.auth.signOut(); setActiveTab('home'); }}
            />
          )}

          {activeTab === 'browse' && (
            <BrowseHalls 
              user={userProfile} 
              mode="halls"
              onBack={() => setActiveTab('home')}
              onNavigate={navigateToDetails}
              initialFilters={browseFilters}
            />
          )}

          {activeTab === 'hall_details' && selectedEntity && (
            <HallDetails
                item={selectedEntity.item}
                type={selectedEntity.type}
                user={userProfile}
                onBack={() => setActiveTab('home')}
            />
          )}

          {/* Dashboard Routes */}
          {activeTab !== 'home' && activeTab !== 'browse' && activeTab !== 'hall_details' && activeTab !== 'login' && activeTab !== 'register' && (
            <div className="mx-auto w-full max-w-[1600px]">
              {activeTab === 'dashboard' && userProfile && <Dashboard user={userProfile} />}
              {activeTab === 'my_halls' && userProfile && <VendorHalls user={userProfile} />}
              {activeTab === 'my_services' && userProfile && <VendorServices user={userProfile} />}
              {activeTab === 'calendar' && userProfile && <CalendarBoard user={userProfile} />}
              {activeTab === 'hall_bookings' && userProfile && <Bookings user={userProfile} />}
              {activeTab === 'vendor_marketplace' && userProfile && <VendorMarketplace user={userProfile} />}
              {activeTab === 'coupons' && userProfile && <VendorCoupons user={userProfile} />}
              {activeTab === 'accounting' && userProfile && <VendorAccounting user={userProfile} />}
              {activeTab === 'brand_settings' && userProfile && <VendorBrandSettings user={userProfile} onUpdate={() => fetchProfile(userProfile.id)} />}
              {activeTab === 'my_favorites' && userProfile && <Favorites user={userProfile} />}
              {activeTab === 'my_bookings' && userProfile && <Bookings user={userProfile} />}
              {activeTab === 'my_clients' && userProfile && <VendorClients user={userProfile} />}
              {activeTab === 'admin_dashboard' && userProfile?.role === 'super_admin' && <AdminDashboard />}
              {activeTab === 'admin_users' && userProfile?.role === 'super_admin' && <UsersManagement />}
              {activeTab === 'admin_requests' && userProfile?.role === 'super_admin' && <AdminRequests />}
              {activeTab === 'admin_categories' && userProfile?.role === 'super_admin' && <ServiceCategories />}
              {activeTab === 'admin_cms' && userProfile?.role === 'super_admin' && <ContentCMS />}
              {activeTab === 'admin_store' && userProfile?.role === 'super_admin' && <AdminStore user={userProfile} />}
              {activeTab === 'subscriptions' && userProfile?.role === 'super_admin' && <VendorSubscriptions />}
              {activeTab === 'settings' && userProfile?.role === 'super_admin' && <SystemSettings />}
            </div>
          )}
        </main>
      </div>
    </NotificationProvider>
  );
};

export default App;
