
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { SystemSettings as ISystemSettings } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings, Save, RefreshCw, Landmark, Percent, Globe, Loader2, Upload, Coins, Building2, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<ISystemSettings>({
    site_name: 'قاعه',
    commission_rate: 0.10,
    vat_enabled: true,
    platform_logo_url: '',
    hall_listing_fee: 500,
    service_listing_fee: 200
  } as any);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { toast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
      if (data?.value) setSettings(data.value);
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

  return (
    <div className="space-y-8 pb-10 text-right">
      <div className="flex justify-between items-center flex-row-reverse">
        <div>
          <h2 className="text-3xl font-ruqaa text-primary">إعدادات المنصة</h2>
          <p className="text-sm text-muted-foreground mt-1">إدارة الفوترة، العمولات، وأسعار الاشتراك للأصول.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="h-12 px-8 rounded-xl font-bold gap-2">
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
          حفظ التغييرات
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Fees Settings */}
        <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm space-y-6">
          <h3 className="text-lg font-black flex items-center justify-end gap-2 border-b pb-4">
             تسعير الأصول (SaaS) <Coins className="w-5 h-5 text-primary" />
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 flex items-center justify-end gap-2">
                 رسوم إضافة قاعة جديدة (SAR) <Building2 className="w-3.5 h-3.5" />
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
                 رسوم إضافة خدمة جديدة (SAR) <Sparkles className="w-3.5 h-3.5" />
              </label>
              <Input 
                type="number" 
                value={settings.service_listing_fee} 
                onChange={e => setSettings({...settings, service_listing_fee: Number(e.target.value)})}
                className="h-12 rounded-xl text-right font-bold"
              />
            </div>
            <p className="text-[10px] text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/10">
              * يدفع البائع هذه الرسوم لمرة واحدة عند تفعيل كل أصل جديد على المنصة.
            </p>
          </div>
        </div>

        {/* Global Settings */}
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
