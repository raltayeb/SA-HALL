
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

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('user');
  const [smtpErrorVisible, setSmtpErrorVisible] = useState(false);

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

  const validatePassword = (pwd: string) => {
    const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return regex.test(pwd);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setSmtpErrorVisible(false);
    
    if (isRegister) {
        if (!validatePassword(password)) {
            setPasswordError('كلمة المرور يجب أن تكون 8 أحرف على الأقل، وتحتوي على حرف كبير، حرف صغير، ورقم.');
            return;
        }
    }

    setLoading(true);
    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role: role }
        }
      });
      if (error) {
        if (error.message.includes('confirmation email')) {
          setSmtpErrorVisible(true);
          toast({ 
            title: 'خطأ في البريد الإلكتروني', 
            description: 'تعذر إرسال بريد التأكيد. يرجى مراجعة إعدادات SMTP في لوحة تحكم Supabase.', 
            variant: 'destructive' 
          });
        } else {
          toast({ title: 'فشل التسجيل', description: error.message, variant: 'destructive' });
        }
      } else {
        toast({ title: 'تم التسجيل بنجاح', description: 'يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.', variant: 'success' });
        setIsRegister(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: 'فشل تسجيل الدخول', description: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', variant: 'destructive' });
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: 'تم تسجيل الخروج', description: 'إلى اللقاء!', variant: 'default' });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-primary animate-pulse">
        <div className="text-2xl font-bold tracking-widest uppercase">SA Hall...</div>
      </div>
    );
  }

  if (!session || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
        <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-2xl transition-all">
          <div className="space-y-2 text-center">
            <h1 className="text-4xl font-black tracking-tighter text-primary">SA Hall</h1>
            <p className="text-muted-foreground font-medium">المنصة السعودية لإدارة وحجز القاعات</p>
          </div>
          
          {smtpErrorVisible && (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl text-xs space-y-2 text-destructive animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>تنبيه لمدير النظام:</span>
              </div>
              <p>فشل إرسال بريد التأكيد. يرجى التأكد من ربط حساب Gmail في إعدادات Supabase SMTP باستخدام كلمة مرور التطبيق الخاصة بك.</p>
              <a href="https://supabase.com/docs/guides/auth/auth-smtp" target="_blank" rel="noreferrer" className="flex items-center gap-1 underline hover:opacity-80">
                <HelpCircle className="w-3 h-3" /> دليل الإعداد
              </a>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <Input 
                placeholder="الاسم الكامل للمستخدم" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required 
                className="rounded-xl h-11"
              />
            )}
            <Input 
              type="email" 
              placeholder="البريد الإلكتروني" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
              className="rounded-xl h-11"
            />
            <Input 
              type="password" 
              placeholder="كلمة المرور" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
              error={passwordError}
              className="rounded-xl h-11"
            />
            
            {isRegister && (
              <div className="p-3 bg-muted/30 rounded-xl space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">نوع الحساب</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer group">
                    <input type="radio" name="role" value="user" checked={role === 'user'} onChange={() => setRole('user')} className="accent-primary" />
                    <span className="group-hover:text-primary transition-colors">مستخدم (حجز)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer group">
                    <input type="radio" name="role" value="vendor" checked={role === 'vendor'} onChange={() => setRole('vendor')} className="accent-primary" />
                    <span className="group-hover:text-primary transition-colors">بائع (قاعات)</span>
                  </label>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-11 rounded-xl text-base font-bold shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? 'جاري التحقق...' : (isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول')}
            </Button>
          </form>
          
          <div className="text-center text-sm">
            <button 
              onClick={() => {
                  setIsRegister(!isRegister);
                  setPasswordError('');
                  setSmtpErrorVisible(false);
              }}
              className="text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              {isRegister ? 'لديك حساب بالفعل؟ سجل دخول' : 'ليس لديك حساب؟ سجل الآن'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isBookingTab = ['all_bookings', 'hall_bookings', 'my_bookings'].includes(activeTab);

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar 
        user={userProfile} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b lg:hidden shadow-sm">
        <h1 className="font-black text-primary text-xl tracking-tighter">SA Hall</h1>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <main className="flex-1 transition-all duration-300 lg:mr-72 p-4 pt-24 lg:p-10">
        <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          {activeTab === 'dashboard' && <Dashboard user={userProfile} />}
          {activeTab === 'my_halls' && userProfile.role === 'vendor' && <VendorHalls user={userProfile} />}
          {activeTab === 'my_services' && userProfile.role === 'vendor' && <VendorServices user={userProfile} />}
          {activeTab === 'browse' && <BrowseHalls user={userProfile} />}
          {activeTab === 'users' && userProfile.role === 'super_admin' && <UsersManagement />}
          {isBookingTab && <Bookings user={userProfile} />}
        </div>
      </main>
    </div>
  );
};

export default App;
