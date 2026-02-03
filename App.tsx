
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
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Loader2, X, Clock, ChevronLeft, ShieldCheck, CheckCircle2, CreditCard, Wallet, Building2, Sparkles, ArrowRight } from 'lucide-react';
import { useToast } from './context/ToastContext';

type RegStep = 'info' | 'plan' | 'payment' | 'success';

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Registration Flow States
  const [regStep, setRegStep] = useState<RegStep>('info');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState({ id: 'basic', halls: 1, services: 3, price: 299 });
  const [paymentMethod, setPaymentMethod] = useState<'visa' | 'cash'>('visa');
  
  const { toast } = useToast();

  const openAuth = (mode: 'login' | 'register') => {
    setIsRegister(mode === 'register');
    setRegStep('info');
    setShowAuthModal(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id);
      else { setUserProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (id: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) { 
      const profile = data as UserProfile;
      setUserProfile(profile); 
      if (profile.role === 'super_admin') setActiveTab('subscriptions');
      else if (profile.status === 'approved') setActiveTab('dashboard');
      else setActiveTab('pending_approval');
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

  const handleRegisterFinal = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { 
          data: { 
            full_name: fullName, 
            role: 'vendor',
            hall_limit: selectedPlan.halls,
            service_limit: selectedPlan.services,
            subscription_plan: selectedPlan.id
          } 
        } 
      });
      if (error) throw error;
      setRegStep('success');
    } catch (err: any) { 
      toast({ title: 'خطأ في التسجيل', description: err.message, variant: 'destructive' }); 
    } finally { setAuthLoading(false); }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-5xl font-ruqaa text-primary animate-pulse">القاعة</div>
    </div>
  );

  const isMarketplace = activeTab === 'home';
  const isPending = userProfile?.role === 'vendor' && userProfile?.status === 'pending';

  if (isPending && !isMarketplace) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
         <div className="bg-white p-12 rounded-[3rem] shadow-xl max-w-md space-y-6 border border-primary/5">
            <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mx-auto text-primary">
               <Clock className="w-10 h-10 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">طلبك قيد المراجعة</h1>
            <p className="text-gray-500 font-bold leading-relaxed">
              مرحباً {userProfile?.full_name}، شكراً لانضمامك إلينا. يقوم فريق الإدارة حالياً بمراجعة بياناتك، ستتمكن من الوصول للوحة التحكم فور الموافقة على طلبك.
            </p>
            <Button variant="outline" onClick={() => supabase.auth.signOut()} className="w-full h-12 rounded-xl font-bold">تسجيل الخروج</Button>
         </div>
      </div>
    );
  }

  const plans = [
    { id: 'basic', name: 'الباقة الأساسية', halls: 1, services: 3, price: 299 },
    { id: 'pro', name: 'الباقة الاحترافية', halls: 5, services: 10, price: 799 },
    { id: 'enterprise', name: 'باقة الشركات', halls: 20, services: 50, price: 1999 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      {!isMarketplace && userProfile && (
        <Sidebar 
          user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} 
          onLogout={() => supabase.auth.signOut()} isOpen={false} setIsOpen={() => {}} 
        />
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-[500px] bg-white rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 my-auto">
             <button onClick={() => setShowAuthModal(false)} className="absolute top-6 left-6 text-gray-300 hover:text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
             
             {/* Progress Bar for Registration */}
             {isRegister && regStep !== 'success' && (
                <div className="flex justify-between items-center mb-10 px-4">
                   {[
                     { id: 'info', label: 'البيانات' },
                     { id: 'plan', label: 'الباقة' },
                     { id: 'payment', label: 'الدفع' }
                   ].map((s, idx) => (
                      <div key={s.id} className="flex flex-col items-center gap-2 relative z-10">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                            regStep === s.id ? 'bg-primary text-white shadow-lg' : 
                            (idx < ['info', 'plan', 'payment'].indexOf(regStep) ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400')
                         }`}>
                            {idx < ['info', 'plan', 'payment'].indexOf(regStep) ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                         </div>
                         <span className="text-[9px] font-bold text-gray-400">{s.label}</span>
                      </div>
                   ))}
                   <div className="absolute top-[52px] right-20 left-20 h-0.5 bg-gray-100 -z-0">
                      <div className="bg-primary h-full transition-all duration-500" style={{ 
                        width: regStep === 'info' ? '0%' : regStep === 'plan' ? '50%' : '100%' 
                      }}></div>
                   </div>
                </div>
             )}

             <div className="text-center mb-8">
                <div className="text-5xl font-ruqaa text-primary mb-1">القاعة</div>
                <h2 className="text-xl font-black text-gray-900">
                  {!isRegister ? 'بوابة الشركاء' : regStep === 'info' ? 'انضم كشريك' : regStep === 'plan' ? 'اختر خطة العمل' : regStep === 'payment' ? 'تأكيد الاشتراك' : 'مرحباً بك'}
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

             {/* Registration Step 2: Plans */}
             {isRegister && regStep === 'plan' && (
                <div className="space-y-4">
                   {plans.map(plan => (
                      <div 
                        key={plan.id} 
                        onClick={() => setSelectedPlan(plan)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${
                          selectedPlan.id === plan.id ? 'border-primary bg-primary/5' : 'border-gray-50 hover:border-gray-100'
                        }`}
                      >
                         <div className="text-right">
                            <h4 className="text-sm font-black">{plan.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-2 mt-1">
                               <Building2 className="w-3 h-3 text-primary" /> {plan.halls} قاعة
                               <Sparkles className="w-3 h-3 text-primary" /> {plan.services} خدمة
                            </p>
                         </div>
                         <div className="text-left">
                            <span className="text-lg font-black text-primary">{plan.price}</span>
                            <span className="text-[10px] text-gray-400 font-bold me-1">ر.س</span>
                         </div>
                      </div>
                   ))}
                   <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={() => setRegStep('info')} className="flex-1 h-12 rounded-xl font-bold">السابق</Button>
                      <Button onClick={() => setRegStep('payment')} className="flex-[2] h-12 rounded-xl font-black">اختيار الباقة</Button>
                   </div>
                </div>
             )}

             {/* Registration Step 3: Payment */}
             {isRegister && regStep === 'payment' && (
                <div className="space-y-6">
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
                         <p className="text-xs font-bold text-yellow-800 leading-relaxed text-center">سيتم تفعيل حسابك يدوياً من قبل الإدارة بعد استلام المبلغ نقداً.</p>
                      </div>
                   )}

                   <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setRegStep('plan')} className="flex-1 h-12 rounded-xl font-bold">السابق</Button>
                      <Button onClick={handleRegisterFinal} disabled={authLoading} className="flex-[2] h-12 rounded-xl font-black shadow-xl shadow-primary/20">
                         {authLoading ? <Loader2 className="animate-spin" /> : 'إتمام الدفع والتسجيل'}
                      </Button>
                   </div>
                </div>
             )}

             {/* Registration Step 4: Success */}
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

      <main className={`${!isMarketplace && userProfile ? 'lg:pr-[280px]' : ''}`}>
        <div className="mx-auto w-full p-6 lg:p-10">
          {activeTab === 'home' && (
            <Home 
              user={userProfile} onLoginClick={() => openAuth('login')} 
              onRegisterClick={() => openAuth('register')}
              onBrowseHalls={() => {}} onBrowseServices={() => {}}
              onNavigate={setActiveTab} onLogout={() => supabase.auth.signOut()}
            />
          )}
          {activeTab === 'dashboard' && userProfile && <Dashboard user={userProfile} />}
          {activeTab === 'my_halls' && userProfile && <VendorHalls user={userProfile} />}
          {activeTab === 'all_bookings' && userProfile && <Bookings user={userProfile} />}
          {activeTab === 'subscriptions' && userProfile?.role === 'super_admin' && <VendorSubscriptions />}
          {activeTab === 'settings' && userProfile?.role === 'super_admin' && <SystemSettings />}
        </div>
      </main>
    </div>
  );
};

export default App;
