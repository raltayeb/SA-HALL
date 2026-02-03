
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { SystemSettings as ISystemSettings } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings, Save, Landmark, Coins, Building2, Sparkles, Loader2, CreditCard, Wallet, ShieldCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<ISystemSettings>({
    site_name: 'القاعة',
    commission_rate: 0.10,
    vat_enabled: true,
    platform_logo_url: '',
    hall_listing_fee: 500,
    service_listing_fee: 200,
    payment_gateways: {
      visa_enabled: true,
      cash_enabled: true,
      visa_merchant_id: '',
      visa_secret_key: ''
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { toast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
      if (data?.value) setSettings(data.value as ISystemSettings);
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'فشل تحميل الإعدادات.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('system_settings').upsert({ 
        key: 'platform_config', 
        value: settings,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات المنصة بنجاح.', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">جاري تحميل الإعدادات...</div>;

  return (
    <div className="space-y-8 pb-10 text-right">
      <div className="flex justify-between items-center flex-row-reverse">
        <div>
          <h2 className="text-3xl font-ruqaa text-primary">إعدادات المنصة</h2>
          <p className="text-sm text-muted-foreground mt-1">إدارة الرسوم، الضرائب، وبوابات الدفع الإلكتروني.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="h-12 px-8 rounded-xl font-bold gap-2">
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
          حفظ التغييرات
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Payment Gateway Settings */}
        <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm space-y-6 md:col-span-2">
           <h3 className="text-lg font-black flex items-center justify-end gap-2 border-b pb-4">
             إدارة بوابات الدفع <ShieldCheck className="w-5 h-5 text-primary" />
           </h3>
           <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                       <CreditCard className="w-5 h-5 text-primary" />
                       <span className="text-sm font-bold">دفع البطاقات (Visa/Mastercard)</span>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-primary" 
                      checked={settings.payment_gateways.visa_enabled}
                      onChange={e => setSettings({...settings, payment_gateways: {...settings.payment_gateways, visa_enabled: e.target.checked}})}
                    />
                 </div>
                 <div className="space-y-4 pr-2">
                    <Input 
                      label="Merchant ID" 
                      placeholder="Enter Merchant ID"
                      value={settings.payment_gateways.visa_merchant_id}
                      onChange={e => setSettings({...settings, payment_gateways: {...settings.payment_gateways, visa_merchant_id: e.target.value}})}
                      className="h-11 rounded-xl"
                    />
                    <Input 
                      label="Secret Key" 
                      type="password"
                      placeholder="••••••••••••"
                      value={settings.payment_gateways.visa_secret_key}
                      onChange={e => setSettings({...settings, payment_gateways: {...settings.payment_gateways, visa_secret_key: e.target.value}})}
                      className="h-11 rounded-xl"
                    />
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                       <Wallet className="w-5 h-5 text-primary" />
                       <span className="text-sm font-bold">الدفع النقدي (Cash)</span>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-primary" 
                      checked={settings.payment_gateways.cash_enabled}
                      onChange={e => setSettings({...settings, payment_gateways: {...settings.payment_gateways, cash_enabled: e.target.checked}})}
                    />
                 </div>
                 <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                    <p className="text-[10px] font-bold text-primary leading-relaxed">
                      عند تفعيل الدفع النقدي، سيتمكن البائعون من إتمام عملية الاشتراك، ولكن سيبقى حسابهم في حالة "بانتظار الموافقة" حتى يتم تأكيد التحصيل يدوياً.
                    </p>
                 </div>
              </div>
           </div>
        </div>

        {/* SaaS Fees Settings */}
        <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm space-y-6">
          <h3 className="text-lg font-black flex items-center justify-end gap-2 border-b pb-4">
             تسعير الأصول <Coins className="w-5 h-5 text-primary" />
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 flex items-center justify-end gap-2">
                 رسوم القاعة (SAR) <Building2 className="w-3.5 h-3.5" />
              </label>
              <Input 
                type="number" 
                value={settings.hall_listing_fee} 
                onChange={e => setSettings({...settings, hall_listing_fee: Number(e.target.value)})}
                className="h-12 rounded-xl text-right font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 flex items-center justify-end gap-2">
                 رسوم الخدمة (SAR) <Sparkles className="w-3.5 h-3.5" />
              </label>
              <Input 
                type="number" 
                value={settings.service_listing_fee} 
                onChange={e => setSettings({...settings, service_listing_fee: Number(e.target.value)})}
                className="h-12 rounded-xl text-right font-bold"
              />
            </div>
          </div>
        </div>

        {/* VAT Settings */}
        <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm space-y-6">
          <h3 className="text-lg font-black flex items-center justify-end gap-2 border-b pb-4">
             العمولة والضرائب <Landmark className="w-5 h-5 text-primary" />
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">نسبة عمولة المنصة (0.10 = 10%)</label>
              <Input 
                type="number" step="0.01"
                value={settings.commission_rate} 
                onChange={e => setSettings({...settings, commission_rate: Number(e.target.value)})}
                className="h-12 rounded-xl text-right font-bold"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
               <input 
                type="checkbox" checked={settings.vat_enabled} 
                onChange={e => setSettings({...settings, vat_enabled: e.target.checked})}
                className="w-5 h-5 accent-primary"
               />
               <span className="text-sm font-bold">تفعيل ضريبة القيمة المضافة (15%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
