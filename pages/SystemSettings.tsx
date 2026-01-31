
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { SystemSettings as ISystemSettings } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings, Save, RefreshCw, Landmark, Percent, Globe, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<ISystemSettings>({
    site_name: 'SA Hall',
    commission_rate: 0.10,
    vat_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'platform_config')
        .maybeSingle();

      if (error) throw error;
      if (data && data.value) {
        setSettings(data.value);
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      toast({ title: 'خطأ', description: 'فشل تحميل الإعدادات من الخادم.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'platform_config', 
          value: settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات المنصة بنجاح.', variant: 'success' });
      
      // Notify parent to refresh if needed (this app uses dynamic fetch in App.tsx)
      window.dispatchEvent(new CustomEvent('settingsUpdated'));
      
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast({ title: 'خطأ', description: err.message || 'فشل حفظ الإعدادات.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            إعدادات المنصة العامة
          </h2>
          <p className="text-sm text-muted-foreground">تحكم في التفضيلات العامة لمنصة SaaS والفوترة.</p>
        </div>
        <Button onClick={fetchSettings} variant="outline" size="icon" disabled={loading || saving}>
          <RefreshCw className={`w-4 h-4 ${(loading || saving) ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
            <Globe className="w-4 h-4 text-primary" /> إعدادات الواجهة
          </h3>
          <Input 
            label="اسم الموقع / المنصة" 
            value={settings.site_name} 
            onChange={e => setSettings({...settings, site_name: e.target.value})}
            disabled={saving}
          />
          <p className="text-[10px] text-muted-foreground">يظهر هذا الاسم في رسائل البريد والعناوين الرئيسية.</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
            <Landmark className="w-4 h-4 text-primary" /> الإعدادات المالية والضريبية
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Percent className="w-4 h-4" /> نسبة عمولة المنصة
              </label>
              <Input 
                type="number" 
                step="0.01" 
                value={settings.commission_rate} 
                onChange={e => setSettings({...settings, commission_rate: parseFloat(e.target.value)})}
                disabled={saving}
              />
              <p className="text-[10px] text-muted-foreground">مثال: 0.10 تعني عمولة 10% على كل حجز يتم عبر المنصة.</p>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-bold">تفعيل ضريبة القيمة المضافة (VAT)</p>
                <p className="text-xs text-muted-foreground">تطبيق ضريبة 15% على جميع الفواتير الصادرة.</p>
              </div>
              <input 
                type="checkbox" 
                className="w-5 h-5 accent-primary cursor-pointer"
                checked={settings.vat_enabled}
                onChange={e => setSettings({...settings, vat_enabled: e.target.checked})}
                disabled={saving}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={loading || saving} className="gap-2 px-8">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ كافة التغييرات
        </Button>
      </div>
    </div>
  );
};
