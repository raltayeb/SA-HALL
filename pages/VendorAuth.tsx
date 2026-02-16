
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Loader2, Mail, Lock, Building2, User, ArrowRight, ShieldCheck, Zap
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
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    businessName: '',
  });

  useEffect(() => {
      setMode(isLogin ? 'login' : 'register');
  }, [isLogin]);

  useEffect(() => {
      if (onDataChange) {
          onDataChange(formData);
      }
  }, [formData, onDataChange]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!formData.email || !formData.password || !formData.fullName) {
            throw new Error('يرجى تعبئة كافة الحقول المطلوبة');
        }
        
        // Check if user already exists (optional, mostly handled by auth provider)
        // If successful, trigger onRegister to move to next step in parent
        if (onRegister) {
            // Note: Actual signup happens in later steps or here depending on flow. 
            // Based on App.tsx, we just collect info here and move to step 3.
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
        
        {/* Right Column: Auth Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-20 py-12 relative bg-white">
            {onBack && (
                <button 
                    onClick={onBack} 
                    className="absolute top-8 right-8 text-gray-400 hover:text-primary flex items-center gap-2 font-bold text-xs transition-colors"
                >
                    <ArrowRight className="w-4 h-4" /> العودة
                </button>
            )}

            <div className="max-w-md w-full mx-auto space-y-10">
                <div className="space-y-3">
                    <h3 className="text-4xl font-black text-gray-900 tracking-tight">
                        {mode === 'login' ? 'تسجيل الدخول' : 'شريك جديد'}
                    </h3>
                    <p className="text-gray-400 font-bold text-sm">
                        {mode === 'login' ? 'مرحباً بك مجدداً في منصة القاعة.' : 'سجل بياناتك الأولية للبدء في إعداد حسابك.'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-5">
                    {mode === 'register' && (
                        <>
                            <Input 
                                label="الاسم الكامل" 
                                value={formData.fullName} 
                                onChange={e => setFormData({...formData, fullName: e.target.value})} 
                                icon={<User className="w-4 h-4" />}
                                className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-primary/20"
                                required
                            />
                            <Input 
                                label="اسم المنشأة (مبدئي)" 
                                value={formData.businessName} 
                                onChange={e => setFormData({...formData, businessName: e.target.value})} 
                                icon={<Building2 className="w-4 h-4" />}
                                className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-primary/20"
                            />
                        </>
                    )}

                    <Input 
                        label="البريد الإلكتروني" 
                        type="email"
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})} 
                        icon={<Mail className="w-4 h-4" />}
                        className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-primary/20"
                        required
                    />

                    <Input 
                        label="كلمة المرور" 
                        type="password"
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        icon={<Lock className="w-4 h-4" />}
                        className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-primary/20"
                        required
                    />

                    <Button 
                        disabled={loading} 
                        className="w-full h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/10 mt-4 bg-primary text-white hover:opacity-90 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? 'دخول' : 'متابعة التسجيل')}
                    </Button>
                </form>

                <div className="text-center pt-6 border-t border-gray-50">
                    <p className="text-gray-500 font-bold text-sm">
                        {mode === 'login' ? 'ليس لديك حساب بائع؟' : 'لديك حساب بائع بالفعل؟'}
                        <button 
                            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                            className="text-primary mr-2 font-black hover:underline"
                        >
                            {mode === 'login' ? 'سجل الآن' : 'سجل دخولك هنا'}
                        </button>
                    </p>
                </div>
            </div>
        </div>

        {/* Left Column: Branding */}
        <div className="hidden md:flex md:w-1/2 bg-primary relative items-center justify-center p-12 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-white/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-black/10 rounded-full blur-[100px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-5 pointer-events-none">
                     <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)" /></svg>
                </div>
            </div>

            <div className="relative z-10 text-center space-y-8 max-w-sm">
                <div className="bg-white/10 backdrop-blur-md p-8 rounded-[3rem] border border-white/20 shadow-2xl">
                    <img src="https://dash.hall.sa/logo.svg" className="h-24 w-auto mx-auto mb-6 invert brightness-0" alt="Logo" />
                    <h1 className="text-4xl font-ruqaa text-white mb-2">القاعة</h1>
                    <div className="h-1 w-12 bg-white/30 mx-auto rounded-full"></div>
                </div>
                
                <div className="space-y-4">
                    <h2 className="text-2xl font-black text-white">شريكك في إدارة المناسبات</h2>
                    <p className="text-white/70 font-medium leading-relaxed">
                        نظام متكامل لإدارة الحجوزات، الفوترة الإلكترونية، والمخزون في مكان واحد.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-8">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm text-center">
                        <ShieldCheck className="w-6 h-6 text-white/80 mx-auto mb-2" />
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">فوترة معتمدة</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm text-center">
                        <Zap className="w-6 h-6 text-white/80 mx-auto mb-2" />
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">تحديث لحظي</p>
                    </div>
                </div>
            </div>
        </div>

    </div>
  );
};
