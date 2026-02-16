
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Loader2, Eye, EyeOff
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface VendorAuthProps {
    isLogin?: boolean;
    onRegister?: () => void;
    onLogin?: () => void;
    onDataChange?: (data: any) => void;
    onBack?: () => void;
}

export const VendorAuth: React.FC<VendorAuthProps> = ({ isLogin = false, onRegister, onLogin, onDataChange, onBack }) => {
  const [mode, setMode] = useState<'login' | 'register'>(isLogin ? 'login' : 'register');
  const [loading, setLoading] = useState(false);
  const [systemLogo, setSystemLogo] = useState('https://dash.hall.sa/logo.svg');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
      setMode(isLogin ? 'login' : 'register');
  }, [isLogin]);

  useEffect(() => {
      if (onDataChange) {
          onDataChange(formData);
      }
  }, [formData, onDataChange]);

  // Fetch System Logo
  useEffect(() => {
      const fetchLogo = async () => {
          const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
          if (data?.value?.platform_logo_url) {
              setSystemLogo(data.value.platform_logo_url);
          }
      };
      fetchLogo();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!formData.email || !formData.password || !formData.fullName) {
            throw new Error('يرجى تعبئة كافة الحقول المطلوبة');
        }
        
        if (onRegister) {
            onRegister();
        } 

      } else {
        // Login Logic
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        
        toast({ title: 'تم تسجيل الدخول', variant: 'success' });
        if (onLogin) onLogin();
      }
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-tajawal text-right overflow-hidden bg-white" dir="rtl">
        
        {/* Right Column: Auth Form (White Background) */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-24 py-12 bg-white relative">
            <div className="w-full max-w-md space-y-8">
                
                {/* Header */}
                <div className="text-right space-y-2 mb-10">
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                        {mode === 'login' ? 'تسجيل الدخول' : 'انضم كشريك نجاح'}
                    </h2>
                </div>

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-5">
                    {mode === 'register' && (
                        <>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">الاسم</label>
                                <Input 
                                    value={formData.fullName} 
                                    onChange={e => setFormData({...formData, fullName: e.target.value})} 
                                    className="h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">الجوال (يبدأ بـ 05)</label>
                                <Input 
                                    value={formData.phone} 
                                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                                    className="h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20 text-left"
                                    placeholder="05xxxxxxxx"
                                    dir="ltr"
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">البريد الإلكتروني</label>
                        <Input 
                            type="email"
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                            className="h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20 text-left"
                            dir="ltr"
                            required
                        />
                    </div>

                    <div className="space-y-1 relative">
                        <label className="text-xs font-bold text-gray-500">كلمة المرور</label>
                        <div className="relative">
                            <Input 
                                type={showPassword ? "text" : "password"}
                                value={formData.password} 
                                onChange={e => setFormData({...formData, password: e.target.value})} 
                                className="h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20"
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button 
                            disabled={loading} 
                            className="w-full h-12 rounded-lg font-black text-base bg-primary text-white hover:bg-primary/90 transition-all shadow-none"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? 'دخول للمنصة' : 'تسجيل')}
                        </Button>
                    </div>
                </form>

                {/* Footer Links */}
                <div className="space-y-4 pt-4 text-center">
                    {mode === 'login' ? (
                        <>
                            <div className="flex flex-col gap-2 text-sm font-bold text-primary">
                                <a href="/guest-login" onClick={(e) => { e.preventDefault(); /* Navigate to guest login */ }} className="hover:underline">دخول الضيوف</a>
                                <button onClick={() => setMode('register')} className="hover:underline">انضم كشريك الآن</button>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm font-bold text-gray-500">
                            لديك حساب؟ <button onClick={() => setMode('login')} className="text-primary hover:underline">تسجيل الدخول</button>
                        </p>
                    )}
                    
                    <div className="pt-8">
                        <button onClick={onBack} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
                            العودة للرئيسية
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Left Column: Branding (Solid Purple) */}
        <div className="hidden md:flex md:w-1/2 bg-primary items-center justify-center relative overflow-hidden">
            {/* Background Pattern (Optional subtle texture) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}>
            </div>

            <div className="relative z-10 text-center">
                <img 
                    src={systemLogo} 
                    className="h-64 w-auto mx-auto mb-6 invert brightness-0 filter drop-shadow-xl object-contain" 
                    alt="Logo" 
                />
                
                {/* Decorative Dots/Elements similar to screenshot */}
                <div className="flex flex-col items-center gap-1 mt-4 opacity-50">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
            </div>
        </div>

    </div>
  );
};
