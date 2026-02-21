
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader2, ArrowRight, Smartphone, Mail } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { normalizeNumbers, isValidSaudiPhone } from '../utils/helpers';

export const GuestLogin: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [systemLogo, setSystemLogo] = useState('https://dash.hall.sa/logo.svg');
  const { toast } = useToast();

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
    if (data?.value?.platform_logo_url) {
      setSystemLogo(data.value.platform_logo_url);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);

    try {
      let targetEmail = email;

      // If using phone, lookup email first
      if (loginMethod === 'phone') {
        const normalizedPhone = normalizeNumbers(phone);

        if (!normalizedPhone) {
          toast({ title: 'رقم الجوال مطلوب', description: 'يرجى إدخال رقم الجوال المسجل في الحجوزات.', variant: 'destructive' });
          setLoading(false);
          return;
        }

        if (!isValidSaudiPhone(normalizedPhone)) {
          toast({ title: 'رقم غير صالح', description: 'يرجى إدخال رقم سعودي صحيح (يبدأ بـ 05).', variant: 'destructive' });
          setLoading(false);
          return;
        }

        const { data, error: lookupError } = await supabase
          .from('bookings')
          .select('guest_email')
          .eq('guest_phone', normalizedPhone)
          .not('guest_email', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lookupError) throw lookupError;

        if (!data?.guest_email) {
          throw new Error('لم نجد أي حجوزات مرتبطة برقم الجوال هذا.');
        }

        targetEmail = data.guest_email;
        setEmail(targetEmail);
      }

      // Send OTP
      const { error: authError } = await supabase.auth.signInWithOtp({ email: targetEmail });
      if (authError) throw authError;

      toast({ title: 'تم الإرسال', description: `تم إرسال رمز الدخول إلى بريدك الإلكتروني.`, variant: 'success' });
      setStep(2);

    } catch (err: any) {
      console.error(err);
      toast({ title: 'خطأ', description: err.message || 'حدث خطأ أثناء محاولة الدخول.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !email) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: normalizeNumbers(otp), type: 'magiclink' });

      if (error) {
        const { error: signupError } = await supabase.auth.verifyOtp({ email, token: normalizeNumbers(otp), type: 'signup' });
        if(signupError) throw signupError;
      }
    } catch (err: any) {
      toast({ title: 'رمز خاطئ', description: 'تأكد من الرمز وحاول مرة أخرى.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-tajawal text-right bg-white" dir="rtl">
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-4 py-8 bg-white">
        <div className="w-full max-w-md space-y-4">

          <div className="text-right space-y-2 mb-4">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-2 font-bold text-xs">
              <ArrowRight className="w-4 h-4" /> العودة للرئيسية
            </button>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              {step === 1 ? 'متابعة الحجز' : 'التحقق من الهوية'}
            </h2>
            <p className="text-gray-500 font-bold text-sm">
              {step === 1 ? 'اختر طريقة الدخول' : 'أدخل الرمز المرسل إلى بريدك الإلكتروني'}
            </p>
          </div>

          {step === 1 && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  loginMethod === 'phone'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                رقم الجوال
              </button>
              <button
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  loginMethod === 'email'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Mail className="w-4 h-4" />
                البريد الإلكتروني
              </button>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              {loginMethod === 'phone' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">رقم الجوال المسجل</label>
                  <Input
                    value={phone}
                    onChange={e => setPhone(normalizeNumbers(e.target.value))}
                    className="h-11 rounded-lg border-gray-200"
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-11 rounded-lg border-gray-200"
                    placeholder="example@email.com"
                    dir="ltr"
                  />
                </div>
              )}
              <div className="pt-2">
                <Button onClick={handleSendOtp} disabled={loading} className="w-full h-11 rounded-lg font-black text-base bg-primary text-white hover:bg-primary/90">
                  {loading ? <Loader2 className="animate-spin" /> : 'إرسال رمز التحقق'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Mail className="w-7 h-7" /></div>
                <p className="text-sm text-gray-500">تم إرسال رمز التحقق إلى <b>{email}</b></p>
              </div>
              <Input
                value={otp}
                onChange={e => setOtp(normalizeNumbers(e.target.value))}
                className="h-12 text-center text-xl font-black tracking-widest rounded-xl border-2 focus:border-primary"
                placeholder="------"
                maxLength={6}
              />
              <Button onClick={handleVerifyOtp} disabled={loading} className="w-full h-11 rounded-lg font-black text-base bg-primary text-white hover:bg-primary/90">
                {loading ? <Loader2 className="animate-spin" /> : 'تحقق ودخول'}
              </Button>
              <button type="button" onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-primary">تغيير الطريقة</button>
            </div>
          )}

          <div className="space-y-2 pt-2 text-center">
            <div className="pt-4">
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
        </div>
      </div>
    </div>
  );
};
