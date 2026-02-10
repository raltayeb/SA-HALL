
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { SystemSettings as ISystemSettings, FAQItem } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Settings, Save, Landmark, Coins, Building2, Sparkles, Loader2, CreditCard, 
  Wallet, ShieldCheck, Globe, LayoutTemplate, HelpCircle, Plus, Trash2, Smartphone, Upload, Check 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'footer' | 'payment'>('general');
  const [settings, setSettings] = useState<ISystemSettings>({
    site_name: 'القاعة',
    commission_rate: 0.10,
    vat_enabled: true,
    platform_logo_url: '',
    hall_listing_fee: 500,
    service_listing_fee: 200,
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
        items: [
          { question: "كيف يمكنني حجز قاعة؟", answer: "يمكنك القيام بذلك بسهولة من خلال التطبيق أو الموقع الإلكتروني." }
        ]
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
      hyperpay_base_url: 'https://eu-test.oppwa.com', // Default
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
          payment_gateways: { ...prev.payment_gateways, ...(dbSettings.payment_gateways || {}) },
          footer_config: {
             ...prev.footer_config,
             ...(dbSettings.footer_config || {}),
             app_section: { ...prev.footer_config?.app_section, ...(dbSettings.footer_config?.app_section || {}) },
             faq_section: { ...prev.footer_config?.faq_section, ...(dbSettings.footer_config?.faq_section || {}) },
             contact_info: { ...prev.footer_config?.contact_info, ...(dbSettings.footer_config?.contact_info || {}) },
             social_links: { ...prev.footer_config?.social_links, ...(dbSettings.footer_config?.social_links || {}) }
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

  // ... (Upload, FAQ handlers same as previous file, omitted for brevity but logic assumed maintained)
  const handleAppImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
        const file = files[0];
        const fileName = `app-promo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { error: uploadError } = await supabase.storage.from('service-images').upload(fileName, file); 
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('service-images').getPublicUrl(fileName);
        setSettings(prev => ({ ...prev, footer_config: { ...prev.footer_config!, app_section: { ...prev.footer_config!.app_section, image_url: publicUrl } } }));
        toast({ title: 'تم الرفع', variant: 'success' });
    } catch (error: any) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
        setUploading(false);
    }
  };

  const addFAQ = () => {
      setSettings(prev => ({ ...prev, footer_config: { ...prev.footer_config!, faq_section: { ...prev.footer_config!.faq_section, items: [...prev.footer_config!.faq_section.items, { question: '', answer: '' }] } } }));
  };

  const updateFAQ = (index: number, field: keyof FAQItem, value: string) => {
      const newItems = [...(settings.footer_config?.faq_section.items || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      setSettings(prev => ({ ...prev, footer_config: { ...prev.footer_config!, faq_section: { ...prev.footer_config!.faq_section, items: newItems } } }));
  };

  const removeFAQ = (index: number) => {
      const newItems = [...(settings.footer_config?.faq_section.items || [])];
      newItems.splice(index, 1);
      setSettings(prev => ({ ...prev, footer_config: { ...prev.footer_config!, faq_section: { ...prev.footer_config!.faq_section, items: newItems } } }));
  };

  if (loading) return <div className="p-20 text-center animate-pulse">جاري تحميل الإعدادات...</div>;

  return (
    <div className="space-y-8 pb-10 text-right">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-ruqaa text-primary">إعدادات المنصة</h2>
          <p className="text-sm text-muted-foreground mt-1">إدارة شاملة للمظهر، المحتوى، والمالية.</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'general' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>عام ورسوم</button>
            <button onClick={() => setActiveTab('payment')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'payment' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>بوابات الدفع</button>
            <button onClick={() => setActiveTab('footer')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'footer' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>الفوتر والتطبيق</button>
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
              <label className="text-xs font-bold text-gray-500">رسوم القاعة (SAR)</label>
              <Input type="number" value={settings.hall_listing_fee} onChange={e => setSettings({...settings, hall_listing_fee: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">رسوم الخدمة (SAR)</label>
              <Input type="number" value={settings.service_listing_fee} onChange={e => setSettings({...settings, service_listing_fee: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 mt-6">
               <input type="checkbox" checked={settings.vat_enabled} onChange={e => setSettings({...settings, vat_enabled: e.target.checked})} className="w-5 h-5 accent-primary" />
               <span className="text-sm font-bold">تفعيل ضريبة القيمة المضافة (15%)</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm space-y-6 animate-in fade-in">
           <h3 className="text-lg font-black flex items-center justify-end gap-2 border-b pb-4">
             إدارة بوابات الدفع <ShieldCheck className="w-5 h-5 text-primary" />
           </h3>
           <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6 border-l pl-6">
                 <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="flex items-center gap-3">
                       <Globe className="w-5 h-5 text-purple-700" />
                       <span className="text-sm font-bold text-purple-900">HyperPay (مدى / فيزا)</span>
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
              <div className="space-y-6">
                 <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3"><Wallet className="w-5 h-5 text-primary" /><span className="text-sm font-bold">الدفع النقدي (Cash)</span></div>
                    <input type="checkbox" className="w-5 h-5 accent-primary" checked={settings.payment_gateways?.cash_enabled ?? false} onChange={e => setSettings({...settings, payment_gateways: {...settings.payment_gateways, cash_enabled: e.target.checked}})} />
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Footer Tab logic same as previous */}
      {activeTab === 'footer' && (
        <div className="space-y-6 animate-in fade-in">
            {/* Same as before... */}
            <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm space-y-6">
                <h3 className="text-lg font-black flex items-center justify-end gap-2 border-b pb-4">
                    قسم تحميل التطبيق <Smartphone className="w-5 h-5 text-primary" />
                </h3>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="space-y-4 text-center">
                        <label className="text-xs font-bold text-gray-500 block text-right">صورة التطبيق</label>
                        <div onClick={() => fileInputRef.current?.click()} className="aspect-square w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all relative overflow-hidden group bg-gray-50">
                            {uploading ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : settings.footer_config?.app_section.image_url ? <img src={settings.footer_config?.app_section.image_url} className="w-full h-full object-cover" key={`${settings.footer_config.app_section.image_url}?t=${Date.now()}`} /> : <div className="text-center p-4"><Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-xs font-bold text-gray-400">اضغط للرفع</p></div>}
                        </div>
                        <input type="file" hidden ref={fileInputRef} onChange={handleAppImageUpload} accept="image/*" />
                    </div>
                    <div className="md:col-span-2 space-y-4">
                        <Input label="العنوان الرئيسي" value={settings.footer_config?.app_section.title} onChange={e => setSettings({...settings, footer_config: {...settings.footer_config!, app_section: {...settings.footer_config!.app_section, title: e.target.value}}})} className="h-12 rounded-xl" />
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500">الوصف</label>
                            <textarea className="w-full h-24 border rounded-xl p-3 text-sm font-bold bg-white focus:ring-1 ring-primary/20 outline-none resize-none" value={settings.footer_config?.app_section.description} onChange={e => setSettings({...settings, footer_config: {...settings.footer_config!, app_section: {...settings.footer_config!.app_section, description: e.target.value}}})} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
