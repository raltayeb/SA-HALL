
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
import { VendorBrandSettings } from './pages/VendorBrandSettings';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Menu, Loader2, Bell, X, Building2 } from 'lucide-react';
import { useToast } from './context/ToastContext';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
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

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    setNotifications(data || []);
  };

  const markAsRead = async (notifId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
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

    window.addEventListener('settingsUpdated', fetchSiteSettings);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('settingsUpdated', fetchSiteSettings);
    };
  }, []);

  useEffect(() => {
    if (userProfile?.id) {
      fetchNotifications(userProfile.id);
      const channel = supabase
        .channel(`notifications:${userProfile.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userProfile.id}` }, (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-primary gap-4">
      <Loader2 className="w-10 h-10 animate-spin" />
      <p className="font-black text-xl animate-pulse">{siteSettings.site_name}...</p>
    </div>
  );

  if (!session || !userProfile) return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-md space-y-6 rounded-[2.5rem] border bg-card p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="space-y-4 text-center relative z-10">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto border border-primary/20 shadow-inner">
            <Building2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-primary tracking-tighter">{siteSettings.site_name}</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">منصة حجز القاعات الذكية</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4 relative z-10">
          {isRegister && <Input placeholder="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-12 rounded-2xl" />}
          <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 rounded-2xl" />
          <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-2xl" />
          {isRegister && (
            <div className="p-2 bg-muted/30 rounded-2xl flex gap-2">
              <button type="button" onClick={() => setRole('user')} className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${role === 'user' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'}`}>مستخدم</button>
              <button type="button" onClick={() => setRole('vendor')} className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${role === 'vendor' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'}`}>بائع</button>
            </div>
          )}
          <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/25" disabled={authLoading}>
            {authLoading ? <Loader2 className="animate-spin" /> : (isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول')}
          </Button>
        </form>
        <button onClick={() => setIsRegister(!isRegister)} className="w-full text-xs font-black text-primary/80 hover:text-primary transition-colors tracking-widest uppercase">{isRegister ? 'لديك حساب؟ ادخل هنا' : 'لا تملك حساب؟ انضم للمنصة'}</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Sidebar 
        user={userProfile} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={() => supabase.auth.signOut()} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        siteName={siteSettings.site_name}
        platformLogo={(siteSettings as any).platform_logo_url}
      />
      
      <div className="fixed top-6 left-6 z-40 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden bg-card border shadow-xl rounded-full w-12 h-12" onClick={() => setIsSidebarOpen(true)}>
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`bg-card border shadow-xl rounded-full w-12 h-12 relative transition-all active:scale-95 ${showNotifDropdown ? 'ring-2 ring-primary border-primary' : ''}`} 
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
          >
            <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-primary text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-card shadow-lg animate-pulse">
                {unreadCount}
              </span>
            )}
          </Button>
          
          {showNotifDropdown && (
            <div className="absolute left-0 mt-4 w-80 bg-card border shadow-2xl rounded-[2.5rem] overflow-hidden z-50 animate-in fade-in zoom-in-95 origin-top-left p-2">
              <div className="p-5 border-b border-border/40 flex justify-between items-center bg-muted/20 rounded-t-[1.5rem]">
                <h4 className="font-black text-sm text-right w-full">التنبيهات</h4>
                <button onClick={() => setShowNotifDropdown(false)} className="p-1 hover:bg-muted rounded-full transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="max-h-96 overflow-y-auto no-scrollbar py-2">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center text-[11px] text-muted-foreground italic font-bold">هدوء تام.. لا يوجد تنبيهات</div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => { markAsRead(n.id); if(n.action_url) setActiveTab(n.action_url); setShowNotifDropdown(false); }} 
                      className={`mx-2 my-1 p-4 rounded-2xl hover:bg-muted/50 transition-all cursor-pointer group relative ${!n.is_read ? 'bg-primary/5 border-r-4 border-primary' : 'bg-transparent opacity-70'}`}
                    >
                      <p className="text-[12px] font-black group-hover:text-primary transition-colors text-right">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed text-right">{n.message}</p>
                      <span className="text-[9px] text-muted-foreground mt-2 block opacity-40 font-bold text-right">{new Date(n.created_at).toLocaleTimeString('ar-SA')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="lg:mr-80 p-6 lg:p-10 min-h-screen">
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
          {activeTab === 'brand_settings' && <VendorBrandSettings user={userProfile} onUpdate={fetchProfile} />}
          {['all_bookings', 'hall_bookings', 'my_bookings'].includes(activeTab) && <Bookings user={userProfile} />}
        </div>
      </main>
    </div>
  );
};

export default App;
