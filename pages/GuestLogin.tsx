
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader2, ArrowRight, Smartphone, Mail, KeyRound } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const GuestLogin: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const { toast } = useToast();

  const handleSendOtp = async () => {
    if (!email || !phone) {
        toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال البريد الإلكتروني ورقم الجوال.', variant: 'destructive' });
        return;
    }
    setLoading(true);
    
    // In a real scenario, you'd check if a booking exists for this email/phone pair first.
    // For this demo, we use Supabase Magic Link via Email.
    const { error } = await supabase.auth.signInWithOtp({ email });
    
    setLoading(false);
    if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
        toast({ title: 'تم الإرسال', description: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.', variant: 'success' });
        setStep(2);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'magiclink' });
    if (error) {
        // Fallback for signup type if magiclink fails (sometimes happens in dev)
        const { error: signupError } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
        if(signupError) {
            toast({ title: 'رمز خاطئ', description: 'تأكد من الرمز وحاول مرة أخرى.', variant: 'destructive' });
            setLoading(false);
            return;
        }
    }
    // Success - App.tsx auth listener will handle redirection
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-tajawal text-right" dir="rtl">
        <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-2 font-bold text-xs"><ArrowRight className="w-4 h-4" /> العودة للرئيسية</button>
            
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-primary">دخول الضيوف</h2>
                <p className="text-gray-500 font-bold mt-2 text-sm">تابع حجوزاتك وفواتيرك السابقة</p>
            </div>

            {step === 1 ? (
                <div className="space-y-4 animate-in slide-in-from-right">
                    <Input label="رقم الجوال المسجل" value={phone} onChange={e => setPhone(e.target.value)} icon={<Smartphone className="w-4 h-4" />} className="h-12 rounded-xl" />
                    <Input label="البريد الإلكتروني المسجل" type="email" value={email} onChange={e => setEmail(e.target.value)} icon={<Mail className="w-4 h-4" />} className="h-12 rounded-xl" />
                    <Button onClick={handleSendOtp} disabled={loading} className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20 mt-4">
                        {loading ? <Loader2 className="animate-spin" /> : 'إرسال رمز التحقق'}
                    </Button>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600 mb-4"><KeyRound className="w-8 h-8" /></div>
                    <p className="text-sm font-bold text-gray-500">تم إرسال الرمز إلى {email}</p>
                    <Input placeholder="أدخل الرمز (6 أرقام)" value={otp} onChange={e => setOtp(e.target.value)} className="h-14 rounded-xl text-center text-2xl font-black tracking-widest" maxLength={6} />
                    <Button onClick={handleVerifyOtp} disabled={loading} className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20">
                        {loading ? <Loader2 className="animate-spin" /> : 'تحقق ودخول'}
                    </Button>
                    <button onClick={() => setStep(1)} className="text-xs font-bold text-gray-400 underline">تغيير البيانات</button>
                </div>
            )}
        </div>
    </div>
  );
};
