
import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Palette, Upload, Loader2, Save, MessageCircle, Mail, Phone, Globe, Trash2, Building2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface VendorBrandSettingsProps {
  user: UserProfile;
  onUpdate: (userId: string) => void;
}

export const VendorBrandSettings: React.FC<VendorBrandSettingsProps> = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    business_name: user.business_name || '',
    theme_color: user.theme_color || '#8a2be2',
    whatsapp_number: user.whatsapp_number || '',
    business_email: user.business_email || '',
    phone_number: user.phone_number || '',
    custom_logo_url: user.custom_logo_url || ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      const filePath = `${user.id}/logo-${Date.now()}.${file.name.split('.').pop()}`;

      const { error: uploadError } = await supabase.storage.from('vendor-logos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('vendor-logos').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, custom_logo_url: publicUrl }));
      toast({ title: 'تم التحديث', description: 'تم رفع الشعار الجديد بنجاح.', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'خطأ في الرفع', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: formData.business_name,
          theme_color: formData.theme_color,
          whatsapp_number: formData.whatsapp_number,
          business_email: formData.business_email,
          phone_number: formData.phone_number,
          custom_logo_url: formData.custom_logo_url
        })
        .eq('id', user.id);

      if (error) throw error;
      toast({ title: 'نجاح', description: 'تم حفظ إعدادات الهوية بنجاح.', variant: 'success' });
      onUpdate(user.id);
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-3xl font-black tracking-tighter flex items-center gap-2">
          <Palette className="w-8 h-8 text-primary" /> إعدادات الهوية والتواصل
        </h2>
        <p className="text-muted-foreground mt-1">خصص مظهر بوابتك وتفاصيل التواصل الخاصة بك مع العملاء.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Visual Identity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-[2.5rem] p-8 shadow-sm space-y-8">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> الهوية البصرية
            </h3>
            
            <div className="grid md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <label className="text-sm font-bold block">لون العلامة التجارية</label>
                  <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl border">
                    <input 
                      type="color" 
                      className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent" 
                      value={formData.theme_color} 
                      onChange={e => setFormData({...formData, theme_color: e.target.value})}
                    />
                    <div className="flex-1">
                      <p className="text-xs font-black uppercase tracking-widest">{formData.theme_color}</p>
                      <p className="text-[10px] text-muted-foreground">سيطبق هذا اللون على الأزرار والروابط.</p>
                    </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="text-sm font-bold block">اسم النشاط التجاري</label>
                  <Input 
                    placeholder="مثال: قاعات السمو الملكي" 
                    value={formData.business_name} 
                    onChange={e => setFormData({...formData, business_name: e.target.value})}
                  />
               </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold block">شعار النشاط</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video max-w-sm border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-all overflow-hidden relative group"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                ) : formData.custom_logo_url ? (
                  <>
                    <img src={formData.custom_logo_url} className="w-full h-full object-contain p-4" alt="Brand Logo" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                       <Upload className="w-8 h-8 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs font-bold text-muted-foreground">اضغط لرفع الشعار</span>
                  </>
                )}
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleLogoUpload} />
              </div>
              <p className="text-[10px] text-muted-foreground italic">يفضل استخدام شعار بخلفية شفافة (PNG) وبجودة عالية.</p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="bg-card border rounded-[2.5rem] p-8 shadow-sm space-y-8">
            <h3 className="text-xl font-black flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" /> تفاصيل التواصل للعملاء
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <MessageCircle className="w-3.5 h-3.5" /> رقم الواتساب
                 </label>
                 <Input 
                   placeholder="9665xxxxxxxx" 
                   value={formData.whatsapp_number} 
                   onChange={e => setFormData({...formData, whatsapp_number: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <Mail className="w-3.5 h-3.5" /> بريد المبيعات
                 </label>
                 <Input 
                   type="email" 
                   placeholder="sales@example.com" 
                   value={formData.business_email} 
                   onChange={e => setFormData({...formData, business_email: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <Phone className="w-3.5 h-3.5" /> رقم الجوال الرئيسي
                 </label>
                 <Input 
                   placeholder="05xxxxxxxx" 
                   value={formData.phone_number} 
                   onChange={e => setFormData({...formData, phone_number: e.target.value})}
                 />
               </div>
            </div>
            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Save className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-primary mb-1">ظهور البيانات</p>
                <p className="text-xs text-muted-foreground leading-relaxed">تظهر هذه البيانات للعملاء في صفحة عرض القاعة وفي الفواتير الإلكترونية لتسهيل التواصل.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Card */}
        <div className="space-y-6">
          <div className="sticky top-24 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">معاينة العلامة</h3>
            <div className="bg-card border rounded-[2.5rem] p-8 shadow-xl space-y-6 text-center">
               <div className="w-24 h-24 bg-muted rounded-[2rem] mx-auto overflow-hidden shadow-inner flex items-center justify-center">
                 {formData.custom_logo_url ? <img src={formData.custom_logo_url} className="w-full h-full object-contain p-2" /> : <Building2 className="w-10 h-10 text-muted-foreground/30" />}
               </div>
               <div>
                 <h4 className="text-2xl font-black">{formData.business_name || 'اسم النشاط'}</h4>
                 <p className="text-xs text-muted-foreground">بائع معتمد لدى {user.email}</p>
               </div>
               <div className="flex justify-center gap-4">
                  <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: formData.theme_color }}></div>
                  <div className="w-8 h-8 rounded-full border bg-white"></div>
                  <div className="w-8 h-8 rounded-full border bg-card"></div>
               </div>
               <Button 
                onClick={handleSave} 
                disabled={loading} 
                className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20"
               >
                 {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'حفظ التغييرات'}
               </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};