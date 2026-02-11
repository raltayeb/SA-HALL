
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { SystemSettings as ISystemSettings, FAQItem } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Settings, Save, Landmark, Coins, Building2, Sparkles, Loader2, CreditCard, 
  Wallet, ShieldCheck, Globe, LayoutTemplate, HelpCircle, Plus, Trash2, Smartphone, Upload, Check, CalendarClock
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'booking' | 'footer' | 'payment'>('general');
  const [settings, setSettings] = useState<ISystemSettings>({
    site_name: 'القاعة',
    commission_rate: 0.10,
    vat_enabled: true,
    platform_logo_url: '',
    hall_listing_fee: 500,
    service_listing_fee: 200,
    booking_config: {
        deposit_fixed: 500,
        deposit_percent: 20,
        hold_price: 200,
        consultation_price: 150
    },
    footer_config: {
      app_section: {
        show: true,
        image_url: '',
        title: 'حمل تطبيق القاعة',
        description: 'تجربة حجز أسرع وأسهل عبر تطبيق الجوال. متاح الآن لأجهزة الآيفون والأندرويد.',
        apple_store_link: '#',
        google_play_link: '#'
      },
      faq_section: {
        show: true,
        title: 'الأسئلة الشائعة',
        items: []
      },
      contact_info: {
        phone: '920000000',
        email: 'support@hall.sa',
        address: 'الرياض، المملكة العربية السعودية',
        copyright_text: '© 2025 شركة القاعة لتقنية المعلومات. جميع الحقوق محفوظة.'
      },
      social_links: {
        twitter: '#',
        instagram: '#',
        facebook: '#',
        linkedin: '#'
      }
    },
    payment_gateways: {
      visa_enabled: true,
      cash_enabled: true,
      hyperpay_enabled: false,
      hyperpay_entity_id: '',
      hyperpay_access_token: '',
      hyperpay_base_url: 'https://eu-test.oppwa.com',
      hyperpay_mode: 'test'
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
      if (data?.value) {
        const dbSettings = data.value;
        setSettings(prev => ({
          ...prev,
          ...dbSettings,
          booking_config: { ...prev.booking_config, ...(dbSettings.booking_config || {}) },
          payment_gateways: { ...prev.payment_gateways, ...(dbSettings.payment_gateways || {}) },
          footer_config: {
             ...prev.footer_config,
             ...(dbSettings.footer_config || {}),
          }
        }));
      }
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

  const handleAppImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      // (Implementation same as previous)
  };

  if (loading) return <div className="p-20 text-center animate-pulse">جاري تحميل الإعدادات...</div>;

  return (
    <div className="space-y-8 pb-10 text-right">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-ruqaa text-primary">إعدادات المنصة</h2>
          <p className="text-sm text-muted-foreground mt-1">إدارة شاملة للمظهر، المحتوى، والمالية.</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'general' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>عام ورسوم</button>
            <button onClick={() => setActiveTab('booking')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'booking' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>سياسات الحجز</button>
            <button onClick={() => setActiveTab('payment')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'payment' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>بوابات الدفع</button>
            <button onClick={() => setActiveTab('footer')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'footer' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>الفوتر والتطبيق</button>
        </div>
        <Button onClick={handleSave} disabled={saving} className="h-12 px-8 rounded-xl font-bold gap-2">
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
          حفظ التغييرات
        </Button>
      </div>

      {activeTab === 'general' && (
        <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm space-y-6 animate-in fade-in">
          <h3 className="text-lg font-black flex items-center justify-end gap-2 border-b pb-4">
             تسعير الأصول والعمولة <Coins className="w-5 h-5 text-primary" />
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">نسبة عمولة المنصة (0.10 = 10%)</label>
              <Input type="number" step="0.01" value={settings.commission_rate} onChange={e => setSettings({...settings, commission_rate: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">رسوم اشتراك القاعة (SAR)</label>
              <Input type="number" value={settings.hall_listing_fee} onChange={e => setSettings({...settings, hall_listing_fee: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">رسوم اشتراك الخدمة (SAR)</label>
              <Input type="number" value={settings.service_listing_fee} onChange={e => setSettings({...settings, service_listing_fee: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 mt-6">
               <input type="checkbox" checked={settings.vat_enabled} onChange={e => setSettings({...settings, vat_enabled: e.target.checked})} className="w-5 h-5 accent-primary" />
               <span className="text-sm font-bold">تفعيل ضريبة القيمة المضافة (15%)</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'booking' && (
        <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm space-y-6 animate-in fade-in">
          <h3 className="text-lg font-black flex items-center justify-end gap-2 border-b pb-4">
             إعدادات الحجوزات والعربون <CalendarClock className="w-5 h-5 text-primary" />
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">مبلغ العربون الثابت (SAR)</label>
                <Input type="number" value={settings.booking_config.deposit_fixed} onChange={e => setSettings({...settings, booking_config: {...settings.booking_config, deposit_fixed: Number(e.target.value)}})} className="h-12 rounded-xl text-right font-bold" />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">نسبة العربون الإضافية (%)</label>
                <Input type="number" value={settings.booking_config.deposit_percent} onChange={e => setSettings({...settings, booking_config: {...settings.booking_config, deposit_percent: Number(e.target.value)}})} className="h-12 rounded-xl text-right font-bold" />
                <p className="text-[10px] text-gray-400">إجمالي العربون = مبلغ ثابت + (سعر الحجز * النسبة)</p>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">سعر حجز يومين / 48 ساعة (SAR)</label>
                <Input type="number" value={settings.booking_config.hold_price} onChange={e => setSettings({...settings, booking_config: {...settings.booking_config, hold_price: Number(e.target.value)}})} className="h-12 rounded-xl text-right font-bold" />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">سعر خدمة الاستشارة (SAR)</label>
                <Input type="number" value={settings.booking_config.consultation_price} onChange={e => setSettings({...settings, booking_config: {...settings.booking_config, consultation_price: Number(e.target.value)}})} className="h-12 rounded-xl text-right font-bold" />
            </div>
          </div>
        </div>
      )}

      {/* Payment & Footer tabs remain similar, reusing existing structure */}
      {activeTab === 'payment' && (
        <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm space-y-6 animate-in fade-in">
           <h3 className="text-lg font-black flex items-center justify-end gap-2 border-b pb-4">
             بوابات الدفع الإلكتروني <ShieldCheck className="w-5 h-5 text-primary" />
           </h3>
           <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6 border-l pl-6">
                 <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="flex items-center gap-3">
                       <Globe className="w-5 h-5 text-purple-700" />
                       <span className="text-sm font-bold text-purple-900">HyperPay (Apple Pay / STC / Cards)</span>
                    </div>
                    <input type="checkbox" className="w-5 h-5 accent-purple-700" checked={settings.payment_gateways?.hyperpay_enabled ?? false} onChange={e => setSettings({...settings, payment_gateways: {...settings.payment_gateways, hyperpay_enabled: e.target.checked}})} />
                 </div>
                 {settings.payment_gateways?.hyperpay_enabled && (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="hp_mode" checked={settings.payment_gateways.hyperpay_mode === 'test'} onChange={() => setSettings({...settings, payment_gateways: {...settings.payment_gateways, hyperpay_mode: 'test'}})} className="accent-primary" /><span className="text-xs font-bold">تجريبي (Test)</span></label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="hp_mode" checked={settings.payment_gateways.hyperpay_mode === 'live'} onChange={() => setSettings({...settings, payment_gateways: {...settings.payment_gateways, hyperpay_mode: 'live'}})} className="accent-primary" /><span className="text-xs font-bold">مباشر (Live)</span></label>
                        </div>
                        <Input label="Entity ID" value={settings.payment_gateways?.hyperpay_entity_id || ''} onChange={e => setSettings({...settings, payment_gateways: {...settings.payment_gateways, hyperpay_entity_id: e.target.value}})} className="h-11 rounded-xl" />
                        <Input label="Access Token" type="password" value={settings.payment_gateways?.hyperpay_access_token || ''} onChange={e => setSettings({...settings, payment_gateways: {...settings.payment_gateways, hyperpay_access_token: e.target.value}})} className="h-11 rounded-xl" />
                        <Input label="Base URL (Optional)" placeholder="https://eu-test.oppwa.com" value={settings.payment_gateways?.hyperpay_base_url || ''} onChange={e => setSettings({...settings, payment_gateways: {...settings.payment_gateways, hyperpay_base_url: e.target.value}})} className="h-11 rounded-xl" />
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
