
import React, { useEffect, useState } from 'react';
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
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Menu, Loader2, Bell } from 'lucide-react';
import { useToast } from './context/ToastContext';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [siteSettings, setSiteSettings] = useState<ISystemSettings>({
    site_name: 'SA Hall',
    commission_rate: 0.10,
    vat_enabled: true
  });
  
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('user');

  const fetchSiteSettings = async () => {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
      if (data?.value) setSiteSettings(data.value);
    } catch (err) { console.error(err); }
  };

  const fetchUnreadNotifications = async (userId: string) => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setUnreadNotifications(count || 0);
  };

  useEffect(() => {
    fetchSiteSettings();
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) await fetchProfile(session.user.id);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) await fetchProfile(session.user.id);
      else { setUserProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userProfile?.id) {
      fetchUnreadNotifications(userProfile.id);
      const channel = supabase
        .channel(`notifications:${userProfile.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userProfile.id}` }, (payload) => {
          setUnreadNotifications(prev => prev + 1);
          toast({ title: payload.new.title, description: payload.new.message, variant: 'default' });
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [userProfile?.id]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) setUserProfile(data as UserProfile);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role: role } } });
        if (error) throw error;
        if (data.user && !data.session) toast({ title: 'تفعيل البريد', description: 'يرجى مراجعة بريدك الإلكتروني لتفعيل الحساب.', variant: 'default' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); }
    finally { setAuthLoading(false); }
  };

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-primary gap-4">
      <Loader2 className="w-10 h-10 animate-spin" />
      <p className="font-black text-xl animate-pulse">{siteSettings.site_name}...</p>
    </div>
  );

  if (!session || !userProfile) return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-md space-y-6 rounded-3xl border bg-card p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="space-y-4 text-center relative z-10">
          <img src="/logo.png" alt="Logo" className="w-32 h-auto mx-auto mb-2" onError={(e) => (e.target as any).src = 'https://placehold.co/200x200/9b5de5/ffffff?text=LOGO'} />
          <h1 className="text-4xl font-black text-primary tracking-tighter">{siteSettings.site_name}</h1>
        </div>
        <form onSubmit={handleAuth} className="space-y-4 relative z-10">
          {isRegister && <Input placeholder="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} required />}
          <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required />
          {isRegister && (
            <div className="p-3 bg-muted/30 rounded-xl flex gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="radio" value="user" checked={role === 'user'} onChange={() => setRole('user')} /> مستخدم</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" value="vendor" checked={role === 'vendor'} onChange={() => setRole('vendor')} /> بائع</label>
            </div>
          )}
          <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={authLoading}>
            {authLoading ? <Loader2 className="animate-spin" /> : (isRegister ? 'إنشاء حساب' : 'دخول')}
          </Button>
        </form>
        <button onClick={() => setIsRegister(!isRegister)} className="w-full text-sm font-bold text-primary/80">{isRegister ? 'لديك حساب؟ سجل دخول' : 'ليس لديك حساب؟ انضم لنا'}</button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={() => supabase.auth.signOut()} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} siteName={siteSettings.site_name} />
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b lg:hidden">
        <div className="flex items-center gap-2">
          <h1 className="font-black text-primary text-xl">{siteSettings.site_name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative"><Bell className="w-6 h-6 text-muted-foreground" />{unreadNotifications > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">{unreadNotifications}</span>}</div>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}><Menu /></Button>
        </div>
      </div>
      <main className="flex-1 lg:mr-72 p-4 pt-24 lg:p-10">
        <div className="mx-auto max-w-6xl">
          {activeTab === 'dashboard' && <Dashboard user={userProfile} />}
          {activeTab === 'calendar' && <CalendarBoard user={userProfile} />}
          {activeTab === 'my_halls' && <VendorHalls user={userProfile} />}
          {activeTab === 'my_services' && <VendorServices user={userProfile} />}
          {activeTab === 'browse' && <BrowseHalls user={userProfile} />}
          {activeTab === 'my_favorites' && <Favorites user={userProfile} />}
          {activeTab === 'users' && <UsersManagement />}
          {activeTab === 'subscriptions' && <VendorSubscriptions />}
          {activeTab === 'settings' && <SystemSettings />}
          {['all_bookings', 'hall_bookings', 'my_bookings'].includes(activeTab) && <Bookings user={userProfile} />}
        </div>
      </main>
    </div>
  );
};

export default App;
