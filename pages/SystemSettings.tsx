
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { SystemSettings as ISystemSettings, FAQItem, ThemeConfig } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Settings, Save, Landmark, Coins, Building2, Sparkles, Loader2, CreditCard, 
  Wallet, ShieldCheck, Globe, LayoutTemplate, HelpCircle, Plus, Trash2, Smartphone, Upload, Check, CalendarClock, Palette, Type, MousePointer
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'booking' | 'footer' | 'payment' | 'theme'>('general');
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
    theme_config: {
        primaryColor: '#4B0082',
        secondaryColor: '#F3E8FF',
        backgroundColor: '#FFFFFF',
        sidebarColor: '#FFFFFF',
        borderRadius: '1rem',
        headingFont: 'Tajawal',
        bodyFont: 'Tajawal'
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
        // Merge DB settings with defaults to ensure all fields exist
        setSettings(prev => ({
          ...prev,
          ...dbSettings,
          booking_config: { ...prev.booking_config, ...(dbSettings.booking_config || {}) },
          payment_gateways: { ...prev.payment_gateways, ...(dbSettings.payment_gateways || {}) },
          footer_config: { ...prev.footer_config, ...(dbSettings.footer_config || {})},
          theme_config: { ...prev.theme_config, ...(dbSettings.theme_config || {})}
        }));
        
        // Apply theme immediately on load within settings page
        if(dbSettings.theme_config) {
            const root = document.documentElement;
            root.style.setProperty('--primary', dbSettings.theme_config.primaryColor);
            root.style.setProperty('--secondary', dbSettings.theme_config.secondaryColor);
            root.style.setProperty('--radius', dbSettings.theme_config.borderRadius);
        }
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
      
      // Apply theme immediately globally
      if(settings.theme_config) {
          const root = document.documentElement;
          root.style.setProperty('--primary', settings.theme_config.primaryColor);
          root.style.setProperty('--secondary', settings.theme_config.secondaryColor);
          root.style.setProperty('--background', settings.theme_config.backgroundColor);
          root.style.setProperty('--radius', settings.theme_config.borderRadius);
      }
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
          const file = files[0];
          // Use a simple timestamp filename, allow overwriting or unique
          const fileName = `admin-logo-${Date.now()}.${file.name.split('.').pop()}`;
          
          const { error: uploadError } = await supabase.storage.from('vendor-logos').upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
          });
          
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage.from('vendor-logos').getPublicUrl(fileName);
          
          setSettings(prev => ({ 
              ...prev, 
              platform_logo_url: publicUrl,
              theme_config: { ...prev.theme_config!, logoUrl: publicUrl }
          }));
          toast({ title: 'تم الرفع', description: 'لا تنس حفظ الإعدادات لتثبيت الشعار.', variant: 'success' });
      } catch (err: any) {
          console.error(err);
          toast({ title: 'خطأ في الرفع', description: err.message, variant: 'destructive' });
      } finally {
          setUploading(false);
      }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">جاري تحميل الإعدادات...</div>;

  return (
    <div className="space-y-8 pb-10 text-right font-tajawal">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-ruqaa text-primary">إعدادات المنصة</h2>
          <p className="text-sm text-muted-foreground mt-1">إدارة شاملة للمظهر، المحتوى، والمالية.</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'general' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>عام ورسوم</button>
            <button onClick={() => setActiveTab('theme')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'theme' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>المظهر والهوية</button>
            <button onClick={() => setActiveTab('booking')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'booking' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>سياسات الحجز</button>
            <button onClick={() => setActiveTab('payment')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'payment' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>بوابات الدفع</button>
            <button onClick={() => setActiveTab('footer')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'footer' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>الفوتر والتطبيق</button>
        </div>
        <Button onClick={handleSave} disabled={saving} className="h-12 px-8 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
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

      {activeTab === 'theme' && (
          <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm space-y-8 animate-in fade-in">
              <h3 className="text-lg font-black flex items-center justify-end gap-2 border-b pb-4">
                  تخصيص المظهر والهوية <Palette className="w-5 h-5 text-primary" />
              </h3>
              
              {/* Logo */}
              <div className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl border border-gray-200">
                  <div className="text-right">
                      <h4 className="font-bold text-gray-900">شعار المنصة (Logo)</h4>
                      <p className="text-xs text-gray-500 mt-1">يظهر في الهيدر وصفحات الدخول. اضغط "حفظ" بعد الرفع.</p>
                  </div>
                  <div className="flex items-center gap-4">
                      {settings.theme_config?.logoUrl && <img src={settings.theme_config.logoUrl} className="h-12 w-auto object-contain" alt="Current Logo" />}
                      <div onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          {uploading ? 'جاري الرفع...' : 'رفع شعار جديد'}
                      </div>
                      <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleLogoUpload} />
                  </div>
              </div>

              {/* Colors */}
              <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                      <h4 className="text-sm font-black text-gray-900">الألوان الرئيسية</h4>
                      <div className="space-y-3">
                          <div className="flex items-center gap-4">
                              <input type="color" value={settings.theme_config?.primaryColor} onChange={e => setSettings({...settings, theme_config: {...settings.theme_config!, primaryColor: e.target.value}})} className="w-12 h-12 rounded-xl cursor-pointer border-none shadow-sm" />
                              <div className="flex-1">
                                  <label className="text-xs font-bold text-gray-500 block">اللون الأساسي (Primary)</label>
                                  <input value={settings.theme_config?.primaryColor} readOnly className="text-xs font-mono bg-transparent w-full outline-none font-bold text-gray-700" />
                              </div>
                          </div>
                          <div className="flex items-center gap-4">
                              <input type="color" value={settings.theme_config?.secondaryColor} onChange={e => setSettings({...settings, theme_config: {...settings.theme_config!, secondaryColor: e.target.value}})} className="w-12 h-12 rounded-xl cursor-pointer border-none shadow-sm" />
                              <div className="flex-1">
                                  <label className="text-xs font-bold text-gray-500 block">اللون الثانوي (Secondary)</label>
                                  <input value={settings.theme_config?.secondaryColor} readOnly className="text-xs font-mono bg-transparent w-full outline-none font-bold text-gray-700" />
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <h4 className="text-sm font-black text-gray-900">ألوان الخلفية والقوائم</h4>
                      <div className="space-y-3">
                          <div className="flex items-center gap-4">
                              <input type="color" value={settings.theme_config?.backgroundColor} onChange={e => setSettings({...settings, theme_config: {...settings.theme_config!, backgroundColor: e.target.value}})} className="w-12 h-12 rounded-xl cursor-pointer border-none shadow-sm" />
                              <div className="flex-1">
                                  <label className="text-xs font-bold text-gray-500 block">خلفية الموقع (Body)</label>
                                  <input value={settings.theme_config?.backgroundColor} readOnly className="text-xs font-mono bg-transparent w-full outline-none font-bold text-gray-700" />
                              </div>
                          </div>
                          <div className="flex items-center gap-4">
                              <input type="color" value={settings.theme_config?.sidebarColor} onChange={e => setSettings({...settings, theme_config: {...settings.theme_config!, sidebarColor: e.target.value}})} className="w-12 h-12 rounded-xl cursor-pointer border-none shadow-sm" />
                              <div className="flex-1">
                                  <label className="text-xs font-bold text-gray-500 block">خلفية القائمة الجانبية</label>
                                  <input value={settings.theme_config?.sidebarColor} readOnly className="text-xs font-mono bg-transparent w-full outline-none font-bold text-gray-700" />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* UI Elements */}
              <div className="border-t border-gray-100 pt-6">
                  <h4 className="text-sm font-black text-gray-900 mb-4">خصائص الواجهة</h4>
                  <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 flex items-center gap-2"><MousePointer className="w-4 h-4" /> انحناء الحواف (Border Radius)</label>
                          <select 
                              className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm font-bold bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                              value={settings.theme_config?.borderRadius}
                              onChange={e => setSettings({...settings, theme_config: {...settings.theme_config!, borderRadius: e.target.value}})}
                          >
                              <option value="0px">مربع (0px)</option>
                              <option value="0.5rem">خفيف (0.5rem)</option>
                              <option value="1rem">متوسط (1rem)</option>
                              <option value="1.5rem">كبير (1.5rem)</option>
                              <option value="2rem">دائري (2rem)</option>
                          </select>
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 flex items-center gap-2"><Type className="w-4 h-4" /> خط العناوين</label>
                          <select 
                              className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm font-bold bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                              value={settings.theme_config?.headingFont}
                              onChange={e => setSettings({...settings, theme_config: {...settings.theme_config!, headingFont: e.target.value}})}
                          >
                              <option value="Tajawal">Tajawal (Default)</option>
                              <option value="Cairo">Cairo</option>
                              <option value="Almarai">Almarai</option>
                          </select>
                      </div>
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

      {/* Payment & Footer tabs remain same */}
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
