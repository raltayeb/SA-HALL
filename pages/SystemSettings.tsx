
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { SystemSettings as ISystemSettings } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings, Save, RefreshCw, Landmark, Percent, Globe, Loader2, Upload, Trash2, Building2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<ISystemSettings>({
    site_name: 'SA Hall',
    commission_rate: 0.10,
    vat_enabled: true,
    platform_logo_url: ''
  } as any);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        setSettings({ ...settings, ...data.value });
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      const filePath = `platform/logo-${Date.now()}.${file.name.split('.').pop()}`;

      // Uploading to vendor-logos bucket which is already public and setup
      const { error: uploadError } = await supabase.storage.from('vendor-logos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('vendor-logos').getPublicUrl(filePath);
      setSettings(prev => ({ ...prev, platform_logo_url: publicUrl } as any));
      toast({ title: 'نجاح', description: 'تم رفع شعار المنصة بنجاح.', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'خطأ في الرفع', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

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
      window.dispatchEvent(new CustomEvent('settingsUpdated'));
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast({ title: 'خطأ', description: err.message || 'فشل حفظ الإعدادات.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-10 text-right">
      <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center justify-end gap-3 text-primary">
             إعدادات المنصة العامة <Settings className="w-8 h-8" />
          </h2>
          <p className="text-sm text-muted-foreground mt-1">تحكم في التفضيلات العامة لمنصة SaaS والفوترة والهوية البصرية.</p>
        </div>
        <Button onClick={fetchSettings} variant="outline" size="icon" className="rounded-full w-12 h-12" disabled={loading || saving}>
          <RefreshCw className={`w-5 h-5 ${(loading || saving) ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Platform Identity */}
        <div className="rounded-[2.5rem] border bg-card p-8 shadow-sm space-y-6">
          <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
             هوية المنصة <Globe className="w-5 h-5 text-primary" />
          </h3>
          <div className="space-y-6">
            <Input 
              label="اسم الموقع / المنصة" 
              value={settings.site_name} 
              onChange={e => setSettings({...settings, site_name: e.target.value})}
              disabled={saving}
              className="text-right h-12 rounded-xl"
            />
            
            <div className="space-y-4">
              <label className="text-sm font-bold block">شعار المنصة الرئيسي</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video w-full max-w-sm mx-auto border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-all overflow-hidden relative group"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                ) : (settings as any).platform_logo_url ? (
                  <>
                    <img src={(settings as any).platform_logo_url} className="w-full h-full object-contain p-6" alt="Platform Logo" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                       <Upload className="w-8 h-8 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs font-bold text-muted-foreground text-center px-4">اضغط لرفع الشعار الرسمي للمنصة</span>
                  </>
                )}
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="rounded-[2.5rem] border bg-card p-8 shadow-sm space-y-6">
          <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
             الإعدادات المالية والضريبية <Landmark className="w-5 h-5 text-primary" />
          </h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center justify-end gap-2">
                 نسبة عمولة المنصة <Percent className="w-4 h-4 text-primary" />
              </label>
              <Input 
                type="number" 
                step="0.01" 
                value={settings.commission_rate} 
                onChange={e => setSettings({...settings, commission_rate: parseFloat(e.target.value)})}
                disabled={saving}
                className="h-12 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground font-bold">مثال: 0.10 تعني عمولة 10% على كل حجز يتم عبر المنصة.</p>
            </div>
            
            <div className="flex items-center justify-between p-5 rounded-[2rem] bg-muted/30 border border-dashed">
              <input 
                type="checkbox" 
                className="w-6 h-6 accent-primary cursor-pointer"
                checked={settings.vat_enabled}
                onChange={e => setSettings({...settings, vat_enabled: e.target.checked})}
                disabled={saving}
              />
              <div className="text-right">
                <p className="text-sm font-black">تفعيل ضريبة القيمة المضافة (VAT)</p>
                <p className="text-xs text-muted-foreground font-bold mt-1 opacity-70">تطبيق ضريبة 15% على جميع الفواتير الصادرة آلياً.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-8 border-t">
        <Button onClick={handleSave} disabled={loading || saving || uploading} className="gap-3 h-14 px-12 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          حفظ كافة التغييرات
        </Button>
      </div>
    </div>
  );
};
