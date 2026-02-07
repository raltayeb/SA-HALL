
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile, VAT_RATE, SAUDI_CITIES, HALL_AMENITIES, SERVICE_CATEGORIES } from './types';
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
  Loader2, CheckCircle2, Mail, ArrowLeft,
  Globe, Sparkles, Building2, Palmtree, Lock, CreditCard, User, Check, Eye, EyeOff, LogOut
} from 'lucide-react';
import { useToast } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { PriceTag } from './components/ui/PriceTag';

// Registration Steps: 
// 0: Info -> 1: OTP -> 2: Password -> 3: Welcome Selection -> 4: Setup & Pay
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
  const regStepRef = useRef<RegStep>(0); // Ref to track step inside callbacks
  
  // Registration State
  const [regStep, setRegStep] = useState<RegStep>(0);
  const [regData, setRegData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
  });
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Visibility Toggle
  
  // Selection & Asset Setup State
  const [selectedType, setSelectedType] = useState<'hall' | 'chalet' | 'service' | null>(null);
  const [assetData, setAssetData] = useState({
    name: '',
    price: '',
    city: SAUDI_CITIES[0],
    category: SERVICE_CATEGORIES[0],
    description: ''
  });
  const [paymentData, setPaymentData] = useState({
    number: '',
    expiry: '',
    cvc: '',
    holder: ''
  });

  const [systemFees, setSystemFees] = useState({ hallFee: 500, serviceFee: 200 });
  const { toast } = useToast();

  // Password Validation
  const passValidations = {
    length: regData.password.length >= 8,
    match: regData.password && regData.password === regData.confirmPassword,
    filled: regData.password.length > 0
  };

  useEffect(() => { 
      activeTabRef.current = activeTab; 
      regStepRef.current = regStep;
  }, [activeTab, regStep]);

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

          // --- STRICT ONBOARDING GATE ---
          // Prevent redirecting if user is currently in the middle of registration flow (Step 1 or 2)
          // This fixes the issue where verifying OTP (Step 1 -> 2) triggers a profile fetch that jumps to Step 3.
          if (activeTabRef.current === 'register' && regStepRef.current > 0 && regStepRef.current < 3) {
              setLoading(false);
              return;
          }

          // Check if vendor has fully completed setup (Paid & Added Asset)
          if (profile.role === 'vendor') {
             const [ { count: hallCount }, { count: serviceCount } ] = await Promise.all([
                supabase.from('halls').select('*', { count: 'exact', head: true }).eq('vendor_id', profile.id),
                supabase.from('services').select('*', { count: 'exact', head: true }).eq('vendor_id', profile.id)
             ]);
             
             // If no assets or payment not confirmed -> FORCE REGISTRATION FLOW (Step 3: Welcome)
             if ((hallCount === 0 && serviceCount === 0) || profile.payment_status !== 'paid') {
                 setActiveTab('register');
                 setRegStep(3); // Force to "Welcome/Selection" screen
                 setLoading(false);
                 return; // Stop execution here, don't allow dashboard access
             }
          }

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

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: regData.email, password: regData.password });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: 'خطأ في الدخول', description: 'البيانات غير صحيحة.', variant: 'destructive' });
    } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      window.location.reload();
  };

  // --- NEW REGISTRATION FLOW ---

  const sendOtp = async () => {
    if (!regData.fullName || !regData.email || !regData.phone) {
        toast({ title: 'بيانات ناقصة', description: 'يرجى تعبئة جميع الحقول.', variant: 'destructive' });
        return;
    }
    setAuthLoading(true);
    
    const { error } = await supabase.auth.signInWithOtp({ 
        email: regData.email,
        options: {
            data: {
                full_name: regData.fullName,
                phone: regData.phone,
                role: 'vendor'
            }
        }
    });

    if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
        toast({ title: 'تم الإرسال', description: 'راجع بريدك الإلكتروني للحصول على الكود.', variant: 'success' });
        setRegStep(1);
    }
    setAuthLoading(false);
  };

  const verifyOtp = async () => {
    if (!otpCode) return;
    setAuthLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: regData.email, token: otpCode, type: 'magiclink' }); 
    
    if (error) {
       // Allow verifying signup specifically 
       const { error: signUpError } = await supabase.auth.verifyOtp({ email: regData.email, token: otpCode, type: 'signup' });
       if (signUpError) {
           toast({ title: 'كود خاطئ', description: 'تأكد من الكود وحاول مرة أخرى', variant: 'destructive' });
           setAuthLoading(false);
           return;
       }
    }
    
    // Move to Step 2 (Password Creation) immediately
    setRegStep(2);
    setAuthLoading(false);
  };

  const setPassword = async () => {
    if (!passValidations.match || !passValidations.length) {
        toast({ title: 'خطأ', description: 'كلمة المرور غير مطابقة للشروط.', variant: 'destructive' });
        return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.updateUser({ password: regData.password });
    
    if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
        // Ensure profile exists/updated
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
            await supabase.from('profiles').upsert({
                id: user.id,
                email: regData.email,
                full_name: regData.fullName,
                business_name: regData.fullName, // Default business name to Full Name initially
                phone_number: regData.phone,
                role: 'vendor',
                status: 'pending'
            });
        }
        setRegStep(3); // Go to Welcome Selection ONLY after password is set
    }
    setAuthLoading(false);
  };

  const handleAssetSetupAndPay = async () => {
    setAuthLoading(true);
    try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("No user");

        // 1. Simulate Payment
        await new Promise(r => setTimeout(r, 1500));

        // 2. Insert Asset based on selection
        if (selectedType === 'hall' || selectedType === 'chalet') {
            await supabase.from('halls').insert([{
                vendor_id: user.id,
                name: assetData.name,
                price_per_night: Number(assetData.price),
                city: assetData.city,
                type: selectedType === 'chalet' ? 'chalet' : 'hall',
                description: assetData.description,
                is_active: true
            }]);
        } else if (selectedType === 'service') {
            await supabase.from('services').insert([{
                vendor_id: user.id,
                name: assetData.name,
                price: Number(assetData.price),
                category: assetData.category,
                description: assetData.description,
                is_active: true
            }]);
        }

        // 3. Update Profile status to approved (since paid) & set limits
        await supabase.from('profiles').update({
            status: 'approved',
            payment_status: 'paid',
            business_name: assetData.name, // Update business name to the asset name
            hall_limit: selectedType === 'service' ? 0 : 1, 
            service_limit: selectedType === 'service' ? 1 : 0
        }).eq('id', user.id);

        toast({ title: 'تم بنجاح', description: 'تم تفعيل حسابك وإضافة الخدمة.', variant: 'success' });
        
        // Reload to enter dashboard
        window.location.reload(); 

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
  
  // Is the user "locked" in onboarding?
  const isLocked = userProfile?.role === 'vendor' && userProfile?.payment_status !== 'paid' && activeTab === 'register';

  return (
    <NotificationProvider userId={userProfile?.id}>
      <div className="min-h-screen bg-[#F8F9FC] text-gray-900 font-sans" dir="rtl">
        
        {/* Navbar - Hide if user is locked in onboarding */}
        {isPublicPage && !isLocked && (
            <PublicNavbar 
                user={userProfile}
                onLoginClick={() => { setActiveTab('login'); window.scrollTo(0,0); }}
                onRegisterClick={() => { setActiveTab('register'); setRegStep(0); window.scrollTo(0,0); }}
                onLogout={handleLogout}
                onNavigate={(tab) => {
                    if (tab === 'home') setActiveTab('home');
                    else if (tab === 'browse') { setBrowseFilters(null); setActiveTab('browse'); }
                    else if (tab === 'dashboard') setActiveTab('dashboard');
                    else if (tab === 'login') setActiveTab('login');
                    else if (tab === 'register') { setActiveTab('register'); setRegStep(0); }
                }}
                activeTab={activeTab}
            />
        )}

        {/* Dashboard Sidebar */}
        {!isPublicPage && userProfile && !isLocked && (
          <Sidebar 
            user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} 
            onLogout={handleLogout} isOpen={false} setIsOpen={() => {}}
            platformLogo={userProfile.role === 'vendor' ? userProfile.custom_logo_url : "https://dash.hall.sa/logo.svg"}
          />
        )}

        <main className={`${!isPublicPage && userProfile && !isLocked ? 'lg:pr-[320px] pt-4 lg:pt-8 px-4 lg:px-8' : ''}`}>
          
          {/* LOGIN PAGE */}
          {activeTab === 'login' && (
            <div className="min-h-screen pt-20 flex flex-col lg:flex-row bg-white">
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 animate-in slide-in-from-right-4 duration-500">
                    <div className="w-full max-w-md space-y-8">
                        <div className="text-center lg:text-right">
                            <h2 className="text-3xl font-black text-gray-900">تسجيل الدخول</h2>
                            <p className="mt-2 text-sm font-bold text-gray-500">مرحباً بعودتك! الرجاء إدخال بياناتك للمتابعة.</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-6">
                            <Input type="email" label="البريد الإلكتروني" placeholder="name@example.com" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} required className="h-14 rounded-2xl bg-gray-50 border-none px-5 font-bold focus:ring-2 focus:ring-primary/20" />
                            
                            <div className="relative">
                                <Input 
                                    type={showPassword ? "text" : "password"} 
                                    label="كلمة المرور" 
                                    placeholder="••••••••" 
                                    value={regData.password} 
                                    onChange={e => setRegData({...regData, password: e.target.value})} 
                                    required 
                                    className="h-14 rounded-2xl bg-gray-50 border-none px-5 font-bold focus:ring-2 focus:ring-primary/20" 
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-10 text-gray-400 hover:text-primary transition-colors">
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            
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
                                <button type="button" onClick={() => { setActiveTab('register'); setRegStep(0); window.scrollTo(0,0); }} className="text-xs font-black text-primary hover:underline">انضم كشريك الآن</button>
                            </div>
                        </form>
                    </div>
                </div>
                {/* Unified Left Brand Column */}
                <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden flex-col justify-center items-center text-center p-12 text-white">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
                    
                    <div className="relative z-10 space-y-12 max-w-xl">
                        <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-64 w-auto mx-auto brightness-0 invert drop-shadow-xl hover:scale-105 transition-transform duration-500" />
                        <div className="space-y-6">
                            <h2 className="text-6xl font-ruqaa leading-tight">بوابتك لعالم <br/> المناسبات الفاخرة</h2>
                            <p className="text-white/90 font-bold text-2xl leading-relaxed">
                                سجل دخولك لإدارة حجوزاتك، متابعة عملائك، والوصول لأدوات التحكم المتقدمة.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* REGISTER PAGE */}
          {activeTab === 'register' && (
            <div className="min-h-screen pt-20 flex flex-col lg:flex-row bg-white">
                {regStep < 3 ? (
                    <>
                    <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24">
                        <div className="w-full max-w-md space-y-8">
                            <div className="text-center lg:text-right">
                                <h2 className="text-3xl font-black text-gray-900">انضم كشريك نجاح</h2>
                                <p className="mt-2 text-sm font-bold text-gray-500">سجل منشأتك وابدأ في استقبال الحجوزات اليوم.</p>
                            </div>

                            {/* Step 0: Basic Info (Business Name Removed) */}
                            {regStep === 0 && (
                            <div className="space-y-4 animate-in slide-in-from-right-8 duration-500">
                                <Input placeholder="الاسم الكامل" value={regData.fullName} onChange={e => setRegData({...regData, fullName: e.target.value})} className="h-14 rounded-2xl font-bold" />
                                <Input placeholder="رقم الجوال (05xxxxxxxx)" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} className="h-14 rounded-2xl font-bold" />
                                <Input type="email" placeholder="البريد الإلكتروني" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} className="h-14 rounded-2xl font-bold" />
                                
                                <Button onClick={sendOtp} disabled={authLoading} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 mt-4">
                                    {authLoading ? <Loader2 className="animate-spin" /> : 'تسجيل ومتابعة'}
                                </Button>
                                
                                <div className="flex justify-center pt-4">
                                    <button onClick={() => { setActiveTab('login'); window.scrollTo(0,0); }} className="text-xs font-bold text-gray-400 hover:text-primary">لدي حساب بالفعل</button>
                                </div>
                            </div>
                            )}

                            {/* Step 1: OTP */}
                            {regStep === 1 && (
                            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 text-center">
                                <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto text-primary relative">
                                    <Mail className="w-10 h-10" />
                                    <div className="absolute -top-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-xs">🔔</div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black">رمز التحقق</h3>
                                    <p className="text-sm text-gray-500 font-bold">أدخل الكود المرسل إلى {regData.email}</p>
                                </div>
                                <Input 
                                    placeholder="0 0 0 0 0 0" 
                                    className="text-center text-3xl tracking-[0.5em] font-black h-20 rounded-3xl border-2 focus:border-primary transition-all" 
                                    maxLength={6} 
                                    value={otpCode} 
                                    onChange={e => setOtpCode(e.target.value)} 
                                />
                                <Button onClick={verifyOtp} disabled={authLoading} className="w-full h-14 rounded-2xl font-bold shadow-xl shadow-primary/20 text-lg">
                                    {authLoading ? <Loader2 className="animate-spin" /> : 'تحقق'}
                                </Button>
                                <button onClick={() => setRegStep(0)} className="text-xs font-bold text-gray-400 hover:text-primary mt-4">تغيير البريد الإلكتروني</button>
                            </div>
                            )}

                            {/* Step 2: Password (Mandatory) */}
                            {regStep === 2 && (
                            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto text-primary"><Lock className="w-8 h-8" /></div>
                                    <h3 className="text-xl font-black">تأمين الحساب</h3>
                                    <p className="text-sm text-gray-500 font-bold">قم بإنشاء كلمة مرور قوية لحماية حسابك</p>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Input type={showPassword ? "text" : "password"} placeholder="كلمة المرور الجديدة" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} className="h-14 rounded-2xl font-bold" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-4 text-gray-400 hover:text-primary transition-colors">
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <Input type={showPassword ? "text" : "password"} placeholder="تأكيد كلمة المرور" value={regData.confirmPassword} onChange={e => setRegData({...regData, confirmPassword: e.target.value})} className="h-14 rounded-2xl font-bold" />
                                </div>

                                {/* Password Rules Animation */}
                                <div className="flex gap-2 justify-center text-[10px] font-bold">
                                    <span className={`px-3 py-1 rounded-full transition-all duration-300 ${passValidations.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>8 خانات على الأقل</span>
                                    <span className={`px-3 py-1 rounded-full transition-all duration-300 ${passValidations.match && passValidations.filled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>تطابق الكلمتين</span>
                                </div>

                                <Button onClick={setPassword} disabled={authLoading || !passValidations.length || !passValidations.match} className="w-full h-14 rounded-2xl font-bold shadow-xl shadow-primary/20 text-lg">
                                    {authLoading ? <Loader2 className="animate-spin" /> : 'إنشاء الحساب ومتابعة'}
                                </Button>
                            </div>
                            )}
                        </div>
                    </div>
                    {/* Unified Left Brand Column (Exact copy of Login to match 100%) */}
                    <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden flex-col justify-center items-center text-center p-12 text-white">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
                        
                        <div className="relative z-10 space-y-12 max-w-xl">
                            <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-64 w-auto mx-auto brightness-0 invert drop-shadow-xl hover:scale-105 transition-transform duration-500" />
                            <div className="space-y-6">
                                <h2 className="text-6xl font-ruqaa leading-tight">بوابتك لعالم <br/> المناسبات الفاخرة</h2>
                                <p className="text-white/90 font-bold text-2xl leading-relaxed">
                                    سجل دخولك لإدارة حجوزاتك، متابعة عملائك، والوصول لأدوات التحكم المتقدمة.
                                </p>
                            </div>
                        </div>
                    </div>
                    </>
                ) : regStep === 3 ? (
                    // WELCOME SELECTION SCREEN (LOCKED UNTIL PAID)
                    <div className="w-full flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-700 relative overflow-hidden">
                        
                        {/* Logout for Locked State */}
                        <div className="absolute top-6 left-6 z-50">
                           <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors">
                              <LogOut className="w-4 h-4" /> تسجيل الخروج
                           </Button>
                        </div>

                        <div className="absolute top-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
                        
                        <div className="text-center space-y-6 max-w-4xl z-10">
                            {/* Bigger Logo as requested */}
                            <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-56 w-auto mx-auto mb-10 drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
                            
                            <h1 className="text-6xl font-ruqaa text-primary leading-tight">مرحباً ألف</h1>
                            <p className="text-xl text-gray-500 font-bold max-w-lg mx-auto">سعداء بانضمامك لعائلتنا. يجب اختيار نوع نشاطك وتفعيل الاشتراك للوصول إلى المنصة.</p>
                            
                            <div className="grid md:grid-cols-3 gap-8 mt-12">
                                <button onClick={() => { setSelectedType('hall'); setRegStep(4); }} className="group bg-white border-2 border-gray-100 hover:border-primary rounded-[3rem] p-8 flex flex-col items-center gap-6 hover:shadow-2xl transition-all duration-300 w-full md:w-64">
                                    <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><Building2 className="w-10 h-10" /></div>
                                    <div className="text-center"><h3 className="text-xl font-black text-gray-800">إضافة قاعة</h3><p className="text-xs text-gray-400 mt-2 font-bold">لقصور الأفراح والمناسبات</p></div>
                                </button>
                                <button onClick={() => { setSelectedType('chalet'); setRegStep(4); }} className="group bg-white border-2 border-gray-100 hover:border-primary rounded-[3rem] p-8 flex flex-col items-center gap-6 hover:shadow-2xl transition-all duration-300 w-full md:w-64">
                                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform"><Palmtree className="w-10 h-10" /></div>
                                    <div className="text-center"><h3 className="text-xl font-black text-gray-800">إضافة شاليه</h3><p className="text-xs text-gray-400 mt-2 font-bold">للمنتجعات والاستراحات</p></div>
                                </button>
                                <button onClick={() => { setSelectedType('service'); setRegStep(4); }} className="group bg-white border-2 border-gray-100 hover:border-primary rounded-[3rem] p-8 flex flex-col items-center gap-6 hover:shadow-2xl transition-all duration-300 w-full md:w-64">
                                    <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform"><Sparkles className="w-10 h-10" /></div>
                                    <div className="text-center"><h3 className="text-xl font-black text-gray-800">إضافة خدمة</h3><p className="text-xs text-gray-400 mt-2 font-bold">للضيافة والتجهيزات</p></div>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // SETUP & PAY SCREEN (Step 4)
                    <div className="w-full flex items-center justify-center p-4 bg-gray-50">
                        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8 duration-500">
                            
                            {/* Column 1: Personal Info */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm h-fit">
                                <h3 className="text-lg font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><User className="w-5 h-5" /> البيانات الشخصية</h3>
                                <div className="space-y-4 opacity-70 pointer-events-none">
                                    <Input label="الاسم" value={regData.fullName} readOnly className="bg-gray-50 border-none font-bold" />
                                    <Input label="البريد" value={regData.email} readOnly className="bg-gray-50 border-none font-bold" />
                                    <Input label="الجوال" value={regData.phone} readOnly className="bg-gray-50 border-none font-bold" />
                                </div>
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl">
                                        <CheckCircle2 className="w-5 h-5" /> <span className="text-xs font-bold">تم التحقق من الحساب</span>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Asset Info */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm h-fit">
                                <h3 className="text-lg font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    {selectedType === 'service' ? <Sparkles className="w-5 h-5" /> : <Building2 className="w-5 h-5" />} 
                                    بيانات {selectedType === 'hall' ? 'القاعة' : selectedType === 'chalet' ? 'الشاليه' : 'الخدمة'}
                                </h3>
                                <div className="space-y-4">
                                    <Input label="الاسم التجاري" placeholder="مثال: قاعة الملوك" value={assetData.name} onChange={e => setAssetData({...assetData, name: e.target.value})} className="h-12 rounded-xl font-bold" />
                                    {selectedType === 'service' ? (
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500">التصنيف</label>
                                            <select className="w-full h-12 border rounded-xl px-4 font-bold bg-white" value={assetData.category} onChange={e => setAssetData({...assetData, category: e.target.value})}>
                                                {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500">المدينة</label>
                                            <select className="w-full h-12 border rounded-xl px-4 font-bold bg-white" value={assetData.city} onChange={e => setAssetData({...assetData, city: e.target.value})}>
                                                {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <Input label="السعر المبدئي" type="number" value={assetData.price} onChange={e => setAssetData({...assetData, price: e.target.value})} className="h-12 rounded-xl font-bold" />
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500">نبذة مختصرة</label>
                                        <textarea className="w-full h-24 border rounded-xl p-3 font-bold text-sm resize-none" placeholder="وصف يجذب العملاء..." value={assetData.description} onChange={e => setAssetData({...assetData, description: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* Column 3: Payment */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl h-fit border-t-4 border-t-primary">
                                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> إتمام الاشتراك</h3>
                                
                                <div className="bg-gray-50 p-6 rounded-2xl mb-6 space-y-4 border border-gray-100">
                                    <div className="flex justify-between text-sm font-bold text-gray-500">
                                        <span>رسوم التسجيل</span>
                                        <span>{selectedType === 'service' ? systemFees.serviceFee : systemFees.hallFee} ر.س</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold text-gray-500">
                                        <span>الضريبة (15%)</span>
                                        <span>{(selectedType === 'service' ? systemFees.serviceFee : systemFees.hallFee) * 0.15} ر.س</span>
                                    </div>
                                    <div className="flex justify-between text-xl font-black text-primary border-t border-gray-200 pt-4">
                                        <span>الإجمالي</span>
                                        <span>{(selectedType === 'service' ? systemFees.serviceFee : systemFees.hallFee) * 1.15} ر.س</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Input placeholder="اسم حامل البطاقة" value={paymentData.holder} onChange={e => setPaymentData({...paymentData, holder: e.target.value})} className="h-12 rounded-xl font-bold" />
                                    <Input placeholder="رقم البطاقة" value={paymentData.number} onChange={e => setPaymentData({...paymentData, number: e.target.value})} className="h-12 rounded-xl font-bold font-mono text-left" dir="ltr" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input placeholder="MM/YY" value={paymentData.expiry} onChange={e => setPaymentData({...paymentData, expiry: e.target.value})} className="h-12 rounded-xl font-bold font-mono text-center" />
                                        <Input placeholder="CVC" value={paymentData.cvc} onChange={e => setPaymentData({...paymentData, cvc: e.target.value})} className="h-12 rounded-xl font-bold font-mono text-center" />
                                    </div>
                                </div>

                                <Button onClick={handleAssetSetupAndPay} disabled={authLoading || !assetData.name || !assetData.price} className="w-full h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 mt-8 bg-primary text-white hover:scale-[1.02] transition-transform">
                                    {authLoading ? <Loader2 className="animate-spin" /> : 'دفع وتفعيل الحساب'}
                                </Button>
                                <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-gray-400 font-bold">
                                    <Lock className="w-3 h-3" /> مدفوعات آمنة ومشفرة 100%
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
          )}

          {/* Other Pages */}
          {activeTab === 'home' && (
            <Home 
              user={userProfile} onLoginClick={() => { setActiveTab('login'); window.scrollTo(0,0); }}
              onRegisterClick={() => { setActiveTab('register'); setRegStep(0); window.scrollTo(0,0); }}
              onBrowseHalls={(filters) => { setBrowseFilters(filters); setActiveTab('browse'); }} 
              onNavigate={navigateToDetails} onLogout={handleLogout}
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

          {/* Dashboard Routes - ONLY VISIBLE IF NOT LOCKED */}
          {!isLocked && activeTab !== 'home' && activeTab !== 'browse' && activeTab !== 'hall_details' && activeTab !== 'login' && activeTab !== 'register' && (
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
