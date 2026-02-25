
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Loader2, Eye, EyeOff, Mail, Lock, Check, ShieldCheck, Smartphone
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { normalizeNumbers, isValidSaudiPhone } from '../utils/helpers';
import { sendSMSOTP, verifySMSOTP } from '../services/smsService';

interface VendorAuthProps {
    isLogin?: boolean;
    onRegister?: () => void;
    onLogin?: () => void;
    onDataChange?: (data: any) => void;
    onBack?: () => void;
    onForgotPassword?: () => void;
}

export const VendorAuth: React.FC<VendorAuthProps> = ({ isLogin = false, onRegister, onLogin, onDataChange, onBack, onForgotPassword }) => {
  const [mode, setMode] = useState<'login' | 'register'>(isLogin ? 'login' : 'register');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [regStep, setRegStep] = useState(1); // 1: Info, 2: OTP, 3: Password
  const [loading, setLoading] = useState(false);
  const [systemLogo, setSystemLogo] = useState('https://dash.hall.sa/logo.svg');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    otp: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password Requirements State
  const passwordRequirements = [
      { id: 'len', label: '8 أحرف على الأقل', valid: formData.password.length >= 8 },
      { id: 'num', label: 'يحتوي على رقم واحد على الأقل', valid: /\d/.test(formData.password) },
      { id: 'sym', label: 'يحتوي على رمز خاص (!@#$)', valid: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) },
      { id: 'match', label: 'تطابق كلمتي المرور', valid: formData.password.length > 0 && formData.password === formData.confirmPassword }
  ];

  useEffect(() => {
      setMode(isLogin ? 'login' : 'register');
      setRegStep(1);
  }, [isLogin]);

  useEffect(() => {
      if (onDataChange) {
          onDataChange(formData);
      }
  }, [formData, onDataChange]);

  useEffect(() => {
      const fetchLogo = async () => {
          const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
          if (data?.value?.platform_logo_url) {
              setSystemLogo(data.value.platform_logo_url);
          }
      };
      fetchLogo();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        if (loginMethod === 'otp') {
            // Check if using phone or email
            const isPhone = formData.phone && isValidSaudiPhone(normalizeNumbers(formData.phone));
            
            if (isPhone) {
                const normalizedPhone = normalizeNumbers(formData.phone);
                // Send OTP via SMS using Supabase
                const { error } = await sendSMSOTP(normalizedPhone);
                if (error) throw error;
                toast({ title: 'تم الإرسال', description: 'تم إرسال رمز التحقق إلى رقم جوالك', variant: 'success' });
            } else {
                // Send OTP via email
                const { error } = await supabase.auth.signInWithOtp({ email: formData.email });
                if (error) throw error;
                toast({ title: 'تم الإرسال', description: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني', variant: 'success' });
            }
            setRegStep(2); // OTP verification step
        } else {
            // Password login
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

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
        // Check if using phone or email
        const isPhone = formData.phone && isValidSaudiPhone(normalizeNumbers(formData.phone));
        
        if (isPhone) {
            const normalizedPhone = normalizeNumbers(formData.phone);
            const { error } = await verifySMSOTP(normalizedPhone, normalizeNumbers(formData.otp));
            if (error) throw error;
        } else {
            const { error } = await supabase.auth.verifyOtp({
                email: formData.email,
                token: normalizeNumbers(formData.otp),
                type: 'magiclink'
            });
            if (error) throw error;
        }
        
        toast({ title: 'تم تسجيل الدخول', variant: 'success' });
        if (onLogin) onLogin();
    } catch (err: any) {
        toast({ title: 'رمز خاطئ', description: 'تأكد من الرمز وحاول مرة أخرى', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  const handleRegisterStep1 = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.fullName || !formData.email || !formData.phone) {
          toast({ title: 'ناقص البيانات', description: 'يرجى تعبئة جميع الحقول', variant: 'destructive' });
          return;
      }
      
      const normalizedPhone = normalizeNumbers(formData.phone);
      if (!isValidSaudiPhone(normalizedPhone)) {
          toast({ title: 'رقم جوال غير صالح', description: 'يرجى إدخال رقم سعودي صحيح', variant: 'destructive' });
          return;
      }

      setLoading(true);
      try {
          const { error } = await supabase.auth.signInWithOtp({
              email: formData.email,
              options: {
                  data: {
                      full_name: formData.fullName,
                      phone_number: normalizedPhone,
                      role: 'vendor'
                  }
              }
          });
          if (error) throw error;
          
          toast({ title: 'تم الإرسال', description: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.', variant: 'success' });
          setRegStep(2);
      } catch (err: any) {
          toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
      } finally {
          setLoading(false);
      }
  };

  const handleRegisterStep2 = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          const { error } = await supabase.auth.verifyOtp({
              email: formData.email,
              token: normalizeNumbers(formData.otp),
              type: 'email'
          });
          if (error) throw error;
          
          toast({ title: 'تم التحقق', variant: 'success' });
          setRegStep(3);
      } catch (err: any) {
          toast({ title: 'خطأ في الرمز', description: 'تأكد من الرمز وحاول مرة أخرى.', variant: 'destructive' });
      } finally {
          setLoading(false);
      }
  };

  const handleRegisterStep3 = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const allValid = passwordRequirements.every(r => r.valid);
      if (!allValid) {
          toast({ title: 'كلمة المرور غير قوية', description: 'يرجى تحقيق كافة شروط كلمة المرور.', variant: 'warning' });
          return;
      }

      setLoading(true);
      try {
          const { error } = await supabase.auth.updateUser({ password: formData.password });
          if (error) throw error;

          toast({ title: 'تم إنشاء الحساب', description: 'جاري توجيهك لاختيار نوع النشاط...', variant: 'success' });
          
          if (onRegister) onRegister();
      } catch (err: any) {
          toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-tajawal text-right bg-white" dir="rtl">
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-4 py-8 bg-white">
            <div className="w-full max-w-md space-y-6">

                <div className="text-right space-y-2 mb-6">
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                        {mode === 'login' ? 'تسجيل الدخول' : regStep === 1 ? 'انضم كشريك نجاح' : regStep === 2 ? 'تفعيل الحساب' : 'تأمين الحساب'}
                    </h2>
                </div>

                {mode === 'login' && (
                    <>
                        {regStep === 1 ? (
                            <>
                                <div className="flex gap-2 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setLoginMethod('password')}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                            loginMethod === 'password'
                                                ? 'bg-primary text-white'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        كلمة المرور
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLoginMethod('otp')}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                            loginMethod === 'otp'
                                                ? 'bg-primary text-white'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        رمز التحقق
                                    </button>
                                </div>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    {loginMethod === 'otp' && (
                                        <div className="flex gap-2 mb-2">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({...formData, phone: ''})}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                                    !formData.phone
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            >
                                                📧 البريد الإلكتروني
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({...formData, phone: '05'})}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                                    formData.phone
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            >
                                                📱 رقم الجوال
                                            </button>
                                        </div>
                                    )}
                                    {loginMethod === 'otp' && formData.phone ? (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500">رقم الجوال</label>
                                            <Input 
                                                value={formData.phone} 
                                                onChange={e => setFormData({...formData, phone: normalizeNumbers(e.target.value)})} 
                                                className="h-11 rounded-lg border-gray-200 focus:border-primary text-left" 
                                                dir="ltr" 
                                                placeholder="05xxxxxxxx"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500">البريد الإلكتروني</label>
                                            <Input 
                                                type="email" 
                                                value={formData.email} 
                                                onChange={e => setFormData({...formData, email: e.target.value})} 
                                                className="h-11 rounded-lg border-gray-200 focus:border-primary text-left" 
                                                dir="ltr" 
                                                required 
                                            />
                                        </div>
                                    )}
                                    {loginMethod === 'password' && (
                                        <div className="space-y-1 relative">
                                            <label className="text-xs font-bold text-gray-500">كلمة المرور</label>
                                            <div className="relative">
                                                <Input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="h-11 rounded-lg border-gray-200 focus:border-primary" required />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <div className="flex justify-end">
                                                <button type="button" onClick={onForgotPassword} className="text-xs text-primary hover:underline">نسيت كلمة المرور؟</button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="pt-2">
                                        <Button disabled={loading} className="w-full h-11 rounded-lg font-black text-base bg-primary text-white hover:bg-primary/90">
                                            {loading ? <Loader2 className="animate-spin" /> : (loginMethod === 'otp' ? 'إرسال الرمز' : 'دخول للمنصة')}
                                        </Button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="space-y-4 text-center">
                                <div className="flex flex-col items-center justify-center space-y-2">
                                    <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                        {formData.phone ? <Smartphone className="w-7 h-7" /> : <Mail className="w-7 h-7" />}
                                    </div>
                                    <p className="text-sm text-gray-500">تم إرسال رمز التحقق إلى <b>{formData.phone || formData.email}</b></p>
                                </div>
                                <Input value={formData.otp} onChange={e => setFormData({...formData, otp: normalizeNumbers(e.target.value)})} className="h-12 text-center text-xl font-black tracking-widest rounded-xl border-2 focus:border-primary" placeholder="------" maxLength={6} />
                                <div className="flex gap-2">
                                    <Button onClick={handleVerifyOtp} disabled={loading} className="flex-1 h-11 rounded-lg font-black text-base bg-primary text-white hover:bg-primary/90">
                                        {loading ? <Loader2 className="animate-spin" /> : 'تحقق ودخول'}
                                    </Button>
                                    <Button onClick={() => setRegStep(1)} variant="outline" className="flex-1 h-11 rounded-lg font-bold text-base border-gray-200">
                                        عودة
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {mode === 'register' && regStep === 1 && (
                    <form onSubmit={handleRegisterStep1} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">الاسم</label>
                            <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="h-12 rounded-lg border-gray-200" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">الجوال (يبدأ بـ 05)</label>
                            <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-12 rounded-lg border-gray-200 text-left" placeholder="05xxxxxxxx" dir="ltr" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">البريد الإلكتروني</label>
                            <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-12 rounded-lg border-gray-200 text-left" dir="ltr" required />
                        </div>
                        <div className="pt-4">
                            <Button disabled={loading} className="w-full h-12 rounded-lg font-black text-base bg-primary text-white hover:bg-primary/90">
                                {loading ? <Loader2 className="animate-spin" /> : 'إرسال كود التفعيل'}
                            </Button>
                        </div>
                    </form>
                )}

                {mode === 'register' && regStep === 2 && (
                    <form onSubmit={handleRegisterStep2} className="space-y-6 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Mail className="w-8 h-8" /></div>
                            <p className="text-sm text-gray-500">تم إرسال رمز التحقق إلى <b>{formData.email}</b></p>
                        </div>
                        <Input value={formData.otp} onChange={e => setFormData({...formData, otp: normalizeNumbers(e.target.value)})} className="h-14 text-center text-2xl font-black tracking-widest rounded-xl border-2 focus:border-primary" placeholder="------" maxLength={6} />
                        <Button disabled={loading} className="w-full h-12 rounded-lg font-black text-base bg-primary text-white hover:bg-primary/90">
                            {loading ? <Loader2 className="animate-spin" /> : 'تحقق'}
                        </Button>
                        <button type="button" onClick={() => setRegStep(1)} className="text-xs text-gray-400 hover:text-primary">تغيير البريد الإلكتروني</button>
                    </form>
                )}

                {mode === 'register' && regStep === 3 && (
                    <form onSubmit={handleRegisterStep3} className="space-y-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4"><ShieldCheck className="w-8 h-8" /></div>
                            <p className="text-sm text-gray-500 font-bold">يرجى إنشاء كلمة مرور قوية لحماية حسابك</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-1 relative">
                                <label className="text-xs font-bold text-gray-500">كلمة المرور الجديدة</label>
                                <div className="relative">
                                    <Input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="h-12 rounded-lg border-gray-200 focus:border-primary pr-10" placeholder="••••••••" required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 relative">
                                <label className="text-xs font-bold text-gray-500">تأكيد كلمة المرور</label>
                                <div className="relative">
                                    <Input type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="h-12 rounded-lg border-gray-200 focus:border-primary pr-10" placeholder="••••••••" required />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">متطلبات الأمان:</p>
                            {passwordRequirements.map((req) => (
                                <div key={req.id} className="flex items-center gap-2 text-xs font-bold transition-colors duration-300">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${req.valid ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                        {req.valid ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>}
                                    </div>
                                    <span className={req.valid ? 'text-green-600' : 'text-gray-500'}>{req.label}</span>
                                </div>
                            ))}
                        </div>

                        <Button disabled={loading} className="w-full h-12 rounded-lg font-black text-base bg-primary text-white hover:bg-primary/90">
                            {loading ? <Loader2 className="animate-spin" /> : 'إنشاء الحساب ومتابعة'}
                        </Button>
                    </form>
                )}

                <div className="space-y-4 pt-4 text-center">
                    {mode === 'login' ? (
                        <>
                            <div className="flex flex-col gap-2 text-sm font-bold text-primary">
                                <button onClick={onForgotPassword} className="hover:underline">نسيت كلمة المرور؟</button>
                                <button onClick={() => { setMode('register'); setRegStep(1); }} className="hover:underline">انضم كشريك الآن</button>
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

        <div className="hidden md:flex md:w-1/2 bg-primary items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            <div className="relative z-10 text-center">
                <img src={systemLogo} className="h-64 w-auto mx-auto mb-6 invert brightness-0 filter drop-shadow-xl object-contain" alt="Logo" />
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
