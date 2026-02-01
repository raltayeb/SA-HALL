
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
  const [browseMode, setBrowseMode] = useState<'halls' | 'services'>('halls');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const lastFetchedUserId = useRef<string | null>(null);
  
  const [siteSettings, setSiteSettings] = useState<ISystemSettings>({
    site_name: 'قاعه',
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
      document.documentElement.style.setProperty('--primary', '#4B0082');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setActiveTab('home');
  };

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-primary gap-4">
      <div className="text-7xl font-ruqaa animate-pulse">قاعه</div>
      <Loader2 className="w-10 h-10 animate-spin opacity-20" />
    </div>
  );

  const isMarketplace = activeTab === 'home' || activeTab === 'browse';

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white" dir="rtl">
      {/* Sidebar (Admin/Vendor ONLY) */}
      {!isMarketplace && (
        <Sidebar 
          user={userProfile} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogout={handleLogout} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          siteName={siteSettings.site_name}
          platformLogo={siteSettings.platform_logo_url}
        />
      )}

      {/* Auth Modal Overlay - Dark Refinement */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[1000] bg-background/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-white/10 rounded-[1.125rem] p-12 shadow-2xl relative animate-in zoom-in-95 ring-1 ring-white/5">
             <button onClick={() => setShowAuthModal(false)} className="absolute top-8 left-8 p-3 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
             <div className="text-center space-y-4 mb-8">
                <div className="text-6xl font-ruqaa text-primary mx-auto">قاعه</div>
                <h2 className="text-3xl font-black text-foreground">{isRegister ? 'انضم كشريك' : 'تسجيل الدخول'}</h2>
                <p className="text-sm text-muted-foreground font-bold">ابدأ بإدارة قاعاتك وخدماتك باحترافية.</p>
             </div>
             <form onSubmit={handleAuth} className="space-y-4 text-right">
                {isRegister && <Input placeholder="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-14 rounded-xl text-right font-bold bg-muted/20 border-white/5" />}
                <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required className="h-14 rounded-xl text-right font-bold bg-muted/20 border-white/5" />
                <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required className="h-14 rounded-xl text-right font-bold bg-muted/20 border-white/5" />
                {isRegister && (
                  <div className="p-2 bg-muted/20 rounded-xl flex gap-2 border border-white/5">
                    <button type="button" onClick={() => setRole('user')} className={`flex-1 py-3 text-xs font-black rounded-lg transition-all ${role === 'user' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'}`}>عميل</button>
                    <button type="button" onClick={() => setRole('vendor')} className={`flex-1 py-3 text-xs font-black rounded-lg transition-all ${role === 'vendor' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'}`}>بائع</button>
                  </div>
                )}
                <Button type="submit" className="w-full h-16 rounded-xl font-black text-lg shadow-xl shadow-primary/20" disabled={authLoading}>
                  {authLoading ? <Loader2 className="animate-spin" /> : (isRegister ? 'إنشاء حساب جديد' : 'دخول المنصة')}
                </Button>
             </form>
             <button onClick={() => setIsRegister(!isRegister)} className="w-full mt-6 text-xs font-black text-primary hover:underline">{isRegister ? 'لديك حساب بالفعل؟ سجل دخول' : 'ليس لديك حساب؟ انضم كبائع الآن'}</button>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <main className={`${!isMarketplace && userProfile ? 'lg:pr-64' : ''}`}>
        <div className={`mx-auto w-full ${!isMarketplace && userProfile ? 'p-6 lg:p-10' : ''}`}>
          {/* Mobile Menu Trigger */}
          {!isMarketplace && userProfile && (
            <div className="lg:hidden flex justify-start mb-6">
               <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(true)} className="rounded-[1.125rem] border-white/10 bg-card">
                  <Menu className="w-5 h-5 text-primary" />
               </Button>
            </div>
          )}

          {activeTab === 'home' && (
            <Home 
              user={userProfile} 
              onLoginClick={() => setShowAuthModal(true)} 
              onBrowseHalls={() => { setActiveTab('browse'); setBrowseMode('halls'); }}
              onBrowseServices={() => { setActiveTab('browse'); setBrowseMode('services'); }}
              onNavigate={setActiveTab}
              onLogout={handleLogout}
            />
          )}
          {activeTab === 'browse' && (
            <BrowseHalls 
              user={userProfile} 
              mode={browseMode} 
              onBack={() => setActiveTab('home')}
              onLoginClick={() => setShowAuthModal(true)}
              onNavigate={setActiveTab}
              onLogout={handleLogout}
            />
          )}
          {activeTab === 'dashboard' && userProfile && <Dashboard user={userProfile} />}
          {activeTab === 'calendar' && userProfile && <CalendarBoard user={userProfile} />}
          {activeTab === 'my_halls' && userProfile && <VendorHalls user={userProfile} />}
          {activeTab === 'my_services' && userProfile && <VendorServices user={userProfile} />}
          {activeTab === 'my_favorites' && userProfile && <Favorites user={userProfile} />}
          {activeTab === 'users' && <UsersManagement />}
          {activeTab === 'subscriptions' && <VendorSubscriptions />}
          {activeTab === 'settings' && <SystemSettings />}
          {activeTab === 'brand_settings' && userProfile && <VendorBrandSettings user={userProfile} onUpdate={fetchProfile} />}
          {['all_bookings', 'hall_bookings', 'my_bookings'].includes(activeTab) && userProfile && <Bookings user={userProfile} />}
        </div>
      </main>
    </div>
  );
};

export default App;
