
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
import { ServiceCategories } from './pages/ServiceCategories'; 
import { VendorPOS } from './pages/VendorPOS';
import { VendorCoupons } from './pages/VendorCoupons';
import { CalendarBoard } from './pages/CalendarBoard';
import { VendorServices } from './pages/VendorServices';
import { VendorBrandSettings } from './pages/VendorBrandSettings';
import { BrowseHalls } from './pages/BrowseHalls';
import { Favorites } from './pages/Favorites';
import { AdminRequests } from './pages/AdminRequests';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Loader2, X, Clock, AlertOctagon } from 'lucide-react';
import { useToast } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext'; // Added

type RegStep = 'info' | 'plan' | 'payment' | 'verify' | 'success';

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [browseFilters, setBrowseFilters] = useState<any>(null);
  
  const [regStep, setRegStep] = useState<RegStep>('info');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  
  const [otpCode, setOtpCode] = useState('');
  const MOCK_OTP = "123456"; 

  const [systemFees, setSystemFees] = useState({ hallFee: 500, serviceFee: 200 });
  const [customPlan, setCustomPlan] = useState({ halls: 1, services: 0 });
  
  const { toast } = useToast();

  const openAuth = (mode: 'login' | 'register') => {
    setIsRegister(mode === 'register');
    setRegStep('info');
    setShowAuthModal(true);
    setOtpCode('');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id);
      else { setUserProfile(null); setLoading(false); setActiveTab('home'); }
    });

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
      
      // Auto Redirect Logic: Redirect only if currently on home or browse
      if (activeTab === 'home' || activeTab === 'browse') {
        if (profile.role === 'super_admin') setActiveTab('admin_dashboard');
        else if (profile.role === 'vendor' && profile.status === 'approved') setActiveTab('dashboard');
        else if (profile.role === 'user') setActiveTab('browse');
      }
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
      // fetchProfile will be triggered by auth state change
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setAuthLoading(false); }
  };

  const handleVerifyAndRegister = async () => {
    if (otpCode !== MOCK_OTP) {
        toast({ title: 'رمز خاطئ', description: 'رمز التحقق الذي أدخلته غير صحيح.', variant: 'destructive' });
        return;
    }

    setAuthLoading(true);
    try {
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

      if (data.user) {
         // Add explicit profile creation fallback here if trigger fails
         await new Promise(r => setTimeout(r, 1000));
         const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle();
         if (!profile) {
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
    <NotificationProvider userId={userProfile?.id}>
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
              
              <div className="text-center mb-8">
                  <div className="text-5xl font-ruqaa text-primary mb-1">القاعة</div>
                  <h2 className="text-xl font-black text-gray-900">
                    {!isRegister ? 'بوابة الشركاء' : 'إعداد الحساب'}
                  </h2>
              </div>
              {!isRegister ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 rounded-xl bg-gray-50 border-none px-5 font-bold" />
                    <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl bg-gray-50 border-none px-5 font-bold" />
                    <Button type="submit" className="w-full h-12 rounded-xl font-black text-base" disabled={authLoading}>
                      {authLoading ? <Loader2 className="animate-spin" /> : 'دخول'}
                    </Button>
                    <button type="button" onClick={() => setIsRegister(true)} className="w-full mt-4 text-[10px] font-black text-primary hover:underline">ليس لديك حساب؟ انضم الآن</button>
                  </form>
              ) : (
                  <div className="space-y-4">
                    {/* Compact Registration Form for Context */}
                    {regStep === 'info' && (
                        <div className="space-y-4">
                          <Input placeholder="اسمك الكامل" value={fullName} onChange={e => setFullName(e.target.value)} />
                          <Input placeholder="البريد" value={email} onChange={e => setEmail(e.target.value)} />
                          <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} />
                          <Button onClick={() => setRegStep('plan')}>التالي</Button>
                          <button onClick={() => setIsRegister(false)} className="w-full text-xs text-center mt-2">عندي حساب</button>
                        </div>
                    )}
                    {regStep === 'plan' && (
                        <div className="space-y-4 text-center">
                           <h3 className="font-bold">اختر خطتك</h3>
                           <div className="p-4 border rounded-xl bg-gray-50 cursor-pointer hover:border-primary transition-all">
                              <p className="font-black">الباقة المخصصة</p>
                              <p className="text-xs text-gray-500">ادفع فقط مقابل ما تحتاج</p>
                           </div>
                           <Button onClick={() => setRegStep('payment')}>متابعة للدفع</Button>
                        </div>
                    )}
                    {regStep === 'payment' && (
                        <div className="space-y-4 text-center">
                           <h3 className="font-bold">الدفع</h3>
                           <p className="text-xs">المبلغ الإجمالي: {((customPlan.halls * systemFees.hallFee) + (customPlan.services * systemFees.serviceFee))} ر.س</p>
                           <Button onClick={() => { setAuthLoading(true); setTimeout(() => { setAuthLoading(false); setRegStep('verify'); toast({title: 'رمز التحقق: ' + MOCK_OTP, variant: 'success'}); }, 1500); }}>تأكيد ودفع</Button>
                        </div>
                    )}
                    {regStep === 'verify' && (
                        <div className="space-y-4 text-center">
                           <Input placeholder="رمز التحقق" value={otpCode} onChange={e => setOtpCode(e.target.value)} />
                           <Button onClick={handleVerifyAndRegister} disabled={authLoading}>{authLoading ? 'جاري التحقق...' : 'تأكيد التسجيل'}</Button>
                        </div>
                    )}
                    {regStep === 'success' && (
                        <div className="text-center">
                          <h3 className="font-bold text-green-600">تم التسجيل بنجاح!</h3>
                          <p className="text-xs text-gray-500 mb-4">تم إرسال طلبك للمراجعة.</p>
                          <Button onClick={() => setShowAuthModal(false)} className="mt-4">إغلاق</Button>
                        </div>
                    )}
                  </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className={`${!isMarketplace && !isBrowse && userProfile ? 'lg:pr-[280px]' : ''}`}>
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
            <div className="mx-auto w-full p-6 lg:p-10 max-w-[1600px]">
              {activeTab === 'dashboard' && userProfile && <Dashboard user={userProfile} />}
              {activeTab === 'my_halls' && userProfile && <VendorHalls user={userProfile} />}
              {activeTab === 'my_services' && userProfile && <VendorServices user={userProfile} />}
              {activeTab === 'calendar' && userProfile && <CalendarBoard user={userProfile} />}
              {activeTab === 'hall_bookings' && userProfile && <Bookings user={userProfile} />}
              {activeTab === 'pos' && userProfile && <VendorPOS user={userProfile} />}
              {activeTab === 'coupons' && userProfile && <VendorCoupons user={userProfile} />}
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
