
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile, VAT_RATE, SAUDI_CITIES, HALL_AMENITIES, SERVICE_CATEGORIES, Hall } from './types';
import { Sidebar } from './components/Layout/Sidebar';
import { PublicNavbar } from './components/Layout/PublicNavbar';
import { Footer } from './components/Layout/Footer';
import { Dashboard } from './pages/Dashboard';
import { VendorHalls } from './pages/VendorHalls';
import { VendorChalets } from './pages/VendorChalets';
import { Bookings } from './pages/Bookings';
import { Home } from './pages/Home';
import { VendorSubscriptions } from './pages/VendorSubscriptions';
import { SystemSettings } from './pages/SystemSettings';
import { UsersManagement } from './pages/UsersManagement';
import { AdminDashboard } from './pages/AdminDashboard';
import { ContentCMS } from './pages/ContentCMS';
import { ServiceCategories } from './pages/ServiceCategories'; 
import { AdminStore } from './pages/AdminStore'; 
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
import { ChaletDetails } from './pages/ChaletDetails';
import { ServiceDetails } from './pages/ServiceDetails';
import { GuestLogin } from './pages/GuestLogin'; 
import { GuestPortal } from './pages/GuestPortal'; 
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { 
  Loader2, CheckCircle2, Mail, ArrowLeft,
  Globe, Sparkles, Building2, Palmtree, Lock, CreditCard, User, Check, Eye, EyeOff, LogOut, Plus, ArrowRight
} from 'lucide-react';
import { useToast } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';

type RegStep = 0 | 1 | 2 | 3 | 4;

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [browseFilters, setBrowseFilters] = useState<any>(null);
  const [selectedEntity, setSelectedEntity] = useState<{ item: any, type: 'hall' | 'service' | 'chalet' } | null>(null);
  
  const profileIdRef = useRef<string | null>(null);
  const activeTabRef = useRef(activeTab);
  const regStepRef = useRef<RegStep>(0); 
  
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

  const fetchProfile = async (id: string, forceRedirect = false) => {
    if (profileIdRef.current === id && userProfile) {
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
             
             if ((hallCount || 0) > 0 || (serviceCount || 0) > 0) {
                 const isPublicOrAuthPage = ['home', 'login', 'register', 'guest_login'].includes(activeTabRef.current);
                 if (forceRedirect || isPublicOrAuthPage) {
                     setActiveTab('dashboard');
                 }
             } else {
                 if (regStepRef.current !== 4) {
                     setActiveTab('register');
                     setRegStep(3);
                 }
             }
          }

          if (forceRedirect) {
            const currentTab = activeTabRef.current;
            const isPublicPage = ['home', 'browse_halls', 'browse_chalets', 'halls_page', 'chalets_page', 'services_page', 'store_page', 'hall_details', 'login', 'register', 'guest_login'].includes(currentTab);
            
            if (profile.role === 'super_admin' && (isPublicPage || currentTab === 'home')) {
                setActiveTab('admin_dashboard');
            } else if (profile.role === 'user') {
                setActiveTab('guest_dashboard');
            } else if (profile.role === 'vendor' && currentTab === 'guest_login') {
                setActiveTab('dashboard');
            }
          }
        } else {
             const user = (await supabase.auth.getUser()).data.user;
             if(user) {
                 const newProfile = {
                     id: user.id,
                     email: user.email!,
                     full_name: 'ضيف',
                     role: 'user' as const,
                     status: 'approved' as const,
                     is_enabled: true,
                     hall_limit: 0,
                     service_limit: 0
                 };
                 setUserProfile(newProfile);
                 setActiveTab('guest_dashboard');
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
        if (session?.user) {
            if (profileIdRef.current !== session.user.id) {
                fetchProfile(session.user.id, true);
            }
        }
      } else if (event === 'SIGNED_OUT') {
        if (!session) {
            setUserProfile(null);
            profileIdRef.current = null;
            setLoading(false);
            setActiveTab('login');
        }
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
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        setUserProfile(null);
        profileIdRef.current = null;
        setActiveTab('login');
      }
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

  const navbarActiveTab = useMemo(() => {
    if (activeTab === 'hall_details' && selectedEntity) {
        if (selectedEntity.type === 'service') return 'services_page';
        const hallItem = selectedEntity.item as Hall;
        if (hallItem.type === 'chalet' || hallItem.type === 'resort') return 'chalets_page';
        return 'halls_page';
    }
    return activeTab;
  }, [activeTab, selectedEntity]);

  const isPublicPage = ['home', 'browse_halls', 'browse_chalets', 'halls_page', 'chalets_page', 'services_page', 'store_page', 'hall_details', 'login', 'register', 'guest_login'].includes(activeTab);
  const isGuestPortal = activeTab === 'guest_dashboard';
  const isLocked = userProfile?.role === 'vendor' && userProfile?.payment_status !== 'paid' && activeTab === 'register';
  const isAuthPage = ['login', 'register', 'guest_login'].includes(activeTab);
  const showNavbar = isPublicPage && !isAuthPage && !isGuestPortal;

  // Logic to show sidebar: Must be authenticated, NOT a public page, NOT locked, and NOT the guest portal
  const showSidebar = !isPublicPage && !isGuestPortal && userProfile && !isLocked;

  const renderContent = () => {
    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-white flex-col gap-4">
          <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-20 w-auto animate-pulse" />
          <div className="text-xl font-ruqaa text-primary">القاعة</div>
        </div>
    );

    if (activeTab === 'guest_login') return <GuestLogin onBack={() => { setActiveTab('home'); }} />;

    if (activeTab === 'login') return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 animate-in slide-in-from-right-4 duration-500">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-right">
                        <h2 className="text-3xl font-black text-gray-900">تسجيل الدخول</h2>
                        <p className="mt-2 text-sm font-bold text-gray-500">مرحباً بعودتك! الرجاء إدخال بياناتك للمتابعة.</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <Input 
                            type="email" 
                            label="البريد الإلكتروني" 
                            placeholder="name@example.com" 
                            value={regData.email} 
                            onChange={e => setRegData({...regData, email: e.target.value})} 
                            required 
                            className="h-16 bg-gray-50 border-2 border-gray-100 focus:border-primary focus:bg-white rounded-2xl px-6 font-bold text-lg transition-all outline-none" 
                        />
                        <div className="relative">
                            <Input 
                                type={showPassword ? "text" : "password"} 
                                label="كلمة المرور" 
                                placeholder="••••••••" 
                                value={regData.password} 
                                onChange={e => setRegData({...regData, password: e.target.value})} 
                                required 
                                className="h-16 bg-gray-50 border-2 border-gray-100 focus:border-primary focus:bg-white rounded-2xl px-6 font-bold text-lg transition-all outline-none" 
                            />
                            {/* Corrected position: top-[3.5rem] aligns centered in input area below label */}
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-6 top-[3.5rem] text-gray-400 hover:text-primary transition-colors">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                        </div>
                        <Button type="submit" className="w-full h-16 rounded-2xl font-black text-xl bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95 shadow-none" disabled={authLoading}>
                            {authLoading ? <Loader2 className="animate-spin" /> : 'دخول للمنصة'}
                        </Button>
                        
                        <div className="text-center space-y-2 pt-4">
                            <div>
                                <span className="text-xs font-bold text-gray-400">حجزت سابقاً؟ </span>
                                <button type="button" onClick={() => { setActiveTab('guest_login'); window.scrollTo(0,0); }} className="text-xs font-black text-primary hover:underline">دخول الضيوف</button>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-gray-400">ليس لديك حساب؟ </span>
                                <button type="button" onClick={() => { setActiveTab('register'); setRegStep(0); window.scrollTo(0,0); }} className="text-xs font-black text-primary hover:underline">انضم كشريك الآن</button>
                            </div>
                        </div>
                        <div className="text-center">
                            <button type="button" onClick={() => { setActiveTab('home'); window.scrollTo(0,0); }} className="text-xs font-bold text-gray-400 hover:text-gray-600">العودة للرئيسية</button>
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
    );

    if (activeTab === 'register') return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">
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
                            <Input placeholder="الاسم الكامل" value={regData.fullName} onChange={e => setRegData({...regData, fullName: e.target.value})} className="h-16 bg-gray-50 border-2 border-gray-100 focus:border-primary focus:bg-white rounded-2xl px-6 font-bold text-lg transition-all outline-none" />
                            <Input placeholder="رقم الجوال (05xxxxxxxx)" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} className="h-16 bg-gray-50 border-2 border-gray-100 focus:border-primary focus:bg-white rounded-2xl px-6 font-bold text-lg transition-all outline-none" />
                            <Input type="email" placeholder="البريد الإلكتروني" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} className="h-16 bg-gray-50 border-2 border-gray-100 focus:border-primary focus:bg-white rounded-2xl px-6 font-bold text-lg transition-all outline-none" />
                            <Button onClick={sendOtp} disabled={authLoading} className="w-full h-16 rounded-2xl font-black text-xl bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95 shadow-none mt-4">{authLoading ? <Loader2 className="animate-spin" /> : 'تسجيل ومتابعة'}</Button>
                            
                            <div className="text-center pt-4 space-y-2">
                                <div>
                                    <span className="text-xs font-bold text-gray-400">لديك حساب بالفعل؟ </span>
                                    <button type="button" onClick={() => { setActiveTab('login'); window.scrollTo(0,0); }} className="text-xs font-black text-primary hover:underline">سجل دخول</button>
                                </div>
                                <button type="button" onClick={() => { setActiveTab('home'); window.scrollTo(0,0); }} className="text-xs font-bold text-gray-400 hover:text-gray-600">العودة للرئيسية</button>
                            </div>
                        </div>
                        )}
                        {regStep === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 text-center">
                            <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto text-primary"><Mail className="w-10 h-10" /></div>
                            <h3 className="text-xl font-black">رمز التحقق</h3>
                            <Input placeholder="0 0 0 0 0 0" className="text-center text-3xl tracking-[0.5em] font-black h-20 rounded-3xl border-2 border-gray-100 focus:border-primary outline-none transition-all shadow-none" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value)} />
                            <Button onClick={verifyOtp} disabled={authLoading} className="w-full h-16 rounded-2xl font-black text-xl bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95 shadow-none">تحقق</Button>
                        </div>
                        )}
                        {regStep === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                            <h3 className="text-xl font-black text-center">تأمين الحساب</h3>
                            <div className="space-y-4">
                                <div className="relative">
                                    <Input type={showPassword ? "text" : "password"} placeholder="كلمة المرور الجديدة" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} className="h-16 bg-gray-50 border-2 border-gray-100 focus:border-primary focus:bg-white rounded-2xl px-6 font-bold text-lg transition-all outline-none" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-6 top-6 text-gray-400">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                                </div>
                                <Input type={showPassword ? "text" : "password"} placeholder="تأكيد كلمة المرور" value={regData.confirmPassword} onChange={e => setRegData({...regData, confirmPassword: e.target.value})} className="h-16 bg-gray-50 border-2 border-gray-100 focus:border-primary focus:bg-white rounded-2xl px-6 font-bold text-lg transition-all outline-none" />
                            </div>
                            <Button onClick={setPassword} disabled={authLoading || !passValidations.length || !passValidations.match} className="w-full h-16 rounded-2xl font-black text-xl bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95 shadow-none">إنشاء الحساب ومتابعة</Button>
                        </div>
                        )}
                    </div>
                </div>
                <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden flex-col justify-center items-center text-center p-12 text-white">
                    <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-64 w-auto mx-auto brightness-0 invert drop-shadow-xl" />
                </div>
                </>
            ) : regStep === 3 ? (
                <div className="w-full flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-700 min-h-screen">
                    <div className="text-center space-y-6 max-w-4xl relative">
                        <button onClick={handleLogout} className="absolute top-0 left-0 text-red-500 font-bold hover:underline flex items-center gap-2">
                            <LogOut className="w-4 h-4" /> تسجيل خروج
                        </button>
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
                    <div className="max-w-4xl w-full flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-500 pb-20">
                        <div className="flex justify-between items-center px-2">
                            <h2 className="text-3xl font-black text-primary">إضافة {selectedType === 'service' ? 'الخدمة' : 'المكان'}</h2>
                            <Button variant="outline" onClick={() => setRegStep(3)} className="gap-2 h-12 rounded-xl"><ArrowRight className="w-4 h-4" /> تغيير النشاط</Button>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-black text-primary mb-6 text-right">معلومات أساسية</h3>
                            <Input label="الاسم" value={assetData.name} onChange={e => setAssetData({...assetData, name: e.target.value})} className="h-16 bg-gray-50 border-2 border-gray-100 focus:border-primary focus:bg-white rounded-2xl px-6 font-bold text-lg transition-all outline-none" />
                        </div>
                        <Button onClick={handleAssetSetupAndPay} disabled={authLoading || !assetData.name} className="flex-1 h-16 rounded-2xl font-black text-xl bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95 shadow-none">الدفع والمتابعة</Button>
                    </div>
                </div>
            )}
        </div>
    );

    if (activeTab === 'home') return (
        <Home 
          user={userProfile} onLoginClick={() => { setActiveTab('login'); window.scrollTo(0,0); }}
          onRegisterClick={() => { setActiveTab('register'); setRegStep(0); window.scrollTo(0,0); }}
          onBrowseHalls={(filters) => { setBrowseFilters(filters); setActiveTab('browse_halls'); }} 
          onNavigate={navigateToDetails} onLogout={handleLogout}
        />
    );

    if (activeTab === 'browse_halls') return (
        <BrowseHalls user={userProfile} entityType="hall" onBack={() => setActiveTab('home')} onNavigate={navigateToDetails} initialFilters={browseFilters} />
    );

    if (activeTab === 'browse_chalets') return (
        <BrowseHalls user={userProfile} entityType="chalet" onBack={() => setActiveTab('home')} onNavigate={navigateToDetails} initialFilters={browseFilters} />
    );

    if (activeTab === 'browse_services') return (
        <BrowseHalls user={userProfile} entityType="service" onBack={() => setActiveTab('home')} onNavigate={navigateToDetails} initialFilters={browseFilters} />
    );

    // Consolidated Routing for Public Pages
    if (activeTab === 'halls_page') return <BrowseHalls user={userProfile} entityType="hall" onBack={() => setActiveTab('home')} onNavigate={navigateToDetails} />;
    if (activeTab === 'chalets_page') return <BrowseHalls user={userProfile} entityType="chalet" onBack={() => setActiveTab('home')} onNavigate={navigateToDetails} />;
    if (activeTab === 'services_page') return <BrowseHalls user={userProfile} entityType="service" onBack={() => setActiveTab('home')} onNavigate={navigateToDetails} />;
    
    if (activeTab === 'store_page') return <PublicStore />;

    // Conditional Rendering based on Entity Type
    if (activeTab === 'hall_details' && selectedEntity) {
        const handleBack = () => {
            const hallItem = selectedEntity.item as Hall;
            if (selectedEntity.type === 'service') setActiveTab('services_page');
            else if (selectedEntity.type === 'chalet' || hallItem.type === 'chalet' || hallItem.type === 'resort') setActiveTab('chalets_page');
            else setActiveTab('halls_page');
            window.scrollTo(0, 0);
        };

        if (selectedEntity.type === 'chalet' || (selectedEntity.item.type && ['chalet', 'resort'].includes(selectedEntity.item.type))) {
            return <ChaletDetails item={selectedEntity.item} user={userProfile} onBack={handleBack} />;
        }
        if (selectedEntity.type === 'service') {
            return <ServiceDetails item={selectedEntity.item} user={userProfile} onBack={handleBack} />;
        }
        return <HallDetails item={selectedEntity.item} user={userProfile} type={selectedEntity.type} onBack={handleBack} />;
    }

    if (activeTab === 'guest_dashboard' && userProfile) {
        return <GuestPortal user={userProfile} onLogout={handleLogout} />;
    }

    if (!isLocked && userProfile) {
        return (
            <div className="mx-auto w-full max-w-[1600px] lg:pr-[320px] pt-4 lg:pt-8 px-4 lg:px-8">
                {activeTab === 'dashboard' && <Dashboard user={userProfile} />}
                {activeTab === 'my_halls' && <VendorHalls user={userProfile} />}
                {activeTab === 'my_chalets' && <VendorChalets user={userProfile} />}
                {activeTab === 'my_services' && <VendorServices user={userProfile} />}
                {activeTab === 'calendar' && <CalendarBoard user={userProfile} />}
                {activeTab === 'hall_bookings' && <Bookings user={userProfile} />}
                {activeTab === 'coupons' && <VendorCoupons user={userProfile} />}
                {activeTab === 'accounting' && <VendorAccounting user={userProfile} />}
                {activeTab === 'brand_settings' && <VendorBrandSettings user={userProfile} onUpdate={() => fetchProfile(userProfile.id)} />}
                {activeTab === 'my_favorites' && <Favorites user={userProfile} />}
                {activeTab === 'my_bookings' && <Bookings user={userProfile} />}
                {activeTab === 'admin_dashboard' && userProfile.role === 'super_admin' && <AdminDashboard />}
                {activeTab === 'admin_users' && userProfile.role === 'super_admin' && <UsersManagement />}
                {activeTab === 'admin_requests' && userProfile.role === 'super_admin' && <AdminRequests />}
                {activeTab === 'admin_categories' && userProfile.role === 'super_admin' && <ServiceCategories />}
                {activeTab === 'admin_cms' && userProfile.role === 'super_admin' && <ContentCMS />}
                {activeTab === 'admin_store' && userProfile.role === 'super_admin' && <AdminStore user={userProfile} />}
                {activeTab === 'subscriptions' && userProfile.role === 'super_admin' && <VendorSubscriptions />}
                {activeTab === 'settings' && userProfile.role === 'super_admin' && <SystemSettings />}
            </div>
        );
    }

    return null;
  };

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
                    setActiveTab(tab);
                    window.scrollTo(0,0);
                }}
                activeTab={navbarActiveTab}
            />
        )}

        {showSidebar && (
          <Sidebar 
            user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} 
            onLogout={handleLogout} isOpen={false} setIsOpen={() => {}}
            platformLogo={userProfile.role === 'vendor' ? userProfile.custom_logo_url : "https://dash.hall.sa/logo.svg"}
          />
        )}

        <main>
          {renderContent()}
        </main>
        {showNavbar && <Footer />}
      </div>
    </NotificationProvider>
  );
};

export default App;
