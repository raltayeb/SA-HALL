
import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, POSConfig } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Palette, Upload, Loader2, MessageCircle, Mail, Phone, Globe, 
  Facebook, Instagram, Twitter, Link as LinkIcon, Printer, Receipt, Store, List, Plus, X
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface VendorBrandSettingsProps {
  user: UserProfile;
  onUpdate: (userId: string) => void;
}

export const VendorBrandSettings: React.FC<VendorBrandSettingsProps> = ({ user, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'brand' | 'pos' | 'amenities'>('brand');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    business_name: user.business_name || '',
    theme_color: user.theme_color || '#8a2be2',
    whatsapp_number: user.whatsapp_number || '',
    business_email: user.business_email || '',
    phone_number: user.phone_number || '',
    custom_logo_url: user.custom_logo_url || '',
    facebook_url: user.facebook_url || '',
    instagram_url: user.instagram_url || '',
    twitter_url: user.twitter_url || ''
  });

  const [posConfig, setPosConfig] = useState<POSConfig>({
    tax_rate: user.pos_config?.tax_rate ?? 15,
    tax_id: user.pos_config?.tax_id ?? '',
    receipt_header: user.pos_config?.receipt_header ?? '',
    receipt_footer: user.pos_config?.receipt_footer ?? 'شكراً لزيارتكم',
    printer_width: user.pos_config?.printer_width ?? '80mm',
    auto_print: user.pos_config?.auto_print ?? false,
  });

  // Amenities State
  const [customAmenities, setCustomAmenities] = useState<string[]>(user.vendor_amenities || []);
  const [newAmenity, setNewAmenity] = useState('');

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

  const addAmenity = () => {
      if (newAmenity.trim() && !customAmenities.includes(newAmenity.trim())) {
          setCustomAmenities([...customAmenities, newAmenity.trim()]);
          setNewAmenity('');
      }
  };

  const removeAmenity = (am: string) => {
      setCustomAmenities(customAmenities.filter(a => a !== am));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          // Brand Data
          business_name: formData.business_name,
          theme_color: formData.theme_color,
          whatsapp_number: formData.whatsapp_number,
          business_email: formData.business_email,
          phone_number: formData.phone_number,
          custom_logo_url: formData.custom_logo_url,
          facebook_url: formData.facebook_url,
          instagram_url: formData.instagram_url,
          twitter_url: formData.twitter_url,
          // POS Data
          pos_config: posConfig,
          // Amenities
          vendor_amenities: customAmenities
        })
        .eq('id', user.id);

      if (error) throw error;
      toast({ title: 'نجاح', description: 'تم حفظ الإعدادات بنجاح.', variant: 'success' });
      onUpdate(user.id);
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10 font-tajawal text-right">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-2">
            <Palette className="w-8 h-8 text-primary" /> إعدادات الهوية والنظام
          </h2>
          <p className="text-muted-foreground mt-1">خصص مظهر بوابتك، تفاصيل التواصل، المميزات، وإعدادات نقاط البيع.</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
           <button 
             onClick={() => setActiveTab('brand')}
             className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'brand' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
           >
             الهوية والتواصل
           </button>
           <button 
             onClick={() => setActiveTab('amenities')}
             className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'amenities' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
           >
             <List className="w-4 h-4" /> مميزات الشاليه
           </button>
           <button 
             onClick={() => setActiveTab('pos')}
             className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'pos' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
           >
             <Printer className="w-4 h-4" /> نقاط البيع
           </button>
        </div>
      </div>

      {activeTab === 'brand' && (
        <div className="grid gap-8 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4">
          {/* ... Existing Brand Settings Code ... */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
              <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
                 الهوية البصرية <Globe className="w-5 h-5 text-primary" />
              </h3>
              
              <div className="grid md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <label className="text-sm font-bold block text-right">لون العلامة التجارية</label>
                    <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl border flex-row-reverse">
                      <input 
                        type="color" 
                        className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent" 
                        value={formData.theme_color} 
                        onChange={e => setFormData({...formData, theme_color: e.target.value})}
                      />
                      <div className="flex-1 text-right">
                        <p className="text-xs font-black uppercase tracking-widest">{formData.theme_color}</p>
                        <p className="text-[10px] text-muted-foreground">سيطبق هذا اللون على الأزرار والروابط.</p>
                      </div>
                    </div>
                 </div>

                 <div className="space-y-4 text-right">
                    <label className="text-sm font-bold block">اسم النشاط التجاري</label>
                    <Input 
                      placeholder="مثال: قاعات السمو الملكي" 
                      value={formData.business_name} 
                      onChange={e => setFormData({...formData, business_name: e.target.value})}
                      className="text-right"
                    />
                 </div>
              </div>

              <div className="space-y-4 text-right">
                <label className="text-sm font-bold block">شعار النشاط</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video max-w-sm border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-all overflow-hidden relative group mx-auto md:mr-0 md:ml-auto"
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
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
              <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
                 تفاصيل التواصل للعملاء <MessageCircle className="w-5 h-5 text-primary" />
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                 <div className="space-y-2 text-right">
                   <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-end gap-2">
                     رقم الواتساب <MessageCircle className="w-3.5 h-3.5" />
                   </label>
                   <Input 
                     placeholder="9665xxxxxxxx" 
                     value={formData.whatsapp_number} 
                     onChange={e => setFormData({...formData, whatsapp_number: e.target.value})}
                     className="text-right"
                   />
                 </div>
                 <div className="space-y-2 text-right">
                   <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-end gap-2">
                     بريد المبيعات <Mail className="w-3.5 h-3.5" />
                   </label>
                   <Input 
                     type="email" 
                     placeholder="sales@example.com" 
                     value={formData.business_email} 
                     onChange={e => setFormData({...formData, business_email: e.target.value})}
                     className="text-right"
                   />
                 </div>
                 <div className="space-y-2 text-right">
                   <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-end gap-2">
                     رقم الجوال الرئيسي <Phone className="w-3.5 h-3.5" />
                   </label>
                   <Input 
                     placeholder="05xxxxxxxx" 
                     value={formData.phone_number} 
                     onChange={e => setFormData({...formData, phone_number: e.target.value})}
                     className="text-right"
                   />
                 </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
              <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
                 التواصل الاجتماعي <LinkIcon className="w-5 h-5 text-primary" />
              </h3>
              <div className="space-y-4">
                 <Input 
                   label="فيسبوك"
                   placeholder="facebook.com/..." 
                   value={formData.facebook_url} 
                   onChange={e => setFormData({...formData, facebook_url: e.target.value})}
                   className="text-right text-xs"
                 />
                 <Input 
                   label="إنستجرام"
                   placeholder="instagram.com/..." 
                   value={formData.instagram_url} 
                   onChange={e => setFormData({...formData, instagram_url: e.target.value})}
                   className="text-right text-xs"
                 />
                 <Input 
                   label="تويتر / X"
                   placeholder="twitter.com/..." 
                   value={formData.twitter_url} 
                   onChange={e => setFormData({...formData, twitter_url: e.target.value})}
                   className="text-right text-xs"
                 />
              </div>
            </div>

            <Button 
                onClick={handleSave} 
                disabled={loading} 
                className="w-full h-16 rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20"
            >
               {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'حفظ كافة التغييرات'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'amenities' && (
          <div className="grid gap-8 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                  <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
                      تعريف مميزات الشاليه <List className="w-5 h-5 text-primary" />
                  </h3>
                  <div className="space-y-4">
                      <p className="text-sm text-gray-500 font-bold">أضف المميزات التي تتوفر في شاليهاتك (مثل: مسبح، ألعاب مائية، مجلس خارجي) لتظهر عند إضافة شاليه جديد.</p>
                      <div className="flex gap-2">
                          <Button onClick={addAmenity} className="rounded-xl h-12 w-12 p-0 flex items-center justify-center"><Plus className="w-6 h-6" /></Button>
                          <Input 
                              placeholder="اسم الميزة (مثال: نطيطة هوائية)" 
                              value={newAmenity} 
                              onChange={e => setNewAmenity(e.target.value)} 
                              onKeyDown={e => e.key === 'Enter' && addAmenity()}
                              className="h-12 rounded-xl text-right font-bold"
                          />
                      </div>
                      <div className="flex flex-wrap gap-3 mt-4">
                          {customAmenities.map((am, i) => (
                              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-gray-700">
                                  <button onClick={() => removeAmenity(am)} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                                  <span>{am}</span>
                              </div>
                          ))}
                          {customAmenities.length === 0 && <span className="text-gray-400 text-sm">لا توجد مميزات مضافة.</span>}
                      </div>
                  </div>
              </div>
              <div className="flex flex-col justify-end">
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2.5rem] text-center mb-6">
                      <p className="text-blue-800 font-bold text-sm">هذه القائمة ستظهر لك عند إضافة أو تعديل أي شاليه، مما يسهل عليك اختيار المواصفات المتوفرة لكل وحدة.</p>
                  </div>
                  <Button 
                    onClick={handleSave} 
                    disabled={loading} 
                    className="w-full h-16 rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'حفظ المميزات'}
                  </Button>
              </div>
          </div>
      )}

      {activeTab === 'pos' && (
        <div className="grid gap-8 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-4">
           {/* ... Existing POS Settings Code ... */}
           <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
              <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
                 تخصيص الإيصال <Receipt className="w-5 h-5 text-primary" />
              </h3>
              <div className="space-y-6 text-right">
                 <Input 
                    label="الرقم الضريبي للمنشأة"
                    placeholder="3xxxxxxxxxxxxxx"
                    value={posConfig.tax_id}
                    onChange={e => setPosConfig({...posConfig, tax_id: e.target.value})}
                 />
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">ترويسة الإيصال (اسم الفرع / العنوان)</label>
                    <textarea 
                       className="w-full h-24 rounded-2xl border bg-gray-50 p-4 text-sm font-bold resize-none focus:ring-2 ring-primary/20 outline-none"
                       value={posConfig.receipt_header}
                       onChange={e => setPosConfig({...posConfig, receipt_header: e.target.value})}
                       placeholder="مثال: فرع الرياض - طريق الملك فهد"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">تذييل الإيصال (سياسة الإرجاع / شكر)</label>
                    <textarea 
                       className="w-full h-24 rounded-2xl border bg-gray-50 p-4 text-sm font-bold resize-none focus:ring-2 ring-primary/20 outline-none"
                       value={posConfig.receipt_footer}
                       onChange={e => setPosConfig({...posConfig, receipt_footer: e.target.value})}
                    />
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                 <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
                    إعدادات النظام والطابعة <Printer className="w-5 h-5 text-primary" />
                 </h3>
                 <div className="space-y-6 text-right">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <input 
                          type="number" 
                          className="w-20 bg-white border rounded-lg px-2 h-10 text-center font-bold"
                          value={posConfig.tax_rate}
                          onChange={e => setPosConfig({...posConfig, tax_rate: Number(e.target.value)})}
                       />
                       <span className="text-sm font-bold">نسبة الضريبة (%)</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <div className="flex gap-2">
                          <button 
                             onClick={() => setPosConfig({...posConfig, printer_width: '80mm'})}
                             className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${posConfig.printer_width === '80mm' ? 'bg-primary text-white' : 'bg-white text-gray-500'}`}
                          >80mm</button>
                          <button 
                             onClick={() => setPosConfig({...posConfig, printer_width: '58mm'})}
                             className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${posConfig.printer_width === '58mm' ? 'bg-primary text-white' : 'bg-white text-gray-500'}`}
                          >58mm</button>
                       </div>
                       <span className="text-sm font-bold">عرض ورق الطباعة</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <input 
                          type="checkbox" 
                          className="w-6 h-6 accent-primary"
                          checked={posConfig.auto_print}
                          onChange={e => setPosConfig({...posConfig, auto_print: e.target.checked})}
                       />
                       <span className="text-sm font-bold">طباعة تلقائية عند الدفع</span>
                    </div>
                 </div>
              </div>

              <Button 
                  onClick={handleSave} 
                  disabled={loading} 
                  className="w-full h-16 rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20"
              >
                 {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'حفظ إعدادات الكاشير'}
              </Button>
           </div>
        </div>
      )}
    </div>
  );
};
