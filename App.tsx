
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile, VAT_RATE } from './types';
import { Sidebar } from './components/Layout/Sidebar';
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
import { VendorPOS } from './pages/VendorPOS';
import { VendorCoupons } from './pages/VendorCoupons';
import { CalendarBoard } from './pages/CalendarBoard';
import { VendorServices } from './pages/VendorServices';
import { VendorBrandSettings } from './pages/VendorBrandSettings';
import { BrowseHalls } from './pages/BrowseHalls';
import { Favorites } from './pages/Favorites';
import { AdminRequests } from './pages/AdminRequests';
import { VendorAccounting } from './pages/VendorAccounting';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { 
  Loader2, X, Clock, AlertOctagon, User, Building2, 
  CreditCard, CheckCircle2, ShieldCheck, Mail, ArrowLeft, ArrowRight
} from 'lucide-react';
import { useToast } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { PriceTag } from './components/ui/PriceTag';
import { formatCurrency } from './utils/currency';

// Steps: 0=Info, 1=Plan, 2=Payment, 3=Verify, 4=Success
type RegStep = 0 | 1 | 2 | 3 | 4;

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [browseFilters, setBrowseFilters] = useState<any>(null);
  
  // Use Ref to track current profile ID to prevent loop
  const profileIdRef = useRef<string | null>(null);
  
  // Auth State
  const [isRegister, setIsRegister] = useState(false);
  const [regStep, setRegStep] = useState<RegStep>(0);
  
  // Registration Data
  const [regData, setRegData] = useState({
    email: '',
    password: '',
    fullName: '',
    businessName: '',
    phone: '',
  });

  // Plan Data
  const [planData, setPlanData] = useState({
    halls: 1,
    services: 3
  });

  // Payment Data
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [otpCode, setOtpCode] = useState('');
  
  // System Config
  const [systemFees, setSystemFees] = useState({ hallFee: 500, serviceFee: 200 });
  const { toast } = useToast();
  const MOCK_OTP = "1234";

  // Calculations
  const subtotal = (planData.halls * systemFees.hallFee) + (planData.services * systemFees.serviceFee);
  const vatAmount = subtotal * VAT_RATE;
  const totalAmount = subtotal + vatAmount;

  const openAuth = (mode: 'login' | 'register') => {
    setIsRegister(mode === 'register');
    setRegStep(0);
    setShowAuthModal(true);
    setOtpCode('');
  };

  const fetchProfile = async (id: string, isInitialLoad = false) => {
    // If we already have this user loaded and it's not a forced initial load, skip
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

          // Only redirect if on landing pages and it's the first load
          if (isInitialLoad) {
            if (activeTab === 'home' || activeTab === 'browse') {
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
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, true); // True for initial load redirect
      } else {
        setLoading(false);
      }
    });
    
    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore TOKEN_REFRESHED to prevent loops
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

    // 3. Fetch Fees
    const fetchSystemFees = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
      if (data?.value) {
        setSystemFees({
          hallFee: Number(data.value.hall_listing_fee) || 500,
          serviceFee: Number(data.value.service_listing_fee) || 200
        });
      }
    };
    fetchSystemFees();

    return () => subscription.unsubscribe();
  }, []); // Keep empty dependency array

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: regData.email, password: regData.password });
      if (error) throw error;
      setShowAuthModal(false);
    } catch (err: any) {
      toast({ title: 'خطأ في الدخول', description: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', variant: 'destructive' });
    } finally { setAuthLoading(false); }
  };

  const handleRegisterStep = async () => {
    // Validation
    if (regStep === 0) {
       if (!regData.fullName || !regData.email || !regData.password || !regData.businessName) {
         toast({ title: 'نقص بيانات', description: 'يرجى ملء كافة الحقول المطلوبة.', variant: 'destructive' });
         return;
       }
       setRegStep(1);
    } else if (regStep === 1) {
       setRegStep(2);
    } else if (regStep === 2) {
       // Simulate Payment / OTP Request
       setAuthLoading(true);
       setTimeout(() => {
          setAuthLoading(false);
          setRegStep(3);
          toast({ title: 'رمز التحقق', description: `الرمز هو: ${MOCK_OTP}`, variant: 'success' });
       }, 1500);
    } else if (regStep === 3) {
       if (otpCode !== MOCK_OTP) {
          toast({ title: 'خطأ', description: 'رمز التحقق غير صحيح.', variant: 'destructive' });
          return;
       }
       // Final Registration
       setAuthLoading(true);
       try {
          const { error } = await supabase.auth.signUp({ 
            email: regData.email, 
            password: regData.password, 
            options: { 
              data: { 
                full_name: regData.fullName, 
                business_name: regData.businessName,
                phone: regData.phone,
                role: 'vendor',
                hall_limit: planData.halls,
                service_limit: planData.services,
                payment_status: paymentMethod === 'card' ? 'paid' : 'unpaid',
                subscription_plan: 'custom'
              } 
            } 
          });
          
          if (error) throw error;
          setRegStep(4);
       } catch (err: any) {
          toast({ title: 'فشل التسجيل', description: err.message, variant: 'destructive' });
       } finally {
          setAuthLoading(false);
       }
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-5xl font-ruqaa text-primary animate-pulse">القاعة</div>
    </div>
  );

  const isMarketplace = activeTab === 'home';
  const isBrowse = activeTab === 'browse';
  const isPending = userProfile?.role === 'vendor' && userProfile?.status === 'pending';

  if (isPending && !isMarketplace && !isBrowse) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
         <div className="bg-white p-12 rounded-[3rem] shadow-xl max-w-md space-y-8 border border-primary/5 animate-in zoom-in-95">
            <div className="w-24 h-24 bg-yellow-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-yellow-600 shadow-sm border border-yellow-100">
               <Clock className="w-12 h-12 animate-pulse" />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-gray-900">طلبك قيد المراجعة</h1>
              <p className="text-gray-500 font-bold leading-relaxed">
                مرحباً {userProfile?.full_name}، شكراً لانضمامك إلينا. 
                {userProfile.payment_status === 'unpaid' ? ' يرجى إتمام عملية تحويل الرسوم لتفعيل الحساب.' : ' يقوم فريق الإدارة حالياً بمراجعة بياناتك واعتماد حسابك.'}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-right space-y-2">
                <p className="text-xs font-black text-blue-800 flex items-center gap-2">
                   <AlertOctagon className="w-4 h-4" /> حالة الطلب:
                </p>
                <ul className="text-[10px] text-blue-700 font-bold list-disc pr-4 space-y-1">
                   <li>حالة الدفع: {userProfile.payment_status === 'paid' ? 'مدفوع ✅' : 'بانتظار التحويل ⏳'}</li>
                   <li>حالة الحساب: بانتظار الموافقة</li>
                </ul>
            </div>
            <Button variant="outline" onClick={() => { supabase.auth.signOut(); setActiveTab('home'); }} className="w-full h-14 rounded-2xl font-bold text-red-500 hover:bg-red-50 hover:text-red-600 border-red-100">
               تسجيل الخروج والعودة للرئيسية
            </Button>
         </div>
      </div>
    );
  }

  return (
    <NotificationProvider userId={userProfile?.id}>
      <div className="min-h-screen bg-[#F8F9FC] text-gray-900 font-sans" dir="rtl">
        {/* Sidebar Navigation */}
        {!isMarketplace && !isBrowse && userProfile && (
          <Sidebar 
            user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} 
            onLogout={() => { supabase.auth.signOut(); setActiveTab('home'); }} isOpen={false} setIsOpen={() => {}}
            platformLogo={userProfile.role === 'vendor' ? userProfile.custom_logo_url : undefined}
          />
        )}

        {/* Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-[600px] bg-white rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowAuthModal(false)} className="absolute top-6 left-6 text-gray-300 hover:text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
              
              <div className="text-center mb-6">
                  <div className="text-5xl font-ruqaa text-primary mb-1">القاعة</div>
                  <h2 className="text-xl font-black text-gray-900">
                    {!isRegister ? 'بوابة الشركاء' : 'إنشاء حساب بائع جديد'}
                  </h2>
              </div>

              {!isRegister ? (
                  // LOGIN FORM
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Input type="email" placeholder="البريد الإلكتروني" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} required className="h-12 rounded-xl bg-gray-50 border-none px-5 font-bold" />
                    <Input type="password" placeholder="كلمة المرور" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} required className="h-12 rounded-xl bg-gray-50 border-none px-5 font-bold" />
                    <Button type="submit" className="w-full h-12 rounded-xl font-black text-base" disabled={authLoading}>
                      {authLoading ? <Loader2 className="animate-spin" /> : 'دخول'}
                    </Button>
                    <button type="button" onClick={() => setIsRegister(true)} className="w-full mt-4 text-[10px] font-black text-primary hover:underline">ليس لديك حساب؟ انضم الآن</button>
                  </form>
              ) : (
                  // REGISTRATION WIZARD
                  <div className="space-y-6">
                    {/* Stepper */}
                    {regStep < 4 && (
                      <div className="flex justify-between items-center px-4 relative">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 -z-10"></div>
                        {[
                          {i:0, label: 'البيانات'}, 
                          {i:1, label: 'الباقة'}, 
                          {i:2, label: 'الدفع'}, 
                          {i:3, label: 'التحقق'}
                        ].map(step => (
                          <div key={step.i} className={`flex flex-col items-center gap-1 ${regStep >= step.i ? 'text-primary' : 'text-gray-300'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${regStep >= step.i ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200'}`}>
                              {step.i + 1}
                            </div>
                            <span className="text-[9px] font-bold">{step.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Step 0: Info */}
                    {regStep === 0 && (
                      <div className="space-y-4 animate-in slide-in-from-right-4">
                         <div className="grid grid-cols-2 gap-4">
                            <Input placeholder="الاسم الكامل" value={regData.fullName} onChange={e => setRegData({...regData, fullName: e.target.value})} />
                            <Input placeholder="اسم النشاط التجاري" value={regData.businessName} onChange={e => setRegData({...regData, businessName: e.target.value})} />
                         </div>
                         <Input placeholder="رقم الجوال (05xxxxxxxx)" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} />
                         <Input type="email" placeholder="البريد الإلكتروني" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} />
                         <Input type="password" placeholder="كلمة المرور" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} />
                         
                         <div className="flex justify-between items-center pt-4">
                            <button onClick={() => setIsRegister(false)} className="text-xs font-bold text-gray-400">لدي حساب بالفعل</button>
                            <Button onClick={handleRegisterStep} className="px-8 rounded-xl font-bold">التالي <ArrowLeft className="w-4 h-4 mr-2" /></Button>
                         </div>
                      </div>
                    )}

                    {/* Step 1: Plan */}
                    {regStep === 1 && (
                      <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center space-y-1">
                           <h3 className="font-bold text-lg">صمم باقتك الخاصة</h3>
                           <p className="text-xs text-gray-400">ادفع فقط مقابل ما تحتاج من موارد</p>
                        </div>
                        
                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-white rounded-lg border shadow-sm text-primary"><Building2 className="w-5 h-5" /></div>
                                 <div className="text-right">
                                    <p className="font-bold text-sm">عدد القاعات</p>
                                    <p className="text-[10px] text-gray-400">{systemFees.hallFee} ر.س / قاعة</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <button onClick={() => setPlanData(p => ({...p, halls: Math.max(1, p.halls - 1)}))} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center hover:bg-gray-100">-</button>
                                 <span className="font-black w-4 text-center">{planData.halls}</span>
                                 <button onClick={() => setPlanData(p => ({...p, halls: p.halls + 1}))} className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90">+</button>
                              </div>
                           </div>

                           <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-white rounded-lg border shadow-sm text-primary"><ShieldCheck className="w-5 h-5" /></div>
                                 <div className="text-right">
                                    <p className="font-bold text-sm">عدد الخدمات</p>
                                    <p className="text-[10px] text-gray-400">{systemFees.serviceFee} ر.س / خدمة</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <button onClick={() => setPlanData(p => ({...p, services: Math.max(0, p.services - 1)}))} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center hover:bg-gray-100">-</button>
                                 <span className="font-black w-4 text-center">{planData.services}</span>
                                 <button onClick={() => setPlanData(p => ({...p, services: p.services + 1}))} className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90">+</button>
                              </div>
                           </div>
                        </div>

                        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex justify-between items-center">
                           <span className="font-bold text-sm">الإجمالي التقديري</span>
                           <PriceTag amount={totalAmount} className="text-xl text-primary" />
                        </div>

                        <div className="flex justify-between items-center pt-4">
                            <Button variant="ghost" onClick={() => setRegStep(0)}>رجوع</Button>
                            <Button onClick={handleRegisterStep} className="px-8 rounded-xl font-bold">التالي <ArrowLeft className="w-4 h-4 mr-2" /></Button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Payment */}
                    {regStep === 2 && (
                      <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 space-y-2 relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
                           <h4 className="font-black text-center text-lg mb-4">ملخص الطلب</h4>
                           <div className="flex justify-between text-xs font-bold text-gray-500">
                              <span>اشتراك القاعات ({planData.halls})</span>
                              <span>{formatCurrency(planData.halls * systemFees.hallFee)}</span>
                           </div>
                           <div className="flex justify-between text-xs font-bold text-gray-500">
                              <span>اشتراك الخدمات ({planData.services})</span>
                              <span>{formatCurrency(planData.services * systemFees.serviceFee)}</span>
                           </div>
                           <div className="flex justify-between text-xs font-bold text-gray-500 border-b pb-2">
                              <span>الضريبة (15%)</span>
                              <span>{formatCurrency(vatAmount)}</span>
                           </div>
                           <div className="flex justify-between text-lg font-black text-primary pt-2">
                              <span>الإجمالي المستحق</span>
                              <span>{formatCurrency(totalAmount)}</span>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <button 
                             onClick={() => setPaymentMethod('card')}
                             className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 hover:border-primary/50'}`}
                           >
                              <CreditCard className="w-6 h-6" />
                              <span className="text-xs font-black">دفع إلكتروني</span>
                           </button>
                           <button 
                             onClick={() => setPaymentMethod('cash')}
                             className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 hover:border-primary/50'}`}
                           >
                              <Building2 className="w-6 h-6" />
                              <span className="text-xs font-black">تحويل / كاش</span>
                           </button>
                        </div>

                        {paymentMethod === 'cash' && (
                           <div className="text-[10px] bg-yellow-50 text-yellow-700 p-3 rounded-xl border border-yellow-100 text-center font-bold">
                              تنبيه: عند اختيار الدفع النقدي، سيتم تعليق تفعيل الحساب حتى يتم تأكيد استلام المبلغ من قبل الإدارة.
                           </div>
                        )}

                        <div className="flex justify-between items-center pt-4">
                            <Button variant="ghost" onClick={() => setRegStep(1)}>رجوع</Button>
                            <Button onClick={handleRegisterStep} disabled={authLoading} className="px-8 rounded-xl font-bold shadow-xl shadow-primary/20">
                               {authLoading ? <Loader2 className="animate-spin" /> : 'تأكيد ودفع'}
                            </Button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Verify OTP */}
                    {regStep === 3 && (
                      <div className="space-y-6 animate-in slide-in-from-right-4 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-pulse">
                           <Mail className="w-8 h-8" />
                        </div>
                        <div>
                           <h3 className="font-bold text-lg">تحقق من بريدك الإلكتروني</h3>
                           <p className="text-xs text-gray-400 mt-1">لقد أرسلنا رمز تحقق إلى {regData.email}</p>
                        </div>
                        
                        <div className="max-w-[200px] mx-auto">
                           <Input 
                             placeholder="----" 
                             className="text-center text-2xl tracking-[0.5em] font-black h-16 rounded-2xl" 
                             maxLength={4}
                             value={otpCode}
                             onChange={e => setOtpCode(e.target.value)}
                           />
                        </div>

                        <Button onClick={handleRegisterStep} disabled={authLoading} className="w-full h-12 rounded-xl font-bold">
                           {authLoading ? <Loader2 className="animate-spin" /> : 'تأكيد التسجيل'}
                        </Button>
                      </div>
                    )}

                    {/* Step 4: Success */}
                    {regStep === 4 && (
                      <div className="text-center space-y-6 animate-in zoom-in-95 py-10">
                         <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100">
                            <CheckCircle2 className="w-12 h-12" />
                         </div>
                         <h3 className="text-2xl font-black text-gray-900">تم التسجيل بنجاح!</h3>
                         <p className="text-sm text-gray-500 font-bold max-w-xs mx-auto">
                            {paymentMethod === 'card' 
                               ? 'تم تفعيل حسابك بنجاح. يمكنك الآن الدخول والبدء في إدارة قاعاتك.' 
                               : 'تم استلام طلبك. يرجى إتمام عملية التحويل لتفعيل الحساب من قبل الإدارة.'}
                         </p>
                         <Button onClick={() => setShowAuthModal(false)} className="px-10 h-12 rounded-xl font-bold mt-4">إغلاق</Button>
                      </div>
                    )}
                  </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className={`${!isMarketplace && !isBrowse && userProfile ? 'lg:pr-[320px] pt-4 lg:pt-8 px-4 lg:px-8' : ''}`}>
          {activeTab === 'home' && (
            <div className="w-full">
              <Home 
                user={userProfile} onLoginClick={() => openAuth('login')} 
                onRegisterClick={() => openAuth('register')}
                onBrowseHalls={(filters) => { setBrowseFilters(filters); setActiveTab('browse'); }} 
                onBrowseServices={() => {}}
                onNavigate={setActiveTab} onLogout={() => { supabase.auth.signOut(); setActiveTab('home'); }}
              />
            </div>
          )}

          {activeTab === 'browse' && (
            <BrowseHalls 
              user={userProfile} 
              mode="halls"
              onBack={() => setActiveTab('home')}
              onLoginClick={() => openAuth('login')}
              onNavigate={setActiveTab}
              onLogout={() => { supabase.auth.signOut(); setActiveTab('home'); }}
              initialFilters={browseFilters}
            />
          )}

          {activeTab !== 'home' && activeTab !== 'browse' && (
            <div className="mx-auto w-full max-w-[1600px]">
              {activeTab === 'dashboard' && userProfile && <Dashboard user={userProfile} />}
              {activeTab === 'my_halls' && userProfile && <VendorHalls user={userProfile} />}
              {activeTab === 'my_services' && userProfile && <VendorServices user={userProfile} />}
              {activeTab === 'calendar' && userProfile && <CalendarBoard user={userProfile} />}
              {activeTab === 'hall_bookings' && userProfile && <Bookings user={userProfile} />}
              {activeTab === 'pos' && userProfile && <VendorPOS user={userProfile} />}
              {activeTab === 'coupons' && userProfile && <VendorCoupons user={userProfile} />}
              {activeTab === 'accounting' && userProfile && <VendorAccounting user={userProfile} />}
              {activeTab === 'brand_settings' && userProfile && <VendorBrandSettings user={userProfile} onUpdate={() => fetchProfile(userProfile.id)} />}
              {activeTab === 'my_favorites' && userProfile && <Favorites user={userProfile} />}
              {activeTab === 'my_bookings' && userProfile && <Bookings user={userProfile} />}
              {activeTab === 'admin_dashboard' && userProfile?.role === 'super_admin' && <AdminDashboard />}
              {activeTab === 'admin_users' && userProfile?.role === 'super_admin' && <UsersManagement />}
              {activeTab === 'admin_requests' && userProfile?.role === 'super_admin' && <AdminRequests />}
              {activeTab === 'admin_categories' && userProfile?.role === 'super_admin' && <ServiceCategories />}
              {activeTab === 'admin_cms' && userProfile?.role === 'super_admin' && <ContentCMS />}
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
