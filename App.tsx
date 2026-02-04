
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile } from './types';
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
import { ServiceCategories } from './pages/ServiceCategories'; // New Page
import { VendorPOS } from './pages/VendorPOS';
import { VendorCoupons } from './pages/VendorCoupons';
import { CalendarBoard } from './pages/CalendarBoard';
import { VendorServices } from './pages/VendorServices';
import { VendorBrandSettings } from './pages/VendorBrandSettings';
import { BrowseHalls } from './pages/BrowseHalls';
import { Favorites } from './pages/Favorites';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { PriceTag } from './components/ui/PriceTag';
import { Loader2, X, Clock, ChevronLeft, CheckCircle2, CreditCard, Wallet, Building2, Sparkles, Plus, Minus, Calculator, AlertOctagon, Mail, Lock } from 'lucide-react';
import { useToast } from './context/ToastContext';

// Updated RegStep to include 'verify'
type RegStep = 'info' | 'plan' | 'payment' | 'verify' | 'success';

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [browseFilters, setBrowseFilters] = useState<any>(null);
  
  // Registration Flow States
  const [regStep, setRegStep] = useState<RegStep>('info');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  
  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const MOCK_OTP = "123456"; // Fixed Mock OTP for testing

  // Dynamic Pricing State
  const [systemFees, setSystemFees] = useState({ hallFee: 500, serviceFee: 200 });
  const [customPlan, setCustomPlan] = useState({ halls: 1, services: 0 });
  const [paymentMethod, setPaymentMethod] = useState<'visa' | 'cash'>('visa');
  
  const { toast } = useToast();

  const openAuth = (mode: 'login' | 'register') => {
    setIsRegister(mode === 'register');
    setRegStep('info');
    setShowAuthModal(true);
    setOtpCode('');
  };

  useEffect(() => {
    // 1. Check Auth Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id);
      else { setUserProfile(null); setLoading(false); }
    });

    // 2. Fetch System Pricing Config
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
  }, []);

  const fetchProfile = async (id: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) { 
      const profile = data as UserProfile;
      setUserProfile(profile); 
      
      // Strict Pending Check
      if (profile.role === 'vendor' && profile.status === 'pending') {
         setLoading(false);
         return; 
      }

      if (activeTab === 'home') return; 
      
      if (profile.role === 'super_admin') setActiveTab('admin_dashboard');
      else if (profile.role === 'vendor' && profile.status === 'approved') setActiveTab('dashboard');
      else if (profile.role === 'user') setActiveTab('browse');
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setShowAuthModal(false);
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setAuthLoading(false); }
  };

  // Step 1: Move from Payment to OTP Verification (Simulate Sending Email)
  const handlePaymentComplete = async () => {
    setAuthLoading(true);
    // Simulate API delay for sending email
    setTimeout(() => {
        setAuthLoading(false);
        setRegStep('verify');
        // MOCK EMAIL SENDING: Show toast with code
        toast({ 
            title: 'تم إرسال رمز التحقق', 
            description: `تم إرسال الرمز إلى ${email}. (رمز الاختبار: ${MOCK_OTP})`, 
            variant: 'success' 
        });
    }, 1500);
  };

  // Step 2: Verify OTP and Create User
  const handleVerifyAndRegister = async () => {
    if (otpCode !== MOCK_OTP) {
        toast({ title: 'رمز خاطئ', description: 'رمز التحقق الذي أدخلته غير صحيح.', variant: 'destructive' });
        return;
    }

    setAuthLoading(true);
    try {
      // 1. Create Auth User
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { 
          data: { 
            full_name: fullName, 
            role: 'vendor',
            hall_limit: Number(customPlan.halls),
            service_limit: Number(customPlan.services),
            subscription_plan: 'custom'
          } 
        } 
      });
      
      if (error) throw error;

      // 2. Safety Check: If Auth passed but Profile Trigger failed (rare but possible), manually insert profile
      // This solves the "Database error" issue if the trigger fails for some reason but Auth user is created.
      if (data.user) {
         // Wait a moment for trigger
         await new Promise(r => setTimeout(r, 1000));
         
         const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle();
         
         if (!profile) {
            console.log("Trigger failed or user exists. Creating profile manually...");
            await supabase.from('profiles').insert([{
               id: data.user.id,
               email: email,
               full_name: fullName,
               role: 'vendor',
               status: 'pending',
               hall_limit: customPlan.halls,
               service_limit: customPlan.services,
               subscription_plan: 'custom',
               is_enabled: true
            }]);
         }
      }

      setRegStep('success');
    } catch (err: any) { 
      console.error("Register Error:", err);
      toast({ title: 'خطأ في التسجيل', description: err.message, variant: 'destructive' }); 
    } finally { setAuthLoading(false); }
  };

  // Calculate Total Price
  const totalPrice = (customPlan.halls * systemFees.hallFee) + (customPlan.services * systemFees.serviceFee);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-5xl font-ruqaa text-primary animate-pulse">القاعة</div>
    </div>
  );

  const isMarketplace = activeTab === 'home';
  const isBrowse = activeTab === 'browse';
  // Check pending status explicitly
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
                مرحباً {userProfile?.full_name}، شكراً لانضمامك إلينا. يقوم فريق الإدارة حالياً بمراجعة بياناتك واعتماد حسابك.
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-right space-y-2">
                <p className="text-xs font-black text-blue-800 flex items-center gap-2">
                   <AlertOctagon className="w-4 h-4" /> تعليمات هامة:
                </p>
                <ul className="text-[10px] text-blue-700 font-bold list-disc pr-4 space-y-1">
                   <li>سيتم تفعيل حسابك فور استلام الدفع (في حال الدفع النقدي).</li>
                   <li>ستصلك رسالة بريد إلكتروني عند الاعتماد.</li>
                   <li>يرجى المحاولة في وقت لاحق.</li>
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
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      {/* Sidebar Navigation */}
      {!isMarketplace && !isBrowse && userProfile && (
        <Sidebar 
          user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} 
          onLogout={() => { supabase.auth.signOut(); setActiveTab('home'); }} isOpen={false} setIsOpen={() => {}}
          platformLogo={userProfile.role === 'vendor' ? userProfile.custom_logo_url : undefined}
        />
      )}

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-[550px] bg-white rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 my-auto">
             <button onClick={() => setShowAuthModal(false)} className="absolute top-6 left-6 text-gray-300 hover:text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
             
             {/* Progress Bar for Registration */}
             {isRegister && regStep !== 'success' && (
                <div className="flex justify-between items-center mb-10 px-4">
                   {[
                     { id: 'info', label: 'البيانات' },
                     { id: 'plan', label: 'الاشتراك' },
                     { id: 'payment', label: 'الدفع' },
                     { id: 'verify', label: 'التحقق' }
                   ].map((s, idx) => (
                      <div key={s.id} className="flex flex-col items-center gap-2 relative z-10">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                            regStep === s.id ? 'bg-primary text-white shadow-lg scale-110' : 
                            (idx < ['info', 'plan', 'payment', 'verify'].indexOf(regStep) ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400')
                         }`}>
                            {idx < ['info', 'plan', 'payment', 'verify'].indexOf(regStep) ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                         </div>
                         <span className={`text-[9px] font-bold ${regStep === s.id ? 'text-primary' : 'text-gray-400'}`}>{s.label}</span>
                      </div>
                   ))}
                   <div className="absolute top-[52px] right-14 left-14 h-0.5 bg-gray-100 -z-0">
                      <div className="bg-primary h-full transition-all duration-500" style={{ 
                        width: regStep === 'info' ? '0%' : regStep === 'plan' ? '33%' : regStep === 'payment' ? '66%' : '100%' 
                      }}></div>
                   </div>
                </div>
             )}

             <div className="text-center mb-8">
                <div className="text-5xl font-ruqaa text-primary mb-1">القاعة</div>
                <h2 className="text-xl font-black text-gray-900">
                  {!isRegister ? 'بوابة الشركاء' : regStep === 'info' ? 'انضم كشريك' : regStep === 'verify' ? 'التحقق من البريد' : 'إعداد الحساب'}
                </h2>
             </div>

             {/* Login View */}
             {!isRegister && (
                <form onSubmit={handleLogin} className="space-y-4">
                   <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 rounded-xl bg-gray-50 border-none px-5 font-bold" />
                   <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl bg-gray-50 border-none px-5 font-bold" />
                   <Button type="submit" className="w-full h-12 rounded-xl font-black text-base" disabled={authLoading}>
                     {authLoading ? <Loader2 className="animate-spin" /> : 'دخول'}
                   </Button>
                   <button type="button" onClick={() => setIsRegister(true)} className="w-full mt-4 text-[10px] font-black text-primary hover:underline">ليس لديك حساب؟ انضم الآن</button>
                </form>
             )}

             {/* Registration Step 1: Info */}
             {isRegister && regStep === 'info' && (
                <div className="space-y-4">
                   <Input placeholder="اسمك الكامل / اسم المنشأة" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-12 rounded-xl bg-gray-50 border-none px-5 font-bold" />
                   <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 rounded-xl bg-gray-50 border-none px-5 font-bold" />
                   <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl bg-gray-50 border-none px-5 font-bold" />
                   <Button onClick={() => setRegStep('plan')} className="w-full h-12 rounded-xl font-black text-base gap-2">
                      التالي <ChevronLeft className="w-4 h-4" />
                   </Button>
                   <button type="button" onClick={() => setIsRegister(false)} className="w-full mt-4 text-[10px] font-black text-gray-400">لديك حساب؟ سجل دخول</button>
                </div>
             )}

             {/* Steps: Plan, Payment, Verify, Success are the same as before... */}
             {isRegister && regStep === 'plan' && (
                <div className="space-y-6">
                   <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 text-center">
                      <p className="text-xs font-black text-gray-500 mb-2">القيمة الإجمالية للاشتراك السنوي</p>
                      <PriceTag amount={totalPrice} className="text-4xl font-black text-primary justify-center" />
                   </div>

                   <div className="space-y-4">
                      {/* Halls Counter */}
                      <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-primary"><Building2 className="w-5 h-5" /></div>
                            <div>
                               <p className="font-black text-sm">عدد القاعات</p>
                               <p className="text-[10px] text-gray-400 font-bold">{systemFees.hallFee} ر.س / قاعة</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-1">
                            <button 
                              onClick={() => setCustomPlan(prev => ({...prev, halls: Math.max(1, prev.halls - 1)}))}
                              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-primary transition-colors disabled:opacity-50"
                              disabled={customPlan.halls <= 1}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-black w-4 text-center">{customPlan.halls}</span>
                            <button 
                              onClick={() => setCustomPlan(prev => ({...prev, halls: prev.halls + 1}))}
                              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-primary transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                         </div>
                      </div>

                      {/* Services Counter */}
                      <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-primary"><Sparkles className="w-5 h-5" /></div>
                            <div>
                               <p className="font-black text-sm">عدد الخدمات الإضافية</p>
                               <p className="text-[10px] text-gray-400 font-bold">{systemFees.serviceFee} ر.س / خدمة</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-1">
                            <button 
                              onClick={() => setCustomPlan(prev => ({...prev, services: Math.max(0, prev.services - 1)}))}
                              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-primary transition-colors disabled:opacity-50"
                              disabled={customPlan.services <= 0}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-black w-4 text-center">{customPlan.services}</span>
                            <button 
                              onClick={() => setCustomPlan(prev => ({...prev, services: prev.services + 1}))}
                              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-primary transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                   </div>

                   <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={() => setRegStep('info')} className="flex-1 h-12 rounded-xl font-bold">السابق</Button>
                      <Button onClick={() => setRegStep('payment')} className="flex-[2] h-12 rounded-xl font-black shadow-xl shadow-primary/20">تأكيد الباقة</Button>
                   </div>
                </div>
             )}

             {isRegister && regStep === 'payment' && (
                <div className="space-y-6">
                   <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 text-center space-y-2">
                      <p className="text-xs font-bold text-gray-500">ملخص الفاتورة</p>
                      <div className="flex justify-between items-center px-4 text-sm font-bold">
                        <span>{customPlan.halls} قاعات</span>
                        <span>{customPlan.halls * systemFees.hallFee} ر.س</span>
                      </div>
                      <div className="flex justify-between items-center px-4 text-sm font-bold">
                        <span>{customPlan.services} خدمات</span>
                        <span>{customPlan.services * systemFees.serviceFee} ر.س</span>
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between items-center px-4 text-base font-black text-primary">
                        <span>الإجمالي</span>
                        <span>{totalPrice} ر.س</span>
                      </div>
                   </div>

                   <div className="flex gap-3">
                      <button 
                        onClick={() => setPaymentMethod('visa')}
                        className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'visa' ? 'border-primary bg-primary/5' : 'border-gray-50'}`}
                      >
                         <CreditCard className={`w-6 h-6 ${paymentMethod === 'visa' ? 'text-primary' : 'text-gray-300'}`} />
                         <span className="text-[10px] font-black">فيزا / مدى</span>
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-gray-50'}`}
                      >
                         <Wallet className={`w-6 h-6 ${paymentMethod === 'cash' ? 'text-primary' : 'text-gray-300'}`} />
                         <span className="text-[10px] font-black">دفع كاش</span>
                      </button>
                   </div>
                   
                   {paymentMethod === 'visa' ? (
                      <div className="bg-gray-50 p-6 rounded-2xl space-y-4 animate-in fade-in">
                         <Input placeholder="رقم البطاقة" className="h-11 bg-white" />
                         <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="MM/YY" className="h-11 bg-white" />
                            <Input placeholder="CVV" className="h-11 bg-white" />
                         </div>
                         <p className="text-[9px] text-gray-400 text-center">* بوابة دفع افتراضية لأغراض التجربة</p>
                      </div>
                   ) : (
                      <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 animate-in fade-in">
                         <p className="text-xs font-bold text-yellow-800 leading-relaxed text-center">سيتم تفعيل حسابك يدوياً من قبل الإدارة بعد استلام المبلغ ({totalPrice} ر.س) نقداً.</p>
                      </div>
                   )}

                   <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setRegStep('plan')} className="flex-1 h-12 rounded-xl font-bold">السابق</Button>
                      <Button onClick={handlePaymentComplete} disabled={authLoading} className="flex-[2] h-12 rounded-xl font-black shadow-xl shadow-primary/20">
                         {authLoading ? <Loader2 className="animate-spin" /> : 'متابعة للتحقق'}
                      </Button>
                   </div>
                </div>
             )}

             {/* Registration Step 4: OTP Verification */}
             {isRegister && regStep === 'verify' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                   <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 text-center space-y-4">
                      <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center text-blue-600 shadow-sm">
                         <Mail className="w-8 h-8" />
                      </div>
                      <div>
                         <h3 className="text-lg font-black text-gray-900">تأكيد البريد الإلكتروني</h3>
                         <p className="text-xs font-bold text-gray-500 mt-1">لقد أرسلنا رمز تحقق (OTP) إلى بريدك:<br/><span className="text-gray-900">{email}</span></p>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="relative">
                         <Input 
                           placeholder="أدخل رمز التحقق (مثال: 123456)" 
                           value={otpCode} 
                           onChange={e => setOtpCode(e.target.value)} 
                           className="h-14 text-center text-2xl tracking-[0.5em] font-black rounded-2xl bg-gray-50 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all placeholder:text-sm placeholder:tracking-normal placeholder:font-bold"
                           maxLength={6}
                         />
                         <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] font-bold px-2">
                         <span className="text-gray-400">لم يصلك الرمز؟</span>
                         <button type="button" onClick={handlePaymentComplete} className="text-primary hover:underline">إعادة الإرسال</button>
                      </div>
                   </div>

                   <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setRegStep('payment')} className="flex-1 h-12 rounded-xl font-bold">تعديل الدفع</Button>
                      <Button onClick={handleVerifyAndRegister} disabled={authLoading} className="flex-[2] h-12 rounded-xl font-black shadow-xl shadow-primary/20">
                         {authLoading ? <Loader2 className="animate-spin" /> : 'تأكيد وإنشاء الحساب'}
                      </Button>
                   </div>
                </div>
             )}

             {isRegister && regStep === 'success' && (
                <div className="text-center space-y-6 py-4 animate-in zoom-in-95">
                   <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10" />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-2xl font-black">تم بنجاح!</h3>
                      <p className="text-sm text-gray-400 font-medium leading-relaxed">شكراً {fullName}، تم استلام طلب انضمامك. فريقنا يراجع البيانات الآن وسنوافيك بالرد قريباً.</p>
                   </div>
                   <Button onClick={() => setShowAuthModal(false)} className="w-full h-12 rounded-xl font-black">العودة للرئيسية</Button>
                </div>
             )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`${!isMarketplace && !isBrowse && userProfile ? 'lg:pr-[280px]' : ''}`}>
        
        {/* Public Pages */}
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

        {/* Browse Page */}
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

        {/* Protected Dashboard Pages */}
        {activeTab !== 'home' && activeTab !== 'browse' && (
          <div className="mx-auto w-full p-6 lg:p-10 max-w-[1600px]">
            {/* Vendor Routes */}
            {activeTab === 'dashboard' && userProfile && <Dashboard user={userProfile} />}
            {activeTab === 'my_halls' && userProfile && <VendorHalls user={userProfile} />}
            {activeTab === 'my_services' && userProfile && <VendorServices user={userProfile} />}
            {activeTab === 'calendar' && userProfile && <CalendarBoard user={userProfile} />}
            {activeTab === 'hall_bookings' && userProfile && <Bookings user={userProfile} />}
            {activeTab === 'pos' && userProfile && <VendorPOS user={userProfile} />}
            {activeTab === 'coupons' && userProfile && <VendorCoupons user={userProfile} />}
            {activeTab === 'brand_settings' && userProfile && <VendorBrandSettings user={userProfile} onUpdate={() => fetchProfile(userProfile.id)} />}
            
            {/* User Routes */}
            {activeTab === 'my_favorites' && userProfile && <Favorites user={userProfile} />}
            {activeTab === 'my_bookings' && userProfile && <Bookings user={userProfile} />}

            {/* Super Admin Routes */}
            {activeTab === 'admin_dashboard' && userProfile?.role === 'super_admin' && <AdminDashboard />}
            {activeTab === 'admin_users' && userProfile?.role === 'super_admin' && <UsersManagement />}
            {activeTab === 'admin_categories' && userProfile?.role === 'super_admin' && <ServiceCategories />}
            {activeTab === 'admin_cms' && userProfile?.role === 'super_admin' && <ContentCMS />}
            {activeTab === 'subscriptions' && userProfile?.role === 'super_admin' && <VendorSubscriptions />}
            {activeTab === 'settings' && userProfile?.role === 'super_admin' && <SystemSettings />}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
