
import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, POSConfig } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Palette, Upload, Loader2, MessageCircle, Mail, Phone, Globe, 
  Link as LinkIcon, Printer, Receipt, List, Plus, X, UserCog, Lock, Save, Shield
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface VendorBrandSettingsProps {
  user: UserProfile;
  onUpdate: (userId: string) => void;
}

export const VendorBrandSettings: React.FC<VendorBrandSettingsProps> = ({ user, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'brand' | 'pos' | 'amenities'>('profile');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Profile & Password State
  const [profileData, setProfileData] = useState({
      full_name: user.full_name || '',
      email: user.email || '',
      newPassword: '',
      confirmNewPassword: ''
  });

  // Brand State
  const [brandData, setBrandData] = useState({
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

  // POS State
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
      setBrandData(prev => ({ ...prev, custom_logo_url: publicUrl }));
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

  const handleSaveProfile = async () => {
      setLoading(true);
      try {
          // 1. Update Profile Info
          const { error: profileError } = await supabase.from('profiles').update({
              full_name: profileData.full_name,
              // Email update requires re-verification flow usually, skipping for simplicity or needs specific Supabase Auth API
          }).eq('id', user.id);
          
          if (profileError) throw profileError;

          // 2. Update Password if provided
          if (profileData.newPassword) {
              if (profileData.newPassword !== profileData.confirmNewPassword) {
                  throw new Error('كلمات المرور غير متطابقة');
              }
              if (profileData.newPassword.length < 6) {
                  throw new Error('كلمة المرور يجب أن تكون 6 خانات على الأقل');
              }
              const { error: authError } = await supabase.auth.updateUser({ password: profileData.newPassword });
              if (authError) throw authError;
              toast({ title: 'أمان الحساب', description: 'تم تحديث كلمة المرور بنجاح.', variant: 'success' });
              setProfileData(prev => ({ ...prev, newPassword: '', confirmNewPassword: '' }));
          }

          toast({ title: 'تم الحفظ', description: 'تم تحديث المعلومات الشخصية.', variant: 'success' });
          onUpdate(user.id);
      } catch (err: any) {
          toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
      } finally {
          setLoading(false);
      }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          // Brand Data
          business_name: brandData.business_name,
          theme_color: brandData.theme_color,
          whatsapp_number: brandData.whatsapp_number,
          business_email: brandData.business_email,
          phone_number: brandData.phone_number,
          custom_logo_url: brandData.custom_logo_url,
          facebook_url: brandData.facebook_url,
          instagram_url: brandData.instagram_url,
          twitter_url: brandData.twitter_url,
          // POS Data
          pos_config: posConfig,
          // Amenities
          vendor_amenities: customAmenities
        })
        .eq('id', user.id);

      if (error) throw error;
      toast({ title: 'نجاح', description: 'تم حفظ كافة الإعدادات بنجاح.', variant: 'success' });
      onUpdate(user.id);
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10 font-tajawal text-right">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-2 text-gray-900">
            <UserCog className="w-8 h-8 text-primary" /> إعدادات المنشأة
          </h2>
          <p className="text-gray-500 font-bold mt-1 text-sm">مركز التحكم في هويتك، معلوماتك الشخصية، وإعدادات النظام.</p>
        </div>
        
        {/* Navigation Tabs - Modern Pill Shape */}
        <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-200 overflow-x-auto no-scrollbar w-full md:w-auto">
           <button onClick={() => setActiveTab('profile')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'profile' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
             <UserCog className="w-4 h-4" /> الملف الشخصي
           </button>
           <button onClick={() => setActiveTab('brand')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'brand' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
             <Palette className="w-4 h-4" /> الهوية والبراند
           </button>
           <button onClick={() => setActiveTab('amenities')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'amenities' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
             <List className="w-4 h-4" /> المميزات
           </button>
           <button onClick={() => setActiveTab('pos')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'pos' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
             <Printer className="w-4 h-4" /> الكاشير والضريبة
           </button>
        </div>
      </div>

      {/* --- TAB 1: PROFILE & SECURITY --- */}
      {activeTab === 'profile' && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-2 border-b border-gray-50 pb-4">
                      <UserCog className="w-5 h-5 text-primary" /> المعلومات الشخصية
                  </h3>
                  <div className="space-y-4">
                      <Input label="الاسم الكامل" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} className="h-12 rounded-xl font-bold" />
                      <Input label="البريد الإلكتروني (للدخول)" value={profileData.email} disabled className="h-12 rounded-xl font-bold bg-gray-50 text-gray-500 cursor-not-allowed" />
                  </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-2 border-b border-gray-50 pb-4 text-red-500">
                      <Lock className="w-5 h-5" /> الأمان وكلمة المرور
                  </h3>
                  <div className="space-y-4">
                      <Input type="password" label="كلمة المرور الجديدة" placeholder="••••••••" value={profileData.newPassword} onChange={e => setProfileData({...profileData, newPassword: e.target.value})} className="h-12 rounded-xl font-bold" />
                      <Input type="password" label="تأكيد كلمة المرور" placeholder="••••••••" value={profileData.confirmNewPassword} onChange={e => setProfileData({...profileData, confirmNewPassword: e.target.value})} className="h-12 rounded-xl font-bold" />
                  </div>
                  <div className="pt-4">
                      <Button onClick={handleSaveProfile} disabled={loading} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 bg-gray-900 text-white hover:bg-black">
                          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'حفظ بيانات الملف الشخصي'}
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* --- TAB 2: BRAND IDENTITY --- */}
      {activeTab === 'brand' && (
        <div className="grid gap-8 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
              <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
                 الهوية البصرية <Globe className="w-5 h-5 text-primary" />
              </h3>
              
              <div className="grid md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <label className="text-sm font-bold block text-right">لون العلامة التجارية</label>
                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 flex-row-reverse">
                      <input 
                        type="color" 
                        className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent" 
                        value={brandData.theme_color} 
                        onChange={e => setBrandData({...brandData, theme_color: e.target.value})}
                      />
                      <div className="flex-1 text-right">
                        <p className="text-xs font-black uppercase tracking-widest">{brandData.theme_color}</p>
                        <p className="text-[10px] text-gray-400">سيظهر في صفحة الحجز الخاصة بك</p>
                      </div>
                    </div>
                 </div>

                 <div className="space-y-4 text-right">
                    <label className="text-sm font-bold block">اسم النشاط التجاري</label>
                    <Input 
                      placeholder="مثال: قاعات السمو الملكي" 
                      value={brandData.business_name} 
                      onChange={e => setBrandData({...brandData, business_name: e.target.value})}
                      className="text-right h-12 rounded-xl font-bold"
                    />
                 </div>
              </div>

              <div className="space-y-4 text-right">
                <label className="text-sm font-bold block">شعار النشاط</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video max-w-sm border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all overflow-hidden relative group mx-auto md:mr-0 md:ml-auto"
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : brandData.custom_logo_url ? (
                    <>
                      <img src={brandData.custom_logo_url} className="w-full h-full object-contain p-6" alt="Brand Logo" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <p className="text-white font-bold text-xs flex items-center gap-2"><Upload className="w-4 h-4" /> تغيير الشعار</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-300 mb-2" />
                      <span className="text-xs font-bold text-gray-400">اضغط لرفع الشعار</span>
                    </>
                  )}
                  <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleLogoUpload} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
              <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
                 بيانات التواصل (للعملاء) <MessageCircle className="w-5 h-5 text-primary" />
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                 <Input label="رقم الواتساب" placeholder="9665xxxxxxxx" value={brandData.whatsapp_number} onChange={e => setBrandData({...brandData, whatsapp_number: e.target.value})} className="h-12 rounded-xl font-bold" />
                 <Input label="بريد المبيعات" type="email" placeholder="sales@example.com" value={brandData.business_email} onChange={e => setBrandData({...brandData, business_email: e.target.value})} className="h-12 rounded-xl font-bold" />
                 <Input label="رقم الجوال الرئيسي" placeholder="05xxxxxxxx" value={brandData.phone_number} onChange={e => setBrandData({...brandData, phone_number: e.target.value})} className="h-12 rounded-xl font-bold" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
              <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
                 روابط التواصل الاجتماعي <LinkIcon className="w-5 h-5 text-primary" />
              </h3>
              <div className="space-y-4">
                 <Input label="فيسبوك" placeholder="facebook.com/..." value={brandData.facebook_url} onChange={e => setBrandData({...brandData, facebook_url: e.target.value})} className="h-12 rounded-xl font-bold text-xs" />
                 <Input label="إنستجرام" placeholder="instagram.com/..." value={brandData.instagram_url} onChange={e => setBrandData({...brandData, instagram_url: e.target.value})} className="h-12 rounded-xl font-bold text-xs" />
                 <Input label="تويتر / X" placeholder="twitter.com/..." value={brandData.twitter_url} onChange={e => setBrandData({...brandData, twitter_url: e.target.value})} className="h-12 rounded-xl font-bold text-xs" />
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={loading} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20">
               {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'حفظ إعدادات الهوية'}
            </Button>
          </div>
        </div>
      )}

      {/* --- TAB 3: AMENITIES --- */}
      {activeTab === 'amenities' && (
          <div className="grid gap-8 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                  <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
                      قائمة المميزات الخاصة <List className="w-5 h-5 text-primary" />
                  </h3>
                  <div className="space-y-4">
                      <p className="text-sm text-gray-500 font-bold">أضف المميزات التي تتوفر في شاليهاتك (مثل: مسبح، ألعاب مائية، مجلس خارجي) لتظهر كخيارات عند إضافة شاليه جديد.</p>
                      <div className="flex gap-2">
                          <Button onClick={addAmenity} className="rounded-xl h-12 w-12 p-0 flex items-center justify-center bg-primary text-white"><Plus className="w-6 h-6" /></Button>
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
                              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-gray-700 group">
                                  <button onClick={() => removeAmenity(am)} className="text-gray-300 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                                  <span>{am}</span>
                              </div>
                          ))}
                          {customAmenities.length === 0 && <span className="text-gray-400 text-sm font-bold">لا توجد مميزات مضافة.</span>}
                      </div>
                  </div>
              </div>
              <div className="flex flex-col justify-end space-y-4">
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2.5rem] text-center">
                      <p className="text-blue-800 font-bold text-sm leading-relaxed">هذه القائمة ستظهر لك عند إضافة أو تعديل أي شاليه، مما يسهل عليك اختيار المواصفات المتوفرة لكل وحدة بسرعة.</p>
                  </div>
                  <Button onClick={handleSaveSettings} disabled={loading} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'حفظ المميزات'}
                  </Button>
              </div>
          </div>
      )}

      {/* --- TAB 4: POS & TAX --- */}
      {activeTab === 'pos' && (
        <div className="grid gap-8 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-4">
           <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
              <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
                 تخصيص الإيصال الضريبي <Receipt className="w-5 h-5 text-primary" />
              </h3>
              <div className="space-y-6 text-right">
                 <Input 
                    label="الرقم الضريبي للمنشأة"
                    placeholder="3xxxxxxxxxxxxxx"
                    value={posConfig.tax_id}
                    onChange={e => setPosConfig({...posConfig, tax_id: e.target.value})}
                    className="h-12 rounded-xl font-mono text-center font-bold"
                 />
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">ترويسة الإيصال (اسم الفرع / العنوان)</label>
                    <textarea 
                       className="w-full h-24 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-bold resize-none focus:ring-2 ring-primary/20 outline-none"
                       value={posConfig.receipt_header}
                       onChange={e => setPosConfig({...posConfig, receipt_header: e.target.value})}
                       placeholder="مثال: فرع الرياض - طريق الملك فهد"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">تذييل الإيصال (سياسة الإرجاع / شكر)</label>
                    <textarea 
                       className="w-full h-24 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-bold resize-none focus:ring-2 ring-primary/20 outline-none"
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
                          className="w-20 bg-white border border-gray-200 rounded-xl px-2 h-10 text-center font-bold"
                          value={posConfig.tax_rate}
                          onChange={e => setPosConfig({...posConfig, tax_rate: Number(e.target.value)})}
                       />
                       <span className="text-sm font-bold text-gray-700">نسبة الضريبة (%)</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <div className="flex gap-2">
                          <button 
                             onClick={() => setPosConfig({...posConfig, printer_width: '80mm'})}
                             className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${posConfig.printer_width === '80mm' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border'}`}
                          >80mm</button>
                          <button 
                             onClick={() => setPosConfig({...posConfig, printer_width: '58mm'})}
                             className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${posConfig.printer_width === '58mm' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border'}`}
                          >58mm</button>
                       </div>
                       <span className="text-sm font-bold text-gray-700">عرض ورق الطباعة</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <input 
                          type="checkbox" 
                          className="w-6 h-6 accent-primary rounded-lg"
                          checked={posConfig.auto_print}
                          onChange={e => setPosConfig({...posConfig, auto_print: e.target.checked})}
                       />
                       <span className="text-sm font-bold text-gray-700">طباعة تلقائية عند الدفع</span>
                    </div>
                 </div>
              </div>

              <Button 
                  onClick={handleSaveSettings} 
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
