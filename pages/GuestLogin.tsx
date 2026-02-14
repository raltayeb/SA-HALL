
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader2, ArrowRight, Smartphone, KeyRound } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { normalizeNumbers, isValidSaudiPhone } from '../utils/helpers';

export const GuestLogin: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(''); // Retrieved from backend
  const [otp, setOtp] = useState('');
  const { toast } = useToast();

  const handleLookupAndSendOtp = async () => {
    const normalizedPhone = normalizeNumbers(phone);
    
    if (!normalizedPhone) {
        toast({ title: 'رقم الجوال مطلوب', description: 'يرجى إدخال رقم الجوال المسجل في الحجوزات.', variant: 'destructive' });
        return;
    }

    if (!isValidSaudiPhone(normalizedPhone)) {
        toast({ title: 'رقم غير صالح', description: 'يرجى إدخال رقم سعودي صحيح (يبدأ بـ 05).', variant: 'destructive' });
        return;
    }

    setLoading(true);
    
    try {
        const { data, error: lookupError } = await supabase
            .from('bookings')
            .select('guest_email')
            .eq('guest_phone', normalizedPhone)
            .not('guest_email', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lookupError || !data?.guest_email) {
            toast({ title: 'غير مسجل', description: 'لم نجد أي حجوزات مرتبطة برقم الجوال هذا.', variant: 'destructive' });
            setLoading(false);
            return;
        }

        const foundEmail = data.guest_email;
        setEmail(foundEmail); 

        const { error: authError } = await supabase.auth.signInWithOtp({ email: foundEmail });
        
        if (authError) throw authError;

        toast({ title: 'تم الإرسال', description: `تم إرسال رمز الدخول إلى بريدك الإلكتروني المرتبط (${foundEmail.slice(0, 3)}***).`, variant: 'success' });
        setStep(2);

    } catch (err: any) {
        console.error(err);
        toast({ title: 'خطأ', description: 'حدث خطأ أثناء محاولة الدخول.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !email) return;
    setLoading(true);
    
    const { error } = await supabase.auth.verifyOtp({ email, token: normalizeNumbers(otp), type: 'magiclink' });
    
    if (error) {
        const { error: signupError } = await supabase.auth.verifyOtp({ email, token: normalizeNumbers(otp), type: 'signup' });
        if(signupError) {
            toast({ title: 'رمز خاطئ', description: 'تأكد من الرمز وحاول مرة أخرى.', variant: 'destructive' });
            setLoading(false);
            return;
        }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-tajawal text-right" dir="rtl">
        <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-2 font-bold text-xs"><ArrowRight className="w-4 h-4" /> العودة للرئيسية</button>
            
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-primary">دخول الضيوف</h2>
                <p className="text-gray-500 font-bold mt-2 text-sm">أدخل رقم الجوال لاستلام رمز الدخول</p>
            </div>

            {step === 1 ? (
                <div className="space-y-4 animate-in slide-in-from-right">
                    <Input 
                        label="رقم الجوال المسجل" 
                        value={phone} 
                        onChange={e => setPhone(normalizeNumbers(e.target.value))} 
                        icon={<Smartphone className="w-4 h-4" />} 
                        className="h-12 rounded-xl text-center font-bold text-lg" 
                        placeholder="05xxxxxxxx"
                    />
                    <Button onClick={handleLookupAndSendOtp} disabled={loading} className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20 mt-4">
                        {loading ? <Loader2 className="animate-spin" /> : 'إرسال رمز التحقق'}
                    </Button>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600 mb-4"><KeyRound className="w-8 h-8" /></div>
                    <p className="text-sm font-bold text-gray-500">أدخل الرمز المرسل إلى بريدك الإلكتروني</p>
                    <Input placeholder="------" value={otp} onChange={e => setOtp(normalizeNumbers(e.target.value))} className="h-14 rounded-xl text-center text-2xl font-black tracking-widest" maxLength={6} />
                    <Button onClick={handleVerifyOtp} disabled={loading} className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20">
                        {loading ? <Loader2 className="animate-spin" /> : 'تحقق ودخول'}
                    </Button>
                    <button onClick={() => setStep(1)} className="text-xs font-bold text-gray-400 underline">تغيير الرقم</button>
                </div>
            )}
        </div>
    </div>
  );
};
