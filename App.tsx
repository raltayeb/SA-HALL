
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile } from './types';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { VendorHalls } from './pages/VendorHalls';
import { VendorServices } from './pages/VendorServices';
import { BrowseHalls } from './pages/BrowseHalls';
import { UsersManagement } from './pages/UsersManagement';
import { Bookings } from './pages/Bookings';
import { VendorSubscriptions } from './pages/VendorSubscriptions';
import { SystemSettings } from './pages/SystemSettings';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Menu, AlertCircle, HelpCircle } from 'lucide-react';
import { useToast } from './context/ToastContext';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('user');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      setUserProfile(data as UserProfile);
    }
    setLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: role } }
      });
      if (error) toast({ title: 'فشل التسجيل', description: error.message, variant: 'destructive' });
      else setIsRegister(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast({ title: 'فشل تسجيل الدخول', description: 'البيانات غير صحيحة', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: 'تم تسجيل الخروج', description: 'نراك قريباً!', variant: 'default' });
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-background text-primary animate-pulse font-black text-xl">SA HALL SaaS...</div>;

  if (!session || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
        <div className="w-full max-w-md space-y-6 rounded-3xl border bg-card p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="space-y-4 text-center relative z-10">
            <img 
              src="/logo.png" 
              alt="SA Hall" 
              className="w-32 h-auto mx-auto mb-2"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/9b5de5/ffffff?text=SA+HALL';
              }}
            />
            <h1 className="text-4xl font-black tracking-tighter text-primary">SA Hall</h1>
            <p className="text-muted-foreground font-medium text-sm">Wedding Hall Saudi Arabia | SaaS Solution</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4 relative z-10">
            {isRegister && <Input placeholder="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} required />}
            <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required />
            {isRegister && (
              <div className="p-3 bg-muted/30 rounded-xl space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">نوع الحساب</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="role" value="user" checked={role === 'user'} onChange={() => setRole('user')} /> مستخدم</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="role" value="vendor" checked={role === 'vendor'} onChange={() => setRole('vendor')} /> بائع</label>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20">{isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</Button>
          </form>
          <div className="text-center relative z-10"><button onClick={() => setIsRegister(!isRegister)} className="text-sm font-bold text-primary/80 hover:text-primary transition-colors underline-offset-4 hover:underline">{isRegister ? 'لديك حساب؟ سجل دخول' : 'ليس لديك حساب؟ انضم إلينا الآن'}</button></div>
        </div>
      </div>
    );
  }

  const isBookingTab = ['all_bookings', 'hall_bookings', 'my_bookings'].includes(activeTab);

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar 
        user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} 
        onLogout={handleLogout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}
      />
      
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/logo.png" className="w-10 h-auto" alt="Logo" onError={(e) => (e.target as any).style.display = 'none'} />
          <h1 className="font-black text-primary text-xl tracking-tighter">SA Hall</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}><Menu /></Button>
      </div>

      <main className="flex-1 lg:mr-72 p-4 pt-24 lg:p-10">
        <div className="mx-auto max-w-6xl animate-in fade-in duration-700">
          {activeTab === 'dashboard' && <Dashboard user={userProfile} />}
          {activeTab === 'my_halls' && <VendorHalls user={userProfile} />}
          {activeTab === 'my_services' && <VendorServices user={userProfile} />}
          {activeTab === 'browse' && <BrowseHalls user={userProfile} />}
          {activeTab === 'users' && <UsersManagement />}
          {activeTab === 'subscriptions' && <VendorSubscriptions />}
          {activeTab === 'settings' && <SystemSettings />}
          {isBookingTab && <Bookings user={userProfile} />}
        </div>
      </main>
    </div>
  );
};

export default App;
