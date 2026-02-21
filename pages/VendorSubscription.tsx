
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Subscription } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { useToast } from '../context/ToastContext';
import {
  Building2, Sparkles, Check, CreditCard, ShieldCheck,
  Loader2, ArrowRight, Home, X
} from 'lucide-react';

interface VendorSubscriptionProps {
  user: UserProfile;
  onBack?: () => void;
  onComplete?: () => void;
}

export const VendorSubscription: React.FC<VendorSubscriptionProps> = ({ user, onBack, onComplete }) => {
  const [selectedType, setSelectedType] = useState<'hall' | 'service' | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const { toast } = useToast();

  const prices = {
    hall: 500,
    service: 200,
    both: 600
  };

  useEffect(() => {
    checkSubscription();
  }, [user.id]);

  const checkSubscription = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('vendor_id', user.id)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setHasSubscription(true);
    }
  };

  const handlePayment = async () => {
    if (!selectedType) {
      toast({ title: 'تنبيه', description: 'يرجى اختيار نوع الاشتراك', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Create subscription record
      const subscription: Partial<Subscription> = {
        vendor_id: user.id,
        subscription_type: selectedType,
        amount: prices[selectedType],
        payment_status: 'completed',
        payment_method: 'card',
        is_lifetime: true
      };

      const { data, error } = await supabase
        .from('subscriptions')
        .insert([subscription])
        .select()
        .single();

      if (error) throw error;

      // Update user profile
      await supabase
        .from('profiles')
        .update({
          subscription_status: selectedType,
          subscription_paid_at: new Date().toISOString(),
          subscription_amount: prices[selectedType],
          has_active_subscription: true
        })
        .eq('id', user.id);

      toast({ title: 'تم الاشتراك', description: 'تم تفعيل اشتراكك بنجاح. مدى الحياة!', variant: 'success' });

      if (onComplete) onComplete();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 font-tajawal" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* Header - No Back Button for New Vendors */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-between mb-6">
            <div></div> {/* Empty div for spacing */}
          </div>
          
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-4xl font-black text-gray-900 mb-4">اختر باقة الاشتراك</h1>
          <p className="text-gray-500 font-bold text-lg">اشترك الآن وابدأ في إضافة نشاطك التجاري</p>
          <p className="text-primary font-black mt-2">اشتراك لمرة واحدة - مدى الحياة</p>
        </div>

        {/* Subscription Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Hall Subscription */}
          <div
            onClick={() => setSelectedType('hall')}
            className={`cursor-pointer relative bg-white rounded-[2.5rem] p-8 border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
              selectedType === 'hall'
                ? 'border-primary shadow-xl bg-primary/5'
                : 'border-gray-100 hover:border-primary/30'
            }`}
          >
            {selectedType === 'hall' && (
              <div className="absolute top-4 left-4 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
            )}
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                selectedType === 'hall' ? 'bg-primary text-white' : 'bg-purple-50 text-purple-600'
              }`}>
                <Building2 className="w-10 h-10" />
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">اشتراك القاعات</h3>
                <p className="text-gray-500 font-bold text-sm">لإضافة قاعة أو أكثر</p>
              </div>
              
              <div className="pt-4 border-t border-gray-100 w-full">
                <PriceTag amount={prices.hall} className="text-4xl font-black text-primary" />
                <p className="text-xs text-gray-400 font-bold mt-1">لمرة واحدة - مدى الحياة</p>
              </div>
              
              <ul className="space-y-2 text-right w-full pt-4">
                {[
                  'إضافة عدد غير محدود من القاعات',
                  'إدارة الحجوزات والتقويم',
                  'لوحة تحكم متكاملة',
                  'دعم فني متميز'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm font-bold text-gray-600">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Service Subscription */}
          <div
            onClick={() => setSelectedType('service')}
            className={`cursor-pointer relative bg-white rounded-[2.5rem] p-8 border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
              selectedType === 'service'
                ? 'border-primary shadow-xl bg-primary/5'
                : 'border-gray-100 hover:border-primary/30'
            }`}
          >
            {selectedType === 'service' && (
              <div className="absolute top-4 left-4 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
            )}
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                selectedType === 'service' ? 'bg-primary text-white' : 'bg-orange-50 text-orange-600'
              }`}>
                <Sparkles className="w-10 h-10" />
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">اشتراك الخدمات</h3>
                <p className="text-gray-500 font-bold text-sm">لإضافة خدمة أو أكثر</p>
              </div>
              
              <div className="pt-4 border-t border-gray-100 w-full">
                <PriceTag amount={prices.service} className="text-4xl font-black text-primary" />
                <p className="text-xs text-gray-400 font-bold mt-1">لمرة واحدة - مدى الحياة</p>
              </div>
              
              <ul className="space-y-2 text-right w-full pt-4">
                {[
                  'إضافة عدد غير محدود من الخدمات',
                  'إدارة الطلبات والحجوزات',
                  'لوحة تحكم متكاملة',
                  'دعم فني متميز'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm font-bold text-gray-600">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Payment Button */}
        {selectedType && (
          <div className="bg-white rounded-[2rem] p-6 border border-gray-200 shadow-lg">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-500 mb-1">المبلغ الإجمالي</p>
                <div className="flex items-center gap-2">
                  <PriceTag amount={prices[selectedType]} className="text-3xl font-black text-primary" />
                  <span className="text-xs text-gray-400 font-bold">شامل الضريبة</span>
                </div>
              </div>
              
              <Button
                onClick={handlePayment}
                disabled={loading}
                className="h-16 px-12 rounded-2xl font-black text-lg bg-gray-900 text-white hover:bg-black transition-all shadow-xl hover:shadow-2xl flex items-center gap-3"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-6 h-6" />
                    <span>إتمام الدفع وتفعيل الاشتراك</span>
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-center text-xs text-gray-400 font-bold mt-4">
              بالضغط على زر الدفع، أنت توافق على{' '}
              <a href="#" className="text-primary underline hover:text-primary/80">شروط وأحكام المنصة</a>
            </p>
          </div>
        )}

        {/* Features */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <ShieldCheck className="w-6 h-6" />,
              title: 'اشتراك مدى الحياة',
              desc: 'ادفع مرة واحدة واستمر للأبد'
            },
            {
              icon: <CreditCard className="w-6 h-6" />,
              title: 'دفع آمن',
              desc: 'بوابات دفع مشفرة ومحمية'
            },
            {
              icon: <Building2 className="w-6 h-6" />,
              title: 'دعم فني',
              desc: 'فريق دعم متاح 24/7'
            }
          ].map((feature, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-primary">
                {feature.icon}
              </div>
              <h4 className="font-black text-gray-900 mb-2">{feature.title}</h4>
              <p className="text-sm text-gray-500 font-bold">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
