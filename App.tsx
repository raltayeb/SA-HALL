
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile, SystemSettings as ISystemSettings } from './types';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { VendorHalls } from './pages/VendorHalls';
import { Bookings } from './pages/Bookings';
import { Home } from './pages/Home';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Loader2, X, Plus, Minus, Building2, Sparkles, ChevronLeft } from 'lucide-react';
import { useToast } from './context/ToastContext';

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [plannedHalls, setPlannedHalls] = useState(1);
  const [plannedServices, setPlannedServices] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const { toast } = useToast();

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
    if (data) { setUserProfile(data as UserProfile); setActiveTab('dashboard'); }
    setLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister && regStep === 1) { setRegStep(2); return; }
    setAuthLoading(true);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ 
          email, password, options: { data: { full_name: fullName, role: 'vendor' } } 
        });
        if (error) throw error;
        toast({ title: 'نجاح', description: 'تم إنشاء الحساب بنجاح' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      setShowAuthModal(false);
    } catch (err: any) { 
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' }); 
    } finally { setAuthLoading(false); }
  };

  const openAuth = (mode: 'login' | 'register') => {
    setIsRegister(mode === 'register');
    setRegStep(1);
    setShowAuthModal(true);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-5xl font-ruqaa text-primary animate-pulse">القاعة</div>
    </div>
  );

  const isMarketplace = activeTab === 'home';
  const planTotal = (plannedHalls * 500) + (plannedServices * 300);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      {!isMarketplace && userProfile && (
        <Sidebar 
          user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} 
          onLogout={() => supabase.auth.signOut()} isOpen={false} setIsOpen={() => {}} 
        />
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[1000] bg-black/20 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-white rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95">
             <button onClick={() => setShowAuthModal(false)} className="absolute top-6 left-6 text-gray-300 hover:text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
             
             <div className="text-center mb-8">
                <div className="text-5xl font-ruqaa text-primary mb-1">القاعة</div>
                <h2 className="text-xl font-black text-gray-900">
                  {isRegister ? (regStep === 1 ? 'انضم كشريك' : 'اختر خطة الاشتراك') : 'بوابة الشركاء'}
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  {isRegister ? 'خصص سعتك التشغيلية على المنصة' : 'مرحباً بك مجدداً'}
                </p>
             </div>

             <form onSubmit={handleAuth} className="space-y-6">
                {regStep === 1 ? (
                  <div className="space-y-4">
                    {isRegister && <Input placeholder="اسم النشاط" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-12 rounded-xl bg-gray-50 border-none px-5 font-bold" />}
                    <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 rounded-xl bg-gray-50 border-none px-5 font-bold" />
                    <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl bg-gray-50 border-none px-5 font-bold" />
                    <Button type="submit" className="w-full h-12 rounded-xl font-black text-base shadow-lg shadow-primary/10" disabled={authLoading}>
                      {authLoading ? <Loader2 className="animate-spin" /> : (isRegister ? 'التالي' : 'دخول')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-left-4">
                    <div className="grid grid-cols-2 gap-4">
                       {/* Hall Counter */}
                       <div className="space-y-2">
                          <label className="text-[9px] font-bold text-gray-400 flex items-center gap-1.5 justify-end px-1">عدد القاعات <Building2 className="w-3 h-3" /></label>
                          <div className="flex items-center bg-gray-50 rounded-full p-1 border border-gray-100">
                             <button type="button" onClick={() => setPlannedHalls(plannedHalls + 1)} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-primary font-bold hover:bg-primary hover:text-white transition-all"><Plus className="w-3.5 h-3.5" /></button>
                             <input type="number" readOnly className="flex-1 bg-transparent border-none text-center font-black text-xl text-gray-900 focus:ring-0" value={plannedHalls} />
                             <button type="button" onClick={() => setPlannedHalls(Math.max(1, plannedHalls - 1))} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-primary font-bold hover:bg-primary hover:text-white transition-all"><Minus className="w-3.5 h-3.5" /></button>
                          </div>
                          <p className="text-[9px] text-center text-gray-400 font-bold">500 ر.س / قاعة</p>
                       </div>
                       {/* Service Counter */}
                       <div className="space-y-2">
                          <label className="text-[9px] font-bold text-gray-400 flex items-center gap-1.5 justify-end px-1">عدد الخدمات <Sparkles className="w-3 h-3" /></label>
                          <div className="flex items-center bg-gray-50 rounded-full p-1 border border-gray-100">
                             <button type="button" onClick={() => setPlannedServices(plannedServices + 1)} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-primary font-bold hover:bg-primary hover:text-white transition-all"><Plus className="w-3.5 h-3.5" /></button>
                             <input type="number" readOnly className="flex-1 bg-transparent border-none text-center font-black text-xl text-gray-900 focus:ring-0" value={plannedServices} />
                             <button type="button" onClick={() => setPlannedServices(Math.max(0, plannedServices - 1))} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-primary font-bold hover:bg-primary hover:text-white transition-all"><Minus className="w-3.5 h-3.5" /></button>
                          </div>
                          <p className="text-[9px] text-center text-gray-400 font-bold">300 ر.س / خدمة</p>
                       </div>
                    </div>

                    <div className="bg-[#F8F4FF] p-6 rounded-[2rem] text-center space-y-0.5 border border-primary/5 shadow-inner">
                       <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">إجمالي التكلفة</span>
                       <div className="flex items-center gap-2 justify-center">
                          <span className="text-4xl font-black text-primary leading-none tracking-tighter">{planTotal}</span>
                          <span className="text-[11px] font-bold text-primary mt-1">ر.س</span>
                       </div>
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" className="flex-[2] h-12 rounded-xl font-black text-base bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" disabled={authLoading}>
                        {authLoading ? <Loader2 className="animate-spin" /> : 'تأكيد ودفع'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setRegStep(1)} className="flex-1 h-12 rounded-xl font-bold border-gray-100 text-gray-300 hover:bg-gray-50">رجوع</Button>
                    </div>
                  </div>
                )}
             </form>

             <button onClick={() => { setIsRegister(!isRegister); setRegStep(1); }} className="w-full mt-8 text-[10px] font-black text-primary hover:underline flex items-center justify-center gap-2 group transition-all">
                <ChevronLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                {isRegister ? 'لديك حساب بائع؟ سجل دخول' : 'ليس لديك حساب؟ انضم الآن'}
             </button>
          </div>
        </div>
      )}

      <main className={`${!isMarketplace && userProfile ? 'lg:pr-[280px]' : ''}`}>
        <div className="mx-auto w-full">
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
        </div>
      </main>
    </div>
  );
};

export default App;
