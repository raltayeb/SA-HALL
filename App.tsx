
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
import { VendorMarketplace } from './pages/VendorMarketplace';
import { VendorClients } from './pages/VendorClients'; 
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Modal } from './components/ui/Modal'; 
import { prepareCheckout, verifyPaymentStatus } from './services/paymentService';
import { HyperPayForm } from './components/Payment/HyperPayForm';
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

  // Payment State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCheckoutId, setPaymentCheckoutId] = useState('');
  const [paymentBaseUrl, setPaymentBaseUrl] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState(false);

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

  // Global Payment Verification Logic
  useEffect(() => {
    const checkPaymentReturn = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const resourcePath = urlParams.get('resourcePath');
        const paymentContext = localStorage.getItem('pending_payment_context'); 
        const pendingRefId = localStorage.getItem('pending_ref_id');

        if (resourcePath && paymentContext) {
            setVerifyingPayment(true);
            const { success, id: transactionId } = await verifyPaymentStatus(resourcePath);
            
            if (success) {
                if (paymentContext === 'registration') {
                    // Registration Success
                    const savedAssetData = localStorage.getItem('pending_asset_data');
                    const savedType = localStorage.getItem('pending_asset_type');
                    if (savedAssetData && savedType) {
                        setAssetData(JSON.parse(savedAssetData));
                        setSelectedType(savedType as any);
                        await finalizeAssetCreation(); 
                    }
                } else if (paymentContext === 'booking' && pendingRefId) {
                    // Booking Success
                    await supabase.from('bookings').update({
                        payment_status: 'paid',
                        status: 'confirmed', // Auto confirm if paid
                        notes: `تم الدفع إلكترونياً. المرجع: ${transactionId}`
                    }).eq('id', pendingRefId);
                    
                    // Add Payment Log
                    const { data: booking } = await supabase.from('bookings').select('total_amount, vendor_id').eq('id', pendingRefId).single();
                    if(booking) {
                        await supabase.from('payment_logs').insert([{
                            booking_id: pendingRefId,
                            vendor_id: booking.vendor_id,
                            amount: booking.total_amount,
                            payment_method: 'card',
                            notes: `HyperPay Transaction: ${transactionId}`
                        }]);
                    }
                    toast({ title: 'تم الدفع بنجاح', description: 'تم تأكيد حجزك وإصدار الفاتورة.', variant: 'success' });
                    setActiveTab('guest_dashboard');
                } else if (paymentContext === 'store_order' && pendingRefId) {
                    // Store Order Success
                    await supabase.from('store_orders').update({
                        status: 'pending', // Order confirmed, waiting processing
                        delivery_status: 'processing'
                    }).eq('id', pendingRefId);
                    
                    toast({ title: 'تم الدفع بنجاح', description: 'طلبك قيد المعالجة الآن.', variant: 'success' });
                    setActiveTab('guest_dashboard');
                }
            } else {
                toast({ title: 'فشل الدفع', description: 'لم تتم العملية بنجاح، يرجى المحاولة مرة أخرى.', variant: 'destructive' });
                // Clean up any pending temp records if necessary
                if (paymentContext === 'booking' && pendingRefId) {
                    // Maybe cancel the pending booking or keep it as unpaid
                }
            }
            
            // Cleanup
            localStorage.removeItem('pending_payment_context');
            localStorage.removeItem('pending_asset_data');
            localStorage.removeItem('pending_asset_type');
            localStorage.removeItem('pending_ref_id');
            
            window.history.replaceState({}, document.title, window.location.pathname); 
            setVerifyingPayment(false);
        }
    };
    checkPaymentReturn();
  }, []);

  const fetchProfile = async (id: string, forceRedirect = false) => {
    // ... (same as before)
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
             const [ { count: hallCount }, { count: serviceCount }, { count: chaletCount } ] = await Promise.all([
                supabase.from('halls').select('*', { count: 'exact', head: true }).eq('vendor_id', profile.id),
                supabase.from('services').select('*', { count: 'exact', head: true }).eq('vendor_id', profile.id),
                supabase.from('chalets').select('*', { count: 'exact', head: true }).eq('vendor_id', profile.id)
             ]);
             
             if ((hallCount || 0) > 0 || (serviceCount || 0) > 0 || (chaletCount || 0) > 0) {
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

  // ... (SendOtp, VerifyOtp, SetPassword functions same as before)
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

  // Payment Handler exposed to children via window/props if needed, or by passing to Routes
  const initiatePayment = async (amount: number, context: 'booking' | 'registration' | 'store_order', refId?: string, customerData?: any) => {
      setAuthLoading(true);
      try {
          const payment = await prepareCheckout({
              amount,
              merchantTransactionId: refId || `${context}-${Date.now()}`,
              customerEmail: customerData?.email,
              givenName: customerData?.givenName,
              billingStreet1: customerData?.address || 'Street',
              billingCity: customerData?.city || 'Riyadh',
              billingCountry: 'SA',
              billingPostcode: '12345'
          });

          if (payment) {
              localStorage.setItem('pending_payment_context', context);
              if (refId) localStorage.setItem('pending_ref_id', refId);
              
              setPaymentCheckoutId(payment.checkoutId);
              setPaymentBaseUrl(payment.url);
              setIsPaymentModalOpen(true);
          } else {
              toast({ title: 'خطأ', description: 'فشل تهيئة الدفع.', variant: 'destructive' });
          }
      } catch (e) {
          console.error(e);
          toast({ title: 'خطأ', description: 'حدث خطأ غير متوقع.', variant: 'destructive' });
      } finally {
          setAuthLoading(false);
      }
  };

  // Registration Payment
  const handleAssetSetupAndPay = async () => {
    if (!assetData.name || assetData.name.trim() === '') {
        toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال اسم المنشأة.', variant: 'destructive' });
        return;
    }
    
    // Save temp data
    localStorage.setItem('pending_asset_data', JSON.stringify(assetData));
    localStorage.setItem('pending_asset_type', selectedType || '');

    const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').single();
    const fee = settings?.value?.hall_listing_fee || 100;

    await initiatePayment(fee, 'registration', undefined, { 
        email: regData.email, 
        givenName: regData.fullName,
        address: 'Registration',
        city: assetData.city
    });
  };

  const finalizeAssetCreation = async () => {
      setAuthLoading(true);
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("No user");

        let insertError = null;

        if (selectedType === 'hall') {
            const { error } = await supabase.from('halls').insert([{
                vendor_id: user.id,
                name: assetData.name,
                name_en: assetData.name_en,
                price_per_night: 0,
                city: assetData.city,
                type: 'hall',
                description: assetData.description || 'تم الإنشاء حديثاً',
                capacity: 100,
                is_active: true
            }]);
            insertError = error;
        } else if (selectedType === 'chalet') {
            const { error } = await supabase.from('chalets').insert([{
                vendor_id: user.id,
                name: assetData.name,
                city: assetData.city,
                price_per_night: 0,
                description: assetData.description || 'تم الإنشاء حديثاً',
                is_active: true
            }]);
            insertError = error;
        } else if (selectedType === 'service') {
            const { error } = await supabase.from('services').insert([{
                vendor_id: user.id,
                name: assetData.name,
                price: 0,
                category: assetData.category,
                description: assetData.description || 'تم الإنشاء حديثاً',
                is_active: true
            }]);
            insertError = error;
        }

        if (insertError) throw insertError;

        await supabase.from('profiles').update({
            status: 'approved',
            payment_status: 'paid',
            business_name: assetData.name,
            hall_limit: selectedType === 'service' ? 0 : 1, 
            service_limit: selectedType === 'service' ? 1 : 0
        }).eq('id', user.id);

        toast({ title: 'تم الاشتراك بنجاح', description: 'تم تفعيل حسابك وإضافة المنشأة.', variant: 'success' });
        await fetchProfile(user.id, true);

      } catch (err: any) {
          toast({ title: 'خطأ', description: 'حدث خطأ أثناء حفظ البيانات بعد الدفع.', variant: 'destructive' });
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
  const showSidebar = !isPublicPage && !isGuestPortal && userProfile && !isLocked;

  const renderContent = () => {
    if (verifyingPayment) return (
        <div className="flex h-screen items-center justify-center bg-white flex-col gap-6">
            <Loader2 className="w-16 h-16 animate-spin text-primary" />
            <h2 className="text-2xl font-black text-gray-900">جاري التحقق من عملية الدفع...</h2>
            <p className="text-gray-500 font-bold">يرجى الانتظار، سيتم توجيهك تلقائياً.</p>
        </div>
    );

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-white flex-col gap-4">
          <img src="https://dash.hall.sa/logo.svg" alt="SA Hall" className="h-20 w-auto animate-pulse" />
          <div className="text-xl font-ruqaa text-primary">القاعة</div>
        </div>
    );

    // ... (Login/Register/Home content same as previous file)
    if (activeTab === 'guest_login') return <GuestLogin onBack={() => { setActiveTab('home'); }} />;
    
    if (activeTab === 'login') return (
        // ... (Same login component)
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 animate-in slide-in-from-right-4 duration-500">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-right">
                        <h2 className="text-3xl font-black text-gray-900">تسجيل الدخول</h2>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <Input type="email" label="البريد الإلكتروني" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} required className="h-16" />
                        <div className="relative">
                            <Input type={showPassword ? "text" : "password"} label="كلمة المرور" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} required className="h-16" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-6 top-[3.2rem] text-gray-400">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                        </div>
                        <Button type="submit" className="w-full h-16 rounded-2xl font-black text-xl bg-primary text-white" disabled={authLoading}>{authLoading ? <Loader2 className="animate-spin" /> : 'دخول للمنصة'}</Button>
                        <div className="text-center space-y-2 pt-4">
                            <div><button type="button" onClick={() => { setActiveTab('guest_login'); }} className="text-xs font-black text-primary hover:underline">دخول الضيوف</button></div>
                            <div><button type="button" onClick={() => { setActiveTab('register'); setRegStep(0); }} className="text-xs font-black text-primary hover:underline">انضم كشريك الآن</button></div>
                        </div>
                        <div className="text-center"><button type="button" onClick={() => setActiveTab('home')} className="text-xs font-bold text-gray-400">العودة للرئيسية</button></div>
                    </form>
                </div>
            </div>
            <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden flex-col justify-center items-center text-center p-12 text-white">
                <img src="https://dash.hall.sa/logo.svg" alt="Logo" className="h-64 brightness-0 invert" />
            </div>
        </div>
    );

    if (activeTab === 'register') return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">
            {regStep < 3 ? (
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24">
                    {/* ... (Register Steps 0, 1, 2 from previous code) */}
                    <div className="w-full max-w-md space-y-8">
                        <div className="text-center lg:text-right"><h2 className="text-3xl font-black">انضم كشريك نجاح</h2></div>
                        {regStep === 0 && (
                            <div className="space-y-4">
                                <Input placeholder="الاسم" value={regData.fullName} onChange={e => setRegData({...regData, fullName: e.target.value})} className="h-16" />
                                <Input placeholder="الجوال" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} className="h-16" />
                                <Input type="email" placeholder="البريد" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} className="h-16" />
                                <Button onClick={sendOtp} disabled={authLoading} className="w-full h-16 rounded-2xl font-black text-xl">{authLoading ? <Loader2 className="animate-spin" /> : 'تسجيل'}</Button>
                                <div className="text-center"><button onClick={() => setActiveTab('login')} className="text-xs font-bold text-primary">لديك حساب؟</button></div>
                            </div>
                        )}
                        {regStep === 1 && (
                            <div className="space-y-6 text-center">
                                <Input placeholder="CODE" value={otpCode} onChange={e => setOtpCode(e.target.value)} className="text-center text-3xl tracking-widest h-20" />
                                <Button onClick={verifyOtp} disabled={authLoading} className="w-full h-16 rounded-2xl font-black">تحقق</Button>
                            </div>
                        )}
                        {regStep === 2 && (
                            <div className="space-y-6">
                                <Input type="password" placeholder="كلمة المرور" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} className="h-16" />
                                <Input type="password" placeholder="تأكيد" value={regData.confirmPassword} onChange={e => setRegData({...regData, confirmPassword: e.target.value})} className="h-16" />
                                <Button onClick={setPassword} disabled={authLoading} className="w-full h-16 rounded-2xl font-black">إنشاء الحساب</Button>
                            </div>
                        )}
                    </div>
                </div>
            ) : regStep === 3 ? (
                // ... (Step 3: Choose Type - same as before)
                <div className="w-full flex flex-col items-center justify-center p-8 min-h-screen">
                    <h1 className="text-4xl font-ruqaa mb-8">اختر نوع نشاطك</h1>
                    <div className="grid md:grid-cols-3 gap-8">
                        <button onClick={() => { setSelectedType('hall'); setRegStep(4); }} className="p-8 border-2 rounded-[3rem] hover:border-primary">قاعة</button>
                        <button onClick={() => { setSelectedType('chalet'); setRegStep(4); }} className="p-8 border-2 rounded-[3rem] hover:border-primary">شاليه</button>
                        <button onClick={() => { setSelectedType('service'); setRegStep(4); }} className="p-8 border-2 rounded-[3rem] hover:border-primary">خدمة</button>
                    </div>
                </div>
            ) : (
                // ... (Step 4: Details & Payment - same as before but using handleAssetSetupAndPay)
                <div className="w-full flex items-center justify-center p-8">
                    <div className="max-w-md w-full space-y-6">
                        <h2 className="text-2xl font-black">تفاصيل المنشأة</h2>
                        <Input label="الاسم" value={assetData.name} onChange={e => setAssetData({...assetData, name: e.target.value})} className="h-16" />
                        <Button onClick={handleAssetSetupAndPay} disabled={authLoading} className="w-full h-16 rounded-2xl font-black text-xl">
                            {authLoading ? <Loader2 className="animate-spin" /> : 'الدفع وتفعيل الحساب'}
                        </Button>
                    </div>
                </div>
            )}
            <div className="hidden lg:block w-1/2 bg-primary"></div>
        </div>
    );

    // Main Routes
    if (activeTab === 'home') return (
        <Home 
          user={userProfile} onLoginClick={() => setActiveTab('login')}
          onRegisterClick={() => { setActiveTab('register'); setRegStep(0); }}
          onBrowseHalls={(filters) => { setBrowseFilters(filters); setActiveTab('browse_halls'); }} 
          onNavigate={navigateToDetails} onLogout={handleLogout}
        />
    );

    // Pass initiatePayment to children
    const paymentProps = { onPay: initiatePayment };

    if (activeTab === 'hall_details' && selectedEntity) {
        const handleBack = () => {
            const hallItem = selectedEntity.item as Hall;
            if (selectedEntity.type === 'service') setActiveTab('services_page');
            else if (selectedEntity.type === 'chalet' || hallItem.type === 'chalet') setActiveTab('chalets_page');
            else setActiveTab('halls_page');
            window.scrollTo(0, 0);
        };

        const detailsProps = { item: selectedEntity.item, user: userProfile, onBack: handleBack, ...paymentProps };

        if (selectedEntity.type === 'chalet' || (selectedEntity.item.type && ['chalet', 'resort'].includes(selectedEntity.item.type))) {
            return <ChaletDetails {...detailsProps} />;
        }
        if (selectedEntity.type === 'service') {
            return <ServiceDetails {...detailsProps} />;
        }
        return <HallDetails {...detailsProps} />;
    }

    if (activeTab === 'store_page') return <PublicStore {...paymentProps} />; // Pass payment handler

    // ... (Other existing routes)
    if (activeTab === 'browse_halls') return <BrowseHalls user={userProfile} entityType="hall" onBack={() => setActiveTab('home')} onNavigate={navigateToDetails} initialFilters={browseFilters} />;
    if (activeTab === 'browse_chalets') return <BrowseHalls user={userProfile} entityType="chalet" onBack={() => setActiveTab('home')} onNavigate={navigateToDetails} initialFilters={browseFilters} />;
    if (activeTab === 'browse_services') return <BrowseHalls user={userProfile} entityType="service" onBack={() => setActiveTab('home')} onNavigate={navigateToDetails} initialFilters={browseFilters} />;
    if (activeTab === 'halls_page') return <BrowseHalls user={userProfile} entityType="hall" onBack={() => setActiveTab('home')} onNavigate={navigateToDetails} />;
    if (activeTab === 'chalets_page') return <BrowseHalls user={userProfile} entityType="chalet" onBack={() => setActiveTab('home')} onNavigate={navigateToDetails} />;
    if (activeTab === 'services_page') return <BrowseHalls user={userProfile} entityType="service" onBack={() => setActiveTab('home')} onNavigate={navigateToDetails} />;
    
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
                {activeTab === 'vendor_marketplace' && <VendorMarketplace user={userProfile} />}
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
        
        {/* Payment Modal Wrapper */}
        <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="إتمام الدفع الآمن">
            <div className="min-h-[400px]">
                <HyperPayForm 
                    checkoutId={paymentCheckoutId} 
                    baseUrl={paymentBaseUrl}
                    redirectUrl={window.location.href} 
                />
            </div>
        </Modal>

        {showNavbar && <Footer />}
      </div>
    </NotificationProvider>
  );
};

export default App;
