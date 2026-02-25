
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader2, ArrowRight, Mail, KeyRound, CheckCircle, Smartphone } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { normalizeNumbers, isValidSaudiPhone } from '../utils/helpers';
import { sendSMSOTP, verifySMSOTP } from '../services/smsService';

interface ForgotPasswordProps {
    onBack: () => void;
    onSuccess: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [usePhone, setUsePhone] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleSendOtp = async () => {
    setLoading(true);
    try {
        if (usePhone) {
            // Phone-based password reset
            const normalizedPhone = normalizeNumbers(phone);
            
            if (!normalizedPhone || !isValidSaudiPhone(normalizedPhone)) {
                toast({ title: 'رقم غير صالح', description: 'يرجى إدخال رقم سعودي صحيح (يبدأ بـ 05).', variant: 'destructive' });
                setLoading(false);
                return;
            }
            
            // Send OTP via SMS
            const { error } = await sendSMSOTP(normalizedPhone);
            if (error) throw error;

            toast({ title: 'تم الإرسال', description: 'تم إرسال رمز التحقق إلى رقم جوالك.', variant: 'success' });
        } else {
            // Email-based password reset
            if (!email || !email.includes('@')) {
                toast({ title: 'بريد غير صالح', description: 'يرجى إدخال بريد إلكتروني صحيح.', variant: 'destructive' });
                setLoading(false);
                return;
            }
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/forgot-password',
            });
            if (error) throw error;

            toast({ title: 'تم الإرسال', description: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.', variant: 'success' });
        }
        setStep(2);
    } catch (err: any) {
        console.error(err);
        toast({ title: 'خطأ', description: err.message || 'حدث خطأ أثناء محاولة الإرسال.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
        toast({ title: 'أدخل الرمز', description: 'يرجى إدخال رمز التحقق.', variant: 'destructive' });
        return;
    }

    setLoading(true);
    try {
        if (usePhone) {
            // Verify phone OTP
            const normalizedPhone = normalizeNumbers(phone);
            const { error } = await verifySMSOTP(normalizedPhone, normalizeNumbers(otp));
            if (error) throw error;
        } else {
            // Verify email OTP
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: normalizeNumbers(otp),
                type: 'magiclink'
            });
            if (error) throw error;
        }

        toast({ title: 'تم التحقق', description: 'تم التحقق بنجاح، يرجى إنشاء كلمة مرور جديدة.', variant: 'success' });
        setStep(3);
    } catch (err: any) {
        console.error(err);
        toast({ title: 'رمز خاطئ', description: 'تأكد من الرمز وحاول مرة أخرى.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
        toast({ title: 'كلمة مرور ضعيفة', description: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.', variant: 'destructive' });
        return;
    }

    if (newPassword !== confirmPassword) {
        toast({ title: 'عدم تطابق', description: 'كلمتا المرور غير متطابقتين.', variant: 'destructive' });
        return;
    }

    setLoading(true);
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        toast({ title: 'تم التغيير', description: 'تم تغيير كلمة المرور بنجاح.', variant: 'success' });
        onSuccess();
    } catch (err: any) {
        console.error(err);
        toast({ title: 'خطأ', description: err.message || 'حدث خطأ أثناء تغيير كلمة المرور.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-tajawal text-right" dir="rtl">
        <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-2 font-bold text-xs">
                <ArrowRight className="w-4 h-4" /> العودة لتسجيل الدخول
            </button>

            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    {usePhone ? <Smartphone className="w-8 h-8 text-primary" /> : <Mail className="w-8 h-8 text-primary" />}
                </div>
                <h2 className="text-2xl font-black text-primary">استعادة كلمة المرور</h2>
                <p className="text-gray-500 font-bold mt-2 text-sm">أدخل {usePhone ? 'رقم جوالك' : 'بريدك الإلكتروني'} لاستلام رمز التحقق</p>
            </div>

            {step === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right">
                    <div className="flex gap-2 mb-2">
                        <button
                            type="button"
                            onClick={() => setUsePhone(false)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                !usePhone
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            📧 البريد الإلكتروني
                        </button>
                        <button
                            type="button"
                            onClick={() => setUsePhone(true)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                usePhone
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            📱 رقم الجوال
                        </button>
                    </div>
                    {usePhone ? (
                        <Input
                            label="رقم الجوال"
                            value={phone}
                            onChange={e => setPhone(normalizeNumbers(e.target.value))}
                            className="h-12 rounded-xl"
                            placeholder="05xxxxxxxx"
                            dir="ltr"
                        />
                    ) : (
                        <Input
                            label="البريد الإلكتروني"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            icon={<Mail className="w-4 h-4" />}
                            className="h-12 rounded-xl"
                            placeholder="example@email.com"
                            dir="ltr"
                        />
                    )}
                    <Button onClick={handleSendOtp} disabled={loading} className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20">
                        {loading ? <Loader2 className="animate-spin" /> : 'إرسال رمز التحقق'}
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
                        <KeyRound className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-gray-500">أدخل الرمز المرسل إلى <b className="text-gray-700">{usePhone ? phone : email}</b></p>
                    <Input
                        placeholder="------"
                        value={otp}
                        onChange={e => setOtp(normalizeNumbers(e.target.value))}
                        className="h-14 rounded-xl text-center text-2xl font-black tracking-widest"
                        maxLength={6}
                    />
                    <Button onClick={handleVerifyOtp} disabled={loading} className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20">
                        {loading ? <Loader2 className="animate-spin" /> : 'تحقق'}
                    </Button>
                    <button onClick={() => setStep(1)} className="text-xs font-bold text-gray-400 hover:text-gray-600">تغيير البريد</button>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-gray-500">يرجى إنشاء كلمة مرور جديدة</p>
                    </div>

                    <div className="space-y-4">
                        <Input
                            label="كلمة المرور الجديدة"
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="h-12 rounded-xl"
                            placeholder="••••••••"
                        />
                        <Input
                            label="تأكيد كلمة المرور"
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="h-12 rounded-xl"
                            placeholder="••••••••"
                        />
                    </div>

                    <Button onClick={handleResetPassword} disabled={loading} className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20">
                        {loading ? <Loader2 className="animate-spin" /> : 'تغيير كلمة المرور'}
                    </Button>
                </div>
            )}
        </div>
    </div>
  );
};
