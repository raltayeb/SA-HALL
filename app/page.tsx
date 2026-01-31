'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';
import { Sidebar } from '../components/Layout/Sidebar';
import { Dashboard } from '../pages/Dashboard';
import { VendorHalls } from '../pages/VendorHalls';
import { BrowseHalls } from '../pages/BrowseHalls';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth State
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
        options: {
          data: { full_name: fullName, role: role }
        }
      });
      if (error) alert(error.message);
      else alert('تم التسجيل! يرجى التحقق من بريدك الإلكتروني.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-primary animate-pulse">
        <div className="text-2xl font-bold">SA Hall...</div>
      </div>
    );
  }

  // Auth Screen
  if (!session || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
        <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tighter text-primary">SA Hall</h1>
            <p className="text-muted-foreground">منصة حجز القاعات السعودية الموحدة</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <Input 
                placeholder="الاسم الكامل" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required 
              />
            )}
            <Input 
              type="email" 
              placeholder="البريد الإلكتروني" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
            />
            <Input 
              type="password" 
              placeholder="كلمة المرور" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />
            
            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium">نوع الحساب</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="role" value="user" checked={role === 'user'} onChange={() => setRole('user')} />
                    مستخدم (بحث وحجز)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="role" value="vendor" checked={role === 'vendor'} onChange={() => setRole('vendor')} />
                    مالك قاعة (بائع)
                  </label>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'جاري المعالجة...' : (isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول')}
            </Button>
          </form>
          
          <div className="text-center text-sm">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-primary hover:underline underline-offset-4"
            >
              {isRegister ? 'لديك حساب بالفعل؟ سجل دخول' : 'ليس لديك حساب؟ سجل الآن'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main App Layout
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar 
        user={userProfile} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b lg:hidden">
        <h1 className="font-bold text-lg">SA Hall</h1>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
          <span className="text-xl">☰</span>
        </Button>
      </div>

      <main className="flex-1 transition-all duration-300 lg:mr-72 p-4 pt-20 lg:p-8">
        <div className="mx-auto max-w-6xl animate-in fade-in zoom-in-95 duration-500">
          {activeTab === 'dashboard' && <Dashboard user={userProfile} />}
          {activeTab === 'my_halls' && userProfile.role === 'vendor' && <VendorHalls user={userProfile} />}
          {activeTab === 'browse' && <BrowseHalls user={userProfile} />}
          
          {/* Placeholders for other tabs */}
          {(activeTab === 'all_bookings' || activeTab === 'hall_bookings' || activeTab === 'my_bookings') && (
            <div className="text-center py-20 text-muted-foreground">
              <span className="text-4xl block mb-4">🚧</span>
              <h2 className="text-xl font-bold mb-2">قسم الحجوزات قيد التطوير</h2>
              <p>سيتم عرض تفاصيل الحجوزات والفواتير المتوافقة مع هيئة الزكاة هنا.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}