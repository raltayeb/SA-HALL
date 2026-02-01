
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile, SystemSettings as ISystemSettings } from './types';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { VendorHalls } from './pages/VendorHalls';
import { VendorServices } from './pages/VendorServices';
import { BrowseHalls } from './pages/BrowseHalls';
import { UsersManagement } from './pages/UsersManagement';
import { Bookings } from './pages/Bookings';
import { VendorSubscriptions } from './pages/VendorSubscriptions';
import { SystemSettings } from './pages/SystemSettings';
import { Favorites } from './pages/Favorites';
import { CalendarBoard } from './pages/CalendarBoard';
import { VendorBrandSettings } from './pages/VendorBrandSettings';
import { Home } from './pages/Home';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Menu, Loader2, Bell, X, Building2, RefreshCw, LogIn, User } from 'lucide-react';
import { useToast } from './context/ToastContext';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const lastFetchedUserId = useRef<string | null>(null);
  
  const [siteSettings, setSiteSettings] = useState<ISystemSettings>({
    site_name: 'SA Hall',
    commission_rate: 0.10,
    vat_enabled: true,
    platform_logo_url: ''
  } as any);
  
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('user');

  useEffect(() => {
    if (userProfile?.theme_color) {
      document.documentElement.style.setProperty('--primary', userProfile.theme_color);
      document.documentElement.style.setProperty('--primary-muted', `${userProfile.theme_color}22`);
    } else {
      document.documentElement.style.setProperty('--primary', 'oklch(0.541 0.281 293.009)');
    }
  }, [userProfile?.theme_color]);

  const fetchSiteSettings = async () => {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
      if (data?.value) setSiteSettings(data.value);
    } catch (err) { console.error(err); }
  };

  const fetchProfile = async (userId: string) => {
    if (lastFetchedUserId.current === userId && userProfile) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      if (data) {
        setUserProfile(data as UserProfile);
        lastFetchedUserId.current = userId;
      }
    } catch (err: any) { 
      console.error('Profile fetch failed:', err);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchSiteSettings();
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) { 
        setLoading(false);
      }
    };
    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        if (newSession.user.id !== lastFetchedUserId.current) {
          await fetchProfile(newSession.user.id);
        } else {
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        lastFetchedUserId.current = null;
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password, 
          options: { data: { full_name: fullName, role: role } } 
        });
        if (error) throw error;
        toast({ title: 'تفعيل الحساب', description: 'يرجى مراجعة بريدك الإلكتروني.', variant: 'default' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      setShowAuthModal(false);
    } catch (error: any) { 
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); 
    } finally { 
      setAuthLoading(false); 
    }
  };

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-primary gap-6">
      <Loader2 className="w-12 h-12 animate-spin" />
      <p className="font-black text-xl animate-pulse tracking-tighter">{siteSettings.site_name}...</p>
    </div>
  );

  const isMarketplace = activeTab === 'home';

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white">
      {/* Sidebar (Admin/Vendor ONLY) */}
      {!isMarketplace && (
        <Sidebar 
          user={userProfile} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogout={() => {
            supabase.auth.signOut();
            setUserProfile(null);
            setActiveTab('home');
          }} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          siteName={siteSettings.site_name}
          platformLogo={siteSettings.platform_logo_url}
        />
      )}

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-12 shadow-2xl relative animate-in zoom-in-95">
             <button onClick={() => setShowAuthModal(false)} className="absolute top-8 left-8 p-3 hover:bg-black/5 rounded-full"><X className="w-5 h-5" /></button>
             <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto border border-primary/20"><LogIn className="w-8 h-8" /></div>
                <h2 className="text-3xl font-black text-black">{isRegister ? 'انضم كشريك' : 'تسجيل الدخول'}</h2>
                <p className="text-sm text-black/40 font-bold">ابدأ بإدارة قاعاتك وخدماتك باحترافية.</p>
             </div>
             <form onSubmit={handleAuth} className="space-y-4 text-right">
                {isRegister && <Input placeholder="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-14 rounded-2xl text-right font-bold bg-black/5 border-none" />}
                <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required className="h-14 rounded-2xl text-right font-bold bg-black/5 border-none" />
                <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required className="h-14 rounded-2xl text-right font-bold bg-black/5 border-none" />
                {isRegister && (
                  <div className="p-2 bg-black/5 rounded-2xl flex gap-2">
                    <button type="button" onClick={() => setRole('user')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${role === 'user' ? 'bg-black text-white' : 'text-black/40'}`}>عميل</button>
                    <button type="button" onClick={() => setRole('vendor')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${role === 'vendor' ? 'bg-black text-white' : 'text-black/40'}`}>بائع</button>
                  </div>
                )}
                <Button type="submit" className="w-full h-16 rounded-2xl font-black text-lg shadow-soft-primary" disabled={authLoading}>
                  {authLoading ? <Loader2 className="animate-spin" /> : (isRegister ? 'إنشاء حساب جديد' : 'دخول المنصة')}
                </Button>
             </form>
             <button onClick={() => setIsRegister(!isRegister)} className="w-full mt-6 text-xs font-black text-primary hover:underline">{isRegister ? 'لديك حساب بالفعل؟ سجل دخول' : 'ليس لديك حساب؟ انضم كبائع الآن'}</button>
          </div>
        </div>
      )}

      {/* Viewport Rendering */}
      <main className={`${!isMarketplace && userProfile ? 'lg:mr-80' : ''}`}>
        <div className="mx-auto w-full">
          {activeTab === 'home' && <Home user={userProfile} />}
          {activeTab === 'dashboard' && userProfile && <Dashboard user={userProfile} />}
          {activeTab === 'calendar' && userProfile && <CalendarBoard user={userProfile} />}
          {activeTab === 'my_halls' && userProfile && <VendorHalls user={userProfile} />}
          {activeTab === 'my_services' && userProfile && <VendorServices user={userProfile} />}
          {activeTab === 'browse' && <BrowseHalls user={userProfile || ({} as UserProfile)} />}
          {activeTab === 'my_favorites' && userProfile && <Favorites user={userProfile} />}
          {activeTab === 'users' && <UsersManagement />}
          {activeTab === 'subscriptions' && <VendorSubscriptions />}
          {activeTab === 'settings' && <SystemSettings />}
          {activeTab === 'brand_settings' && userProfile && <VendorBrandSettings user={userProfile} onUpdate={fetchProfile} />}
          {['all_bookings', 'hall_bookings', 'my_bookings'].includes(activeTab) && userProfile && <Bookings user={userProfile} />}
        </div>
      </main>

      {/* Conditional Marketplace Login Trigger (Floating Button) */}
      {isMarketplace && !session && (
         <div className="fixed bottom-10 left-10 z-[100] group">
            <Button onClick={() => setShowAuthModal(true)} className="w-20 h-20 rounded-full bg-black text-white shadow-2xl hover:bg-primary transition-all flex items-center justify-center p-0 overflow-hidden relative">
               <LogIn className="w-8 h-8 relative z-10" />
               <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            </Button>
            <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-black text-white px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest shadow-xl">دخول الشركاء</span>
         </div>
      )}
    </div>
  );
};

export default App;
