
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile, VAT_RATE, SAUDI_CITIES, HALL_AMENITIES, SERVICE_CATEGORIES } from './types';
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
  Globe, Sparkles, Building2, Palmtree, Lock, CreditCard, User, Check, Eye, EyeOff, LogOut, Plus, ArrowRight
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
  const regStepRef = useRef<RegStep>(0); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const [showPassword, setShowPassword] = useState(false);
  
  // Selection & Asset Setup State
  const [selectedType, setSelectedType] = useState<'hall' | 'chalet' | 'service' | null>(null);
  const [assetData, setAssetData] = useState({
    name: '',
    name_en: '',
    price: '0', 
    city: SAUDI_CITIES[0],
    category: SERVICE_CATEGORIES[0],
    description: '',
    description_en: '',
    capacity_men: '',
    capacity_women: '',
    images: [] as string[]
  });
  const [paymentData, setPaymentData] = useState({
    number: '',
    expiry: '',
    cvc: '',
    holder: ''
  });

  const [systemFees, setSystemFees] = useState({ hallFee: 500, serviceFee: 200 });
  const { toast } = useToast();

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

          if (activeTabRef.current === 'register' && regStepRef.current > 0 && regStepRef.current < 3) {
              setLoading(false);
              return;
          }

          if (profile.role === 'vendor') {
             const [ { count: hallCount }, { count: serviceCount } ] = await Promise.all([
                supabase.from('halls').select('*', { count: 'exact', head: true }).eq('vendor_id', profile.id),
                supabase.from('services').select('*', { count: 'exact', head: true }).eq('vendor_id', profile.id)
             ]);
             
             if (((hallCount === 0 && serviceCount === 0) || profile.payment_status !== 'paid') && regStepRef.current !== 4) {
                 setActiveTab('register');
                 setRegStep(3);
                 setLoading(false);
                 return;
             }
          }

          if (isInitialLoad) {
            const currentTab = activeTabRef.current;
            if (['home', 'browse', 'halls_page', 'chalets_page', 'services_page', 'store_page', 'hall_details', 'login', 'register'].includes(currentTab)) {
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

  const sendOtp = async () => {
    if (!regData.fullName || !regData.email || !regData.phone) {
        toast({ title: 'بيانات ناقصة', description: 'يرجى تعبئة جميع الحقول.', variant: 'destructive' });
        return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ 
        email: regData.email,
        options: { data: { full_name: regData.fullName, phone: regData.phone, role: 'vendor' } }
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
    const { error } = await supabase.auth.verifyOtp({ email: regData.email, token: otpCode, type: 'magiclink' }); 
    if (error) {
       const { error: signUpError } = await supabase.auth.verifyOtp({ email: regData.email, token: otpCode, type: 'signup' });
       if (signUpError) {
           toast({ title: 'كود خاطئ', description: 'تأكد من الكود وحاول مرة أخرى', variant: 'destructive' });
           setAuthLoading(false);
           return;
       }
    }
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
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
            await supabase.from('profiles').upsert({
                id: user.id,
                email: regData.email,
                full_name: regData.fullName,
                business_name: regData.fullName,
                phone_number: regData.phone,
                role: 'vendor',
                status: 'pending'
            });
        }
        setRegStep(3);
    }
    setAuthLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if(!user) return;
      const file = files[0];
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('hall-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('hall-images').getPublicUrl(fileName);
      setAssetData(prev => ({ ...prev, images: [...prev.images, publicUrl] }));
      toast({ title: 'تم الرفع', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  const handleAssetSetupAndPay = async () => {
    if (!assetData.name) {
        toast({ title: 'بيانات ناقصة', description: 'يرجى إكمال الحقول الأساسية.', variant: 'destructive' });
        return;
    }
    setAuthLoading(true);
    try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("No user");

        await new Promise(r => setTimeout(r, 1500));

        if (selectedType === 'hall' || selectedType === 'chalet') {
            const totalCapacity = (Number(assetData.capacity_men) || 0) + (Number(assetData.capacity_women) || 0);
            await supabase.from('halls').insert([{
                vendor_id: user.id,
                name: assetData.name,
                name_en: assetData.name_en,
                price_per_night: 0,
                city: assetData.city,
                type: selectedType === 'chalet' ? 'chalet' : 'hall',
                description: assetData.description,
                description_en: assetData.description_en,
                capacity: totalCapacity,
                capacity_men: Number(assetData.capacity_men),
                capacity_women: Number(assetData.capacity_women),
                image_url: assetData.images[0] || '',
                images: assetData.images,
                is_active: true
            }]);
        } else if (selectedType === 'service') {
            await supabase.from('services').insert([{
                vendor_id: user.id,
                name: assetData.name,
                price: 0,
                category: assetData.category,
                description: assetData.description,
                image_url: assetData.images[0] || '',
                is_active: true
            }]);
        }

        await supabase.from('profiles').update({
            status: 'approved',
            payment_status: 'paid',
            business_name: assetData.name,
            hall_limit: selectedType === 'service' ? 0 : 1, 
            service_limit: selectedType === 'service' ? 1 : 0
        }).eq('id', user.id);

        toast({ title: 'تم بنجاح', description: 'تم تفعيل حسابك وإضافة الخدمة.', variant: 'success' });
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

  const isPublicPage = ['home', 'browse', 'halls_page', 'chalets_page', 'services_page', 'store_page', 'hall_details', 'login', 'register'].includes(activeTab);
  const isLocked = userProfile?.role === 'vendor' && userProfile?.payment_status !== 'paid' && activeTab === 'register';
  const showNavbar = isPublicPage || (activeTab === 'register' && regStep >= 3);

  const displayEmail = userProfile?.email || regData.email;
  const displayName = userProfile?.full_name || regData.fullName;
  const displayPhone = userProfile?.phone_number || regData.phone;
  const assetLabel = selectedType === 'service' ? 'الخدمة' : selectedType === 'chalet' ? 'الشاليه' : 'القاعة';

  return (
    <NotificationProvider userId={userProfile?.id}>
      <div className="min-h-screen bg-[#F8F9FC] text-gray-900 font-sans" dir="rtl">
        {showNavbar && (
            <PublicNavbar 
                user={userProfile}
                onLoginClick={() => { setActiveTab('login'); window.scrollTo(0,0); }}
                onRegisterClick={() => { setActiveTab('register'); setRegStep(0); window.scrollTo(0,0); }}
                onLogout={handleLogout}
                onNavigate={(tab) => {
                    if (['home', 'browse', 'dashboard', 'login', 'halls_page', 'chalets_page', 'services_page', 'store_page'].includes(tab)) {
                        setActiveTab(tab);
                        window.scrollTo(0,0);
                    } else if (tab === 'register') { 
                        setActiveTab('register'); 
                        setRegStep(0); 
                    }
                }}
                activeTab={activeTab}
            />
        )}

        {!isPublicPage && userProfile && !isLocked && (
          <Sidebar 
            user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} 
            onLogout={handleLogout} isOpen={false} setIsOpen={() => {}}
            platformLogo={userProfile.role === 'vendor' ? userProfile.custom_logo_url : "https://dash.hall.sa/logo.svg"}
          />
        )}

        <main className={`${!isPublicPage && userProfile && !isLocked ? 'lg:pr-[320px] pt-4 lg:pt-8 px-4 lg:px-8' : ''}`}>
          {activeTab === 'login' && (
            <div className="min-h-screen pt-20 flex flex-col lg:flex-row bg-white">
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 animate-in slide-in-from-right-4 duration-500">
                    <div className="w-full max-w-md space-y-8">
                        <div className="text-center lg:text-right">
                            <h2 className="text-3xl font-black text-gray-900">تسجيل الدخول</h2>
                            <p className="mt-2 text-sm font-bold text-gray-500">مرحباً بعودتك! الرجاء إدخال بياناتك للمتابعة.</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-6">
                            <Input type="email" label="البريد الإلكتروني" placeholder="name@example.com" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} required className="h-14 rounded-2xl bg-gray-50 border-none px-5 font-bold" />
                            <div className="relative">
                                <Input type={showPassword ? "text" : "password"} label="كلمة المرور" placeholder="••••••••" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} required className="h-14 rounded-2xl bg-gray-50 border-none px-5 font-bold" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-10 text-gray-400 hover:text-primary transition-colors">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" disabled={authLoading}>
                                {authLoading ? <Loader2 className="animate-spin" /> : 'دخول للمنصة'}
                            </Button>
                            <div className="text-center pt-4">
                                <span className="text-xs font-bold text-gray-400">ليس لديك حساب؟ </span>
                                <button type="button" onClick={() => { setActiveTab('register'); setRegStep(0); window.scrollTo(0,0); }} className="text-xs font-black text-primary hover:underline">انضم كشريك الآن</button>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden flex-col justify-center items-center text-center p-12 text-white">
                    <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-64 w-auto mx-auto brightness-0 invert drop-shadow-xl" />
                    <div className="space-y-6 relative z-10">
                        <h2 className="text-6xl font-ruqaa leading-tight">بوابتك لعالم <br/> المناسبات الفاخرة</h2>
                    </div>
                </div>
            </div>
          )}

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
                            {regStep === 0 && (
                            <div className="space-y-4 animate-in slide-in-from-right-8 duration-500">
                                <Input placeholder="الاسم الكامل" value={regData.fullName} onChange={e => setRegData({...regData, fullName: e.target.value})} className="h-14 rounded-2xl font-bold" />
                                <Input placeholder="رقم الجوال (05xxxxxxxx)" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} className="h-14 rounded-2xl font-bold" />
                                <Input type="email" placeholder="البريد الإلكتروني" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} className="h-14 rounded-2xl font-bold" />
                                <Button onClick={sendOtp} disabled={authLoading} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 mt-4">{authLoading ? <Loader2 className="animate-spin" /> : 'تسجيل ومتابعة'}</Button>
                            </div>
                            )}
                            {regStep === 1 && (
                            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 text-center">
                                <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto text-primary"><Mail className="w-10 h-10" /></div>
                                <h3 className="text-xl font-black">رمز التحقق</h3>
                                <Input placeholder="0 0 0 0 0 0" className="text-center text-3xl tracking-[0.5em] font-black h-20 rounded-3xl border-2" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value)} />
                                <Button onClick={verifyOtp} disabled={authLoading} className="w-full h-14 rounded-2xl font-bold">تحقق</Button>
                            </div>
                            )}
                            {regStep === 2 && (
                            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                                <h3 className="text-xl font-black text-center">تأمين الحساب</h3>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Input type={showPassword ? "text" : "password"} placeholder="كلمة المرور الجديدة" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} className="h-14 rounded-2xl font-bold" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-4 text-gray-400">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                                    </div>
                                    <Input type={showPassword ? "text" : "password"} placeholder="تأكيد كلمة المرور" value={regData.confirmPassword} onChange={e => setRegData({...regData, confirmPassword: e.target.value})} className="h-14 rounded-2xl font-bold" />
                                </div>
                                <Button onClick={setPassword} disabled={authLoading || !passValidations.length || !passValidations.match} className="w-full h-14 rounded-2xl font-bold">إنشاء الحساب ومتابعة</Button>
                            </div>
                            )}
                        </div>
                    </div>
                    <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden flex-col justify-center items-center text-center p-12 text-white">
                        <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-64 w-auto mx-auto brightness-0 invert drop-shadow-xl" />
                    </div>
                    </>
                ) : regStep === 3 ? (
                    <div className="w-full flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-700">
                        <div className="text-center space-y-6 max-w-4xl">
                            <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-56 w-auto mx-auto mb-10 drop-shadow-2xl" />
                            <h1 className="text-6xl font-ruqaa text-primary">مرحباً ألف</h1>
                            <p className="text-xl text-gray-500 font-bold max-w-lg mx-auto">سعداء بانضمامك لعائلتنا. يجب اختيار نوع نشاطك وتفعيل الاشتراك للوصول إلى المنصة.</p>
                            <div className="grid md:grid-cols-3 gap-8 mt-12">
                                <button onClick={() => { setSelectedType('hall'); setRegStep(4); }} className="group bg-white border-2 border-gray-100 hover:border-primary rounded-[3rem] p-8 flex flex-col items-center gap-6 hover:shadow-2xl transition-all w-full md:w-64">
                                    <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><Building2 className="w-10 h-10" /></div>
                                    <div className="text-center"><h3 className="text-xl font-black text-gray-800">إضافة قاعة</h3></div>
                                </button>
                                <button onClick={() => { setSelectedType('chalet'); setRegStep(4); }} className="group bg-white border-2 border-gray-100 hover:border-primary rounded-[3rem] p-8 flex flex-col items-center gap-6 hover:shadow-2xl transition-all w-full md:w-64">
                                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform"><Palmtree className="w-10 h-10" /></div>
                                    <div className="text-center"><h3 className="text-xl font-black text-gray-800">إضافة شاليه</h3></div>
                                </button>
                                <button onClick={() => { setSelectedType('service'); setRegStep(4); }} className="group bg-white border-2 border-gray-100 hover:border-primary rounded-[3rem] p-8 flex flex-col items-center gap-6 hover:shadow-2xl transition-all w-full md:w-64">
                                    <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform"><Sparkles className="w-10 h-10" /></div>
                                    <div className="text-center"><h3 className="text-xl font-black text-gray-800">إضافة خدمة</h3></div>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full flex items-center justify-center p-4 bg-gray-50/50">
                        <div className="max-w-4xl w-full flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-500 pb-20 mt-24">
                            <div className="flex justify-between items-center px-2">
                                <h2 className="text-3xl font-black text-primary">إضافة {assetLabel}</h2>
                                <Button variant="outline" onClick={() => setRegStep(3)} className="gap-2 h-12 rounded-xl"><ArrowRight className="w-4 h-4" /> تغيير النشاط</Button>
                            </div>
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                                <h3 className="text-lg font-black text-primary mb-6 text-right">معلومات المالك</h3>
                                <div className="space-y-4 text-right">
                                    <Input label="الاسم" value={displayName} readOnly className="bg-gray-50 border-gray-100 font-bold text-gray-500 cursor-not-allowed" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="رقم الهاتف" value={displayPhone} readOnly className="bg-gray-50 border-gray-100 font-bold text-gray-500 text-left cursor-not-allowed" dir="ltr" />
                                        <Input label="البريد الالكتروني" value={displayEmail} readOnly className="bg-gray-50 border-gray-100 font-bold text-gray-500 text-left cursor-not-allowed" dir="ltr" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                                <h3 className="text-lg font-black text-primary mb-6 text-right">معلومات {assetLabel} الأساسية</h3>
                                <div className="space-y-4 text-right">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label={`اسم ${assetLabel} | بالعربي`} value={assetData.name} onChange={e => setAssetData({...assetData, name: e.target.value})} className="h-12 rounded-xl border-gray-200 font-bold" />
                                        <Input label={`اسم ${assetLabel} | بالانجليزي`} value={assetData.name_en} onChange={e => setAssetData({...assetData, name_en: e.target.value})} className="h-12 rounded-xl border-gray-200 font-bold text-left" dir="ltr" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500">المدينة</label>
                                            <select className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-white outline-none text-right font-bold appearance-none" value={assetData.city} onChange={e => setAssetData({...assetData, city: e.target.value})}>
                                                {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        {selectedType === 'service' ? (
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500">تصنيف الخدمة</label>
                                                <select className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-white outline-none text-right font-bold" value={assetData.category} onChange={e => setAssetData({...assetData, category: e.target.value})}>
                                                    {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        ) : <div className="hidden md:block"></div>}
                                    </div>
                                    {selectedType !== 'service' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="عدد النساء" type="number" value={assetData.capacity_women} onChange={e => setAssetData({...assetData, capacity_women: e.target.value})} className="h-12 rounded-xl border-gray-200 font-bold" />
                                            <Input label="عدد الرجال" type="number" value={assetData.capacity_men} onChange={e => setAssetData({...assetData, capacity_men: e.target.value})} className="h-12 rounded-xl border-gray-200 font-bold" />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500">الوصف | بالعربي</label>
                                            <textarea className="w-full h-32 border border-gray-200 rounded-xl p-3 bg-white outline-none text-right resize-none font-bold text-sm" value={assetData.description} onChange={e => setAssetData({...assetData, description: e.target.value})} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500">الوصف | بالانجليزي</label>
                                            <textarea className="w-full h-32 border border-gray-200 rounded-xl p-3 bg-white outline-none text-left resize-none font-bold text-sm" dir="ltr" value={assetData.description_en} onChange={e => setAssetData({...assetData, description_en: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                                <h3 className="text-lg font-black text-primary mb-6 text-right">المرفقات</h3>
                                <div className="flex justify-end">
                                    <div onClick={() => fileInputRef.current?.click()} className="w-40 h-40 rounded-xl bg-purple-50 border-2 border-dashed border-purple-200 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-100 group transition-all">
                                        <Plus className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-bold text-primary mt-2">إضافة صور</span>
                                    </div>
                                    <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                                </div>
                                {assetData.images.length > 0 && (
                                    <div className="flex gap-4 mt-4 justify-end flex-wrap">
                                        {assetData.images.map((img, i) => <img key={i} src={img} className="w-20 h-20 rounded-lg object-cover border" />)}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => setRegStep(3)} className="h-12 px-8 rounded-2xl font-bold border-2">رجوع</Button>
                                <Button onClick={handleAssetSetupAndPay} disabled={authLoading || !assetData.name} className="flex-1 h-12 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">الدفع والمتابعة</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          )}

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

          {activeTab === 'halls_page' && <PublicListing type="hall" title="قاعات المناسبات" subtitle="تصفح أرقى القاعات لحفلات الزفاف والمناسبات الخاصة" onNavigate={navigateToDetails} />}
          {activeTab === 'chalets_page' && <PublicListing type="chalet" title="الشاليهات والمنتجعات" subtitle="أماكن استثنائية للاستجمام والفعاليات الخارجية" onNavigate={navigateToDetails} />}
          {activeTab === 'services_page' && <PublicListing type="service" title="خدمات المناسبات" subtitle="كل ما تحتاجه لإكمال فرحتك من ضيافة وتصوير وتجهيزات" onNavigate={navigateToDetails} />}
          {activeTab === 'store_page' && <PublicStore />}

          {activeTab === 'hall_details' && selectedEntity && (
            <HallDetails
                item={selectedEntity.item}
                type={selectedEntity.type}
                user={userProfile}
                onBack={() => setActiveTab('home')}
            />
          )}

          {!isLocked && activeTab !== 'home' && activeTab !== 'browse' && !activeTab.endsWith('_page') && activeTab !== 'hall_details' && activeTab !== 'login' && activeTab !== 'register' && (
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
        {isPublicPage && <Footer />}
      </div>
    </NotificationProvider>
  );
};

export default App;
